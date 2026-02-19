import React from 'react';

interface TaskFooterProps {
  progress: number;
  clientName: string;
  tags: string[];
  theme: 'light' | 'dark';
}

export const TaskFooter: React.FC<TaskFooterProps> = ({ progress, clientName, tags, theme }) => (
  <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      <span className={`text-[10px] font-bold ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
        {clientName}
      </span>
    </div>
    <div className="flex gap-1">
      {tags.slice(0, 1).map(tag => (
        <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-bold">
          {tag}
        </span>
      ))}
    </div>
  </div>
);
