/* =========================================================
   接続設定
   ---------------------------------------------------------
   Google Apps Script を「ウェブアプリ」としてデプロイしたら、
   発行される「/exec」で終わるURLを下の API_URL に貼り付ける。
   （手順は 03_バックエンド/README_デプロイ手順.md を参照）

   空のままでも動く。その場合はこの端末のブラウザ内(localStorage)に
   保存され、リロードしても残る。スプレッドシートには同期されない。
   ========================================================= */

window.APP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbwb5oFZPsNIn0XOZLF2ki43F1hEWsxXdpWuAko4_Pyg4U0NWH_pQ75NggrhFeDFpeOa0g/exec',
};
