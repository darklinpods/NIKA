import { Request, Response } from 'express';
import {
    readAllLogs,
    filterLogs,
    getLogStatistics,
    cleanupOldLogs,
    exportLogsAsCSV,
    getLogFilePath,
    getLogFileSize
} from '../utils/extractionLogger';

/**
 * 获取所有日志
 */
export const getAllLogs = async (req: Request, res: Response) => {
    try {
        const logs = readAllLogs();
        res.json({
            success: true,
            count: logs.length,
            logs
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * 获取日志统计信息
 */
export const getLogStats = async (req: Request, res: Response) => {
    try {
        const stats = getLogStatistics();
        const fileSize = getLogFileSize();
        
        res.json({
            success: true,
            statistics: stats,
            fileSize: `${fileSize} MB`
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * 按条件筛选日志
 */
export const filterLogsAPI = async (req: Request, res: Response) => {
    try {
        const { status, templateId, startDate, endDate, limit } = req.query;
        
        const criteria: any = {};
        if (status) criteria.status = status as 'success' | 'error';
        if (templateId) criteria.templateId = templateId;
        if (startDate) criteria.startDate = new Date(startDate as string);
        if (endDate) criteria.endDate = new Date(endDate as string);
        if (limit) criteria.limit = parseInt(limit as string);

        const logs = filterLogs(criteria);
        
        res.json({
            success: true,
            count: logs.length,
            logs
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * 导出日志为CSV
 */
export const exportLogsCSV = async (req: Request, res: Response) => {
    try {
        const csv = exportLogsAsCSV();
        
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="extraction-logs.csv"');
        res.send(csv);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * 清理旧日志
 */
export const cleanupLogs = async (req: Request, res: Response) => {
    try {
        const { daysToKeep } = req.body;
        const days = daysToKeep || 30;
        
        const deletedCount = cleanupOldLogs(days);
        
        res.json({
            success: true,
            message: `已清理 ${deletedCount} 条旧日志 (保留最近 ${days} 天)`,
            deletedCount
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * 获取今日的提取统计
 */
export const getTodayStats = async (req: Request, res: Response) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const todayLogs = filterLogs({
            startDate: today,
            endDate: tomorrow
        });

        const successCount = todayLogs.filter(log => log.status === 'success').length;
        const errorCount = todayLogs.filter(log => log.status === 'error').length;
        const avgTime = successCount > 0
            ? todayLogs.reduce((sum, log) => sum + log.processingTime, 0) / todayLogs.length
            : 0;

        res.json({
            success: true,
            date: today.toLocaleDateString('zh-CN'),
            total: todayLogs.length,
            successCount,
            errorCount,
            successRate: `${todayLogs.length > 0 ? ((successCount / todayLogs.length) * 100).toFixed(2) : 0}%`,
            averageProcessingTime: `${Math.round(avgTime)} ms`
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

/**
 * 获取最近的日志
 */
export const getRecentLogs = async (req: Request, res: Response) => {
    try {
        const { count } = req.query;
        const limit = parseInt(count as string) || 20;
        
        const logs = readAllLogs();
        const recent = logs.reverse().slice(0, limit);
        
        res.json({
            success: true,
            count: recent.length,
            logs: recent
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
