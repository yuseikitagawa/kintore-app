/* =========================================================
   筋トレ記録アプリ — プロトタイプ用スクリプト
   まだ本実装ではなく、見た目と操作感を確認するためのサンプル駆動。
   データ永続化(localStorage)や本ロジックは次フェーズで差し替える。
   ========================================================= */

'use strict';

/* ---------- サンプルデータ ---------- */

const WEEK_VOLUME = [4.2, 6.1, 0, 7.8, 5.4, 8.9, 5.8]; // 月〜日 (t)

const EXERCISES = [
  {
    name: 'ベンチプレス', muscle: '胸', icon: '🏋',
    prev: '87.5kg ×5',
    sets: [
      { w: 60, r: 10, done: true },
      { w: 80, r: 8, done: true },
      { w: 90, r: 5, done: false },
    ],
  },
  {
    name: 'インクラインダンベルプレス', muscle: '胸・肩', icon: '💪',
    prev: '30kg ×10',
    sets: [
      { w: 28, r: 12, done: true },
      { w: 30, r: 10, done: false },
    ],
  },
];

const HISTORY = [
  { d: '10', m: '7月', title: '腕', meta: '3種目 · 12セット · 40分', vol: '3.2t', pr: false },
  { d: '08', m: '7月', title: '胸', meta: '4種目 · 16セット · 55分', vol: '6.4t', pr: true },
  { d: '06', m: '7月', title: '脚', meta: '4種目 · 18セット · 62分', vol: '11.2t', pr: false },
  { d: '04', m: '7月', title: '背中', meta: '4種目 · 16セット · 57分', vol: '7.6t', pr: false },
  { d: '02', m: '7月', title: '肩', meta: '3種目 · 14セット · 45分', vol: '4.1t', pr: false },
];

const VOLUME_TREND = [22, 24, 21, 26, 25, 28, 27, 30, 29, 32, 31, 34]; // 12週 (t)

const MUSCLES = [
  { name: '胸', pct: 82 },
  { name: '背中', pct: 74 },
  { name: '脚', pct: 91 },
  { name: '肩', pct: 58 },
  { name: '腕', pct: 65 },
  { name: '体幹', pct: 40 },
];

const PRS = [
  { name: 'デッドリフト', v: '150 kg', r: '×3' },
  { name: 'スクワット', v: '120 kg', r: '×3' },
  { name: 'ベンチプレス', v: '90 kg', r: '×5' },
];

/* ---------- メニュー編集用データ（部位別の種目マスタ） ----------
   item.menus = その種目が属するメニューID配列。
   トグルで現在のメニューへの出し入れ、×で種目自体を削除できる。 */

const MUSCLE_GROUPS = [
  {
    key: 'chest', name: '胸', color: 'red', icon: '🏋', open: true,
    items: [
      { name: 'ベンチプレス', menus: ['chest'] },
      { name: 'インクラインダンベルプレス', menus: ['chest'] },
      { name: 'チェストフライ', menus: [] },
      { name: 'ディップス', menus: [] },
    ],
  },
  {
    key: 'back', name: '背中', color: 'blue', icon: '🎣', open: false,
    items: [
      { name: '懸垂', menus: ['back'] },
      { name: 'ラットプルダウン', menus: ['back'] },
      { name: 'ベントオーバーロウ', menus: ['back'] },
      { name: 'デッドリフト', menus: [] },
    ],
  },
  {
    key: 'legs', name: '脚', color: 'yellow', icon: '🦵', open: false,
    items: [
      { name: 'スクワット', menus: ['legs'] },
      { name: 'レッグプレス', menus: ['legs'] },
      { name: 'レッグカール', menus: ['legs'] },
      { name: 'カーフレイズ', menus: [] },
    ],
  },
  {
    key: 'shoulder', name: '肩', color: 'red', icon: '🛡', open: false,
    items: [
      { name: 'ショルダープレス', menus: ['shoulder'] },
      { name: 'サイドレイズ', menus: ['shoulder'] },
      { name: 'リアレイズ', menus: [] },
    ],
  },
  {
    key: 'arm', name: '腕', color: 'blue', icon: '💪', open: false,
    items: [
      { name: 'バーベルカール', menus: ['arm'] },
      { name: 'ケーブルプッシュダウン', menus: ['arm'] },
      { name: 'ハンマーカール', menus: [] },
    ],
  },
  {
    key: 'core', name: '体幹', color: 'yellow', icon: '🔥', open: false,
    items: [
      { name: 'プランク', menus: [] },
      { name: 'アブローラー', menus: [] },
      { name: 'レッグレイズ', menus: [] },
    ],
  },
];

