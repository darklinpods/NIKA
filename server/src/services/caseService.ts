import prisma from '../prisma';
import { Priority } from '../types';

export interface CaseCreateInput {
    title: string;
    description?: string;
    priority?: Priority;
    tags?: string[];
    clientName?: string;
    courtName?: string;
    status?: string;
}

export interface CaseUpdateInput {
    title?: string;
    description?: string;
    priority?: Priority;
    tags?: string[];
    clientName?: string;
    courtName?: string;
    status?: string;
    order?: number;
    parties?: string;
    caseType?: string;
    claimData?: string;
    subTasks?: any[];
    documents?: any[];
}

export const caseService = {
    /** 获取所有案件（含子任务和文档），按 order 和创建时间升序排列 */
    async getAllCases() {
        const cases = await prisma.case.findMany({
            include: { subTasks: true, documents: true },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }]
        });
        return cases.map(c => ({ ...c, tags: c.tags ? JSON.parse(c.tags) : [] }));
    },

    /** 按 ID 查询单个案件（含子任务和文档），不存在返回 null */
    async getCaseById(id: string) {
        const c = await prisma.case.findUnique({ where: { id }, include: { subTasks: true, documents: true } });
        if (!c) return null;
        return { ...c, tags: c.tags ? JSON.parse(c.tags) : [] };
    },

    /** 为指定案件新增一条文档记录 */
    async addDocument(caseId: string, data: { title: string; content: string; category: string }) {
        return prisma.caseDocument.create({ data: { ...data, caseId } });
    },

    /** 查询指定状态列中当前最大 order 值，用于新案件追加到列尾 */
    async getMaxOrder(status: string): Promise<number> {
        const result = await prisma.case.aggregate({ where: { status }, _max: { order: true } });
        return result._max.order ?? -1;
    },

    /** 创建新案件，自动追加到对应状态列末尾 */
    async createCase(data: CaseCreateInput) {
        const { title, description = '', priority = 'medium', tags, clientName = '', courtName, status = 'todo' } = data;
        const maxOrder = await this.getMaxOrder(status);
        const newCase = await prisma.case.create({
            data: { title, description, priority, status, order: maxOrder + 1, tags: JSON.stringify(tags || []), clientName, courtName },
            include: { subTasks: true, documents: true },
        });
        return { ...newCase, tags: JSON.parse(newCase.tags) };
    },

    /**
     * 更新案件及其关联的子任务/文档。
     * - 若案件不存在则自动创建（upsert 语义）
     * - 状态变更时自动将 order 追加到新状态列末尾
     * - 子任务/文档采用"删除不在列表中的 + 更新已有的 + 创建新的"策略
     */
    async updateCase(id: string, data: CaseUpdateInput) {
        const { tags, subTasks, documents, ...rest } = data as any;
        const existingCase = await prisma.case.findUnique({ where: { id } });
        const updateData: any = { ...rest };

        if (tags) updateData.tags = JSON.stringify(tags);

        if (existingCase && rest.status && rest.status !== existingCase.status && rest.order === undefined) {
            updateData.order = (await this.getMaxOrder(rest.status)) + 1;
        }

        if (subTasks && Array.isArray(subTasks)) {
            const existing = subTasks.filter((st: any) => st.id && !st.id.toString().startsWith('sub-') && !st.id.toString().startsWith('new-'));
            const created = subTasks.filter((st: any) => !st.id || st.id.toString().startsWith('sub-') || st.id.toString().startsWith('new-'));
            updateData.subTasks = {
                deleteMany: { id: { notIn: existing.map((st: any) => st.id) } },
                update: existing.map((st: any) => ({ where: { id: st.id }, data: { title: st.title, isCompleted: st.isCompleted, dueDate: st.dueDate ? new Date(st.dueDate) : null } })),
                create: created.map((st: any) => ({ title: st.title, isCompleted: st.isCompleted || false, dueDate: st.dueDate ? new Date(st.dueDate) : null }))
            };
        }

        if (documents && Array.isArray(documents)) {
            const existing = documents.filter((d: any) => d.id && !d.id.toString().startsWith('doc-') && !d.id.toString().startsWith('new-'));
            const created = documents.filter((d: any) => !d.id || d.id.toString().startsWith('doc-') || d.id.toString().startsWith('new-'));
            updateData.documents = {
                deleteMany: { id: { notIn: existing.map((d: any) => d.id) } },
                update: existing.map((d: any) => ({ where: { id: d.id }, data: { title: d.title, content: d.content, category: d.category } })),
                create: created.map((d: any) => ({ title: d.title, content: d.content, category: d.category }))
            };
        }

        let updatedCase;
        if (!existingCase) {
            const status = rest.status || 'todo';
            updatedCase = await prisma.case.create({
                data: {
                    ...rest, id, status,
                    order: rest.order !== undefined ? rest.order : (await this.getMaxOrder(status)) + 1,
                    tags: JSON.stringify(tags || []),
                    subTasks: subTasks ? { create: subTasks.map((st: any) => ({ title: st.title, isCompleted: st.isCompleted || false, dueDate: st.dueDate ? new Date(st.dueDate) : null })) } : undefined,
                    documents: documents ? { create: documents.map((d: any) => ({ title: d.title, content: d.content, category: d.category })) } : undefined
                },
                include: { subTasks: true, documents: true }
            });
        } else {
            updatedCase = await prisma.case.update({ where: { id }, data: updateData, include: { subTasks: true, documents: true } });
        }

        return { ...updatedCase, tags: JSON.parse(updatedCase.tags) };
    },

    /** 批量更新案件排序和状态（看板拖拽后调用），在事务中执行保证原子性 */
    async reorderCases(updates: { id: string; order: number; status: string }[]) {
        return prisma.$transaction(updates.map(u => prisma.case.update({ where: { id: u.id }, data: { order: u.order, status: u.status } })));
    },

    /** 删除案件（级联删除子任务和文档由 Prisma schema 的 onDelete 处理） */
    async deleteCase(id: string) {
        await prisma.case.delete({ where: { id } });
    },

    /** 将案件数据拼装为 RAG 上下文字符串，注入到 AI 的 System Prompt */
    buildRagContext(caseRecord: any): string {
        let ctx = `案件标题: ${caseRecord.title}\n案件类型: ${caseRecord.caseType || '未知'}\n案件描述: ${caseRecord.description}\n当事人信息: ${caseRecord.parties || '暂无'}`;
        let factSheet = null;
        try { factSheet = caseRecord.caseFactSheet ? JSON.parse(caseRecord.caseFactSheet) : null; } catch { }
        if (factSheet) ctx += `\n\n结构化案件事实:\n${JSON.stringify(factSheet, null, 2)}`;
        if (caseRecord.documents?.length) {
            ctx += '\n\n关联证据与文档知识库:\n';
            caseRecord.documents.forEach((doc: any, idx: number) => { ctx += `--- 文档 ${idx + 1}: ${doc.title} ---\n${doc.content}\n`; });
        }
        return ctx;
    }
};
