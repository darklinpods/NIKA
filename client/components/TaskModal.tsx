import React, { useState } from 'react';
import { Case, CaseDocument, InvoiceItem } from '../types';
import { TaskModalSubTasksPanel } from './taskModal/TaskModalSubTasksPanel';
import { CaseChatPanel } from './taskModal/CaseChatPanel';
import { TaskModalFooter } from './taskModal/TaskModalFooter';
import { TaskModalHeader } from './taskModal/TaskModalHeader';
import { LoadingOverlay } from './LoadingOverlay';
import { translations } from '../translations';
import { ClaimListGenerator } from './claimList/ClaimListGenerator';
import { generateCaseDocument } from '../services/geminiService';
import { uploadCaseEvidence, api } from '../services/api';
import {
    Gavel, X, FileText, Plus, Database, Users, Scan, Eye, Download, Trash2,
    Loader, ChevronDown, ChevronUp, Settings2, FileOutput, Package,
    FileSignature, Calculator, Loader2, Receipt, Wand2, AlignLeft, Check, Edit2, Sparkles
} from 'lucide-react';

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
                    <span className="text-slate-400 shrink-0">{t.idNum || '身份证号'}:</span>
                    <span className="font-mono break-all">{party.idNumber}</span>
                </div>
            )}
            {party.contact && (
                <div className="flex gap-1.5">
                    <span className="text-slate-400 shrink-0">{t.contact || '联系方式'}:</span>
                    <span>{party.contact}</span>
                </div>
            )}
            {party.address && (
                <div className="flex gap-1.5">
                    <span className="text-slate-400 shrink-0">{t.address || '地址'}:</span>
                    <span className="break-words">{party.address}</span>
                </div>
            )}
        </div>
    );
};

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

