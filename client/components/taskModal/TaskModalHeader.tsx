import React from 'react';
import { Gavel, X } from 'lucide-react';
import { Case } from '../../types';

/**
 * 任务模态框头部组件属性
 */
interface TaskModalHeaderProps {
  /** 任务数据 */
  task: Case;
  /** 主题模式 */
  theme: 'light' | 'dark';
  /** 关闭回调 */
  onClose: () => void;
}

export const TaskModalHeader: React.FC<TaskModalHeaderProps> = ({ task, theme, onClose }) => {
  /**
   * 任务模态框头部组件
   * 显示任务标题和关闭按钮
   */
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
          <Gavel size={24} />
        </div>
        <h2 className="text-xl font-black tracking-tight flex-1 line-clamp-1">
          {task.title}
        </h2>
      </div>
      <button
        onClick={onClose}
        className={`p-2 rounded-lg transition-colors ${theme === 'dark'
            ? 'hover:bg-white/10 text-slate-400'
            : 'hover:bg-slate-100 text-slate-500'
          }`}
      >
        <X size={20} />
      </button>
    </div>
  );
};
