/**
 * 日期相关常量
 */

export const DATE_FORMAT = 'yyyy-MM-dd';
export const APPROACHING_HOURS = 24;
export const MILLIS_PER_HOUR = 1000 * 60 * 60;
export const MILLIS_PER_DAY = MILLIS_PER_HOUR * 24;

/**
 * 日期格式化选项
 */
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric' as const,
  month: '2-digit' as const,
  day: '2-digit' as const
};
