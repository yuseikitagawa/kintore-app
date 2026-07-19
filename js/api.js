/* =========================================================
   データ層 — スプレッドシートDB とのやり取り
   ---------------------------------------------------------
   ・API_URL があれば Apps Script(Webアプリ) 経由で
     Googleスプレッドシートに読み書きする。
   ・無ければ localStorage に保存する（この端末内で永続）。
   どちらの場合も localStorage を「キャッシュ」として持ち、
   スプレッドシートが読めない時のフォールバックにする。

   スプレッドシートの構造（Apps Script側が自動生成）:
     記録      : id | 日付 | 種目 | 部位 | 重量kg | レップ | RPE | メニュー | 記録日時
     メニュー   : id | 名前 | 並び順
     種目マスタ : 部位キー | 種目名 | 所属メニュー(パイプ区切り)
   ========================================================= */

'use strict';

const Api = (() => {
  const url = () => (window.APP_CONFIG && window.APP_CONFIG.API_URL || '').trim();
  const isRemote = () => url().length > 0;

  const CACHE_KEY = 'kintore.cache.v1';

  /* ---- localStorage キャッシュ ---- */
  function readCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
      /* 容量超過などは黙って無視（キャッシュなので致命的でない） */
    }
  }

  /* ---- 通信 ---- */
  async function get(type) {
    const res = await fetch(`${url()}?type=${encodeURIComponent(type)}`, {
      method: 'GET',
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`GET ${type} failed: ${res.status}`);
    return res.json();
  }

  // Content-Type を text/plain にして preflight(OPTIONS) を回避する。
  // Apps Script は OPTIONS に応答しないため、これがブラウザからの定石。
  async function post(payload) {
    const res = await fetch(url(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`POST failed: ${res.status}`);
    return res.json();
  }

  /* ---- 公開API ---- */

  /**
   * 全データ取得。戻り値 { menus, exercises, records }。
   * リモートが読めなければキャッシュ、それも無ければ null。
   */
  async function loadAll() {
    if (isRemote()) {
      try {
        const data = await get('all');
        writeCache(data);
        return { ...data, source: 'remote' };
      } catch (err) {
        console.warn('[Api] リモート取得に失敗、キャッシュを使用:', err.message);
        const cached = readCache();
        return cached ? { ...cached, source: 'cache' } : null;
      }
    }
    const cached = readCache();
    return cached ? { ...cached, source: 'local' } : null;
  }

  /**
   * 完了セットを記録として追加（1セッション分まとめて）。
   * records: [{ date, exercise, muscle, weight, reps, rpe, menu }]
   */
  async function addRecords(records) {
    if (!records || records.length === 0) return { ok: true, added: 0 };

    // キャッシュにも即反映
    const cache = readCache() || { menus: [], exercises: [], records: [] };
    cache.records = [...records, ...(cache.records || [])];
    writeCache(cache);

    if (isRemote()) {
      try {
        return await post({ action: 'addRecords', records });
      } catch (err) {
        console.warn('[Api] 記録の同期に失敗（キャッシュには保存済み）:', err.message);
        return { ok: false, offline: true };
      }
    }
    return { ok: true, local: true, added: records.length };
  }

  /**
   * メニュー編集内容を丸ごと保存（メニュー一覧 + 種目マスタ）。
   * menus: [{ id, name }]、exercises: [{ group, name, menus:[id...] }]
   */
  async function saveMenus(menus, exercises) {
    const cache = readCache() || { records: [] };
    cache.menus = menus;
    cache.exercises = exercises;
    writeCache(cache);

    if (isRemote()) {
      try {
        return await post({ action: 'saveMenus', menus, exercises });
      } catch (err) {
        console.warn('[Api] メニューの同期に失敗（キャッシュには保存済み）:', err.message);
        return { ok: false, offline: true };
      }
    }
    return { ok: true, local: true };
  }

  return { isRemote, loadAll, addRecords, saveMenus };
})();

window.Api = Api;
