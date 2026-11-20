# teacher-quiz · 协作规范（v2.0 · Git 真相源）

> 本仓库是「湖南教师招聘（教综+历史）刷题系统」两端协作的**唯一真相源**。
> 生效后取代契约 v1.0 第三、六条。两端地位对等，一致性靠 Git 工具保证，不靠人守纪律。

## 项目基线（红线，不因协作方式改变而放松）
- 题库：`plan-3.0-learn-3616`，当前 **3630 题**；`weekCount=19`、`totalDays=76`、`total/planTotal=729`（729 口径暂不改动）。
- 题目全部来自公开可核验来源并保留 URL，**严禁编造**。
- 729 计划点 qid 保护：所有 `weeks[].qids` / `days[].qids` 必须存在于题库。
- 安卓包名 `com.workbuddy.teacherquiz`；自动更新 v2 见 `updater.js`。

## 五条铁律（push 前必过 verify.js）
1. 新增不改旧 id；
2. 729 计划点 qid 保护；
3. 五处数据（主站 / Electron site / Android www 的 quiz-data、bank-data）MD5 一致；
4. 题目真实性、URL 字段必填；
5. 改后必验：`node tools/verify.js` + 端到端零 JS 错误。

## 工作流（v2.0）
- **开工**：`git pull` → 读 `CHANGELOG.md`，确认无另一端未合入改动 → 再动手。
- **改动**：改 → `node tools/verify.js` → `git add` → `git commit -m "改了什么/几题/哪端"` → `git push`。
- **发布**：发布前确认 `git pull` 后 HEAD 为最新 → 部署 → 在 `CHANGELOG.md` 追加一条发布记录。
- **收尾**：在资料库 02/03 文件夹更新状态快照（迁移期双轨，稳定后再精简）。

## 纪律
- 改前 pull、改后 commit+push；**禁止 `git push --force`**，冲突必须人工解决。
- 发布前 HEAD 必须等于仓库最新 HEAD；发布后必须记 CHANGELOG。
- **保密物不入库**：签名 keystore、真实 sharecode 一律不提交（见 `.gitignore` 与 `SEALED_填码说明.md`）。
- 当前发布模式：若为"双改单发"，代码靠本仓库同步一致，发布收敛在持有发布凭证的一端。

## 本地恢复自动更新
clone 后按 `SEALED_填码说明.md` 在本机生成 `config.local.js` 填入真实 sharecode，即可恢复联网自动更新；该文件不入库。
