import React from 'react';
import { Case, Priority } from '../../types';
import { translations } from '../../translations';
import { getPriorityLabel } from '../../constants/priorities';

/**
 * 任务模态框信息面板组件属性
 */
interface TaskModalInfoPanelProps {
  /** 任务数据 */
  task: Case;
  /** 主题模式 */
  theme: 'light' | 'dark';
  /** 语言设置 */
  lang: 'zh' | 'en';
  /** 任务变更回调 */
  onTaskChange: (task: Case) => void;
  /** 生成AI概况 */
  onGenerateOverview: () => void;
  /** 是否正在生成概况 */
  isOverviewGenerating: boolean;
}

export const TaskModalInfoPanel: React.FC<TaskModalInfoPanelProps> = ({
  task,
  theme,
  lang,
  onTaskChange,
  onGenerateOverview,
  isOverviewGenerating
}) => {
  const t = translations[lang];

  /**
   * 任务模态框信息面板组件
   * 显示和编辑任务的基本信息
   * 包含标题、优先级、客户名称、描述和AI概况
   */
  return (
    <div className={`w-[35%] border-r p-8 flex flex-col ${theme === 'dark' ? 'bg-slate-950/50 border-white/5' : 'bg-slate-50 border-slate-100'
      }`}>
      {/* Task Title */}
      <div className="mb-6">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
          {t.taskTitle}
        </label>
        <input
          className={`w-full bg-transparent border-b font-bold text-base py-1 outline-none transition-colors ${theme === 'dark'
              ? 'border-white/10 text-slate-100 focus:border-indigo-500'
              : 'border-slate-200 focus:border-indigo-500'
            }`}
          value={task.title}
          onChange={(e) => onTaskChange({ ...task, title: e.target.value })}
        />
      </div>

      {/* Priority, Status, and Client Name */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
            {t.priority}
          </label>
          <select
            className={`w-full bg-transparent border-b text-sm font-medium py-1 outline-none ${theme === 'dark' ? 'border-white/10 text-slate-100' : 'border-slate-200'
              }`}
            value={task.priority}
            onChange={(e) => onTaskChange({ ...task, priority: e.target.value as Priority })}
          >
            <option value="low">{getPriorityLabel('low', lang)}</option>
            <option value="medium">{getPriorityLabel('medium', lang)}</option>
            <option value="high">{getPriorityLabel('high', lang)}</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
            {(t as any).currentStage || "Current Stage"}
          </label>
          <select
            className={`w-full bg-transparent border-b text-sm font-medium py-1 outline-none ${theme === 'dark' ? 'border-white/10 text-slate-100' : 'border-slate-200'
              }`}
            value={task.status || 'todo'}
            onChange={(e) => onTaskChange({ ...task, status: e.target.value as any })}
          >
            <option value="todo">{t.backlog}</option>
            <option value="in-progress">{t.inProgress}</option>
            <option value="done">{t.done}</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
            {t.clientName}
          </label>
          <input
            className={`w-full bg-transparent border-b text-sm font-medium py-1 outline-none ${theme === 'dark' ? 'border-white/10 text-slate-100' : 'border-slate-200'
              }`}
            value={task.clientName}
            onChange={(e) => onTaskChange({ ...task, clientName: e.target.value })}
          />
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">
          {t.description}
        </label>
        <textarea
          rows={4}
          className={`w-full p-3 rounded-xl text-xs border outline-none resize-none transition-all ${theme === 'dark'
              ? 'bg-slate-950 border-white/5 text-slate-300 focus:border-indigo-500/50'
              : 'bg-white border-slate-100 focus:border-indigo-300'
            }`}
          value={task.description}
          onChange={(e) => onTaskChange({ ...task, description: e.target.value })}
        />
      </div>

      {/* AI Overview Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {t.aiOverview}
          </label>
          <button
            onClick={onGenerateOverview}
            disabled={isOverviewGenerating}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isOverviewGenerating
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-indigo-500/20'
              } ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}
          >
            {isOverviewGenerating ? (
              <>
                <span className="animate-spin">⟳</span>
                {t.summarizing}
              </>
            ) : (
              <>
                {t.generateOverview}
              </>
            )}
          </button>
        </div>
        <div className={`flex-1 p-4 rounded-xl border overflow-y-auto custom-scrollbar ${theme === 'dark' ? 'bg-slate-950 border-white/5' : 'bg-white border-slate-100'
          }`}>
          {task.aiSummary ? (
            <p className={`text-xs leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
              {task.aiSummary}
            </p>
          ) : (
            <p className={`text-xs italic ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
              {lang === 'zh' ? '点击上方按钮生成 AI 案件概况' : 'Click the button above to generate AI overview'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
