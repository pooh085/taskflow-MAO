import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { mockCalendarEvents } from '../data/mockCalendarEvents';
import { mockProjects } from '../data/mockProjects';
import { mockTasks } from '../data/mockTasks';
import { CURRENT_USER_ID, mockUsers } from '../data/mockUsers';
import {
  PRIORITY_CONFIG,
  Project,
  STATUS_CONFIG,
  SortConfig,
  SortField,
  Task,
  TaskFilters,
  TaskPriority,
  TaskStatus,
  TeamEvent,
  TeamEventType,
  ToastItem,
  User,
  UserAccessRole,
} from '../types/taskflow';
import { useLanguage } from './LanguageContext';

export interface TaskFormInput {
  title: string;
  description: string;
  projectId: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
}

export interface TeamEventFormInput {
  title: string;
  type: TeamEventType;
  date: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  projectId: string | null;
  participantIds: string[];
  notes: string;
}

export interface ProjectFormInput {
  name: string;
  key: string;
  description: string;
  leadId: string;
  accentColor: string;
}

export interface MemberFormInput {
  name: string;
  role: string;
  email: string;
  accessRole: UserAccessRole;
}

interface TaskModalState {
  open: boolean;
  mode: 'create' | 'edit';
  defaultStatus: TaskStatus;
  defaultProjectId: string;
  defaultStartDate?: string | null;
  defaultDueDate?: string | null;
  taskToEdit: Task | null;
}

interface TaskFlowContextValue {
  tasks: Task[];
  projects: Project[];
  users: User[];
  calendarEvents: TeamEvent[];
  currentUser: User;
  isAdmin: boolean;
  filters: TaskFilters;
  sortConfig: SortConfig;
  activeFilterCount: number;
  selectedTaskId: string | null;
  selectedTask: Task | null;
  taskModal: TaskModalState;
  projectModalOpen: boolean;
  toasts: ToastItem[];
  switchCurrentUser: (userId: string) => void;
  updateUserAccessRole: (userId: string, accessRole: UserAccessRole) => void;
  addMember: (input: MemberFormInput) => User;
  setFilter: <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => void;
  resetFilters: (preserveProjectId?: string) => void;
  toggleSort: (field: SortField) => void;
  getFilteredTasks: (scopedProjectId?: string) => Task[];
  getSortedTasks: (list: Task[]) => Task[];
  getUserById: (id: string | null) => User | undefined;
  getProjectById: (id: string) => Project | undefined;
  openCreateTaskModal: (options?: {
    status?: TaskStatus;
    projectId?: string;
    startDate?: string | null;
    dueDate?: string | null;
  }) => void;
  openEditTaskModal: (task: Task) => void;
  closeTaskModal: () => void;
  openProjectModal: () => void;
  closeProjectModal: () => void;
  openTaskDetail: (taskId: string) => void;
  closeTaskDetail: () => void;
  createTask: (input: TaskFormInput) => Task;
  updateTask: (taskId: string, patch: Partial<TaskFormInput>) => void;
  updateTaskSchedule: (taskId: string, startDate: string | null, dueDate: string | null) => void;
  moveTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  deleteTask: (taskId: string) => void;
  addComment: (taskId: string, content: string) => void;
  createProject: (input: ProjectFormInput) => Project;
  deleteProject: (projectId: string) => void;
  createCalendarEvent: (input: TeamEventFormInput) => TeamEvent;
  deleteCalendarEvent: (eventId: string) => void;
  resetDemoData: () => void;
  addToast: (message: string, type?: ToastItem['type']) => void;
  removeToast: (id: string) => void;
}

const DEFAULT_FILTERS: TaskFilters = {
  search: '',
  status: 'all',
  assigneeId: 'all',
  projectId: 'all',
  priority: 'all',
};

const AVATAR_TONES = [
  'bg-blue-600',
  'bg-sky-700',
  'bg-indigo-600',
  'bg-teal-700',
  'bg-slate-700',
];

const TaskFlowContext = createContext<TaskFlowContextValue | null>(null);

