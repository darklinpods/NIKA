
import { Request, Response } from 'express';
import { caseService } from '../services/caseService';

/**
 * 案件管理的请求控制器 (Controller Layer)
 * 负责接收 Express 传递的 HTTP 请求、提取响应体信息参数、交由业务逻辑层处理并负责标准结构的 JSON / 状态码返回组合。
 */

// 获取案件列表的处理函数
export const getCases = async (req: Request, res: Response) => {
    try {
        const cases = await caseService.getAllCases();
        res.json(cases);
    } catch (error: any) {
        console.error("Fetch Cases Error:", error);
        res.status(500).json({ error: 'Failed to fetch cases', details: error.message, stack: error.stack });
    }
};

// 新建单一案件的处理函数
export const createCase = async (req: Request, res: Response) => {
    try {
        const newCase = await caseService.createCase(req.body);
        res.json(newCase);
    } catch (error: any) {
        console.error("Create Case Error:", error);
        res.status(500).json({ error: 'Failed to create case', details: error.message, stack: error.stack });
    }
};

// 更新单一案件及其伴随的所有关联对象的处理函数
export const updateCase = async (req: Request, res: Response) => {
    const { id } = req.params;
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 收到更新请求，案件ID: ${id}`);

    try {
        const updatedCase = await caseService.updateCase(id, req.body);
        console.log(`[${new Date().toISOString()}] 案件ID: ${id} 更新操作完成，耗时: ${Date.now() - startTime}ms`);
        res.json(updatedCase);
    } catch (error: any) {
        console.error("Update Case Error:", error);
        res.status(500).json({ error: 'Failed to update case', details: error.message, stack: error.stack });
    }
};

// 删除案例实体的处理函数
export const deleteCase = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await caseService.deleteCase(id);
        res.json(result);
    } catch (error: any) {
        console.error("Delete Case Error:", error);
        res.status(500).json({ error: 'Failed to delete case', details: error.message, stack: error.stack });
    }
};

// 批量重排案件的处理函数
export const reorderCases = async (req: Request, res: Response) => {
    try {
        const updates = req.body;
        if (!Array.isArray(updates)) {
            return res.status(400).json({ error: 'Invalid updates format, expected array' });
        }
        await caseService.reorderCases(updates);
        res.json({ success: true });
    } catch (error: any) {
        console.error("Reorder Cases Error:", error);
        res.status(500).json({ error: 'Failed to reorder cases', details: error.message });
    }
};
