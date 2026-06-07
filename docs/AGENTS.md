# AI 协作规范 (Agents)

本文档定义与 AI 协作开发 NIKA 的长期工作范式。目标是让每轮开发都能接上现场、边界清晰、变更可追踪。

---

## 核心原则

### 1. 文档同步优先

每次完成功能开发、修复、重构或重要调研后，按触发条件同步更新：

- `docs/CURRENT.md`：记录当前现场、最近工作、下一步建议
- `docs/TASKS.md`：更新任务状态、验收标准和新发现问题
- `docs/CHANGELOG.md`：记录做了什么、影响范围
- `docs/DECISIONS.md`：记录重要技术或业务决策
- `docs/CONTEXT.md`：当项目长期定位、架构或关键范式变化时更新

### 2. 渐进式实现

- 每轮聚焦 1-2 个具体目标
- 先做最小可验证改动，再扩展模型或 UI
- 复杂任务必须写清楚验收标准和不做范围
- 不为尚未明确的未来需求提前建大抽象

### 3. 业务分层清晰

NIKA 的核心分层：

1. 原始输入：证据文件、知识库文档、用户编辑内容
2. AI 派生：当事人、案由、发票、时间线、证据排序、缺失证据
3. 律师审核：案件事实摘要、索赔清单、策略判断
4. 输出物：起诉状、证据目录、打印清单、导出的 PDF/Word

新增功能必须先说明自己属于哪一层，避免数据反向污染。

### 4. 法律风险边界

- AI 输出只作为办案辅助
- 不输出“保证胜诉”“法院一定支持”等确定性结论
- 金额、事实、证据目录、诉讼策略都应保留律师复核入口
- 真实案件数据、身份证号、联系方式等敏感信息不得无意识写入公开文档或提交

---

## 标准开发循环

```text
1. 阅读 docs/CURRENT.md，确认当前现场
2. 阅读 docs/TASKS.md，选择下一项任务
3. 明确目标、验收标准和不做范围
4. 阅读相关代码，确认现有模式
5. 小步实现
6. 运行合适验证：npm run build / 手动流程 / 数据库 schema 检查
7. 更新 docs/CURRENT.md、TASKS.md、CHANGELOG.md
8. 若有重要取舍，更新 docs/DECISIONS.md
```

---

## NIKA 关键开发规则

### 证据管理

- 原始证据真源是 `CaseDocument(category='Evidence')`
- 证据 AI 读取必须使用 `server/src/utils/evidenceRepository.ts`
- 生成文档、分析文档和策略文档是输出物，不得默认作为证据输入
- 发票、索赔试算等机器派生 JSON 写入 `Case.evidenceData`
- `Case.caseFactSheet` 是律师审核的案件事实摘要，通常是 Markdown
- 证据整理和证据目录生成必须复用 `server/src/services/evidenceOrganizerService.ts`

### AI JSON 解析

- AI 返回 JSON 时必须使用 `cleanAndParseJsonObject()` 或 `cleanAndParseJsonArray()`
- 不直接 `JSON.parse()` AI 原始输出
- 严格 JSON 抽取默认使用非流式响应，优先保证完整性

### Agent 工具

- 工具 schema 写在 `server/src/utils/toolDefinitions.ts`
- 工具执行写在 `server/src/utils/toolExecutor.ts`
- 新增工具时必须说明：
  - 触发场景
  - 是否写数据库
  - 输出给用户的格式
  - 是否读取原始证据

### 案件类型

- `server/src/constants.ts` 的 `SUPPORTED_CASE_TYPES` 是后端案由单一来源
- `client/constants/caseTypes.ts` 必须同步
- 新增案件类型通常需要同步：
  - Skill 文件
  - SkillLoader 映射
  - 证据清单或证据整理标准
  - 打印材料清单
  - 前端展示 label

### 数据库

