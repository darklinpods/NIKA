import { Response } from 'express';

export class AppError extends Error {
    constructor(message: string, public code: string, public originalError?: unknown) {
        super(message);
        this.name = 'AppError';
    }
}

export const handleApiError = (error: unknown): AppError => {
    if (error instanceof AppError) return error;
    if (error instanceof Error) return new AppError(error.message, 'UNKNOWN_ERROR', error);
    if (typeof error === 'string') return new AppError(error, 'UNKNOWN_ERROR');
    return new AppError('An unknown error occurred', 'UNKNOWN_ERROR');
};

/** 统一发送 500 错误响应 */
export const sendError = (res: Response, error: unknown, label?: string): void => {
    const err = handleApiError(error);
    if (label) console.error(`[${label}]`, err.message);
    res.status(500).json({ error: err.message });
};
