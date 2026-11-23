import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Circle,
  MessageSquare,
  UserCheck,
  X,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTaskFlow } from '../../context/TaskFlowContext';
import { NotificationItem } from '../../types/taskflow';
import { formatThaiDateTime } from '../../utils/dateUtils';
import { Avatar } from '../common/Avatar';

type NotificationTab = 'all' | 'unread' | 'assigned' | 'comment';

export function NotificationCenter() {
  const {
    tasks,
    currentUser,
    notifications,
    unreadNotificationCount,
    getUserById,
    openTaskDetail,
    markNotificationRead,
    toggleNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
    clearReadNotifications,
  } = useTaskFlow();
  const { lang, t, localizeNotificationPreview } = useLanguage();

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const followingCount = useMemo(
    () => tasks.filter((item) => item.followerIds.includes(currentUser.id)).length,
    [tasks, currentUser.id]
  );

  const counts = useMemo(() => {
    let assigned = 0;
    let comment = 0;
    let readCount = 0;
    for (const item of notifications) {
      if (item.type === 'assigned') assigned += 1;
      if (item.type === 'comment') comment += 1;
      if (item.read) readCount += 1;
    }
    return {
      all: notifications.length,
      unread: unreadNotificationCount,
      assigned,
      comment,
      readCount,
    };
  }, [notifications, unreadNotificationCount]);

  const visibleNotifications = useMemo(() => {
    switch (activeTab) {
      case 'unread':
        return notifications.filter((item) => !item.read);
      case 'assigned':
        return notifications.filter((item) => item.type === 'assigned');
      case 'comment':
        return notifications.filter((item) => item.type === 'comment');
      default:
        return notifications;
    }
  }, [notifications, activeTab]);

  const handleOpenNotification = (item: NotificationItem) => {
    if (!item.read) {
      markNotificationRead(item.id);
    }
    setOpen(false);
    openTaskDetail(item.taskId);
  };

  const tabs: { id: NotificationTab; label: string; count: number }[] = [
    { id: 'all', label: t.notifications.tabAll, count: counts.all },
    { id: 'unread', label: t.notifications.tabUnread, count: counts.unread },
    { id: 'assigned', label: t.notifications.tabAssigned, count: counts.assigned },
    { id: 'comment', label: t.notifications.tabComments, count: counts.comment },
  ];

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={t.notifications.buttonAria(unreadNotificationCount)}
        title={t.notifications.buttonAria(unreadNotificationCount)}
        className={`relative inline-flex items-center justify-center h-9 px-2.5 gap-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
          open
            ? 'bg-blue-50 border-blue-300 text-blue-700'
            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <Bell className="w-4 h-4 shrink-0" aria-hidden="true" />
        {unreadNotificationCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[11px] font-bold leading-none text-white bg-blue-600 rounded-md tabular-nums">
            {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t.notifications.heading}
          className="absolute right-0 mt-2 w-[360px] sm:w-[420px] max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200 rounded-xl shadow-xl z-40 overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <h2 className="text-sm font-semibold text-slate-900">{t.notifications.heading}</h2>
              {unreadNotificationCount > 0 && (
                <span className="text-xs font-medium text-blue-700 tabular-nums">
                  · {t.notifications.unreadCount(unreadNotificationCount)}
                </span>
              )}
            </div>

            {unreadNotificationCount > 0 && (
              <button
                type="button"
                onClick={markAllNotificationsRead}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                <CheckCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{t.notifications.markAllRead}</span>
              </button>
            )}
          </div>

          {/* Interactive Filter Tabs */}
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/70">
            <div
              role="tablist"
              aria-label={t.notifications.heading}
              className="grid grid-cols-4 gap-1 p-1 bg-slate-200/60 rounded-lg"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center justify-center gap-1 px-1.5 py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                      isActive
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span className="truncate">{tab.label}</span>
                    {tab.count > 0 && (
                      <span
                        className={`text-[10px] tabular-nums ${
                          isActive ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notification Feed */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
            {visibleNotifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <div className="mx-auto w-9 h-9 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                  <BellOff className="w-4 h-4" aria-hidden="true" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  {activeTab === 'unread'
                    ? t.notifications.emptyUnreadTitle
                    : activeTab === 'all'
                      ? t.notifications.emptyAllTitle
                      : t.notifications.emptyFilteredTitle}
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-xs mx-auto">
                  {activeTab === 'unread'
                    ? t.notifications.emptyUnreadDesc
                    : activeTab === 'all'
                      ? t.notifications.emptyAllDesc
                      : t.notifications.emptyFilteredDesc}
                </p>
              </div>
            ) : (
              visibleNotifications.map((item) => {
                const actor = getUserById(item.actorId);
                const actorFirstName = actor?.name.split(' ')[0] ?? t.detail.teamMemberFallback;
                const isSelfAction = item.actorId === item.recipientId;
                const headline =
                  item.type === 'assigned'
                    ? isSelfAction
                      ? t.notifications.assignedSelf(item.taskCode)
                      : t.notifications.assignedBy(actorFirstName, item.taskCode)
                    : t.notifications.commentedBy(actorFirstName, item.taskCode);
                const commentPreview = localizeNotificationPreview(item);

                return (
                  <div
                    key={item.id}
                    className={`group relative flex items-start gap-3 px-4 py-3 transition-colors ${
                      item.read
                        ? 'bg-white hover:bg-slate-50/80'
                        : 'bg-blue-50/35 hover:bg-blue-50/60'
                    }`}
                  >
                    {/* Actor Avatar + Type Indicator */}
                    <div className="relative shrink-0 mt-0.5">
                      <Avatar user={actor} size="sm" showTooltip={false} />
                      <span
                        aria-hidden="true"
                        className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ring-2 ring-white inline-flex items-center justify-center ${
                          item.type === 'assigned'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-white'
                        }`}
                      >
                        {item.type === 'assigned' ? (
                          <UserCheck className="w-2.5 h-2.5" />
                        ) : (
                          <MessageSquare className="w-2.5 h-2.5" />
                        )}
                      </span>
                    </div>

                    {/* Main Clickable Content */}
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(item)}
                      className="flex-1 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
                    >
                      <p
                        className={`text-xs leading-snug ${
                          item.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'
                        }`}
                      >
                        {headline}
                      </p>
                      <p className="text-xs text-slate-600 truncate mt-0.5">{item.taskTitle}</p>

                      {commentPreview && (
                        <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          “{commentPreview}”
                        </p>
                      )}

                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-400 tabular-nums">
                        <span>{formatThaiDateTime(item.createdAt, lang)}</span>
                        {!item.read && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-blue-700">
                              {t.notifications.unreadLabel}
                            </span>
                          </>
                        )}
                      </div>
                    </button>

                    {/* Quick Per-Row Actions */}
                    <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => toggleNotificationRead(item.id)}
                        aria-label={
                          item.read
                            ? t.notifications.markUnreadAria
                            : t.notifications.markReadAria
                        }
                        title={
                          item.read
                            ? t.notifications.markUnreadAria
                            : t.notifications.markReadAria
                        }
                        className="p-1 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      >
                        {item.read ? (
                          <Circle className="w-3.5 h-3.5" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => dismissNotification(item.id)}
                        aria-label={t.notifications.dismissAria}
                        title={t.notifications.dismissAria}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2 text-xs text-slate-500">
            <span className="tabular-nums">{t.notifications.followingFooter(followingCount)}</span>
            {counts.readCount > 0 && (
              <button
                type="button"
                onClick={clearReadNotifications}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap"
              >
                {t.notifications.clearRead}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
