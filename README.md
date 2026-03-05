# ⚖️ NIKA - AI 法律案件管理系统

一个为律师量身定制的、端到端的 AI 辅助案件管理系统。NIKA 不仅仅是一个看板，它是你的 AI 律师助理，能够深度解析证据、自动撰写事实理由并智能化管理案件全生命周期。

## ✨ 核心亮点

*   **📊 智能化看板视图**：直观的拖拽式看板，支持自定义案件阶段（待办、进行中、已完成）。
*   **🤖 多模型 AI 路由**：内置对 **Gemini 2.0/1.5** (原生支持 PDF OCR)、**DeepSeek**、**豆包 (Doubao)**、**通义千问 (Qwen)** 的全面支持。
*   **🚀 智能导入 (Smart Import)**：一键上传 PDF 或 Word 案卷，AI 自动解析全文、提取核心要素并**立即同步至数据库**。
*   **🔍 深度证据扫描与解析**：
    *   **自动提取当事人**：精准识别原告、被告、第三人、保险公司及其详细信息。
    *   **案情叙述生成**：根据证据自动撰写详尽的 **"事实与理由"**，包含事故经过、责任划分、医疗救治、保险方案等。
    *   **案由智能判定**：基于证据自动判断案件类型（如机动车交通事故、借贷纠纷等）。
*   **📄 内置文本预览与 OCR**：直接在浏览器内查看提取的 OCR 文字，支持一键下载为 `.txt` 格式以便二次编辑。
*   **🛡️ 隐私优先**：默认使用本地 **SQLite** 数据库，所有案件敏感信息物理隔绝，支持私有化部署。

---

## 🛠️ 技术架构

### 前端 (Client)
*   **核心**: React 18 + TypeScript + Vite
*   **样式**: Tailwind CSS (现代玻璃拟物化设计) + Lucide Icons
*   **交互**: `@hello-pangea/dnd` 高性能看板拖拽
*   **渲染**: `react-markdown` 完美呈现 AI 生成的法律叙述

### 后端 (Server)
*   **环境**: Node.js + Express
*   **持久层**: Prisma ORM + SQLite (默认) / PostgreSQL (可选)
*   **AI 引擎**: 
    *   `@google/genai` (原生 PDF 解析)
    *   `OpenAI SDK` (兼容 DeepSeek/豆包/千问)
*   **解析引擎**: `mammoth` (Word), `pdf-parse` (PDF)

---

## 🚀 快速开始

### 1. 环境准备
确保已安装 **Node.js (v18+)**。

### 2. 下载并安装
```bash
git clone https://github.com/darklinpods/NIKA
cd NIKA

# 安装前后端所有依赖
npm install
```

### 3. 配置 .env
在 `server` 目录下创建 `.env` 文件：
```env
# AI 提供商选择: gemini, deepseek, doubao, qwen
AI_PROVIDER="gemini"

# 如果使用 Gemini (推荐，支持 OCR)
GEMINI_API_KEY="你的_KEY1,你的_KEY2"

# 如果使用 DeepSeek 等兼容 OpenAI 的接口
# OPENAI_API_KEY="你的_KEY"
# OPENAI_BASE_URL="https://api.deepseek.com"

# 数据库连接 (SQLite 示例)
DATABASE_URL="file:./dev.db"

PORT=3001
```

### 4. 数据库初始化
```bash
cd server
npx prisma generate
npx prisma db push
```

### 5. 启动
```bash
# 在项目根目录下运行
npm run dev
```
访问 `http://localhost:3000` 即可开始使用。

---

## 📁 目录结构

*   `client/`: 前端 React 源码，包含 4 大功能面板（基本信息、各事实与证据、分析建议、文书管理）。
*   `server/src/services/`: 核心 AI 逻辑所在地。
    *   `documentService.ts`: 处理文档解析与 OCR。
    *   `aiAnalysisService.ts`: 处理案情要素提取。
    *   `caseService.ts`: 数据库原子操作。
*   `samples_docs/`: 存放用于测试的法律起草模板与示例。

---

## 🤝 开发与贡献
本项目近期完成了大规模的代码重构，实现了 Controller 与 Service 的深度解耦。
- **全中文注释**：所有核心业务逻辑均配有详尽的中文注释。
- **UI 组件化**：各功能面板均已封装为独立组件，易于扩展。

**License**: MIT 
