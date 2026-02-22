import React, { useState } from 'react';
import { Case, CaseDocument, DocumentCategory } from '../../types';
import { generateCaseDocument } from '../../services/geminiService';
import { FileText, Plus, Trash2, Loader2, Download } from 'lucide-react';

interface TaskModalDocumentsPanelProps {
    task: Case;
    theme: 'light' | 'dark';
    lang: 'zh' | 'en';
    onAddDocument: (doc: CaseDocument) => void;
    onDeleteDocument: (docId: string) => void;
}

export const TaskModalDocumentsPanel: React.FC<TaskModalDocumentsPanelProps> = ({
    task,
    theme,
    lang,
    onAddDocument,
    onDeleteDocument,
}) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<CaseDocument | null>(null);

    const handleGenerateValues = async (category: DocumentCategory) => {
        setIsGenerating(true);
        try {
            const content = await generateCaseDocument(category, task.title, task.description, lang);
            const newDoc: CaseDocument = {
                id: `doc-${Date.now()}`,
                title: getDocTitle(category, lang),
                content: content,
                category: category,
                createdAt: new Date().toISOString(),
            };
            onAddDocument(newDoc);
        } catch (error) {
            console.error('Failed to generate document:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const getDocTitle = (category: DocumentCategory, lang: 'zh' | 'en') => {
        const titles: Record<DocumentCategory, { zh: string; en: string }> = {
            analysis: { zh: '案件分析报告', en: 'Case Analysis Report' },
            strategy: { zh: '诉讼策略建议', en: 'Litigation Strategy' },
            evidence_list: { zh: '证据清单', en: 'Evidence List' },
            input: { zh: '输入', en: 'Input' },
            offical_doc: { zh: '正式文书', en: 'Official Document' }
        };
        return titles[category]?.[lang] || 'New Document';
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
        <div className="flex-1 p-8 flex flex-col h-full overflow-hidden">
            <div className={`pb-6 border-b ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'} flex justify-between items-center`}>
                <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                    {lang === 'zh' ? '案件文书' : 'Case Documents'}
                </h3>
                <div className="flex gap-2">
                    {/* Generate Buttons Dropdown or Group */}
                    <div className="flex gap-1">
                        <button
                            onClick={() => handleGenerateValues('analysis')}
                            disabled={isGenerating}
                            className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                            title={lang === 'zh' ? "生成案件分析" : "Generate Analysis"}
                        >
                            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            {lang === 'zh' ? "分析" : "Analysis"}
                        </button>
                        <button
                            onClick={() => handleGenerateValues('strategy')}
                            disabled={isGenerating}
                            className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                            title={lang === 'zh' ? "生成诉讼策略" : "Generate Strategy"}
                        >
                            {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            {lang === 'zh' ? "策略" : "Strategy"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-6 space-y-4">
                {task.documents?.map((doc) => (
                    <div
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedDoc?.id === doc.id
                            ? (theme === 'dark' ? 'bg-blue-500/20 border-blue-500/50' : 'bg-blue-50 border-blue-200')
                            : (theme === 'dark' ? 'bg-slate-800/50 border-white/5 hover:bg-slate-800' : 'bg-white border-slate-200 hover:border-blue-300')
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                    <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                                        {doc.title}
                                    </h4>
                                    <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                        {new Date(doc.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                                    className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}
                                >
                                    <Download className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }}
                                    className={`p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${theme === 'dark' ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-500'}`}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {(!task.documents || task.documents.length === 0) && (
                    <div className={`text-center py-8 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                        <p>{lang === 'zh' ? '暂无文书' : 'No documents yet'}</p>
                        <p className="text-xs mt-1">{lang === 'zh' ? '点击上方按钮生成' : 'Click buttons above to generate'}</p>
                    </div>
                )}
            </div>

            {/* Document Content Preview (Simple) */}
            {selectedDoc && (
                <div className={`absolute inset-0 z-20 flex items-center justify-center p-8 bg-black/50 backdrop-blur-sm`}>
                    <div className={`w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                        <div className={`p-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                            <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{selectedDoc.title}</h3>
                            <button onClick={() => setSelectedDoc(null)} className="text-slate-500 hover:text-slate-700">Close</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 whitespace-pre-wrap font-mono text-sm">
                            {selectedDoc.content}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
