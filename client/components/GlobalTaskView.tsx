import React, { useMemo } from 'react';
import { Case, SubTask } from '../types';
import { t } from '../translations';
import { CheckCircle2, Circle, Clock, AlertCircle, Calendar, Briefcase, ChevronRight, Zap } from 'lucide-react';
import { formatDateOptional, isApproaching, isOverdue } from '../utils/dateUtils';
import { useAppContext } from '../providers/AppProvider';

interface TaskWithParent {
  task: SubTask;
  parent: Case;
}

interface GlobalTaskViewProps {
  theme: 'light' | 'dark';
}

const GlobalTaskView: React.FC<GlobalTaskViewProps> = ({ theme }) => {
  const { data, toggleSubTask, setEditingTask } = useAppContext();
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));

  const groupedTasks = useMemo(() => {
    const overdue: TaskWithParent[] = [];
    const today: TaskWithParent[] = [];
    const upcoming: TaskWithParent[] = [];
    const completed: TaskWithParent[] = [];

    Object.values(data.tasks).forEach((caseObj: Case) => {
      caseObj.subTasks.forEach((st) => {
        const item = { task: st, parent: caseObj };
        if (st.isCompleted) {
          completed.push(item);
        } else if (st.dueDate) {
          if (isOverdue(st.dueDate)) {
            overdue.push(item);
          } else if (new Date(st.dueDate) <= todayEnd) {
            today.push(item);
          } else {
            upcoming.push(item);
          }
        } else {
          upcoming.push(item);
        }
      });
    });

    const sortByDate = (a: TaskWithParent, b: TaskWithParent) => {
      if (!a.task.dueDate) return 1;
      if (!b.task.dueDate) return -1;
      return new Date(a.task.dueDate).getTime() - new Date(b.task.dueDate).getTime();
    };

    return {
      overdue: overdue.sort(sortByDate),
      today: today.sort(sortByDate),
      upcoming: upcoming.sort(sortByDate),
      completed: completed.sort((a, b) => b.task.id.localeCompare(a.task.id))
    };
  }, [data]);

  const renderSection = (title: string, tasks: TaskWithParent[], icon: React.ReactNode, color: string) => {
    if (tasks.length === 0) return null;
    return (
      <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-2 mb-4">
          <div className={`${color} p-1.5 rounded-lg text-white shadow-sm`}>{icon}</div>
          <h3 className="text-sm font-bold uppercase tracking-widest">{title}</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${theme === 'dark' ? 'bg-white/5 text-slate-500' : 'bg-slate-200 text-slate-600'}`}>
            {tasks.length}
          </span>
        </div>
        <div className="space-y-2">
          {tasks.map(({ task, parent }) => {
            const approaching = isApproaching(task.dueDate);
            return (
              <div
                key={task.id}
                className={`group flex items-center justify-between p-4 rounded-2xl border transition-all ${theme === 'dark'
                  ? `bg-slate-900/50 border-white/5 hover:border-indigo-500/30 hover:bg-slate-900 ${approaching ? 'border-rose-500/40 ring-1 ring-rose-500/10 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : ''}`
                  : `bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md ${approaching ? 'border-rose-200 bg-rose-50/30' : ''}`
                  }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => toggleSubTask(parent.id, task.id)}
                    className="transition-transform active:scale-90"
                  >
                    {task.isCompleted ? (
                      <CheckCircle2 size={22} className="text-emerald-500" />
                    ) : (
                      <Circle size={22} className={color === 'bg-rose-500' || approaching ? 'text-rose-400' : 'text-slate-400'} />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className={`text-sm font-semibold ${task.isCompleted ? 'line-through text-slate-500' : ''}`}>
                        {task.title}
                      </p>
                      {approaching && !task.isCompleted && (
                        <span className="flex items-center gap-1 text-[9px] font-black text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase">
                          <Zap size={10} /> {t.approaching}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <button
                        onClick={() => setEditingTask(parent)}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-500 hover:underline"
                      >
                        <Briefcase size={12} />
                        {parent.title}
                      </button>
                      {task.dueDate && (
                        <div className={`flex items-center gap-1 text-[10px] font-bold ${(color === 'bg-rose-500' || approaching) && !task.isCompleted ? 'text-rose-500' : 'text-slate-500'}`}>
                          <Calendar size={12} />
                          {formatDateOptional(task.dueDate)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setEditingTask(parent)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-500 transition-all"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto py-4">
      <div className="mb-12">
        <h2 className="text-2xl font-bold">{t.taskView}</h2>
        <p className="text-sm text-slate-500 mt-1">根据截止日期汇总的所有案件待办事项</p>
      </div>

      {renderSection(t.overdue, groupedTasks.overdue, <AlertCircle size={14} />, "bg-rose-500")}
      {renderSection(t.today, groupedTasks.today, <Clock size={14} />, "bg-amber-500")}
      {renderSection(t.upcoming, groupedTasks.upcoming, <Calendar size={14} />, "bg-indigo-500")}
      {renderSection(t.completed, groupedTasks.completed, <CheckCircle2 size={14} />, "bg-emerald-500")}

      {Object.values(groupedTasks).every((arr: any) => arr.length === 0) && (
        <div className="text-center py-20 opacity-50">
          <Briefcase size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="font-medium">{t.noTasks}</p>
        </div>
      )}
    </div>
  );
};

export default GlobalTaskView;
