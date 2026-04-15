import React, { useState, useRef } from 'react';
import { Case, CaseDocument } from '../types';
import { CaseChatPanel, CaseChatPanelHandle } from './taskModal/CaseChatPanel';
import { LoadingOverlay } from './LoadingOverlay';
import { t } from '../translations';
import { ClaimListGenerator } from './claimList/ClaimListGenerator';
import { uploadCaseEvidence } from '../services/api';
import { PanelCaseFacts } from './taskModal/panels/PanelCaseFacts';
import { PanelEvidence } from './taskModal/panels/PanelEvidence';
import {
    X, FileText, Plus, Download, Trash2,
    Loader, Share2, FileOutput, Calculator,
    FileSignature, Clock, Sparkles, Settings, ClipboardList, FolderSearch
} from 'lucide-react';
import { CASE_TYPES } from '../constants/caseTypes';
import { getChecklist } from '../constants/printChecklist';

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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
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
                    提示：这是从原始文件中 OCR 提取的文字内容，不是原始 PDF/Word 文件。
                </div>
            </div>
        </div>
    );
};

// ─── Generated Doc Viewer Modal ───────────────────────────────────────────────
const GeneratedDocViewer: React.FC<{ doc: CaseDocument; theme: 'light' | 'dark'; onClose: () => void; onDelete: () => void }> = ({ doc, theme, onClose, onDelete }) => {
    const isDark = theme === 'dark';
    const handleDownload = () => {
        const blob = new Blob([doc.content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.title}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm"
            onClick={onClose}>
            <div className={`w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col relative z-50 ${isDark ? 'bg-slate-900 border border-white/10' : 'bg-white'}`}
                onClick={e => e.stopPropagation()}>
                <div className={`p-5 border-b flex justify-between items-center ${isDark ? 'border-white/10 bg-slate-800/60' : 'border-slate-200 bg-slate-50'} rounded-t-2xl`}>
                    <h3 className={`font-bold text-lg flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <FileText size={20} className="text-blue-500" />
                        {doc.title}
                    </h3>
                    <div className="flex items-center gap-2">
                        <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 rounded-lg text-sm font-bold transition-colors">
                            <Download size={14} /> 下载
                        </button>
                        <button onClick={() => { onDelete(); onClose(); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 rounded-lg text-sm font-bold transition-colors">
                            <Trash2 size={14} /> 删除
                        </button>
                        <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                            关闭
                        </button>
                    </div>
                </div>
                <div className={`flex-1 overflow-y-auto p-8 whitespace-pre-wrap font-mono text-sm leading-relaxed custom-scrollbar ${isDark ? 'text-slate-300 bg-slate-900' : 'text-slate-700 bg-white'}`}>
                    {doc.content}
                </div>
            </div>
        </div>
    );
};

// ─── Quick Action Button ──────────────────────────────────────────────────────
const QUICK_ACTIONS = [
    { icon: 'FileSignature', label: '生成起诉状', prompt: '请帮我起草一份起诉状草稿，要求结构完整，包含原被告信息、诉讼请求、事实与理由等部分。' },
    { icon: 'AlignLeft', label: '证据清单', prompt: '基于当前案件的证据材料，请帮我生成一份证据目录。' },
    { icon: 'Sparkles', label: '法律意见书', prompt: '请基于案件事实，出具一份专业的法律意见书。' },
    { icon: 'Clock', label: '案情时间轴', prompt: '请梳理本案的事件时间轴，按时间顺序列出关键节点。' },
];

const QuickActionBtn: React.FC<{ icon: React.ReactNode; label: string; theme: 'light' | 'dark'; onClick?: () => void }> = ({ icon, label, theme, onClick }) => (
    <button onClick={onClick}
        className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border text-xs font-medium transition-all hover:-translate-y-0.5
            ${theme === 'dark' ? 'bg-slate-800/60 border-white/10 text-slate-300 hover:border-blue-500/50 hover:bg-slate-800' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400 hover:shadow-sm'}`}>
        <span className="text-blue-500">{icon}</span>
        {label}
    </button>
);

// ─── Category label map ───────────────────────────────────────────────────────
const DOC_CATEGORY_LABEL: Record<string, string> = {
    offical_doc: 'DOCUMENT',
    analysis: 'ANALYSIS',
    strategy: 'STRATEGY',
    evidence_list: 'EVIDENCE LIST',
};

interface TaskModalProps {
    task: Case;
    theme: 'light' | 'dark';
    isSaving: boolean;
    onTaskChange: (task: Case) => void;
    onToggleSubTask: (subTaskId: string) => void;
    onUpdateSubTaskTitle: (subTaskId: string, newTitle: string) => void;
    onUpdateSubTaskDate: (subTaskId: string, newDate: string) => void;
    onDeleteSubTask: (subTaskId: string) => void;
    onAddSubTask: () => void;
    onAddDocument: (doc: any) => void;
    onDeleteDocument: (docId: string) => void;
    onRenameDocument: (docId: string, newTitle: string) => void;
    onRefreshCase: () => void;
    onSave: () => void;
    onClose: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
    task,
    theme,
    isSaving,
    onTaskChange,
    onToggleSubTask,
    onUpdateSubTaskTitle,
    onUpdateSubTaskDate,
    onDeleteSubTask,
    onAddSubTask,
    onAddDocument,
    onDeleteDocument,
    onRenameDocument,
    onRefreshCase,
    onSave,
    onClose,
}) => {
    const isDark = theme === 'dark';

    const chatRef = useRef<CaseChatPanelHandle>(null);
    const [centerTab, setCenterTab] = useState<'chat' | 'facts' | 'evidence'>('chat');
    const [isUploading, setIsUploading] = useState(false);
    const [viewingDoc, setViewingDoc] = useState<CaseDocument | null>(null);
    const [selectedDoc, setSelectedDoc] = useState<CaseDocument | null>(null);
    const [showClaimGenerator, setShowClaimGenerator] = useState(false);
    const [editingDocId, setEditingDocId] = useState<string | null>(null);
    const [editingTitle, setEditingTitle] = useState('');
    const [autoAnalyzeTick, setAutoAnalyzeTick] = useState(0);

    const evidenceDocs = task.documents?.filter(d => d.category === 'Evidence') || [];
    const generatedDocs = task.documents?.filter(d => d.category !== 'Evidence') || [];
    const isTrafficAccident = task.caseType === 'traffic_accident';

    const handleUploadEvidence = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('file', file);
            const response = await uploadCaseEvidence(task.id, formData);
            if (response.success && response.data) {
                onTaskChange(response.data);
                setCenterTab('facts');
                setAutoAnalyzeTick(Date.now());
            }
        } catch {
            alert(t.evidenceUploadFailed || '上传证据失败');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    return (
        <div className={`flex flex-col h-full w-full ${isDark ? 'bg-slate-900' : 'bg-[#f5f5f7]'}`}>

            {/* ── Header ── */}
            <div className={`flex items-center justify-between px-6 py-3 border-b shrink-0
                ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3 min-w-0">
                    <button onClick={onClose}
                        className={`p-1.5 rounded-lg transition-colors shrink-0 ${isDark ? 'hover:bg-white/10 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                        <X size={18} />
                    </button>
                    <div className="min-w-0">
                        <h2 className={`font-bold text-base truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{task.title}</h2>
                        <p className="text-xs text-slate-400">案件工作站</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors
                            ${isDark ? 'border-white/10 text-slate-300 hover:bg-white/5' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                        <FileOutput size={14} />
                        导出文书
                    </button>
                    <button onClick={onSave} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                        保存
                    </button>
                </div>
            </div>

            {/* ── 3-Column Body ── */}
            <div className="flex-1 flex overflow-hidden">

                {/* ── Left: 证据舱 ── */}
                <div className={`w-[200px] flex-shrink-0 flex flex-col border-r
                    ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    <div className={`px-4 py-3 border-b flex items-center justify-between
                        ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                        <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>证据舱</span>
                        <div className="relative">
                            <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleUploadEvidence}
                                disabled={isUploading} />
                            <button disabled={isUploading}
                                className={`p-1 rounded transition-colors ${isUploading ? 'text-slate-400' : isDark ? 'text-slate-400 hover:text-white hover:bg-white/10' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'}`}>
                                {isUploading ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                        {evidenceDocs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4 py-8">
                                <FileText size={24} className="text-slate-300" />
                                <p className="text-xs text-slate-400">上传证据文件开始分析</p>
                            </div>
                        ) : (
                            evidenceDocs.map(doc => (
                                <div key={doc.id}
                                    className={`p-2.5 rounded-xl border group transition-all
                                        ${isDark ? 'bg-slate-800/60 border-white/5 hover:border-white/15' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                                    <div className="flex items-start gap-2">
                                        <FileText size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <p className={`text-xs font-medium truncate ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{doc.title}</p>
                                            <p className="text-[10px] text-green-500 font-medium mt-0.5">已解析</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setViewingDoc(doc)}
                                            className={`flex-1 text-[10px] py-1 rounded text-center transition-colors
                                                ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-300' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                                            查看
                                        </button>
                                        <button onClick={() => onDeleteDocument(doc.id)}
                                            className="p-1 rounded text-red-400 hover:bg-red-500/10 transition-colors">
                                            <Trash2 size={10} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Middle: Tab 区域 ── */}
                <div className={`flex-1 min-w-0 flex flex-col ${isDark ? 'bg-slate-900' : 'bg-[#f5f5f7]'}`}>
                    {/* Tab header */}
                    <div className={`px-4 py-2 border-b flex items-center gap-1 shrink-0
                        ${isDark ? 'border-white/10 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                        {(['chat', 'facts', 'evidence'] as const).map(tab => (
                            <button key={tab} onClick={() => setCenterTab(tab)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                                    ${centerTab === tab
                                        ? 'bg-blue-600 text-white'
                                        : isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-white/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
                                {tab === 'chat' ? '研判对话' : tab === 'facts' ? '案件详情' : '证据整理'}
                            </button>
                        ))}
                        {centerTab === 'chat' && (
                            <div className="flex items-center gap-1.5 ml-auto">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs text-slate-400">AI 助手在线</span>
                            </div>
                        )}
                    </div>
                    {centerTab === 'facts' ? (
                        <PanelCaseFacts task={task} theme={theme} onTaskChange={onTaskChange} autoAnalyzeTick={autoAnalyzeTick} />
                    ) : centerTab === 'evidence' ? (
                        <PanelEvidence task={task} theme={theme} onTaskChange={onTaskChange} onAddDocument={onAddDocument} onDeleteDocument={onDeleteDocument} />
                    ) : (
                        <CaseChatPanel
                            ref={chatRef}
                            caseId={task.id}
                            theme={theme}
                            caseType={task.caseType}
                            factSheetUpdatedAt={task.factSheetUpdatedAt}
                            onRefreshCase={onRefreshCase}
                            onSaveDocument={(content, suggestedTitle) => {
                                const newDoc: CaseDocument = {
                                    id: `doc-${Date.now()}`,
                                    title: suggestedTitle,
                                    content,
                                    category: 'offical_doc',
                                    createdAt: new Date().toISOString(),
                                };
                                onAddDocument(newDoc);
                            }}
                        />
                    )}
                </div>

                {/* ── Right: 成果中心 ── */}
                <div className={`w-[220px] flex-shrink-0 flex flex-col border-l overflow-y-auto custom-scrollbar
                    ${isDark ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                    <div className={`px-4 py-3 border-b flex items-center justify-between shrink-0
                        ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                        <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>成果中心</span>
                        <Settings size={13} className="text-slate-400" />
                    </div>

                    <div className="p-3 space-y-4">
                        {/* 案件概览卡片 */}
                        <div className={`p-3 rounded-xl space-y-2 ${isDark ? 'bg-slate-800 border border-white/5' : 'bg-slate-50 border border-slate-200'}`}>
                            <p className={`text-[10px] font-bold mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>案件基本信息</p>
                            <div>
                                <p className={`text-[10px] mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>案件标题</p>
                                <input
                                    className={`w-full px-2 py-1.5 rounded-lg border text-xs font-medium outline-none ${isDark ? 'bg-slate-900 border-white/10 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:border-blue-400'}`}
                                    value={task.title}
                                    onChange={(e) => onTaskChange({ ...task, title: e.target.value })}
                                />
                            </div>
                            <div>
                                <p className={`text-[10px] mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>案由</p>
                                <select
                                    className={`w-full px-2 py-1.5 rounded-lg border text-xs font-medium outline-none ${isDark ? 'bg-slate-900 border-white/10 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:border-blue-400'}`}
                                    value={task.caseType || 'general'}
                                    onChange={(e) => onTaskChange({ ...task, caseType: e.target.value })}
                                >
                                    {CASE_TYPES.map(ct => (
                                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <p className={`text-[10px] mb-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>当前阶段</p>
                                <select
                                    className={`w-full px-2 py-1.5 rounded-lg border text-xs font-medium outline-none ${isDark ? 'bg-slate-900 border-white/10 text-slate-100 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-800 focus:border-blue-400'}`}
                                    value={task.status || 'todo'}
                                    onChange={(e) => onTaskChange({ ...task, status: e.target.value as any })}
                                >
                                    <option value="todo">调查/取证</option>
                                    <option value="in-progress">审理/庭审</option>
                                    <option value="done">执行/结案</option>
                                </select>
                            </div>
                            <div className={`flex gap-3 pt-1 border-t ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                                <div>
                                    <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>证据数量</p>
                                    <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{evidenceDocs.length}</p>
                                </div>
                                <div>
                                    <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>生成文书</p>
                                    <p className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{generatedDocs.length}</p>
                                </div>
                            </div>
                        </div>

                        {/* 快捷操作 */}
                        <div className="grid grid-cols-2 gap-2">
                            {QUICK_ACTIONS.map(a => (
                                <QuickActionBtn key={a.label} theme={theme} icon={<FileSignature size={18} />} label={a.label}
                                    onClick={() => chatRef.current?.sendMessage(a.prompt)} />
                            ))}
                            <QuickActionBtn theme={theme} icon={<ClipboardList size={18} />} label="打印材料清单"
                                onClick={() => {
                                    const checklist = getChecklist(task.caseType || 'general');
                                    const rows = checklist.items.map(item =>
                                        `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-size:14px;">${item.required ? '★' : '☆'}</td><td style="padding:8px 12px;border:1px solid #ddd;font-size:14px;">${item.label}</td><td style="padding:8px 12px;border:1px solid #ddd;width:80px;"></td></tr>`
                                    ).join('');
                                    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${checklist.title}</title><style>body{font-family:sans-serif;padding:32px}h2{margin-bottom:8px}p{color:#666;font-size:13px;margin-bottom:16px}table{border-collapse:collapse;width:100%}th{background:#f5f5f5;padding:8px 12px;border:1px solid #ddd;text-align:left;font-size:13px}@media print{button{display:none}}</style></head><body><h2>${checklist.title}</h2><p>案件：${task.title} &nbsp;|&nbsp; 打印日期：${new Date().toLocaleDateString('zh-CN')}</p><table><thead><tr><th style="width:40px">必须</th><th>材料名称</th><th>已备妥 ✓</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
                                    const w = window.open('', '_blank');
                                    if (w) { w.document.write(html); w.document.close(); w.print(); }
                                }} />
                            <QuickActionBtn theme={theme} icon={<FolderSearch size={18} />} label="证据整理"
                                onClick={() => setCenterTab('evidence')} />
                            {isTrafficAccident && (
                                <QuickActionBtn theme={theme} icon={<Calculator size={18} />} label="索赔计算器"
                                    onClick={() => setShowClaimGenerator(true)} />
                            )}
                        </div>

                        {/* 已生成文档 */}
                        {generatedDocs.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>已生成文档</p>
                                    <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{generatedDocs.length}</span>
                                </div>
                                <div className="space-y-2">
                                    {generatedDocs.map(doc => (
                                        <div key={doc.id}
                                            className={`p-3 rounded-xl border transition-all
                                                ${isDark ? 'bg-slate-800/60 border-white/5 hover:border-white/15' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                                            <div className="flex items-start gap-2 mb-2">
                                                <FileText size={14} className="text-blue-500 shrink-0 mt-0.5" />
                                                <div className="min-w-0 flex-1">
                                                    {editingDocId === doc.id ? (
                                                        <input
                                                            autoFocus
                                                            value={editingTitle}
                                                            onChange={e => setEditingTitle(e.target.value)}
                                                            onBlur={() => { if (editingTitle.trim()) onRenameDocument(doc.id, editingTitle.trim()); setEditingDocId(null); }}
                                                            onKeyDown={e => { if (e.key === 'Enter') { if (editingTitle.trim()) onRenameDocument(doc.id, editingTitle.trim()); setEditingDocId(null); } if (e.key === 'Escape') setEditingDocId(null); }}
                                                            className={`w-full text-xs font-bold rounded px-1 outline-none border ${isDark ? 'bg-slate-700 border-blue-500 text-slate-200' : 'bg-white border-blue-400 text-slate-800'}`}
                                                        />
                                                    ) : (
                                                        <p
                                                            className={`text-xs font-bold truncate cursor-pointer hover:text-blue-500 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
                                                            onDoubleClick={() => { setEditingDocId(doc.id); setEditingTitle(doc.title); }}
                                                            title="双击重命名"
                                                        >{doc.title}</p>
                                                    )}
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wide mt-0.5">
                                                        {DOC_CATEGORY_LABEL[doc.category] || doc.category}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-slate-400">{new Date(doc.createdAt).toLocaleDateString()}</span>
                                                <button onClick={() => setSelectedDoc(doc)}
                                                    className="text-[10px] text-blue-500 hover:text-blue-600 font-medium transition-colors">
                                                    查看详情
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

            </div>

            <LoadingOverlay isVisible={isSaving} message={t.saving || 'Saving...'} theme={theme} />

            {viewingDoc && <DocViewer doc={viewingDoc} theme={theme} onClose={() => setViewingDoc(null)} />}
            {selectedDoc && (
                <GeneratedDocViewer
                    doc={selectedDoc}
                    theme={theme}
                    onClose={() => setSelectedDoc(null)}
                    onDelete={() => onDeleteDocument(selectedDoc.id)}
                />
            )}
            {showClaimGenerator && (
                <ClaimListGenerator task={task} theme={theme} onClose={() => setShowClaimGenerator(false)} />
            )}
        </div>
    );
};