interface TaskModalProps {
  task: Case;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  isOverviewGenerating: boolean;
  isSaving: boolean;
  onTaskChange: (task: Case) => void;
  onToggleSubTask: (subTaskId: string) => void;
  onUpdateSubTaskTitle: (subTaskId: string, newTitle: string) => void;
  onUpdateSubTaskDate: (subTaskId: string, newDate: string) => void;
  onDeleteSubTask: (subTaskId: string) => void;
  onAddSubTask: () => void;
  onAddDocument: (doc: any) => void;
  onDeleteDocument: (docId: string) => void;
  onGenerateOverview: () => void;
  onRefreshCase: () => void;
  onSave: () => void;
  onClose: () => void;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  task,
  theme,
  lang,
  isOverviewGenerating,
  isSaving,
  onTaskChange,
  onToggleSubTask,
  onUpdateSubTaskTitle,
  onUpdateSubTaskDate,
  onDeleteSubTask,
  onAddSubTask,
  onAddDocument,
  onDeleteDocument,
  onGenerateOverview,
  onRefreshCase,
  onSave,
  onClose,
}) => {
  const t = translations[lang] as any;
  const isDark = theme === 'dark';

  const [isUploading, setIsUploading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<CaseDocument | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<CaseDocument | null>(null);
  const [showClaimGenerator, setShowClaimGenerator] = useState(false);
  const [showSubTasks, setShowSubTasks] = useState(false);
  const [showParties, setShowParties] = useState(true);
  const [showBasicInfo, setShowBasicInfo] = useState(true);
  const [showInvoices, setShowInvoices] = useState(true);

  // --- Evidence Local Logic ---
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
          alert(t.evidenceUploadFailed || "上传证据失败");
      } finally {
          setIsUploading(false);
          e.target.value = '';
      }
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

  // --- Document Generator Local Logic ---
  const generatedDocs = task.documents?.filter(d => d.category !== 'Evidence') || [];

  const handleDownloadDoc = (doc: CaseDocument) => {
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
    <div className={`flex flex-col h-full w-full ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <TaskModalHeader task={task} theme={theme} onClose={onClose} />

      {/* --- 3-Column Layout --- */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Basic Info, Evidence & Parties */}
        <div className={`w-[280px] flex-shrink-0 border-r flex flex-col overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'border-white/10 bg-slate-900/50 text-slate-200' : 'border-slate-200 bg-white text-slate-800'}`}>
            <div className="p-4 flex flex-col gap-4">
                {/* 案件基本信息 */}
                <div>
                    <button 
                        className="text-xs font-bold flex items-center justify-between w-full hover:opacity-80 transition-opacity mb-2"
                        onClick={() => setShowBasicInfo(!showBasicInfo)}
                    >
                        <div className="flex items-center gap-1.5">
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 p-1 rounded"><FileText size={12} /></span>
                            {t.basicInfo || '案件基本信息'}
                        </div>
                        {showBasicInfo ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                    </button>
                    {showBasicInfo && (
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                                    {t.taskTitle || '任务标题'}
                                </label>
                                <input
                                    className={`w-full p-2 rounded-lg border text-sm font-bold outline-none transition-colors ${theme === 'dark'
                                        ? 'bg-slate-800 border-white/10 text-slate-100 focus:border-blue-500'
                                        : 'bg-slate-50 border-slate-200 focus:border-blue-500'
                                        }`}
                                    value={task.title}
                                    onChange={(e) => onTaskChange({ ...task, title: e.target.value })}
                                    placeholder={t.enterCaseTitle || '输入案件标题'}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                                    案由
                                </label>
                                <input
                                    className={`w-full p-2 rounded-lg border text-sm font-bold outline-none transition-colors ${theme === 'dark'
                                        ? 'bg-slate-800 border-white/10 text-slate-100 focus:border-blue-500'
                                        : 'bg-slate-50 border-slate-200 focus:border-blue-500'
                                        }`}
                                    value={task.caseReason || (task.caseType === 'traffic_accident' ? '机动车交通事故责任纠纷' : '')}
                                    onChange={(e) => onTaskChange({ ...task, caseReason: e.target.value })}
                                    placeholder={'输入案由'}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                                    动态战术板 (Dynamic Strategy Map)
                                </label>
                                <div className={`w-full p-3 rounded-lg border text-xs leading-relaxed custom-scrollbar max-h-48 overflow-y-auto ${theme === 'dark' 
                                    ? 'bg-blue-900/10 border-blue-500/20 text-blue-100 shadow-[inset_0_0_20px_rgba(59,130,246,0.05)]' 
                                    : 'bg-blue-50 border-blue-200/50 text-blue-900'}`}>
                                    {task.description ? (
                                        <div className="whitespace-pre-wrap">{task.description}</div>
                                    ) : (
                                        <div className="text-blue-400/60 italic flex flex-col items-center justify-center py-4 gap-2">
                                            <Sparkles size={16} />
                                            <span>AI 尚未总结案件策略重点</span>
                                            <span className="text-[10px]">在右侧 Chat 中与助理探讨后自动生成</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
                                    {t.currentStage || '当前阶段'}
                                </label>
                                <select
                                    className={`w-full p-2 rounded-lg border text-xs font-medium outline-none transition-colors ${theme === 'dark'
                                        ? 'bg-slate-800 border-white/10 text-slate-100 focus:border-blue-500'
                                        : 'bg-slate-50 border-slate-200 focus:border-blue-500'
                                        }`}
                                    value={task.status || 'todo'}
                                    onChange={(e) => onTaskChange({ ...task, status: e.target.value as any })}
                                >
                                    <option value="todo">{t.backlog || '未开始'}</option>
                                    <option value="in-progress">{t.inProgress || '进行中'}</option>
                                    <option value="done">{t.done || '已完成'}</option>
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <hr className={`my-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`} />

                {/* 证据材料 */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold flex items-center gap-1.5">
                            <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 p-1 rounded"><Database size={12} /></span>
                            {t.rawEvidence || '证据材料'}
                        </h3>
                        <div className="relative shrink-0">
                            <input type="file" accept=".pdf,.doc,.docx"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleUploadEvidence}
                                disabled={isUploading} />
                            <button disabled={isUploading}
                                className={`px-2 py-1 font-bold text-[10px] rounded flex items-center gap-1 transition-colors
                                    ${isUploading ? 'bg-slate-200 text-slate-400 dark:bg-slate-800' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                                {isUploading ? <Loader size={10} className="animate-spin" /> : <Plus size={10} />}
                                {t.importFile || '上传文件'}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        {evidenceDocs.map(doc => (
                            <div key={doc.id}
                                className={`p-2 rounded-lg border flex items-center justify-between transition-all group
                                    ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                <div className="flex items-center gap-2 overflow-hidden w-full">
                                    <FileText size={12} className="shrink-0 text-blue-500" />
                                    <span className="text-[10px] truncate">{doc.title}</span>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
                                    <button onClick={() => setViewingDoc(doc)} title="查看" className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-500"><Eye size={10} /></button>
                                    <button onClick={() => onDeleteDocument(doc.id)} title="删除" className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-red-500"><Trash2 size={10} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <hr className={`my-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`} />

                {/* 当事人卡片区 */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <button 
                            className="text-xs font-bold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                            onClick={() => setShowParties(!showParties)}
                        >
                            <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 p-1 rounded"><Users size={12} /></span>
                            当事人
                            {showParties ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                        </button>
                    </div>
                    {showParties && (
                        <div className="space-y-2">
                            {partiesArray.map((party, idx) => (
                                <PartyCard key={idx} party={party} theme={theme} t={t} />
                            ))}
                        </div>
                    )}
                </div>

                {isTrafficAccident && (
                    <>
                        <div className="flex justify-between items-center mb-2 mt-4">
                            <button 
                                className="text-xs font-bold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                                onClick={() => setShowInvoices(!showInvoices)}
                            >
                                <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 p-1 rounded"><Receipt size={12} /></span>
                                发票清单
                                {showInvoices ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                            </button>
                        </div>
                        {showInvoices && invoices.length > 0 && (
                            <div className="space-y-1">
                                {invoices.map((inv, idx) => (
                                    <div key={idx} className={`p-2 rounded-lg border text-[10px] flex justify-between ${isDark ? 'bg-slate-800 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                                        <span className="truncate w-3/4">{inv.description || inv.category || '发票'}</span>
                                        <span className="font-bold flex-shrink-0">¥{inv.amount.toFixed(2)}</span>
                                    </div>
                                ))}
                                <div className="text-right text-[10px] font-bold mt-1 text-amber-600 dark:text-amber-400">
                                    合计: ¥{invoiceTotal.toFixed(2)}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>

        {/* Middle Column: Chat Panel */}
        <div className="flex-1 min-w-0 border-r dark:border-white/10 border-slate-200 flex flex-col bg-white dark:bg-slate-900">
            <CaseChatPanel 
                caseId={task.id} 
                theme={theme} 
                lang={lang} 
                caseType={task.caseType}
                onRefreshCase={onRefreshCase}
                onSaveDocument={(content, suggestedTitle) => {
                    const newDoc: CaseDocument = {
                        id: `doc-${Date.now()}`,
                        title: suggestedTitle,
                        content: content,
                        category: 'offical_doc',
                        createdAt: new Date().toISOString(),
                    };
                    onAddDocument(newDoc);
                }}
            />
        </div>

        {/* Right Column: Workflow Tasks & Document Generator */}
        <div className={`w-[300px] flex-shrink-0 flex flex-col overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-slate-900/80 text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
            <div className="p-4 flex flex-col gap-6">
                
                {/* 任务清单（折叠） */}
                <div>
                    <button onClick={() => setShowSubTasks(!showSubTasks)}
                        className={`w-full flex justify-between items-center p-3 rounded-xl border font-bold text-sm transition-colors ${theme === 'dark' ? 'bg-slate-800 border-white/10 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>
                        <span className="flex items-center gap-2"><Check size={14} className="text-green-500" /> {t.workflowTasks || '工作流任务'}</span>
                        {showSubTasks ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {showSubTasks && (
                        <div className="mt-2 h-64 overflow-hidden rounded-xl border dark:border-white/10 border-slate-200">
                            <TaskModalSubTasksPanel
                                task={task}
                                theme={theme}
                                lang={lang}
                                onToggleSubTask={onToggleSubTask}
                                onUpdateSubTaskTitle={onUpdateSubTaskTitle}
                                onUpdateSubTaskDate={onUpdateSubTaskDate}
                                onDeleteSubTask={onDeleteSubTask}
                                onAddSubTask={onAddSubTask}
                            />
                        </div>
                    )}
                </div>

                {task.caseType === 'traffic_accident' && (
                    <>
                        {/* 实用工具 */}
                        <div>
                            <h3 className="text-xs font-bold flex items-center gap-1.5 mb-3">
                                <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 p-1 rounded"><Settings2 size={12} /></span>
                                {t.utilities || '实用工具'}
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setShowClaimGenerator(true)}
                                    className={`p-3 text-xs font-bold flex flex-col items-center justify-center gap-1.5 rounded-xl border transition-all ${theme === 'dark' ? 'border-indigo-500/30 bg-indigo-900/20 text-indigo-300' : 'border-indigo-200 bg-indigo-50 text-indigo-700'}`}
                                >
                                    <Calculator size={14} />
                                    <span>{t.compCalc || '索赔计算器'}</span>
                                </button>
                            </div>
                        </div>

                        <hr className={`my-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`} />
                    </>
                )}

                {/* 已生成文档列表 */}
                <div>
                    <h3 className="text-xs font-bold flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                            <span className="bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 p-1 rounded"><FileOutput size={12} /></span>
                            {t.finalVault || '已生成文档'}
                        </div>
                        <span className="text-[10px] text-slate-500">{generatedDocs.length} docs</span>
                    </h3>
                    <div className="space-y-2">
                        {generatedDocs.map((doc) => (
                            <div
                                key={doc.id}
                                onClick={() => setSelectedDoc(doc)}
                                className={`p-3 rounded-xl border cursor-pointer hover:-translate-y-0.5 transition-all group ${theme === 'dark' ? 'bg-slate-800/80 border-white/5 hover:border-blue-500/50' : 'bg-white border-slate-200 hover:border-blue-400'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="text-xs font-bold truncate pr-2">{doc.title}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); handleDownloadDoc(doc); }} className="hover:text-blue-500"><Download size={12} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); onDeleteDocument(doc.id); }} className="hover:text-red-500"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                                <p className={`text-[10px] ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                    {new Date(doc.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
                
            </div>
        </div>

      </div>

      <TaskModalFooter
        theme={theme}
        lang={lang}
        onSave={onSave}
        onCancel={onClose}
      />

      <LoadingOverlay isVisible={isSaving} message={t.saving || 'Saving...'} theme={theme} />

      {/* Modals */}
      {viewingDoc && <DocViewer doc={viewingDoc} theme={theme} onClose={() => setViewingDoc(null)} />}
      
      {selectedDoc && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/60 backdrop-blur-sm`} onClick={() => setSelectedDoc(null)}>
              <div className={`w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col relative z-50 ${theme === 'dark' ? 'bg-slate-900 border border-white/10' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                  <div className={`p-5 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900 rounded-t-2xl ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
                      <h3 className={`font-bold text-lg flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                          <FileText size={20} className="text-blue-500" />
                          {selectedDoc.title}
                      </h3>
                      <div className="flex items-center gap-3">
                          <button onClick={() => handleDownloadDoc(selectedDoc)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 rounded-lg text-sm font-bold transition-colors">
                              <Download size={14} /> {t.download || '下载'}
                          </button>
                          <button onClick={() => setSelectedDoc(null)} className="px-3 py-1.5 rounded-lg text-sm font-bold text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                              {t.close || '关闭'}
                          </button>
                      </div>
                  </div>
                  <div className={`flex-1 overflow-y-auto p-8 whitespace-pre-wrap font-mono text-sm leading-relaxed custom-scrollbar ${theme === 'dark' ? 'text-slate-300 bg-slate-900' : 'text-slate-700 bg-white'}`}>
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

