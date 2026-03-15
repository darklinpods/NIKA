import { Router } from 'express';
import { extractComplaintElements } from '../controllers/complaintController';
import { getAllLogs, getLogStats, filterLogsAPI, exportLogsCSV, cleanupLogs, getTodayStats, getRecentLogs } from '../controllers/logController';

const router = Router();

// 诉状相关路由
router.post('/extract', extractComplaintElements);

// 日志相关路由
router.get('/logs/all', getAllLogs);
router.get('/logs/stats', getLogStats);
router.get('/logs/filter', filterLogsAPI);
router.get('/logs/csv', exportLogsCSV);
router.post('/logs/cleanup', cleanupLogs);
router.get('/logs/today', getTodayStats);
router.get('/logs/recent', getRecentLogs);

export default router;
