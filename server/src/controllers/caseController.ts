
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

        // Handle Documents
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
            updatedCase = await prisma.case.create({
                data: {
                    ...rest,
                    id, // Preserve frontend generated ID like case-4
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