export function TaskFlowProvider({ children }: { children: React.ReactNode }) {
  const {
    lang,
    t,
    getStatusLabel,
    localizeUser,
    localizeProject,
    localizeTask,
    localizeCalendarEvent,
  } = useLanguage();

  const [rawTasks, setRawTasks] = useState<Task[]>(mockTasks);
  const [rawProjects, setRawProjects] = useState<Project[]>(mockProjects);
  const [rawUsers, setRawUsers] = useState<User[]>(mockUsers);
  const [rawEvents, setRawEvents] = useState<TeamEvent[]>(mockCalendarEvents);
  const [currentUserId, setCurrentUserId] = useState<string>(CURRENT_USER_ID);
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'dueDate',
    direction: 'asc',
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const [taskModal, setTaskModal] = useState<TaskModalState>({
    open: false,
    mode: 'create',
    defaultStatus: 'todo',
    defaultProjectId: mockProjects[0].id,
    defaultStartDate: null,
    defaultDueDate: null,
    taskToEdit: null,
  });

  const users = useMemo(() => rawUsers.map(localizeUser), [rawUsers, localizeUser]);
  const projects = useMemo(
    () => rawProjects.map(localizeProject),
    [rawProjects, localizeProject]
  );
  const tasks = useMemo(() => rawTasks.map(localizeTask), [rawTasks, localizeTask]);
  const calendarEvents = useMemo(
    () => rawEvents.map(localizeCalendarEvent),
    [rawEvents, localizeCalendarEvent]
  );

  const currentUser = useMemo(
    () => users.find((u) => u.id === currentUserId) ?? users[0],
    [users, currentUserId]
  );

  const isAdmin = currentUser?.accessRole === 'admin';

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastItem['type'] = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-2), { id, type, message }]);
      window.setTimeout(() => {
        removeToast(id);
      }, 3600);
    },
    [removeToast]
  );

  const switchCurrentUser = useCallback(
    (userId: string) => {
      const target = users.find((u) => u.id === userId);
      if (!target || target.id === currentUserId) return;
      setCurrentUserId(userId);
      const roleLabel = target.accessRole === 'admin' ? t.roles.admin : t.roles.member;
      addToast(t.toasts.switchedUser(target.name, roleLabel), 'info');
    },
    [users, currentUserId, t, addToast]
  );

  const updateUserAccessRole = useCallback(
    (userId: string, accessRole: UserAccessRole) => {
      const target = users.find((u) => u.id === userId);
      if (!target || target.accessRole === accessRole) return;

      const adminCount = rawUsers.filter((u) => u.accessRole === 'admin').length;
      if (target.accessRole === 'admin' && accessRole === 'member' && adminCount <= 1) {
        addToast(t.toasts.cannotDemoteLastAdmin, 'error');
        return;
      }

      setRawUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, accessRole } : u))
      );
      const roleLabel = accessRole === 'admin' ? t.roles.admin : t.roles.member;
      addToast(t.toasts.roleUpdated(target.name, roleLabel));
    },
    [users, rawUsers, t, addToast]
  );

  const addMember = useCallback(
    (input: MemberFormInput): User => {
      const trimmedName = input.name.trim();
      const parts = trimmedName.split(/\s+/).filter(Boolean);
      const initials =
        parts.length >= 2
          ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
          : trimmedName.slice(0, 2).toUpperCase();

      const newUser: User = {
        id: `u-${Date.now()}`,
        name: trimmedName,
        role: input.role.trim(),
        accessRole: input.accessRole,
        email: input.email.trim().toLowerCase(),
        initials,
        avatarBg: AVATAR_TONES[rawUsers.length % AVATAR_TONES.length],
        avatarText: 'text-white',
      };

      setRawUsers((prev) => [...prev, newUser]);
      addToast(t.toasts.memberAdded(newUser.name));
      return newUser;
    },
    [rawUsers.length, addToast, t]
  );

  const setFilter = useCallback(
    <K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const resetFilters = useCallback((preserveProjectId?: string) => {
    setFilters({
      ...DEFAULT_FILTERS,
      projectId: preserveProjectId ?? 'all',
    });
  }, []);

  const toggleSort = useCallback((field: SortField) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return { field, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { field, direction: 'asc' };
    });
  }, []);

  const getUserById = useCallback(
    (id: string | null) => (id ? users.find((u) => u.id === id) : undefined),
    [users]
  );

  const getProjectById = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects]
  );

  const getFilteredTasks = useCallback(
    (scopedProjectId?: string) => {
      const effectiveProjectId = scopedProjectId ?? filters.projectId;
      const query = filters.search.trim().toLowerCase();

      return tasks.filter((task) => {
        if (effectiveProjectId !== 'all' && task.projectId !== effectiveProjectId) {
          return false;
        }
        if (filters.status !== 'all' && task.status !== filters.status) {
          return false;
        }
        if (filters.priority !== 'all' && task.priority !== filters.priority) {
          return false;
        }
        if (filters.assigneeId === 'unassigned') {
          if (task.assigneeId !== null) return false;
        } else if (filters.assigneeId !== 'all' && task.assigneeId !== filters.assigneeId) {
          return false;
        }
        if (query) {
          const project = projects.find((p) => p.id === task.projectId);
          const rawProject = rawProjects.find((p) => p.id === task.projectId);
          const assignee = task.assigneeId
            ? users.find((u) => u.id === task.assigneeId)
            : undefined;
          const rawAssignee = task.assigneeId
            ? rawUsers.find((u) => u.id === task.assigneeId)
            : undefined;
          const rawTask = rawTasks.find((rt) => rt.id === task.id);

          const haystack = [
            task.code,
            task.title,
            rawTask?.title ?? '',
            task.description,
            rawTask?.description ?? '',
            project?.name ?? '',
            rawProject?.name ?? '',
            assignee
              ? `${assignee.name} ${assignee.role} ${rawAssignee?.name ?? ''}`
              : 'ยังไม่มอบหมาย unassigned',
          ]
            .join(' ')
            .toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      });
    },
    [filters, tasks, rawTasks, projects, rawProjects, users, rawUsers]
  );

  const getSortedTasks = useCallback(
    (list: Task[]) => {
      const copied = [...list];
      const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
      const locale = lang === 'en' ? 'en' : 'th';

      copied.sort((a, b) => {
        switch (sortConfig.field) {
          case 'title':
            return a.title.localeCompare(b.title, locale) * multiplier;
          case 'status':
            return (STATUS_CONFIG[a.status].order - STATUS_CONFIG[b.status].order) * multiplier;
          case 'priority':
            return (
              (PRIORITY_CONFIG[a.priority].order - PRIORITY_CONFIG[b.priority].order) * multiplier
            );
          case 'projectId': {
            const pA = projects.find((p) => p.id === a.projectId)?.name ?? '';
            const pB = projects.find((p) => p.id === b.projectId)?.name ?? '';
            return pA.localeCompare(pB, locale) * multiplier;
          }
          case 'assigneeId': {
            const uA = users.find((u) => u.id === a.assigneeId)?.name ?? 'zzz';
            const uB = users.find((u) => u.id === b.assigneeId)?.name ?? 'zzz';
            return uA.localeCompare(uB, locale) * multiplier;
          }
          case 'dueDate': {
            if (!a.dueDate && !b.dueDate) return 0;
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate) * multiplier;
          }
          default:
            return 0;
        }
      });

      return copied;
    },
    [sortConfig, projects, users, lang]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search.trim()) count += 1;
    if (filters.status !== 'all') count += 1;
    if (filters.assigneeId !== 'all') count += 1;
    if (filters.projectId !== 'all') count += 1;
    if (filters.priority !== 'all') count += 1;
    return count;
  }, [filters]);

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) ?? null : null),
    [selectedTaskId, tasks]
  );

  const openCreateTaskModal = useCallback(
    (options?: {
      status?: TaskStatus;
      projectId?: string;
      startDate?: string | null;
      dueDate?: string | null;
    }) => {
      const fallbackProject =
        options?.projectId ??
        (filters.projectId !== 'all' ? filters.projectId : projects[0]?.id ?? 'p-1');
      setTaskModal({
        open: true,
        mode: 'create',
        defaultStatus: options?.status ?? 'todo',
        defaultProjectId: fallbackProject,
        defaultStartDate: options?.startDate ?? null,
        defaultDueDate: options?.dueDate ?? null,
        taskToEdit: null,
      });
    },
    [filters.projectId, projects]
  );

  const openEditTaskModal = useCallback((task: Task) => {
    setTaskModal({
      open: true,
      mode: 'edit',
      defaultStatus: task.status,
      defaultProjectId: task.projectId,
      defaultStartDate: task.startDate,
      defaultDueDate: task.dueDate,
      taskToEdit: task,
    });
  }, []);

  const closeTaskModal = useCallback(() => {
    setTaskModal((prev) => ({ ...prev, open: false, taskToEdit: null }));
  }, []);

  const openProjectModal = useCallback(() => {
    if (!isAdmin) return;
    setProjectModalOpen(true);
  }, [isAdmin]);
  const closeProjectModal = useCallback(() => setProjectModalOpen(false), []);

  const openTaskDetail = useCallback((taskId: string) => setSelectedTaskId(taskId), []);
  const closeTaskDetail = useCallback(() => setSelectedTaskId(null), []);

  const createTask = useCallback(
    (input: TaskFormInput): Task => {
      const project = projects.find((p) => p.id === input.projectId);
      const projectKey = project?.key ?? 'TSK';
      const existingCount = rawTasks.filter((item) => item.projectId === input.projectId).length;
      const code = `${projectKey}-${101 + existingCount}`;
      const now = new Date().toISOString().slice(0, 19);

      const newTask: Task = {
        id: `t-${Date.now()}`,
        code,
        title: input.title.trim(),
        description: input.description.trim(),
        projectId: input.projectId,
        status: input.status,
        priority: input.priority,
        assigneeId: input.assigneeId,
        startDate: input.startDate || null,
        dueDate: input.dueDate || null,
        createdAt: now,
        updatedAt: now,
        comments: [],
      };

      setRawTasks((prev) => [newTask, ...prev]);
      addToast(t.toasts.taskCreated(newTask.code));
      return newTask;
    },
    [projects, rawTasks, addToast, t]
  );

  const updateTask = useCallback(
    (taskId: string, patch: Partial<TaskFormInput>) => {
      const now = new Date().toISOString().slice(0, 19);
      setRawTasks((prev) =>
        prev.map((task) => {
          if (task.id !== taskId) return task;
          return {
            ...task,
            ...patch,
            title: patch.title !== undefined ? patch.title.trim() : task.title,
            description:
              patch.description !== undefined ? patch.description.trim() : task.description,
            updatedAt: now,
          };
        })
      );
      addToast(t.toasts.taskUpdated);
    },
    [addToast, t]
  );

  const updateTaskSchedule = useCallback(
    (taskId: string, startDate: string | null, dueDate: string | null) => {
      const target = rawTasks.find((item) => item.id === taskId);
      if (!target) return;
      const now = new Date().toISOString().slice(0, 19);
      setRawTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, startDate, dueDate, updatedAt: now } : task
        )
      );
      addToast(t.toasts.taskScheduleUpdated(target.code));
    },
    [rawTasks, addToast, t]
  );

  const moveTaskStatus = useCallback(
    (taskId: string, newStatus: TaskStatus) => {
      const target = rawTasks.find((item) => item.id === taskId);
      if (!target || target.status === newStatus) return;

      const now = new Date().toISOString().slice(0, 19);
      setRawTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus, updatedAt: now } : task
        )
      );
      addToast(t.toasts.statusChanged(target.code, getStatusLabel(newStatus)));
    },
    [rawTasks, addToast, t, getStatusLabel]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      if (!isAdmin) return;
      const target = rawTasks.find((item) => item.id === taskId);
      setRawTasks((prev) => prev.filter((item) => item.id !== taskId));
      if (selectedTaskId === taskId) {
        setSelectedTaskId(null);
      }
      if (target) {
        addToast(t.toasts.taskDeleted(target.code), 'info');
      }
    },
    [isAdmin, rawTasks, selectedTaskId, addToast, t]
  );

  const addComment = useCallback(
    (taskId: string, content: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      const now = new Date().toISOString().slice(0, 19);
      const newComment = {
        id: `c-${Date.now()}`,
        taskId,
        authorId: currentUser.id,
        content: trimmed,
        createdAt: now,
      };
      setRawTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, comments: [...task.comments, newComment], updatedAt: now }
            : task
        )
      );
      addToast(t.toasts.commentAdded);
    },
    [currentUser.id, addToast, t]
  );

  const createProject = useCallback(
    (input: ProjectFormInput): Project => {
      const now = new Date().toISOString().slice(0, 19);
      const newProject: Project = {
        id: `p-${Date.now()}`,
        key: input.key.trim().toUpperCase(),
        name: input.name.trim(),
        description: input.description.trim(),
        leadId: input.leadId,
        memberIds: Array.from(new Set([currentUser.id, input.leadId])),
        createdAt: now,
        accentColor: input.accentColor,
      };
      setRawProjects((prev) => [...prev, newProject]);
      addToast(t.toasts.projectCreated(newProject.name));
      return newProject;
    },
    [currentUser.id, addToast, t]
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      if (!isAdmin) return;
      const target = projects.find((p) => p.id === projectId);
      setRawProjects((prev) => prev.filter((p) => p.id !== projectId));
      setRawTasks((prev) => prev.filter((item) => item.projectId !== projectId));
      setFilters((prev) =>
        prev.projectId === projectId ? { ...prev, projectId: 'all' } : prev
      );
      if (target) {
        addToast(t.toasts.projectDeleted(target.name), 'info');
      }
    },
    [isAdmin, projects, addToast, t]
  );

  const createCalendarEvent = useCallback(
    (input: TeamEventFormInput): TeamEvent => {
      const newEvent: TeamEvent = {
        id: `ev-${Date.now()}`,
        title: input.title.trim(),
        type: input.type,
        date: input.date,
        endDate: input.endDate && input.endDate > input.date ? input.endDate : undefined,
        startTime: input.startTime || undefined,
        endTime: input.endTime || undefined,
        projectId: input.projectId || null,
        participantIds: input.participantIds,
        notes: input.notes.trim(),
      };
      setRawEvents((prev) => [...prev, newEvent]);
      addToast(t.toasts.eventCreated(newEvent.title));
      return newEvent;
    },
    [addToast, t]
  );

  const deleteCalendarEvent = useCallback(
    (eventId: string) => {
      const target = calendarEvents.find((ev) => ev.id === eventId);
      setRawEvents((prev) => prev.filter((ev) => ev.id !== eventId));
      if (target) {
        addToast(t.toasts.eventDeleted(target.title), 'info');
      }
    },
    [calendarEvents, addToast, t]
  );

  const resetDemoData = useCallback(() => {
    setRawTasks(mockTasks);
    setRawProjects(mockProjects);
    setRawUsers(mockUsers);
    setRawEvents(mockCalendarEvents);
    setCurrentUserId(CURRENT_USER_ID);
    setFilters(DEFAULT_FILTERS);
    setSelectedTaskId(null);
    addToast(t.toasts.demoReset, 'info');
  }, [addToast, t]);

  const value = useMemo<TaskFlowContextValue>(
    () => ({
      tasks,
      projects,
      users,
      calendarEvents,
      currentUser,
      isAdmin,
      filters,
      sortConfig,
      activeFilterCount,
      selectedTaskId,
      selectedTask,
      taskModal,
      projectModalOpen,
      toasts,
      switchCurrentUser,
      updateUserAccessRole,
      addMember,
      setFilter,
      resetFilters,
      toggleSort,
      getFilteredTasks,
      getSortedTasks,
      getUserById,
      getProjectById,
      openCreateTaskModal,
      openEditTaskModal,
      closeTaskModal,
      openProjectModal,
      closeProjectModal,
      openTaskDetail,
      closeTaskDetail,
      createTask,
      updateTask,
      updateTaskSchedule,
      moveTaskStatus,
      deleteTask,
      addComment,
      createProject,
      deleteProject,
      createCalendarEvent,
      deleteCalendarEvent,
      resetDemoData,
      addToast,
      removeToast,
    }),
    [
      tasks,
      projects,
      users,
      calendarEvents,
      currentUser,
      isAdmin,
      filters,
      sortConfig,
      activeFilterCount,
      selectedTaskId,
      selectedTask,
      taskModal,
      projectModalOpen,
      toasts,
      switchCurrentUser,
      updateUserAccessRole,
      addMember,
      setFilter,
      resetFilters,
      toggleSort,
      getFilteredTasks,
      getSortedTasks,
      getUserById,
      getProjectById,
      openCreateTaskModal,
      openEditTaskModal,
      closeTaskModal,
      openProjectModal,
      closeProjectModal,
      openTaskDetail,
      closeTaskDetail,
      createTask,
      updateTask,
      updateTaskSchedule,
      moveTaskStatus,
      deleteTask,
      addComment,
      createProject,
      deleteProject,
      createCalendarEvent,
      deleteCalendarEvent,
      resetDemoData,
      addToast,
      removeToast,
    ]
  );

  return <TaskFlowContext.Provider value={value}>{children}</TaskFlowContext.Provider>;
}

export function useTaskFlow() {
  const ctx = useContext(TaskFlowContext);
  if (!ctx) {
    throw new Error('useTaskFlow must be used inside TaskFlowProvider');
  }
  return ctx;
}
