import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Plus,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { EmptyState } from '../components/common/EmptyState';
import { PriorityLabel } from '../components/common/PriorityLabel';
import { FilterBar } from '../components/tasks/FilterBar';
import { useLanguage } from '../context/LanguageContext';
import { useTaskFlow } from '../context/TaskFlowContext';
import { Project, Task, TaskStatus } from '../types/taskflow';
import {
  REFERENCE_TODAY,
  addDaysIso,
  diffDaysIso,
  formatDayMonth,
  formatMonthShort,
  formatThaiDate,
  getDueDateState,
  getIsoWeekdayShort,
  getTaskScheduleRange,
  isWeekendIso,
  parseIsoDate,
} from '../utils/dateUtils';

type ZoomLevel = 'day' | 'week';

interface DragPreviewState {
  taskId: string;
  originStart: string;
  originEnd: string;
  deltaDays: number;
  startX: number;
  hasMoved: boolean;
}

const STATUS_BAR_STYLES: Record<
  TaskStatus,
  { bg: string; border: string; text: string; progressFill: string; swatch: string }
> = {
  todo: {
    bg: 'bg-slate-100 hover:bg-slate-200/80',
    border: 'border-slate-300',
    text: 'text-slate-800',
    progressFill: 'bg-slate-400/25',
    swatch: 'bg-slate-400',
  },
  in_progress: {
    bg: 'bg-blue-50 hover:bg-blue-100/80',
    border: 'border-blue-400',
    text: 'text-blue-900',
    progressFill: 'bg-blue-500/20',
    swatch: 'bg-blue-600',
  },
  in_review: {
    bg: 'bg-amber-50 hover:bg-amber-100/80',
    border: 'border-amber-400',
    text: 'text-amber-950',
    progressFill: 'bg-amber-500/20',
    swatch: 'bg-amber-500',
  },
  done: {
    bg: 'bg-emerald-50 hover:bg-emerald-100/80',
    border: 'border-emerald-400',
    text: 'text-emerald-900',
    progressFill: 'bg-emerald-500/20',
    swatch: 'bg-emerald-600',
  },
};

