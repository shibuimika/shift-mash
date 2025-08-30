import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { Toast as ToastComponent } from './Toast';
import type { Toast, ToastType } from '@/lib/types';
import { TOAST_DURATION } from '@/lib/constants';
import { generateId } from '@/lib/utils';

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message: string, duration?: number) => void;
  hideToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(
    (type: ToastType, title: string, message: string, duration?: number) => {
      const id = generateId('toast');
      const newToast: Toast = {
        id,
        type,
        title,
        message,
        duration: duration || TOAST_DURATION.MEDIUM,
      };

      setToasts((prev) => [...prev, newToast]);

      // 自動削除
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration || TOAST_DURATION.MEDIUM);
    },
    []
  );

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const value: ToastContextValue = {
    showToast,
    hideToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      
      {/* Toast コンテナ */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <ToastComponent
            key={toast.id}
            toast={toast}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
