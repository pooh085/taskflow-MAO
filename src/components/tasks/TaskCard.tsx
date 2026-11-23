import React, { useState } from 'react';
import {
  ArrowLeftRight,
  Calendar,
  GripVertical,
  MessageSquare,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTaskFlow } from '../../context/TaskFlowContext';
import { STATUS_ORDER, Task, TaskStatus } from '../../types/taskflow';
import { getDueDateMeta } from '../../utils/dateUtils';
import { Avatar } from '../common/Avatar';
import { PriorityLabel } from '../common/PriorityLabel';

interface TaskCardProps {
  task: Task;
  showProjectName?: boolean;
  onDragStart: (e: React.DragEvent<HTMLElement>, taskId: string) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
}

export function TaskCard({
  task,
  showProjectName = true,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: TaskCardProps) {
  const { getUserById, getProjectById, openTaskDetail, moveTaskStatus } = useTaskFlow();
  const { lang, t, getStatusLabel } = useLanguage();
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);

  const assignee = getUserById(task.assigneeId);
  const project = getProjectById(task.projectId);
  const dueMeta = getDueDateMeta(task.dueDate, task.status, lang);

  const handleStatusChange = (newStatus: TaskStatus) => {
    moveTaskStatus(task.id, newStatus);
    setMoveMenuOpen(false);
  };

  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      className={`group relative bg-white border rounded-lg p-3.5 transition-all duration-150 hover:shadow-xs ${
        task.priority === 'critical'
          ? 'border-red-200 hover:border-red-300'
          : 'border-slate-200 hover:border-blue-300'
      } ${isDragging ? 'opacity-40 scale-[0.99]' : 'opacity-100'}`}
    >
      {/* Top kicker line */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0 text-xs text-slate-500">
          <GripVertical
            className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 shrink-0 cursor-grab active:cursor-grabbing"
            aria-hidden="true"
          />
          <span className="font-mono font-medium text-slate-600 tabular-nums shrink-0">
            {task.code}
          </span>
          {showProjectName && project && (
            <>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="truncate">{project.name}</span>
            </>
          )}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMoveMenuOpen((prev) => !prev);
            }}
            aria-expanded={moveMenuOpen}
            aria-haspopup="menu"
            aria-label={t.board.moveStatusAria(task.code)}
            title={t.board.moveStatusTitle}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          {moveMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  setMoveMenuOpen(false);
                }}
              />
              <div
                role="menu"
                aria-label={t.board.moveMenuAria}
                className="absolute right-0 top-8 z-30 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[11px] font-medium text-slate-400 border-b border-slate-100">
                  {t.board.moveMenuHeader}
                </div>
                {STATUS_ORDER.map((statusKey) => {
                  const isCurrent = task.status === statusKey;
                  return (
                    <button
                      key={statusKey}
                      type="button"
                      role="menuitem"
                      disabled={isCurrent}
                      onClick={() => handleStatusChange(statusKey)}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:bg-blue-50 ${
                        isCurrent
                          ? 'text-slate-400 bg-slate-50 cursor-default'
                          : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                      }`}
                    >
                      <span>{getStatusLabel(statusKey)}</span>
                      {isCurrent && (
                        <span className="text-[11px] text-slate-400">{t.board.current}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Primary clickable title */}
      <button
        type="button"
        onClick={() => openTaskDetail(task.id)}
        className="w-full text-left block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
      >
        <h3 className="text-sm font-semibold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
          {task.title}
        </h3>
      </button>

      {/* Clean unboxed metadata row */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 text-xs">
          <PriorityLabel priority={task.priority} compact />
          <span aria-hidden="true" className="text-slate-300">
            ·
          </span>
          <span
            className={`inline-flex items-center gap-1 whitespace-nowrap tabular-nums ${dueMeta.textClass}`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>{dueMeta.label}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {task.comments.length > 0 && (
            <button
              type="button"
              onClick={() => openTaskDetail(task.id)}
              aria-label={t.board.commentsAria(task.comments.length)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 tabular-nums transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{task.comments.length}</span>
            </button>
          )}
          <Avatar user={assignee} size="xs" />
        </div>
      </div>
    </article>
  );
}
