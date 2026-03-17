import React, { useRef, useEffect, useState } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { Case, SubTask } from '../../types';
import { t } from '../../translations';
import { SubTaskItem } from './SubTaskItem';

interface TaskModalSubTasksPanelProps {
  task: Case;
  theme: 'light' | 'dark';
  onToggleSubTask: (subTaskId: string) => void;
  onUpdateSubTaskTitle: (subTaskId: string, newTitle: string) => void;
  onUpdateSubTaskDate: (subTaskId: string, newDate: string) => void;
  onDeleteSubTask: (subTaskId: string) => void;
  onAddSubTask: () => void;
}

export const TaskModalSubTasksPanel: React.FC<TaskModalSubTasksPanelProps> = ({
  task,
  theme,
  onToggleSubTask,
  onUpdateSubTaskTitle,
  onUpdateSubTaskDate,
  onDeleteSubTask,
  onAddSubTask,
}) => {
  const subTasksLength = task.subTasks.length;
  const prevLengthRef = useRef(subTasksLength);
  // 用 ref 存储最新添加的任务 ID，避免重复触发聚焦
  const latestAddedIdRef = useRef<string | null>(null);

  // 每当列表增长时，记录最新添加的 ID
  if (subTasksLength > prevLengthRef.current && task.subTasks.length > 0) {
    const newest = task.subTasks[task.subTasks.length - 1];
    latestAddedIdRef.current = newest.id;
  }
  prevLengthRef.current = subTasksLength;

  const focusTargetId = latestAddedIdRef.current;

  // Calculate progress
  const completedCount = task.subTasks.filter(st => st.isCompleted).length;
  const totalCount = task.subTasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 p-6 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className={theme === 'dark' ? 'text-blue-400' : 'text-blue-500'} />
          <h3 className={`text-sm font-semibold flex items-center gap-2 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
            案件执行计划 (AI Managed)
            {totalCount > 0 && (
              <span className={`text-xs font-normal ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                {completedCount}/{totalCount}
              </span>
            )}
          </h3>
        </div>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="mb-4">
          <div className={`h-1 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          {progress === 100 && (
            <p className="text-xs text-emerald-500 font-medium mt-1">
              {t.allDone}
            </p>
          )}
        </div>
      )}

      {/* SubTasks List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {task.subTasks.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full text-center gap-2 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            <span className="text-sm">暂无执行计划</span>
            <span className="text-xs">请在右侧与助理对话："帮我生成执行计划"</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {task.subTasks.map((subTask: SubTask) => (
              <SubTaskItem
                key={subTask.id}
                subTask={subTask}
                theme={theme}
                autoFocus={subTask.id === focusTargetId}
                onToggle={() => onToggleSubTask(subTask.id)}
                onTitleChange={(title) => onUpdateSubTaskTitle(subTask.id, title)}
                onDateChange={(date) => onUpdateSubTaskDate(subTask.id, date)}
                onDelete={() => onDeleteSubTask(subTask.id)}
                onEnterPress={() => onAddSubTask()}
              />
            ))}

          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className={`mt-4 pt-3 border-t text-xs flex flex-col gap-1 ${theme === 'dark' ? 'border-white/5 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
        <p>✨ 任务项由 StrategyAgent 自动生成与管理。</p>
        <p>👉 如需推进进度，请告诉助理："我已经完成了第一项任务"。</p>
      </div>
    </div>
  );
};
