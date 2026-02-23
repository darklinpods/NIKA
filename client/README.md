# 看板式律师案件管理系统 (前端 Client)

这是 Law Case Manager 的前端 React 应用程序。

有关整个项目的详细介绍、技术栈细节、以及启动和部署指南，**请参阅项目根目录下的 [README.md](../README.md)** 文件。

## 前端专属开发命令

确保你在 `client` 目录下，或者使用 npm workspaces 指定项目：

```bash
# 启动前端开发服务器
npm run dev

# 生产环境构建打包
npm run build

# 预览生产构建成果
npm run preview
```

## 快速导航
- 想要查看状态管理的逻辑，请跳转到 `src/hooks/` 和 `src/providers/`。
- 想要更改 UI 样式或卡片结构，请跳转到 `src/components/`。
- 想要修改 API 的请求根地址或错误拦截，请跳转到 `src/services/api.ts`。
