import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CalendarDays, Flag, Palmtree, Users, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTaskFlow } from '../../context/TaskFlowContext';
import { TeamEventType } from '../../types/taskflow';
import { REFERENCE_TODAY } from '../../utils/dateUtils';
import { Avatar } from '../common/Avatar';

interface CalendarEventModalProps {
  open: boolean;
  defaultDate?: string;
  onClose: () => void;
}

interface FormErrors {
  title?: string;
  date?: string;
  endDate?: string;
}

const EVENT_TYPES: { id: TeamEventType; icon: typeof CalendarDays }[] = [
  { id: 'meeting', icon: Users },
  { id: 'milestone', icon: Flag },
  { id: 'leave', icon: Palmtree },
];

export function CalendarEventModal({ open, defaultDate, onClose }: CalendarEventModalProps) {
  const { projects, users, currentUser, createCalendarEvent } = useTaskFlow();
  const { t } = useLanguage();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<TeamEventType>('meeting');
  const [date, setDate] = useState(defaultDate || REFERENCE_TODAY);
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [projectId, setProjectId] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setType('meeting');
    setDate(defaultDate || REFERENCE_TODAY);
    setEndDate('');
    setStartTime('10:00');
    setEndTime('11:00');
    setProjectId('');
    setParticipantIds([currentUser.id]);
    setNotes('');
    setErrors({});
    window.setTimeout(() => titleRef.current?.focus(), 30);
  }, [open, defaultDate, currentUser.id]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const toggleParticipant = (userId: string) => {
    setParticipantIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: FormErrors = {};
    if (title.trim().length < 2) {
      nextErrors.title = t.calendar.eventModal.errTitle;
    }
    if (!date) {
      nextErrors.date = t.calendar.eventModal.errDate;
    }
    if (endDate && date && endDate < date) {
      nextErrors.endDate = t.calendar.eventModal.errDateRange;
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.title) titleRef.current?.focus();
      return;
    }

    createCalendarEvent({
      title,
      type,
      date,
      endDate: endDate || undefined,
      startTime: type === 'milestone' ? undefined : startTime || undefined,
      endTime: type === 'milestone' ? undefined : endTime || undefined,
      projectId: projectId || null,
      participantIds,
      notes,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calendar-event-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="calendar-event-modal-title" className="text-base font-semibold text-slate-900">
            {t.calendar.eventModal.heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.actions.closeModalAria}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4 overflow-y-auto">
          {/* Event Type selector */}
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              {t.calendar.eventModal.typeLabel}
            </span>
            <div className="grid grid-cols-3 gap-2">
              {EVENT_TYPES.map((item) => {
                const Icon = item.icon;
                const active = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setType(item.id);
                      if (item.id === 'leave') {
                        setStartTime('');
                        setEndTime('');
                      } else if (item.id === 'meeting' && !startTime) {
                        setStartTime('10:00');
                        setEndTime('11:00');
                      }
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      active
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{t.calendar.typeLabels[item.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="event-title"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              {t.calendar.eventModal.titleLabel} <span className="text-red-600">*</span>
            </label>
            <input
              ref={titleRef}
              id="event-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder={t.calendar.eventModal.titlePlaceholder}
              className={`w-full h-10 px-3 text-sm bg-white border rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                errors.title
                  ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
              }`}
            />
            {errors.title && (
              <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="event-date"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.calendar.eventModal.dateLabel} <span className="text-red-600">*</span>
              </label>
              <input
                id="event-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (errors.date || errors.endDate) {
                    setErrors((prev) => ({ ...prev, date: undefined, endDate: undefined }));
                  }
                }}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              />
              {errors.date && (
                <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.date}</span>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="event-end-date"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.calendar.eventModal.endDateLabel}
              </label>
              <input
                id="event-end-date"
                type="date"
                value={endDate}
                min={date || undefined}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  if (errors.endDate) setErrors((prev) => ({ ...prev, endDate: undefined }));
                }}
                className={`w-full h-10 px-3 text-sm bg-white border rounded-lg text-slate-900 tabular-nums focus:outline-none focus:ring-2 ${
                  errors.endDate
                    ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                }`}
              />
              {errors.endDate && (
                <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.endDate}</span>
                </p>
              )}
            </div>
          </div>

          {/* Time & Project */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {type !== 'milestone' && (
              <>
                <div>
                  <label
                    htmlFor="event-start-time"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    {t.calendar.eventModal.startTimeLabel}
                  </label>
                  <input
                    id="event-start-time"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>
                <div>
                  <label
                    htmlFor="event-end-time"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    {t.calendar.eventModal.endTimeLabel}
                  </label>
                  <input
                    id="event-end-time"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 tabular-nums focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
                  />
                </div>
              </>
            )}

            <div className={type === 'milestone' ? 'sm:col-span-3' : ''}>
              <label
                htmlFor="event-project"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.calendar.eventModal.projectLabel}
              </label>
              <select
                id="event-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              >
                <option value="">{t.calendar.eventModal.noProject}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Participants */}
          <div>
            <span className="block text-sm font-medium text-slate-700 mb-2">
              {t.calendar.eventModal.participantsLabel}
            </span>
            <div className="flex flex-wrap gap-2">
              {users.map((u) => {
                const selected = participantIds.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleParticipant(u.id)}
                    className={`inline-flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      selected
                        ? 'bg-blue-50 border-blue-600 text-blue-800'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Avatar user={u} size="xs" showTooltip={false} />
                    <span>{u.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="event-notes"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              {t.calendar.eventModal.notesLabel}
            </label>
            <textarea
              id="event-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.calendar.eventModal.notesPlaceholder}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 resize-y"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {t.calendar.eventModal.submitBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
