import React, { useRef, useEffect } from 'react';
import { CheckCircle2, Circle, Calendar as CalendarIcon, X } from 'lucide-react';
import { SubTask } from '../../types';
import { isApproaching } from '../../utils/dateUtils';
import { translations } from '../../translations';

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
  const t = translations[lang] as any;
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
      {/* Checkbox (Read Only visual hint for user) */}
      <button
        className={`relative z-10 shrink-0 transition-all flex items-center justify-center cursor-default ${subTask.isCompleted ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
          }`}
      >
        {subTask.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>

      {/* Title */}
      <span
        className={`flex-1 bg-transparent text-[13px] px-0 py-0.5 ${subTask.isCompleted
          ? 'line-through text-slate-400 dark:text-slate-600'
          : theme === 'dark'
            ? 'text-slate-200'
            : 'text-slate-700'
          }`}
      >
        {subTask.title || t.enterTaskTitle}
      </span>

      {/* Right side: date */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Date picker display-only */}
        {subTask.dueDate && (
          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] ${approaching
            ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/10'
            : 'text-slate-400 bg-slate-100 dark:bg-slate-700'
            }`}
          >
            <CalendarIcon size={11} />
            <span
              className={`text-[11px] font-medium w-[90px] px-0 py-0 ${approaching ? 'text-rose-500' : theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}
            >
              {subTask.dueDate.split('T')[0]}
            </span>
          </div>
        )}
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
