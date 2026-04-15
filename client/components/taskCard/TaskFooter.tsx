import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Scale, ChevronDown } from 'lucide-react';
import { CASE_TYPES, getCaseTypeLabel } from '../../constants/caseTypes';
import { t } from '../../translations';

interface TaskFooterProps {
  caseType: string;
  taskId: string;
  onUpdateCaseType: (caseId: string, caseType: string) => Promise<void>;
  theme: 'light' | 'dark';
}

export const TaskFooter: React.FC<TaskFooterProps> = ({
  caseType, taskId, onUpdateCaseType, theme
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = useCallback(async (e: React.MouseEvent, value: string) => {
    e.stopPropagation();
    setOpen(false);
    if (value !== (caseType || 'general')) {
      await onUpdateCaseType(taskId, value);
    }
  }, [caseType, taskId, onUpdateCaseType]);

  const currentLabel = getCaseTypeLabel(caseType || 'general');
  const isGeneral = !caseType || caseType === 'general';

  return (
    <div className="mt-auto pt-3 border-t border-white/5">
      {/* 案由下拉选择行 */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={(e) => { e.stopPropagation(); setOpen(prev => !prev); }}
          className={`flex items-center gap-1.5 w-full text-left group/ct transition-colors`}
          title={t.setCaseTypeShortcut}
        >
          <Scale size={10} className="text-indigo-400 shrink-0" />
          <span className={`text-[10px] font-semibold truncate flex-1 transition-colors
            ${isGeneral
              ? theme === 'dark' ? 'text-slate-600' : 'text-slate-400'
              : theme === 'dark' ? 'text-indigo-300/80' : 'text-indigo-600/80'
            }`}>
            {currentLabel}
          </span>
          <ChevronDown
            size={9}
            className={`shrink-0 opacity-0 group-hover/ct:opacity-100 transition-all duration-200
              ${open ? 'rotate-180 opacity-100' : ''}
              ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-400'}`}
          />
        </button>

        {/* 下拉菜单 */}
        {open && (
          <div
            className={`absolute left-0 bottom-full mb-1.5 w-52 rounded-xl border shadow-2xl z-[200] overflow-hidden backdrop-blur-md
              ${theme === 'dark'
                ? 'bg-slate-900/95 border-white/10'
                : 'bg-white/95 border-slate-200'}`}
          >
            {CASE_TYPES.map(ct => {
              const isActive = (caseType || 'general') === ct.value;
              return (
                <button
                  key={ct.value}
                  onClick={(e) => handleSelect(e, ct.value)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-[11px] font-semibold text-left transition-colors
                    ${isActive
                      ? theme === 'dark'
                        ? 'bg-indigo-500/20 text-indigo-300'
                        : 'bg-indigo-50 text-indigo-700'
                      : theme === 'dark'
                        ? 'text-slate-300 hover:bg-white/5'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
                  {!isActive && <span className="w-1.5 h-1.5 shrink-0" />}
                  {ct.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
