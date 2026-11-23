import {
  CalendarDays,
  FolderKanban,
  GanttChart,
  Home,
  LayoutGrid,
  List,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useTaskFlow } from '../../context/TaskFlowContext';
import { AccessRoleLabel } from '../common/AccessRoleLabel';
import { Avatar } from '../common/Avatar';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const {
    projects,
    tasks,
    users,
    currentUser,
    isAdmin,
    switchCurrentUser,
    openProjectModal,
  } = useTaskFlow();
  const { t } = useLanguage();
  const location = useLocation();

  const primaryNav = [
    { to: '/', label: t.nav.overview, icon: Home, end: true },
    { to: '/board', label: t.nav.board, icon: LayoutGrid, end: false },
    { to: '/list', label: t.nav.list, icon: List, end: false },
    { to: '/gantt', label: t.nav.gantt, icon: GanttChart, end: false },
    { to: '/calendar', label: t.nav.calendar, icon: CalendarDays, end: false },
    { to: '/projects', label: t.nav.projects, icon: FolderKanban, end: true },
    { to: '/team', label: t.nav.team, icon: Users, end: false },
    { to: '/integrations/line', label: t.nav.lineOA, icon: MessageCircle, end: false },
    { to: '/integrations/telegram', label: t.nav.telegram, icon: Send, end: false },
    ...(isAdmin ? [{ to: '/admin', label: t.nav.admin, icon: ShieldCheck, end: false }] : []),
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64">
      {/* Brand header */}
      <div className="h-14 px-5 flex items-center justify-between border-b border-slate-200 shrink-0">
        <NavLink
          to="/"
          onClick={onCloseMobile}
          className="flex items-center gap-2.5 text-slate-900 font-bold text-lg tracking-tight whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          <span
            className="w-7 h-7 rounded-lg bg-blue-600 text-white inline-flex items-center justify-center text-sm font-bold"
            aria-hidden="true"
          >
            TF
          </span>
          <span>TaskFlow</span>
        </NavLink>

        <button
          type="button"
          onClick={onCloseMobile}
          aria-label={t.nav.closeMenuAria}
          className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation scroll area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <nav aria-label={t.nav.mainMenuAria} className="space-y-1">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onCloseMobile}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Projects list */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">{t.nav.teamProjects}</span>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  onCloseMobile();
                  openProjectModal();
                }}
                aria-label={t.nav.createProjectAria}
                title={t.nav.createProjectAria}
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <ul className="space-y-0.5">
            {projects.map((project) => {
              const projectTaskCount = tasks.filter((item) => item.projectId === project.id).length;
              const isProjectActive = location.pathname.startsWith(`/projects/${project.id}`);

              return (
                <li key={project.id}>
                  <NavLink
                    to={`/projects/${project.id}/board`}
                    onClick={onCloseMobile}
                    className={`flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      isProjectActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                        style={{ backgroundColor: project.accentColor }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{project.name}</span>
                    </span>
                    <span className="text-xs text-slate-400 tabular-nums shrink-0">
                      {projectTaskCount}
                    </span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Current User Footer + Account Role Switcher */}
      <div className="p-3 border-t border-slate-200 shrink-0 space-y-2.5">
        <div className="flex items-center gap-2.5 px-2 pt-1">
          <Avatar user={currentUser} size="sm" showTooltip={false} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-900 truncate">{currentUser.name}</p>
            <div className="mt-0.5">
              <AccessRoleLabel accessRole={currentUser.accessRole} />
            </div>
          </div>
        </div>

        <label className="block px-1">
          <span className="block text-[11px] text-slate-400 mb-1">
            {t.roles.switchAccountLabel}
          </span>
          <select
            value={currentUser.id}
            onChange={(e) => switchCurrentUser(e.target.value)}
            aria-label={t.roles.switchAccountAria}
            className="w-full h-8 px-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-md text-slate-700 hover:border-slate-300 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.accessRole === 'admin' ? t.roles.admin : t.roles.member})
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block shrink-0">{sidebarContent}</aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden flex bg-slate-900/40 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label={t.nav.mainMenuAria}
          onClick={onCloseMobile}
        >
          <div onClick={(e) => e.stopPropagation()} className="h-full">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
