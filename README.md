# ⚖️ NIKA - AI 法律案件管理系统

为律师量身定制的 AI 驱动案件管理平台。通过多 Agent 协作架构，自动完成证据解析、文书生成、诉讼策略分析，覆盖案件全生命周期。

---

## 🤖 AI 架构概览

NIKA 的核心是一套**多 Agent 协作系统**，由 RouterAgent 统一调度，将用户的自然语言请求路由至专业子 Agent 执行。

```
用户自然语言输入
        │
        ▼
  RouterAgent（意图识别 + 路由）
   ┌─────┼──────────┐
   ▼     ▼          ▼
FactAgent  DraftingAgent  StrategyAgent
（事实提取）  （文书生成）    （策略分析）
```

### Agent 职责

| Agent | 职责 |
|---|---|
| [`RouterAgent`](server/src/agents/RouterAgent.ts) | 解析用户意图，路由至合适的专业 Agent |
| [`FactAgent`](server/src/agents/FactAgent.ts) | 从证据材料中提取当事人、案由、发票清单等结构化数据 |
| [`DraftingAgent`](server/src/agents/DraftingAgent.ts) | 生成起诉状、律师函、答辩状、证据清单等各类法律文书 |
| [`StrategyAgent`](server/src/agents/StrategyAgent.ts) | 诉讼策略分析、工作计划生成、法律咨询问答 |

每个 Agent 继承自 [`BaseAgent`](server/src/agents/BaseAgent.ts)，内置工具调用循环（最多 5 轮），使用 `gemini-2.5-flash` 模型驱动。

---

## 🛠️ AI 工具（Function Calling）

Agent 通过 Gemini Function Calling 机制调用以下工具，定义见 [`toolDefinitions.ts`](server/src/utils/toolDefinitions.ts)，执行逻辑见 [`toolExecutor.ts`](server/src/utils/toolExecutor.ts)：

| 工具 | 触发场景 |
|---|---|
| `extract_parties` | 提取当事人、案由、案件事实 |
| `extract_invoices` | 提取发票清单（交通事故类） |
| `generate_timeline` | 提取关键时间节点并生成本案时间轴 |
| `generate_evidence_list` | 生成编号证据目录 |
| `generate_smart_document` | 生成 Markdown 格式起诉状 |
| `generate_execution_plan` | 生成案件执行计划子任务 |
| `update_strategy_map` | 保存诉讼策略分析结果 |
| `update_subtask_status` | 更新子任务完成状态 |

---

## 📋 Skill 规则系统

文书生成由 **Skill 文件**驱动——每种案件类型对应一份 Markdown 规则文件，定义赔偿计算逻辑、诉讼请求结构和起诉状模板。

[`SkillLoader`](server/src/skills/SkillLoader.ts) 根据 `caseType` 加载对应 Skill 文件和 docx 模板（案由定义与注册见 [`SUPPORTED_CASE_TYPES`](server/src/constants.ts)）：

| 案由代码 (`caseType`) | 案由名称 | Skill 规则文件 | docx 起诉状模板 |
|---|---|---|---|
| `traffic_accident` | 机动车交通事故责任纠纷 | [`skills/traffic_accident.md`](skills/traffic_accident.md) | 民事起诉状（机动车交通事故责任纠纷）.docx |
| `divorce` | 离婚纠纷 | [`skills/divorce.md`](skills/divorce.md) | 民事起诉状（离婚纠纷）.docx |
| `loan_dispute` | 民间借贷纠纷 | [`skills/loan_dispute.md`](skills/loan_dispute.md) | 民事起诉状（民间借贷纠纷）.docx |
| `labor_contract` | 劳务合同纠纷 | [`skills/labor_dispute.md`](skills/labor_dispute.md) | 民事起诉状（劳动争议纠纷）.docx |
| `sales_contract` | 买卖合同纠纷 | — | 民事起诉状（买卖合同纠纷）.docx |
| `unjust_enrichment` | 不当得利 | — | （使用默认模板） |
| `general` | 一般案件 / 其它 | — | （使用默认模板） |

新增案件类型只需：① 在 [`SUPPORTED_CASE_TYPES`](server/src/constants.ts) 注册，② 编写对应 Skill Markdown，③ 在 [`SkillLoader`](server/src/skills/SkillLoader.ts) 添加映射。

---

## 🔌 多 AI 提供商

通过 [`aiService`](server/src/services/aiService.ts) 统一封装，支持一键切换：

