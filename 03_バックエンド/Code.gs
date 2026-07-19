/* =========================================================
   筋トレ記録アプリ — バックエンド (Google Apps Script)
   ---------------------------------------------------------
   これを紐付いたスプレッドシートが「データベース」になる。
   Extensions → Apps Script に貼り付け →「デプロイ / ウェブアプリ」で公開。
   詳しい手順は README_デプロイ手順.md を参照。

   シート構成（無ければ自動作成）:
     記録      : id | 日付 | 種目 | 部位 | 重量kg | レップ | RPE | メニュー | 記録日時
     メニュー   : id | 名前 | 並び順
     種目マスタ : 部位キー | 種目名 | 所属メニュー(パイプ区切り)
   ========================================================= */

var SHEET_RECORDS = '記録';
var SHEET_MENUS = 'メニュー';
var SHEET_EXERCISES = '種目マスタ';

var HEADERS = {};
HEADERS[SHEET_RECORDS] = ['id', '日付', '種目', '部位', '重量kg', 'レップ', 'RPE', 'メニュー', '記録日時'];
HEADERS[SHEET_MENUS] = ['id', '名前', '並び順'];
HEADERS[SHEET_EXERCISES] = ['部位キー', '種目名', '所属メニュー'];

/* ---------- 入口 ---------- */

function doGet(e) {
  var type = (e && e.parameter && e.parameter.type) || 'all';
  var out;
  if (type === 'all') {
    out = { menus: readMenus(), exercises: readExercises(), records: readRecords() };
  } else if (type === 'records') {
    out = readRecords();
  } else if (type === 'menus') {
    out = readMenus();
  } else if (type === 'exercises') {
    out = readExercises();
  } else {
    out = { error: 'unknown type: ' + type };
  }
  return json(out);
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ ok: false, error: 'invalid JSON' });
  }

  var action = body.action;
  try {
    if (action === 'addRecords') {
      var n = appendRecords(body.records || []);
      return json({ ok: true, added: n });
    }
    if (action === 'saveMenus') {
      saveMenus(body.menus || [], body.exercises || []);
      return json({ ok: true });
    }
    return json({ ok: false, error: 'unknown action: ' + action });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* ---------- シート取得（無ければ作成） ---------- */

function sheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(HEADERS[name]);
    sh.getRange(1, 1, 1, HEADERS[name].length).setFontWeight('bold');
    sh.setFrozenRows(1);
    if (name === SHEET_MENUS) seedMenus(sh);
    if (name === SHEET_EXERCISES) {
      seedExercises(sh);
      applyGroupDropdown(sh);
    }
  }
  return sh;
}

/* ---------- 読み取り ---------- */

function rows(name) {
  var sh = sheet(name);
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, HEADERS[name].length).getValues();
}

function readRecords() {
  return rows(SHEET_RECORDS).map(function (r) {
    return {
      id: r[0], date: r[1], exercise: r[2], muscle: r[3],
      weight: r[4], reps: r[5], rpe: r[6], menu: r[7], loggedAt: r[8],
    };
  });
}

function readMenus() {
  return rows(SHEET_MENUS)
    .map(function (r) { return { id: String(r[0]), name: r[1], order: r[2] }; })
    .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
}

function readExercises() {
  return rows(SHEET_EXERCISES).map(function (r) {
    var menus = String(r[2] || '').split('|').filter(function (s) { return s; });
    return { group: String(r[0]), name: r[1], menus: menus };
  });
}

/* ---------- 書き込み ---------- */

function appendRecords(records) {
  if (!records.length) return 0;
  var sh = sheet(SHEET_RECORDS);
  var now = new Date();
  var values = records.map(function (rec) {
    return [
      rec.id || Utilities.getUuid(),
      rec.date || '',
      rec.exercise || '',
      rec.muscle || '',
      rec.weight || '',
      rec.reps || '',
      rec.rpe || '',
      rec.menu || '',
      now,
    ];
  });
  sh.getRange(sh.getLastRow() + 1, 1, values.length, HEADERS[SHEET_RECORDS].length).setValues(values);
  return values.length;
}

function saveMenus(menus, exercises) {
  // メニュー: 全消し→書き直し
  var shM = sheet(SHEET_MENUS);
  clearBody(shM);
  if (menus.length) {
    var mv = menus.map(function (m, i) { return [m.id, m.name, i]; });
    shM.getRange(2, 1, mv.length, HEADERS[SHEET_MENUS].length).setValues(mv);
  }

  // 種目マスタ: 全消し→書き直し
  var shE = sheet(SHEET_EXERCISES);
  clearBody(shE);
  if (exercises.length) {
    var ev = exercises.map(function (x) {
      return [x.group, x.name, (x.menus || []).join('|')];
    });
    shE.getRange(2, 1, ev.length, HEADERS[SHEET_EXERCISES].length).setValues(ev);
  }
}

/* 種目マスタの部位キー列(A)を6キーのプルダウンにする（シート新規作成時用。
   既存の筋トレDBには2026-07-19にUIから設定済み） */
function applyGroupDropdown(sh) {
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['chest', 'back', 'legs', 'shoulder', 'arm', 'core'], true)
    .setAllowInvalid(false)
    .build();
  sh.getRange('A2:A1000').setDataValidation(rule);
}

function clearBody(sh) {
  var last = sh.getLastRow();
  if (last >= 2) sh.getRange(2, 1, last - 1, sh.getLastColumn()).clearContent();
}

/* ---------- 初期サンプル（初回のシート作成時のみ） ---------- */

function seedMenus(sh) {
  sh.getRange(2, 1, 5, 3).setValues([
    ['shoulder', '肩', 0],
    ['back', '背中', 1],
    ['legs', '脚', 2],
    ['chest', '胸', 3],
    ['arm', '腕', 4],
  ]);
}

function seedExercises(sh) {
  var data = [
    ['chest', 'ベンチプレス', 'chest'],
    ['chest', 'インクラインダンベルプレス', 'chest'],
    ['chest', 'チェストフライ', ''],
    ['chest', 'ディップス', ''],
    ['back', '懸垂', 'back'],
    ['back', 'ラットプルダウン', 'back'],
    ['back', 'ベントオーバーロウ', 'back'],
    ['back', 'デッドリフト', ''],
    ['legs', 'スクワット', 'legs'],
    ['legs', 'レッグプレス', 'legs'],
    ['legs', 'レッグカール', 'legs'],
    ['legs', 'カーフレイズ', ''],
    ['shoulder', 'ショルダープレス', 'shoulder'],
    ['shoulder', 'サイドレイズ', 'shoulder'],
    ['shoulder', 'リアレイズ', ''],
    ['arm', 'バーベルカール', 'arm'],
    ['arm', 'ケーブルプッシュダウン', 'arm'],
    ['arm', 'ハンマーカール', ''],
    ['core', 'プランク', ''],
    ['core', 'アブローラー', ''],
    ['core', 'レッグレイズ', ''],
  ];
  sh.getRange(2, 1, data.length, 3).setValues(data);
}

/* ---------- 共通 ---------- */

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
