import React, { useState, useCallback, useMemo } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Case } from '../types';
import { getPriorityBorderColor } from '../constants/priorities';
import { MoreVertical } from 'lucide-react';
import { translations } from '../translations';
import { summarizeTask } from '../services/geminiService';
import { TaskTitle } from './taskCard/TaskTitle';
import { ProgressBar } from './taskCard/ProgressBar';
import { TaskFooter } from './taskCard/TaskFooter';
import { TaskMenu } from './taskCard/TaskMenu';
import { SummaryPanel } from './taskCard/SummaryPanel';
import { useAppContext } from '../providers/AppProvider';

interface TaskCardProps {
  task: Case;
  index: number;
  theme: 'light' | 'dark';
  lang: 'en' | 'zh';
}

const TaskCard: React.FC<TaskCardProps> = ({
  task, index, theme, lang
}) => {
  const {
    setEditingTask, handleDeleteCase, handleGeneratePlan, handleUpdatePriority, handleMoveStage
  } = useAppContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const t = translations[lang];

  // 计算进度相关数据
  const progressData = useMemo(() => {
    const completedCount = task.subTasks.filter(st => st.isCompleted).length;
    const totalCount = task.subTasks.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
    return { completedCount, totalCount, progress };
  }, [task.subTasks]);

  // AI 摘要处理
  const handleAiSummary = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    setIsSummarizing(true);
    try {
      const res = await summarizeTask(task.title, task.description, lang);
      setSummary(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSummarizing(false);
    }
  }, [task.title, task.description, lang]);

  // 复制 ID 处理
  const handleCopyId = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(task.id);
    setIsMenuOpen(false);
  }, [task.id]);

  // 关闭摘要
  const handleCloseSummary = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSummary(null);
  }, []);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleDeleteCase(task.id);
    setIsMenuOpen(false);
  }, [handleDeleteCase, task.id]);

  const handleGenPlan = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleGeneratePlan(task.id);
    setIsMenuOpen(false);
  }, [handleGeneratePlan, task.id]);

  const handleUpdatePrio = useCallback((e: React.MouseEvent, priority: string) => {
    e.stopPropagation();
    handleUpdatePriority(task.id, priority);
    setIsMenuOpen(false);
  }, [handleUpdatePriority, task.id]);

  const handleMove = useCallback((e: React.MouseEvent, direction: 'next' | 'prev') => {
    e.stopPropagation();
    handleMoveStage(task.id, direction);
    setIsMenuOpen(false);
  }, [handleMoveStage, task.id]);

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => setEditingTask(task)}
          className={`group relative border rounded-xl p-4 flex flex-col justify-between min-w-[240px] max-w-[240px] transition-all duration-300 cursor-pointer border-l-[4px] shrink-0 ${getPriorityBorderColor(task.priority)
            } ${theme === 'dark'
              ? 'bg-slate-900 border-white/5 hover:border-indigo-500/50 hover:shadow-[0_10px_30px_-10px_rgba(99,102,241,0.25)]'
              : 'bg-white border-slate-200 hover:border-indigo-200 shadow-sm hover:shadow-md'
            } ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-indigo-500/50 z-50 scale-105' : ''}`}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
              <TaskTitle title={task.title} theme={theme} />
            </div>
            <div className="relative">
              <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className="p-1 text-slate-400 hover:text-indigo-400">
                <MoreVertical size={14} />
              </button>
              <TaskMenu
                isOpen={isMenuOpen}
                theme={theme}
                onAiSummary={handleAiSummary}
                onCopyId={handleCopyId}
                onDelete={handleDelete}
                onGeneratePlan={handleGenPlan}
                onUpdatePriority={handleUpdatePrio}
                onMoveStage={handleMove}
                currentStatus={task.status}
                t={t}
              />
            </div>
          </div>

          <ProgressBar
            progress={progressData.progress}
            completedCount={progressData.completedCount}
            totalCount={progressData.totalCount}
            theme={theme}
            t={t}
          />

          <TaskFooter
            progress={progressData.progress}
            clientName={task.clientName}
            tags={task.tags}
            theme={theme}
          />

          {summary && (
            <SummaryPanel
              summary={summary}
              t={t}
              onClose={handleCloseSummary}
            />
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
