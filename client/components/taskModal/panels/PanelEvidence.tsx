import React, { useState } from 'react';
import { FileText, Plus, Database, Wand2, Loader, Scan, Users, Eye, Download, Trash2, X, Edit2, Check, AlignLeft, Receipt } from 'lucide-react';
import { Case, CaseDocument, InvoiceItem } from '../../../types';
import { translations } from '../../../translations';
import { uploadCaseEvidence, api } from '../../../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MDEditor from '@uiw/react-md-editor';


interface PanelEvidenceProps {
    task: Case;
    theme: 'light' | 'dark';
    lang: 'zh' | 'en';
    onTaskChange: (task: Case) => void;
    onAddDocument: (doc: CaseDocument) => void;
    onDeleteDocument: (docId: string) => void;
}

// ─── Document Viewer Modal ────────────────────────────────────────────────────
const DocViewer: React.FC<{ doc: CaseDocument; theme: 'light' | 'dark'; onClose: () => void }> = ({ doc, theme, onClose }) => {
    const paragraphs = doc.content
        .split(/\n{2,}|-{4,}Page \(\d+\) Break-{4,}/)
        .map(p => p.trim())
        .filter(p => p.length > 0);

    const handleDownload = () => {
        const baseName = doc.title.replace(/\.[^.]+$/, '');
        const blob = new Blob([doc.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}（提取文字）.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const isDark = theme === 'dark';
    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className={`relative w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col rounded-2xl shadow-2xl border overflow-hidden
                ${isDark ? 'bg-slate-900 border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
                <div className={`flex items-center justify-between px-6 py-4 border-b shrink-0
                    ${isDark ? 'border-white/10 bg-slate-800/60' : 'border-slate-200 bg-slate-50'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-blue-500/15 text-blue-500 rounded-lg shrink-0"><FileText size={18} /></div>
                        <div className="min-w-0">
                            <p className="font-bold truncate">{doc.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">
                                提取文字 · {doc.content.length.toLocaleString()} 字符 · {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-4">
                        <button onClick={handleDownload}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                                ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'}`}>
                            <Download size={14} />下载 .txt
                        </button>
                        <button onClick={onClose}
                            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                            <X size={18} />
                        </button>
                    </div>
                </div>
                <div className={`flex-1 overflow-y-auto p-6 custom-scrollbar space-y-3 ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
                    {paragraphs.length === 0
                        ? <p className="text-slate-400 text-sm italic text-center py-12">无可显示的文字内容</p>
                        : paragraphs.map((para, idx) => (
                            <p key={idx} className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{para}</p>
                        ))
                    }
                </div>
                <div className={`px-6 py-3 border-t text-xs text-slate-400 shrink-0 ${isDark ? 'border-white/10 bg-slate-800/60' : 'border-slate-200 bg-slate-50'}`}>
                    提示：这是从原始文件中 OCR 提取的文字内容，不是原始 PDF/Word 文件，可通过右上角"下载 .txt"保存到本地。
                </div>
            </div>
        </div>
    );
};

// ─── Compact Party Card ───────────────────────────────────────────────────────
const PartyCard: React.FC<{ party: any; theme: 'light' | 'dark'; t: any }> = ({ party, theme, t }) => {
    const isDark = theme === 'dark';
    return (
        <div className={`p-3 rounded-xl border flex flex-col gap-1.5 text-xs
            ${isDark ? 'bg-slate-800/80 border-white/5 text-slate-300' : 'bg-white border-slate-200 text-slate-600'}`}>
            <div className="flex items-start justify-between gap-2">
                <span className={`font-bold text-sm leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>{party.name}</span>
                {party.role && (
                    <span className="shrink-0 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {party.role}
                    </span>
                )}
            </div>
            {party.idNumber && (
                <div className="flex gap-1.5">
                    <span className="text-slate-400 shrink-0">{t.idNum}:</span>
                    <span className="font-mono break-all">{party.idNumber}</span>
                </div>
            )}
            {party.contact && (
                <div className="flex gap-1.5">
                    <span className="text-slate-400 shrink-0">{t.contact}:</span>
                    <span>{party.contact}</span>
                </div>
            )}
            {party.address && (
                <div className="flex gap-1.5">
                    <span className="text-slate-400 shrink-0">{t.address}:</span>
                    <span className="break-words">{party.address}</span>
                </div>
            )}
        </div>
    );
};

// ─── Main Panel ───────────────────────────────────────────────────────────────
export const PanelEvidence: React.FC<PanelEvidenceProps> = ({
    task, theme, lang, onTaskChange, onAddDocument, onDeleteDocument
}) => {
    const t = translations[lang] as any;
    const isDark = theme === 'dark';

    const [isUploading, setIsUploading] = useState(false);
    const [isExtractingParties, setIsExtractingParties] = useState(false);
    const [isExtractingInvoices, setIsExtractingInvoices] = useState(false);
    const [viewingDoc, setViewingDoc] = useState<CaseDocument | null>(null);
    const [isEditingDesc, setIsEditingDesc] = useState(false);

    const isTrafficAccident = task.caseType === 'traffic_accident';

    const evidenceDocs = task.documents?.filter(d => d.category === 'Evidence') || [];

    const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            const response = await uploadCaseEvidence(task.id, formData);
            if (response.success && response.data) onTaskChange(response.data);
        } catch {
            alert(t.evidenceUploadFailed);
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleExtractPartiesFromEvidence = async () => {
        try {
            setIsExtractingParties(true);
            const res = await api.post<{
                success: boolean; parties: any[]; caseFactsNarrative: string; caseType: string; caseData: any;
            }>(`/cases/${task.id}/extract-parties`, {});
            if (res.success && res.caseData) {
                onTaskChange({
                    ...task,
                    parties: res.caseData.parties,
                    ...(res.caseData.caseType ? { caseType: res.caseData.caseType } : {}),
                    ...(res.caseData.description ? { description: res.caseData.description } : {}),
                });
            }
        } catch {
            alert(t.partiesExtractionFailed);
        } finally {
            setIsExtractingParties(false);
        }
    };

    const handleExtractInvoices = async () => {
        try {
            setIsExtractingInvoices(true);
            const res = await api.post<{ success: boolean; invoices: InvoiceItem[]; total: number }>(
                `/cases/${task.id}/extract-invoices`, {}
            );
            if (res.success) {
                // Merge returned invoices into local task state via caseFactSheet JSON
                const existing = task.caseFactSheet ? JSON.parse(task.caseFactSheet) : {};
                onTaskChange({
                    ...task,
                    caseFactSheet: JSON.stringify({ ...existing, invoices: res.invoices })
                });
            }
        } catch (err: any) {
            alert(err?.message || '提取发票清单失败，请稍后重试。');
        } finally {
            setIsExtractingInvoices(false);
        }
    };

    const handleDownload = (doc: CaseDocument) => {
        const baseName = doc.title.replace(/\.[^.]+$/, '');
        const blob = new Blob([doc.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseName}（提取文字）.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    let partiesArray: any[] = [];
    try {
        partiesArray = typeof task.parties === 'string'
            ? JSON.parse(task.parties)
            : (Array.isArray(task.parties) ? task.parties : []);
    } catch { partiesArray = []; }

    // Parse invoices from caseFactSheet
    let invoices: InvoiceItem[] = [];
    try {
        if (task.caseFactSheet) {
            const sheet = JSON.parse(task.caseFactSheet);
            invoices = Array.isArray(sheet.invoices) ? sheet.invoices : [];
        }
    } catch { invoices = []; }
    const invoiceTotal = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    return (
        <>
            {viewingDoc && <DocViewer doc={viewingDoc} theme={theme} onClose={() => setViewingDoc(null)} />}

            <div className={`flex h-full w-full overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>

                {/* ── 左栏：原始证据材料 ─────────────────────────────── */}
                <div className={`w-[38%] flex flex-col border-r shrink-0 ${isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                    {/* Header */}
                    <div className={`px-5 py-4 border-b flex justify-between items-center ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        <div>
                            <h3 className="font-bold flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 p-1 rounded-lg"><Database size={15} /></span>
                                <span className="text-sm">{t.rawEvidence}</span>
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">{t.uploadClientMaterials}</p>
                        </div>
                        <div className="relative shrink-0">
                            <input type="file" accept=".pdf,.doc,.docx"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleUploadEvidence}
                                disabled={isUploading || isExtractingParties} />
                            <button disabled={isUploading}
                                className={`px-3 py-1.5 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors
                                    ${isUploading ? 'bg-slate-200 text-slate-400 dark:bg-slate-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                {isUploading ? <Loader size={13} className="animate-spin" /> : <Plus size={13} />}
                                {t.importFile}
                            </button>
                        </div>
                    </div>

                    {/* File list */}
                    <div className="p-3 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
                        {evidenceDocs.map(doc => (
                            <div key={doc.id}
                                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all group
                                    ${isDark ? 'bg-slate-800/50 border-white/5 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-white hover:shadow-sm'}`}>
                                <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg shrink-0">
                                    <FileText size={15} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{doc.title}</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">{doc.content.length.toLocaleString()} 字符</p>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                    <button onClick={() => setViewingDoc(doc)} title="查看提取内容"
                                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-blue-500/20 text-blue-400' : 'hover:bg-blue-100 text-blue-500'}`}>
                                        <Eye size={13} />
                                    </button>
                                    <button onClick={() => handleDownload(doc)} title="下载 .txt"
                                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
                                        <Download size={13} />
                                    </button>
                                    <button onClick={() => onDeleteDocument(doc.id)} title="删除"
                                        className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {evidenceDocs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 opacity-50 py-12">
                                <Database size={36} />
                                <p className="text-xs font-medium">{t.noRawEvidence}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── 右栏：当事人 + 事实叙述 ───────────────────────── */}
                <div className={`flex-1 flex flex-col overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>

                    {/* Section header: 当事人 */}
                    <div className={`px-5 py-4 border-b flex justify-between items-center shrink-0 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                        <div>
                            <h3 className="font-bold flex items-center gap-2">
                                <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 p-1 rounded-lg"><Users size={15} /></span>
                                <span className="text-sm">{t.extractedDetails}</span>
                            </h3>
                            <p className="text-[11px] text-slate-500 mt-0.5">{t.autoExtracted}</p>
                        </div>
                        <button onClick={handleExtractPartiesFromEvidence}
                            disabled={isExtractingParties || isUploading || isExtractingInvoices}
                            className={`px-3 py-1.5 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shrink-0
                                ${isExtractingParties
                                    ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
                                    : (isDark ? 'bg-purple-900/40 text-purple-300 hover:bg-purple-900/60 border border-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-200 hover:bg-purple-200')}`}>
                            {isExtractingParties ? <Loader size={13} className="animate-spin" /> : <Scan size={13} />}
                            {t.rescanEvidenceBtn}
                        </button>
                        {isTrafficAccident && (
                            <button onClick={handleExtractInvoices}
                                disabled={isExtractingInvoices || isExtractingParties || isUploading}
                                className={`px-3 py-1.5 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors shrink-0
                                    ${isExtractingInvoices
                                        ? 'bg-slate-200 text-slate-400 dark:bg-slate-800 cursor-not-allowed'
                                        : (isDark ? 'bg-amber-900/40 text-amber-300 hover:bg-amber-900/60 border border-amber-500/30' : 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100')}`}>
                                {isExtractingInvoices ? <Loader size={13} className="animate-spin" /> : <Receipt size={13} />}
                                提取发票清单
                            </button>
                        )}
                    </div>

                    {/* ── 当事人卡片区（固定，自动收缩滚动）──────────── */}
                    <div className="shrink-0 max-h-[220px] overflow-y-auto custom-scrollbar pb-2">
                        <div className="p-4 pb-0">
                            {partiesArray.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {partiesArray.map((party, idx) => (
                                        <PartyCard key={idx} party={party} theme={theme} t={t} />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-slate-400 space-y-3 opacity-60 py-10">
                                    <Wand2 size={36} />
                                    <div className="text-center">
                                        <p className="font-medium text-sm">{t.noStructuredData}</p>
                                        <p className="text-xs mt-1">{t.uploadEvidenceToExtract}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── 发票清单（仅 traffic_accident 且有数据时显示）── */}
                    {isTrafficAccident && invoices.length > 0 && (
                        <div className={`mx-4 my-2 rounded-xl border overflow-hidden shrink-0
                            ${isDark ? 'border-white/10 bg-slate-800/60' : 'border-amber-200 bg-amber-50/50'}`}>
                            {/* Header */}
                            <div className={`px-4 py-2.5 flex items-center justify-between border-b
                                ${isDark ? 'border-white/10 bg-slate-800/80' : 'border-amber-200 bg-amber-50'}`}>
                                <div className="flex items-center gap-1.5">
                                    <Receipt size={13} className="text-amber-600 dark:text-amber-400" />
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">发票费用清单</span>
                                    <span className="text-[10px] text-slate-500 ml-1">共 {invoices.length} 张</span>
                                </div>
                                <span className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                                    合计：¥ {invoiceTotal.toFixed(2)}
                                </span>
                            </div>
                            {/* Table */}
                            <div className="overflow-x-auto max-h-48 overflow-y-auto custom-scrollbar">
                                <table className="w-full text-[11px]">
                                    <thead>
                                        <tr className={`${isDark ? 'bg-slate-900/50 text-slate-400' : 'bg-amber-100/60 text-slate-500'}`}>
                                            <th className="text-left px-3 py-1.5 font-semibold">日期</th>
                                            <th className="text-left px-3 py-1.5 font-semibold">类别</th>
                                            <th className="text-left px-3 py-1.5 font-semibold">摘要</th>
                                            <th className="text-left px-3 py-1.5 font-semibold">票据号</th>
                                            <th className="text-right px-3 py-1.5 font-semibold">金额（元）</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map((inv, idx) => (
                                            <tr key={idx} className={`border-t transition-colors
                                                ${isDark ? 'border-white/5 hover:bg-slate-700/40 text-slate-300' : 'border-amber-100 hover:bg-amber-50 text-slate-700'}`}>
                                                <td className="px-3 py-1.5 whitespace-nowrap">{inv.date || '—'}</td>
                                                <td className="px-3 py-1.5">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold
                                                        ${isDark ? 'bg-amber-900/40 text-amber-300' : 'bg-amber-100 text-amber-700'}`}>
                                                        {inv.category || '其他'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 max-w-[180px] truncate">{inv.description || '—'}</td>
                                                <td className="px-3 py-1.5 font-mono text-slate-400">{inv.invoiceNo || '—'}</td>
                                                <td className="px-3 py-1.5 text-right font-mono font-bold">
                                                    {inv.amount > 0 ? inv.amount.toFixed(2) : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className={`border-t font-bold
                                            ${isDark ? 'border-amber-500/30 bg-slate-900/50 text-amber-300' : 'border-amber-300 bg-amber-100/80 text-amber-800'}`}>
                                            <td className="px-3 py-2" colSpan={4}>合计</td>
                                            <td className="px-3 py-2 text-right font-mono">¥ {invoiceTotal.toFixed(2)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── 案件描述与策略（填满剩余高度）──────────────── */}
                    <div className={`flex-1 flex flex-col min-h-0 mx-4 mb-4 rounded-2xl border shadow-sm overflow-hidden
                        ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-white border-slate-200'}`}>
                        {/* Sub-header */}
                        <div className={`px-5 py-3 flex items-center justify-between border-b shrink-0
                            ${isDark ? 'border-white/10 bg-slate-800/80' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="flex items-center gap-2">
                                <AlignLeft size={14} className="text-indigo-500" />
                                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                                    {t.description}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsEditingDesc(v => !v)}
                                className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-all
                                    ${isEditingDesc
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : (isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50')}`}
                            >
                                {isEditingDesc ? <><Check size={12} /> {t.doneEditing}</> : <><Edit2 size={12} /> {t.editDesc}</>}
                            </button>
                        </div>

                        {/* Content — fills all remaining height */}
                        {isEditingDesc ? (
                            <div className="flex-1 overflow-hidden" data-color-mode={isDark ? 'dark' : 'light'}>
                                <MDEditor
                                    value={task.description || ''}
                                    onChange={(val) => onTaskChange({ ...task, description: val || '' })}
                                    preview="edit"
                                    height="100%"
                                    hideToolbar={false}
                                    visibleDragbar={false}
                                    style={{ border: 'none', borderRadius: 0, height: '100%' }}
                                />
                            </div>
                        ) : (
                            <div className={`flex-1 p-5 overflow-y-auto custom-scrollbar
                                ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                {task.description ? (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h1: ({ node, ...props }) => <h1 className="text-lg font-bold mb-3 mt-4" {...props} />,
                                            h2: ({ node, ...props }) => <h2 className="text-base font-bold mb-2 mt-3" {...props} />,
                                            h3: ({ node, ...props }) => <h3 className="text-sm font-bold mb-2 mt-2" {...props} />,
                                            p: ({ node, ...props }) => <p className="mb-3 text-sm leading-relaxed" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 text-sm space-y-1" {...props} />,
                                            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 text-sm space-y-1" {...props} />,
                                            li: ({ node, ...props }) => <li {...props} />,
                                            strong: ({ node, ...props }) => <strong className="font-bold text-indigo-600 dark:text-indigo-400" {...props} />,
                                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-indigo-400 pl-4 italic my-3 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 py-2 rounded-r" {...props} />,
                                        }}
                                    >
                                        {task.description}
                                    </ReactMarkdown>
                                ) : (
                                    <p className="text-sm italic text-slate-400 text-center py-8">{t.noDesc}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
