/**
 * 自定义应用错误类
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * 处理 API 错误
 * @param error - 未知错误对象
 * @returns AppError 实例
 */
export const handleApiError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', error);
  }

  if (typeof error === 'string') {
    return new AppError(error, 'UNKNOWN_ERROR');
  }

  return new AppError('An unknown error occurred', 'UNKNOWN_ERROR');
};

/**
 * 处理 localStorage 错误
 * @param error - localStorage 操作中的错误
 * @returns 是否成功处理
 */
export const handleStorageError = (error: unknown, context: string): boolean => {
  console.error(`Storage error in ${context}:`, error);

  // 检查是否是配额超限错误
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    console.warn('LocalStorage quota exceeded, attempting to clear old data...');
    try {
      // 清除旧数据,保留最近的数据
      const keys = Object.keys(localStorage);
      if (keys.length > 0) {
        localStorage.removeItem(keys[0]);
        return true;
      }
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  }

  return false;
};

/**
 * 记录错误到控制台
 * @param error - 错误对象
 * @param context - 错误发生的上下文
 */
export const logError = (error: unknown, context: string): void => {
  const appError = handleApiError(error);
  console.error(`[${context}]`, {
    code: appError.code,
    message: appError.message,
    originalError: appError.originalError
  });
};
