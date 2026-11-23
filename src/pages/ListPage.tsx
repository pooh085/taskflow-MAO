import {
  AlertOctagon,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FolderOpen,
  MessageSquare,
  Minus,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { EmptyState } from '../components/common/EmptyState';
import { PriorityLabel } from '../components/common/PriorityLabel';
import { FilterBar } from '../components/tasks/FilterBar';
import { useLanguage } from '../context/LanguageContext';
import { useTaskFlow } from '../context/TaskFlowContext';
import {
  PRIORITY_CONFIG,
  PRIORITY_ORDER,
  STATUS_CONFIG,
  STATUS_ORDER,
  SortField,
  TaskPriority,
  TaskStatus,
} from '../types/taskflow';
import { getDueDateMeta } from '../utils/dateUtils';

export function ListPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const {
    tasks,
    sortConfig,
    toggleSort,
    getProjectById,
    getUserById,
    getFilteredTasks,
    getSortedTasks,
    moveTaskStatus,
    updateTask,
    openTaskDetail,
    openCreateTaskModal,
    resetFilters,
  } = useTaskFlow();
  const { lang, t, getStatusLabel, getPriorityLabel } = useLanguage();

  const scopedProject = projectId ? getProjectById(projectId) : undefined;

  if (projectId && !scopedProject) {
    return (
      <EmptyState
        title={t.empty.projectNotFoundTitle}
        description={t.empty.projectNotFoundDesc}
        icon={<FolderOpen className="w-5 h-5" />}
        primaryAction={{
          label: t.actions.backToProjects,
          onClick: () => navigate('/projects'),
        }}
      />
    );
  }

  const baseTasks = projectId ? tasks.filter((item) => item.projectId === projectId) : tasks;
  const filteredTasks = getFilteredTasks(projectId);
  const sortedTasks = getSortedTasks(filteredTasks);

  const renderSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
    );
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {scopedProject
            ? `${scopedProject.name} — ${t.list.projectHeadingSuffix}`
            : t.list.heading}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{t.list.subtitle}</p>
      </div>

      <FilterBar
        activeView="list"
        scopedProjectId={projectId}
        filteredCount={filteredTasks.length}
        totalCount={baseTasks.length}
      />

      {baseTasks.length === 0 ? (
        <EmptyState
          title={t.empty.projectNoTasksTitle}
          description={t.empty.projectNoTasksDesc}
          primaryAction={{
            label: t.actions.createFirstTask,
            onClick: () => openCreateTaskModal({ projectId }),
          }}
        />
      ) : sortedTasks.length === 0 ? (
        <EmptyState
          title={t.empty.filterNoMatchTitle}
          description={t.empty.filterNoMatchDesc}
          primaryAction={{
            label: t.actions.clearAllFilters,
            onClick: () => resetFilters(projectId),
          }}
          secondaryAction={{
            label: t.actions.newTask,
            onClick: () => openCreateTaskModal({ projectId }),
          }}
        />
      ) : (
        <>
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3 px-4 w-[34%]">
                      <button
                        type="button"
                        onClick={() => toggleSort('title')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors"
                      >
                        <span>{t.list.colTask}</span>
                        {renderSortIcon('title')}
                      </button>
                    </th>
                    {!projectId && (
                      <th className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => toggleSort('projectId')}
                          className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors"
                        >
                          <span>{t.list.colProject}</span>
                          {renderSortIcon('projectId')}
                        </button>
                      </th>
                    )}
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => toggleSort('status')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors"
                      >
                        <span>{t.list.colStatus}</span>
                        {renderSortIcon('status')}
                      </button>
                    </th>
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => toggleSort('priority')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors"
                      >
                        <span>{t.list.colPriority}</span>
                        {renderSortIcon('priority')}
                      </button>
                    </th>
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => toggleSort('assigneeId')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors"
                      >
                        <span>{t.list.colAssignee}</span>
                        {renderSortIcon('assigneeId')}
                      </button>
                    </th>
                    <th className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => toggleSort('dueDate')}
                        className="inline-flex items-center gap-1.5 hover:text-slate-900 transition-colors"
                      >
                        <span>{t.list.colDueDate}</span>
                        {renderSortIcon('dueDate')}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right">{t.list.colComments}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {sortedTasks.map((task) => {
                    const project = getProjectById(task.projectId);
                    const assignee = getUserById(task.assigneeId);
                    const dueMeta = getDueDateMeta(task.dueDate, task.status, lang);

                    return (
                      <tr
                        key={task.id}
                        className="hover:bg-slate-50/90 transition-colors group"
                      >
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => openTaskDetail(task.id)}
                            className="text-left block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                          >
                            <div className="flex items-baseline gap-2 min-w-0">
                              <span className="font-mono text-xs font-medium text-slate-500 tabular-nums shrink-0">
                                {task.code}
                              </span>
                              <span className="font-medium text-slate-900 group-hover:text-blue-700 truncate transition-colors">
                                {task.title}
                              </span>
                            </div>
                          </button>
                        </td>

                        {!projectId && (
                          <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                            {project?.name ?? '—'}
                          </td>
                        )}

                        <td className="py-3 px-4 whitespace-nowrap">
                          <select
                            value={task.status}
                            onChange={(e) =>
                              moveTaskStatus(task.id, e.target.value as TaskStatus)
                            }
                            aria-label={t.list.changeStatusAria(task.code)}
                            className={`h-8 px-2 text-xs font-medium bg-transparent border border-slate-200 rounded-md hover:border-slate-300 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 ${STATUS_CONFIG[task.status].textClass}`}
                          >
                            {STATUS_ORDER.map((s) => (
                              <option key={s} value={s} className="text-slate-800">
                                {getStatusLabel(s)}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {task.priority === 'critical' ? (
                              <AlertOctagon
                                className="w-3.5 h-3.5 text-red-700 shrink-0"
                                aria-hidden="true"
                              />
                            ) : task.priority === 'high' ? (
                              <ArrowUp
                                className="w-3.5 h-3.5 text-orange-700 shrink-0"
                                aria-hidden="true"
                              />
                            ) : task.priority === 'medium' ? (
                              <Minus
                                className="w-3.5 h-3.5 text-amber-700 shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <ArrowDown
                                className="w-3.5 h-3.5 text-slate-500 shrink-0"
                                aria-hidden="true"
                              />
                            )}
                            <select
                              value={task.priority}
                              onChange={(e) =>
                                updateTask(task.id, {
                                  priority: e.target.value as TaskPriority,
                                })
                              }
                              aria-label={t.list.changePriorityAria(task.code)}
                              className={`h-8 px-1.5 text-xs bg-transparent border border-transparent hover:border-slate-200 rounded-md focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 ${PRIORITY_CONFIG[task.priority].textClass}`}
                            >
                              {PRIORITY_ORDER.map((p) => (
                                <option key={p} value={p} className="text-slate-800 font-normal">
                                  {getPriorityLabel(p, true)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Avatar user={assignee} size="xs" showTooltip={false} />
                            <span className="text-xs text-slate-700">
                              {assignee ? assignee.name : t.filters.unassigned}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`text-xs tabular-nums ${dueMeta.textClass}`}>
                            {dueMeta.label}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => openTaskDetail(task.id)}
                            className="inline-flex items-center justify-end gap-1 text-xs text-slate-500 hover:text-blue-600 tabular-nums"
                          >
                            <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{task.comments.length}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-2.5">
            {sortedTasks.map((task) => {
              const project = getProjectById(task.projectId);
              const assignee = getUserById(task.assigneeId);
              const dueMeta = getDueDateMeta(task.dueDate, task.status, lang);

              return (
                <article
                  key={task.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span className="font-mono font-medium text-slate-600 tabular-nums">
                      {task.code}
                      {project && !projectId ? ` · ${project.name}` : ''}
                    </span>
                    <PriorityLabel priority={task.priority} compact />
                  </div>

                  <button
                    type="button"
                    onClick={() => openTaskDetail(task.id)}
                    className="block w-full text-left font-semibold text-sm text-slate-900 leading-snug"
                  >
                    {task.title}
                  </button>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <select
                      value={task.status}
                      onChange={(e) =>
                        moveTaskStatus(task.id, e.target.value as TaskStatus)
                      }
                      aria-label={t.list.changeStatusAria(task.code)}
                      className="h-9 px-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {getStatusLabel(s)}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-2.5 text-xs">
                      <span className={`tabular-nums ${dueMeta.textClass}`}>
                        {dueMeta.label}
                      </span>
                      <Avatar user={assignee} size="xs" />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
