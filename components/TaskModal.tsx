import React from 'react';
import { Case } from '../types';
import {
  TaskModalHeader,
  TaskModalInfoPanel,
  TaskModalSubTasksPanel,
  TaskModalFooter
} from './taskModal';

interface TaskModalProps {
  task: Case;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  isOverviewGenerating: boolean;
  onTaskChange: (task: Case) => void;
  onToggleSubTask: (subTaskId: string) => void;
  onUpdateSubTaskTitle: (subTaskId: string, newTitle: string) => void;
  onUpdateSubTaskDate: (subTaskId: string, newDate: string) => void;
  onDeleteSubTask: (subTaskId: string) => void;
  onAddSubTask: () => void;
  onGenerateOverview: () => void;
  onSave: () => void;
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
  onGenerateOverview,
  onSave,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
      <div className={`w-full max-w-7xl rounded-3xl shadow-2xl overflow-hidden border flex flex-col h-[90vh] animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
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
