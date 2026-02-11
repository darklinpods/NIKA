import React, { useRef, useEffect } from 'react';
import { Sparkles, Copy } from 'lucide-react';

interface TaskMenuProps {
  isOpen: boolean;
  theme: 'light' | 'dark';
  onAiSummary: (e: React.MouseEvent) => void;
  onCopyId: (e: React.MouseEvent) => void;
  t: any;
}

export const TaskMenu: React.FC<TaskMenuProps> = ({ isOpen, theme, onAiSummary, onCopyId, t }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // 关闭菜单的逻辑由父组件处理
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div ref={menuRef} className={`absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-2xl z-[100] overflow-hidden backdrop-blur-md ${theme === 'dark' ? 'bg-slate-900/95 border-white/10' : 'bg-white/95 border-slate-200'}`}>
      <button onClick={onAiSummary} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[11px] font-bold hover:bg-indigo-500/10">
        <Sparkles size={14} /> {t.aiSummary}
      </button>
      <button onClick={onCopyId} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[11px] font-bold hover:bg-slate-500/10 border-t border-white/5">
        <Copy size={14} /> {t.copyCaseId}
      </button>
    </div>
  );
};
