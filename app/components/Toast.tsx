'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3000) => {
    const id = `toast-${toastId++}`;
    const toast: Toast = { id, message, type, duration };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}

export function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-top-2 ${getToastStyles(toast.type)}`}
        >
          {getToastIcon(toast.type)}
          <span className="flex-1 text-sm font-medium">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-2 hover:opacity-70 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function getToastStyles(type: string): string {
  switch (type) {
    case 'success':
      return 'bg-green-50 text-green-900 border border-green-200';
    case 'error':
      return 'bg-[#991B1B]/5 text-[#8d3834] border border-[#991B1B]/20';
    case 'warning':
      return 'bg-yellow-50 text-yellow-900 border border-yellow-200';
    case 'info':
    default:
      return 'bg-[#EAF8FD] text-[#1E5167] border border-[#B9E5F5]';
  }
}

function getToastIcon(type: string) {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />;
    case 'error':
      return <AlertCircle className="w-5 h-5 text-[#991B1B] flex-shrink-0" />;
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />;
    case 'info':
    default:
      return <Info className="w-5 h-5 text-[#2F7EA1] flex-shrink-0" />;
  }
}
