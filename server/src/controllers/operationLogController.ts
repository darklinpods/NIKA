import { Request, Response } from 'express';
import { operationLogService } from '../services/operationLogService';

/** 获取操作记录列表 */
export const getOperationLogs = async (req: Request, res: Response) => {
    try {
        const logs = await operationLogService.getAllLogs();
        res.json({ success: true, data: logs });
    } catch (error: any) {
        console.error('Get Operation Logs Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/** 创建操作记录 */
export const createOperationLog = async (req: Request, res: Response) => {
    try {
        const { action, caseId, caseTitle, subTaskId, subTaskTitle } = req.body;
        const log = await operationLogService.createLog({
            action,
            caseId,
            caseTitle,
            subTaskId,
            subTaskTitle,
        });
        res.status(201).json({ success: true, data: log });
    } catch (error: any) {
        console.error('Create Operation Log Error:', error);
        res.status(500).json({ error: error.message });
    }
};

/** 撤销操作记录（删除记录 + 回滚子任务状态） */
export const deleteOperationLog = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const result = await operationLogService.deleteLogAndRevert(id);
        res.json({ success: true, ...result });
    } catch (error: any) {
        console.error('Delete Operation Log Error:', error);
        res.status(500).json({ error: error.message });
    }
};
