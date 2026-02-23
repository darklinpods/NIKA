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
    <div className="group flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`shrink-0 transition-all ${subTask.isCompleted ? 'text-blue-500' : 'text-slate-400 hover:text-blue-500'
          }`}
      >
        {subTask.isCompleted ? <CheckCircle2 size={18} /> : <Circle size={18} />}
      </button>

      {/* Title Input */}
      <div className="flex-1 min-w-0">
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
          className={`w-full bg-transparent outline-none text-sm ${subTask.isCompleted
            ? 'line-through text-slate-400'
            : theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
            }`}
        />
      </div>

      {/* Date Input */}
      <div className="flex items-center gap-3 shrink-0">
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border ${approaching
          ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
          : (theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500')
          }`}>
          <CalendarIcon size={12} />
          <input
            type="date"
            value={subTask.dueDate ? subTask.dueDate.split('T')[0] : ''}
            onChange={(e) => onDateChange(e.target.value)}
            className={`bg-transparent outline-none ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
          />
        </div>

        {/* Delete Button */}
        <button
          onClick={onDelete}
          className="p-1.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
