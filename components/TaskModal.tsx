import React from 'react';
import { Gavel, Sparkles, Loader2, X, CheckCircle2, Circle, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { Case, Priority, SubTask } from '../types';
import { translations } from '../translations';
import { formatDateOptional, isApproaching } from '../utils/dateUtils';

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
  const t = translations[lang];

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-200">
      <div className={`w-full max-w-7xl rounded-3xl shadow-2xl overflow-hidden border flex h-[90vh] animate-in zoom-in-95 duration-200 ${theme === 'dark' ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>

        {/* Left Panel: Primary Info & AI Overview */}
        <div className={`w-[35%] border-r p-8 flex flex-col ${theme === 'dark' ? 'bg-slate-950/50 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><Gavel size={24} /></div>
            <h2 className="text-xl font-black tracking-tight flex-1 line-clamp-1">{task.title}</h2>
          </div>

          <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t.taskTitle}</label>
              <input
                className={`w-full bg-transparent border-b font-bold text-base py-1 outline-none transition-colors ${theme === 'dark' ? 'border-white/10 text-slate-100 focus:border-indigo-500' : 'border-slate-200 focus:border-indigo-500'}`}
                value={task.title}
                onChange={(e) => onTaskChange({...task, title: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t.priority}</label>
                <select
                  className={`w-full bg-transparent border-b text-sm font-medium py-1 outline-none ${theme === 'dark' ? 'border-white/10 text-slate-100' : 'border-slate-200'}`}
                  value={task.priority}
                  onChange={(e) => onTaskChange({...task, priority: e.target.value as Priority})}
                >
                  <option value="low">{t.low}</option>
                  <option value="medium">{t.medium}</option>
                  <option value="high">{t.high}</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t.clientName}</label>
                <input
                  className={`w-full bg-transparent border-b text-sm font-medium py-1 outline-none ${theme === 'dark' ? 'border-white/10 text-slate-100' : 'border-slate-200'}`}
                  value={task.clientName}
                  onChange={(e) => onTaskChange({...task, clientName: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t.description}</label>
              <textarea
                rows={4}
                className={`w-full p-3 rounded-xl text-xs border outline-none resize-none transition-all ${theme === 'dark' ? 'bg-slate-950 border-white/5 text-slate-300 focus:border-indigo-500/50' : 'bg-white border-slate-100 focus:border-indigo-300'}`}
                value={task.description}
                onChange={(e) => onTaskChange({...task, description: e.target.value})}
              />
            </div>

            {/* AI CASE OVERVIEW SECTION */}
            <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-[11px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                  <Sparkles size={14} /> {t.aiOverview}
                </h4>
                <button
                  onClick={onGenerateOverview}
                  disabled={isOverviewGenerating}
                  className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 disabled:opacity-50"
                >
                  {isOverviewGenerating ? <Loader2 size={12} className="animate-spin" /> : t.generateOverview}
                </button>
              </div>
              <div className={`text-[11px] leading-relaxed italic ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                {task.aiSummary || (lang === 'zh' ? '点击上方按钮生成案件深度概况...' : 'Click button above to generate case overview...')}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{t.tags}</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {task.tags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 text-[10px] font-bold border border-white/5">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/5 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors uppercase tracking-widest text-[10px]">{t.cancel}</button>
            <button onClick={onSave} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all uppercase tracking-widest text-[10px]">{t.saveChanges}</button>
          </div>
        </div>

        {/* Right Panel: Procedural Steps with Editing Support */}
        <div className="flex-1 p-10 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-2xl font-bold">{t.subTasks}</h3>
              <p className="text-sm text-slate-500 mt-1">{lang === 'zh' ? '点击任务名称或日期即可修改，红色标签表示即刻到期' : 'Click task name or date to edit. Red indicates approaching deadline.'}</p>
            </div>
            <button className="p-2 text-slate-400 hover:text-rose-500 transition-colors" onClick={onClose}><X size={32} /></button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-4">
            {task.subTasks.map(st => {
              const approaching = isApproaching(st.dueDate);
              return (
                <div
                  key={st.id}
                  className={`group p-4 rounded-2xl flex items-center gap-4 border transition-all ${
                    st.isCompleted
                      ? (theme === 'dark' ? 'bg-slate-900/30 border-slate-800' : 'bg-slate-50 border-slate-200')
                      : (theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')
                  }`}
                >
                  <button
                    onClick={() => onToggleSubTask(st.id)}
                    className="shrink-0"
                  >
                    {st.isCompleted ? <CheckCircle2 size={24} className="text-emerald-500" /> : <Circle size={24} className={approaching ? "text-rose-500" : "text-slate-300"} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={st.title}
                      onChange={(e) => onUpdateSubTaskTitle(st.id, e.target.value)}
                      className={`w-full bg-transparent font-medium text-sm outline-none transition-colors ${
                        st.isCompleted
                          ? 'line-through text-slate-400'
                          : (theme === 'dark' ? 'text-slate-100' : 'text-slate-900')
                      }`}
                      disabled={st.isCompleted}
                    />
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border ${
                      approaching
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                        : (theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500')
                    }`}>
                      <CalendarIcon size={12} />
                      <input
                        type="date"
                        value={st.dueDate || ''}
                        onChange={(e) => onUpdateSubTaskDate(st.id, e.target.value)}
                        className={`bg-transparent outline-none ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}
                      />
                    </div>
                    <button
                      onClick={() => onDeleteSubTask(st.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={onAddSubTask}
            className="mt-6 w-full py-3 rounded-xl border-2 border-dashed font-bold text-sm transition-all hover:border-indigo-500 hover:text-indigo-500 dark:border-slate-700 dark:hover:border-indigo-500 dark:hover:text-indigo-500"
          >
            + {t.addTask}
          </button>
        </div>
      </div>
    </div>
  );
};
