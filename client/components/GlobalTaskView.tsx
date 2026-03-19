import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Case, SubTask } from '../types';
import { t } from '../translations';
import { CheckCircle2, Circle, Clock, AlertCircle, Calendar, Briefcase, ChevronRight, Zap, X, RotateCcw, History } from 'lucide-react';
import { formatDateOptional, isApproaching, isOverdue } from '../utils/dateUtils';
import { useAppContext } from '../providers/AppProvider';
import { fetchOperationLogs, deleteOperationLog } from '../services/api';

interface TaskWithParent {
  task: SubTask;
  parent: Case;
}

interface OperationLog {
  id: string;
  action: string;
  caseId: string;
  caseTitle: string;
  subTaskId: string;
  subTaskTitle: string;
  createdAt: string;
}

interface GlobalTaskViewProps {
  theme: 'light' | 'dark';
}

const GlobalTaskView: React.FC<GlobalTaskViewProps> = ({ theme }) => {
  const { data, toggleSubTask, setEditingTask, loadData } = useAppContext();
  const now = new Date();
  const todayStart = new Date(now.setHours(0, 0, 0, 0));
  const todayEnd = new Date(now.setHours(23, 59, 59, 999));

  // 操作记录状态
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // 加载操作记录
  const loadLogs = useCallback(async () => {
    try {
      setLogsLoading(true);
      const res = await fetchOperationLogs();
      if (res.success) setOperationLogs(res.data);
    } catch (e) {
      console.error('Failed to load operation logs', e);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // 监听 data 变化时自动刷新日志（子任务 toggle 后 data 会更新）
  useEffect(() => {
    loadLogs();
  }, [data, loadLogs]);

  // 撤销操作记录
  const handleRevertLog = useCallback(async (logId: string) => {
    try {
      const res = await deleteOperationLog(logId);
      if (res.success) {
        setOperationLogs(prev => prev.filter(l => l.id !== logId));
        // 刷新看板数据以反映回滚后的子任务状态
        loadData();
      }
    } catch (e) {
      console.error('Failed to revert operation', e);
    }
  }, [loadData]);

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffHour < 24) return `${diffHour}小时前`;
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

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
    <div className="flex gap-8">
      {/* 左侧：任务列表主体 */}
      <div className="flex-1 min-w-0">
        <div className="max-w-4xl py-4">
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
      </div>

      {/* 右侧：操作记录面板 */}
      <div className={`w-80 shrink-0 py-4`}>
        <div className={`sticky top-4 rounded-2xl border p-5 ${theme === 'dark'
          ? 'bg-slate-900/60 border-white/5 backdrop-blur-sm'
          : 'bg-white border-slate-100 shadow-sm'
          }`}
        >
          {/* 面板标题 */}
          <div className="flex items-center gap-2 mb-5">
            <div className="bg-violet-500 p-1.5 rounded-lg text-white shadow-sm">
              <History size={14} />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-widest">操作记录</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${theme === 'dark' ? 'bg-white/5 text-slate-500' : 'bg-slate-200 text-slate-600'}`}>
              {operationLogs.length}
            </span>
          </div>

          {/* 操作记录列表 */}
          <div className="space-y-1 max-h-[calc(100vh-220px)] overflow-y-auto custom-scrollbar">
            {operationLogs.length === 0 && (
              <div className="text-center py-10 opacity-40">
                <RotateCcw size={28} className="mx-auto mb-2 text-slate-400" />
                <p className="text-xs font-medium">暂无操作记录</p>
              </div>
            )}
            {operationLogs.map((log) => (
              <div
                key={log.id}
                className={`group/log relative flex items-start gap-3 p-3 rounded-xl cursor-default transition-all duration-200 ${theme === 'dark'
                  ? 'hover:bg-white/5'
                  : 'hover:bg-slate-50'
                  }`}
              >
                {/* 操作类型图标 */}
                <div className={`mt-0.5 shrink-0 ${log.action === 'toggle_complete' ? 'text-emerald-500' : 'text-amber-500'}`}>
                  {log.action === 'toggle_complete' ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <Circle size={16} />
                  )}
                </div>

                {/* 操作详情 */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
                    {log.action === 'toggle_complete' ? '完成' : '取消完成'}：{log.subTaskTitle}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    {log.caseTitle}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {formatTime(log.createdAt)}
                  </p>
                </div>

                {/* 悬浮显示的 X 按钮 */}
                <button
                  onClick={() => handleRevertLog(log.id)}
                  className={`absolute right-2 top-2 opacity-0 group-hover/log:opacity-100 p-1 rounded-lg transition-all duration-200 ${theme === 'dark'
                    ? 'hover:bg-white/10 text-slate-400 hover:text-rose-400'
                    : 'hover:bg-slate-200 text-slate-400 hover:text-rose-500'
                    }`}
                  title="撤销此操作"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalTaskView;
