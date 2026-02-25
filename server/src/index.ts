
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import caseRoutes from './routes/caseRoutes';
import geminiRoutes from './routes/geminiRoutes';
import templateRoutes from './routes/templateRoutes';

dotenv.config();

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

// Handle both with and without /api prefix for robustness on Vercel
app.use('/api', apiRouter);
app.use('/', apiRouter);

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
