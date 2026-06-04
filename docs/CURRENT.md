# 当前开发现场 (Current)

记录项目当前状态、最近一次工作和下一步建议。每轮开发完成后更新，用于降低上下文断层。

---

## 当前阶段

NIKA 已具备案件看板、证据导入、AI 抽取、Agent 对话、证据整理、PDF 页级整理和文书生成能力。当前阶段重点是把证据管理、案件事实、证据派生数据和生成文档的边界稳定下来，形成长期可维护的办案范式。

---

## 最近一次工作

- 首页案件流转看板新增案由筛选。
- 筛选选项复用 `client/constants/caseTypes.ts` 的 `CASE_TYPES`。
- 各看板列、列数量和顶部案件总数会同时应用“搜索词 + 案由”组合筛选。
- 已通过浏览器验证机动车交通事故责任纠纷和离婚案由的筛选结果。
- 按 Hermes-Team 方法论重梳理证据管理逻辑。
- 新增证据读取范式：原始证据统一为 `CaseDocument(category='Evidence')`。
- 新增 `server/src/utils/evidenceRepository.ts`，证据 AI 读取入口统一走该 helper。
- 修复 `POST /cases/:id/extract-parties` 返回契约，提取后返回完整 `caseData`。
- 新增 `Case.evidenceData`，发票和索赔试算等机器派生 JSON 迁出 `caseFactSheet`。
- 新增 `client/utils/evidenceData.ts`，前端统一读写证据派生数据，并兼容旧数据。
- 新增 `server/src/services/evidenceOrganizerService.ts`，证据整理和证据目录生成共用同一套排序、缺失检测和证明目的逻辑。
- 已同步更新根级 `AGENTS.md` 的证据管理范式。
- 已建立本目录下的项目 Wiki 六件套：`CONTEXT`、`CURRENT`、`TASKS`、`CHANGELOG`、`DECISIONS`、`AGENTS`。

---

## 当前本地修改

### 证据管理重构
- `server/src/utils/evidenceRepository.ts`
  - 新增证据分类常量、证据过滤和证据读取 helper。
- `server/src/services/evidenceOrganizerService.ts`
  - 新增证据整理服务，统一生成排序建议、缺失证据和证明目的。
- `server/src/utils/toolExecutor.ts`
  - FactAgent 工具改为只读取原始证据。
  - 发票提取写入 `evidenceData`。
  - 证据目录生成复用证据整理服务。
- `server/src/controllers/*`
  - 上传证据使用统一证据分类常量。
  - 事实提取只读取原始证据。
  - 当事人提取返回完整 `caseData`。
- `server/prisma/schema.prisma`
  - `Case` 新增 `evidenceData` 字段。
- `server/prisma/dev.db`
  - 本地 SQLite 已同步新增 `evidenceData` 列。
- `client/utils/evidenceData.ts`
  - 新增前端证据派生数据解析/序列化 helper。
- `client/components/taskModal/panels/PanelEvidence.tsx`
  - 发票读取改为使用 `evidenceData`。
  - 重扫案卷后直接使用后端返回的 `caseData`。
  - 证据整理结果显示证明目的。
- `client/components/taskModal/panels/PanelAnalysis.tsx`
  - 索赔试算读写改为使用 `evidenceData`。
- `client/types.ts`、`server/src/types.ts`
  - 同步类型字段。

### 文档体系
- `docs/`
  - 新增项目 Wiki 六件套。
- `AGENTS.md`
  - 已补充证据管理范式。

---

## 最近验证

- 已运行 `npm run build`，首页案由筛选变更通过客户端 Vite 和服务端 `tsc` 构建。
- 已在 `http://localhost:3000` 验证首页案由筛选：
  - 机动车交通事故责任纠纷显示 60 件，列数量为 23 / 31 / 6。
  - 离婚显示 2 件，列数量为 1 / 1 / 0。
- 已运行 `npx prisma db push --schema=server/prisma/schema.prisma`，本地数据库已同步。
- 已运行 `npm run build`，客户端 Vite 和服务端 `tsc` 均通过。
- Vite 构建有大 chunk 警告，这是既有打包体积提示，不影响本次变更正确性。

---

## 下一步建议

1. 先手动验证证据管理主流程，这是当前 P1 技术债务的第一项。
   - 上传新证据。
   - 重扫案卷，确认当事人、案由、描述同步刷新。
   - 提取发票，确认发票列表显示正常。
   - 进入策略/分析面板，确认可基于发票生成索赔试算。
   - 生成证据目录，确认包含证据类型和证明目的。

2. 验证通过后，按 `docs/TASKS.md` 的“当前技术债务总览”处理 P1 债务。
   - 证据整理结果持久化。
   - `caseFactSheet` 长期形态。
   - AI 工具结果落库策略。
   - 关键服务测试。

3. 决定是否将“证据整理结果”持久化。
   - 当前 `/organize-evidence` 和 `generate_evidence_list` 每次会重新调用 AI。
   - 如果用户需要编辑、保存、复用证据项，应新增持久化结构，例如 `EvidenceItem` 或 `evidenceData.organizedEvidence`。

4. 梳理 `caseFactSheet` 的长期形态。
   - 当前兼容 Markdown 案件事实摘要。
   - 旧的结构化事实编辑器仍会尝试解析 JSON；失败时回落为空表单。
   - 后续可考虑拆分为 `caseFactSheetMarkdown` 与 `caseFactsData`，或明确保留 Markdown 单形态。

5. 建立迁移规范。
   - 当前使用 `prisma db push` 直推 SQLite。
   - 若进入多人协作或生产部署，应改为 Prisma migration 文件管理。

---

## 注意事项

- 不要把生成文档、策略分析或证据目录再次喂给证据抽取流程。
- 不要再把 `invoices`、`claimsList` 写入 `caseFactSheet`。
- 修改证据管理、AI 工具、字段职责后，必须同步更新 `docs/DECISIONS.md` 和 `docs/AGENTS.md`。
- 本轮工作已有本地数据库变更：`server/prisma/dev.db`。

---

*最后更新：2026-06-04*
