import React, { useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Calendar as CalendarIcon, X } from 'lucide-react';
import { SubTask } from '../../types';
import { isApproaching } from '../../utils/dateUtils';

/**
 * 子任务项组件属性
 */
interface SubTaskItemProps {
  subTask: SubTask;
  theme: 'light' | 'dark';
  lang: 'zh' | 'en';
  onToggle: () => void;
  onTitleChange: (title: string) => void;
  onDateChange: (date: string) => void;
  onDelete: () => void;
  onEnterPress?: () => void;
  /** 是否聚焦（新增时） */
  autoFocus?: boolean;
}

export const SubTaskItem: React.FC<SubTaskItemProps> = ({
  subTask,
  theme,
  lang,
  onToggle,
  onTitleChange,
  onDateChange,
  onDelete,
  onEnterPress,
  autoFocus,
}) => {
  const approaching = isApproaching(subTask.dueDate);
  const inputRef = useRef<HTMLInputElement>(null);

  // 当 autoFocus 为 true 时（新增任务），主动聚焦输入框
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // 稍微延迟以确保 DOM 已完成渲染
      const timer = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  return (
    <div className="group relative py-1 pl-1.5 flex items-center gap-2 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-md">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`relative z-10 shrink-0 transition-all flex items-center justify-center hover:scale-110 active:scale-95 ${subTask.isCompleted ? 'text-emerald-500' : 'text-slate-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400'
          }`}
      >
        {subTask.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>

      {/* Title */}
      <input
        ref={inputRef}
        type="text"
        value={subTask.title}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onEnterPress?.();
          } else if (e.key === 'Backspace' && subTask.title === '') {
            e.preventDefault();
            onDelete();
          }
        }}
        placeholder={lang === 'zh' ? '待办事项...' : 'To-do item...'}
        className={`flex-1 bg-transparent !border-none !ring-0 !shadow-none !outline-none text-[13px] transition-colors px-0 py-0.5 ${subTask.isCompleted
          ? 'line-through text-slate-400 dark:text-slate-600'
          : theme === 'dark'
            ? 'text-slate-200 placeholder-slate-600'
            : 'text-slate-700 placeholder-slate-400'
          }`}
      />

      {/* Right side: date + delete */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Date picker */}
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] cursor-pointer transition-colors ${approaching
          ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/10'
          : 'text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700'
          }`}
          onClick={() => inputRef.current?.blur()}
        >
          <CalendarIcon size={11} />
          <input
            type="date"
            value={subTask.dueDate ? subTask.dueDate.split('T')[0] : ''}
            onChange={(e) => onDateChange(e.target.value)}
            className={`bg-transparent !border-none !ring-0 !shadow-none !outline-none text-[11px] font-medium cursor-pointer w-[90px] px-0 py-0 ${approaching ? 'text-rose-500' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}
          />
        </div>

        {/* Delete */}
        <button
          onClick={onDelete}
          title={lang === 'zh' ? '删除' : 'Delete'}
          className="p-0.5 rounded text-slate-300 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Date badge when not hovering (if date set) */}
      {subTask.dueDate && (
        <div className={`shrink-0 text-[11px] font-medium group-hover:opacity-0 transition-opacity ${approaching ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'
          }`}>
          {new Date(subTask.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
        </div>
      )}
    </div>
  );
};
