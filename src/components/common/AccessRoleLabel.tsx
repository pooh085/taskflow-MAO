import { ShieldCheck, User as UserIcon } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { UserAccessRole } from '../../types/taskflow';

interface AccessRoleLabelProps {
  accessRole: UserAccessRole;
}

export function AccessRoleLabel({ accessRole }: AccessRoleLabelProps) {
  const { t } = useLanguage();
  const isAdmin = accessRole === 'admin';

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs whitespace-nowrap ${
        isAdmin ? 'text-blue-700 font-semibold' : 'text-slate-500 font-medium'
      }`}
    >
      {isAdmin ? (
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <UserIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      )}
      <span>{isAdmin ? t.roles.admin : t.roles.member}</span>
    </span>
  );
}
