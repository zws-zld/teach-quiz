# 本地填码说明（真实 sharecode 不入库）

为满足"sharecode 不入库"红线，入库源码中的 sharecode 已替换为占位符 `__WB_SHARECODE__`。
每台需要联网自动更新的机器，按下面步骤**在本地恢复**真实码，但**不要把它提交进仓库**。

## 恢复步骤（clone 之后做一次）

### 方式一：全局替换 + 让 Git 忽略本地改动（推荐）

1. 在这 6 个文件中，把 `__WB_SHARECODE__` 全部替换回 `66JUX4SOAL`：
   - `updater.js`、`bank.html`
   - `site/updater.js`、`site/bank.html`
   - `android/www/updater.js`、`android/www/bank.html`
2. 让 Git 忽略这些文件的本地改动（替换只留在你本机，不会进 commit）：
   ```bash
   git update-index --skip-worktree updater.js bank.html site/updater.js site/bank.html android/www/updater.js android/www/bank.html
   ```
3. 以后这些文件的本地真实码不会出现在 `git status` / `git diff`，也不会被 push。
   - 若某次确实要提交对这些文件的其它合法改动，先 `git update-index --no-skip-worktree <file>` 解除。

### 方式二：构建/发布时临时注入
在 CI 或本地构建脚本里把占位符替换为环境变量注入的真实值，源码仓库始终保持占位符状态。

## 保密物清单（一律不入库）
- 在线站 sharecode：`66JUX4SOAL`（本机恢复，不 commit）。
- 安卓签名 keystore：`release.keystore` / `*.jks`（按端保管，本包未包含）。
- 任何 token / 密钥。

> 核对命令：`grep -rl 66JUX4SOAL . --exclude-dir=.git` 若在你 push 前有输出，说明真实码会被提交，请先还原为占位符。
