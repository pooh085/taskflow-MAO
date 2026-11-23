import { useLanguage } from '../../context/LanguageContext';
import { User } from '../../types/taskflow';

interface AvatarProps {
  user?: User;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-[11px]',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
};

export function Avatar({ user, size = 'sm', showTooltip = true }: AvatarProps) {
  const { t } = useLanguage();

  if (!user) {
    return (
      <span
        title={showTooltip ? t.avatar.unassignedTooltip : undefined}
        className={`${SIZE_MAP[size]} inline-flex items-center justify-center rounded-full border border-dashed border-slate-300 bg-slate-50 text-slate-400 font-medium shrink-0 select-none`}
        aria-label={t.avatar.unassignedAria}
      >
        —
      </span>
    );
  }

  return (
    <span
      title={showTooltip ? `${user.name} (${user.role})` : undefined}
      className={`${SIZE_MAP[size]} ${user.avatarBg} ${user.avatarText} inline-flex items-center justify-center rounded-full font-semibold shrink-0 select-none tracking-tight`}
      aria-label={user.name}
    >
      {user.initials}
    </span>
  );
}
