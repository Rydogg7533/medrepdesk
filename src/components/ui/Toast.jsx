import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { CheckCircle, AlertTriangle, X, Info } from 'lucide-react';
import clsx from 'clsx';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-brand-800',
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ message, type = 'success', duration = 3000 }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-[calc(68px+env(safe-area-inset-bottom)+8px)] left-4 right-4 z-50 flex flex-col-reverse gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ id, message, type, duration, onDismiss }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(id), 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const Icon = ICONS[type] || ICONS.info;

  return (
    <div
      className={clsx(
        'pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-200',
        COLORS[type],
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={() => { setVisible(false); setTimeout(() => onDismiss(id), 200); }} className="flex-shrink-0">
        <X className="h-3.5 w-3.5 opacity-70" />
      </button>
    </div>
  );
}
