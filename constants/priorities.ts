/**
 * 优先级配置
 * 统一管理优先级相关的常量和样式
 */

export const PRIORITY_VALUES = ['low', 'medium', 'high'] as const;
export type Priority = typeof PRIORITY_VALUES[number];

export const PRIORITY_CONFIG = {
  low: {
    label: {
      en: 'Routine',
      zh: '常态'
    },
    color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
    borderColor: 'border-l-blue-400',
    bgColor: 'bg-blue-500',
    hoverBgColor: 'hover:bg-blue-600'
  },
  medium: {
    label: {
      en: 'Standard',
      zh: '普通'
    },
    color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
    borderColor: 'border-l-amber-400',
    bgColor: 'bg-amber-500',
    hoverBgColor: 'hover:bg-amber-600'
  },
  high: {
    label: {
      en: 'Urgent',
      zh: '紧急'
    },
    color: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800',
    borderColor: 'border-l-rose-500',
    bgColor: 'bg-rose-500',
    hoverBgColor: 'hover:bg-rose-600'
  }
} as const;

/**
 * 获取优先级标签
 * @param priority - 优先级
 * @param lang - 语言
 * @returns 优先级标签文本
 */
export const getPriorityLabel = (priority: Priority, lang: 'en' | 'zh'): string => {
  return PRIORITY_CONFIG[priority].label[lang];
};

/**
 * 获取优先级颜色样式
 * @param priority - 优先级
 * @returns 优先级颜色样式类名
 */
export const getPriorityColor = (priority: Priority): string => {
  return PRIORITY_CONFIG[priority].color;
};

/**
 * 获取优先级边框颜色
 * @param priority - 优先级
 * @returns 优先级边框颜色类名
 */
export const getPriorityBorderColor = (priority: Priority): string => {
  return PRIORITY_CONFIG[priority].borderColor;
};
