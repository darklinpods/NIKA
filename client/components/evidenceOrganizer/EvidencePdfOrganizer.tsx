import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileText, Layers, Loader, RotateCcw, RotateCw, SplitSquareVertical, Upload, X } from 'lucide-react';
import { exportOrganizedPdf } from '../../services/api';
import { PdfPageItem } from './types';

interface EvidencePdfOrganizerProps {
    caseId: string;
    theme: 'light' | 'dark';
    onClose: () => void;
}

const pageNumberLabel = (value: number) => `P${String(value).padStart(2, '0')}`;
const pageRangeLabel = (pages: number[]) => pages.length === 1
    ? `原始页码 ${pages[0]}`
    : `合并 ${pages.map(page => `P${page}`).join(' + ')}`;

let pdfjsLoadPromise: Promise<typeof import('pdfjs-dist')> | null = null;

const loadPdfJs = async () => {
    if (!pdfjsLoadPromise) {
        pdfjsLoadPromise = Promise.all([
            import('pdfjs-dist'),
            import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        ]).then(([pdfjsLib, workerModule]) => {
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerModule.default;
            return pdfjsLib;
        });
    }
    return pdfjsLoadPromise;
};

const renderPageToUrl = async (pdfPage: any): Promise<string> => {
    const baseViewport = pdfPage.getViewport({ scale: 1 });
    const scale = Math.min(1.45, 920 / baseViewport.width);
    const viewport = pdfPage.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('无法创建 PDF 页面预览画布');

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await pdfPage.render({ canvasContext: context, viewport }).promise;

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('PDF 页面预览生成失败'));
                return;
            }
            resolve(URL.createObjectURL(blob));
        }, 'image/jpeg', 0.84);
    });
};

const renumberPages = (items: PdfPageItem[]) => items.map((page, index) => ({
    ...page,
    pageNumber: index + 1,
}));

