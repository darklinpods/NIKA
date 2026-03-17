# ⚖️ NIKA - AI 法律案件管理系统

为律师量身定制的 AI 辅助案件管理系统。通过对话驱动的 AI Agent，自动解析证据、生成起诉状、管理案件全生命周期。

## ✨ 核心功能

- **看板视图**：拖拽式案件阶段管理（待办 / 进行中 / 已完成），支持自定义排序持久化
- **AI 对话助手**：在案件详情页通过自然语言触发所有操作，无需手动填表
- **智能提取**：从上传的证据材料（PDF/Word/图片）中自动提取当事人、案由、发票清单
- **起诉状生成**：基于 Skill 规则文件，AI 直接生成 Markdown 格式完整起诉状，支持在线编辑
- **多 AI 提供商**：Gemini（默认，支持 PDF OCR）/ DeepSeek / 豆包 / 通义千问，一键切换

## 🛠️ 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | Prisma ORM + SQLite（默认） |
| AI | Gemini 2.5 Flash / OpenAI 兼容协议 |

## 🚀 快速开始

```bash
git clone https://github.com/darklinpods/NIKA
cd NIKA
npm install
```

在 `server/` 下创建 `.env`：

```env
AI_PROVIDER="gemini"          # gemini | deepseek | doubao | qwen
GEMINI_API_KEY="你的KEY"
# OPENAI_API_KEY="..."        # DeepSeek/豆包/千问时使用
# OPENAI_BASE_URL="..."
DATABASE_URL="file:./dev.db"
PORT=3001
```

初始化数据库并启动：

```bash
cd server && npx prisma generate && npx prisma db push && cd ..
npm run dev
```

访问 `http://localhost:3000`

## 📁 目录结构

```
client/          # React 前端
server/
  src/
    agents/      # AI Agent（Router / Fact / Drafting / Strategy）
    controllers/ # Express 路由控制层
    services/    # 业务逻辑与 AI 调用
    skills/      # Skill 执行器（TrafficAccidentSkill 等）
    utils/       # 工具函数（toolExecutor / aiJsonParser 等）
  prisma/        # 数据库 Schema
skills/          # Skill 规则文件（Markdown，定义赔偿规则与诉状结构）
```

## 🤖 Agent 工具列表

| 工具 | 触发时机 |
|---|---|
| `extract_parties` | 提取当事人、案由、案件事实 |
| `extract_invoices` | 提取发票清单（交通事故类） |
| `generate_smart_document` | 生成 Markdown 格式起诉状 |
| `generate_execution_plan` | 生成案件执行计划子任务 |
| `update_strategy_map` | 保存诉讼策略 |
| `update_subtask_status` | 更新子任务完成状态 |

## 开发命令

```bash
npm run dev              # 同时启动前后端
npm run dev:server       # 仅后端（热重载）
npm run dev:client       # 仅前端
npm run db:studio        # Prisma Studio
```

**License**: MIT
