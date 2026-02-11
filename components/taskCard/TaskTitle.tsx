import React from 'react';

interface TaskTitleProps {
  title: string;
  theme: 'light' | 'dark';
}

export const TaskTitle: React.FC<TaskTitleProps> = ({ title, theme }) => (
  <h4 className={`font-bold text-[14px] leading-tight line-clamp-2 pr-4 ${theme === 'dark' ? 'text-slate-100' : 'text-slate-800'}`}>
    {title}
  </h4>
);
