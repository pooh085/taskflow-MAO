import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTaskFlow } from '../../context/TaskFlowContext';

export function ToastContainer() {
  const { toasts, removeToast } = useTaskFlow();
  const { t } = useLanguage();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] sm:w-auto pointer-events-none"
    >
      {toasts.map((toast) => {
        const Icon =
          toast.type === 'error'
            ? AlertCircle
            : toast.type === 'info'
              ? Info
              : CheckCircle2;

        const iconColor =
          toast.type === 'error'
            ? 'text-red-600'
            : toast.type === 'info'
              ? 'text-blue-600'
              : 'text-emerald-600';

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-lg text-sm text-slate-800"
          >
            <Icon className={`w-4 h-4 shrink-0 ${iconColor}`} aria-hidden="true" />
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label={t.actions.dismissToastAria}
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
