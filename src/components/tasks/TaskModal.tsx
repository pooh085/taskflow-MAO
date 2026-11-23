import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTaskFlow } from '../../context/TaskFlowContext';
import {
  PRIORITY_ORDER,
  STATUS_ORDER,
  TaskPriority,
  TaskStatus,
} from '../../types/taskflow';

interface FormErrors {
  title?: string;
  projectId?: string;
  dueDate?: string;
}

export function TaskModal() {
  const {
    taskModal,
    closeTaskModal,
    projects,
    users,
    createTask,
    updateTask,
  } = useTaskFlow();
  const { t, getStatusLabel, getPriorityLabel } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!taskModal.open) return;

    if (taskModal.mode === 'edit' && taskModal.taskToEdit) {
      const target = taskModal.taskToEdit;
      setTitle(target.title);
      setDescription(target.description);
      setProjectId(target.projectId);
      setStatus(target.status);
      setPriority(target.priority);
      setAssigneeId(target.assigneeId ?? '');
      setStartDate(target.startDate ?? '');
      setDueDate(target.dueDate ?? '');
    } else {
      setTitle('');
      setDescription('');
      setProjectId(taskModal.defaultProjectId || projects[0]?.id || '');
      setStatus(taskModal.defaultStatus || 'todo');
      setPriority('medium');
      setAssigneeId('');
      setStartDate(taskModal.defaultStartDate ?? '');
      setDueDate(taskModal.defaultDueDate ?? '');
    }
    setErrors({});

    window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 30);
  }, [taskModal, projects]);

  useEffect(() => {
    if (!taskModal.open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeTaskModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [taskModal.open, closeTaskModal]);

  if (!taskModal.open) return null;

  const validate = (): FormErrors => {
    const nextErrors: FormErrors = {};
    const trimmed = title.trim();
    if (!trimmed) {
      nextErrors.title = t.taskForm.errTitleRequired;
    } else if (trimmed.length < 3) {
      nextErrors.title = t.taskForm.errTitleMin;
    } else if (trimmed.length > 140) {
      nextErrors.title = t.taskForm.errTitleMax;
    }
    if (!projectId) {
      nextErrors.projectId = t.taskForm.errProjectRequired;
    }
    if (startDate && dueDate && dueDate < startDate) {
      nextErrors.dueDate = t.taskForm.errDateRange;
    }
    return nextErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      if (validationErrors.title) {
        titleInputRef.current?.focus();
      }
      return;
    }

    const payload = {
      title,
      description,
      projectId,
      status,
      priority,
      assigneeId: assigneeId || null,
      startDate: startDate || null,
      dueDate: dueDate || null,
    };

    if (taskModal.mode === 'edit' && taskModal.taskToEdit) {
      updateTask(taskModal.taskToEdit.id, payload);
    } else {
      createTask(payload);
    }
    closeTaskModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
      onClick={closeTaskModal}
    >
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="task-modal-title" className="text-base font-semibold text-slate-900">
            {taskModal.mode === 'edit' && taskModal.taskToEdit
              ? t.taskForm.editHeading(taskModal.taskToEdit.code)
              : t.taskForm.createHeading}
          </h2>
          <button
            type="button"
            onClick={closeTaskModal}
            aria-label={t.actions.closeModalAria}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label htmlFor="task-title" className="block text-sm font-medium text-slate-700 mb-1.5">
              {t.taskForm.titleLabel} <span className="text-red-600">*</span>
            </label>
            <input
              ref={titleInputRef}
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder={t.taskForm.titlePlaceholder}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? 'task-title-error' : undefined}
              className={`w-full h-10 px-3 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors ${
                errors.title
                  ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
              }`}
            />
            {errors.title && (
              <p
                id="task-title-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600"
              >
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="task-description"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              {t.taskForm.descLabel}
            </label>
            <textarea
              id="task-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.taskForm.descPlaceholder}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="task-project"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.taskForm.projectLabel} <span className="text-red-600">*</span>
              </label>
              <select
                id="task-project"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  if (errors.projectId) setErrors((prev) => ({ ...prev, projectId: undefined }));
                }}
                aria-invalid={Boolean(errors.projectId)}
                className={`w-full h-10 px-3 text-sm bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.projectId
                    ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                }`}
              >
                <option value="">{t.taskForm.selectProject}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {errors.projectId && (
                <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.projectId}</span>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="task-status"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.taskForm.statusLabel}
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              >
                {STATUS_ORDER.map((s) => (
                  <option key={s} value={s}>
                    {getStatusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="task-priority"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.taskForm.priorityLabel}
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              >
                {PRIORITY_ORDER.map((p) => (
                  <option key={p} value={p}>
                    {getPriorityLabel(p, true)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="task-assignee"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.taskForm.assigneeLabel}
              </label>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              >
                <option value="">{t.filters.unassigned}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="task-start-date"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.taskForm.startDateLabel}
              </label>
              <input
                id="task-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: undefined }));
                }}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
            </div>

            <div>
              <label
                htmlFor="task-due-date"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.taskForm.dueDateLabel}
              </label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                min={startDate || undefined}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: undefined }));
                }}
                className={`w-full h-10 px-3 text-sm bg-white border rounded-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 ${
                  errors.dueDate
                    ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                }`}
              />
              {errors.dueDate && (
                <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.dueDate}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={closeTaskModal}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {taskModal.mode === 'edit' ? t.actions.saveChanges : t.actions.createTask}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
