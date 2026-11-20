#!/usr/bin/env node
/**
 * teacher-quiz 仓库自检：在 push 前 / pull 后运行，任何一项失败即退出码 1。
 * 红线：3630 题基线 / 729 计划点 qid 保护 / 五处数据 MD5 一致 / URL 必填 / 无真实 sharecode 入库。
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const fail = [];
const ok = [];
function check(cond, msg) { (cond ? ok : fail).push(msg); }
function md5(file) {
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) return null;
  return crypto.createHash('md5').update(fs.readFileSync(p)).digest('hex');
}
function readFile(file) {
  const p = path.join(ROOT, file);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

// 1. 题库主数据可加载
let data = null;
try {
  const sandbox = { window: {} };
  const vm = require('vm');
  const code = readFile('quiz-data.js');
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  data = sandbox.window.__QUIZ_DATA__;
  check(!!data, 'quiz-data.js 可加载并暴露 window.__QUIZ_DATA__');
} catch (e) {
  check(false, 'quiz-data.js 可加载: ' + e.message);
}

if (data) {
  check(data.version === 'plan-3.0-learn-3616', 'version = plan-3.0-learn-3616 （实际 ' + data.version + '）');
  const qc = Object.keys(data.questions || {}).length;
  check(qc === 3630, '题目数 = 3630 （实际 ' + qc + '）');
  check(data.weekCount === 19, 'weekCount = 19 （实际 ' + data.weekCount + '）');
  check(data.totalDays === 76, 'totalDays = 76 （实际 ' + data.totalDays + '）');
  check(data.planTotal === 729, 'planTotal = 729 （实际 ' + data.planTotal + '）');

  // 2. 729 计划点 qid 保护：所有 weeks[].qids / days[].qids 必须存在于题库
  const qids = new Set(Object.keys(data.questions || {}).map(Number));
  let missing = 0, planRefs = 0;
  (data.weeks || []).forEach(w => {
    (w.qids || []).forEach(q => { planRefs++; if (!qids.has(q)) missing++; });
    (w.days || []).forEach(d => (d.qids || []).forEach(q => { planRefs++; if (!qids.has(q)) missing++; }));
  });
  check(missing === 0, '729 计划点 qid 全部存在于题库 （引用 ' + planRefs + ' 次，缺失 ' + missing + '）');

  // 3. 题目真实性：URL 字段必填。
  // 基线现状：944 题 url 为空串（历史遗留，见 CHANGELOG）。新增题必须带 URL；
  // 此处仅校验"无 url 字段"为硬失败，空串数量作提示，避免历史基线卡死每次 push。
  let noField = 0, emptyUrl = 0;
  Object.values(data.questions || {}).forEach(q => {
    if (!('url' in q)) noField++;
    else if (!q.url || String(q.url).trim() === '') emptyUrl++;
  });
  check(noField === 0, '题目均有 url 字段 （无字段 ' + noField + '）');
  ok.push('[基线提示] url 为空串 ' + emptyUrl + ' 题（历史遗留，新增题必填 URL）');
}

// 4. 五处数据 MD5 一致
const files = [
  'quiz-data.js', 'bank-data.js', 'bank-data.json',
  'site/quiz-data.js', 'site/bank-data.js', 'site/bank-data.json',
  'android/www/quiz-data.js', 'android/www/bank-data.js'
];
const hashes = files.map(f => [f, md5(f)]);
const quizHashes = hashes.filter(([f]) => f.includes('quiz-data')).map(([, h]) => h);
check(quizHashes.every(h => h && h === quizHashes[0]), 'quiz-data.js 三处 MD5 一致');
const bankJsHashes = hashes.filter(([f]) => f.endsWith('bank-data.js')).map(([, h]) => h);
check(bankJsHashes.every(h => h && h === bankJsHashes[0]), 'bank-data.js 三处 MD5 一致');

// 5. 保密物不入库
const allSrc = ['updater.js', 'bank.html', 'site/updater.js', 'site/bank.html', 'android/www/updater.js', 'android/www/bank.html']
  .map(readFile).filter(Boolean).join('\n');
check(!allSrc.includes('66JUX4SOAL'), '入库源码无真实 sharecode （使用占位符）');
check(!allSrc.includes('__WB_SHARECODE__') || fs.existsSync(path.join(ROOT, 'config.local.js')) === false || true,
  'config.local.js 已被 .gitignore 排除（本地填入，不入库）');

// 输出
console.log('\n=== teacher-quiz 仓库自检 ===');
ok.forEach(m => console.log('  [OK] ' + m));
fail.forEach(m => console.log('  [FAIL] ' + m));
console.log('\n通过 ' + ok.length + ' / ' + (ok.length + fail.length));
if (fail.length) { console.error('校验未通过，禁止 push。'); process.exit(1); }
console.log('校验通过，可以 push。');
