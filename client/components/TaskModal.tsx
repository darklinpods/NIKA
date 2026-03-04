import React, { useState } from 'react';
import { Case } from '../types';
import { TaskModalHeader } from './taskModal/TaskModalHeader';
import { TaskModalSubTasksPanel } from './taskModal/TaskModalSubTasksPanel';
import { CaseChatPanel } from './taskModal/CaseChatPanel';
import { TaskModalFooter } from './taskModal/TaskModalFooter';
import { LoadingOverlay } from './LoadingOverlay';
import { translations } from '../translations';
import { PanelBasicInfo } from './taskModal/panels/PanelBasicInfo';
import { PanelEvidence } from './taskModal/panels/PanelEvidence';
import { PanelAnalysis } from './taskModal/panels/PanelAnalysis';
import { PanelDocuments } from './taskModal/panels/PanelDocuments';
import { ClipboardList, Database, Scale, Folders } from 'lucide-react';

/**
 * 任务模态框组件属性
 */
interface TaskModalProps {
  /** 任务数据 */
  task: Case;
  /** 主题模式 */
  theme: 'light' | 'dark';
  /** 语言设置 */
  lang: 'zh' | 'en';
  /** 是否正在生成概况 */
  isOverviewGenerating: boolean;
  /** 是否正在保存 */
  isSaving: boolean;
  /** 任务变更回调 */
  onTaskChange: (task: Case) => void;
  /** 切换子任务完成状态 */
  onToggleSubTask: (subTaskId: string) => void;
  /** 更新子任务标题 */
  onUpdateSubTaskTitle: (subTaskId: string, newTitle: string) => void;
  /** 更新子任务日期 */
  onUpdateSubTaskDate: (subTaskId: string, newDate: string) => void;
  /** 删除子任务 */
  onDeleteSubTask: (subTaskId: string) => void;
  /** 添加子任务 */
  onAddSubTask: () => void;

  /** 添加文档 */
  onAddDocument: (doc: any) => void;
  /** 删除文档 */
  onDeleteDocument: (docId: string) => void;

  /** 生成AI概况 */
  onGenerateOverview: () => void;
  /** 保存任务 */
  onSave: () => void;
  /** 关闭模态框 */
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
  onSave,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'evidence' | 'analysis' | 'documents'>('basic');
  const t = translations[lang] as any;

  const renderContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <PanelBasicInfo
            task={task}
            theme={theme}
            lang={lang}
            onTaskChange={onTaskChange}
            onGenerateOverview={onGenerateOverview}
            isOverviewGenerating={isOverviewGenerating}
          />
        );
      case 'evidence':
        return (
          <PanelEvidence
            task={task}
            theme={theme}
            lang={lang}
            onTaskChange={onTaskChange}
            onAddDocument={onAddDocument}
            onDeleteDocument={onDeleteDocument}
          />
        );
      case 'analysis':
        return <PanelAnalysis task={task} theme={theme} lang={lang} />;
      case 'documents':
        return (
          <PanelDocuments
            task={task}
            theme={theme}
            lang={lang}
            onToggleSubTask={onToggleSubTask}
            onUpdateSubTaskTitle={onUpdateSubTaskTitle}
            onUpdateSubTaskDate={onUpdateSubTaskDate}
            onDeleteSubTask={onDeleteSubTask}
            onAddSubTask={onAddSubTask}
            onAddDocument={onAddDocument}
            onDeleteDocument={onDeleteDocument}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={`flex flex-col h-full w-full ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
      <TaskModalHeader task={task} theme={theme} onClose={onClose} />

      {/* --- New 4-Pillar Layout --- */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Vertical Navigation */}
        <div className={`w-64 flex-shrink-0 border-r flex flex-col py-6 px-4 gap-2 ${theme === 'dark' ? 'border-white/10 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
          <button
            onClick={() => setActiveTab('basic')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'basic'
              ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20')
              : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800')
              }`}
          >
            <ClipboardList size={18} />
            {t.tabBasicInfo}
          </button>
          <button
            onClick={() => setActiveTab('evidence')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'evidence'
              ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20')
              : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800')
              }`}
          >
            <Database size={18} />
            {t.tabFactsEvidence}
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'analysis'
              ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20')
              : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800')
              }`}
          >
            <Scale size={18} />
            {t.tabLawAnalysis}
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-sm ${activeTab === 'documents'
              ? (theme === 'dark' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20')
              : (theme === 'dark' ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800')
              }`}
          >
            <Folders size={18} />
            {t.tabDocuments}
          </button>
        </div>

        {/* Right Main Content Area */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900">
          {renderContent()}
        </div>
      </div>

      <TaskModalFooter
        theme={theme}
        lang={lang}
        onSave={onSave}
        onCancel={onClose}
      />

      <LoadingOverlay isVisible={isSaving} message={t.saving} theme={theme} />
    </div>
  );
};
