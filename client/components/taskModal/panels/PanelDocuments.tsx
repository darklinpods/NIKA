import React, { useState, useRef } from 'react';
import { Package, Download, CheckSquare, Settings2, FileOutput, Plus, Loader2, FileSignature, Calculator, FileText, Trash2, ClipboardList, Pencil } from 'lucide-react';
import { getChecklist } from '../../../constants/printChecklist';
import { TaskModalSubTasksPanel } from '../TaskModalSubTasksPanel';
import { ClaimListGenerator } from '../../claimList/ClaimListGenerator';
import { generateCaseDocument } from '../../../services/geminiService';
import { api } from '../../../services/api';
import { Case, CaseDocument, DocumentCategory } from '../../../types';
import { t } from '../../../translations';

interface PanelDocumentsProps {
    task: Case;
    theme: 'light' | 'dark';
    onToggleSubTask: (subTaskId: string) => void;
    onUpdateSubTaskTitle: (subTaskId: string, newTitle: string) => void;
    onUpdateSubTaskDate: (subTaskId: string, newDate: string) => void;
    onDeleteSubTask: (subTaskId: string) => void;
    onAddSubTask: () => void;
    onAddDocument: (doc: CaseDocument) => void;
    onDeleteDocument: (docId: string) => void;
    onRenameDocument: (docId: string, newTitle: string) => void;
}

