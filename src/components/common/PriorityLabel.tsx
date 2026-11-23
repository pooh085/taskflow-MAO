import { AlertOctagon, ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { PRIORITY_CONFIG, TaskPriority } from '../../types/taskflow';

interface PriorityLabelProps {
  priority: TaskPriority;
  compact?: boolean;
}

export function PriorityLabel({ priority, compact = false }: PriorityLabelProps) {
  const { getPriorityLabel } = useLanguage();
  const cfg = PRIORITY_CONFIG[priority];

  const Icon =
    priority === 'critical'
      ? AlertOctagon
      : priority === 'high'
        ? ArrowUp
        : priority === 'medium'
          ? Minus
          : ArrowDown;

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs whitespace-nowrap ${cfg.textClass}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{getPriorityLabel(priority, compact)}</span>
    </span>
  );
}
