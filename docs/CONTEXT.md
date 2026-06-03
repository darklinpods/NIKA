# 项目背景 (Context)

## 项目概述

**NIKA** 是面向律师办案场景的 AI 法律案件管理系统。项目以案件为核心，围绕证据导入、事实提取、诉讼策略、文书生成、任务看板和知识库问答组织工作流。

核心目标不是替代律师判断，而是把原始案卷材料转化为可复核、可编辑、可提交的办案产物，减少重复阅读、摘录和格式整理成本。

---

## 目标用户

- **主要用户**：处理民事案件的律师和律师助理
- **次要用户**：法律服务团队、法律援助机构、案件运营人员
- **核心场景**：上传证据材料后，围绕一个案件持续完成事实归纳、证据整理、索赔清单、文书草拟和庭前准备

---

## 核心功能

### 1. 案件看板
- 以 `todo / in-progress / done` 管理案件状态
- 支持案件优先级、标签、子任务、拖拽排序

### 2. 证据管理
- 支持 PDF、Word 等材料上传
- 将解析出的文本保存为原始证据文档
- 从证据中提取当事人、案由、案件事实、发票清单、时间线
- 提供证据排序建议、缺失证据检测和证据目录生成
- 支持 PDF 页级排序、旋转、多页拼合和导出

### 3. 多 Agent 办案助手
- `RouterAgent` 负责意图识别和路由
- `FactAgent` 负责事实、当事人、票据等抽取
- `DraftingAgent` 负责起诉状、证据目录等文书生成
- `StrategyAgent` 负责诉讼策略、执行计划和法律咨询

### 4. Skill 规则系统
- 每个案件类型可对应一份 Markdown Skill
- Skill 负责沉淀案件类型的赔偿规则、事实结构和文书模板要求
- 当前重点支持交通事故、离婚、民间借贷、劳务/劳动等类型

### 5. 文书生成与知识库
- 生成起诉状、证据目录、策略分析等文档
- 支持导入知识库文档，用于案件对话 RAG 上下文

---

## 技术架构

### 前端
- React 19 + TypeScript
- Vite
- Tailwind CSS
- Lucide React
- Markdown 编辑/渲染：`@uiw/react-md-editor`、`react-markdown`

### 后端
- Express + TypeScript
- Prisma ORM
- SQLite 本地数据库：`server/prisma/dev.db`
- 文件解析：PDF / Word / OCR 相关服务

### AI
- 默认 Gemini
- 可通过 `AI_PROVIDER` 切换 OpenAI 兼容供应商：DeepSeek、豆包、通义千问等
- 图片/PDF OCR 相关调用始终优先走 Gemini
- Agent 工具定义在 `server/src/utils/toolDefinitions.ts`
- 工具执行逻辑在 `server/src/utils/toolExecutor.ts`

---

## 关键数据与范式

### 案件
- 核心表：`Case`
- 关键字段：`caseType`、`parties`、`caseFactSheet`、`evidenceData`、`claimData`
- `SUPPORTED_CASE_TYPES` 是案由枚举单一来源，需与前端 case type 常量同步

### 原始证据
- 原始证据真源：`CaseDocument(category='Evidence')`
- 所有证据 AI 读取流程必须通过 `server/src/utils/evidenceRepository.ts`
- 生成文档、分析文档和策略文档是输出物，不应反向作为证据输入

### 证据派生数据
- 发票清单、索赔试算等机器派生 JSON 放在 `Case.evidenceData`
- `Case.caseFactSheet` 用于律师审核后的案件事实摘要，通常是 Markdown
- 前端通过 `client/utils/evidenceData.ts` 读取和写入派生数据，并兼容旧数据

### 证据整理
- 证据排序、缺失证据检测、证明目的生成统一走 `server/src/services/evidenceOrganizerService.ts`
- `/organize-evidence` 和 `generate_evidence_list` 必须复用该服务

---

## 项目约束

### 法律约束
- AI 产物仅作办案辅助，不构成确定性法律意见
- 不输出“保证胜诉”“一定支持”等确定性结论
- 关键事实、金额和证据目录最终应由律师复核

### 数据安全
- 不提交真实 API Key、密钥、身份证号等敏感材料
- 本地样本、数据库和案卷材料如含真实信息，应谨慎纳入版本控制

### 技术约束
- 没有测试框架配置，当前主要验证方式是 `npm run build` 和手动功能验证
- Prisma schema 修改后需要同步本地 SQLite，并确认 Prisma Client 已生成

---

## 相关资源

- `README.md`：项目总体说明
- `AGENTS.md`：仓库级编码和协作规则
- `docs/CURRENT.md`：当前现场
- `docs/TASKS.md`：任务清单
- `docs/DECISIONS.md`：关键决策记录
- `docs/CHANGELOG.md`：开发日志

---

*最后更新：2026-06-03*

