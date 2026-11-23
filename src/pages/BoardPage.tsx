import React, { useState } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { FilterBar } from '../components/tasks/FilterBar';
import { TaskCard } from '../components/tasks/TaskCard';
import { useLanguage } from '../context/LanguageContext';
import { useTaskFlow } from '../context/TaskFlowContext';
import { PRIORITY_CONFIG, STATUS_CONFIG, STATUS_ORDER, TaskStatus } from '../types/taskflow';

export function BoardPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const {
    tasks,
    getProjectById,
    getFilteredTasks,
    moveTaskStatus,
    openCreateTaskModal,
    resetFilters,
  } = useTaskFlow();
  const { t, getStatusLabel } = useLanguage();

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

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

  const handleDragStart = (e: React.DragEvent<HTMLElement>, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLElement>, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLElement>, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      moveTaskStatus(taskId, targetStatus);
    }
    setDraggedTaskId(null);
    setDragOverStatus(null);
  };

  return (
    <div>
      <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {scopedProject ? scopedProject.name : t.board.heading}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {scopedProject ? scopedProject.description : t.board.subtitle}
          </p>
        </div>
      </div>

      <FilterBar
        activeView="board"
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
      ) : filteredTasks.length === 0 ? (
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {STATUS_ORDER.map((statusKey) => {
            const columnTasks = filteredTasks
              .filter((item) => item.status === statusKey)
              .sort(
                (a, b) =>
                  PRIORITY_CONFIG[a.priority].order - PRIORITY_CONFIG[b.priority].order
              );
            const config = STATUS_CONFIG[statusKey];
            const statusLabel = getStatusLabel(statusKey);
            const isDropTarget = dragOverStatus === statusKey;

            return (
              <section
                key={statusKey}
                aria-label={t.board.columnAria(statusLabel)}
                onDragOver={(e) => handleDragOver(e, statusKey)}
                onDragLeave={() => {
                  if (dragOverStatus === statusKey) setDragOverStatus(null);
                }}
                onDrop={(e) => handleDrop(e, statusKey)}
                className={`rounded-xl border transition-colors min-h-[260px] flex flex-col ${
                  isDropTarget
                    ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20'
                    : 'bg-slate-100/80 border-slate-200/90'
                }`}
              >
                <div className="px-4 py-3 flex items-center justify-between border-b border-slate-200/80">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-xs shrink-0 ${config.columnAccentClass}`}
                      aria-hidden="true"
                    />
                    <h2 className="text-sm font-semibold text-slate-800 truncate">
                      {statusLabel}
                    </h2>
                  </div>
                  <span className="text-xs font-medium text-slate-500 tabular-nums shrink-0">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="p-3 space-y-2.5 flex-1">
                  {columnTasks.length === 0 ? (
                    <div className="py-8 px-3 text-center border border-dashed border-slate-300/80 rounded-lg text-xs text-slate-400">
                      {t.board.dropHint(statusLabel)}
                    </div>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        showProjectName={!projectId}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDragging={draggedTaskId === task.id}
                      />
                    ))
                  )}
                </div>

                <div className="px-3 pb-3">
                  <button
                    type="button"
                    onClick={() => openCreateTaskModal({ status: statusKey, projectId })}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium text-slate-600 hover:text-blue-700 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                  >
                    <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{t.actions.addTaskInColumn}</span>
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
