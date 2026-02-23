import React, { useRef, useEffect } from 'react';
import { Sparkles, Copy, ArrowRight, ArrowLeft, ClipboardList, Trash2, Flag } from 'lucide-react';

interface TaskMenuProps {
  isOpen: boolean;
  theme: 'light' | 'dark';
  onAiSummary: (e: React.MouseEvent) => void;
  onCopyId: (e: React.MouseEvent) => void;
  onGeneratePlan: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onMoveStage: (e: React.MouseEvent, direction: 'next' | 'prev') => void;
  onUpdatePriority: (e: React.MouseEvent, priority: string) => void;
  t: any;
  currentStatus: string;
}

export const TaskMenu: React.FC<TaskMenuProps> = ({
  isOpen,
  theme,
  onAiSummary,
  onCopyId,
  onGeneratePlan,
  onDelete,
  onMoveStage,
  onUpdatePriority,
  t,
  currentStatus
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // Parent component handles closing
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const priorities = [
    { value: 'low', label: t.low, color: 'text-green-500' },
    { value: 'medium', label: t.medium, color: 'text-yellow-500' },
    { value: 'high', label: t.high, color: 'text-red-500' },
  ];

  return (
    <div ref={menuRef} className={`absolute right-0 top-full mt-2 w-56 rounded-xl border shadow-2xl z-[100] overflow-hidden backdrop-blur-md ${theme === 'dark' ? 'bg-slate-900/95 border-white/10' : 'bg-white/95 border-slate-200'}`}>
      <div className="p-1 border-b border-white/5">
        <button onClick={onAiSummary} className="flex items-center gap-2.5 w-full px-4 py-2 text-[11px] font-bold hover:bg-indigo-500/10 transition-colors">
          <Sparkles size={14} className="text-indigo-400" /> {t.aiSummary}
        </button>
        <button onClick={onGeneratePlan} className="flex items-center gap-2.5 w-full px-4 py-2 text-[11px] font-bold hover:bg-indigo-500/10 transition-colors">
          <ClipboardList size={14} className="text-indigo-400" /> {t.generatePlan}
        </button>
      </div>

      <div className="p-1 border-b border-white/5">
        {currentStatus !== 'done' && (
          <button onClick={(e) => onMoveStage(e, 'next')} className="flex items-center gap-2.5 w-full px-4 py-2 text-[11px] font-bold hover:bg-emerald-500/10 transition-colors">
            <ArrowRight size={14} className="text-emerald-400" /> {t.moveNext}
          </button>
        )}
        {currentStatus !== 'todo' && (
          <button onClick={(e) => onMoveStage(e, 'prev')} className="flex items-center gap-2.5 w-full px-4 py-2 text-[11px] font-bold hover:bg-orange-500/10 transition-colors">
            <ArrowLeft size={14} className="text-orange-400" /> {t.movePrev}
          </button>
        )}
      </div>

      <div className="p-1 border-b border-white/5">
        <div className="px-4 py-1 text-[9px] uppercase tracking-wider text-slate-500 font-bold">{t.priority}</div>
        <div className="flex px-2 pb-1 gap-1">
          {priorities.map(p => (
            <button
              key={p.value}
              onClick={(e) => onUpdatePriority(e, p.value)}
              className="flex-1 p-1.5 rounded-lg hover:bg-slate-500/10 flex flex-col items-center gap-1 transition-colors"
            >
              <Flag size={12} className={p.color} />
              <span className="text-[9px] font-bold">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-1">
        <button onClick={onCopyId} className="flex items-center gap-2.5 w-full px-4 py-2 text-[11px] font-bold hover:bg-slate-500/10 transition-colors">
          <Copy size={14} className="text-slate-400" /> {t.copyCaseId}
        </button>
        <button onClick={onDelete} className="flex items-center gap-2.5 w-full px-4 py-2 text-[11px] font-bold hover:bg-red-500/10 text-red-400 transition-colors">
          <Trash2 size={14} /> {t.deleteCase}
        </button>
      </div>
    </div>
  );
};
