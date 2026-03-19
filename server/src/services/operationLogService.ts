import prisma from '../prisma';

/**
 * 操作记录服务层
 * 提供操作日志的增删查，以及撤销操作时回滚子任务状态
 */
export const operationLogService = {
    /** 创建操作记录 */
    async createLog(data: {
        action: string;
        caseId: string;
        caseTitle: string;
        subTaskId: string;
        subTaskTitle: string;
    }) {
        return await prisma.operationLog.create({ data });
    },

    /** 获取全部操作记录（按时间倒序） */
    async getAllLogs() {
        return await prisma.operationLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100, // 限制最多返回100条
        });
    },

    /** 删除操作记录并回滚子任务状态 */
    async deleteLogAndRevert(id: string) {
        const log = await prisma.operationLog.findUnique({ where: { id } });
        if (!log) throw new Error('操作记录不存在');

        // 回滚子任务状态
        const subTask = await prisma.subTask.findUnique({ where: { id: log.subTaskId } });
        if (subTask) {
            // 撤销操作：toggle_complete → 回滚为未完成，toggle_incomplete → 回滚为已完成
            const revertCompleted = log.action === 'toggle_complete' ? false : true;
            await prisma.subTask.update({
                where: { id: log.subTaskId },
                data: { isCompleted: revertCompleted },
            });
        }

        // 删除该操作记录
        await prisma.operationLog.delete({ where: { id } });

        return { reverted: !!subTask, log };
    },
};
