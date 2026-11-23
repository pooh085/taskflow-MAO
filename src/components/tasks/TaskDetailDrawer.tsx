import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BellRing,
  ExternalLink,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useTaskFlow } from '../../context/TaskFlowContext';
import {
  PRIORITY_ORDER,
  STATUS_ORDER,
  TaskPriority,
  TaskStatus,
} from '../../types/taskflow';
import { formatThaiDateTime, getDueDateMeta } from '../../utils/dateUtils';
import { Avatar } from '../common/Avatar';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

export function TaskDetailDrawer() {
  const {
    selectedTask,
    closeTaskDetail,
    projects,
    users,
    currentUser,
    isAdmin,
    getUserById,
    getProjectById,
    moveTaskStatus,
    toggleFollowTask,
    updateTask,
    deleteTask,
    addComment,
    openEditTaskModal,
  } = useTaskFlow();
  const { lang, t, getStatusLabel, getPriorityLabel, localizeCommentContent } = useLanguage();

  const [commentText, setCommentText] = useState('');
  const [commentError, setCommentError] = useState('');
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setCommentText('');
    setCommentError('');
    setConfirmDeleteOpen(false);
  }, [selectedTask?.id]);

  useEffect(() => {
    if (!selectedTask) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !confirmDeleteOpen) {
        closeTaskDetail();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedTask, confirmDeleteOpen, closeTaskDetail]);

  if (!selectedTask) return null;

  const project = getProjectById(selectedTask.projectId);
  const dueMeta = getDueDateMeta(selectedTask.dueDate, selectedTask.status, lang);
  const isFollowing = selectedTask.followerIds.includes(currentUser.id);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) {
      setCommentError(t.detail.commentEmptyError);
      return;
    }
    addComment(selectedTask.id, commentText);
    setCommentText('');
    setCommentError('');
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 flex justify-end bg-slate-900/35 backdrop-blur-[1px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-task-title"
        onClick={closeTaskDetail}
      >
        <aside
          className="w-full max-w-xl bg-white h-full border-l border-slate-200 shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top header bar */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2 min-w-0 text-xs text-slate-500">
              <span className="font-mono font-semibold text-slate-800 tabular-nums shrink-0">
                {selectedTask.code}
              </span>
              {project && (
                <>
                  <span aria-hidden="true" className="text-slate-300">
                    /
                  </span>
                  <span className="truncate">{project.name}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                aria-pressed={isFollowing}
                onClick={() => toggleFollowTask(selectedTask.id)}
                title={
                  isFollowing
                    ? t.notifications.unfollowTooltip
                    : t.notifications.followTooltip
                }
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isFollowing
                    ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100/80'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {isFollowing ? (
                  <BellRing className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <Bell className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {isFollowing ? t.notifications.followingBtn : t.notifications.followBtn}
                </span>
                <span className="text-[11px] opacity-75 tabular-nums">
                  {selectedTask.followerIds.length}
                </span>
              </button>
              <Link
                to={`/tasks/${selectedTask.id}`}
                onClick={closeTaskDetail}
                title={t.actions.openFullPage}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
              <button
                type="button"
                onClick={() => openEditTaskModal(selectedTask)}
                title={t.actions.editDetailsAria}
                aria-label={t.actions.editDetailsAria}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={!isAdmin}
                onClick={() => isAdmin && setConfirmDeleteOpen(true)}
                title={isAdmin ? t.actions.delete : t.roles.adminOnlyDeleteTaskTitle}
                aria-label={isAdmin ? t.actions.delete : t.roles.adminOnlyDeleteTaskTitle}
                className={`p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
                  isAdmin
                    ? 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={closeTaskDetail}
                aria-label={t.actions.closeDrawerAria}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div>
              <h2
                id="drawer-task-title"
                className="text-lg font-semibold text-slate-900 leading-snug"
              >
                {selectedTask.title}
              </h2>
              <p className="mt-2.5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {selectedTask.description || t.detail.noDescription}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-y border-slate-200">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-500">{t.taskForm.statusLabel}</span>
                <select
                  value={selectedTask.status}
                  onChange={(e) =>
                    moveTaskStatus(selectedTask.id, e.target.value as TaskStatus)
                  }
                  className="h-9 px-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                >
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {getStatusLabel(s)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-500">
                  {t.detail.priorityLevelLabel}
                </span>
                <select
                  value={selectedTask.priority}
                  onChange={(e) =>
                    updateTask(selectedTask.id, { priority: e.target.value as TaskPriority })
                  }
                  className="h-9 px-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                >
                  {PRIORITY_ORDER.map((p) => (
                    <option key={p} value={p}>
                      {getPriorityLabel(p, false)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-500">
                  {t.taskForm.assigneeLabel}
                </span>
                <select
                  value={selectedTask.assigneeId ?? ''}
                  onChange={(e) =>
                    updateTask(selectedTask.id, { assigneeId: e.target.value || null })
                  }
                  className="h-9 px-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                >
                  <option value="">{t.filters.unassigned}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-500">
                  {t.taskForm.projectLabel}
                </span>
                <select
                  value={selectedTask.projectId}
                  onChange={(e) => updateTask(selectedTask.id, { projectId: e.target.value })}
                  className="h-9 px-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-slate-500">
                  {t.taskForm.startDateLabel}
                </span>
                <input
                  type="date"
                  value={selectedTask.startDate ?? ''}
                  onChange={(e) =>
                    updateTask(selectedTask.id, { startDate: e.target.value || null })
                  }
                  className="h-9 px-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 tabular-nums focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-slate-500">
                    {t.taskForm.dueDateLabel}
                  </span>
                  <span className={`text-xs tabular-nums truncate ${dueMeta.textClass}`}>
                    {dueMeta.label}
                  </span>
                </div>
                <input
                  type="date"
                  value={selectedTask.dueDate ?? ''}
                  onChange={(e) =>
                    updateTask(selectedTask.id, { dueDate: e.target.value || null })
                  }
                  className="h-9 px-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 tabular-nums focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 tabular-nums">
              <span>
                {t.detail.createdAt} {formatThaiDateTime(selectedTask.createdAt, lang)}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {t.detail.updatedAt} {formatThaiDateTime(selectedTask.updatedAt, lang)}
              </span>
            </div>

            <section aria-label={t.detail.commentsSectionAria} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" aria-hidden="true" />
                  <span>{t.detail.commentsHeading}</span>
                  <span className="text-xs font-normal text-slate-500 tabular-nums">
                    ({selectedTask.comments.length})
                  </span>
                </h3>
              </div>

              {selectedTask.comments.length === 0 ? (
                <div className="py-6 px-4 text-center bg-slate-50 border border-slate-200/80 rounded-lg">
                  <p className="text-xs text-slate-500">{t.detail.noComments}</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {selectedTask.comments.map((comment) => {
                    const author = getUserById(comment.authorId);
                    return (
                      <li key={comment.id} className="flex items-start gap-3">
                        <Avatar user={author} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                            <span className="font-semibold text-slate-900">
                              {author?.name ?? t.detail.teamMemberFallback}
                            </span>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="text-slate-400 tabular-nums">
                              {formatThaiDateTime(comment.createdAt, lang)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {localizeCommentContent(comment)}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <form onSubmit={handleCommentSubmit} className="pt-2 space-y-2">
                <div className="flex items-start gap-3">
                  <Avatar user={currentUser} size="sm" />
                  <div className="flex-1">
                    <textarea
                      rows={3}
                      value={commentText}
                      onChange={(e) => {
                        setCommentText(e.target.value);
                        if (commentError) setCommentError('');
                      }}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                          handleCommentSubmit(e);
                        }
                      }}
                      placeholder={t.detail.commentPlaceholder}
                      aria-label={t.detail.commentInputAria}
                      aria-invalid={Boolean(commentError)}
                      className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 resize-y ${
                        commentError
                          ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                          : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                      }`}
                    />
                    {commentError && (
                      <p role="alert" className="mt-1 flex items-center gap-1.5 text-xs text-red-600">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{commentError}</span>
                      </p>
                    )}
                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                      >
                        <Send className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t.actions.sendComment}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </section>
          </div>
        </aside>
      </div>

      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        title={t.detail.confirmDeleteTitle(selectedTask.code)}
        description={t.detail.confirmDeleteDesc(selectedTask.title)}
        onConfirm={() => {
          deleteTask(selectedTask.id);
          setConfirmDeleteOpen(false);
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}
