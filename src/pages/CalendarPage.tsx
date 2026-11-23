import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Palmtree,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import { CalendarEventModal } from '../components/calendar/CalendarEventModal';
import { Avatar } from '../components/common/Avatar';
import { PriorityLabel } from '../components/common/PriorityLabel';
import { useLanguage } from '../context/LanguageContext';
import { useTaskFlow } from '../context/TaskFlowContext';
import { STATUS_CONFIG, Task, TeamEvent, TeamEventType } from '../types/taskflow';
import {
  REFERENCE_TODAY,
  addDaysIso,
  formatDayMonth,
  formatMonthYear,
  formatThaiDate,
  getDueDateState,
  getIsoWeekdayShort,
  getMonthGridDays,
  getTaskScheduleRange,
  getWeekDays,
  getWeekdayLabels,
  isWeekendIso,
  parseIsoDate,
} from '../utils/dateUtils';

type CalendarViewMode = 'month' | 'week';

interface LayerVisibility {
  tasks: boolean;
  meeting: boolean;
  milestone: boolean;
  leave: boolean;
}

const EVENT_TYPE_STYLES: Record<
  TeamEventType,
  {
    icon: typeof Users;
    cellBg: string;
    cellText: string;
    cellBorder: string;
    labelText: string;
  }
> = {
  meeting: {
    icon: Users,
    cellBg: 'bg-blue-50 hover:bg-blue-100/80',
    cellText: 'text-blue-800',
    cellBorder: 'border-blue-200',
    labelText: 'text-blue-700',
  },
  milestone: {
    icon: Flag,
    cellBg: 'bg-indigo-50 hover:bg-indigo-100/80',
    cellText: 'text-indigo-800',
    cellBorder: 'border-indigo-200',
    labelText: 'text-indigo-700',
  },
  leave: {
    icon: Palmtree,
    cellBg: 'bg-teal-50 hover:bg-teal-100/80',
    cellText: 'text-teal-800',
    cellBorder: 'border-teal-200',
    labelText: 'text-teal-700',
  },
};

function eventOccursOnDate(event: TeamEvent, iso: string): boolean {
  const end = event.endDate && event.endDate >= event.date ? event.endDate : event.date;
  return iso >= event.date && iso <= end;
}