| 提供商 | 环境变量 | 特性 |
|---|---|---|
| Gemini（默认） | `GEMINI_API_KEY` | 支持 PDF OCR、多 Key 轮询 |
| DeepSeek | `DEEPSEEK_API_KEY` | OpenAI 兼容协议 |
| 豆包 | `DOUBAO_API_KEY` | OpenAI 兼容协议 |
| 通义千问 | `QWEN_API_KEY` | OpenAI 兼容协议 |

> **注意**：图片/PDF OCR 调用始终使用 Gemini，不受 `AI_PROVIDER` 影响。`GEMINI_API_KEY` 支持逗号分隔多个 Key，自动轮询。

---

## ✨ 核心功能

- **AI 对话驱动**：在案件详情页通过自然语言与智能 Agent 交互，触发所有专业操作，无需手动填写复杂表单。
- **智能证据解析**：支持从 PDF、Word、图片等多种原始证据格式中自动 OCR 提取并结构化当事人、识别案由并计算发票费用清单。
- **AI 证据整理与缺失检测**：
  - **证据建议顺序**：一键对上传的证据文件进行全盘分析，智能梳理并给出建议提交的证据目录顺序及推荐理由。
  - **证据缺失检测**：自动分析案情，智能评估可能缺失的关键、建议或可选证据，大幅降低漏交证据的诉讼风险。
- **可视化 PDF 页级人工整理**：
  - **灵活排序**：在前端直观拖拽 PDF 页面卡片，对页面进行任意重排。
  - **旋转修正**：支持对偏斜、倒置的页面进行 90°/180°/270° 快速旋转校正。
  - **多页拼合**：支持将多个源页面合并拼贴到单页 A4 格式上。
  - **快速导出**：整理完成后，一键重新编译并下载纯净的新 PDF。
- **一键智能文书生成**：基于 Skill 规则文件，AI 直接输出高完整度起诉状，提供富文本编辑器在线微调并可无缝导出完美排版的 docx。
- **诉讼策略与执行看板**：
  - **诉讼策略地图**：AI 深度剖析案件事实与证据，输出全面的诉讼应对方案。
  - **关键时间轴**：自动梳理证据时间线并生成本案关键节点时间轴。
  - **工作流看板**：自动生成阶段式可执行的律师子任务清单，支持拖拽和状态更新。
- **专业法律 RAG 知识库**：案件对话自动检索并注入相关法律法规、裁判要旨等知识库上下文，确保回答极具专业性。

---

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | Prisma ORM + SQLite |
| AI 核心 | Gemini 2.5 Flash（Function Calling + OCR） |
| AI 兼容 | OpenAI SDK（DeepSeek / 豆包 / 通义千问） |

---

## 🚀 快速开始

```bash
git clone https://github.com/darklinpods/NIKA
cd NIKA
npm install
```

在 `server/` 下创建 `.env`（参考 [`server/.env.example`](server/.env.example)）：

```env
AI_PROVIDER="gemini"          # gemini | deepseek | doubao | qwen
GEMINI_API_KEY="你的KEY"       # 多个 Key 用逗号分隔
# DEEPSEEK_API_KEY="..."
# DOUBAO_API_KEY="..."
# QWEN_API_KEY="..."
DATABASE_URL="file:./dev.db"
PORT=3001
```

初始化数据库并启动：

```bash
cd server && npx prisma generate && npx prisma db push && cd ..
npm run dev
```

访问 `http://localhost:3000`

---

## 📁 目录结构

```
client/          # React 前端
server/
  src/
    agents/      # AI Agent（Router / Fact / Drafting / Strategy）
    controllers/ # Express 路由控制层
    services/    # 业务逻辑与 AI 调用（aiService / aiAnalysisService）
    skills/      # Skill 执行器（SkillLoader）
    prompts/     # 各 Agent 的 Prompt 模板
    utils/       # toolDefinitions / toolExecutor / aiJsonParser
  prisma/        # 数据库 Schema
skills/          # Skill 规则文件（Markdown，定义赔偿规则与诉状结构）
```

---

## 开发命令

```bash
npm run dev              # 同时启动前后端
npm run dev:server       # 仅后端（热重载）
npm run dev:client       # 仅前端
npm run db:studio        # Prisma Studio
cd server && npx ts-node src/scripts/seed_from_docx.ts  # 从 docx 导入知识库
```

**License**: MIT