export function GanttPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const {
    tasks,
    projects,
    getFilteredTasks,
    getProjectById,
    getUserById,
    openTaskDetail,
    openCreateTaskModal,
    openEditTaskModal,
    updateTaskSchedule,
    resetFilters,
  } = useTaskFlow();
  const { lang, t, getStatusLabel } = useLanguage();

  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const [windowStartIso, setWindowStartIso] = useState<string>('2026-11-06');
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [dragState, setDragState] = useState<DragPreviewState | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scopedProject = projectId ? getProjectById(projectId) : undefined;

  if (projectId && !scopedProject) {
    return (
      <EmptyState
        title={t.empty.projectNotFoundTitle}
        description={t.empty.projectNotFoundDesc}
        primaryAction={{
          label: t.actions.backToProjects,
          onClick: () => navigate('/projects'),
        }}
      />
    );
  }

  const totalScopeTasks = projectId
    ? tasks.filter((item) => item.projectId === projectId)
    : tasks;
  const filteredTasks = getFilteredTasks(projectId);

  const dayWidth = zoom === 'day' ? 40 : 22;
  const totalDays = zoom === 'day' ? 32 : 56;

  const timelineDays = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => addDaysIso(windowStartIso, i)),
    [windowStartIso, totalDays]
  );

  // Month spans for top header tier
  const monthGroups = useMemo(() => {
    const groups: { key: string; label: string; span: number }[] = [];
    for (const iso of timelineDays) {
      const dt = parseIsoDate(iso);
      const y = dt.getUTCFullYear();
      const m = dt.getUTCMonth();
      const key = `${y}-${m}`;
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.span += 1;
      } else {
        groups.push({ key, label: formatMonthShort(y, m, lang), span: 1 });
      }
    }
    return groups;
  }, [timelineDays, lang]);

  // Week groups for Week zoom second tier
  const weekGroups = useMemo(() => {
    if (zoom !== 'week') return [];
    const groups: { key: string; label: string; startIso: string; span: number }[] = [];
    for (let i = 0; i < timelineDays.length; i += 7) {
      const slice = timelineDays.slice(i, i + 7);
      const first = slice[0];
      const last = slice[slice.length - 1];
      groups.push({
        key: first,
        startIso: first,
        label: `${formatDayMonth(first, lang)} – ${formatDayMonth(last, lang)}`,
        span: slice.length,
      });
    }
    return groups;
  }, [timelineDays, zoom, lang]);

  // Separate scheduled vs unscheduled tasks
  const { scheduledTasks, unscheduledTasks } = useMemo(() => {
    const scheduled: { task: Task; start: string; end: string }[] = [];
    const unscheduled: Task[] = [];
    for (const task of filteredTasks) {
      const range = getTaskScheduleRange(task);
      if (range) {
        scheduled.push({ task, start: range.start, end: range.end });
      } else {
        unscheduled.push(task);
      }
    }
    scheduled.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
    return { scheduledTasks: scheduled, unscheduledTasks: unscheduled };
  }, [filteredTasks]);

  // Group scheduled tasks by project
  const groupedProjects = useMemo(() => {
    const targetProjects: Project[] = scopedProject ? [scopedProject] : projects;
    return targetProjects
      .map((project) => {
        const items = scheduledTasks.filter((s) => s.task.projectId === project.id);
        if (items.length === 0) return null;

        let minStart = items[0].start;
        let maxEnd = items[0].end;
        let doneCount = 0;
        for (const item of items) {
          if (item.start < minStart) minStart = item.start;
          if (item.end > maxEnd) maxEnd = item.end;
          if (item.task.status === 'done') doneCount += 1;
        }
        const progressPct = Math.round((doneCount / items.length) * 100);

        return {
          project,
          items,
          minStart,
          maxEnd,
          doneCount,
          progressPct,
        };
      })
      .filter((g): g is NonNullable<typeof g> => Boolean(g));
  }, [projects, scopedProject, scheduledTasks]);

  const overdueScheduledCount = useMemo(
    () =>
      scheduledTasks.filter(
        ({ task }) => getDueDateState(task.dueDate, task.status) === 'overdue'
      ).length,
    [scheduledTasks]
  );

  const todayOffsetDays = diffDaysIso(windowStartIso, REFERENCE_TODAY);
  const showTodayLine = todayOffsetDays >= 0 && todayOffsetDays < totalDays;
  const totalGridWidth = totalDays * dayWidth;

  const handleJumpToday = () => {
    const leadDays = zoom === 'day' ? 12 : 18;
    setWindowStartIso(addDaysIso(REFERENCE_TODAY, -leadDays));
  };

  const handleShiftWindow = (direction: -1 | 1) => {
    const step = zoom === 'day' ? 7 : 14;
    setWindowStartIso((prev) => addDaysIso(prev, direction * step));
  };

  const toggleProjectCollapse = (pid: string) => {
    setCollapsedProjects((prev) => ({ ...prev, [pid]: !prev[pid] }));
  };

  const allCollapsed =
    groupedProjects.length > 0 && groupedProjects.every((g) => collapsedProjects[g.project.id]);

  const handleToggleAllGroups = () => {
    if (allCollapsed) {
      setCollapsedProjects({});
    } else {
      const next: Record<string, boolean> = {};
      for (const g of groupedProjects) {
        next[g.project.id] = true;
      }
      setCollapsedProjects(next);
    }
  };

  const handleQuickShift = (task: Task, start: string, end: string, delta: number) => {
    updateTaskSchedule(task.id, addDaysIso(start, delta), addDaysIso(end, delta));
  };

  // Pointer drag-to-reschedule
  const handleBarPointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    task: Task,
    start: string,
    end: string
  ) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({
      taskId: task.id,
      originStart: start,
      originEnd: end,
      deltaDays: 0,
      startX: e.clientX,
      hasMoved: false,
    });
  };

  const handleBarPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startX;
    const deltaDays = Math.round(dx / dayWidth);
    const hasMoved = dragState.hasMoved || Math.abs(dx) > 5;
    if (deltaDays !== dragState.deltaDays || hasMoved !== dragState.hasMoved) {
      setDragState((prev) => (prev ? { ...prev, deltaDays, hasMoved } : null));
    }
  };

  const handleBarPointerUp = (e: React.PointerEvent<HTMLDivElement>, task: Task) => {
    if (!dragState || dragState.taskId !== task.id) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    const { hasMoved, deltaDays, originStart, originEnd } = dragState;
    setDragState(null);

    if (!hasMoved) {
      openTaskDetail(task.id);
    } else if (deltaDays !== 0) {
      updateTaskSchedule(
        task.id,
        addDaysIso(originStart, deltaDays),
        addDaysIso(originEnd, deltaDays)
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            {scopedProject && (
              <span
                className="w-3 h-3 rounded-[3px] shrink-0"
                style={{ backgroundColor: scopedProject.accentColor }}
                aria-hidden="true"
              />
            )}
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {scopedProject
                ? `${scopedProject.name} — ${t.gantt.projectHeadingSuffix}`
                : t.gantt.heading}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {scopedProject ? scopedProject.description : t.gantt.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            openCreateTaskModal({
              projectId: scopedProject?.id,
              startDate: REFERENCE_TODAY,
              dueDate: addDaysIso(REFERENCE_TODAY, 4),
            })
          }
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{t.actions.newTask}</span>
        </button>
      </div>

      {/* Summary KPI strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">
          <p className="text-xs text-slate-500">{t.gantt.scheduledStat}</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">
            {scheduledTasks.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">
          <p className="text-xs text-slate-500">{t.gantt.activeProjectsStat}</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">
            {groupedProjects.length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">
          <p className="text-xs text-slate-500">{t.gantt.overdueStat}</p>
          <p
            className={`text-xl font-bold tabular-nums mt-1 ${
              overdueScheduledCount > 0 ? 'text-red-600' : 'text-slate-900'
            }`}
          >
            {overdueScheduledCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3.5">
          <p className="text-xs text-slate-500">{t.gantt.unscheduledStat}</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums mt-1">
            {unscheduledTasks.length}
          </p>
        </div>
      </section>

      {/* Shared FilterBar (Board | List | Gantt) */}
      <FilterBar
        activeView="gantt"
        scopedProjectId={projectId}
        filteredCount={filteredTasks.length}
        totalCount={totalScopeTasks.length}
      />

      {/* Gantt Controls & Main Canvas */}
      {totalScopeTasks.length === 0 ? (
        <EmptyState
          title={t.empty.projectNoTasksTitle}
          description={t.empty.projectNoTasksDesc}
          primaryAction={{
            label: t.actions.createFirstTask,
            onClick: () =>
              openCreateTaskModal({
                projectId: scopedProject?.id,
                startDate: REFERENCE_TODAY,
                dueDate: addDaysIso(REFERENCE_TODAY, 4),
              }),
          }}
        />
      ) : groupedProjects.length === 0 && unscheduledTasks.length === 0 ? (
        <EmptyState
          title={t.empty.filterNoMatchTitle}
          description={t.empty.filterNoMatchDesc}
          primaryAction={{
            label: t.actions.clearAllFilters,
            onClick: () => resetFilters(projectId),
          }}
        />
      ) : (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {/* Timeline Controls Toolbar */}
          <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center border border-slate-200 bg-white rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleShiftWindow(-1)}
                  aria-label={t.gantt.prevRangeAria}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleJumpToday}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-700 hover:bg-blue-50/60 border-x border-slate-200 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {t.gantt.todayBtn}
                </button>
                <button
                  type="button"
                  onClick={() => handleShiftWindow(1)}
                  aria-label={t.gantt.nextRangeAria}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <span className="text-xs font-medium text-slate-600 tabular-nums px-1 whitespace-nowrap">
                {formatDayMonth(timelineDays[0], lang)} –{' '}
                {formatDayMonth(timelineDays[timelineDays.length - 1], lang)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {groupedProjects.length > 1 && (
                <button
                  type="button"
                  onClick={handleToggleAllGroups}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap"
                >
                  {allCollapsed ? (
                    <>
                      <ChevronsUpDown className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.gantt.expandAll}</span>
                    </>
                  ) : (
                    <>
                      <ChevronsDownUp className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{t.gantt.collapseAll}</span>
                    </>
                  )}
                </button>
              )}

              <div
                role="group"
                aria-label={t.gantt.zoomLabel}
                className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg"
              >
                <button
                  type="button"
                  aria-pressed={zoom === 'day'}
                  onClick={() => setZoom('day')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    zoom === 'day'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.gantt.zoomDay}
                </button>
                <button
                  type="button"
                  aria-pressed={zoom === 'week'}
                  onClick={() => setZoom('week')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    zoom === 'week'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.gantt.zoomWeek}
                </button>
              </div>
            </div>
          </div>

          {/* Legend & interaction hint bar */}
          <div className="px-4 py-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 bg-white">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {(['todo', 'in_progress', 'in_review', 'done'] as TaskStatus[]).map((statusKey) => (
                <span key={statusKey} className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  <span
                    className={`w-2.5 h-2.5 rounded-[3px] shrink-0 ${STATUS_BAR_STYLES[statusKey].swatch}`}
                    aria-hidden="true"
                  />
                  <span>{getStatusLabel(statusKey)}</span>
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 text-red-600 whitespace-nowrap">
                <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>{t.gantt.overdueTag}</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-400">{t.gantt.dragHint}</span>
          </div>

          {groupedProjects.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-800">{t.gantt.emptyTimelineTitle}</p>
              <p className="text-xs text-slate-500 mt-1">{t.gantt.emptyTimelineDesc}</p>
            </div>
          ) : (
            <div ref={scrollContainerRef} className="overflow-x-auto">
              <div style={{ minWidth: `${300 + totalGridWidth}px` }}>
                {/* Timeline Header Row */}
                <div className="flex border-b border-slate-200 bg-slate-50/90 sticky top-0 z-10">
                  <div className="w-[300px] shrink-0 sticky left-0 z-20 bg-slate-50 border-r border-slate-200 px-4 py-2 flex items-end justify-between">
                    <span className="text-xs font-semibold text-slate-600">{t.gantt.colTask}</span>
                    <span className="text-xs font-medium text-slate-400">{t.gantt.colDuration}</span>
                  </div>

                  <div className="flex-1" style={{ width: `${totalGridWidth}px` }}>
                    {/* Top tier: Month labels */}
                    <div className="flex border-b border-slate-200/80 h-7">
                      {monthGroups.map((group) => (
                        <div
                          key={group.key}
                          style={{ width: `${group.span * dayWidth}px` }}
                          className="shrink-0 px-2.5 flex items-center text-xs font-semibold text-slate-700 border-r border-slate-200/70 truncate"
                        >
                          {group.label}
                        </div>
                      ))}
                    </div>

                    {/* Second tier: Days or Weeks */}
                    {zoom === 'day' ? (
                      <div className="flex h-10">
                        {timelineDays.map((iso) => {
                          const isToday = iso === REFERENCE_TODAY;
                          const weekend = isWeekendIso(iso);
                          const dayNum = parseIsoDate(iso).getUTCDate();
                          const weekday = getIsoWeekdayShort(iso, lang);

                          return (
                            <div
                              key={iso}
                              style={{ width: `${dayWidth}px` }}
                              className={`shrink-0 flex flex-col items-center justify-center border-r border-slate-200/60 text-[11px] tabular-nums ${
                                isToday
                                  ? 'bg-blue-50 text-blue-700 font-semibold'
                                  : weekend
                                    ? 'bg-slate-100/70 text-slate-400'
                                    : 'text-slate-600'
                              }`}
                            >
                              <span className="text-[10px] leading-none opacity-80">{weekday}</span>
                              <span className="mt-0.5 leading-none">{dayNum}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex h-10">
                        {weekGroups.map((wg) => (
                          <div
                            key={wg.key}
                            style={{ width: `${wg.span * dayWidth}px` }}
                            className="shrink-0 px-2 flex items-center justify-center border-r border-slate-200/70 text-[11px] font-medium text-slate-600 tabular-nums truncate"
                          >
                            {wg.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Project Groups & Task Rows */}
                <div className="divide-y divide-slate-100">
                  {groupedProjects.map(
                    ({ project, items, minStart, maxEnd, doneCount, progressPct }) => {
                      const isCollapsed = Boolean(collapsedProjects[project.id]);
                      const projStartOffset = diffDaysIso(windowStartIso, minStart);
                      const projDuration = diffDaysIso(minStart, maxEnd) + 1;
                      const projLeftPx = projStartOffset * dayWidth;
                      const projWidthPx = Math.max(projDuration * dayWidth, 16);

                      return (
                        <div key={project.id}>
                          {/* Project Summary Row */}
                          <div className="flex h-10 bg-slate-50/70 hover:bg-slate-100/70 transition-colors">
                            <div className="w-[300px] shrink-0 sticky left-0 z-10 bg-slate-50 border-r border-slate-200 px-3 flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => toggleProjectCollapse(project.id)}
                                className="flex items-center gap-2 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                              >
                                {isCollapsed ? (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                )}
                                <span
                                  className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                                  style={{ backgroundColor: project.accentColor }}
                                  aria-hidden="true"
                                />
                                <span className="text-xs font-semibold text-slate-900 truncate">
                                  {project.name}
                                </span>
                              </button>
                              <span className="text-[11px] text-slate-500 tabular-nums shrink-0">
                                {doneCount}/{items.length} · {progressPct}%
                              </span>
                            </div>

                            <div
                              className="relative flex-1 overflow-hidden"
                              style={{ width: `${totalGridWidth}px` }}
                            >
                              {/* Background vertical grid lines */}
                              <div className="absolute inset-0 flex pointer-events-none">
                                {timelineDays.map((iso) => (
                                  <div
                                    key={iso}
                                    style={{ width: `${dayWidth}px` }}
                                    className={`shrink-0 h-full border-r border-slate-200/40 ${
                                      isWeekendIso(iso) ? 'bg-slate-100/50' : ''
                                    }`}
                                  />
                                ))}
                              </div>

                              {/* Today vertical line */}
                              {showTodayLine && (
                                <div
                                  style={{
                                    left: `${todayOffsetDays * dayWidth + dayWidth / 2}px`,
                                  }}
                                  className="absolute top-0 bottom-0 w-px bg-blue-600/70 pointer-events-none z-10"
                                />
                              )}

                              {/* Project summary bracket bar */}
                              <div
                                style={{
                                  left: `${projLeftPx}px`,
                                  width: `${projWidthPx}px`,
                                }}
                                title={`${project.name}: ${formatThaiDate(minStart, lang)} – ${formatThaiDate(maxEnd, lang)} (${progressPct}%)`}
                                className="absolute top-3 h-4 rounded-sm overflow-hidden bg-slate-200/90 border border-slate-300/80"
                              >
                                <div
                                  className="h-full transition-all"
                                  style={{
                                    width: `${progressPct}%`,
                                    backgroundColor: project.accentColor,
                                    opacity: 0.85,
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Task Rows */}
                          {!isCollapsed &&
                            items.map(({ task, start, end }) => {
                              const isDragging = dragState?.taskId === task.id;
                              const activeStart = isDragging
                                ? addDaysIso(dragState.originStart, dragState.deltaDays)
                                : start;
                              const activeEnd = isDragging
                                ? addDaysIso(dragState.originEnd, dragState.deltaDays)
                                : end;

                              const offsetDays = diffDaysIso(windowStartIso, activeStart);
                              const durationDays = diffDaysIso(activeStart, activeEnd) + 1;
                              const barLeftPx = offsetDays * dayWidth;
                              const barWidthPx = Math.max(durationDays * dayWidth - 4, 24);

                              const assignee = getUserById(task.assigneeId);
                              const dueState = getDueDateState(activeEnd, task.status);
                              const isOverdue = dueState === 'overdue';
                              const barStyle = STATUS_BAR_STYLES[task.status];

                              return (
                                <div
                                  key={task.id}
                                  className="group flex h-11 bg-white hover:bg-blue-50/25 transition-colors border-t border-slate-100"
                                >
                                  {/* Sticky Task Metadata Column */}
                                  <div className="w-[300px] shrink-0 sticky left-0 z-10 bg-white group-hover:bg-slate-50/90 border-r border-slate-200 px-3 flex items-center justify-between gap-2 transition-colors">
                                    <button
                                      type="button"
                                      onClick={() => openTaskDetail(task.id)}
                                      className="flex items-center gap-2 min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded py-1"
                                    >
                                      <Avatar user={assignee} size="xs" />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                          <span className="font-mono font-semibold text-slate-700 tabular-nums shrink-0">
                                            {task.code}
                                          </span>
                                          <span aria-hidden="true" className="text-slate-300">
                                            ·
                                          </span>
                                          <PriorityLabel priority={task.priority} compact />
                                          {isOverdue && (
                                            <span className="text-red-600 font-medium truncate">
                                              {t.gantt.overdueTag}
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-xs font-medium text-slate-900 truncate">
                                          {task.title}
                                        </p>
                                      </div>
                                    </button>

                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleQuickShift(task, start, end, -1)}
                                        aria-label={t.gantt.shiftEarlierAria}
                                        title={t.gantt.shiftEarlierAria}
                                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-opacity"
                                      >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                      </button>
                                      <span className="text-[11px] text-slate-500 tabular-nums min-w-[32px] text-center">
                                        {t.gantt.daysUnit(durationDays)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleQuickShift(task, start, end, 1)}
                                        aria-label={t.gantt.shiftLaterAria}
                                        title={t.gantt.shiftLaterAria}
                                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-opacity"
                                      >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Timeline Track */}
                                  <div
                                    className="relative flex-1 overflow-hidden select-none"
                                    style={{ width: `${totalGridWidth}px` }}
                                  >
                                    {/* Day columns background */}
                                    <div className="absolute inset-0 flex pointer-events-none">
                                      {timelineDays.map((iso) => (
                                        <div
                                          key={iso}
                                          style={{ width: `${dayWidth}px` }}
                                          className={`shrink-0 h-full border-r border-slate-100 ${
                                            iso === REFERENCE_TODAY
                                              ? 'bg-blue-50/40'
                                              : isWeekendIso(iso)
                                                ? 'bg-slate-50/90'
                                                : ''
                                          }`}
                                        />
                                      ))}
                                    </div>

                                    {/* Today vertical marker */}
                                    {showTodayLine && (
                                      <div
                                        style={{
                                          left: `${todayOffsetDays * dayWidth + dayWidth / 2}px`,
                                        }}
                                        className="absolute top-0 bottom-0 w-px bg-blue-600/70 pointer-events-none z-10"
                                      />
                                    )}

                                    {/* Interactive Task Timeline Bar */}
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                          e.preventDefault();
                                          openTaskDetail(task.id);
                                        } else if (e.key === 'ArrowLeft') {
                                          e.preventDefault();
                                          handleQuickShift(task, start, end, -1);
                                        } else if (e.key === 'ArrowRight') {
                                          e.preventDefault();
                                          handleQuickShift(task, start, end, 1);
                                        }
                                      }}
                                      onPointerDown={(e) => handleBarPointerDown(e, task, start, end)}
                                      onPointerMove={handleBarPointerMove}
                                      onPointerUp={(e) => handleBarPointerUp(e, task)}
                                      style={{
                                        left: `${barLeftPx + 2}px`,
                                        width: `${barWidthPx}px`,
                                      }}
                                      title={`${task.code}: ${task.title}\n${formatThaiDate(activeStart, lang)} – ${formatThaiDate(activeEnd, lang)} (${t.gantt.daysUnit(durationDays)})\n${getStatusLabel(task.status)}`}
                                      className={`absolute top-2 h-7 rounded-md border px-2 flex items-center gap-1.5 text-xs font-medium transition-shadow touch-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                                        isOverdue
                                          ? 'bg-red-50 hover:bg-red-100/80 border-red-400 text-red-900'
                                          : `${barStyle.bg} ${barStyle.border} ${barStyle.text}`
                                      } ${isDragging ? 'cursor-grabbing shadow-md z-20 ring-2 ring-blue-500/40' : 'cursor-grab z-10'}`}
                                    >
                                      {isOverdue && (
                                        <AlertTriangle
                                          className="w-3 h-3 text-red-600 shrink-0"
                                          aria-hidden="true"
                                        />
                                      )}
                                      <span className="truncate">{task.title}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Unscheduled Tasks Footer Panel */}
      {unscheduledTasks.length > 0 && (
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {t.gantt.unscheduledHeading}{' '}
                <span className="text-slate-400 font-normal tabular-nums">
                  ({unscheduledTasks.length})
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.gantt.unscheduledSub}</p>
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {unscheduledTasks.map((task) => {
              const project = getProjectById(task.projectId);
              const assignee = getUserById(task.assigneeId);
              return (
                <li
                  key={task.id}
                  className="px-5 py-3 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => openTaskDetail(task.id)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                  >
                    <Avatar user={assignee} size="xs" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono font-semibold text-slate-700 tabular-nums">
                          {task.code}
                        </span>
                        {project && (
                          <>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="truncate">{project.name}</span>
                          </>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditTaskModal(task)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.gantt.scheduleBtn}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
