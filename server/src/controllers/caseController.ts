
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
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cases' });
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
        });
        res.json({
            ...newCase,
            tags: JSON.parse(newCase.tags)
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create case' });
    }
};

export const updateCase = async (req: Request, res: Response) => {
    const { id } = req.params;
    const data = req.body;

    // separate special fields like tags
    const { tags, ...rest } = data;

    try {
        const updateData: any = { ...rest };
        if (tags) {
            updateData.tags = JSON.stringify(tags);
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
    } catch (error) {
        res.status(500).json({ error: 'Failed to update case' });
    }
};

export const deleteCase = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.case.delete({ where: { id } });
        res.json({ message: 'Case deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete case' });
    }
};
