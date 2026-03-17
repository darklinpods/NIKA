export const PRIORITY_VALUES = ['low', 'medium', 'high'] as const;
export type Priority = typeof PRIORITY_VALUES[number];

export const PRIORITY_CONFIG = {
  low: {
    label: '常态',
    color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    borderColor: 'border-l-blue-400',
    bgColor: 'bg-blue-500',
    hoverBgColor: 'hover:bg-blue-600'
  },
  medium: {
    label: '普通',
    color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    borderColor: 'border-l-amber-400',
    bgColor: 'bg-amber-500',
    hoverBgColor: 'hover:bg-amber-600'
  },
  high: {
    label: '紧急',
    color: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
    borderColor: 'border-l-rose-500',
    bgColor: 'bg-rose-500',
    hoverBgColor: 'hover:bg-rose-600'
  }
} as const;

export const getPriorityLabel = (priority: Priority): string => {
  return PRIORITY_CONFIG[priority].label;
};

export const getPriorityColor = (priority: Priority): string => {
  return PRIORITY_CONFIG[priority].color;
};
