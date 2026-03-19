import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import caseRoutes from './routes/caseRoutes';
import geminiRoutes from './routes/geminiRoutes';
import templateRoutes from './routes/templateRoutes';
import knowledgeRoutes from './routes/knowledgeRoutes';
import complaintRoutes from './routes/complaintRoutes';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 请求日志中间件（调试用）
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: !!process.env.DATABASE_URL,
        env: process.env.NODE_ENV,
        databaseUrlLength: process.env.DATABASE_URL?.length || 0,
        geminiKeyLength: process.env.GEMINI_API_KEY?.length || 0
    });
});

const apiRouter = express.Router();
apiRouter.use('/cases', caseRoutes);
apiRouter.use('/ai', geminiRoutes);
apiRouter.use('/templates', templateRoutes);
apiRouter.use('/knowledge', knowledgeRoutes);
apiRouter.use('/complaints', complaintRoutes);

// 同时挂载 /api 前缀和无前缀路由，兼容 Vercel 部署环境
app.use('/api', apiRouter);
// 仅匹配非 /api 开头的路径，避免重复执行
app.use(/^\/(?!api\/)/, apiRouter);

// 全局错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Error Handler:", err);
    res.status(500).json({
        error: 'Global Server Error',
        details: err.message,
        stack: err.stack,
        path: req.path
    });
});

// 本地开发环境启动 HTTP 服务（Vercel 生产环境由 api/index.ts 导出 app 处理）
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

export default app;
