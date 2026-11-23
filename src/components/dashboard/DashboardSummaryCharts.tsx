import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLanguage } from '../../context/LanguageContext';
import { useTaskFlow } from '../../context/TaskFlowContext';
import { STATUS_ORDER, TaskStatus } from '../../types/taskflow';

const STATUS_CHART_COLORS: Record<TaskStatus, string> = {
  todo: '#94A3B8',
  in_progress: '#2563EB',
  in_review: '#F59E0B',
  done: '#16A34A',
};

interface StatusDatum {
  key: TaskStatus;
  name: string;
  value: number;
  percent: number;
  color: string;
}

interface WorkloadDatum {
  id: string;
  shortName: string;
  fullName: string;
  todo: number;
  active: number;
  done: number;
  total: number;
}

export function DashboardSummaryCharts() {
  const { tasks, users, setFilter, resetFilters } = useTaskFlow();
  const { t, getStatusLabel } = useLanguage();
  const navigate = useNavigate();

  const totalTasks = tasks.length;

  const statusData = useMemo<StatusDatum[]>(() => {
    return STATUS_ORDER.map((statusKey) => {
      const count = tasks.filter((item) => item.status === statusKey).length;
      const percent = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
      return {
        key: statusKey,
        name: getStatusLabel(statusKey),
        value: count,
        percent,
        color: STATUS_CHART_COLORS[statusKey],
      };
    });
  }, [tasks, totalTasks, getStatusLabel]);

  const nonZeroStatusData = useMemo(
    () => statusData.filter((d) => d.value > 0),
    [statusData]
  );

  const workloadData = useMemo<WorkloadDatum[]>(() => {
    const memberRows: WorkloadDatum[] = users.map((user) => {
      const userTasks = tasks.filter((item) => item.assigneeId === user.id);
      const todo = userTasks.filter((item) => item.status === 'todo').length;
      const active = userTasks.filter(
        (item) => item.status === 'in_progress' || item.status === 'in_review'
      ).length;
      const done = userTasks.filter((item) => item.status === 'done').length;

      return {
        id: user.id,
        shortName: user.name.split(' ')[0],
        fullName: user.name,
        todo,
        active,
        done,
        total: userTasks.length,
      };
    });

    const unassignedTasks = tasks.filter((item) => item.assigneeId === null);
    if (unassignedTasks.length > 0) {
      memberRows.push({
        id: 'unassigned',
        shortName: t.dashboard.unassignedShort,
        fullName: t.dashboard.unassignedFull,
        todo: unassignedTasks.filter((item) => item.status === 'todo').length,
        active: unassignedTasks.filter(
          (item) => item.status === 'in_progress' || item.status === 'in_review'
        ).length,
        done: unassignedTasks.filter((item) => item.status === 'done').length,
        total: unassignedTasks.length,
      });
    }

    return memberRows;
  }, [tasks, users, t]);

  const handleFilterByStatus = (status: TaskStatus) => {
    resetFilters();
    setFilter('status', status);
    navigate('/board');
  };

  const handleFilterByAssignee = (assigneeId: string) => {
    resetFilters();
    setFilter('assigneeId', assigneeId);
    navigate('/board');
  };

  return (
    <section
      aria-label={t.dashboard.chartsAria}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Left: Task Distribution by Status (Donut Chart) */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-900">{t.dashboard.statusChartTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">{t.dashboard.statusChartSub}</p>
        </div>

        {totalTasks === 0 ? (
          <div className="flex-1 min-h-[220px] flex items-center justify-center text-xs text-slate-400">
            {t.dashboard.statusChartEmpty}
          </div>
        ) : (
          <div className="flex-1 flex flex-col sm:flex-row items-center gap-5">
            <div className="relative w-44 h-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={nonZeroStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={76}
                    paddingAngle={2}
                    strokeWidth={0}
                    isAnimationActive={false}
                    onClick={(_data, index) => {
                      const item = nonZeroStatusData[index];
                      if (item) handleFilterByStatus(item.key);
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    {nonZeroStatusData.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload as StatusDatum;
                      return (
                        <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-md text-xs">
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-slate-600 tabular-nums mt-0.5">
                            {t.dashboard.tasksCount(item.value)} ({item.percent}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-slate-900 tabular-nums leading-none">
                  {totalTasks}
                </span>
                <span className="text-[11px] text-slate-500 mt-1">
                  {t.dashboard.totalCenterLabel}
                </span>
              </div>
            </div>

            <ul className="w-full flex-1 space-y-1.5">
              {statusData.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => handleFilterByStatus(item.key)}
                    className="w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-medium text-slate-700 truncate">
                        {item.name}
                      </span>
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap shrink-0">
                      <strong className="font-semibold text-slate-900">{item.value}</strong>
                      <span className="text-slate-400"> · {item.percent}%</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Right: Member Workload (Stacked Bar Chart) */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t.dashboard.workloadChartTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.dashboard.workloadChartSub}</p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 shrink-0">
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-blue-600" aria-hidden="true" />
              <span>{t.dashboard.legendActive}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-slate-300" aria-hidden="true" />
              <span>{t.dashboard.legendTodo}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2.5 h-2.5 rounded-[3px] bg-emerald-600" aria-hidden="true" />
              <span>{t.dashboard.legendDone}</span>
            </span>
          </div>
        </div>

        {totalTasks === 0 ? (
          <div className="flex-1 min-h-[220px] flex items-center justify-center text-xs text-slate-400">
            {t.dashboard.workloadChartEmpty}
          </div>
        ) : (
          <div className="w-full h-[228px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={workloadData}
                margin={{ top: 8, right: 8, left: -20, bottom: 4 }}
                barCategoryGap="28%"
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis
                  dataKey="shortName"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 12 }}
                  dy={6}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: '#F8FAFC' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as WorkloadDatum;
                    return (
                      <div className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 shadow-md text-xs space-y-1.5 min-w-[180px]">
                        <p className="font-semibold text-slate-900 border-b border-slate-100 pb-1">
                          {row.fullName}
                        </p>
                        <div className="flex items-center justify-between gap-4 tabular-nums">
                          <span className="text-slate-600">{t.dashboard.legendActive}</span>
                          <span className="font-medium text-blue-600">
                            {t.dashboard.tasksCount(row.active)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 tabular-nums">
                          <span className="text-slate-600">{t.dashboard.legendTodo}</span>
                          <span className="font-medium text-slate-700">
                            {t.dashboard.tasksCount(row.todo)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 tabular-nums">
                          <span className="text-slate-600">{t.dashboard.legendDone}</span>
                          <span className="font-medium text-emerald-600">
                            {t.dashboard.tasksCount(row.done)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 tabular-nums">
                          <span className="font-medium text-slate-700">
                            {t.dashboard.tooltipTotal}
                          </span>
                          <span className="font-semibold text-slate-900">
                            {t.dashboard.tasksCount(row.total)}
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar
                  dataKey="active"
                  stackId="workload"
                  fill="#2563EB"
                  maxBarSize={36}
                  isAnimationActive={false}
                  className="cursor-pointer"
                  onClick={(entry) => {
                    const data = (entry as { payload?: WorkloadDatum; id?: string })?.payload;
                    const id = data?.id ?? (entry as { id?: string })?.id;
                    if (id) handleFilterByAssignee(id);
                  }}
                />
                <Bar
                  dataKey="todo"
                  stackId="workload"
                  fill="#CBD5E1"
                  maxBarSize={36}
                  isAnimationActive={false}
                  className="cursor-pointer"
                  onClick={(entry) => {
                    const data = (entry as { payload?: WorkloadDatum; id?: string })?.payload;
                    const id = data?.id ?? (entry as { id?: string })?.id;
                    if (id) handleFilterByAssignee(id);
                  }}
                />
                <Bar
                  dataKey="done"
                  stackId="workload"
                  fill="#16A34A"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                  isAnimationActive={false}
                  className="cursor-pointer"
                  onClick={(entry) => {
                    const data = (entry as { payload?: WorkloadDatum; id?: string })?.payload;
                    const id = data?.id ?? (entry as { id?: string })?.id;
                    if (id) handleFilterByAssignee(id);
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  );
}
