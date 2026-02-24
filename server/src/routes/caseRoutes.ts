
import { Router } from 'express';
import multer from 'multer';
import { getCases, createCase, updateCase, deleteCase, reorderCases, smartImportCase, uploadEvidence } from '../controllers/caseController';

// Set up Multer for handling file uploads (in-memory storage)
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get('/', getCases);
router.post('/smart-import', upload.single('file'), smartImportCase);
router.post('/:id/evidence', upload.single('file'), uploadEvidence);
router.post('/', createCase);
router.put('/reorder', reorderCases);
router.put('/:id', updateCase);
router.delete('/:id', deleteCase);

// Case Chat Copilot routes
import { getChatHistory, sendMessage } from '../controllers/chatController';
router.get('/:id/chat', getChatHistory);
router.post('/:id/chat', sendMessage);

export default router;