/* 部位別5分割（肩→背中→脚→胸→腕の順に回す） */
const MENUS = [
  { id: 'shoulder', name: '肩' },
  { id: 'back', name: '背中' },
  { id: 'legs', name: '脚' },
  { id: 'chest', name: '胸' },
  { id: 'arm', name: '腕' },
];

let activeMenuId = 'shoulder';
let menuSeq = 0; // 新規メニューID採番用

/* 部位の固定メタ（名前・色・アイコン）。種目はスプレッドシートから流し込む。 */
const GROUP_META = [
  { key: 'chest', name: '胸', color: 'red', icon: '🏋' },
  { key: 'back', name: '背中', color: 'blue', icon: '🎣' },
  { key: 'legs', name: '脚', color: 'yellow', icon: '🦵' },
  { key: 'shoulder', name: '肩', color: 'red', icon: '🛡' },
  { key: 'arm', name: '腕', color: 'blue', icon: '💪' },
  { key: 'core', name: '体幹', color: 'yellow', icon: '🔥' },
];

/* スプレッドシート（or localStorage）から読み込んだ記録セット群 */
let RECORDS = [];

/* 記録画面が今日どのメニュー(部位)で動いているか */
let logMenuName = '';

const SETS_PER_EXERCISE = 3; // 履歴がない種目の初期セット数
const MIN_PER_EXERCISE = 12; // 所要時間の目安(分/種目)
const DEFAULT_SET = { w: 20, r: 10 };

/* ---------- ユーティリティ ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const el = (tag, cls, html) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  return node;
};
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- 5部位ローテーション（肩→背中→脚→胸→腕） ---------- */

/* ローカル時刻での YYYY-MM-DD（toISOStringはUTCになり日本だと日付がズレる） */
const localYmd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/* 記録の日付を YYYY-MM-DD に正規化（シート経由だとISO日時(UTC)で返るのでローカル日に直す） */
const recDate = (r) => {
  const v = String(r.date || '');
  if (!v.includes('T')) return v.slice(0, 10);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v.slice(0, 10) : localYmd(d);
};
const todayStr = () => localYmd(new Date());
const recVol = (r) => (Number(r.weight) || 0) * (Number(r.reps) || 0);

function menuByName(name) {
  return MENUS.find((m) => m.name === String(name));
}

/* 今日のメニュー = 今日すでに記録した部位、なければ前回の次の部位 */
function todayMenu() {
  const today = todayStr();
  const todayRec = RECORDS.find((r) => recDate(r) === today);
  if (todayRec) {
    const m = menuByName(todayRec.menu);
    if (m) return m;
  }
  let lastDate = '';
  let lastMenu = '';
  RECORDS.forEach((r) => {
    const d = recDate(r);
    if (d && d > lastDate) { lastDate = d; lastMenu = r.menu; }
  });
  const last = menuByName(lastMenu);
  const idx = last ? MENUS.indexOf(last) : -1;
  return MENUS[(idx + 1) % MENUS.length] || MENUS[0];
}

function exercisesForMenu(menuId) {
  const out = [];
  MUSCLE_GROUPS.forEach((g) => {
    g.items.forEach((it) => { if (it.menus.includes(menuId)) out.push({ group: g, name: it.name }); });
  });
  return out;
}

/* その種目を最後にやった日のセット群（前回値の引き継ぎ用） */
function lastRecordsFor(name) {
  const recs = RECORDS.filter((r) => r.exercise === name);
  if (!recs.length) return null;
  const lastDate = recs.map(recDate).sort().at(-1);
  return recs.filter((r) => recDate(r) === lastDate);
}

