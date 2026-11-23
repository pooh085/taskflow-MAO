import { ArrowRight, Calendar, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { PriorityLabel } from '../components/common/PriorityLabel';
import { StatusLabel } from '../components/common/StatusLabel';
import { DashboardSummaryCharts } from '../components/dashboard/DashboardSummaryCharts';
import { useLanguage } from '../context/LanguageContext';
import { useTaskFlow } from '../context/TaskFlowContext';
import {
  REFERENCE_TODAY,
  formatThaiDate,
  formatThaiDateTime,
  getDueDateMeta,
  getDueDateState,
} from '../utils/dateUtils';

export function DashboardPage() {
  const {
    tasks,
    projects,
    isAdmin,
    getProjectById,
    getUserById,
    openTaskDetail,
    openProjectModal,
  } = useTaskFlow();
  const { lang, t, localizeCommentContent } = useLanguage();

  const totalCount = tasks.length;
  const inProgressCount = tasks.filter(
    (item) => item.status === 'in_progress' || item.status === 'in_review'
  ).length;
  const doneCount = tasks.filter((item) => item.status === 'done').length;
  const overdueTasks = tasks.filter(
    (item) => getDueDateState(item.dueDate, item.status) === 'overdue'
  );

  const urgentTasks = tasks
    .filter((item) => item.status !== 'done')
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 6);

  const recentComments = tasks
    .flatMap((task) =>
      task.comments.map((comment) => ({
        ...comment,
        taskCode: task.code,
        taskTitle: task.title,
      }))
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  const donePercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const stats = [
    {
      label: t.dashboard.totalTasks,
      value: totalCount,
      sub: t.dashboard.totalTasksSub(projects.length),
      valueClass: 'text-slate-900',
    },
    {
      label: t.dashboard.inProgressLabel,
      value: inProgressCount,
      sub: t.dashboard.inProgressSub,
      valueClass: 'text-blue-600',
    },
    {
      label: t.dashboard.overdueLabel,
      value: overdueTasks.length,
      sub: overdueTasks.length > 0 ? t.dashboard.overdueSubHas : t.dashboard.overdueSubNone,
      valueClass: overdueTasks.length > 0 ? 'text-red-600' : 'text-slate-900',
    },
    {
      label: t.dashboard.doneLabel,
      value: doneCount,
      sub: t.dashboard.doneSub(donePercent),
      valueClass: 'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t.dashboard.heading}
          </h1>
          <p className="text-sm text-slate-500 mt-1 tabular-nums">
            {t.dashboard.subtitlePrefix} {formatThaiDate(REFERENCE_TODAY, lang)}
          </p>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Link
            to="/board"
            className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 whitespace-nowrap"
          >
            <span>{t.actions.openKanban}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <section aria-label={t.dashboard.metricsAria} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="bg-white border border-slate-200 rounded-xl p-5"
          >
            <p className="text-xs font-medium text-slate-500">{item.label}</p>
            <p className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${item.valueClass}`}>
              {item.value}
            </p>
            <p className="mt-1.5 text-xs text-slate-400 tabular-nums">{item.sub}</p>
          </div>
        ))}
      </section>

      <DashboardSummaryCharts />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <section className="xl:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t.dashboard.urgentHeading}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.dashboard.urgentSubtitle}</p>
            </div>
            <Link
              to="/list"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
            >
              {t.actions.viewAllList}
            </Link>
          </div>

          <ul className="divide-y divide-slate-100">
            {urgentTasks.map((task) => {
              const project = getProjectById(task.projectId);
              const assignee = getUserById(task.assigneeId);
              const dueMeta = getDueDateMeta(task.dueDate, task.status, lang);

              return (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => openTaskDetail(task.id)}
                    className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 focus-visible:outline-none focus-visible:bg-blue-50/60"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                        <span className="font-mono font-medium text-slate-600 tabular-nums">
                          {task.code}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="truncate">{project?.name}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {task.title}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs shrink-0">
                      <StatusLabel status={task.status} />
                      <span aria-hidden="true" className="text-slate-200 hidden sm:inline">
                        |
                      </span>
                      <PriorityLabel priority={task.priority} compact />
                      <span
                        className={`inline-flex items-center gap-1 tabular-nums ${dueMeta.textClass}`}
                      >
                        <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{dueMeta.label}</span>
                      </span>
                      <Avatar user={assignee} size="xs" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                {t.dashboard.projectProgress}
              </h2>
              {isAdmin && (
                <button
                  type="button"
                  onClick={openProjectModal}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
                >
                  {t.actions.newProjectShort}
                </button>
              )}
            </div>
            <ul className="divide-y divide-slate-100">
              {projects.map((project) => {
                const projectTasks = tasks.filter((item) => item.projectId === project.id);
                const projectDone = projectTasks.filter((item) => item.status === 'done').length;
                const percent =
                  projectTasks.length > 0
                    ? Math.round((projectDone / projectTasks.length) * 100)
                    : 0;

                return (
                  <li key={project.id}>
                    <Link
                      to={`/projects/${project.id}/board`}
                      className="block px-5 py-3.5 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-sm font-medium text-slate-900 truncate flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                            style={{ backgroundColor: project.accentColor }}
                            aria-hidden="true"
                          />
                          <span className="truncate">{project.name}</span>
                        </span>
                        <span className="text-xs text-slate-500 tabular-nums shrink-0">
                          {projectDone}/{projectTasks.length} {t.filters.tasksUnit}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: project.accentColor,
                          }}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-400" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-900">
                {t.dashboard.recentComments}
              </h2>
            </div>
            <ul className="divide-y divide-slate-100">
              {recentComments.map((comment) => {
                const author = getUserById(comment.authorId);
                return (
                  <li key={comment.id}>
                    <button
                      type="button"
                      onClick={() => openTaskDetail(comment.taskId)}
                      className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3"
                    >
                      <Avatar user={author} size="xs" showTooltip={false} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-semibold text-slate-800 truncate">
                            {author?.name}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="font-mono text-slate-500 tabular-nums shrink-0">
                            {comment.taskCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                          {localizeCommentContent(comment)}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 tabular-nums">
                          {formatThaiDateTime(comment.createdAt, lang)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