export const EvidencePdfOrganizer: React.FC<EvidencePdfOrganizerProps> = ({ caseId, theme, onClose }) => {
    const isDark = theme === 'dark';
    const inputRef = useRef<HTMLInputElement>(null);
    const previewUrlsRef = useRef<string[]>([]);
    const dragIdRef = useRef<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [pages, setPages] = useState<PdfPageItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [statusText, setStatusText] = useState('请选择一个 PDF 开始整理');
    const [error, setError] = useState<string | null>(null);

    const selectedIndex = pages.findIndex(page => page.id === selectedId);
    const selectedPage = selectedIndex >= 0 ? pages[selectedIndex] : pages[0];
    const selectedCount = selectedIds.size;
    const hasReordered = pages.some((page, index) => page.originalPages.length !== 1 || page.originalPages[0] !== index + 1);

    const exportPlan = useMemo(() => pages.map((page, index) => ({
        outputIndex: index + 1,
        originalPage: page.originalPage,
        originalPages: page.originalPages,
        rotation: page.rotation,
    })), [pages]);

    useEffect(() => () => {
        previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
        previewUrlsRef.current = [];
    }, []);

    const clearPages = () => {
        previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
        previewUrlsRef.current = [];
        setPages([]);
        setSelectedId(null);
        setSelectedIds(new Set());
    };

    const handleFile = async (nextFile: File) => {
        if (!nextFile.name.toLowerCase().endsWith('.pdf') && nextFile.type !== 'application/pdf') {
            setError('请选择 PDF 文件');
            return;
        }

        clearPages();
        setFile(nextFile);
        setIsLoading(true);
        setError(null);
        setStatusText('正在读取 PDF...');

        try {
            const pdfjsLib = await loadPdfJs();
            const data = new Uint8Array(await nextFile.arrayBuffer());
            const pdf = await pdfjsLib.getDocument({ data }).promise;
            const loadedPages: PdfPageItem[] = [];

            for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                setStatusText(`正在生成页面预览：${pageNumber} / ${pdf.numPages}`);
                const pdfPage = await pdf.getPage(pageNumber);
                const previewUrl = await renderPageToUrl(pdfPage);
                previewUrlsRef.current.push(previewUrl);
                loadedPages.push({
                    id: `pdf-page-${pageNumber}`,
                    pageNumber,
                    originalPage: pageNumber,
                    originalPages: [pageNumber],
                    rotation: 0,
                    previewUrl,
                    previewUrls: [previewUrl],
                });
                setPages([...loadedPages]);
                if (pageNumber === 1) {
                    setSelectedId('pdf-page-1');
                    setSelectedIds(new Set(['pdf-page-1']));
                }
            }

            setSelectedId(loadedPages[0]?.id ?? null);
            if (loadedPages[0]) setSelectedIds(new Set([loadedPages[0].id]));
            setStatusText(`已载入 ${nextFile.name}，共 ${pdf.numPages} 页`);
        } catch (err: any) {
            console.error('[EvidencePdfOrganizer] load failed:', err);
            setError(err?.message || 'PDF 读取失败');
            setStatusText('PDF 读取失败');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelection = (pageId: string, additive: boolean) => {
        setSelectedId(pageId);
        setSelectedIds(prev => {
            if (!additive) return new Set([pageId]);
            const next = new Set(prev);
            if (next.has(pageId)) {
                next.delete(pageId);
                if (next.size === 0) next.add(pageId);
            } else {
                next.add(pageId);
            }
            return next;
        });
    };

    const reorderByDrag = (sourceId: string, targetId: string) => {
        if (sourceId === targetId) return;
        const sourceIndex = pages.findIndex(page => page.id === sourceId);
        const targetIndex = pages.findIndex(page => page.id === targetId);
        if (sourceIndex < 0 || targetIndex < 0) return;

        const movingIds = selectedIds.has(sourceId)
            ? pages.filter(page => selectedIds.has(page.id)).map(page => page.id)
            : [sourceId];
        const moving = pages.filter(page => movingIds.includes(page.id));
        const rest = pages.filter(page => !movingIds.includes(page.id));
        const targetRestIndex = rest.findIndex(page => page.id === targetId);
        const insertIndex = targetRestIndex < 0 ? rest.length : targetRestIndex + (sourceIndex < targetIndex ? 1 : 0);
        const next = [...rest.slice(0, insertIndex), ...moving, ...rest.slice(insertIndex)];

        setPages(renumberPages(next));
        setSelectedId(sourceId);
        setSelectedIds(new Set(movingIds));
        setStatusText(`已拖拽移动 ${moving.length} 个页面项`);
    };

    const mergeSelectedPages = () => {
        if (selectedIds.size < 2) return;
        const selectedPages = pages.filter(page => selectedIds.has(page.id));
        const firstSelectedIndex = pages.findIndex(page => selectedIds.has(page.id));
        const mergedOriginalPages = selectedPages.flatMap(page => page.originalPages);
        const mergedPreviewUrls = selectedPages.flatMap(page => page.previewUrls?.length ? page.previewUrls : [page.previewUrl]);
        const mergedItem: PdfPageItem = {
            id: `merged-${Date.now()}`,
            pageNumber: firstSelectedIndex + 1,
            originalPage: mergedOriginalPages[0],
            originalPages: mergedOriginalPages,
            rotation: 0,
            previewUrl: mergedPreviewUrls[0],
            previewUrls: mergedPreviewUrls,
            isMerged: true,
        };
        const rest = pages.filter(page => !selectedIds.has(page.id));
        const next = renumberPages([...rest.slice(0, firstSelectedIndex), mergedItem, ...rest.slice(firstSelectedIndex)]);

        setPages(next);
        setSelectedId(mergedItem.id);
        setSelectedIds(new Set([mergedItem.id]));
        setStatusText(`已合并 ${mergedOriginalPages.length} 个原始页面为一个输出页`);
    };

    const splitMergedPage = () => {
        if (!selectedPage?.isMerged || !selectedPage.previewUrls || selectedPage.originalPages.length < 2) return;
        const index = pages.findIndex(page => page.id === selectedPage.id);
        const splitItems = selectedPage.originalPages.map((originalPage, itemIndex) => ({
            id: `pdf-page-${originalPage}-${Date.now()}-${itemIndex}`,
            pageNumber: index + itemIndex + 1,
            originalPage,
            originalPages: [originalPage],
            rotation: selectedPage.rotation,
            previewUrl: selectedPage.previewUrls?.[itemIndex] || selectedPage.previewUrl,
            previewUrls: [selectedPage.previewUrls?.[itemIndex] || selectedPage.previewUrl],
        }));
        const next = renumberPages([...pages.slice(0, index), ...splitItems, ...pages.slice(index + 1)]);

        setPages(next);
        setSelectedId(splitItems[0]?.id ?? null);
        setSelectedIds(new Set(splitItems[0] ? [splitItems[0].id] : []));
        setStatusText('已拆分当前合并组');
    };

    const resetOrder = () => {
        const next = pages
            .flatMap(page => page.originalPages.map((originalPage, pageIndex) => ({
                id: `pdf-page-${originalPage}-reset-${pageIndex}`,
                pageNumber: originalPage,
                originalPage,
                originalPages: [originalPage],
                rotation: 0,
                previewUrl: page.previewUrls?.[pageIndex] || page.previewUrl,
                previewUrls: [page.previewUrls?.[pageIndex] || page.previewUrl],
            })))
            .sort((a, b) => a.originalPage - b.originalPage);
        const renumbered = renumberPages(next);

        setPages(renumbered);
        setSelectedId(renumbered[0]?.id ?? null);
        setSelectedIds(new Set(renumbered[0] ? [renumbered[0].id] : []));
        setStatusText('已恢复原始页序');
    };

    const rotateSelectedPages = () => {
        const targetIds = selectedIds.size > 0 ? selectedIds : new Set(selectedPage ? [selectedPage.id] : []);
        if (targetIds.size === 0) return;
        const next = pages.map(page => targetIds.has(page.id)
            ? { ...page, rotation: (page.rotation + 90) % 360 }
            : page);
        setPages(next);
        setStatusText(`已旋转 ${targetIds.size} 个页面项 90°`);
    };

    const handleExport = async () => {
        if (!file || pages.length === 0 || isExporting) return;
        setIsExporting(true);
        setError(null);
        setStatusText('正在生成整理后的 PDF...');

        try {
            const pagePlan = pages.map(page => ({
                pages: page.originalPages,
                rotation: page.rotation,
            }));
            const blob = await exportOrganizedPdf(caseId, file, pagePlan);
            const baseName = file.name.replace(/\.pdf$/i, '');
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `整理后-${baseName}.pdf`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
            setStatusText('已生成整理后的 PDF');
        } catch (err: any) {
            console.error('[EvidencePdfOrganizer] export failed:', err);
            setError(err?.message || 'PDF 导出失败');
            setStatusText('PDF 导出失败');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
            onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
        >
            <div className={`w-[min(1440px,96vw)] h-[min(900px,92vh)] rounded-2xl shadow-2xl border overflow-hidden flex flex-col
                ${isDark ? 'bg-slate-950 border-white/10 text-slate-100' : 'bg-slate-50 border-slate-200 text-slate-900'}`}>
                <header className={`h-16 shrink-0 px-5 border-b flex items-center justify-between gap-4
                    ${isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={`p-1.5 rounded-lg ${isDark ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700'}`}>
                                <FileText size={18} />
                            </span>
                            <h2 className="font-bold truncate">PDF 整理工作台</h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 truncate">{statusText}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <input
                            ref={inputRef}
                            type="file"
                            accept="application/pdf,.pdf"
                            className="hidden"
                            onChange={(event) => {
                                const nextFile = event.target.files?.[0];
                                if (nextFile) handleFile(nextFile);
                                event.target.value = '';
                            }}
                        />
                        <button
                            onClick={() => inputRef.current?.click()}
                            disabled={isLoading || isExporting}
                            className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors
                                ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                            <Upload size={16} />选择 PDF
                        </button>
                        <button
                            onClick={resetOrder}
                            disabled={pages.length === 0 || isLoading || isExporting || !hasReordered}
                            className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors
                                ${pages.length === 0 || !hasReordered
                                    ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
                                    : (isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700')}`}>
                            <RotateCcw size={16} />恢复页序
                        </button>
                        <button
                            onClick={rotateSelectedPages}
                            disabled={pages.length === 0 || isLoading || isExporting}
                            className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors
                                ${pages.length === 0
                                    ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
                                    : (isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700')}`}>
                            <RotateCw size={16} />旋转
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={!file || pages.length === 0 || isLoading || isExporting}
                            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors
                                ${!file || pages.length === 0 || isLoading || isExporting
                                    ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'}`}>
                            {isExporting ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                            导出新 PDF
                        </button>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                        >
                            <X size={18} />
                        </button>
                    </div>
                </header>

                {error && (
                    <div className={`mx-5 mt-4 px-4 py-2 rounded-xl border text-sm
                        ${isDark ? 'border-red-500/30 bg-red-950/40 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
                        {error}
                    </div>
                )}

                <main className="flex-1 min-h-0 grid grid-cols-[430px_1fr_300px]">
                    <aside className={`border-r min-h-0 flex flex-col ${isDark ? 'border-white/10 bg-slate-900/70' : 'border-slate-200 bg-white'}`}>
                        <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">页面顺序</p>
                            <p className="text-xs text-slate-500 mt-1">点击选择，按住 Shift / Command 可多选；拖拽卡片调整输出顺序。</p>
                            <div className="flex items-center gap-2 mt-3">
                                <button
                                    onClick={mergeSelectedPages}
                                    disabled={selectedCount < 2 || isLoading || isExporting}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors
                                        ${selectedCount < 2
                                            ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
                                            : (isDark ? 'bg-indigo-900/50 text-indigo-200 hover:bg-indigo-900 border border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100')}`}
                                >
                                    <Layers size={13} />合并所选 {selectedCount > 1 ? selectedCount : ''}
                                </button>
                                <button
                                    onClick={splitMergedPage}
                                    disabled={!selectedPage?.isMerged || isLoading || isExporting}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors
                                        ${!selectedPage?.isMerged
                                            ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
                                            : (isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50')}`}
                                >
                                    <SplitSquareVertical size={13} />拆分
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 grid grid-cols-2 xl:grid-cols-3 gap-2 content-start">
                            {pages.map((page, index) => (
                                <div
                                    role="button"
                                    tabIndex={0}
                                    key={page.id}
                                    draggable
                                    onClick={(event) => toggleSelection(page.id, event.shiftKey || event.metaKey || event.ctrlKey)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            toggleSelection(page.id, event.shiftKey || event.metaKey || event.ctrlKey);
                                        }
                                    }}
                                    onDragStart={(event) => {
                                        dragIdRef.current = page.id;
                                        event.dataTransfer.effectAllowed = 'move';
                                        event.dataTransfer.setData('text/plain', page.id);
                                    }}
                                    onDragOver={(event) => {
                                        event.preventDefault();
                                        setDragOverId(page.id);
                                    }}
                                    onDragLeave={() => setDragOverId(null)}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        const sourceId = event.dataTransfer.getData('text/plain') || dragIdRef.current;
                                        setDragOverId(null);
                                        if (sourceId) reorderByDrag(sourceId, page.id);
                                    }}
                                    onDragEnd={() => {
                                        dragIdRef.current = null;
                                        setDragOverId(null);
                                    }}
                                    className={`relative text-left rounded-xl border p-2 transition-all cursor-grab active:cursor-grabbing
                                        ${selectedIds.has(page.id)
                                            ? (isDark ? 'border-blue-400 bg-blue-500/15 ring-2 ring-blue-400/30' : 'border-blue-400 bg-blue-50 ring-2 ring-blue-300/40')
                                            : dragOverId === page.id
                                                ? (isDark ? 'border-indigo-400 bg-indigo-500/10' : 'border-indigo-400 bg-indigo-50')
                                                : (isDark ? 'border-white/5 bg-slate-800/60 hover:bg-slate-800' : 'border-slate-200 bg-slate-50 hover:bg-white')}`}
                                >
                                    {page.isMerged && (
                                        <div className="absolute right-2 top-2 z-10 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                                            合并
                                        </div>
                                    )}
                                    <div className="aspect-[3/4] rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                                        <img
                                            src={page.previewUrl}
                                            alt={`原始第 ${page.originalPage} 页`}
                                            className="h-full w-full object-contain transition-transform"
                                            style={{ transform: `rotate(${page.rotation}deg)` }}
                                        />
                                    </div>
                                    <div className="mt-2 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="text-xs font-bold">{pageNumberLabel(index + 1)}</p>
                                            {selectedIds.has(page.id) && <span className="text-[10px] font-bold text-blue-600">已选</span>}
                                        </div>
                                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{pageRangeLabel(page.originalPages)}</p>
                                        {page.rotation !== 0 && <p className="text-[10px] font-bold text-amber-600 mt-1">旋转 {page.rotation}°</p>}
                                    </div>
                                    {page.isMerged && page.previewUrls && (
                                        <div className="mt-2 flex -space-x-1">
                                            {page.previewUrls.slice(0, 4).map((url, previewIndex) => (
                                                <img key={`${page.id}-${previewIndex}`} src={url} alt="" className="h-7 w-5 rounded border border-white object-cover shadow-sm" />
                                            ))}
                                            {page.previewUrls.length > 4 && (
                                                <span className="h-7 w-7 rounded-full bg-slate-800 text-white text-[10px] font-bold grid place-items-center">+{page.previewUrls.length - 4}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {pages.length === 0 && (
                                <div className="col-span-full h-full min-h-[300px] flex flex-col items-center justify-center text-center text-slate-400 px-4">
                                    {isLoading ? <Loader className="animate-spin mb-3" size={28} /> : <Upload className="mb-3" size={32} />}
                                    <p className="text-sm font-bold">尚未载入 PDF</p>
                                    <p className="text-xs mt-1">选择一个 PDF 后，这里会显示页级缩略图。</p>
                                </div>
                            )}
                        </div>
                    </aside>

                    <section className={`min-h-0 overflow-auto custom-scrollbar p-6 ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
                        {selectedPage ? (
                            <div className="min-h-full flex justify-center">
                                <img
                                    src={selectedPage.previewUrl}
                                    alt={`原始第 ${selectedPage.originalPage} 页大图预览`}
                                    className="max-w-full h-fit bg-white shadow-2xl rounded-sm transition-transform"
                                    style={{ transform: `rotate(${selectedPage.rotation}deg)` }}
                                />
                            </div>
                        ) : (
                            <div className={`h-full min-h-[420px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center
                                ${isDark ? 'border-white/10 text-slate-500' : 'border-slate-300 text-slate-400'}`}>
                                <FileText size={42} className="mb-3" />
                                <p className="font-bold">选择 PDF 后查看页面</p>
                            </div>
                        )}
                    </section>

                    <aside className={`border-l min-h-0 flex flex-col ${isDark ? 'border-white/10 bg-slate-900/80' : 'border-slate-200 bg-white'}`}>
                        <div className={`px-4 py-3 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">导出计划</p>
                            <p className="text-xs text-slate-500 mt-1">生成新 PDF，不覆盖原文件；合并组会输出为单页。</p>
                        </div>
                        <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar">
                            <div className={`rounded-xl border p-3 ${isDark ? 'border-white/10 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                                <p className="text-xs text-slate-500">文件</p>
                                <p className="text-sm font-bold truncate mt-1">{file?.name || '未选择'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className={`rounded-xl border p-3 ${isDark ? 'border-white/10 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                                    <p className="text-xs text-slate-500">输出页数</p>
                                    <p className="text-xl font-bold mt-1">{pages.length}</p>
                                </div>
                                <div className={`rounded-xl border p-3 ${isDark ? 'border-white/10 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                                    <p className="text-xs text-slate-500">状态</p>
                                    <p className="text-sm font-bold mt-2">{hasReordered ? '已调整' : '原始顺序'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-2">页码映射</p>
                                <div className={`max-h-[420px] overflow-y-auto rounded-xl border ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                                    {exportPlan.map(item => (
                                        <div key={`${item.outputIndex}-${item.originalPages.join('-')}`} className={`flex items-center justify-between gap-3 px-3 py-2 text-xs border-b last:border-b-0
                                            ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                                            <span>输出 {pageNumberLabel(item.outputIndex)}</span>
                                            <span className="font-bold text-right">
                                                {item.originalPages.length > 1 ? `合并 ${item.originalPages.join('+')}` : `原始第 ${item.originalPage} 页`}
                                                {item.rotation ? ` · 旋转 ${item.rotation}°` : ''}
                                            </span>
                                        </div>
                                    ))}
                                    {exportPlan.length === 0 && <p className="p-4 text-xs text-slate-400 text-center">暂无导出计划</p>}
                                </div>
                            </div>
                        </div>
                    </aside>
                </main>
            </div>
        </div>
    );
};