function makeSessionExercise(name, group, prevRecs) {
  const sets = prevRecs
    ? prevRecs.map((r) => ({ w: Number(r.weight) || 0, r: Number(r.reps) || 0, done: false }))
    : Array.from({ length: SETS_PER_EXERCISE }, () => ({ ...DEFAULT_SET, done: false }));
  const best = prevRecs
    ? prevRecs.reduce((a, b) => (Number(b.weight) > Number(a.weight) ? b : a))
    : null;
  return {
    name,
    muscle: group.name,
    icon: group.icon,
    prev: best ? `${best.weight}kg ×${best.reps}` : '—',
    sets,
  };
}

/* 記録画面を「今日の部位」の種目で組み立てる（前回の重量・レップを初期値に） */
function buildTodayExercises() {
  const menu = todayMenu();
  logMenuName = menu.name;
  EXERCISES.length = 0;
  exercisesForMenu(menu.id).forEach(({ group, name }) => {
    EXERCISES.push(makeSessionExercise(name, group, lastRecordsFor(name)));
  });
  $('#log-h').textContent = menu.name;
  const eyebrow = $('#log-eyebrow');
  if (eyebrow) {
    const now = new Date();
    eyebrow.textContent = `${now.getMonth() + 1}月${now.getDate()}日 · 今日は${menu.name}`;
  }
}

/* ---------- 週・連続日数の集計 ---------- */

function mondayOfThisWeek() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 月=0
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
}

function isThisWeek(dstr) {
  const d = new Date(dstr);
  if (Number.isNaN(d.getTime())) return false;
  const diff = (d - mondayOfThisWeek()) / 86400000;
  return diff >= 0 && diff < 7;
}

/* 今週の日別ボリューム (t)、月〜日 */
function weekVolumes() {
  const mon = mondayOfThisWeek();
  const vols = Array(7).fill(0);
  RECORDS.forEach((r) => {
    const d = new Date(recDate(r));
    if (Number.isNaN(d.getTime())) return;
    const idx = Math.floor((d - mon) / 86400000);
    if (idx >= 0 && idx < 7) vols[idx] += recVol(r) / 1000;
  });
  return vols;
}

/* 直近nWeeks週の週間ボリューム (t)、古い→新しい */
function weeklyTrend(nWeeks) {
  const mon = mondayOfThisWeek();
  const out = Array(nWeeks).fill(0);
  RECORDS.forEach((r) => {
    const d = new Date(recDate(r));
    if (Number.isNaN(d.getTime())) return;
    const wi = Math.floor((d - mon) / 604800000); // 0=今週, -1=先週…
    const idx = nWeeks - 1 + wi;
    if (idx >= 0 && idx < nWeeks) out[idx] += recVol(r) / 1000;
  });
  return out;
}

