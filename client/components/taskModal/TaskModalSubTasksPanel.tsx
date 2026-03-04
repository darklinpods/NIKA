import React, { useRef, useEffect, useState } from 'react';
import { CheckSquare, Plus } from 'lucide-react';
import { Case, SubTask } from '../../types';
import { translations } from '../../translations';
import { SubTaskItem } from './SubTaskItem';

interface TaskModalSubTasksPanelProps {
  task: Case;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  onToggleSubTask: (subTaskId: string) => void;
  onUpdateSubTaskTitle: (subTaskId: string, newTitle: string) => void;
  onUpdateSubTaskDate: (subTaskId: string, newDate: string) => void;
  onDeleteSubTask: (subTaskId: string) => void;
  onAddSubTask: () => void;
}

export const TaskModalSubTasksPanel: React.FC<TaskModalSubTasksPanelProps> = ({
  task,
  theme,
  lang,
  onToggleSubTask,
  onUpdateSubTaskTitle,
  onUpdateSubTaskDate,
  onDeleteSubTask,
  onAddSubTask,
}) => {
  const t = translations[lang];
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

  // 消费最新 ID（只用一次，取完即清）
  const consumeLatestId = () => {
    const id = latestAddedIdRef.current;
    latestAddedIdRef.current = null;
    return id;
  };
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
          <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
            {t.subTasks}
            {totalCount > 0 && (
              <span className={`ml-2 text-xs font-normal ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                {completedCount}/{totalCount}
              </span>
            )}
          </h3>
        </div>
        <button
          onClick={onAddSubTask}
          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md transition-all ${theme === 'dark'
            ? 'text-blue-400 hover:bg-blue-500/10'
            : 'text-blue-500 hover:bg-blue-50'
            }`}
        >
          <Plus size={13} />
          {lang === 'zh' ? '添加' : 'Add'}
        </button>
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
              {lang === 'zh' ? '🎉 全部完成！' : '🎉 All done!'}
            </p>
          )}
        </div>
      )}

      {/* SubTasks List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {task.subTasks.length === 0 ? (
          <div
            className={`flex items-center gap-2 py-2 pl-1.5 cursor-pointer rounded-md transition-colors ${theme === 'dark' ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'
              }`}
            onClick={onAddSubTask}
          >
            <Plus size={14} />
            <span className="text-sm">{lang === 'zh' ? '添加待办事项' : 'Add a to-do item'}</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {task.subTasks.map((subTask: SubTask) => (
              <SubTaskItem
                key={subTask.id}
                subTask={subTask}
                theme={theme}
                lang={lang}
                autoFocus={subTask.id === focusTargetId}
                onToggle={() => onToggleSubTask(subTask.id)}
                onTitleChange={(title) => onUpdateSubTaskTitle(subTask.id, title)}
                onDateChange={(date) => onUpdateSubTaskDate(subTask.id, date)}
                onDelete={() => onDeleteSubTask(subTask.id)}
                onEnterPress={() => onAddSubTask()}
              />
            ))}

            {/* Quick-add row at bottom */}
            <div
              className={`flex items-center gap-2 py-1 pl-1.5 mt-1 cursor-pointer rounded-md transition-colors opacity-0 hover:opacity-100 ${theme === 'dark' ? 'text-slate-600 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'
                }`}
              onClick={onAddSubTask}
            >
              <Plus size={13} />
              <span className="text-xs">{lang === 'zh' ? '添加事项' : 'Add item'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className={`mt-4 pt-3 border-t text-xs ${theme === 'dark' ? 'border-white/5 text-slate-600' : 'border-slate-100 text-slate-400'}`}>
        {lang === 'zh'
          ? '按 Enter 快速添加 · 按 Backspace 删除空事项'
          : 'Enter to add · Backspace to remove empty item'}
      </div>
    </div>
  );
};
