import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AccessRoleLabel } from '../components/common/AccessRoleLabel';
import { Avatar } from '../components/common/Avatar';
import { useLanguage } from '../context/LanguageContext';
import { useTaskFlow } from '../context/TaskFlowContext';
import { getDueDateState } from '../utils/dateUtils';

export function TeamPage() {
  const { users, tasks, isAdmin, setFilter, resetFilters } = useTaskFlow();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const unassignedCount = tasks.filter((item) => item.assigneeId === null).length;

  const handleViewMemberTasks = (assigneeId: string | 'unassigned') => {
    resetFilters();
    setFilter('assigneeId', assigneeId);
    navigate('/board');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t.team.heading}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.team.subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
          {unassignedCount > 0 && (
            <button
              type="button"
              onClick={() => handleViewMemberTasks('unassigned')}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 whitespace-nowrap"
            >
              <span className="tabular-nums">{t.team.unassignedLink(unassignedCount)}</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.nav.admin}</span>
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-5">{t.team.colMember}</th>
                <th className="py-3 px-4">{t.roles.colAccessRole}</th>
                <th className="py-3 px-4 text-right">{t.team.colTotal}</th>
                <th className="py-3 px-4 text-right">{t.team.colActive}</th>
                <th className="py-3 px-4 text-right">{t.team.colOverdue}</th>
                <th className="py-3 px-4 text-right">{t.team.colDone}</th>
                <th className="py-3 px-5 text-right">{t.team.colAction}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {users.map((user) => {
                const userTasks = tasks.filter((item) => item.assigneeId === user.id);
                const activeCount = userTasks.filter(
                  (item) => item.status === 'in_progress' || item.status === 'in_review'
                ).length;
                const overdueCount = userTasks.filter(
                  (item) => getDueDateState(item.dueDate, item.status) === 'overdue'
                ).length;
                const doneCount = userTasks.filter((item) => item.status === 'done').length;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <Avatar user={user} size="md" showTooltip={false} />
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{user.name}</p>
                          <p className="text-xs text-slate-500">
                            {user.role} · {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <AccessRoleLabel accessRole={user.accessRole} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-900 tabular-nums">
                      {userTasks.length}
                    </td>
                    <td className="py-3.5 px-4 text-right text-blue-600 font-medium tabular-nums">
                      {activeCount}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-medium tabular-nums ${
                        overdueCount > 0 ? 'text-red-600' : 'text-slate-400'
                      }`}
                    >
                      {overdueCount}
                    </td>
                    <td className="py-3.5 px-4 text-right text-emerald-600 font-medium tabular-nums">
                      {doneCount}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleViewMemberTasks(user.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap"
                      >
                        <span>{t.actions.viewMemberTasks}</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
