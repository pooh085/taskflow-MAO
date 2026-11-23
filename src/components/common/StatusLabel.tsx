import { CheckCircle2, Circle, Clock, Eye } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { STATUS_CONFIG, TaskStatus } from '../../types/taskflow';

interface StatusLabelProps {
  status: TaskStatus;
}

export function StatusLabel({ status }: StatusLabelProps) {
  const { getStatusLabel } = useLanguage();
  const cfg = STATUS_CONFIG[status];

  const Icon =
    status === 'done'
      ? CheckCircle2
      : status === 'in_review'
        ? Eye
        : status === 'in_progress'
          ? Clock
          : Circle;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium whitespace-nowrap ${cfg.textClass}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{getStatusLabel(status)}</span>
    </span>
  );
}
