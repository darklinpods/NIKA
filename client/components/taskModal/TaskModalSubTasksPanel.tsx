import React, { useRef, useEffect } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import { Case, SubTask } from '../../types';
import { translations } from '../../translations';
import { SubTaskItem } from './SubTaskItem';

/**
 * 任务模态框子任务面板组件属性
 */
interface TaskModalSubTasksPanelProps {
  /** 任务数据 */
  task: Case;
  /** 主题模式 */
  theme: 'light' | 'dark';
  /** 语言设置 */
  lang: 'zh' | 'en';
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

  /**
   * 任务模态框子任务面板组件
   * 显示和管理任务的所有子任务
   * 包含进度条和子任务列表
   */
  const subTasksLength = task.subTasks.length;
  const prevLengthRef = useRef(subTasksLength);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (subTasksLength > prevLengthRef.current) {
      setTimeout(() => {
        if (containerRef.current) {
          const inputs = containerRef.current.querySelectorAll<HTMLInputElement>('input[type="text"]');
          if (inputs.length > 0) {
            inputs[inputs.length - 1].focus();
          }
        }
      }, 50);
    }
    prevLengthRef.current = subTasksLength;
  }, [subTasksLength]);

  // Calculate progress
  const completedCount = task.subTasks.filter(st => st.isCompleted).length;
  const totalCount = task.subTasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 p-8 flex flex-col min-w-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-500">
            <Sparkles size={18} />
          </div>
          <h3 className="text-base font-bold">{t.subTasks}</h3>
        </div>
        <button
          onClick={onAddSubTask}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${theme === 'dark'
            ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
            }`}
        >
          <Plus size={14} />
          {t.addTaskItem}
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
            {t.progress}
          </span>
          <span className={`font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
            {progress}%
          </span>
        </div>
        <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'
          }`}>
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* SubTasks List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar" ref={containerRef}>
        {task.subTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              {lang === 'zh' ? '暂无任务，点击上方按钮添加' : 'No tasks yet, click button above to add'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {task.subTasks.map((subTask: SubTask) => (
              <SubTaskItem
                key={subTask.id}
                subTask={subTask}
                theme={theme}
                lang={lang}
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

      {/* Footer */}
      <div className="mt-6 pt-6 border-t border-white/5">
        <p className={`text-sm text-slate-500 ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
          {lang === 'zh'
            ? '点击任务名称或日期即可修改，红色标签表示即刻到期'
            : 'Click task name or date to edit. Red label indicates due soon'}
        </p>
      </div>
    </div>
  );
};
