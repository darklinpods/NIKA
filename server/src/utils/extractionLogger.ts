import fs from 'fs';
import path from 'path';

// 日志文件路径
const LOG_DIR = path.resolve(__dirname, '../../logs');
const LOG_FILE = path.join(LOG_DIR, 'extraction-log.jsonl');

// 确保日志目录存在
function ensureLogDirectory() {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
    }
}

// 日志条目接口
export interface ExtractionLogEntry {
    timestamp: string;
    templateId?: string;
    inputLength: number;
    inputPreview: string;
    extractedFields: number;
    status: 'success' | 'error';
    errorMessage?: string;
    extractedData?: any;
    processingTime: number; // 毫秒
}

/**
 * 记录AI提取结果到日志文件
 */
export function logExtraction(entry: Omit<ExtractionLogEntry, 'timestamp' | 'inputLength' | 'inputPreview' | 'extractedFields'>, sourceText: string, extractedData?: any) {
    try {
        ensureLogDirectory();

        const logEntry: ExtractionLogEntry = {
            timestamp: new Date().toISOString(),
            inputLength: sourceText.length,
            inputPreview: sourceText.substring(0, 200), // 前200个字符的预览
            extractedFields: extractedData ? Object.keys(extractedData).length : 0,
            ...entry,
            extractedData: extractedData ? sanitizeExtractedData(extractedData) : undefined
        };

        // 写入JSONL格式（每行一个JSON对象）
        const logLine = JSON.stringify(logEntry) + '\n';
        fs.appendFileSync(LOG_FILE, logLine, 'utf-8');

        console.log(`[ExtractionLogger] 日志已记录: ${logEntry.timestamp} (${logEntry.status})`);
    } catch (error: any) {
        console.error('[ExtractionLogger] 写入日志失败:', error.message);
    }
}

/**
 * 读取所有日志条目
 */
export function readAllLogs(): ExtractionLogEntry[] {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            return [];
        }

        const content = fs.readFileSync(LOG_FILE, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line);
        
        return lines.map((line, index) => {
            try {
                return JSON.parse(line);
            } catch (e) {
                console.error(`[ExtractionLogger] 解析日志行${index}失败:`, e);
                return null;
            }
        }).filter(entry => entry !== null);
    } catch (error: any) {
        console.error('[ExtractionLogger] 读取日志失败:', error.message);
        return [];
    }
}

/**
 * 按条件筛选日志
 */
export function filterLogs(criteria: {
    status?: 'success' | 'error';
    templateId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
}): ExtractionLogEntry[] {
    const logs = readAllLogs();
    
    return logs
        .filter(entry => {
            if (criteria.status && entry.status !== criteria.status) return false;
            if (criteria.templateId && entry.templateId !== criteria.templateId) return false;
            
            if (criteria.startDate || criteria.endDate) {
                const entryTime = new Date(entry.timestamp).getTime();
                if (criteria.startDate && entryTime < criteria.startDate.getTime()) return false;
                if (criteria.endDate && entryTime > criteria.endDate.getTime()) return false;
            }
            
            return true;
        })
        .slice(0, criteria.limit || undefined);
}

/**
 * 获取日志统计信息
 */
