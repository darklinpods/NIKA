import express from 'express';
import multer from 'multer';
import { knowledgeController } from '../controllers/knowledgeController';

const router = express.Router();

// 配置临时存放上传文件的路径和大小
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 10 * 1024 * 1024 } // 限制 10MB
});

router.get('/', knowledgeController.getAll);
router.post('/upload', upload.single('file'), knowledgeController.uploadDocument);
router.post('/text', knowledgeController.addTextDocument);
router.delete('/:id', knowledgeController.delete);
router.put('/:id', knowledgeController.update);

export default router;
