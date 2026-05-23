import { degrees, PDFDocument, rgb } from 'pdf-lib';

export type PdfOrganizerPlanEntry = number | number[] | { pages: number[]; rotation?: number };
type NormalizedPlanEntry = { pages: number[]; rotation: number };

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 36;
const CELL_GAP = 18;

const validatePageNumber = (page: number, pageCount: number) => {
    if (!Number.isInteger(page) || page < 1 || page > pageCount) {
        throw new Error(`非法页码：${page}`);
    }
};

const normalizeRotation = (rotation: unknown): number => {
    const value = Number(rotation ?? 0);
    if (!Number.isFinite(value)) throw new Error(`非法旋转角度：${rotation}`);
    const normalized = ((Math.round(value / 90) * 90) % 360 + 360) % 360;
    return normalized;
};

const normalizePlanEntry = (entry: PdfOrganizerPlanEntry): NormalizedPlanEntry => {
    if (typeof entry === 'number') return { pages: [entry], rotation: 0 };
    if (Array.isArray(entry)) return { pages: entry, rotation: 0 };
    if (entry && typeof entry === 'object' && Array.isArray(entry.pages)) {
        return { pages: entry.pages, rotation: normalizeRotation(entry.rotation) };
    }
    throw new Error('页面排序计划格式错误');
};

const normalizePlan = (plan: PdfOrganizerPlanEntry[], pageCount: number): NormalizedPlanEntry[] => {
    if (!Array.isArray(plan) || plan.length === 0) {
        throw new Error('页面排序计划不能为空');
    }

    const seen = new Set<number>();
    const normalizedPlan = plan.map(normalizePlanEntry);
    for (const entry of normalizedPlan) {
        if (entry.pages.length === 0) throw new Error('合并组不能为空');
        for (const page of entry.pages) {
            validatePageNumber(page, pageCount);
            if (seen.has(page)) throw new Error(`页面排序计划包含重复页码：${page}`);
            seen.add(page);
        }
    }

    if (seen.size !== pageCount) {
        throw new Error(`页面排序计划必须包含全部 ${pageCount} 页，当前包含 ${seen.size} 页`);
    }

    return normalizedPlan;
};

const drawMergedPage = async (outputPdf: PDFDocument, sourcePdf: PDFDocument, pages: number[], rotation: number) => {
    const outputPage = outputPdf.addPage([A4_WIDTH, A4_HEIGHT]);
    if (rotation) outputPage.setRotation(degrees(rotation));
    outputPage.drawRectangle({
        x: 0,
        y: 0,
        width: A4_WIDTH,
        height: A4_HEIGHT,
        color: rgb(1, 1, 1),
    });

    const embeddedPages = await Promise.all(pages.map(page => outputPdf.embedPage(sourcePdf.getPage(page - 1))));
    const rowCount = embeddedPages.length;
    const availableWidth = A4_WIDTH - PAGE_MARGIN * 2;
    const availableHeight = A4_HEIGHT - PAGE_MARGIN * 2 - CELL_GAP * (rowCount - 1);
    const cellHeight = availableHeight / rowCount;

    embeddedPages.forEach((embeddedPage, index) => {
        const { width, height } = embeddedPage;
        const scale = Math.min(availableWidth / width, cellHeight / height);
        const drawWidth = width * scale;
        const drawHeight = height * scale;
        const x = PAGE_MARGIN + (availableWidth - drawWidth) / 2;
        const y = A4_HEIGHT - PAGE_MARGIN - (index + 1) * cellHeight - index * CELL_GAP + (cellHeight - drawHeight) / 2;
        outputPage.drawPage(embeddedPage, { x, y, width: drawWidth, height: drawHeight });
    });
};

export const pdfOrganizerService = {
    async reorderPdfPages(fileBuffer: Buffer, plan: PdfOrganizerPlanEntry[]): Promise<Buffer> {
        const sourcePdf = await PDFDocument.load(fileBuffer);
        const pageCount = sourcePdf.getPageCount();
        const normalizedPlan = normalizePlan(plan, pageCount);
        const outputPdf = await PDFDocument.create();

        for (const entry of normalizedPlan) {
            if (entry.pages.length === 1) {
                const [copiedPage] = await outputPdf.copyPages(sourcePdf, [entry.pages[0] - 1]);
                if (entry.rotation) {
                    const currentRotation = copiedPage.getRotation().angle || 0;
                    copiedPage.setRotation(degrees((currentRotation + entry.rotation) % 360));
                }
                outputPdf.addPage(copiedPage);
            } else {
                await drawMergedPage(outputPdf, sourcePdf, entry.pages, entry.rotation);
            }
        }

        const bytes = await outputPdf.save();
        return Buffer.from(bytes);
    }
};