/* 連続トレーニング日数（今日やってなければ昨日起点で数える） */
function streakDays() {
  const days = [...new Set(RECORDS.map(recDate).filter(Boolean))].sort().reverse();
  if (!days.length) return 0;
  const cursor = new Date();
  if (days[0] !== localYmd(cursor)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  for (const d of days) {
    if (d !== localYmd(cursor)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/* 種目ごとの最重量セット（自己ベスト）を重い順に */
function realPRs() {
  const best = new Map();
  RECORDS.forEach((r) => {
    const w = Number(r.weight) || 0;
    const cur = best.get(r.exercise);
    if (!cur || w > cur.w) best.set(r.exercise, { name: r.exercise, w, r: Number(r.reps) || 0 });
  });
  return [...best.values()].sort((a, b) => b.w - a.w);
}

/* ---------- ホーム（今日の部位 + ローテーション + 実データ） ---------- */

function renderHome() {
  const now = new Date();
  const wd = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
  const dateEl = $('#screen-home .topbar__eyebrow');
  if (dateEl) dateEl.textContent = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 · ${wd}曜`;

  const menu = todayMenu();
  $('#hero-menu').textContent = menu.name;

  const exCount = exercisesForMenu(menu.id).length;
  $('#hero-meta').innerHTML = `
    <li><b>${exCount}</b> 種目</li>
    <li><b>${exCount * SETS_PER_EXERCISE}</b> セット</li>
    <li><b>~${exCount * MIN_PER_EXERCISE}</b> 分</li>`;

  $('#hero-rotation').innerHTML = MENUS
    .map((m) => (m.id === menu.id ? `<b>${esc(m.name)}</b>` : `<span>${esc(m.name)}</span>`))
    .join('<span class="sep">→</span>');

  if (!RECORDS.length) return; // 記録が無い間はリング/連続はサンプルのまま

  const daysThisWeek = new Set(RECORDS.map(recDate).filter(isThisWeek)).size;
  const ring = $('#week-ring');
  if (ring) ring.style.setProperty('--val', Math.round((daysThisWeek / 7) * 100));
  $('#week-ring-num').innerHTML = `${daysThisWeek}<small>/7</small>`;
  $('#week-count').textContent = `${daysThisWeek}回 達成`;
  $('#streak-num').textContent = String(streakDays());

  const home = $('#home-pr-list');
  if (home) {
    home.innerHTML = '';
    realPRs().slice(0, 2).forEach((p) => {
      home.appendChild(el('li', null, `<span>${esc(p.name)}</span><b>${p.w} kg <small>×${p.r}</small></b>`));
    });
  }
}

/* ---------- 画面遷移 ---------- */

function goto(name) {
  $$('.screen').forEach((s) => {
    const active = s.id === `screen-${name}`;
    s.hidden = !active;
    // hidden解除後に is-active を付けてフェードさせる
    requestAnimationFrame(() => s.classList.toggle('is-active', active));
  });
  $$('.tab').forEach((t) => {
    const active = t.dataset.goto === name;
    t.classList.toggle('is-active', active);
    active ? t.setAttribute('aria-current', 'page') : t.removeAttribute('aria-current');
  });
  $('.screens').scrollTop = 0;
}

document.addEventListener('click', (e) => {
  const trigger = e.target.closest('[data-goto]');
  if (trigger) goto(trigger.dataset.goto);
});

/* ---------- ホーム: 週間ボリューム棒グラフ ---------- */

function renderHomeBars() {
  const wrap = $('#home-bars');
  wrap.innerHTML = '';
  const vols = RECORDS.length ? weekVolumes() : WEEK_VOLUME;
  const max = Math.max(...vols);
  vols.forEach((v) => {
    const bar = el('span', 'bar');
    const h = v === 0 || max === 0 ? 4 : Math.round((v / max) * 100);
    if (v === max && v > 0) bar.classList.add('is-peak');
    wrap.appendChild(bar);
    requestAnimationFrame(() => { bar.style.height = `${h}%`; });
  });
  const totalEl = $('#week-total');
  if (totalEl) totalEl.textContent = `${vols.reduce((a, b) => a + b, 0).toFixed(1)}t`;
}

/* ---------- 記録: 種目カード ---------- */

function renderExercises() {
  const list = $('#exercise-list');
  list.innerHTML = '';

  EXERCISES.forEach((ex, exi) => {
    const card = el('article', 'ex');

    const head = el('div', 'ex__head', `
      <span class="ex__badge">${ex.icon}</span>
      <div>
        <div class="ex__name">${ex.name}</div>
        <div class="ex__muscle">${ex.muscle}</div>
      </div>
      <div class="ex__prev">前回<b>${ex.prev}</b></div>
    `);
    card.appendChild(head);

    ex.sets.forEach((set, si) => card.appendChild(buildSetRow(exi, si, set)));

    const add = el('button', 'ex__add', '＋ セットを追加');
    add.addEventListener('click', () => {
      const last = ex.sets[ex.sets.length - 1] || { w: 20, r: 10 };
      ex.sets.push({ w: last.w, r: last.r, done: false });
      renderExercises();
      updateLogSummary();
    });
    card.appendChild(add);

    list.appendChild(card);
  });
}

function buildSetRow(exi, si, set) {
  const row = el('div', 'set-row' + (set.done ? ' is-done' : ''));
  row.appendChild(el('span', 'set-row__n', String(si + 1)));
  row.appendChild(buildSetInput(exi, si, 'w', set.w, 'kg'));
  row.appendChild(buildSetInput(exi, si, 'r', set.r, 'reps'));
  const check = el('button', 'set-check', '✓');
  check.setAttribute('aria-label', `${si + 1}セット目を完了`);
  check.addEventListener('click', () => {
    EXERCISES[exi].sets[si].done = !EXERCISES[exi].sets[si].done;
    row.classList.toggle('is-done');
    updateLogSummary();
  });
  row.appendChild(check);
  return row;
}

/* 重量(kg)・レップをタップしてそのまま打ち替えられる入力欄 */
function buildSetInput(exi, si, key, value, unit) {
  const wrap = el('label', 'set-val set-val--edit');
  const input = el('input', 'set-val__in');
  input.type = 'number';
  input.inputMode = 'decimal';
  input.min = '0';
  input.step = key === 'w' ? '0.5' : '1';
  input.value = value;
  input.setAttribute('aria-label', `${si + 1}セット目の${key === 'w' ? '重量(kg)' : 'レップ数'}`);

  // 入力のたびに状態とサマリーを更新（再描画はしない＝フォーカスを保つ）
  input.addEventListener('input', () => {
    const n = Number(input.value);
    EXERCISES[exi].sets[si][key] = Number.isFinite(n) && n >= 0 ? n : 0;
    updateLogSummary();
  });
  // Enterでキーボードを閉じる（スマホ想定）
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') input.blur();
  });
  // 空のまま離れたら0に戻す
  input.addEventListener('blur', () => {
    if (input.value === '') { input.value = 0; EXERCISES[exi].sets[si][key] = 0; updateLogSummary(); }
  });

  wrap.append(input, el('small', null, unit));
  return wrap;
}

function updateLogSummary() {
  let vol = 0, done = 0, total = 0, activeEx = 0;
  EXERCISES.forEach((ex) => {
    let exHasDone = false;
    ex.sets.forEach((s) => {
      total++;
      if (s.done) { done++; vol += s.w * s.r; exHasDone = true; }
    });
    if (exHasDone) activeEx++;
  });
  const [volEl, setEl, exEl] = $$('.log-summary__v');
  volEl.innerHTML = `${vol.toLocaleString()}<small>kg</small>`;
  setEl.innerHTML = `${done}<small>/${total}</small>`;
  exEl.innerHTML = `${activeEx}<small>/${EXERCISES.length}</small>`;
}

/* ---------- 履歴 ---------- */

/* 記録セット群を日付ごとのセッションに集計して履歴カード形式にする */
function recordsToSessions(records) {
  const byDate = new Map();
  records.forEach((r) => {
    const key = recDate(r);
    if (!key) return;
    if (!byDate.has(key)) {
      byDate.set(key, { date: key, sets: 0, vol: 0, exercises: new Set(), menu: r.menu || '記録' });
    }
    const s = byDate.get(key);
    s.sets += 1;
    s.vol += (Number(r.weight) || 0) * (Number(r.reps) || 0);
    s.exercises.add(r.exercise);
  });

  return [...byDate.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((s) => {
      const dt = new Date(s.date);
      const valid = !Number.isNaN(dt.getTime());
      return {
        d: valid ? String(dt.getDate()).padStart(2, '0') : s.date.slice(-2),
        m: valid ? `${dt.getMonth() + 1}月` : '',
        title: s.menu,
        meta: `${s.exercises.size}種目 · ${s.sets}セット`,
        vol: `${(s.vol / 1000).toFixed(1)}t`,
        pr: false,
        real: true,
      };
    });
}

function renderHistory() {
  const list = $('#history-list');
  list.innerHTML = '';
  const real = recordsToSessions(RECORDS);
  const sessions = real.length ? real : HISTORY;
  const sub = $('#hist-sub');
  if (sub) {
    sub.textContent = real.length ? `これまで ${real.length} セッション` : 'サンプル表示（記録するとここに溜まる）';
  }
  sessions.forEach((h) => {
    const item = el('div', 'h-item', `
      <div class="h-date">
        <div class="h-date__d">${h.d}</div>
        <div class="h-date__m">${h.m}</div>
      </div>
      <div class="h-body">
        <div class="h-body__t">${h.title}</div>
        <div class="h-body__meta">${h.meta}</div>
      </div>
      <div class="h-vol">
        ${h.pr ? '<span class="h-badge">PR</span>' : ''}
        <b>${h.vol}</b><small>ボリューム</small>
      </div>
    `);
    list.appendChild(item);
  });
}

/* ---------- 統計: 折れ線 ---------- */

function renderLineChart() {
  const svg = $('#line-chart');
  const data = RECORDS.length ? weeklyTrend(12) : VOLUME_TREND;
  const W = 300, H = 120, pad = 8;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const step = (W - pad * 2) / (data.length - 1);
  const y = (v) => H - pad - ((v - min) / (max - min || 1)) * (H - pad * 2);
  const pts = data.map((v, i) => [pad + i * step, y(v)]);

  // 先週→今週の増減率
  const pctEl = $('#trend-pct');
  if (pctEl) {
    const last = data.at(-1);
    const prev = data.at(-2);
    if (!prev) {
      pctEl.textContent = '—';
      pctEl.className = 'panel__sub';
    } else {
      const pct = ((last - prev) / prev) * 100;
      pctEl.textContent = `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`;
      pctEl.className = 'panel__sub ' + (pct >= 0 ? 'trend-up' : 'trend-down');
    }
  }

  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const area = `${line} L${(W - pad).toFixed(1)} ${H - pad} L${pad} ${H - pad} Z`;

  // アメコミ風: 網点の下地 + 黒フチの赤ライン + 星形の到達点
  svg.innerHTML = `
    <defs>
      <pattern id="dots" width="8" height="8" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.3" fill="#16120d" opacity="0.16"/>
      </pattern>
    </defs>
    <path d="${area}" fill="url(#dots)"/>
    <path d="${line}" fill="none" stroke="#16120d" stroke-width="6"
      stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${line}" fill="none" stroke="#e6332a" stroke-width="3.5"
      stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${pts.at(-1)[0].toFixed(1)}" cy="${pts.at(-1)[1].toFixed(1)}" r="5.5"
      fill="#ffd23f" stroke="#16120d" stroke-width="2.5"/>
  `;
}

function renderMuscles() {
  const list = $('#muscle-list');
  list.innerHTML = '';
  let data = MUSCLES;
  if (RECORDS.length) {
    const volByPart = new Map();
    RECORDS.forEach((r) => {
      const k = String(r.muscle || 'その他');
      volByPart.set(k, (volByPart.get(k) || 0) + recVol(r));
    });
    const max = Math.max(...volByPart.values(), 1);
    data = GROUP_META.map((g) => ({
      name: g.name,
      pct: Math.round(((volByPart.get(g.name) || 0) / max) * 100),
    }));
  }
  data.forEach((m) => {
    const li = el('li', null, `
      <span class="m-name">${esc(m.name)}</span>
      <span class="m-track"><span class="m-fill" style="width:0"></span></span>
      <span class="m-pct">${m.pct}%</span>
    `);
    list.appendChild(li);
    requestAnimationFrame(() => { $('.m-fill', li).style.width = `${m.pct}%`; });
  });
}

function renderPRs() {
  const list = $('#pr-list');
  list.innerHTML = '';
  const prs = RECORDS.length
    ? realPRs().slice(0, 3).map((p) => ({ name: p.name, v: `${p.w} kg`, r: `×${p.r}` }))
    : PRS;
  prs.forEach((p) => {
    list.appendChild(el('li', null, `<span>${esc(p.name)}</span><b>${p.v} <small>${p.r}</small></b>`));
  });
}

/* ---------- メニュー編集（部位別） ---------- */

function activeMenu() {
  return MENUS.find((m) => m.id === activeMenuId) || MENUS[0];
}

function countInActiveMenu() {
  return MUSCLE_GROUPS.reduce(
    (n, g) => n + g.items.filter((it) => it.menus.includes(activeMenuId)).length,
    0
  );
}

function renderMenuTabs() {
  const wrap = $('#menu-tabs');
  wrap.innerHTML = '';
  MENUS.forEach((m) => {
    const chip = el('button', 'menu-chip' + (m.id === activeMenuId ? ' is-active' : ''), m.name.split(' — ')[0]);
    chip.setAttribute('role', 'tab');
    chip.addEventListener('click', () => { activeMenuId = m.id; renderMenu(); });
    wrap.appendChild(chip);
  });
  // ＋ 新規メニュー
  const add = el('button', 'menu-chip menu-chip--add', '＋');
  add.setAttribute('aria-label', '新しいメニューを追加');
  add.addEventListener('click', () => {
    menuSeq += 1;
    const id = `custom-${menuSeq}`;
    MENUS.push({ id, name: `新しいメニュー ${menuSeq}` });
    activeMenuId = id;
    renderMenu();
    $('#menu-name').focus();
    $('#menu-name').select();
    scheduleMenuSave();
  });
  wrap.appendChild(add);
}

function renderMenuName() {
  const input = $('#menu-name');
  input.value = activeMenu().name;
}

function renderMuscleGroups() {
  const root = $('#muscle-groups');
  root.innerHTML = '';

  MUSCLE_GROUPS.forEach((g) => {
    const inMenu = g.items.filter((it) => it.menus.includes(activeMenuId)).length;
    const section = el('section', `mg mg--${g.color}` + (g.open ? ' is-open' : ''));

    // ヘッダー（アコーディオン開閉）
    const head = el('button', 'mg__head');
    head.setAttribute('aria-expanded', String(g.open));
    head.innerHTML = `
      <span class="mg__dot">${g.icon}</span>
      <span class="mg__name">${g.name}</span>
      <span class="mg__count">${inMenu > 0 ? `${inMenu} 種目` : '—'}</span>
      <span class="mg__chev" aria-hidden="true">▸</span>
    `;
    head.addEventListener('click', () => { g.open = !g.open; renderMuscleGroups(); });
    section.appendChild(head);

    // ボディ（種目リスト + 追加）
    const body = el('div', 'mg__body');
    g.items.forEach((it, idx) => body.appendChild(buildMenuItem(g, it, idx)));
    body.appendChild(buildAddRow(g));
    section.appendChild(body);

    root.appendChild(section);
  });

  $('#menu-count').textContent = `${countInActiveMenu()} 種目`;
}

function buildMenuItem(group, item, idx) {
  const on = item.menus.includes(activeMenuId);
  const row = el('div', 'mg-item' + (on ? ' is-on' : ''));

  const toggle = el('button', 'toggle' + (on ? ' is-on' : ''));
  toggle.setAttribute('role', 'switch');
  toggle.setAttribute('aria-checked', String(on));
  toggle.setAttribute('aria-label', `${item.name} をメニューに${on ? '入れる' : '追加'}`);
  toggle.addEventListener('click', () => {
    if (on) {
      item.menus = item.menus.filter((id) => id !== activeMenuId);
    } else {
      item.menus = [...item.menus, activeMenuId];
    }
    renderMuscleGroups();
    scheduleMenuSave();
  });

  const name = el('span', 'mg-item__name', item.name);

  const del = el('button', 'mg-item__del', '×');
  del.setAttribute('aria-label', `${item.name} を種目マスタから削除`);
  del.addEventListener('click', () => {
    group.items = group.items.filter((_, i) => i !== idx);
    renderMuscleGroups();
    scheduleMenuSave();
  });

  row.append(toggle, name, del);
  return row;
}

function buildAddRow(group) {
  const wrap = el('form', 'mg-add');
  const input = el('input', 'mg-add__in');
  input.type = 'text';
  input.placeholder = `${group.name}の種目を追加…`;
  input.maxLength = 24;

  const btn = el('button', 'mg-add__btn', '追加');
  btn.type = 'submit';

  wrap.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    group.items = [...group.items, { name, menus: [activeMenuId] }];
    group.open = true;
    renderMuscleGroups();
    scheduleMenuSave();
  });

  wrap.append(input, btn);
  return wrap;
}

function renderMenu() {
  renderMenuTabs();
  renderMenuName();
  renderMuscleGroups();
}

/* メニュー名の編集を反映 */
function bindMenuName() {
  const input = $('#menu-name');
  input.addEventListener('input', () => {
    activeMenu().name = input.value || '無題のメニュー';
    renderMenuTabs();
    scheduleMenuSave();
  });
}

/* ---------- 永続化（スプレッドシートDB / localStorage） ---------- */

/* 現在のメニュー/種目マスタを保存用フォーマットに変換 */
function serializeMenus() {
  return MENUS.map((m) => ({ id: m.id, name: m.name }));
}
function serializeExercises() {
  const out = [];
  MUSCLE_GROUPS.forEach((g) => {
    g.items.forEach((it) => out.push({ group: g.key, name: it.name, menus: it.menus }));
  });
  return out;
}

/* メニュー編集はデバウンスして保存（連打しても最後の1回だけ送る） */
let menuSaveTimer = null;
function scheduleMenuSave() {
  clearTimeout(menuSaveTimer);
  menuSaveTimer = setTimeout(async () => {
    const res = await Api.saveMenus(serializeMenus(), serializeExercises());
    toast(saveLabel(res));
  }, 700);
}

/* 読み込んだデータをアプリの状態に反映 */
function applyLoaded(data) {
  if (data.menus && data.menus.length) {
    MENUS.length = 0;
    data.menus.forEach((m) => MENUS.push({ id: String(m.id), name: m.name }));
    activeMenuId = MENUS[0].id;
    let maxN = 0;
    MENUS.forEach((m) => {
      const mm = /^custom-(\d+)$/.exec(m.id);
      if (mm) maxN = Math.max(maxN, Number(mm[1]));
    });
    menuSeq = maxN;
  }
  if (data.exercises && data.exercises.length) {
    MUSCLE_GROUPS.length = 0;
    GROUP_META.forEach((meta) => {
      const items = data.exercises
        .filter((x) => x.group === meta.key)
        .map((x) => ({ name: x.name, menus: [...(x.menus || [])] }));
      MUSCLE_GROUPS.push({ ...meta, open: meta.key === 'chest', items });
    });
  }
  RECORDS = data.records || [];
}

/* トレーニング終了時: 完了セットを記録として保存 */
async function saveSession() {
  const today = todayStr();
  const menu = logMenuName || todayMenu().name;
  const recs = [];
  EXERCISES.forEach((ex) => {
    ex.sets.forEach((s) => {
      if (s.done) {
        recs.push({ date: today, exercise: ex.name, muscle: ex.muscle, weight: s.w, reps: s.r, rpe: '', menu });
      }
    });
  });
  if (recs.length === 0) {
    toast('完了したセットがありません');
    return;
  }
  RECORDS = [...recs, ...RECORDS];
  // 記録が増えたのでホーム・履歴・統計を再集計
  renderHistory();
  renderHome();
  renderHomeBars();
  renderLineChart();
  renderMuscles();
  renderPRs();
  const res = await Api.addRecords(recs);
  toast(res.ok ? `${recs.length}セットを${Api.isRemote() ? '同期' : '保存'}` : 'オフライン(未同期)');
}

/* ＋種目を追加: 今日の部位のまだ入れてない種目から順に足す */
function bindAddExercise() {
  const btn = $('#add-exercise');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const menu = todayMenu();
    const inSession = new Set(EXERCISES.map((e) => e.name));
    const groups = [...MUSCLE_GROUPS].sort(
      (a, b) => Number(b.key === menu.id) - Number(a.key === menu.id)
    );
    for (const g of groups) {
      const item = g.items.find((it) => !inSession.has(it.name));
      if (!item) continue;
      EXERCISES.push(makeSessionExercise(item.name, g, lastRecordsFor(item.name)));
      renderExercises();
      updateLogSummary();
      toast(`${item.name} を追加`);
      return;
    }
    toast('追加できる種目がありません');
  });
}

function saveLabel(res) {
  if (!res || !res.ok) return 'オフライン(未同期)';
  return Api.isRemote() ? '同期しました' : 'ローカル保存';
}

/* ---------- 保存トースト ---------- */

let toastTimer = null;
function toast(msg) {
  let node = $('#sync-toast');
  if (!node) {
    node = el('div', 'sync-toast');
    node.id = 'sync-toast';
    document.body.appendChild(node);
  }
  node.textContent = msg;
  node.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('is-show'), 1800);
}

/* ---------- 初期化 ---------- */

async function init() {
  // 保存済みデータ（スプレッドシート or localStorage）があれば読み込んで反映
  try {
    const data = await Api.loadAll();
    if (data) applyLoaded(data);
  } catch (err) {
    console.warn('[init] データ読み込みに失敗、初期サンプルで起動:', err);
  }

  buildTodayExercises(); // 今日の部位の種目で記録画面を組む
  renderHome();
  renderHomeBars();
  renderExercises();
  updateLogSummary();
  renderHistory();
  renderLineChart();
  renderMuscles();
  renderPRs();
  renderMenu();
  bindMenuName();
  bindAddExercise();

  // トレーニング終了 → 完了セットを記録として保存
  const finish = $('#finish-session');
  if (finish) finish.addEventListener('click', saveSession);
}

document.addEventListener('DOMContentLoaded', init);
