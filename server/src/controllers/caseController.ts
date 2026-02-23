
import { Request, Response } from 'express';
import prisma from '../prisma';

export const getCases = async (req: Request, res: Response) => {
    try {
        const cases = await prisma.case.findMany({
            include: {
                subTasks: true,
                documents: true,
            },
        });
        // Transform tags back to array if needed, or handle in frontend
        const formattedCases = cases.map(c => ({
            ...c,
            tags: c.tags ? JSON.parse(c.tags) : [],
        }));
        res.json(formattedCases);
    } catch (error: any) {
        console.error("Fetch Cases Error:", error);
        res.status(500).json({ error: 'Failed to fetch cases', details: error.message, stack: error.stack });
    }
};

export const createCase = async (req: Request, res: Response) => {
    try {
        const { title, description, priority, tags, clientName, courtName } = req.body;
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
        res.json({
            ...newCase,
            tags: JSON.parse(newCase.tags)
        });
    } catch (error: any) {
        console.error("Create Case Error:", error);
        res.status(500).json({ error: 'Failed to create case', details: error.message, stack: error.stack });
    }
};

export const updateCase = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    // Separate relations and special fields
    const { tags, subTasks, documents, id: bodyId, createdAt, updatedAt, ...rest } = data;

    try {
        const updateData: any = { ...rest };

        // Handle Tags
        if (tags) {
            updateData.tags = JSON.stringify(tags);
        }

        // Handle SubTasks
        if (subTasks && Array.isArray(subTasks)) {
            updateData.subTasks = {
                deleteMany: {
                    id: { notIn: subTasks.map((st: any) => st.id).filter((id: string) => id) }
                },
                upsert: subTasks.map((st: any) => ({
                    where: { id: st.id || 'new-id' }, // 'new-id' won't be found, triggering create
                    update: {
                        title: st.title,
                        isCompleted: st.isCompleted,
                        dueDate: st.dueDate ? new Date(st.dueDate) : null
                    },
                    create: {
                        title: st.title,
                        isCompleted: st.isCompleted || false,
                        dueDate: st.dueDate ? new Date(st.dueDate) : null
                    }
                }))
            };
        }

        // Handle Documents
        if (documents && Array.isArray(documents)) {
            updateData.documents = {
                deleteMany: {
                    id: { notIn: documents.map((d: any) => d.id).filter((id: string) => id) }
                },
                upsert: documents.map((doc: any) => ({
                    where: { id: doc.id || 'new-id' },
                    update: {
                        title: doc.title,
                        content: doc.content,
                        category: doc.category
                    },
                    create: {
                        title: doc.title,
                        content: doc.content,
                        category: doc.category
                    }
                }))
            };
        }

        const updatedCase = await prisma.case.update({
            where: { id },
            data: updateData,
            include: { subTasks: true, documents: true }
        });

        res.json({
            ...updatedCase,
            tags: JSON.parse(updatedCase.tags)
        });
    } catch (error: any) {
        console.error("Update Case Error:", error);
        res.status(500).json({ error: 'Failed to update case', details: error.message, stack: error.stack });
    }
};

export const deleteCase = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.case.delete({ where: { id } });
        res.json({ message: 'Case deleted' });
    } catch (error: any) {
        console.error("Delete Case Error:", error);
        res.status(500).json({ error: 'Failed to delete case', details: error.message, stack: error.stack });
    }
};
