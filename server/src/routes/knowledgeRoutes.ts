import express from 'express';
import multer from 'multer';
import { knowledgeController } from '../controllers/knowledgeController';

const router = express.Router();

// Vercel Serverless 文件系统只允许写 /tmp；知识库上传直接用内存避免启动时创建 uploads 目录。
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 限制 10MB
});

router.get('/', knowledgeController.getAll);
router.post('/upload', upload.single('file'), knowledgeController.uploadDocument);
router.post('/text', knowledgeController.addTextDocument);
router.delete('/:id', knowledgeController.delete);
router.put('/:id', knowledgeController.update);

export default router;
