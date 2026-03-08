# ⚖️ NIKA - AI 法律案件管理系统

一个为律师量身定制的、端到端的 AI 辅助案件管理系统。NIKA 不仅仅是一个看板，它是你的 AI 律师助理，能够深度解析证据、自动撰写事实理由并智能化管理案件全生命周期。

## ✨ 核心亮点

* **📊 智能化看板视图**：直观的拖拽式看板，支持自定义案件阶段流转（待办、进行中、已完成），并在近期的迭代中加入了**自定义拖拽排序与持久化记忆**，让案件优先级管理得心应手。
* **🏛️ 专业四柱式案件详情页**：全新构建的案件查阅体验，信息架构清晰：
  * **基础信息 (Basic Info)**：原被告主体、法院、案由、联系方式统一管理。
  * **事实与证据 (Facts & Evidence)**：直观管理长篇证据清单与结构化的案件事实。
  * **法律分析 (Law & Analysis)**：内嵌针对专属案件上下文的 AI 案情对话助手。
  * **文书管理 (Document Management)**：一键起草、模板预览和法律文书高速生成。
* **🤖 多模型 AI 路由**：内置对 **Gemini 2.0/1.5** (原生支持 PDF OCR)、**DeepSeek**、**豆包 (Doubao)**、**通义千问 (Qwen)** 的全面无缝支持。
* **🚀 智能导入与深度解析 (Smart Extraction)**：
  * **要素智能提炼**：把长篇幅或非结构化的案卷，快速归纳为标准的案件事实清单 (Case Fact Sheet)。
  * **发票极客提取 (Invoice Extraction)**：专为交通事故、报销等纠纷设计，通过 AI 从复杂的票据证据中精准提取金额、日期及费用描述，并以结构化表格呈现。
  * **各类当事人提取**：精准识别并归类原告、被告、第三人、保险公司及其详情。
* **📄 智能文书生成系统 (Smart Document Generator)**：
  * **变量精准注入**：打通了从“数据库录入字段 / AI 提取结果”到“通用 Word 模板”的自动映射与占位符注入。
  * **前端确认机制**：提供直观的起诉状要件表格化确认，一键渲染并下载完美排版的 `.docx`，降低传统改写 Word 的错误率。
* **🛡️ 隐私优先**：默认使用本地 **SQLite** 数据库，所有案件敏感信息物理隔绝，且架构支持私有化部署。

---

## 🛠️ 技术架构

本系统采用彻底的前后端分离架构，并在发展中完成了大规模代码重构与整洁化：

### 前端 (Client)

* **核心**: React 18 + TypeScript + Vite
* **样式**: Tailwind CSS (现代玻璃拟物化设计) + Lucide Icons
* **交互**: `@hello-pangea/dnd` 丝滑高性能的看板与卡片拖拽
* **渲染与富文本**: `react-markdown` 完美呈现 AI 法律叙述与排版

### 后端 (Server)

* **环境**: Node.js + Express
* **持久层**: Prisma ORM + SQLite (默认) / PostgreSQL (可选)
* **AI 引擎**:
  * `@google/genai` (原生多模态 PDF 解析)
  * `OpenAI SDK` (全面兼容 DeepSeek/豆包/千问等国产顶尖大模型)
* **解析引擎**: `docxtemplater` / `pizzip` (Word 生成)、`mammoth` (Word 读取)、`pdf-parse` (PDF 文本)
* **架构规范**: 严格执行 Controller 与 Service 的深度解耦，保证核心业务逻辑的高内聚。

---

## 🚀 快速开始

### 1. 环境准备

确保已安装 **Node.js (v18+)**。

### 2. 下载并安装

```bash
git clone https://github.com/darklinpods/NIKA
cd NIKA

# 自动安装前后端所有依赖
npm install
```

### 3. 配置 .env

在 `server` 目录下创建 `.env` 文件：

```env
# AI 提供商选择: gemini, deepseek, doubao, qwen
AI_PROVIDER="gemini"

# 如果使用 Gemini (推荐，支持多模态OCR)
GEMINI_API_KEY="你的_KEY"

# 如果使用 DeepSeek 等兼容 OpenAI 协议的接口
# OPENAI_API_KEY="你的_KEY"
# OPENAI_BASE_URL="https://api.deepseek.com/v1"

# 数据库连接 (默认使用 SQLite 示例)
DATABASE_URL="file:./dev.db"

PORT=3001
```

### 4. 数据库初始化

```bash
cd server
npx prisma generate
npx prisma db push
```

### 5. 启动运行

```bash
# 放回项目根目录下，运行并发启动脚本
npm run dev
```

访问 `http://localhost:3000` 即可开始使用！

---

## 📁 核心目录结构

* `client/src/components/`: 前端 React 核心源码。
  * `KanbanBoard.tsx`: 首页拖拽看板。
  * `TaskModal/`: 四大核心功能面板（基础信息、证据事实、分析建议、文书管理）。
  * `complaintGenerator/`: 起诉状智能化查阅与生成模块。
* `server/src/`:
  * `controllers/`: 接收前端请求并进行路由分发的控制层。
  * `services/`: 承载核心业务与 AI 复杂逻辑：
    * `aiAnalysisService.ts`: 负责案情要素和特定事实（如发票）提取的 Prompt 与路由调度。
    * `caseService.ts`: 负责案件增删改查、看板记忆排序等持久化操作。
    * `documentService.ts`: 负责文档解析与 OCR 解析。
* `samples_docs/`: 存放用于测试的示例案卷及法律文档资源。
* `templates/`: 存放用于智能文书生成的 `.docx` 模板文件 (`inject-template-vars.js`)。

---

## 🤝 开发与贡献

* **全中文注释**：系统内部核心业务代码和 Prompt 设计均配有详尽中文注释。
* **扩展性极强**：UI 与 Service 层均可插拔，方便团队二次开发定制化私有法务工具。

**License**: MIT
