import React from 'react';

interface ProgressBarProps {
  progress: number;
  completedCount: number;
  totalCount: number;
  theme: 'light' | 'dark';
  t: any;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, completedCount, totalCount, theme, t }) => (
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
);
