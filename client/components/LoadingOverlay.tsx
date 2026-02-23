import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingOverlayProps {
    isVisible: boolean;
    message?: string;
    theme?: 'light' | 'dark';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
    isVisible,
    message = 'Saving...',
    theme = 'light'
}) => {
    if (!isVisible) return null;

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm transition-opacity ${theme === 'dark' ? 'bg-slate-900/60' : 'bg-white/60'}`}>
            <div className={`flex flex-col items-center p-6 rounded-2xl shadow-xl ${theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-white text-slate-800'}`}>
                <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
                <p className="font-medium text-lg">{message}</p>
            </div>
        </div>
    );
};