export function getLogStatistics(): {
    totalExtractions: number;
    successCount: number;
    errorCount: number;
    successRate: string;
    averageProcessingTime: number;
    averageInputSize: number;
    averageExtractedFields: number;
    byTemplate: Record<string, any>;
} {
    const logs = readAllLogs();

    if (logs.length === 0) {
        return {
            totalExtractions: 0,
            successCount: 0,
            errorCount: 0,
            successRate: '0%',
            averageProcessingTime: 0,
            averageInputSize: 0,
            averageExtractedFields: 0,
            byTemplate: {}
        };
    }

    const successLog = logs.filter(l => l.status === 'success');
    const errorLog = logs.filter(l => l.status === 'error');

    const avgTime = successLog.length > 0 
        ? successLog.reduce((sum, l) => sum + l.processingTime, 0) / successLog.length 
        : 0;

    const avgInputSize = logs.reduce((sum, l) => sum + l.inputLength, 0) / logs.length;
    const avgFields = successLog.length > 0 
        ? successLog.reduce((sum, l) => sum + l.extractedFields, 0) / successLog.length 
        : 0;

    // 按模板统计
    const byTemplate: Record<string, any> = {};
    logs.forEach(log => {
        const template = log.templateId || 'unknown';
        if (!byTemplate[template]) {
            byTemplate[template] = { total: 0, success: 0, error: 0 };
        }
        byTemplate[template].total++;
        if (log.status === 'success') {
            byTemplate[template].success++;
        } else {
            byTemplate[template].error++;
        }
    });

    return {
        totalExtractions: logs.length,
        successCount: successLog.length,
        errorCount: errorLog.length,
        successRate: `${((successLog.length / logs.length) * 100).toFixed(2)}%`,
        averageProcessingTime: Math.round(avgTime),
        averageInputSize: Math.round(avgInputSize),
        averageExtractedFields: Math.round(avgFields),
        byTemplate
    };
}

/**
 * 清理早于指定时间的日志
 */
export function cleanupOldLogs(daysToKeep: number = 30): number {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            return 0;
        }

        const logs = readAllLogs();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const recentLogs = logs.filter(entry => {
            return new Date(entry.timestamp).getTime() >= cutoffDate.getTime();
        });

        // 重写日志文件
        const content = recentLogs.map(log => JSON.stringify(log)).join('\n');
        if (content) {
            fs.writeFileSync(LOG_FILE, content + '\n', 'utf-8');
        } else {
            fs.writeFileSync(LOG_FILE, '', 'utf-8');
        }

        const deletedCount = logs.length - recentLogs.length;
        console.log(`[ExtractionLogger] 已清理 ${deletedCount} 条旧日志 (保留最近 ${daysToKeep} 天)`);
        
        return deletedCount;
    } catch (error: any) {
        console.error('[ExtractionLogger] 清理日志失败:', error.message);
        return 0;
    }
}

/**
 * 导出日志为CSV
 */
export function exportLogsAsCSV(): string {
    const logs = readAllLogs();

    if (logs.length === 0) {
        return 'timestamp,templateId,status,inputLength,inputPreview,extractedFields,processingTime,errorMessage\n';
    }

    const header = 'timestamp,templateId,status,inputLength,inputPreview,extractedFields,processingTime,errorMessage\n';
    const rows = logs.map(log => {
        const preview = log.inputPreview.replace(/"/g, '""').replace(/\n/g, ' ');
        return [
            log.timestamp,
            log.templateId || '',
            log.status,
            log.inputLength,
            `"${preview}"`,
            log.extractedFields,
            log.processingTime,
            (log.errorMessage || '').replace(/"/g, '""')
        ].join(',');
    });

    return header + rows.join('\n');
}

/**
 * 获取日志文件路径
 */
export function getLogFilePath(): string {
    return LOG_FILE;
}

/**
 * 获取日志文件大小（MB）
 */
export function getLogFileSize(): number {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            return 0;
        }
        const stats = fs.statSync(LOG_FILE);
        return Math.round(stats.size / 1024 / 1024 * 100) / 100; // 保留两位小数
    } catch (error) {
        return 0;
    }
}

/**
 * 清理敏感信息（保护隐私）
 */
function sanitizeExtractedData(data: any): any {
    const sanitized = { ...data };
    
    // 敏感字段列表
    const sensitiveFields = [
        'plaintiffId', 'plaintiffIdCard', 'plaintiffPhone', 
        'defendantId', 'defendantIdCard', 'defendantPhone',
        'defendant2Id', 'defendant2Phone'
    ];

    sensitiveFields.forEach(field => {
        if (sanitized[field]) {
            // 只保留前2个字符和后2个字符
            const value = sanitized[field].toString();
            if (value.length > 4) {
                sanitized[field] = value.substring(0, 2) + '****' + value.substring(value.length - 2);
            }
        }
    });

    return sanitized;
}
