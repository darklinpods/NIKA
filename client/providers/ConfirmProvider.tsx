import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type ConfirmOptions = {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
};

type ConfirmContextType = {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
        setOptions(opts);
        setIsOpen(true);
        return new Promise((resolve) => {
            setResolver(() => resolve);
        });
    }, []);

    const handleConfirm = () => {
        if (resolver) resolver(true);
        setIsOpen(false);
    };

    const handleCancel = () => {
        if (resolver) resolver(false);
        setIsOpen(false);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {isOpen && options && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 w-full max-w-sm m-4 animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col gap-4">
                            {/* Icon & Title */}
                            <div className="flex items-center gap-3">
                                {options.type === 'danger' ? (
                                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center text-blue-500 shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                )}
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                    {options.title}
                                </h3>
                            </div>

                            {/* Message */}
                            <p className="text-slate-600 dark:text-slate-300 text-sm ml-13 pl-[52px]">
                                {options.message}
                            </p>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 mt-4">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700 transition duration-150"
                                >
                                    {options.cancelText || 'Cancel'}
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition duration-150 shadow-sm ${options.type === 'danger'
                                            ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20'
                                            : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20'
                                        }`}
                                >
                                    {options.confirmText || 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};
