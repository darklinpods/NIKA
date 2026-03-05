# NIKA - Law case management system (律师案件管理系统)

一个功能强大的本地化律师案件管理系统，提供直观的看板视图、智能任务拆解以及案件文书管理功能。

## ✨ 核心功能
* **📊 看板管理**：直观的拖拽式看板，支持自定义案件状态流转（待办、进行中、已完成）。
* **🤖 AI 智能辅助**：内置 Gemini 大语言模型集成。能够一键生成案件摘要、自动出具案件执行计划（自动拆解子任务）。
* **📑 案件详情与文书管理**：记录案件各项基本信息（客户、法院等），支持无限层级的子任务管理以及多端 Markdown 文档归档。包括：
  * **基本信息**：原告、被告、案号、管辖法院等。
  * **事实与证据**：记录案件事实，上传和管理证据文件。
  * **法律与分析**：法律法规检索与应用，案件争议焦点分析。
  * **文书管理**：生成和管理各类法律文书（起诉状、代理词等）。
* **🛡️ 数据隐私与本地控制**：采用 PostgreSQL 数据库存储，支持离线或局域网私有化部署，确保敏感案件数据绝对安全。

## 🛠️ 技术栈

### 前端 (Client)
* **框架**: React 18 + TypeScript + Vite
* **样式**: Tailwind CSS + Lucide React (图标)
* **状态管理**: 基于 Context API (自定义 Hooks 如 `useBoardData`, `useTaskOperations`)
* **交互**: `@hello-pangea/dnd` 实现高性能前端看板拖拽

### 后端 (Server)
* **环境**: Node.js + Express
* **ORM**: Prisma
* **数据库**: PostgreSQL
* **AI 集成**: `@google/genai` (Gemini API)
* **架构**: Controller + Service 分层路由抽象，数据操作高度解耦且易于测试

---

## 🚀 快速启动

### 1. 环境准备
确保本机已安装 **Node.js (v18+)** 和 **PostgreSQL** 数据库。

### 2. 下载与依赖安装
```bash
git clone <repository-url>
cd law-case-manager

# 安装所有依赖 (前后端)
npm install
```

### 3. 环境配置
在 `server` 目录下创建 `.env` 文件，完善你的本地配置资料：
```env
# 数据库连接字符串 (请替换为你的本地或远程 PostgreSQL)
DATABASE_URL="postgresql://用户名:密码@localhost:5432/law_case_manager?schema=public"

# Gemini AI 密钥 (用于 AI 任务拆解和总结)
API_KEYS="你的_GEMINI_API_KEY_1,你的_GEMINI_API_KEY_2"

# 服务器端口
PORT=3001
```

### 4. 数据库初始化
进入 server 目录，同步并推送数据库结构：
```bash
cd server
npx prisma generate
npx prisma db push
```

### 5. 启动项目
回到项目根目录，通过 npm workspaces 同时启动前后端服务：
```bash
# 启动前后端服务
npm run dev
```
随后在浏览器中访问 `http://localhost:3000` 即可开始使用前端页面。

---

## 📁 核心目录结构
```text
law-case-manager/
├── client/                 # 前端 React 源码
│   ├── components/         # UI 视图组件 (Board, TaskModal, panels 等)
│   ├── hooks/              # 核心业务逻辑 (useCases, useTasks 等)
│   ├── types/              # TypeScript 类型定义
│   └── lib/                # 工具函数和 API 请求 (api.ts)
├── server/                 # 后端 Node.js 源码
│   ├── src/
│   │   ├── controllers/    # 路由控制器，处理 HTTP 请求与响应
│   │   ├── services/       # 业务逻辑服务层 (aiService, docGenService)
│   │   ├── routes/         # Express API 路由定义
│   │   └── index.ts        # 后端入口文件
│   └── prisma/             # 数据库 Schema 结构文件 (schema.prisma)
```

## 🤝 开发指南
本项目近期经历了一次大规模的解耦重构和 UI 升级：
1. **客户端 UI**：进行了全面的重构，引入了四大业务模块（基本信息、事实与证据、法律与分析、文书管理），使案件详情页结构更加清晰，符合律师工作流。
2. **服务端**：完善了 Controller 与 Service 的分层结构，特别是针对文档生成和 AI 集成进行了深度优化。

全部核心代码均已补充完善的**简体中文注释**，大幅降低了二次开发门槛。如需增加新功能，可直接跳转阅读前端 `client/components` 与后端 `server/src/controllers` 下的文件。

---
**License**: MIT 
