import { useMemo, useState } from 'react';
import { ChevronRight, Languages, Menu, Plus } from 'lucide-react';
import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useTaskFlow } from '../../context/TaskFlowContext';
import { ToastContainer } from '../common/ToastContainer';
import { ProjectModal } from '../projects/ProjectModal';
import { TaskDetailDrawer } from '../tasks/TaskDetailDrawer';
import { TaskModal } from '../tasks/TaskModal';
import { GlobalSearchBar } from './GlobalSearchBar';
import { NotificationCenter } from './NotificationCenter';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { openCreateTaskModal, getProjectById, tasks } = useTaskFlow();
  const { lang, toggleLang, t } = useLanguage();
  const location = useLocation();
  const { projectId, taskId } = useParams();

  const breadcrumbs = useMemo(() => {
    const items: { label: string; to?: string }[] = [];

    if (location.pathname === '/') {
      items.push({ label: t.nav.teamOverview });
    } else if (location.pathname === '/board') {
      items.push({ label: t.nav.allTasks, to: '/board' });
      items.push({ label: t.nav.board });
    } else if (location.pathname === '/list') {
      items.push({ label: t.nav.allTasks, to: '/list' });
      items.push({ label: t.nav.list });
    } else if (location.pathname === '/gantt') {
      items.push({ label: t.nav.allTasks, to: '/gantt' });
      items.push({ label: t.nav.gantt });
    } else if (location.pathname === '/calendar') {
      items.push({ label: t.nav.calendar });
    } else if (location.pathname === '/projects') {
      items.push({ label: t.nav.allProjects });
    } else if (location.pathname === '/team') {
      items.push({ label: t.nav.team });
    } else if (location.pathname === '/integrations/line') {
      items.push({ label: t.nav.lineOA });
    } else if (location.pathname === '/integrations/telegram') {
      items.push({ label: t.nav.telegram });
    } else if (location.pathname === '/admin') {
      items.push({ label: t.nav.admin });
    } else if (projectId) {
      const project = getProjectById(projectId);
      items.push({ label: t.nav.projects, to: '/projects' });
      items.push({ label: project?.name ?? t.nav.projectNotFound });
      if (location.pathname.endsWith('/list')) {
        items.push({ label: t.nav.list });
      } else if (location.pathname.endsWith('/gantt')) {
        items.push({ label: t.nav.gantt });
      } else {
        items.push({ label: t.nav.board });
      }
    } else if (taskId) {
      const task = tasks.find((item) => item.id === taskId);
      items.push({ label: t.nav.allTasks, to: '/board' });
      items.push({ label: task ? task.code : t.nav.taskDetail });
    }

    return items;
  }, [location.pathname, projectId, taskId, getProjectById, tasks, t]);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      <Sidebar mobileOpen={mobileMenuOpen} onCloseMobile={() => setMobileMenuOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar: Breadcrumb trail + Global Search + Language Toggle + Primary CTA */}
        <header className="sticky top-0 z-20 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t.nav.openMenuAria}
              className="lg:hidden inline-flex items-center justify-center w-10 h-10 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav aria-label={t.nav.breadcrumbAria} className="flex items-center gap-1.5 text-sm min-w-0">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <span key={`${crumb.label}-${idx}`} className="flex items-center gap-1.5 min-w-0">
                    {idx > 0 && (
                      <ChevronRight
                        className="w-3.5 h-3.5 text-slate-400 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    {crumb.to && !isLast ? (
                      <Link
                        to={crumb.to}
                        className="text-slate-500 hover:text-slate-900 transition-colors whitespace-nowrap"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className={`truncate ${
                          isLast ? 'font-semibold text-slate-900' : 'text-slate-500'
                        }`}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </span>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center justify-end gap-2 sm:gap-2.5 flex-1 min-w-0">
            <GlobalSearchBar />

            <NotificationCenter />

            {/* Language Switcher Icon Button (TH / EN) */}
            <button
              type="button"
              onClick={toggleLang}
              aria-label={t.switchLangAria}
              title={t.switchLangTitle}
              className="inline-flex items-center gap-1.5 h-9 px-2.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <Languages className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
              <span className="tabular-nums">{lang === 'th' ? 'TH' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={() => openCreateTaskModal({ projectId })}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="hidden sm:inline">{t.actions.newTask}</span>
              <span className="sm:hidden">{t.actions.newTaskShort}</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 px-4 sm:px-6 py-6 max-w-[1600px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Overlays */}
      <TaskDetailDrawer />
      <TaskModal />
      <ProjectModal />
      <ToastContainer />
    </div>
  );
}
