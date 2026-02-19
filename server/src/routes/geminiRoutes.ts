
import { Router } from 'express';
import { generateTasks, suggestImprovement, summarizeTask, generateCaseDocument } from '../controllers/geminiController';

const router = Router();

router.post('/generate-tasks', generateTasks);
router.post('/suggest-improvement', suggestImprovement);
router.post('/summarize-task', summarizeTask);
router.post('/generate-document', generateCaseDocument);

export default router;
