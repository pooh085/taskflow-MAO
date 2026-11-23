export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type UserAccessRole = 'admin' | 'member';

export interface User {
  id: string;
  name: string;
  role: string;
  accessRole: UserAccessRole;
  email: string;
  initials: string;
  avatarBg: string;
  avatarText: string;
}

export interface Project {
  id: string;
  key: string;
  name: string;
  description: string;
  leadId: string;
  memberIds: string[];
  createdAt: string;
  accentColor: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface Task {
  id: string;
  code: string;
  title: string;
  description: string;
  projectId: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  followerIds: string[];
  startDate: string | null; // YYYY-MM-DD
  dueDate: string | null; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  comments: Comment[];
}

export type NotificationType = 'assigned' | 'comment';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  recipientId: string;
  actorId: string;
  taskId: string;
  taskCode: string;
  taskTitle: string;
  commentPreview?: string;
  createdAt: string;
  read: boolean;
}

export type TeamEventType = 'meeting' | 'milestone' | 'leave';

export interface TeamEvent {
  id: string;
  title: string;
  type: TeamEventType;
  date: string; // YYYY-MM-DD
  endDate?: string; // Optional inclusive end date (YYYY-MM-DD) for multi-day leave/events
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  projectId: string | null;
  participantIds: string[];
  notes: string;
}

export interface TaskFilters {
  search: string;
  status: TaskStatus | 'all';
  assigneeId: string | 'all' | 'unassigned';
  projectId: string | 'all';
  priority: TaskPriority | 'all';
}

export interface LineIntegrationConfig {
  enabled: boolean;
  notifyOnAssign: boolean;
  notifyOnComment: boolean;
  notifyOnStatusChange: boolean;
  defaultTargetId: string;
  memberLineIds: Record<string, string>;
}

export interface TelegramIntegrationConfig {
  enabled: boolean;
  notifyOnAssign: boolean;
  notifyOnComment: boolean;
  notifyOnStatusChange: boolean;
  defaultChatId: string;
  memberChatIds: Record<string, string>;
}

export type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'projectId' | 'assigneeId';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const STATUS_CONFIG: Record<
  TaskStatus,
  {
    label: string;
    shortLabel: string;
    order: number;
    textClass: string;
    columnAccentClass: string;
  }
> = {
  todo: {
    label: 'รอดำเนินการ',
    shortLabel: 'รอดำเนินการ',
    order: 0,
    textClass: 'text-slate-600',
    columnAccentClass: 'bg-slate-400',
  },
  in_progress: {
    label: 'กำลังดำเนินการ',
    shortLabel: 'กำลังทำ',
    order: 1,
    textClass: 'text-blue-600',
    columnAccentClass: 'bg-blue-600',
  },
  in_review: {
    label: 'รอตรวจสอบ',
    shortLabel: 'รอตรวจ',
    order: 2,
    textClass: 'text-amber-600',
    columnAccentClass: 'bg-amber-500',
  },
  done: {
    label: 'เสร็จสิ้น',
    shortLabel: 'เสร็จสิ้น',
    order: 3,
    textClass: 'text-emerald-600',
    columnAccentClass: 'bg-emerald-600',
  },
};

export const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done'];

export const PRIORITY_ORDER: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

export const PRIORITY_CONFIG: Record<
  TaskPriority,
  {
    label: string;
    order: number;
    textClass: string;
  }
> = {
  critical: {
    label: 'วิกฤต',
    order: 0,
    textClass: 'text-red-700 font-semibold',
  },
  high: {
    label: 'สูง',
    order: 1,
    textClass: 'text-orange-700 font-medium',
  },
  medium: {
    label: 'ปานกลาง',
    order: 2,
    textClass: 'text-amber-700 font-medium',
  },
  low: {
    label: 'ต่ำ',
    order: 3,
    textClass: 'text-slate-500 font-medium',
  },
};
