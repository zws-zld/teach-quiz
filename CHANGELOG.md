# CHANGELOG

> 每次改动/发布追加一条：时间 | 端 | 版本 | 题量 | 摘要。时间用北京时间（UTC+8）。

## 2026-11-20 | 本地端（原会话）| 初始化真相源
- 创建私有仓库 `teacher-quiz`，作为双端协作唯一真相源（v2.0 方案）。
- 基线：plan-3.0-learn-3616 / 3630 题 / 19 周 / 76 天 / planTotal 729（729 口径暂不改动）。
- 入库源码已脱敏：sharecode 用 `__WB_SHARECODE__` 占位，真实值放本地 `config.local.js`（不入库）；keystore 不入包。
- 五处数据 MD5 一致、729 qid 保护、URL 完整，经 `tools/verify.js` 校验通过。
