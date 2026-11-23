import { useMemo } from 'react';
import {
  AlertOctagon,
  ArrowDown,
  ArrowUp,
  GanttChart,
  LayoutGrid,
  List,
  Minus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useTaskFlow } from '../../context/TaskFlowContext';
import {
  PRIORITY_CONFIG,
  PRIORITY_ORDER,
  STATUS_ORDER,
  TaskPriority,
  TaskStatus,
} from '../../types/taskflow';

interface FilterBarProps {
  activeView: 'board' | 'list' | 'gantt';
  scopedProjectId?: string;
  filteredCount: number;
  totalCount: number;
}

const PRIORITY_ICONS: Record<TaskPriority, typeof AlertOctagon> = {
  critical: AlertOctagon,
  high: ArrowUp,
  medium: Minus,
  low: ArrowDown,
};

export function FilterBar({
  activeView,
  scopedProjectId,
  filteredCount,
  totalCount,
}: FilterBarProps) {
  const navigate = useNavigate();
  const { tasks, filters, setFilter, resetFilters, projects, users } = useTaskFlow();
  const { t, getStatusLabel, getPriorityLabel } = useLanguage();

  const hasActiveFilters =
    filters.search.trim().length > 0 ||
    filters.status !== 'all' ||
    filters.assigneeId !== 'all' ||
    filters.priority !== 'all' ||
    (!scopedProjectId && filters.projectId !== 'all');

  const priorityCounts = useMemo(() => {
    const effectiveProjectId = scopedProjectId ?? filters.projectId;
    const query = filters.search.trim().toLowerCase();

    const matchedWithoutPriority = tasks.filter((task) => {
      if (effectiveProjectId !== 'all' && task.projectId !== effectiveProjectId) return false;
      if (filters.status !== 'all' && task.status !== filters.status) return false;
      if (filters.assigneeId === 'unassigned') {
        if (task.assigneeId !== null) return false;
      } else if (filters.assigneeId !== 'all' && task.assigneeId !== filters.assigneeId) {
        return false;
      }
      if (query) {
        const project = projects.find((p) => p.id === task.projectId);
        const assignee = task.assigneeId ? users.find((u) => u.id === task.assigneeId) : undefined;
        const haystack = [
          task.code,
          task.title,
          task.description,
          project?.name ?? '',
          assignee ? `${assignee.name} ${assignee.role}` : 'ยังไม่มอบหมาย unassigned',
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    const counts: Record<TaskPriority | 'all', number> = {
      all: matchedWithoutPriority.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const item of matchedWithoutPriority) {
      counts[item.priority] += 1;
    }
    return counts;
  }, [
    tasks,
    filters.projectId,
    filters.status,
    filters.assigneeId,
    filters.search,
    scopedProjectId,
    projects,
    users,
  ]);

  const handleSwitchView = (target: 'board' | 'list' | 'gantt') => {
    if (target === activeView) return;
    if (scopedProjectId) {
      navigate(`/projects/${scopedProjectId}/${target}`);
    } else {
      navigate(`/${target}`);
    }
  };

  return (
    <section
      aria-label={t.filters.sectionAria}
      className="bg-white border border-slate-200 rounded-xl p-4 mb-5 space-y-3"
    >
      {/* Top row: View switcher + Active global search indicator + Clear */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div
            role="tablist"
            aria-label={t.filters.viewSwitcherAria}
            className="inline-flex items-center p-1 bg-slate-100 rounded-lg shrink-0"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'board'}
              onClick={() => handleSwitchView('board')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                activeView === 'board'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.nav.board}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'list'}
              onClick={() => handleSwitchView('list')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                activeView === 'list'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.nav.list}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeView === 'gantt'}
              onClick={() => handleSwitchView('gantt')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                activeView === 'gantt'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GanttChart className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.nav.gantt}</span>
            </button>
          </div>

          {filters.search.trim() && (
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 min-w-0">
              <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[220px]">
                {t.search.activeQueryLabel}{' '}
                <strong className="font-semibold text-slate-900">{filters.search.trim()}</strong>
              </span>
              <button
                type="button"
                onClick={() => setFilter('search', '')}
                aria-label={t.actions.clearSearchAria}
                className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs text-slate-500 shrink-0">
          <span className="tabular-nums whitespace-nowrap">
            {t.filters.showing}{' '}
            <strong className="font-semibold text-slate-900">{filteredCount}</strong> {t.filters.of}{' '}
            <strong className="font-semibold text-slate-700">{totalCount}</strong>{' '}
            {t.filters.tasksUnit}
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => resetFilters(scopedProjectId)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.actions.clearFilters}</span>
            </button>
          )}
        </div>
      </div>

      {/* Middle row: Select filters */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100 ${
          scopedProjectId ? 'lg:grid-cols-2' : 'lg:grid-cols-3'
        }`}
      >
        {!scopedProjectId && (
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">{t.filters.project}</span>
            <select
              value={filters.projectId}
              onChange={(e) => setFilter('projectId', e.target.value)}
              aria-label={t.filters.filterProjectAria}
              className="h-9 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 hover:border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            >
              <option value="all">{t.filters.allProjects}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">{t.filters.status}</span>
          <select
            value={filters.status}
            onChange={(e) => setFilter('status', e.target.value as TaskStatus | 'all')}
            aria-label={t.filters.filterStatusAria}
            className="h-9 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 hover:border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
          >
            <option value="all">{t.filters.allStatuses}</option>
            {STATUS_ORDER.map((statusKey) => (
              <option key={statusKey} value={statusKey}>
                {getStatusLabel(statusKey)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-slate-500">{t.filters.assignee}</span>
          <select
            value={filters.assigneeId}
            onChange={(e) => setFilter('assigneeId', e.target.value)}
            aria-label={t.filters.filterAssigneeAria}
            className="h-9 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 hover:border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
          >
            <option value="all">{t.filters.allMembers}</option>
            <option value="unassigned">{t.filters.unassigned}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Bottom row: Interactive Priority Level Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
        <span className="text-xs font-medium text-slate-500 mr-1 whitespace-nowrap">
          {t.filters.priorityLevel}
        </span>
        <div
          role="group"
          aria-label={t.filters.filterPriorityAria}
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
        >
          <button
            type="button"
            aria-pressed={filters.priority === 'all'}
            onClick={() => setFilter('priority', 'all')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
              filters.priority === 'all'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{t.filters.allPriorities}</span>
            <span className="text-[11px] text-slate-400 tabular-nums">{priorityCounts.all}</span>
          </button>

          {PRIORITY_ORDER.map((priorityKey) => {
            const cfg = PRIORITY_CONFIG[priorityKey];
            const Icon = PRIORITY_ICONS[priorityKey];
            const isActive = filters.priority === priorityKey;

            return (
              <button
                key={priorityKey}
                type="button"
                aria-pressed={isActive}
                onClick={() => setFilter('priority', isActive ? 'all' : priorityKey)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isActive
                    ? `bg-white shadow-xs ${cfg.textClass}`
                    : 'text-slate-600 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 shrink-0 ${isActive ? '' : cfg.textClass}`}
                  aria-hidden="true"
                />
                <span>{getPriorityLabel(priorityKey, true)}</span>
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {priorityCounts[priorityKey]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
