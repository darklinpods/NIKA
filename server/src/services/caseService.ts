import prisma from '../prisma';

/**
 * 后端数据库服务层 (Service Layer)
 * 负责提取所有原本耦合在 Controller 里的复杂 Prisma ORM 逻辑
 * 提供纯粹的与数据库直接相关的增查改删方法，同时处理与关系表 (SubTasks, Documents) 的联机操作。
 */
export const caseService = {
    // 获取全部案件数据（并按照 order 字段升序排列）
    async getAllCases() {
        const cases = await prisma.case.findMany({
            include: {
                subTasks: true,
                documents: true,
            },
            orderBy: [
                { order: 'asc' },
                { createdAt: 'asc' }
            ]
        });
        // 确保数组结构的正确反序列化，从数据库长字符串转换还原成前端期望的类型格式
        return cases.map(c => ({
            ...c,
            tags: c.tags ? JSON.parse(c.tags) : [],
        }));
    },

    // 获取特定状态下当前最大的 order 值
    async getMaxOrder(status: string): Promise<number> {
        const result = await prisma.case.aggregate({
            where: { status },
            _max: { order: true }
        });
        return result._max.order ?? -1;
    },

    // 创建新案件记录
    async createCase(data: any) {
        const { title, description, priority, tags, clientName, courtName, status = 'todo' } = data;

        // 默认将新案件放到对应状态列的最后
        const maxOrder = await this.getMaxOrder(status);

        const newCase = await prisma.case.create({
            data: {
                title,
                description,
                priority,
                status,
                order: maxOrder + 1,
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

        const existingCase = await prisma.case.findUnique({ where: { id } });

        const updateData: any = { ...rest };

        if (tags) {
            updateData.tags = JSON.stringify(tags);
        }

        // 如果状态发生了改变，且请求中没有明确指定新的 order，则默认移动到新列的末尾
        if (existingCase && rest.status && rest.status !== existingCase.status && rest.order === undefined) {
            const maxOrder = await this.getMaxOrder(rest.status);
            updateData.order = maxOrder + 1;
        }

        // 精细化的 SubTasks 同步处理
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

        let updatedCase;

        if (!existingCase) {
            const status = rest.status || 'todo';
            const maxOrder = await this.getMaxOrder(status);

            updatedCase = await prisma.case.create({
                data: {
                    ...rest,
                    id,
                    status,
                    order: rest.order !== undefined ? rest.order : maxOrder + 1,
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

    // 批量重排案件
    async reorderCases(updates: { id: string, order: number, status: string }[]) {
        return await prisma.$transaction(
            updates.map(u =>
                prisma.case.update({
                    where: { id: u.id },
                    data: { order: u.order, status: u.status }
                })
            )
        );
    },

    // 安全移除整个案件实体记录
    async deleteCase(id: string) {
        await prisma.case.delete({ where: { id } });
        return { message: 'Case deleted' };
    }
};
