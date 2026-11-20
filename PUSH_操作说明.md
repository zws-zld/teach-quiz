# teacher-quiz 真相源 · 一键推送操作说明

本包已是一个**带首次 commit 的本地 Git 仓库**（首次提交 `ad1335c`），解压后只需加远程仓库地址并 push。

## 前置：在 GitHub 网页建一个**私有**空仓库

1. 打开 https://github.com/new
2. Repository name 填：`teacher-quiz`（不要叫 `-` 或 `~-`）
3. 选 **Private（私有）**
4. **不要**勾选 "Add a README" / ".gitignore" / license（保持完全空）
5. 点 Create repository，复制它给出的 HTTPS 地址，形如：
   `https://github.com/zws-zld/teacher-quiz.git`

## 推送方式一：双击一键脚本（推荐，Windows）

1. 解压本 zip 到任意文件夹。
2. 双击里面的 `一键推送.bat`。
3. 按提示粘贴仓库地址（形如 `https://github.com/zws-zld/teacher-quiz.git`），回车。
4. 弹出登录框时：账号填 `zws-zld`，密码填下方获取的 PAT。
5. 看到 `[成功] 推送完成` 即可。

（需先装 Git：https://git-scm.com/download/win ，安装一路默认。）

## 推送方式二：手动命令（Mac / Linux / 已装 Git 的命令行）

```bash
cd teacher-quiz-repo          # 进入解压后的目录
git remote add origin https://github.com/zws-zld/teacher-quiz.git
git branch -M main
git push -u origin main
```

若之前误加了错误的 remote，先 `git remote remove origin` 再重新 add。

## 关键：获取推送用的 PAT（GitHub 已不支持密码登录）

推送时"密码"要填 Personal Access Token，生成步骤：
1. 打开 https://github.com/settings/tokens → **Generate new token (classic)**。
2. Note 随便填（如 `teacher-quiz-push`），Expiration 选 90 days。
3. 勾选 **repo** 这一整项（含 repo:status / repo_deployment / public_repo / private_repo 全部子项）。
4. 点 Generate token，复制那串 `ghp_...`（只显示一次，立刻复制）。
5. 推送弹登录时用它当密码。

> 这个 PAT 只在你自己的电脑用，不要发给我、也不要发给云电脑端、不要提交进仓库。

## 推送后把下面信息发给云电脑端（另一会话）

- 仓库地址：`https://github.com/zws-zld/teacher-quiz`（私有）
- 让它用它的 GitHub 授权 clone，并按 `SEALED_填码说明.md` 本地恢复 sharecode。
- 邀请协作者：GitHub 仓库 Settings → Collaborators → 添加云电脑端使用的账号。

## 包内文件说明

| 文件 | 用途 |
|---|---|
| `tools/verify.js` | push 前自检：题量/版本/729 qid/MD5/脱敏，13 项通过才可 push |
| `CONTRIBUTING.md` | v2.0 协作规范（两端对等、改前 pull 改后 push、发布前 HEAD 最新、保密物不入库） |
| `CHANGELOG.md` | 改动与发布记录，每次追加一条 |
| `SEALED_填码说明.md` | 本地恢复 sharecode 且用 skip-worktree 避免入库的方法 |
| `.gitignore` | 排除 keystore / sharecode / bak / 大安装包 / 构建产物 |
| `quiz-data.js` 等 | 主站源码（3630 题基线，sharecode 已脱敏为占位符） |
| `site/` | Electron 站点源码（脱敏） |
| `android/www/` | 安卓 WebView 资源（脱敏） |

## 红线提醒
- 3630 题基线、729 计划点 qid 保护、题目 URL 真实性不放松（729 口径本次不改）。
- 真实 sharecode / keystore 一律不入库；推送前确认 `grep -rl 66JUX4SOAL . --exclude-dir=.git` 无输出。
- push 前先 `node tools/verify.js`，13 项全过再 push。
