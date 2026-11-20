/* ============================================================
 * 教师编刷题打卡 · 联网自动更新题库模块
 * ------------------------------------------------------------
 * 作用：让离线安装包（Windows exe / 安卓 APK）在联网时自动拉取
 *       网站上的最新题库并持久化，这样"我这边更新题库 → 用户手上的
 *       安装包打开后自动跟上"，无需用户重装。
 * 设计要点：
 *   1. 进度/收藏/错题等存在 localStorage，与本模块完全隔离，不受影响。
 *   2. 题库较大(3MB+)，用 IndexedDB 持久化，避免 localStorage 5MB 上限。
 *   3. 只在"打包环境"启用（file:// 协议 或 Electron/Capacitor UA），
 *      在线网页版本身就是最新源，跳过更新避免无谓流量。
 *   4. 拉取失败/无网络时静默，继续用内置题库，保证离线可用。
 *   5. 版本号/构建时间来自题库自带的 version 字段，题目数作兜底判断。
 * ============================================================ */
(function () {
  'use strict';

  // 在线数据源（带分享码，CORS 全开）。题库随网站更新，这里是唯一权威来源。
  // 可被 window.__WB_UPDATER_ORIGIN__ 覆盖（便于测试/换域名）。
  var ORIGIN = window.__WB_UPDATER_ORIGIN__ || 'https://a5f5b0218be54da3f.app.workbuddy.host/';
  if (ORIGIN.charAt(ORIGIN.length - 1) !== '/') ORIGIN += '/';
  var SHARE = 'sharecode=__WB_SHARECODE__';
  var URL_MAIN = ORIGIN + 'quiz-data.js?' + SHARE;     // 主刷题题库 window.__QUIZ_DATA__
  var URL_BANK = ORIGIN + 'bank-data.json?' + SHARE;   // 题目大全题库 JSON

  var DB_NAME = 'wb_quiz_update_db';
  var STORE = 'kv';
  var KEY_MAIN = 'quizData';   // 缓存的题库 JSON 字符串
  var KEY_BANK = 'bankData';   // 缓存的题目大全 JSON 字符串

  // ---------- 环境判断：只在打包版启用 ----------
  function isPackaged() {
    var ua = navigator.userAgent || '';
    // Electron 注入的 IPC 接口存在 = 一定是打包版
    if (window.electronAPI && window.electronAPI.isElectron) return true;
    var isOnlineHost = /a5f5b0218be54da3f\.app\.workbuddy\.host/.test(location.hostname);
    if (isOnlineHost) return false; // 在线版本身就是源
    // file:// (Electron) 或 Capacitor/Electron 内嵌 WebView
    if (location.protocol === 'file:') return true;
    if (/Electron|Capacitor/i.test(ua)) return true;
    // Capacitor Android 常用 http://localhost 作为 scheme
    if (/localhost|127\.0\.0\.1/.test(location.hostname) && /wv|android/i.test(ua)) return true;
    return false;
  }

  // ---------- IndexedDB 最小封装 ----------
  function openDB() {
    return new Promise(function (resolve, reject) {
      try {
        var req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      } catch (e) { reject(e); }
    });
  }
  function idbGet(key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var r = tx.objectStore(STORE).get(key);
        r.onsuccess = function () { resolve(r.result || null); };
        r.onerror = function () { reject(r.error); };
      });
    });
  }
  function idbSet(key, val) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(val, key);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  // ---------- 解析 quiz-data.js 文本为 JSON ----------
  function parseQuizJs(txt) {
    // 形如 window.__QUIZ_DATA__ = {...};
    var s = txt.replace(/^\s*window\.__QUIZ_DATA__\s*=\s*/, '').replace(/;\s*$/, '').trim();
    return JSON.parse(s);
  }

  // ---------- 版本比较：优先 version 字段，其次题目数 ----------
  function isNewer(remote, localObj) {
    if (!remote || !localObj) return false;
    if (remote.version && localObj.version && remote.version !== localObj.version) return true;
    // 题库无 version 字段时，用题目数兜底（在线更多即视为更新）
    var rc = questionsCount(remote), lc = questionsCount(localObj);
    return rc > lc;
  }
  function questionsCount(obj) {
    try {
      if (Array.isArray(obj.questions)) return obj.questions.length;
      if (obj.questions && typeof obj.questions === 'object') {
        var n = 0;
        Object.keys(obj.questions).forEach(function (w) {
          var days = obj.questions[w];
          if (Array.isArray(days)) n += days.length;
          else if (days && typeof days === 'object') {
            Object.keys(days).forEach(function (d) { n += (Array.isArray(days[d]) ? days[d].length : 0); });
          }
        });
        return n;
      }
    } catch (e) {}
    return 0;
  }

  // ---------- 应用题库到当前页面 ----------
  // app.js 暴露 window.__applyMainData(json)；没有则跳过（如 video.html 等轻量页）
  function applyMain(json) {
    try {
      if (typeof window.__applyMainData === 'function') {
        window.__applyMainData(json);
        return true;
      }
    } catch (e) {}
    return false;
  }
  function applyBank(json) {
    try {
      if (typeof window.__applyBankData === 'function') {
        window.__applyBankData(json);
        return true;
      }
    } catch (e) {}
    return false;
  }
  function notify(msg) {
    try { if (typeof window.__wbToast === 'function') window.__wbToast(msg); } catch (e) {}
    try { if (typeof toast === 'function') toast(msg); } catch (e) {}
  }

  // ---------- 统一的拉取函数：Electron 走 IPC，其余走 fetch ----------
  function fetchText(url, ipcChannel) {
    // Electron 打包版：file:// 下 fetch 跨域被禁止，走主进程 IPC
    try {
      if (window.electronAPI && typeof window.electronAPI.fetchQuiz === 'function') {
        var p = ipcChannel === 'bank' ? window.electronAPI.fetchBank() : window.electronAPI.fetchQuiz();
        return Promise.resolve(p).then(function (txt) { return txt ? { ok: true, text: function(){return Promise.resolve(txt);} } : { ok: false }; });
      }
    } catch (e) {}
    // 其他环境（Android WebView / 在线）：标准 fetch
    return fetch(url, { cache: 'no-store' }).then(function (r) {
      return { ok: r.ok, text: function () { return r.text(); } };
    });
  }

  // ---------- 启动流程 ----------
  function boot() {
    if (!isPackaged()) return; // 在线版跳过

    // 第一步：读取 IndexedDB 缓存，立即应用（这样断网也能用到上次更新的最新题库）
    idbGet(KEY_MAIN).then(function (cached) {
      if (cached) {
        try { applyMain(JSON.parse(cached)); } catch (e) {}
      }
    }).catch(function () {});
    idbGet(KEY_BANK).then(function (cached) {
      if (cached) {
        try { applyBank(JSON.parse(cached)); } catch (e) {}
      }
    }).catch(function () {});

    // 第二步：联网拉取最新，对比后持久化 + 应用
    var localMain = null;
    try { localMain = window.__QUIZ_DATA__ || null; } catch (e) {}
    fetchText(URL_MAIN, 'quiz')
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (txt) {
        if (!txt) return null;
        var remote = parseQuizJs(txt);
        // 与内置或缓存版本比较
        var base = localMain;
        return idbGet(KEY_MAIN).then(function (cached) {
          if (cached) { try { base = JSON.parse(cached); } catch (e) {} }
          if (isNewer(remote, base)) {
            return idbSet(KEY_MAIN, JSON.stringify(remote)).then(function () {
              applyMain(remote);
              notify('📚 题库已更新到最新版');
            });
          }
        });
      })
      .catch(function () {}); // 无网静默

    // 题目大全（仅 bank.html / unit.html 有对应页面时会应用，其他页面静默缓存）
    fetchText(URL_BANK, 'bank')
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (text) {
        if (!text) return null;
        try { return JSON.parse(text); } catch (e) { return null; }
      })
      .then(function (remote) {
        if (!remote || !Array.isArray(remote.questions)) return;
        return idbGet(KEY_BANK).then(function (cached) {
          var base = null;
          try { base = cached ? JSON.parse(cached) : (window.BANK_DATA || null); } catch (e) {}
          var rc = remote.questions.length, lc = base && base.questions ? base.questions.length : 0;
          if (rc > lc) {
            return idbSet(KEY_BANK, JSON.stringify(remote)).then(function () {
              if (applyBank(remote)) notify('📚 题目大全已更新');
            });
          }
        });
      })
      .catch(function () {});
  }

  // DOM 就绪后启动，确保 app.js 已完成初始化并挂好更新入口
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(boot, 50); });
  } else {
    setTimeout(boot, 50);
  }
})();
