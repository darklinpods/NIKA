/**
 * 格式化日期为 yyyy-MM-dd 格式
 * @param dateString - 日期字符串
 * @returns 格式化后的日期字符串
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
 * 检查任务是否即将到期(24小时内)
 * @param dueDate - 截止日期字符串
 * @returns 是否即将到期
 */
export const isApproaching = (dueDate?: string): boolean => {
  if (!dueDate) return false;
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  const hours = diff / (1000 * 60 * 60);
  return hours > 0 && hours < 24;
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
