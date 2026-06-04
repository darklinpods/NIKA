# 开发日志 (Changelog)

记录项目的重要更新、修复和优化。

## 格式说明

每条记录包含：
- **日期**：YYYY-MM-DD
- **类型**：[新增] / [修复] / [优化] / [重构] / [文档]
- **内容**：简要描述变更内容
- **影响范围**：涉及的功能模块或文件

---

## 2026-06-04

### [新增] 首页支持按案由筛选案件
- 在案件流转看板工具栏增加案由下拉筛选
- 筛选选项复用前端 `CASE_TYPES` 常量
- 各看板列、列数量和顶部案件总数同步应用案由筛选
- 现有标题/当事人搜索可与案由筛选组合使用

**影响范围**：`client/components/BoardView.tsx`

---

## 2026-06-03

### [重构] 梳理证据管理范式
- 明确原始证据真源为 `CaseDocument(category='Evidence')`
- 新增 `server/src/utils/evidenceRepository.ts`，集中管理证据读取和过滤
- 将当事人提取、发票提取、事实提取、时间线生成、智能文书生成等证据读取入口改为只读取原始证据
- 避免生成文档、策略分析、证据目录等输出物被再次喂给 AI

**影响范围**：`server/src/utils/evidenceRepository.ts`、`server/src/utils/toolExecutor.ts`、`server/src/controllers/factSheetController.ts`、`server/src/controllers/caseController.ts`

### [修复] 重扫案卷后返回完整案件数据
- `executeExtractParties` 在更新当事人、案由和案件描述后返回完整 `caseData`
- `POST /cases/:id/extract-parties` 透传 `caseData`
- 前端证据面板直接使用返回的完整案件对象刷新本地状态，避免手工合并字段遗漏

**影响范围**：`server/src/utils/toolExecutor.ts`、`server/src/controllers/partiesController.ts`、`client/components/taskModal/panels/PanelEvidence.tsx`

### [重构] 拆分案件事实与证据派生数据
- Prisma `Case` 新增 `evidenceData` 字段
- 发票清单、索赔试算等机器派生 JSON 从 `caseFactSheet` 迁移到 `evidenceData`
- `caseFactSheet` 回归律师审核的案件事实摘要，通常为 Markdown
- 新增前端 `client/utils/evidenceData.ts`，统一解析和序列化证据派生数据，并兼容旧数据

**影响范围**：`server/prisma/schema.prisma`、`server/prisma/dev.db`、`server/src/utils/toolExecutor.ts`、`client/utils/evidenceData.ts`、`client/components/taskModal/panels/PanelEvidence.tsx`、`client/components/taskModal/panels/PanelAnalysis.tsx`

### [重构] 证据整理与证据目录共用服务
- 新增 `server/src/services/evidenceOrganizerService.ts`
- `/organize-evidence` 和 `generate_evidence_list` 共用排序、缺失检测、证据类型和证明目的生成逻辑
- 证据目录从“文件名编号”升级为“证据名称 + 证据类型 + 证明目的”的 Markdown 表格

**影响范围**：`server/src/services/evidenceOrganizerService.ts`、`server/src/controllers/evidenceOrganizerController.ts`、`server/src/utils/toolExecutor.ts`、`client/services/api.ts`

### [文档] 建立 NIKA 项目 Wiki 体系
- 新增 `docs/CONTEXT.md`
- 新增 `docs/CURRENT.md`
- 新增 `docs/TASKS.md`
- 新增 `docs/CHANGELOG.md`
- 新增 `docs/DECISIONS.md`
- 新增 `docs/AGENTS.md`
- 将 `word-assist/docs` 的 Hermes-Team 文档范式适配到 NIKA

**影响范围**：`docs/`

---

*注：每次重大更新后，请在此处添加记录。保持简洁，聚焦“做了什么”和“影响哪里”。*