- 当前数据库真源是 Supabase PostgreSQL，本地开发和 Vercel production 共用远程库
- 本地不需要安装 Supabase；通过 `DATABASE_URL` 连接远程 Postgres
- 运行时使用 Supabase pooler URL，并带 `?pgbouncer=true`
- 不提交 `server/.env`、`.vercel` 或任何真实连接串/密钥
- Prisma CLI 迁移后续应使用 direct connection，运行时继续使用 pooler connection
- JSON 字符串字段写入前必须 `JSON.stringify()`
- 读取时必须容错解析
- 修改 `server/prisma/schema.prisma` 后需要同步 Supabase schema 并生成 Prisma Client
- 生产/多人协作应优先使用 Prisma migration，而不是临时 SQL 或只用 `db push`

### Vercel Serverless

- 前端构建产物目录是 `client/dist`，`vercel.json` 必须显式配置 `outputDirectory`
- API 入口是根级 `api/index.ts`
- Serverless 函数运行目录只读，不要写 `uploads/`、项目目录或相对路径缓存
- 上传文件优先使用 `multer.memoryStorage()`；如必须落盘，只能写 `/tmp` 并负责清理

---

## 文档更新触发条件

### 必须更新 CHANGELOG.md

- 新增用户可感知功能
- 修复影响结果正确性或稳定性的 bug
- AI prompt、工具、证据规则、字段职责发生变化
- 数据库 schema 变化
- 重要重构

### 必须更新 TASKS.md

- 开始、暂停、完成或放弃任务
- 任务已有代码推进但尚未验证
- 发现新的 P0/P1 问题
- 验收标准或不做范围变化

### 必须更新 DECISIONS.md

- 新增架构层、服务层或数据模型
- 改变证据管理、案件事实、文书生成等核心范式
- 更换 AI 调用方式、模型或 provider 策略
- 引入新依赖或新的持久化策略

### 必须更新 CURRENT.md

- 每轮开发完成后
- 留下未完成代码、待验证事项或已知风险
- 下一步优先级变化
- 本地环境状态发生变化，例如数据库已迁移

---

## 命令输出规范

未知或可能很大的命令输出要限制范围，避免上下文被日志淹没。

优先使用：

```bash
rg "pattern" path
find path -maxdepth 3 -type f
sed -n '1,220p' file
git status --short
git diff --stat
```

对大型日志或长 diff，使用较小范围或输出上限。

---

## 常见任务模板

### 新增证据相关功能

1. 判断属于原始证据、派生数据、律师审核数据还是输出物
2. 如果读取证据，使用 `evidenceRepository`
3. 如果保存派生 JSON，使用 `evidenceData`
4. 如果影响证据目录或证明目的，复用或扩展 `evidenceOrganizerService`
5. 更新 `docs/DECISIONS.md` 或 `docs/CHANGELOG.md`

### 新增案件类型

1. 更新 `SUPPORTED_CASE_TYPES`
2. 同步前端 case type 常量
3. 添加或更新 Skill 文件
4. 更新 `SkillLoader`
5. 补充证据标准和打印清单
6. 更新 `docs/CONTEXT.md` 和 `docs/CHANGELOG.md`

### 修改 AI Prompt 或工具

1. 确认输出是自然语言还是严格 JSON
2. 严格 JSON 使用统一解析 helper
3. 明确是否写数据库
4. 验证工具调用路径
5. 更新 `docs/CHANGELOG.md`
6. 若改变范式，更新 `docs/DECISIONS.md`

---

## 禁止事项

- 不提交 API Key、真实敏感案卷材料或密钥
- 不把输出文档当作原始证据再喂给 AI
- 不把机器派生 JSON 写进 `caseFactSheet`
- 不直接用 `JSON.parse()` 解析 AI 原始响应
- 不在没有验证的情况下宣称功能完成
- 不删除历史文档记录；需要修正时追加说明
- 不输出确定性法律承诺

---

*最后更新：2026-06-07*
