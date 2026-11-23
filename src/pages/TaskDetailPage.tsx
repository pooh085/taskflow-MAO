import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BellRing,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDeleteModal } from '../components/tasks/ConfirmDeleteModal';
import { useLanguage } from '../context/LanguageContext';
import { useTaskFlow } from '../context/TaskFlowContext';
import {
  PRIORITY_ORDER,
  STATUS_ORDER,
  TaskPriority,
  TaskStatus,
} from '../types/taskflow';
import { formatThaiDateTime, getDueDateMeta } from '../utils/dateUtils';

export function TaskDetailPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const {
    tasks,
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

  const task = tasks.find((item) => item.id === taskId);

  if (!task) {
    return (
      <EmptyState
        title={t.empty.taskNotFoundTitle}
        description={t.empty.taskNotFoundDesc}
        primaryAction={{
          label: t.actions.backToBoard,
          onClick: () => navigate('/board'),
        }}
      />
    );
  }

  const project = getProjectById(task.projectId);
  const dueMeta = getDueDateMeta(task.dueDate, task.status, lang);
  const isFollowing = task.followerIds.includes(currentUser.id);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) {
      setCommentError(t.detail.commentEmptyError);
      return;
    }
    addComment(task.id, commentText);
    setCommentText('');
    setCommentError('');
  };

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>{t.actions.back}</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={isFollowing}
              onClick={() => toggleFollowTask(task.id)}
              title={
                isFollowing
                  ? t.notifications.unfollowTooltip
                  : t.notifications.followTooltip
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                isFollowing
                  ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100/80'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
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
                {task.followerIds.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => openEditTaskModal(task)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
            >
              <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.actions.editTask}</span>
            </button>
            <button
              type="button"
              disabled={!isAdmin}
              title={isAdmin ? t.actions.delete : t.roles.adminOnlyDeleteTaskTitle}
              onClick={() => isAdmin && setConfirmDeleteOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                isAdmin
                  ? 'text-red-600 bg-white border-red-200 hover:bg-red-50'
                  : 'text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.actions.delete}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono font-semibold text-slate-700 tabular-nums">
                  {task.code}
                </span>
                {project && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span>{project.name}</span>
                  </>
                )}
              </div>

              <h1 className="text-xl font-bold text-slate-900 leading-snug">{task.title}</h1>

              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {task.description || t.detail.noDescription}
              </p>

              <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 tabular-nums">
                <span>
                  {t.detail.createdAt} {formatThaiDateTime(task.createdAt, lang)}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {t.detail.updatedAt} {formatThaiDateTime(task.updatedAt, lang)}
                </span>
              </div>
            </section>

            <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span>{t.detail.commentsFullHeading}</span>
                <span className="text-xs font-normal text-slate-500 tabular-nums">
                  ({task.comments.length})
                </span>
              </h2>

              {task.comments.length === 0 ? (
                <div className="py-8 px-4 text-center bg-slate-50 border border-slate-200/80 rounded-lg text-xs text-slate-500">
                  {t.detail.noCommentsShort}
                </div>
              ) : (
                <ul className="space-y-4">
                  {task.comments.map((comment) => {
                    const author = getUserById(comment.authorId);
                    return (
                      <li key={comment.id} className="flex items-start gap-3">
                        <Avatar user={author} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-baseline gap-x-2 text-xs">
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

              <form onSubmit={handleCommentSubmit} className="pt-4 border-t border-slate-100">
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
                      placeholder={t.detail.commentPlaceholderShort}
                      aria-label={t.detail.commentInputAria}
                      className={`w-full px-3 py-2 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        commentError
                          ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                          : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                      }`}
                    />
                    {commentError && (
                      <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{commentError}</span>
                      </p>
                    )}
                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap"
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

          <aside className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900">{t.detail.propertiesHeading}</h2>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-500">{t.taskForm.statusLabel}</span>
              <select
                value={task.status}
                onChange={(e) => moveTaskStatus(task.id, e.target.value as TaskStatus)}
                className="h-9 px-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {getStatusLabel(s)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-500">{t.taskForm.priorityLabel}</span>
              <select
                value={task.priority}
                onChange={(e) =>
                  updateTask(task.id, { priority: e.target.value as TaskPriority })
                }
                className="h-9 px-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
              >
                {PRIORITY_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {getPriorityLabel(p, false)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-500">{t.taskForm.assigneeLabel}</span>
              <select
                value={task.assigneeId ?? ''}
                onChange={(e) =>
                  updateTask(task.id, { assigneeId: e.target.value || null })
                }
                className="h-9 px-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
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
              <span className="text-xs text-slate-500">{t.taskForm.projectLabel}</span>
              <select
                value={task.projectId}
                onChange={(e) => updateTask(task.id, { projectId: e.target.value })}
                className="h-9 px-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-slate-500">{t.taskForm.startDateLabel}</span>
              <input
                type="date"
                value={task.startDate ?? ''}
                onChange={(e) => updateTask(task.id, { startDate: e.target.value || null })}
                className="h-9 px-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 tabular-nums focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{t.taskForm.dueDateLabel}</span>
                <span className={`text-xs tabular-nums ${dueMeta.textClass}`}>
                  {dueMeta.label}
                </span>
              </div>
              <input
                type="date"
                value={task.dueDate ?? ''}
                onChange={(e) => updateTask(task.id, { dueDate: e.target.value || null })}
                className="h-9 px-2.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 tabular-nums focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </label>
          </aside>
        </div>
      </div>

      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        title={t.detail.confirmDeleteTitle(task.code)}
        description={t.detail.confirmDeleteDesc(task.title)}
        onConfirm={() => {
          deleteTask(task.id);
          setConfirmDeleteOpen(false);
          navigate('/board');
        }}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </>
  );
}
