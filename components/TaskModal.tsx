import React from 'react';
import { Case } from '../types';
import { TaskModalHeader } from './taskModal/TaskModalHeader';
import { TaskModalInfoPanel } from './taskModal/TaskModalInfoPanel';
import { TaskModalSubTasksPanel } from './taskModal/TaskModalSubTasksPanel';
import { TaskModalDocumentsPanel } from './taskModal/TaskModalDocumentsPanel';
import { TaskModalFooter } from './taskModal/TaskModalFooter';

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
  /**
   * 任务模态框组件
   * 用于显示和编辑任务详情的弹窗
   * 包含任务基本信息、子任务列表、文档列表和AI概况
   */
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
      <div className={`w-full max-w-[95%] rounded-3xl shadow-2xl overflow-hidden border flex flex-col h-[90vh] animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
        <TaskModalHeader task={task} theme={theme} onClose={onClose} />

        <div className="flex-1 flex overflow-hidden">
          <TaskModalInfoPanel
            task={task}
            theme={theme}
            lang={lang}
            onTaskChange={onTaskChange}
            onGenerateOverview={onGenerateOverview}
            isOverviewGenerating={isOverviewGenerating}
          />

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

          <TaskModalDocumentsPanel
            task={task}
            theme={theme}
            lang={lang}
            onAddDocument={onAddDocument}
            onDeleteDocument={onDeleteDocument}
          />
        </div>

        <TaskModalFooter
          theme={theme}
          lang={lang}
          onSave={onSave}
          onCancel={onClose}
        />
      </div>
    </div>
  );
};
