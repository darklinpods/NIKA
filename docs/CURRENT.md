# 当前开发现场 (Current)

记录项目当前状态、最近一次工作和下一步建议。每轮开发完成后更新，用于降低上下文断层。

---

## 当前阶段

NIKA 已具备案件看板、证据导入、AI 抽取、Agent 对话、证据整理、PDF 页级整理和文书生成能力，并已完成 Vercel + Supabase 的云端生产部署。当前阶段重点是把本地开发与云端生产统一到同一套 PostgreSQL 数据库，同时继续稳定证据管理、案件事实、证据派生数据和生成文档的边界。

---

## 最近一次工作

- 完成 Supabase 新项目连接验证，并将生产数据库从本地 SQLite 切换为 Supabase PostgreSQL。
- 已把本地 SQLite 中 70 个案件迁移到 Supabase，仅保留案件名称、阶段和案由；其他运行必填字段使用最小默认值。
- 本地 `server/.env` 已指向 Supabase pooler，本地无需安装 Supabase 服务即可读取云端数据。
- Supabase pooler 与 Prisma Client 使用 `?pgbouncer=true` 兼容参数，避免 prepared statement 冲突。
- Vercel 项目 `nika` 已绑定 GitHub 仓库并完成生产部署，生产别名为 `https://nika-liard.vercel.app`。
- `vercel.json` 指定 `outputDirectory: client/dist`，避免 Vercel 默认寻找 `public`。
- 修复 Vercel Serverless 只读文件系统导致的 API 启动失败：知识库上传由 `multer({ dest: 'uploads/' })` 改为 `memoryStorage()`。
- 已运行本地 `npm run build`，并验证本地 API 能从 Supabase 读取 70 个案件。
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

当前工作区已提交并推送，最近提交：

- `1968f73 Fix Vercel deployment configuration`

### 云端部署与数据库
- `vercel.json`
  - 指定 `buildCommand: npm run build`。
  - 指定 `outputDirectory: client/dist`。
  - API 请求 rewrite 到 `/api/index.ts`，SPA fallback 到 `/index.html`。
- `.gitignore`
  - 忽略 `.vercel` 本地绑定目录。
- `server/src/routes/knowledgeRoutes.ts`
  - 知识库上传改用 `multer.memoryStorage()`，避免 Vercel Serverless 启动时创建只读目录。
- `server/src/services/knowledgeService.ts`
  - 上传文件优先读取 `file.buffer`，并保留 `file.path` 兼容旧路径。
- `server/.env`（未提交）
  - 本地 `DATABASE_URL` 指向 Supabase pooler，并带 `?pgbouncer=true`。

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

- 已验证 Supabase pooler 连接成功。
- 已在 Supabase 创建项目表：`Case`、`SubTask`、`CaseDocument`、`CaseChatMessage`、`KnowledgeDocument`。
- 已从本地 SQLite 向 Supabase 迁移 70 个案件。
- 已验证远端案件分布：
  - `done`: 6
  - `in-progress`: 36
  - `todo`: 28
  - `traffic_accident`: 59
- 已验证本地 `http://localhost:3001/api/cases` 能返回 Supabase 中的 70 个案件。
- 已完成 Vercel production 部署，生产别名为 `https://nika-liard.vercel.app`。
- 已更新 Vercel production 环境变量，`DATABASE_URL` 使用 Supabase pooler 并带 `?pgbouncer=true`。
- 已通过 Vercel 日志确认修复后没有新的 `EROFS /var/task/uploads` 错误。
- 已运行 `npm run build`，首页案由筛选变更通过客户端 Vite 和服务端 `tsc` 构建。
- 已在 `http://localhost:3000` 验证首页案由筛选：
  - 机动车交通事故责任纠纷显示 60 件，列数量为 23 / 31 / 6。
  - 离婚显示 2 件，列数量为 1 / 1 / 0。
- 已运行 `npx prisma db push --schema=server/prisma/schema.prisma`，本地数据库已同步。
- 已运行 `npm run build`，客户端 Vite 和服务端 `tsc` 均通过。
- Vite 构建有大 chunk 警告，这是既有打包体积提示，不影响本次变更正确性。

---

## 下一步建议

1. 先手动验证线上和本地案件看板数据一致。
   - 本地：`http://localhost:3000/`
   - 线上：`https://nika-liard.vercel.app`
   - 确认 70 个案件按阶段显示。
   - 新增/编辑案件后确认本地和线上都能看到同一份 Supabase 数据。

2. 继续手动验证证据管理主流程，这是当前 P1 技术债务的第一项。
   - 上传新证据。
   - 重扫案卷，确认当事人、案由、描述同步刷新。
   - 提取发票，确认发票列表显示正常。
   - 进入策略/分析面板，确认可基于发票生成索赔试算。
   - 生成证据目录，确认包含证据类型和证明目的。

3. 验证通过后，按 `docs/TASKS.md` 的“当前技术债务总览”处理 P1 债务。
   - 证据整理结果持久化。
   - `caseFactSheet` 长期形态。
   - AI 工具结果落库策略。
   - 关键服务测试。

4. 决定是否将“证据整理结果”持久化。
   - 当前 `/organize-evidence` 和 `generate_evidence_list` 每次会重新调用 AI。
   - 如果用户需要编辑、保存、复用证据项，应新增持久化结构，例如 `EvidenceItem` 或 `evidenceData.organizedEvidence`。

5. 梳理 `caseFactSheet` 的长期形态。
   - 当前兼容 Markdown 案件事实摘要。
   - 旧的结构化事实编辑器仍会尝试解析 JSON；失败时回落为空表单。
   - 后续可考虑拆分为 `caseFactSheetMarkdown` 与 `caseFactsData`，或明确保留 Markdown 单形态。

6. 建立迁移规范。
   - 当前 Supabase 表结构由 Prisma schema 生成 SQL 后通过 `psql` 执行。
   - 若进入多人协作或长期生产部署，应改为 Prisma migration 文件管理，并区分 direct connection 与 pooler runtime connection。

---

## 注意事项

- 不要把生成文档、策略分析或证据目录再次喂给证据抽取流程。
- 不要再把 `invoices`、`claimsList` 写入 `caseFactSheet`。
- 修改证据管理、AI 工具、字段职责后，必须同步更新 `docs/DECISIONS.md` 和 `docs/AGENTS.md`。
- 不要提交 `server/.env`、`.vercel` 或任何真实数据库/API 密钥。
- 本地开发当前使用远程 Supabase，而不是本地 SQLite；如需回到 SQLite，必须同步改回 Prisma datasource 和 `DATABASE_URL`。

---

*最后更新：2026-06-07*