export function CalendarPage() {
  const {
    tasks,
    projects,
    users,
    calendarEvents,
    getUserById,
    getProjectById,
    openTaskDetail,
    openCreateTaskModal,
    deleteCalendarEvent,
  } = useTaskFlow();
  const { lang, t, getStatusLabel } = useLanguage();

  const refDate = parseIsoDate(REFERENCE_TODAY);
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [cursorYear, setCursorYear] = useState<number>(refDate.getUTCFullYear());
  const [cursorMonth, setCursorMonth] = useState<number>(refDate.getUTCMonth()); // 0-indexed (10 = Nov)
  const [weekAnchorIso, setWeekAnchorIso] = useState<string>(REFERENCE_TODAY);
  const [selectedDate, setSelectedDate] = useState<string>(REFERENCE_TODAY);

  const [memberFilter, setMemberFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [layers, setLayers] = useState<LayerVisibility>({
    tasks: true,
    meeting: true,
    milestone: true,
    leave: true,
  });

  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [eventModalDate, setEventModalDate] = useState<string>(REFERENCE_TODAY);

  const weekdayLabels = getWeekdayLabels(lang);

  const visibleDays = useMemo(() => {
    if (viewMode === 'month') {
      return getMonthGridDays(cursorYear, cursorMonth);
    }
    return getWeekDays(weekAnchorIso);
  }, [viewMode, cursorYear, cursorMonth, weekAnchorIso]);

  const filteredEvents = useMemo(() => {
    return calendarEvents.filter((ev) => {
      if (!layers[ev.type]) return false;
      if (projectFilter !== 'all' && ev.projectId !== projectFilter) return false;
      if (memberFilter !== 'all' && !ev.participantIds.includes(memberFilter)) return false;
      return true;
    });
  }, [calendarEvents, layers, projectFilter, memberFilter]);

  const filteredTasks = useMemo(() => {
    if (!layers.tasks) return [];
    return tasks.filter((task) => {
      if (projectFilter !== 'all' && task.projectId !== projectFilter) return false;
      if (memberFilter !== 'all' && task.assigneeId !== memberFilter) return false;
      return true;
    });
  }, [tasks, layers.tasks, projectFilter, memberFilter]);

  // Pre-compute items per date for the visible range
  const dayDataMap = useMemo(() => {
    const map = new Map<string, { events: TeamEvent[]; tasksDue: Task[] }>();
    for (const iso of visibleDays) {
      const dayEvents = filteredEvents
        .filter((ev) => eventOccursOnDate(ev, iso))
        .sort((a, b) => (a.startTime ?? '00:00').localeCompare(b.startTime ?? '00:00'));
      const dayTasksDue = filteredTasks.filter((task) => task.dueDate === iso);
      map.set(iso, { events: dayEvents, tasksDue: dayTasksDue });
    }
    return map;
  }, [visibleDays, filteredEvents, filteredTasks]);

  // Selected day agenda details
  const selectedDayEvents = useMemo(() => {
    return filteredEvents
      .filter((ev) => eventOccursOnDate(ev, selectedDate))
      .sort((a, b) => (a.startTime ?? '00:00').localeCompare(b.startTime ?? '00:00'));
  }, [filteredEvents, selectedDate]);

  const selectedDayTasksDue = useMemo(
    () => filteredTasks.filter((task) => task.dueDate === selectedDate),
    [filteredTasks, selectedDate]
  );

  const selectedDayActiveTasks = useMemo(() => {
    return filteredTasks.filter((task) => {
      if (task.status === 'done' || task.dueDate === selectedDate) return false;
      const range = getTaskScheduleRange(task);
      if (!range) return false;
      return selectedDate >= range.start && selectedDate < range.end;
    });
  }, [filteredTasks, selectedDate]);

  // Team leave summary for visible range
  const visibleLeaveEvents = useMemo(() => {
    const rangeStart = visibleDays[0];
    const rangeEnd = visibleDays[visibleDays.length - 1];
    return calendarEvents
      .filter((ev) => {
        if (ev.type !== 'leave') return false;
        const evEnd = ev.endDate && ev.endDate >= ev.date ? ev.endDate : ev.date;
        return evEnd >= rangeStart && ev.date <= rangeEnd;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [calendarEvents, visibleDays]);

  const handleNavigatePeriod = (dir: -1 | 1) => {
    if (viewMode === 'month') {
      const next = new Date(Date.UTC(cursorYear, cursorMonth + dir, 1, 12, 0, 0));
      setCursorYear(next.getUTCFullYear());
      setCursorMonth(next.getUTCMonth());
    } else {
      const nextAnchor = addDaysIso(weekAnchorIso, dir * 7);
      setWeekAnchorIso(nextAnchor);
      const dt = parseIsoDate(nextAnchor);
      setCursorYear(dt.getUTCFullYear());
      setCursorMonth(dt.getUTCMonth());
    }
  };

  const handleJumpToday = () => {
    const dt = parseIsoDate(REFERENCE_TODAY);
    setCursorYear(dt.getUTCFullYear());
    setCursorMonth(dt.getUTCMonth());
    setWeekAnchorIso(REFERENCE_TODAY);
    setSelectedDate(REFERENCE_TODAY);
  };

  const openAddEventForDate = (iso: string) => {
    setEventModalDate(iso);
    setEventModalOpen(true);
  };

  const toggleLayer = (key: keyof LayerVisibility) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const periodHeading =
    viewMode === 'month'
      ? formatMonthYear(cursorYear, cursorMonth, lang)
      : `${formatDayMonth(visibleDays[0], lang)} – ${formatDayMonth(visibleDays[visibleDays.length - 1], lang)}`;

  return (
    <>
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t.calendar.heading}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{t.calendar.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={() => openAddEventForDate(selectedDate)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{t.calendar.addEventBtn}</span>
          </button>
        </div>

        {/* Calendar Toolbar & Filters */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Period Navigation */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center border border-slate-200 bg-white rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleNavigatePeriod(-1)}
                  aria-label={t.calendar.prevAria}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleJumpToday}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-700 hover:bg-blue-50/60 border-x border-slate-200 transition-colors whitespace-nowrap"
                >
                  {t.calendar.todayBtn}
                </button>
                <button
                  type="button"
                  onClick={() => handleNavigatePeriod(1)}
                  aria-label={t.calendar.nextAria}
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <h2 className="text-base font-semibold text-slate-900 tabular-nums px-1">
                {periodHeading}
              </h2>
            </div>

            {/* View Mode + Member & Project Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              <select
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                aria-label={t.filters.filterAssigneeAria}
                className="h-9 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 hover:border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              >
                <option value="all">{t.calendar.filterAllMembers}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>

              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                aria-label={t.filters.filterProjectAria}
                className="h-9 px-2.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-800 hover:border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              >
                <option value="all">{t.calendar.filterAllProjects}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg shrink-0">
                <button
                  type="button"
                  aria-pressed={viewMode === 'month'}
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    viewMode === 'month'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.calendar.monthView}
                </button>
                <button
                  type="button"
                  aria-pressed={viewMode === 'week'}
                  onClick={() => {
                    setWeekAnchorIso(selectedDate);
                    setViewMode('week');
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    viewMode === 'week'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.calendar.weekView}
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Layer Toggles */}
          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-slate-100">
            <button
              type="button"
              aria-pressed={layers.tasks}
              onClick={() => toggleLayer('tasks')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                layers.tasks
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.calendar.layerTasks}</span>
            </button>

            <button
              type="button"
              aria-pressed={layers.meeting}
              onClick={() => toggleLayer('meeting')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                layers.meeting
                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
              }`}
            >
              <Users className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.calendar.layerMeetings}</span>
            </button>

            <button
              type="button"
              aria-pressed={layers.milestone}
              onClick={() => toggleLayer('milestone')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                layers.milestone
                  ? 'bg-indigo-50 text-indigo-800 border-indigo-300'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
              }`}
            >
              <Flag className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.calendar.layerMilestones}</span>
            </button>

            <button
              type="button"
              aria-pressed={layers.leave}
              onClick={() => toggleLayer('leave')}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                layers.leave
                  ? 'bg-teal-50 text-teal-800 border-teal-300'
                  : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{t.calendar.layerLeave}</span>
            </button>
          </div>
        </section>

        {/* Main Calendar + Selected Day Agenda Split */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* Calendar Grid Column */}
          <div className="xl:col-span-8 space-y-5">
            {viewMode === 'month' ? (
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Weekday Header */}
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                  {weekdayLabels.map((label, idx) => (
                    <div
                      key={label}
                      className={`py-2.5 px-2 text-center text-xs font-semibold ${
                        idx >= 5 ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      {label}
                    </div>
                  ))}
                </div>

                {/* Month Cells */}
                <div className="grid grid-cols-7 divide-x divide-y divide-slate-200/80">
                  {visibleDays.map((iso) => {
                    const dt = parseIsoDate(iso);
                    const inCurrentMonth = dt.getUTCMonth() === cursorMonth;
                    const isToday = iso === REFERENCE_TODAY;
                    const isSelected = iso === selectedDate;
                    const weekend = isWeekendIso(iso);

                    const cellData = dayDataMap.get(iso) ?? { events: [], tasksDue: [] };
                    const combinedItems: Array<
                      | { kind: 'event'; event: TeamEvent }
                      | { kind: 'task'; task: Task }
                    > = [
                      ...cellData.events.map((event) => ({ kind: 'event' as const, event })),
                      ...cellData.tasksDue.map((task) => ({ kind: 'task' as const, task })),
                    ];
                    const visibleItems = combinedItems.slice(0, 3);
                    const overflowCount = Math.max(0, combinedItems.length - 3);

                    return (
                      <div
                        key={iso}
                        onClick={() => setSelectedDate(iso)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedDate(iso);
                          }
                        }}
                        className={`group min-h-[112px] sm:min-h-[124px] p-1.5 sm:p-2 flex flex-col gap-1 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
                          isSelected
                            ? 'bg-blue-50/45'
                            : weekend
                              ? 'bg-slate-50/75 hover:bg-slate-100/60'
                              : 'bg-white hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 text-xs tabular-nums rounded-full ${
                              isToday
                                ? 'bg-blue-600 text-white font-semibold'
                                : isSelected
                                  ? 'bg-blue-100 text-blue-800 font-semibold'
                                  : inCurrentMonth
                                    ? 'text-slate-800 font-medium'
                                    : 'text-slate-400'
                            }`}
                          >
                            {dt.getUTCDate()}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(iso);
                              openAddEventForDate(iso);
                            }}
                            aria-label={`${t.calendar.addEventBtn} ${formatThaiDate(iso, lang)}`}
                            title={t.calendar.addEventBtn}
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-opacity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="space-y-1 flex-1 min-w-0">
                          {visibleItems.map((entry) => {
                            if (entry.kind === 'event') {
                              const ev = entry.event;
                              const style = EVENT_TYPE_STYLES[ev.type];
                              const Icon = style.icon;
                              return (
                                <button
                                  key={ev.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDate(iso);
                                  }}
                                  className={`w-full px-1.5 py-0.5 rounded border text-left text-[11px] font-medium flex items-center gap-1 truncate transition-colors ${style.cellBg} ${style.cellBorder} ${style.cellText}`}
                                >
                                  <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
                                  {ev.startTime && (
                                    <span className="tabular-nums opacity-75 shrink-0 hidden sm:inline">
                                      {ev.startTime}
                                    </span>
                                  )}
                                  <span className="truncate">{ev.title}</span>
                                </button>
                              );
                            }

                            const task = entry.task;
                            const dueState = getDueDateState(task.dueDate, task.status);
                            const isOverdue = dueState === 'overdue';
                            const isDone = task.status === 'done';

                            return (
                              <button
                                key={task.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDate(iso);
                                  openTaskDetail(task.id);
                                }}
                                className={`w-full px-1.5 py-0.5 rounded border text-left text-[11px] font-medium flex items-center gap-1 truncate transition-colors ${
                                  isOverdue
                                    ? 'bg-red-50 hover:bg-red-100/80 border-red-200 text-red-800'
                                    : isDone
                                      ? 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-800 line-through opacity-80'
                                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                    isOverdue
                                      ? 'bg-red-600'
                                      : STATUS_CONFIG[task.status].columnAccentClass
                                  }`}
                                  aria-hidden="true"
                                />
                                <span className="font-mono text-[10px] opacity-75 shrink-0 hidden md:inline">
                                  {task.code}
                                </span>
                                <span className="truncate">{task.title}</span>
                              </button>
                            );
                          })}

                          {overflowCount > 0 && (
                            <span className="block px-1 text-[11px] font-medium text-blue-700 tabular-nums">
                              {t.calendar.moreCount(overflowCount)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              /* Weekly Detailed Schedule Grid */
              <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                  {visibleDays.map((iso) => {
                    const dt = parseIsoDate(iso);
                    const isToday = iso === REFERENCE_TODAY;
                    const isSelected = iso === selectedDate;
                    const cellData = dayDataMap.get(iso) ?? { events: [], tasksDue: [] };

                    return (
                      <div
                        key={iso}
                        onClick={() => setSelectedDate(iso)}
                        className={`min-h-[340px] flex flex-col cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/35' : 'bg-white'
                        }`}
                      >
                        <div
                          className={`px-3 py-2.5 border-b border-slate-200 flex items-center justify-between ${
                            isToday ? 'bg-blue-50' : 'bg-slate-50/80'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-500">
                              {getIsoWeekdayShort(iso, lang)}
                            </span>
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 text-xs font-semibold tabular-nums rounded-full ${
                                isToday ? 'bg-blue-600 text-white' : 'text-slate-900'
                              }`}
                            >
                              {dt.getUTCDate()}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDate(iso);
                              openAddEventForDate(iso);
                            }}
                            aria-label={t.calendar.addEventBtn}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="p-2 space-y-2 flex-1">
                          {cellData.events.map((ev) => {
                            const style = EVENT_TYPE_STYLES[ev.type];
                            const Icon = style.icon;
                            return (
                              <div
                                key={ev.id}
                                className={`p-2 rounded-lg border text-xs space-y-1 ${style.cellBg} ${style.cellBorder} ${style.cellText}`}
                              >
                                <div className="flex items-center gap-1 text-[11px] font-medium opacity-80">
                                  <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
                                  <span className="tabular-nums">
                                    {ev.startTime
                                      ? `${ev.startTime}${ev.endTime ? `–${ev.endTime}` : ''}`
                                      : t.calendar.allDay}
                                  </span>
                                </div>
                                <p className="font-semibold leading-snug">{ev.title}</p>
                              </div>
                            );
                          })}

                          {cellData.tasksDue.map((task) => {
                            const assignee = getUserById(task.assigneeId);
                            const isOverdue =
                              getDueDateState(task.dueDate, task.status) === 'overdue';
                            return (
                              <button
                                key={task.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openTaskDetail(task.id);
                                }}
                                className={`w-full text-left p-2 rounded-lg border text-xs space-y-1.5 transition-colors ${
                                  isOverdue
                                    ? 'bg-red-50 border-red-200 hover:bg-red-100/70'
                                    : 'bg-white border-slate-200 hover:border-blue-300'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-mono text-[10px] font-semibold text-slate-600 tabular-nums">
                                    {task.code}
                                  </span>
                                  <Avatar user={assignee} size="xs" />
                                </div>
                                <p className="font-medium text-slate-900 leading-snug line-clamp-2">
                                  {task.title}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Team Leave & Out-of-Office Strip */}
            <section className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Palmtree className="w-4 h-4 text-teal-600 shrink-0" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-900">
                  {t.calendar.teamLeaveSummaryTitle}
                </h3>
              </div>

              {visibleLeaveEvents.length === 0 ? (
                <p className="text-xs text-slate-500">{t.calendar.teamLeaveEmpty}</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {visibleLeaveEvents.map((ev) => {
                    const member = ev.participantIds[0]
                      ? getUserById(ev.participantIds[0])
                      : undefined;
                    return (
                      <li
                        key={ev.id}
                        className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar user={member} size="xs" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{ev.title}</p>
                            {ev.notes && (
                              <p className="text-slate-500 truncate">{ev.notes}</p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedDate(ev.date)}
                          className="text-teal-700 hover:underline font-medium tabular-nums whitespace-nowrap shrink-0"
                        >
                          {formatThaiDate(ev.date, lang)}
                          {ev.endDate && ev.endDate > ev.date
                            ? ` – ${formatThaiDate(ev.endDate, lang)}`
                            : ev.startTime
                              ? ` · ${ev.startTime}–${ev.endTime ?? ''}`
                              : ''}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Right Column: Selected Day Agenda Inspector */}
          <aside className="xl:col-span-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                    <span>{t.calendar.agendaHeading}</span>
                  </p>
                  <h2 className="text-base font-bold text-slate-900 mt-1 tabular-nums">
                    {getIsoWeekdayShort(selectedDate, lang)} · {formatThaiDate(selectedDate, lang)}
                  </h2>
                </div>
                {selectedDate === REFERENCE_TODAY && (
                  <span className="text-xs font-semibold text-blue-700">
                    {t.calendar.todayBtn}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => openAddEventForDate(selectedDate)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.calendar.addEventBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    openCreateTaskModal({
                      startDate: selectedDate,
                      dueDate: selectedDate,
                      projectId: projectFilter !== 'all' ? projectFilter : undefined,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{t.calendar.addTaskOnDay}</span>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              {/* Team Events Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-500">
                    {t.calendar.eventsSection}
                  </h3>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {selectedDayEvents.length}
                  </span>
                </div>

                {selectedDayEvents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">{t.calendar.noEventsDay}</p>
                ) : (
                  <ul className="space-y-2.5">
                    {selectedDayEvents.map((ev) => {
                      const style = EVENT_TYPE_STYLES[ev.type];
                      const Icon = style.icon;
                      const project = ev.projectId ? getProjectById(ev.projectId) : undefined;
                      const participants = ev.participantIds
                        .map((id) => getUserById(id))
                        .filter((u): u is NonNullable<typeof u> => Boolean(u));

                      return (
                        <li
                          key={ev.id}
                          className="p-3 rounded-lg border border-slate-200 bg-white space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span
                                  className={`inline-flex items-center gap-1 font-semibold ${style.labelText}`}
                                >
                                  <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                  <span>{t.calendar.typeLabels[ev.type]}</span>
                                </span>
                                <span aria-hidden="true" className="text-slate-300">
                                  ·
                                </span>
                                <span className="inline-flex items-center gap-1 text-slate-500 tabular-nums">
                                  <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                                  {ev.startTime
                                    ? `${ev.startTime}${ev.endTime ? ` – ${ev.endTime}` : ''}`
                                    : t.calendar.allDay}
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-slate-900 leading-snug">
                                {ev.title}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => deleteCalendarEvent(ev.id)}
                              aria-label={t.calendar.deleteEventAria}
                              title={t.calendar.deleteEventAria}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {project && (
                            <p className="text-xs text-slate-500 flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-[2px] shrink-0"
                                style={{ backgroundColor: project.accentColor }}
                                aria-hidden="true"
                              />
                              <span className="truncate">{project.name}</span>
                            </p>
                          )}

                          {ev.notes && (
                            <p className="text-xs text-slate-600 leading-relaxed">{ev.notes}</p>
                          )}

                          {participants.length > 0 && (
                            <div className="flex items-center gap-2 pt-1">
                              <div className="flex -space-x-1.5">
                                {participants.slice(0, 5).map((u) => (
                                  <div key={u.id} className="ring-2 ring-white rounded-full">
                                    <Avatar user={u} size="xs" />
                                  </div>
                                ))}
                              </div>
                              <span className="text-[11px] text-slate-500 truncate">
                                {participants.map((u) => u.name.split(' ')[0]).join(', ')}
                              </span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Tasks Due on Selected Day */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-slate-500">
                    {t.calendar.tasksDueSection}
                  </h3>
                  <span className="text-xs text-slate-400 tabular-nums">
                    {selectedDayTasksDue.length}
                  </span>
                </div>

                {selectedDayTasksDue.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">{t.calendar.noTasksDay}</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedDayTasksDue.map((task) => {
                      const project = getProjectById(task.projectId);
                      const assignee = getUserById(task.assigneeId);
                      const isOverdue =
                        getDueDateState(task.dueDate, task.status) === 'overdue';

                      return (
                        <li key={task.id}>
                          <button
                            type="button"
                            onClick={() => openTaskDetail(task.id)}
                            className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition-colors space-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-500 min-w-0">
                                <span className="font-mono font-semibold text-slate-700 tabular-nums shrink-0">
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
                              <Avatar user={assignee} size="xs" />
                            </div>

                            <p className="text-sm font-medium text-slate-900 leading-snug">
                              {task.title}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span
                                className={`font-medium ${
                                  isOverdue
                                    ? 'text-red-600'
                                    : STATUS_CONFIG[task.status].textClass
                                }`}
                              >
                                {getStatusLabel(task.status)}
                              </span>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <PriorityLabel priority={task.priority} compact />
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Active Tasks Spanning This Day */}
              {selectedDayActiveTasks.length > 0 && (
                <div className="space-y-2.5 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-slate-500">
                      {t.calendar.tasksActiveSection}
                    </h3>
                    <span className="text-xs text-slate-400 tabular-nums">
                      {selectedDayActiveTasks.length}
                    </span>
                  </div>

                  <ul className="divide-y divide-slate-100">
                    {selectedDayActiveTasks.map((task) => {
                      const assignee = getUserById(task.assigneeId);
                      return (
                        <li key={task.id} className="py-2">
                          <button
                            type="button"
                            onClick={() => openTaskDetail(task.id)}
                            className="w-full flex items-center justify-between gap-2.5 text-left hover:text-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span className="font-mono font-semibold text-slate-700 tabular-nums">
                                  {task.code}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className={STATUS_CONFIG[task.status].textClass}>
                                  {getStatusLabel(task.status)}
                                </span>
                              </div>
                              <p className="text-xs font-medium text-slate-800 truncate">
                                {task.title}
                              </p>
                            </div>
                            <Avatar user={assignee} size="xs" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <CalendarEventModal
        open={eventModalOpen}
        defaultDate={eventModalDate}
        onClose={() => setEventModalOpen(false)}
      />
    </>
  );
}
