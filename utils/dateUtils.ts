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
