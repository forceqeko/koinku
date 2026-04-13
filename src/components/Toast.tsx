import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import clsx from 'clsx';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
let addToastFn: ((message: string, type: ToastType) => void) | null = null;

// Global toast trigger — can be called from anywhere
export const toast = {
  success: (message: string) => addToastFn?.(message, 'success'),
  error: (message: string) => addToastFn?.(message, 'error'),
  info: (message: string) => addToastFn?.(message, 'info'),
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => { addToastFn = null; };
  }, [addToast]);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const iconMap = {
    success: <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />,
    error: <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
  };

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 max-w-[350px] w-full pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={clsx(
            "pointer-events-auto flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-[13px] font-medium animate-slide-up",
            t.type === 'success' && "bg-surface border-green-500/20 text-text-primary",
            t.type === 'error' && "bg-surface border-red-500/20 text-text-primary",
            t.type === 'info' && "bg-surface border-blue-500/20 text-text-primary",
          )}
        >
          {iconMap[t.type]}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="text-text-muted hover:text-text-primary shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
