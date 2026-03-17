import React from 'react';
import { t } from '../../translations';

interface TaskModalFooterProps {
  theme: 'light' | 'dark';
  onSave: () => void;
  onCancel: () => void;
}

export const TaskModalFooter: React.FC<TaskModalFooterProps> = ({
  theme, onSave, onCancel,
}) => {

  /**
   * 任务模态框底部组件
   * 显示保存和取消按钮
   */
  return (
    <div className={`p-6 border-t flex items-center justify-between ${theme === 'dark' ? 'bg-slate-950/50 border-white/5' : 'bg-slate-50 border-slate-100'
      }`}>
      <button
        onClick={onCancel}
        className={`px-6 py-2.5 rounded-xl font-bold transition-all ${theme === 'dark'
            ? 'text-slate-400 hover:text-slate-300'
            : 'text-slate-600 hover:text-slate-800'
          }`}
      >
        {t.cancel}
      </button>
      <button
        onClick={onSave}
        className="px-8 py-2.5 rounded-xl font-bold bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all"
      >
        {t.saveChanges}
      </button>
    </div>
  );
};
