import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import caseRoutes from './routes/caseRoutes';
import geminiRoutes from './routes/geminiRoutes';
import templateRoutes from './routes/templateRoutes';
import knowledgeRoutes from './routes/knowledgeRoutes';
import complaintRoutes from './routes/complaintRoutes';
import operationLogRoutes from './routes/operationLogRoutes';

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logger for debugging
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
apiRouter.use('/operation-logs', operationLogRoutes);

// Handle both with and without /api prefix for robustness on Vercel
app.use('/api', apiRouter);
// Only match non-/api paths to avoid double execution
app.use(/^\/(?!api\/)/, apiRouter);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Error Handler:", err);
    res.status(500).json({
        error: 'Global Server Error',
        details: err.message,
        stack: err.stack,
        path: req.path
    });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

export default app;
