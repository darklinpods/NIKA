import React, { useState } from 'react';
import { Case, CaseDocument, DocumentCategory } from '../../types';
import { generateCaseDocument } from '../../services/geminiService';
import { api } from '../../services/api';
import { FileText, Plus, Trash2, Loader2, Download, FileSignature, Calculator } from 'lucide-react';
import { ClaimListGenerator } from '../claimList/ClaimListGenerator';

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
    const [isSmartGenerating, setIsSmartGenerating] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<CaseDocument | null>(null);
    const [showClaimGenerator, setShowClaimGenerator] = useState(false);

    const handleGenerateValues = async (category: 'analysis' | 'strategy' | 'offical_doc' | 'evidence_list') => {
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

    const handleSmartDocxGenerate = async () => {
        setIsSmartGenerating(true);
        try {
            // 1. Get Requirements
            const reqResponse = await api.get<{ fields: string[] }>('/templates/traffic_accident_complaint.txt/requirements');
            const requiredFields = reqResponse.fields;

            // 2. Extract Data using AI
            const caseContext = `Title: ${task.title}\nDescription: ${task.description}\nParties: ${task.parties || ''}`;
            const extResponse = await api.post<{ extractedData: Record<string, any> }>('/templates/extract-data', {
                caseDetails: caseContext,
                requiredFields
            });

            const extractedData = extResponse.extractedData || {};

            // In a real flow, we would pop up a Modal here to let the user confirm/edit 
            // the extractedData before proceeding. For now, we auto-fill missing fields 
            // with brackets and boldly proceed.
            const finalData: Record<string, any> = {};
            requiredFields.forEach(field => {
                finalData[field] = extractedData[field] || `[待确认 ${field}]`;
            });

            // 3. Generate Doc
            const genResponse = await api.post<{ filePath: string, message: string }>('/templates/generate', {
                templateName: 'traffic_accident_complaint.txt',
                data: finalData
            });

            // Add a dummy entry to the Document List just to show it worked
            const newDoc: CaseDocument = {
                id: `docx-${Date.now()}`,
                title: lang === 'zh' ? '要素式起诉状 (Docx)' : 'Complaint (Docx)',
                content: `Document successfully generated on Server at:\n${genResponse.filePath}\n\n(In full version, this will download the actual .docx file)`,
                category: 'offical_doc',
                createdAt: new Date().toISOString(),
            };
            onAddDocument(newDoc);

        } catch (error) {
            console.error('Failed smart docx generation:', error);
            alert(lang === 'zh' ? '生成失败，请查看控制台日志' : 'Generation failed. Check console.');
        } finally {
            setIsSmartGenerating(false);
        }
    };

    const getDocTitle = (category: DocumentCategory, lang: 'zh' | 'en') => {
        const titles: Record<DocumentCategory, { zh: string; en: string }> = {
            analysis: { zh: '案件分析报告', en: 'Case Analysis Report' },
            strategy: { zh: '诉讼策略建议', en: 'Litigation Strategy' },
            evidence_list: { zh: '证据清单', en: 'Evidence List' },
            input: { zh: '输入', en: 'Input' },
            offical_doc: { zh: '正式文书', en: 'Official Document' },
            Evidence: { zh: '原文证据', en: 'Original Evidence' }
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
                <div className="flex gap-2 flex-wrap justify-end">
                    <button
                        onClick={() => handleGenerateValues('analysis')}
                        disabled={isGenerating || isSmartGenerating}
                        className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${theme === 'dark' ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
                    >
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        {lang === 'zh' ? "分析" : "Analysis"}
                    </button>
                    <button
                        onClick={() => handleGenerateValues('strategy')}
                        disabled={isGenerating || isSmartGenerating}
                        className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${theme === 'dark' ? 'bg-purple-500/20 text-purple-400 hover:bg-purple-500/30' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                    >
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        {lang === 'zh' ? "策略" : "Strategy"}
                    </button>
                    {/* NEW SMART DOCX BUTTON - Only for traffic accident cases as requested */}
                    {task.caseType === 'traffic_accident' && (
                        <button
                            onClick={handleSmartDocxGenerate}
                            disabled={isGenerating || isSmartGenerating}
                            className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${theme === 'dark' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                            title={lang === 'zh' ? "基于文书模板引导生成并打包下载" : "Guided template generation"}
                        >
                            {isSmartGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSignature className="w-3 h-3" />}
                            {lang === 'zh' ? "模板文书生成" : "Template Gen"}
                        </button>
                    )}
                    {/* SKILL BUTTON — only for traffic accident cases */}
                    {task.caseType === 'traffic_accident' && (
                        <button
                            onClick={() => setShowClaimGenerator(true)}
                            className={`p-1.5 rounded-lg transition-colors text-xs flex items-center gap-1 ${theme === 'dark' ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                            title={lang === 'zh' ? "交通事故诉状生成 Skill" : "Skill: Traffic Accident Complaint"}
                        >
                            <Calculator className="w-3 h-3" />
                            {lang === 'zh' ? "交通事故诉状生成 (Skill)" : "Skill (Traffic Accident)"}
                        </button>
                    )}
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

            {showClaimGenerator && (
                <ClaimListGenerator
                    task={task}
                    theme={theme}
                    lang={lang}
                    onClose={() => setShowClaimGenerator(false)}
                />
            )}
        </div>
    );
};