export const PanelDocuments: React.FC<PanelDocumentsProps> = ({
    task,
    theme,
    onToggleSubTask,
    onUpdateSubTaskTitle,
    onUpdateSubTaskDate,
    onDeleteSubTask,
    onAddSubTask,
    onAddDocument,
    onDeleteDocument,
    onRenameDocument
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSmartGenerating, setIsSmartGenerating] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<CaseDocument | null>(null);
    const [showClaimGenerator, setShowClaimGenerator] = useState(false);
    const [editingDocId, setEditingDocId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const editInputRef = useRef<HTMLInputElement>(null);

    // Filter to only show generated/official documents, NOT raw evidence
    const generatedDocs = task.documents?.filter(d => d.category !== 'Evidence') || [];

    const handleGenerateValues = async (category: 'analysis' | 'strategy' | 'offical_doc' | 'evidence_list') => {
        setIsGenerating(true);
        try {
            const content = await generateCaseDocument(category, task.title, task.description);
            const titles: Record<string, string> = {
                analysis: '案件分析报告',
                strategy: '诉讼策略建议',
                evidence_list: '证据目录',
                offical_doc: '正式文书'
            };

            const newDoc: CaseDocument = {
                id: `doc-${Date.now()}`,
                title: titles[category] || '新文书',
                content: content,
                category: category,
                createdAt: new Date().toISOString(),
            };
            onAddDocument(newDoc);
        } catch (error) {
            console.error('Failed to generate document:', error);
            alert(t.genDocFailed);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSmartDocxGenerate = async () => {
        setIsSmartGenerating(true);
        try {
            const reqResponse = await api.get<{ fields: string[] }>('/templates/traffic_accident_complaint.txt/requirements');
            const requiredFields = reqResponse.fields;

            const caseContext = `Title: ${task.title}\nDescription: ${task.description}\nParties: ${task.parties || ''}`;
            const extResponse = await api.post<{ extractedData: Record<string, any> }>('/templates/extract-data', {
                caseDetails: caseContext,
                requiredFields
            });

            const extractedData = extResponse.extractedData || {};

            const finalData: Record<string, any> = {};
            requiredFields.forEach(field => {
                finalData[field] = extractedData[field] || `[待确认 ${field}]`;
            });

            const genResponse = await api.post<{ filePath: string, message: string }>('/templates/generate', {
                templateName: 'traffic_accident_complaint.txt',
                data: finalData
            });

            const newDoc: CaseDocument = {
                id: `docx-${Date.now()}`,
                title: t.trafficDocx,
                content: t.docxGeneratedSuccess.replace('{path}', genResponse.filePath),
                category: 'offical_doc',
                createdAt: new Date().toISOString(),
            };
            onAddDocument(newDoc);
        } catch (error) {
            console.error('Failed smart docx generation:', error);
            alert(t.genDocFailedDetail);
        } finally {
            setIsSmartGenerating(false);
        }
    };

    const handleRenameStart = (e: React.MouseEvent, doc: CaseDocument) => {
        e.stopPropagation();
        setEditingDocId(doc.id);
        setEditingTitle(doc.title);
        setTimeout(() => editInputRef.current?.select(), 0);
    };

    const handleRenameCommit = (docId: string) => {
        if (editingTitle.trim()) onRenameDocument(docId, editingTitle.trim());
        setEditingDocId(null);
    };

    const handleDownload = (doc: CaseDocument) => {
        const blob = new Blob([doc.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title}-${doc.id}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            {/* 上半部分：流程与生成控制台 */}
            <div className={`flex-shrink-0 flex border-b h-[45%] ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                <div className={`w-[45%] flex flex-col border-r ${theme === 'dark' ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-white'}`}>
                    <div className="p-4 border-b dark:border-white/10 border-slate-200">
                        <h3 className="font-bold flex items-center gap-2 text-lg">
                            <span className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 p-1.5 rounded-lg"><CheckSquare size={18} /></span>
                            {t.workflowTasks}
                        </h3>
                    </div>
                    <div className="flex-1 overflow-hidden relative pb-4">
                        <TaskModalSubTasksPanel
                            task={task}
                            theme={theme}
                            onToggleSubTask={onToggleSubTask}
                            onUpdateSubTaskTitle={onUpdateSubTaskTitle}
                            onUpdateSubTaskDate={onUpdateSubTaskDate}
                            onDeleteSubTask={onDeleteSubTask}
                            onAddSubTask={onAddSubTask}
                        />
                    </div>
                </div>
                <div className={`flex-1 p-6 ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
                    <h3 className="font-bold flex items-center gap-2 mb-4 text-lg">
                        <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 p-1.5 rounded-lg"><Settings2 size={18} /></span>
                        {t.docGenerator}
                    </h3>
                    <p className="text-sm text-slate-500 mb-6">{t.docGeneratorDesc}</p>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => handleGenerateValues('offical_doc')}
                            disabled={isGenerating}
                            className={`p-4 text-sm font-bold flex flex-col gap-2 rounded-xl border-2 transition-all shadow-sm ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                                } ${theme === 'dark' ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 text-slate-700'}`}
                        >
                            <span className="flex items-center gap-2">📄 {t.complaintDraft}</span>
                            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{t.complaintDraftDesc}</span>
                        </button>

                        <button
                            onClick={() => handleGenerateValues('evidence_list')}
                            disabled={isGenerating}
                            className={`p-4 text-sm font-bold flex flex-col gap-2 rounded-xl border-2 transition-all shadow-sm ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''
                                } ${theme === 'dark' ? 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200' : 'border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-300 text-slate-700'}`}
                        >
                            <span className="flex items-center gap-2">📊 {t.evidenceList}</span>
                            <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{t.evidenceListDesc}</span>
                        </button>

                        {task.caseType === 'traffic_accident' && (
                            <>
                                <button
                                    onClick={handleSmartDocxGenerate}
                                    disabled={isSmartGenerating}
                                    className={`p-4 text-sm font-bold flex flex-col gap-2 rounded-xl border-2 transition-all shadow-sm ${isSmartGenerating ? 'opacity-50 cursor-not-allowed' : ''
                                        } ${theme === 'dark' ? 'border-indigo-500/30 bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-300' : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700'}`}
                                >
                                    <span className="flex items-center gap-2">
                                        {isSmartGenerating ? <Loader2 size={16} className="animate-spin" /> : <FileSignature size={16} />}
                                        {t.trafficDocx}
                                    </span>
                                    <span className="text-xs font-normal opacity-80">{t.trafficDocxDesc}</span>
                                </button>

                                <button
                                    onClick={() => setShowClaimGenerator(true)}
                                    className={`p-4 text-sm font-bold flex flex-col gap-2 rounded-xl border-2 transition-all shadow-sm ${theme === 'dark' ? 'border-indigo-500/30 bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-300' : 'border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700'}`}
                                >
                                    <span className="flex items-center gap-2"><Calculator size={16} /> {t.compCalc}</span>
                                    <span className="text-xs font-normal opacity-80">{t.compCalcDesc}</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* 下半部分：生成的文件柜 */}
            <div className={`flex-1 p-8 flex flex-col ${theme === 'dark' ? 'bg-slate-900/80' : 'bg-slate-100/50'}`}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 p-1.5 rounded-lg"><FileOutput size={20} /></span>
                            {t.finalVault}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1">{t.finalVaultDesc}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                const checklist = getChecklist(task.caseType || 'general');
                                const rows = checklist.items.map(item =>
                                    `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-size:14px;">${item.required ? '★' : '☆'}</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:14px;">${item.label}</td><td style="padding:8px 12px;border:1px solid #ddd;width:80px;"></td></tr>`
                                ).join('');
                                const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${checklist.title}</title><style>body{font-family:sans-serif;padding:32px}h2{margin-bottom:8px}p{color:#666;font-size:13px;margin-bottom:16px}table{border-collapse:collapse;width:100%}th{background:#f5f5f5;padding:8px 12px;border:1px solid #ddd;text-align:left;font-size:13px}@media print{button{display:none}}</style></head><body><h2>${checklist.title}</h2><p>案件：${task.title} &nbsp;|&nbsp; 打印日期：${new Date().toLocaleDateString('zh-CN')}</p><table><thead><tr><th style="width:40px">必须</th><th>材料名称</th><th>已备妥 ✓</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
                                const w = window.open('', '_blank');
                                if (w) { w.document.write(html); w.document.close(); w.print(); }
                            }}
                            className={`px-4 py-2.5 font-bold text-sm rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-sm ${theme === 'dark' ? 'bg-amber-600/80 text-white hover:bg-amber-600' : 'bg-amber-500 text-white hover:bg-amber-600'}`}
                        >
                            <ClipboardList size={16} /> 打印材料清单
                        </button>
                        {generatedDocs.length > 0 && (
                            <button className="px-6 py-2.5 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-bold text-sm rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg">
                                <Package size={18} /> {t.bundleDossier}
                            </button>
                        )}
                    </div>
                </div>

                {generatedDocs.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar pb-4 pr-2">
                        {generatedDocs.map((doc) => (
                            <div
                                key={doc.id}
                                onClick={() => setSelectedDoc(doc)}
                                className={`p-4 rounded-xl border cursor-pointer hover:-translate-y-1 transition-all group shadow-sm ${theme === 'dark' ? 'bg-slate-800/80 border-white/5 hover:border-blue-500/50' : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => handleRenameStart(e, doc)}
                                            className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                            title="重命名"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                                            className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                            title="Download Markdown"
                                        >
                                            <Download size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }}
                                            className={`p-1.5 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                                            title="Delete Document"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                                {editingDocId === doc.id ? (
                                    <input
                                        ref={editInputRef}
                                        value={editingTitle}
                                        onChange={e => setEditingTitle(e.target.value)}
                                        onBlur={() => handleRenameCommit(doc.id)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleRenameCommit(doc.id); if (e.key === 'Escape') setEditingDocId(null); }}
                                        onClick={e => e.stopPropagation()}
                                        className={`text-sm font-bold mb-1 w-full rounded px-1 outline-none border ${theme === 'dark' ? 'bg-slate-700 border-blue-500 text-slate-200' : 'bg-slate-100 border-blue-400 text-slate-700'}`}
                                        autoFocus
                                    />
                                ) : (
                                    <h4 className={`text-sm font-bold mb-1 line-clamp-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                        {doc.title}
                                    </h4>
                                )}
                                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {new Date(doc.createdAt).toLocaleString()}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 h-full shadow-inner">
                        <Download size={40} className="mb-4 text-slate-300 dark:text-slate-600" />
                        <p className="font-bold text-lg mb-1">{t.noGenDoc}</p>
                        <p className="text-sm">{t.generateDocHint}</p>
                    </div>
                )}
            </div>

            {/* Document Content Preview (Simple Modal) */}
            {selectedDoc && (
                <div className={`absolute inset-0 z-50 flex items-center justify-center p-8 bg-slate-900/60 backdrop-blur-sm`}>
                    <div className={`w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-slate-900 border border-white/10' : 'bg-white'}`}>
                        <div className={`p-5 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-2xl ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                            <h3 className={`font-bold text-lg flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                <FileText size={20} className="text-blue-500" />
                                {selectedDoc.title}
                            </h3>
                            <div className="flex items-center gap-3">
                                <button onClick={() => handleDownload(selectedDoc)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 rounded-lg text-sm font-bold transition-colors">
                                    <Download size={14} /> Download
                                </button>
                                <button onClick={() => setSelectedDoc(null)} className="px-3 py-1.5 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                                    Close
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-700 dark:text-slate-300 custom-scrollbar">
                            {selectedDoc.content}
                        </div>
                    </div>
                </div>
            )}

            {showClaimGenerator && (
                <ClaimListGenerator
                    task={task}
                    theme={theme}
                    onClose={() => setShowClaimGenerator(false)}
                />
            )}
        </div>
    );
};
