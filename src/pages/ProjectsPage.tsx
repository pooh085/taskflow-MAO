import { GanttChart, LayoutGrid, List, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { useLanguage } from '../context/LanguageContext';
import { useTaskFlow } from '../context/TaskFlowContext';
import { formatThaiDate, getDueDateState } from '../utils/dateUtils';

export function ProjectsPage() {
  const { projects, tasks, isAdmin, getUserById, openProjectModal, openCreateTaskModal } =
    useTaskFlow();
  const { lang, t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t.projects.heading}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t.projects.subtitle}</p>
        </div>

        {isAdmin ? (
          <button
            type="button"
            onClick={openProjectModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>{t.actions.newProject}</span>
          </button>
        ) : (
          <span className="text-xs text-slate-400 self-start sm:self-auto">
            {t.roles.adminOnlyProjectHint}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {projects.map((project) => {
          const projectTasks = tasks.filter((item) => item.projectId === project.id);
          const doneTasks = projectTasks.filter((item) => item.status === 'done').length;
          const overdueCount = projectTasks.filter(
            (item) => getDueDateState(item.dueDate, item.status) === 'overdue'
          ).length;
          const progress =
            projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;
          const lead = getUserById(project.leadId);
          const members = project.memberIds
            .map((id) => getUserById(id))
            .filter((u): u is NonNullable<typeof u> => Boolean(u));

          return (
            <article
              key={project.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-5"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                      style={{ backgroundColor: project.accentColor }}
                      aria-hidden="true"
                    />
                    <span className="font-mono font-semibold text-slate-700">
                      {project.key}
                    </span>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="tabular-nums">
                      {t.projects.startedPrefix} {formatThaiDate(project.createdAt, lang)}
                    </span>
                  </div>
                  {overdueCount > 0 && (
                    <span className="text-red-600 font-medium tabular-nums">
                      {t.projects.overdueCount(overdueCount)}
                    </span>
                  )}
                </div>

                <h2 className="text-base font-semibold text-slate-900">{project.name}</h2>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  {project.description || t.projects.noDescription}
                </p>

                <div className="mt-5 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{t.projects.progressLabel}</span>
                    <span className="font-medium text-slate-800 tabular-nums">
                      {t.projects.progressDetail(doneTasks, projectTasks.length, progress)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: project.accentColor,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {members.slice(0, 4).map((m) => (
                      <div key={m.id} className="ring-2 ring-white rounded-full">
                        <Avatar user={m} size="xs" />
                      </div>
                    ))}
                  </div>
                  {lead && (
                    <span className="text-xs text-slate-500 truncate max-w-[160px]">
                      {t.projects.leadPrefix} {lead.name.split(' ')[0]}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openCreateTaskModal({ projectId: project.id })}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap"
                  >
                    {t.actions.addTaskShort}
                  </button>
                  <Link
                    to={`/projects/${project.id}/gantt`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
                  >
                    <GanttChart className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.actions.ganttShort}</span>
                  </Link>
                  <Link
                    to={`/projects/${project.id}/list`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap"
                  >
                    <List className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.actions.listShort}</span>
                  </Link>
                  <Link
                    to={`/projects/${project.id}/board`}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors whitespace-nowrap"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.actions.openBoard}</span>
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
