export interface PdfPageItem {
    id: string;
    pageNumber: number;
    originalPage: number;
    originalPages: number[];
    rotation: number;
    previewUrl: string;
    previewUrls?: string[];
    isMerged?: boolean;
}

export interface PdfExportPlanItem {
    outputIndex: number;
    originalPage: number;
    originalPages?: number[];
    rotation?: number;
}

export type PdfExportPlanEntry = number | number[] | { pages: number[]; rotation: number };
