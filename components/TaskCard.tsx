
import React, { useState, useRef, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Case } from '../types';
import { PRIORITY_BORDER_COLORS } from '../constants';
import { Calendar, MoreVertical, Sparkles, Copy, ArrowRight, Archive, Loader2, X, MessageSquareText, CheckCircle2 } from 'lucide-react';
import { translations } from '../translations';
import { summarizeTask } from '../services/geminiService';

interface TaskCardProps {
  task: Case; 
  index: number;
  onEdit: (task: Case) => void;
  theme: 'light' | 'dark';
  lang: 'en' | 'zh';
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index, onEdit, theme, lang }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const t = translations[lang];

  const completedCount = task.subTasks.filter(st => st.isCompleted).length;
  const totalCount = task.subTasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleAiSummary = async (e: React.MouseEvent) => {
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
  };

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onEdit(task)}
          className={`group relative border rounded-xl p-4 flex flex-col justify-between min-w-[240px] max-w-[240px] transition-all duration-300 cursor-pointer border-l-[4px] shrink-0 ${
            PRIORITY_BORDER_COLORS[task.priority]
          } ${
            theme === 'dark' 
              ? 'bg-slate-900 border-white/5 hover:border-indigo-500/50 hover:shadow-[0_10px_30px_-10px_rgba(99,102,241,0.25)]' 
              : 'bg-white border-slate-200 hover:border-indigo-200 shadow-sm hover:shadow-md'
          } ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-indigo-500/50 z-50 scale-105' : ''}`}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1">
               <h4 className={`font-bold text-[14px] leading-tight line-clamp-2 pr-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
                 {task.title}
               </h4>
            </div>
            <div className="relative" ref={menuRef}>
              <button onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }} className="p-1 text-slate-400 hover:text-indigo-400">
                <MoreVertical size={14} />
              </button>
              {isMenuOpen && (
                <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-2xl z-[100] overflow-hidden backdrop-blur-md ${theme === 'dark' ? 'bg-slate-900/95 border-white/10' : 'bg-white/95 border-slate-200'}`}>
                  <button onClick={handleAiSummary} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[11px] font-bold hover:bg-indigo-500/10">
                    <Sparkles size={14} /> {t.aiSummary}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(task.id); setIsMenuOpen(false); }} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[11px] font-bold hover:bg-slate-500/10 border-t border-white/5">
                    <Copy size={14} /> {t.copyCaseId}
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-3 mb-4">
             <div className="flex justify-between items-end mb-1.5">
                <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {t.progress}: {completedCount}/{totalCount}
                </span>
                <span className="text-[10px] font-bold text-indigo-500">{Math.round(progress)}%</span>
             </div>
             <div className={`h-1.5 w-full rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div 
                   className="h-full bg-indigo-500 rounded-full transition-all duration-500 ease-out"
                   style={{ width: `${progress}%` }}
                />
             </div>
          </div>

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
             <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                  {task.clientName}
                </span>
             </div>
             <div className="flex gap-1">
                {task.tags.slice(0, 1).map(tag => (
                   <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-bold">
                     {tag}
                   </span>
                ))}
             </div>
          </div>

          {summary && (
            <div className="absolute inset-x-0 -top-2 translate-y-[-100%] z-[60] p-4 bg-indigo-600 text-white rounded-2xl shadow-2xl animate-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold tracking-widest">{t.summaryTitle}</span>
                <button onClick={(e) => { e.stopPropagation(); setSummary(null); }}><X size={14} /></button>
              </div>
              <p className="text-[11px] leading-relaxed italic">"{summary}"</p>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
};

export default TaskCard;
