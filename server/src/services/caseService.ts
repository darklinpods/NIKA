import prisma from '../prisma';

/**
 * 后端数据库服务层 (Service Layer)
 * 负责提取所有原本耦合在 Controller 里的复杂 Prisma ORM 逻辑
 * 提供纯粹的与数据库直接相关的增查改删方法，同时处理与关系表 (SubTasks, Documents) 的联机操作。
 */
export const caseService = {
    // 获取全部案件数据（并携带附带的嵌套数组结果）
    async getAllCases() {
        const cases = await prisma.case.findMany({
            include: {
                subTasks: true,
                documents: true,
            },
        });
        // 确保数组结构的正确反序列化，从数据库长字符串转换还原成前端期望的类型格式
        return cases.map(c => ({
            ...c,
            tags: c.tags ? JSON.parse(c.tags) : [],
        }));
    },

    // 创建新案件记录
    async createCase(data: any) {
        const { title, description, priority, tags, clientName, courtName } = data;
        const newCase = await prisma.case.create({
            data: {
                title,
                description,
                priority,
                tags: JSON.stringify(tags || []),
                clientName,
                courtName,
            },
            include: {
                subTasks: true,
                documents: true,
            },
        });
        return {
            ...newCase,
            tags: JSON.parse(newCase.tags)
        };
    },

    // 更新复杂案件记录的核心逻辑（包含关系表动态替换和更新）
    async updateCase(id: string, data: any) {
        // 先剥离出基础字段和可能存在修改并牵扯其他表的字段内容
        const { tags, subTasks, documents, id: bodyId, createdAt, updatedAt, ...rest } = data;

        const updateData: any = { ...rest };

        if (tags) {
            updateData.tags = JSON.stringify(tags);
        }

        // 精细化的 SubTasks 同步处理
        // 由于前端传过来的是全新全量状态，后端需进行 DIFF：保留依然存在的记录、增加新创建记录、移除被删除的新鲜记录
        if (subTasks && Array.isArray(subTasks)) {
            const existingSubTasks = subTasks.filter((st: any) => st.id && !st.id.toString().startsWith('sub-') && !st.id.toString().startsWith('new-'));
            const newSubTasks = subTasks.filter((st: any) => !st.id || st.id.toString().startsWith('sub-') || st.id.toString().startsWith('new-'));

            updateData.subTasks = {
                deleteMany: {
                    id: { notIn: existingSubTasks.map(st => st.id) }
                },
                update: existingSubTasks.map(st => ({
                    where: { id: st.id },
                    data: {
                        title: st.title,
                        isCompleted: st.isCompleted,
                        dueDate: st.dueDate ? new Date(st.dueDate) : null
                    }
                })),
                create: newSubTasks.map(st => ({
                    title: st.title,
                    isCompleted: st.isCompleted || false,
                    dueDate: st.dueDate ? new Date(st.dueDate) : null
                }))
            };
        }

        // 精细化的文书关联列表 Documents 同步处理
        if (documents && Array.isArray(documents)) {
            const existingDocuments = documents.filter((doc: any) => doc.id && !doc.id.toString().startsWith('doc-') && !doc.id.toString().startsWith('new-'));
            const newDocuments = documents.filter((doc: any) => !doc.id || doc.id.toString().startsWith('doc-') || doc.id.toString().startsWith('new-'));

            updateData.documents = {
                deleteMany: {
                    id: { notIn: existingDocuments.map(doc => doc.id) }
                },
                update: existingDocuments.map(doc => ({
                    where: { id: doc.id },
                    data: {
                        title: doc.title,
                        content: doc.content,
                        category: doc.category
                    }
                })),
                create: newDocuments.map(doc => ({
                    title: doc.title,
                    content: doc.content,
                    category: doc.category
                }))
            };
        }

        const existingCase = await prisma.case.findUnique({ where: { id } });
        let updatedCase;

        if (!existingCase) {
            // 注意：针对可能出现前端带过来自定义的ID时，提供创建支持（如导入或者离线合并等非标准操作的兼容易用代码）
            updatedCase = await prisma.case.create({
                data: {
                    ...rest,
                    id,
                    tags: JSON.stringify(tags || []),
                    subTasks: subTasks ? {
                        create: subTasks.map((st: any) => ({
                            title: st.title,
                            isCompleted: st.isCompleted || false,
                            dueDate: st.dueDate ? new Date(st.dueDate) : null
                        }))
                    } : undefined,
                    documents: documents ? {
                        create: documents.map((doc: any) => ({
                            title: doc.title,
                            content: doc.content,
                            category: doc.category
                        }))
                    } : undefined
                },
                include: { subTasks: true, documents: true }
            });
        } else {
            updatedCase = await prisma.case.update({
                where: { id },
                data: updateData,
                include: { subTasks: true, documents: true }
            });
        }

        return {
            ...updatedCase,
            tags: JSON.parse(updatedCase.tags)
        };
    },

    // 安全移除整个案件实体记录（因 Prisma 层已开启外键删除级联 cascading delete，连带子项将一并正确清理）
    async deleteCase(id: string) {
        await prisma.case.delete({ where: { id } });
        return { message: 'Case deleted' };
    }
};
