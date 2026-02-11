import React from 'react';
import { X } from 'lucide-react';

interface SummaryPanelProps {
  summary: string;
  t: any;
  onClose: (e: React.MouseEvent) => void;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({ summary, t, onClose }) => (
  <div className="absolute inset-x-0 -top-2 translate-y-[-100%] z-[60] p-4 bg-indigo-600 text-white rounded-2xl shadow-2xl animate-in slide-in-from-bottom-2">
    <div className="flex justify-between items-center mb-2">
      <span className="text-[10px] font-bold tracking-widest">{t.summaryTitle}</span>
      <button onClick={onClose}><X size={14} /></button>
    </div>
    <p className="text-[11px] leading-relaxed italic">"{summary}"</p>
  </div>
);
