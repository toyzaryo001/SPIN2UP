"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

interface ToastContextType {
    addToast: (toast: Omit<Toast, 'id'>) => string;
    removeToast: (id: string) => void;
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    loading: (title: string, message?: string) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

const ToastIcon = ({ type }: { type: ToastType }) => {
    switch (type) {
        case 'success':
            return <CheckCircle className="w-5 h-5 text-green-400" />;
        case 'error':
            return <AlertCircle className="w-5 h-5 text-red-400" />;
        case 'loading':
            return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
        default:
            return <Info className="w-5 h-5 text-blue-400" />;
    }
};

const ToastItem = ({ toast, onRemove }: { toast: Toast; onRemove: () => void }) => {
    const bgColors = {
        success: 'from-green-500/20 to-green-600/10 border-green-500/30',
        error: 'from-red-500/20 to-red-600/10 border-red-500/30',
        info: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
        loading: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    };

    return (
        <div className={`
      group relative flex items-start gap-3 p-4 rounded-xl 
      bg-gradient-to-r ${bgColors[toast.type]} 
      border backdrop-blur-xl shadow-2xl
      animate-in slide-in-from-right-full duration-300
      hover:scale-[1.02] transition-transform
    `}>
            <ToastIcon type={toast.type} />
            <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{toast.title}</p>
                {toast.message && (
                    <p className="text-xs text-slate-300 mt-1 line-clamp-2">{toast.message}</p>
                )}
            </div>
            {toast.type !== 'loading' && (
                <button
                    onClick={onRemove}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                >
                    <X className="w-4 h-4 text-slate-400" />
                </button>
            )}
        </div>
    );
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast = { ...toast, id };

        setToasts(prev => [...prev, newToast]);

        // Auto remove after duration (except loading)
        if (toast.type !== 'loading') {
            const duration = toast.duration || (toast.type === 'error' ? 5000 : 3000);
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const success = useCallback((title: string, message?: string) => {
        addToast({ type: 'success', title, message });
    }, [addToast]);

    const error = useCallback((title: string, message?: string) => {
        addToast({ type: 'error', title, message });
    }, [addToast]);

    const info = useCallback((title: string, message?: string) => {
        addToast({ type: 'info', title, message });
    }, [addToast]);

    const loading = useCallback((title: string, message?: string) => {
        return addToast({ type: 'loading', title, message });
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast, success, error, info, loading }}>
            {children}

            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
                {toasts.map(toast => (
                    <div key={toast.id} className="pointer-events-auto">
                        <ToastItem toast={toast} onRemove={() => removeToast(toast.id)} />
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
