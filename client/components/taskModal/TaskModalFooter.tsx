import React from 'react';
import { translations } from '../../translations';

/**
 * 任务模态框底部组件属性
 */
interface TaskModalFooterProps {
  /** 主题模式 */
  theme: 'light' | 'dark';
  /** 语言设置 */
  lang: 'zh' | 'en';
  /** 保存回调 */
  onSave: () => void;
  /** 取消回调 */
  onCancel: () => void;
}

export const TaskModalFooter: React.FC<TaskModalFooterProps> = ({
  theme,
  lang,
  onSave,
  onCancel,
}) => {
  const t = translations[lang];

  /**
   * 任务模态框底部组件
   * 显示保存和取消按钮
   */
  return (
    <div className={`p-6 border-t flex items-center justify-between ${
      theme === 'dark' ? 'bg-slate-950/50 border-white/5' : 'bg-slate-50 border-slate-100'
    }`}>
      <button
        onClick={onCancel}
        className={`px-6 py-2.5 rounded-xl font-bold transition-all ${
          theme === 'dark'
            ? 'text-slate-400 hover:text-slate-300'
            : 'text-slate-600 hover:text-slate-800'
        }`}
      >
        {t.cancel}
      </button>
      <button
        onClick={onSave}
        className="px-8 py-2.5 rounded-xl font-bold bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-all"
      >
        {t.saveChanges}
      </button>
    </div>
  );
};
