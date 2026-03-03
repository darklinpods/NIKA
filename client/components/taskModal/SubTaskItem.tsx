import React from 'react';
import { CheckCircle2, Circle, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { SubTask } from '../../types';
import { formatDateOptional, isApproaching } from '../../utils/dateUtils';

/**
 * 子任务项组件属性
 */
interface SubTaskItemProps {
  /** 子任务数据 */
  subTask: SubTask;
  /** 主题模式 */
  theme: 'light' | 'dark';
  /** 语言设置 */
  lang: 'zh' | 'en';
  /** 切换完成状态 */
  onToggle: () => void;
  /** 更新标题 */
  onTitleChange: (title: string) => void;
  /** 更新日期 */
  onDateChange: (date: string) => void;
  /** 删除子任务 */
  onDelete: () => void;
  /** 回车键按下 */
  onEnterPress?: () => void;
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
}) => {
  const approaching = isApproaching(subTask.dueDate);

  /**
   * 子任务项组件
   * 显示单个子任务的信息
   * 包含完成状态、标题、日期和删除按钮
   */
  return (
    <div
      className={`group relative p-4 rounded-2xl flex items-center gap-4 border-2 transition-all duration-300 hover:scale-[1.01] ${subTask.isCompleted
        ? (theme === 'dark'
          ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
          : 'bg-emerald-50 border-emerald-200 shadow-sm shadow-emerald-500/20')
        : approaching
          ? (theme === 'dark'
            ? 'bg-rose-500/10 border-rose-500/40 shadow-[0_0_25px_rgba(244,63,94,0.15)] animate-pulse'
            : 'bg-rose-50 border-rose-300 shadow-md shadow-rose-500/20 animate-pulse')
          : (theme === 'dark'
            ? 'bg-slate-800/80 border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-800 shadow-lg shadow-black/20'
            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-lg shadow-sm')
        }`}
    >
      {/* 装饰性渐变边框效果 */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${subTask.isCompleted ? '' : approaching ? '' : 'bg-gradient-to-r from-blue-500/10 to-transparent'
        }`} />

      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`relative z-10 shrink-0 transition-transform active:scale-90 flex items-center justify-center ${subTask.isCompleted ? 'text-emerald-500' : 'text-slate-400 group-hover:text-blue-500'
          }`}
      >
        {subTask.isCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />}
      </button>

      {/* Title & Date */}
      <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
        <input
          type="text"
          value={subTask.title}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (subTask.title.trim() !== '') {
                onEnterPress?.();
              } else {
                e.currentTarget.blur();
              }
            }
          }}
          onBlur={() => {
            if (subTask.title.trim() === '') {
              onDelete();
            }
          }}
          placeholder={lang === 'zh' ? '输入任务名称...' : 'Task name...'}
          className={`flex-1 bg-transparent outline-none font-semibold text-sm transition-colors ${subTask.isCompleted
            ? 'line-through text-slate-500'
            : theme === 'dark' ? 'text-slate-100 focus:text-blue-400' : 'text-slate-700 focus:text-blue-600'
            }`}
        />

        <div className="flex items-center gap-3 shrink-0">
          <div className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${approaching
            ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
            : (theme === 'dark' ? 'bg-slate-900 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500')
            }`}>
            <CalendarIcon size={12} className={approaching ? 'text-rose-500' : 'text-slate-400'} />
            <input
              type="date"
              value={subTask.dueDate ? subTask.dueDate.split('T')[0] : ''}
              onChange={(e) => onDateChange(e.target.value)}
              className={`bg-transparent text-[11px] font-bold outline-none cursor-pointer ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
            />
          </div>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
