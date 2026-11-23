import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { mockCalendarEvents } from '../data/mockCalendarEvents';
import { mockProjects } from '../data/mockProjects';
import { mockTasks } from '../data/mockTasks';
import {
  Language,
  PRIORITY_LABELS,
  SEED_COMMENT_EN,
  SEED_EVENT_EN,
  SEED_PROJECT_EN,
  SEED_TASK_EN,
  SEED_USER_EN,
  STATUS_LABELS,
  TRANSLATIONS,
  TranslationDictionary,
} from '../i18n/translations';
import {
  Comment,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  TeamEvent,
  User,
} from '../types/taskflow';

const STORAGE_KEY = 'taskflow_lang';

const ORIGINAL_PROJECT_MAP = new Map(mockProjects.map((p) => [p.id, p]));
const ORIGINAL_TASK_MAP = new Map(mockTasks.map((t) => [t.id, t]));
const ORIGINAL_EVENT_MAP = new Map(mockCalendarEvents.map((e) => [e.id, e]));

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: TranslationDictionary;
  getStatusLabel: (status: TaskStatus) => string;
  getPriorityLabel: (priority: TaskPriority, compact?: boolean) => string;
  localizeUser: (user: User) => User;
  localizeProject: (project: Project) => Project;
  localizeTask: (task: Task) => Task;
  localizeCommentContent: (comment: Comment) => string;
  localizeCalendarEvent: (event: TeamEvent) => TeamEvent;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readInitialLanguage(): Language {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'th') return saved;
  } catch {
    // ignore storage errors in restricted environments
  }
  return 'th';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(readInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = TRANSLATIONS[lang].pageTitle;
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'th' ? 'en' : 'th'));
  }, []);

  const getStatusLabel = useCallback(
    (status: TaskStatus) => STATUS_LABELS[lang][status],
    [lang]
  );

  const getPriorityLabel = useCallback(
    (priority: TaskPriority, compact = true) =>
      compact ? PRIORITY_LABELS[lang][priority].short : PRIORITY_LABELS[lang][priority].full,
    [lang]
  );

  const localizeUser = useCallback(
    (user: User): User => {
      if (lang === 'th') return user;
      const en = SEED_USER_EN[user.id];
      if (!en) return user;
      const initials = en.name
        .split(' ')
        .map((part) => part[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      return {
        ...user,
        name: en.name,
        role: en.role,
        initials,
      };
    },
    [lang]
  );

  const localizeProject = useCallback(
    (project: Project): Project => {
      if (lang === 'th') return project;
      const en = SEED_PROJECT_EN[project.id];
      const orig = ORIGINAL_PROJECT_MAP.get(project.id);
      if (!en || !orig) return project;
      return {
        ...project,
        name: project.name === orig.name ? en.name : project.name,
        description: project.description === orig.description ? en.description : project.description,
      };
    },
    [lang]
  );

  const localizeTask = useCallback(
    (task: Task): Task => {
      if (lang === 'th') return task;
      const en = SEED_TASK_EN[task.id];
      const orig = ORIGINAL_TASK_MAP.get(task.id);
      if (!en || !orig) return task;
      return {
        ...task,
        title: task.title === orig.title ? en.title : task.title,
        description: task.description === orig.description ? en.description : task.description,
      };
    },
    [lang]
  );

  const localizeCommentContent = useCallback(
    (comment: Comment): string => {
      if (lang === 'th') return comment.content;
      return SEED_COMMENT_EN[comment.id] ?? comment.content;
    },
    [lang]
  );

  const localizeCalendarEvent = useCallback(
    (event: TeamEvent): TeamEvent => {
      if (lang === 'th') return event;
      const en = SEED_EVENT_EN[event.id];
      const orig = ORIGINAL_EVENT_MAP.get(event.id);
      if (!en || !orig) return event;
      return {
        ...event,
        title: event.title === orig.title ? en.title : event.title,
        notes: event.notes === orig.notes ? en.notes : event.notes,
      };
    },
    [lang]
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      toggleLang,
      t: TRANSLATIONS[lang],
      getStatusLabel,
      getPriorityLabel,
      localizeUser,
      localizeProject,
      localizeTask,
      localizeCommentContent,
      localizeCalendarEvent,
    }),
    [
      lang,
      setLang,
      toggleLang,
      getStatusLabel,
      getPriorityLabel,
      localizeUser,
      localizeProject,
      localizeTask,
      localizeCommentContent,
      localizeCalendarEvent,
    ]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return ctx;
}
