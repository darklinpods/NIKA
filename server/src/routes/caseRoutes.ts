import { Router } from 'express';
import multer from 'multer';
import { getCases, createCase, updateCase, deleteCase, reorderCases, smartImportCase, uploadEvidence } from '../controllers/caseController';
import { extractPartiesFromEvidence } from '../controllers/partiesController';
import { extractFactSheet, saveFactSheet, analyzeEvidence } from '../controllers/factSheetController';
import { extractInvoicesFromEvidence } from '../controllers/invoiceController';
import { getChatHistory, sendMessage, deleteMessage, clearHistory } from '../controllers/chatController';
import { extractTrafficAccident, generateTrafficAccidentDocx } from '../controllers/skillController';
import { organizeEvidence } from '../controllers/evidenceOrganizerController';

// 文件上传使用内存存储，不落盘
const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

// 案件 CRUD
router.get('/', getCases);                                          // 获取所有案件
router.post('/smart-import', upload.single('file'), smartImportCase); // 智能导入（解析文件 + AI 提取）
router.post('/', createCase);                                       // 新建案件
router.put('/reorder', reorderCases);                               // 批量重排（看板拖拽）

// 案件详情操作
router.post('/:id/evidence', upload.single('file'), uploadEvidence);        // 上传证据文件
router.post('/:id/extract-parties', extractPartiesFromEvidence);            // 从证据提取当事人
router.post('/:id/fact-sheet/extract', extractFactSheet);                   // AI 提取结构化事实（不保存）
router.put('/:id/fact-sheet', saveFactSheet);                               // 保存事实摘要
router.post('/:id/analyze-evidence', analyzeEvidence);                      // 重新分析证据生成 Markdown 摘要
router.post('/:id/organize-evidence', organizeEvidence);                    // AI 证据整理（排序 + 缺失检测）
router.post('/:id/extract-invoices', extractInvoicesFromEvidence);          // 提取发票（交通事故专用）
router.put('/:id', updateCase);                                             // 更新案件
router.delete('/:id', deleteCase);                                          // 删除案件

// 案件聊天
router.get('/:id/chat', getChatHistory);                // 获取聊天历史
router.post('/:id/chat', sendMessage);                  // 发送消息（触发 AI）
router.delete('/chat/:messageId', deleteMessage);       // 删除单条消息
router.delete('/:id/chat', clearHistory);               // 清空聊天记录

// 专项技能（交通事故）
router.post('/:id/skills/traffic_accident/extract', extractTrafficAccident);      // 生成 Markdown 诉状预览
router.post('/:id/skills/traffic_accident/generate', generateTrafficAccidentDocx); // 生成 Word 诉状文件

export default router;
