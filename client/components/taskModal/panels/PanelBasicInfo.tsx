import React, { useState } from 'react';
import { Case, Priority } from '../../../types';
import { translations } from '../../../translations';
import { getPriorityLabel } from '../../../constants/priorities';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Edit2, Check } from 'lucide-react';
import { CASE_TYPES } from '../../../constants/caseTypes';

interface PanelBasicInfoProps {
    task: Case;
    theme: 'light' | 'dark';
    lang: 'zh' | 'en';
    onTaskChange: (task: Case) => void;
    onGenerateOverview: () => void;
    isOverviewGenerating: boolean;
}

export const PanelBasicInfo: React.FC<PanelBasicInfoProps> = ({
    task,
    theme,
    lang,
    onTaskChange,
    onGenerateOverview,
    isOverviewGenerating
}) => {
    const t = translations[lang] as any;
    const [isEditingFacts, setIsEditingFacts] = useState(false);

    return (
        <div className={`w-full p-8 flex flex-col h-full overflow-y-auto custom-scrollbar gap-8 ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>

            {/* 头部标题区 */}
            <div>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 p-2 rounded-xl text-sm font-black">INFO</span>
                    {t.basicInfo}
                </h2>
                <div className={`p-6 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                {t.taskTitle}
                            </label>
                            <input
                                className={`w-full p-3 rounded-xl border font-bold text-lg outline-none transition-colors ${theme === 'dark'
                                    ? 'bg-slate-900 border-white/10 text-slate-100 focus:border-blue-500'
                                    : 'bg-white border-slate-200 focus:border-blue-500'
                                    }`}
                                value={task.title}
                                onChange={(e) => onTaskChange({ ...task, title: e.target.value })}
                                placeholder={t.enterCaseTitle}
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                {t.clientName}
                            </label>
                            <input
                                className={`w-full p-3 rounded-xl border text-sm font-medium outline-none transition-colors ${theme === 'dark'
                                    ? 'bg-slate-900 border-white/10 text-slate-100 focus:border-blue-500'
                                    : 'bg-white border-slate-200 focus:border-blue-500'
                                    }`}
                                value={task.clientName || ''}
                                onChange={(e) => onTaskChange({ ...task, clientName: e.target.value })}
                                placeholder={t.enterClientName}
                            />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                {t.caseType}
                            </label>
                            <select
                                className={`w-full p-3 rounded-xl border text-sm font-medium outline-none transition-colors ${theme === 'dark'
                                    ? 'bg-slate-900 border-white/10 text-slate-100 focus:border-blue-500'
                                    : 'bg-white border-slate-200 focus:border-blue-500'
                                    }`}
                                value={task.caseType || 'general'}
                                onChange={(e) => onTaskChange({ ...task, caseType: e.target.value })}
                            >
                                {CASE_TYPES.map(ct => (
                                    <option key={ct.value} value={ct.value}>
                                        {lang === 'zh' ? ct.labelZh : ct.labelEn}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                {t.priority}
                            </label>
                            <select
                                className={`w-full p-3 rounded-xl border text-sm font-medium outline-none transition-colors ${theme === 'dark'
                                    ? 'bg-slate-900 border-white/10 text-slate-100 focus:border-blue-500'
                                    : 'bg-white border-slate-200 focus:border-blue-500'
                                    }`}
                                value={task.priority}
                                onChange={(e) => onTaskChange({ ...task, priority: e.target.value as Priority })}
                            >
                                <option value="low">{getPriorityLabel('low', lang)}</option>
                                <option value="medium">{getPriorityLabel('medium', lang)}</option>
                                <option value="high">{getPriorityLabel('high', lang)}</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                {t.currentStage}
                            </label>
                            <select
                                className={`w-full p-3 rounded-xl border text-sm font-medium outline-none transition-colors ${theme === 'dark'
                                    ? 'bg-slate-900 border-white/10 text-slate-100 focus:border-blue-500'
                                    : 'bg-white border-slate-200 focus:border-blue-500'
                                    }`}
                                value={task.status || 'todo'}
                                onChange={(e) => onTaskChange({ ...task, status: e.target.value as any })}
                            >
                                <option value="todo">{t.backlog}</option>
                                <option value="in-progress">{t.inProgress}</option>
                                <option value="done">{t.done}</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>


            {/* Basic Facts (案件基本事实) */}
            <div className={`p-6 rounded-2xl border flex-1 flex flex-col min-h-[400px] shadow-sm ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                        {t.basicFacts}
                    </label>
                    <button
                        onClick={() => setIsEditingFacts(!isEditingFacts)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm ${isEditingFacts
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : (theme === 'dark' ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50')
                            }`}
                    >
                        {isEditingFacts ? (
                            <><Check size={14} /> {t.doneEditing}</>
                        ) : (
                            <><Edit2 size={14} /> {t.editFacts}</>
                        )}
                    </button>
                </div>

                {isEditingFacts ? (
                    <textarea
                        className={`flex-1 w-full p-5 rounded-xl text-sm leading-relaxed border outline-none resize-none transition-all shadow-inner ${theme === 'dark'
                            ? 'bg-slate-950 border-blue-500 text-slate-200'
                            : 'bg-white border-blue-400 text-slate-800'
                            }`}
                        value={task.caseFactSheet || ''}
                        onChange={(e) => onTaskChange({ ...task, caseFactSheet: e.target.value })}
                        placeholder={t.markdownSupport}
                    />
                ) : (
                    <div className={`flex-1 w-full p-6 rounded-xl border overflow-y-auto custom-scrollbar ${theme === 'dark'
                        ? 'bg-slate-900 border-white/10 text-slate-300'
                        : 'bg-white border-slate-200 text-slate-700'
                        }`}>
                        {task.caseFactSheet ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-3 mt-4 text-slate-900 dark:text-white" {...props} />,
                                    h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-2 mt-3 text-slate-800 dark:text-slate-100" {...props} />,
                                    h3: ({ node, ...props }) => <h3 className="text-base font-bold mb-2 mt-2 text-slate-800 dark:text-slate-200" {...props} />,
                                    p: ({ node, ...props }) => <p className="mb-3 text-sm leading-relaxed" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-3 text-sm space-y-1" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-3 text-sm space-y-1" {...props} />,
                                    li: ({ node, ...props }) => <li className="" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-bold text-blue-600 dark:text-blue-400" {...props} />,
                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic my-3 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 py-2 rounded-r" {...props} />,
                                    a: ({ node, ...props }) => <a className="text-blue-500 hover:underline" {...props} />
                                }}
                            >
                                {task.caseFactSheet}
                            </ReactMarkdown>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 italic text-sm">
                                {t.noFacts}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* AI Overview Section */}
            <div className={`p-6 rounded-2xl border shadow-sm ${theme === 'dark' ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {t.aiOverview}
                    </label>
                    <button
                        onClick={onGenerateOverview}
                        disabled={isOverviewGenerating}
                        className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm ${isOverviewGenerating
                            ? 'opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {isOverviewGenerating ? (
                            <>
                                <span className="animate-spin">⟳</span>
                                {t.summarizing}
                            </>
                        ) : (
                            <>
                                {t.generateOverview}
                            </>
                        )}
                    </button>
                </div>
                <div className={`h-40 p-5 rounded-xl border overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
                    }`}>
                    {task.aiSummary ? (
                        <p className={`text-sm leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                            {task.aiSummary}
                        </p>
                    ) : (
                        <div className={`h-full flex items-center justify-center text-sm italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                            {t.aiGenerateTip}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};
