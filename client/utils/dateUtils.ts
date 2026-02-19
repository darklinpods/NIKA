import { DATE_FORMAT_OPTIONS, APPROACHING_HOURS, MILLIS_PER_HOUR } from '../constants/dateConstants';

/**
 * 日期工具函数集合
 * 提供日期格式化、比较和判断等功能
 */

/**
 * 格式化日期为 yyyy-MM-dd 格式
 * @param dateString - 日期字符串
 * @returns 格式化后的日期字符串
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-CA', DATE_FORMAT_OPTIONS);
};

/**
 * 格式化日期为 yyyy-MM-dd 格式 (可选)
 * @param dateString - 日期字符串或undefined
 * @returns 格式化后的日期字符串或空字符串
 */
export const formatDateOptional = (dateString?: string): string => {
  if (!dateString) return '';
  return formatDate(dateString);
};

/**
 * 检查任务是否即将到期
 * @param dueDate - 截止日期字符串
 * @returns 是否即将到期
 */
export const isApproaching = (dueDate?: string): boolean => {
  if (!dueDate) return false;
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  const hours = diff / MILLIS_PER_HOUR;
  return hours > 0 && hours < APPROACHING_HOURS;
};

/**
 * 检查任务是否已过期
 * @param dueDate - 截止日期字符串
 * @returns 是否已过期
 */
export const isOverdue = (dueDate?: string): boolean => {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
};
