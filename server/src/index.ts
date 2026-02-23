
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import caseRoutes from './routes/caseRoutes';
import geminiRoutes from './routes/geminiRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: !!process.env.DATABASE_URL, env: process.env.NODE_ENV });
});

const apiRouter = express.Router();
apiRouter.use('/cases', caseRoutes);
apiRouter.use('/ai', geminiRoutes);

// Handle both with and without /api prefix for robustness on Vercel
app.use('/api', apiRouter);
app.use('/', apiRouter);

// For local development
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });
}

export default app;
