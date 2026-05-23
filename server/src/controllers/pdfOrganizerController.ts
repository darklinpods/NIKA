import { Request, Response } from 'express';
import { PdfOrganizerPlanEntry, pdfOrganizerService } from '../services/pdfOrganizerService';

const fixFilename = (name: string): string => {
    if (!name) return 'document.pdf';
    try {
        return Buffer.from(name, 'latin1').toString('utf8');
    } catch {
        return name;
    }
};

const parsePages = (value: unknown): PdfOrganizerPlanEntry[] => {
    if (typeof value !== 'string') throw new Error('缺少 pages 排序计划');
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) throw new Error('pages 必须是数组');
    return parsed.map((entry: unknown) => {
        if (Array.isArray(entry)) return entry.map(Number);
        if (entry && typeof entry === 'object' && Array.isArray((entry as any).pages)) {
            return {
                pages: (entry as any).pages.map(Number),
                rotation: Number((entry as any).rotation ?? 0),
            };
        }
        return Number(entry);
    });
};

export const exportOrganizedPdf = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: '请上传 PDF 文件' });
        }

        const originalName = fixFilename(req.file.originalname);
        const filename = originalName.toLowerCase();
        if (req.file.mimetype !== 'application/pdf' && !filename.endsWith('.pdf')) {
            return res.status(400).json({ error: '仅支持 PDF 文件' });
        }

        const pages = parsePages(req.body.pages);
        const outputBuffer = await pdfOrganizerService.reorderPdfPages(req.file.buffer, pages);
        const outputName = `整理后-${originalName.replace(/\.pdf$/i, '')}.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Length', outputBuffer.length);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(outputName)}`);
        res.send(outputBuffer);
    } catch (error: any) {
        console.error('[exportOrganizedPdf] Error:', error);
        res.status(400).json({ error: 'PDF 导出失败', details: error.message });
    }
};
