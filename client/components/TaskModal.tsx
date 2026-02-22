import React, { useState } from 'react';
import { Case } from '../types';
import { TaskModalHeader } from './taskModal/TaskModalHeader';
import { TaskModalInfoPanel } from './taskModal/TaskModalInfoPanel';
import { TaskModalSubTasksPanel } from './taskModal/TaskModalSubTasksPanel';
import { TaskModalDocumentsPanel } from './taskModal/TaskModalDocumentsPanel';
import { TaskModalFooter } from './taskModal/TaskModalFooter';
import { translations } from '../translations';

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
  const [activeTab, setActiveTab] = useState<'tasks' | 'documents'>('tasks');
  const t = translations[lang];

  /**
   * 任务详情页面组件 (以前的模态框)
   * 用于显示和编辑任务详情的独立页面
   * 包含任务基本信息、子任务列表、文档列表和AI概况
   */
  return (
    <div className={`flex flex-col h-full w-full animate-in fade-in duration-200 ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
      <TaskModalHeader task={task} theme={theme} onClose={onClose} />

      {/* --- Left / Right Split Layout --- */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Always visible Overview */}
        <div className={`w-[50%] border-r flex flex-col min-h-0 overflow-hidden ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'}`}>
          <TaskModalInfoPanel
            task={task}
            theme={theme}
            lang={lang}
            onTaskChange={onTaskChange}
            onGenerateOverview={onGenerateOverview}
            isOverviewGenerating={isOverviewGenerating}
          />
        </div>

        {/* Right Panel: Tabs for Tasks and Documents */}
        <div className="w-[50%] flex flex-col min-h-0 overflow-hidden bg-slate-50/30 dark:bg-slate-900/30">
          {/* Tabs Navigation */}
          <div className={`px-8 pt-4 border-b flex items-center gap-8 ${theme === 'dark' ? 'border-white/10' : 'border-slate-200'} bg-white dark:bg-slate-900`}>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'tasks'
                ? (theme === 'dark' ? 'text-indigo-400 border-indigo-400' : 'text-indigo-600 border-indigo-600')
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              {(t as any).tasksTab || 'Tasks'}
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'documents'
                ? (theme === 'dark' ? 'text-indigo-400 border-indigo-400' : 'text-indigo-600 border-indigo-600')
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              {(t as any).docsTab || 'Documents'}
            </button>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {activeTab === 'tasks' && (
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
            )}

            {activeTab === 'documents' && (
              <TaskModalDocumentsPanel
                task={task}
                theme={theme}
                lang={lang}
                onAddDocument={onAddDocument}
                onDeleteDocument={onDeleteDocument}
              />
            )}
          </div>
        </div>
      </div>

      <TaskModalFooter
        theme={theme}
        lang={lang}
        onSave={onSave}
        onCancel={onClose}
      />
    </div>
  );
};
