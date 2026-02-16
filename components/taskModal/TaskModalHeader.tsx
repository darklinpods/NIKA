import React from 'react';
import { Gavel, X } from 'lucide-react';
import { Case } from '../../types';

interface TaskModalHeaderProps {
  task: Case;
  theme: 'light' | 'dark';
  onClose: () => void;
}

export const TaskModalHeader: React.FC<TaskModalHeaderProps> = ({ task, theme, onClose }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
          <Gavel size={24} />
        </div>
        <h2 className="text-xl font-black tracking-tight flex-1 line-clamp-1">
          {task.title}
        </h2>
      </div>
      <button
        onClick={onClose}
        className={`p-2 rounded-lg transition-colors ${
          theme === 'dark' 
            ? 'hover:bg-white/10 text-slate-400' 
            : 'hover:bg-slate-100 text-slate-500'
        }`}
      >
        <X size={20} />
      </button>
    </div>
  );
};
