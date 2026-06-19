import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextProps {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass-panel flex items-center justify-between p-4 rounded-xl border border-white/10 shadow-glass animate-slide-in overflow-hidden relative"
          >
            {/* Left neon border indicator */}
            <div
              className={`absolute left-0 top-0 bottom-0 w-1 ${
                t.type === 'success'
                  ? 'bg-neon-blue'
                  : t.type === 'error'
                  ? 'bg-neon-pink'
                  : 'bg-primary-500'
              }`}
            />
            
            <div className="flex items-center gap-3 pl-1">
              {t.type === 'success' && <CheckCircle className="w-5 h-5 text-neon-blue" />}
              {t.type === 'error' && <AlertCircle className="w-5 h-5 text-neon-pink" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-primary-400" />}
              <span className="text-sm font-medium text-gray-200">{t.message}</span>
            </div>
            
            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-white transition-colors pl-4"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
