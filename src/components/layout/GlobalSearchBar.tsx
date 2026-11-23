import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, LayoutGrid, List, Search, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useTaskFlow } from '../../context/TaskFlowContext';
import { Avatar } from '../common/Avatar';
import { PriorityLabel } from '../common/PriorityLabel';
import { StatusLabel } from '../common/StatusLabel';

export function GlobalSearchBar() {
  const {
    tasks,
    filters,
    setFilter,
    getUserById,
    getProjectById,
    openTaskDetail,
  } = useTaskFlow();
  const { t } = useLanguage();

  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = filters.search.trim().toLowerCase();

  const matchingTasks = useMemo(() => {
    if (!query) return [];
    return tasks.filter((task) => {
      const assignee = getUserById(task.assigneeId);
      const project = getProjectById(task.projectId);
      const haystack = [
        task.title,
        task.code,
        task.description,
        assignee ? `${assignee.name} ${assignee.role}` : 'ยังไม่มอบหมาย unassigned',
        project?.name ?? '',
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [tasks, query, getUserById, getProjectById]);

  const previewTasks = matchingTasks.slice(0, 6);

  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setMobileExpanded(true);
        setIsOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 10);
      } else if (e.key === '/' && !isEditable) {
        e.preventDefault();
        setMobileExpanded(true);
        setIsOpen(true);
        window.setTimeout(() => inputRef.current?.focus(), 10);
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setMobileExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query]);

  const handleSelectTask = (taskId: string) => {
    openTaskDetail(taskId);
    setIsOpen(false);
    setMobileExpanded(false);
  };

  const handleJumpToView = (view: 'board' | 'list') => {
    navigate(`/${view}`);
    setIsOpen(false);
    setMobileExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setMobileExpanded(false);
      inputRef.current?.blur();
      return;
    }

    if (!query) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) =>
        previewTasks.length === 0 ? -1 : (prev + 1) % previewTasks.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        previewTasks.length === 0
          ? -1
          : (prev - 1 + previewTasks.length) % previewTasks.length
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && previewTasks[highlightedIndex]) {
        handleSelectTask(previewTasks[highlightedIndex].id);
      } else {
        const isAlreadyOnTaskView =
          location.pathname.endsWith('/board') || location.pathname.endsWith('/list');
        if (!isAlreadyOnTaskView) {
          navigate('/board');
        }
        setIsOpen(false);
        setMobileExpanded(false);
      }
    }
  };

  const showDropdown = isOpen && query.length > 0;

  return (
    <div ref={containerRef} className="relative flex items-center justify-end sm:flex-1 sm:max-w-md">
      {!mobileExpanded && (
        <button
          type="button"
          onClick={() => {
            setMobileExpanded(true);
            setIsOpen(true);
            window.setTimeout(() => inputRef.current?.focus(), 20);
          }}
          aria-label={t.search.openAria}
          className={`sm:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
            query
              ? 'text-blue-700 bg-blue-50 hover:bg-blue-100'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Search className="w-4 h-4" />
        </button>
      )}

      <div
        className={`${
          mobileExpanded
            ? 'fixed inset-x-0 top-0 h-14 px-4 bg-white border-b border-slate-200 z-30 flex items-center gap-2 sm:static sm:inset-auto sm:h-auto sm:p-0 sm:bg-transparent sm:border-0 sm:z-auto'
            : 'hidden sm:flex'
        } w-full items-center`}
      >
        <div className="relative w-full">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls="global-search-results"
            aria-autocomplete="list"
            aria-label={t.search.inputAria}
            value={filters.search}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setFilter('search', e.target.value);
              setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={t.search.placeholder}
            className="w-full h-9 pl-9 pr-14 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-colors"
          />

          {filters.search ? (
            <button
              type="button"
              onClick={() => {
                setFilter('search', '');
                inputRef.current?.focus();
              }}
              aria-label={t.actions.clearSearchAria}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd
              aria-hidden="true"
              className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono text-slate-400 bg-white border border-slate-200 rounded absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            >
              /
            </kbd>
          )}
        </div>

        {mobileExpanded && (
          <button
            type="button"
            onClick={() => {
              setMobileExpanded(false);
              setIsOpen(false);
            }}
            className="sm:hidden px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 whitespace-nowrap shrink-0"
          >
            {t.actions.close}
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id="global-search-results"
          role="listbox"
          aria-label={t.search.resultsAria}
          className={`${
            mobileExpanded
              ? 'fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-11'
              : 'absolute right-0 top-11'
          } z-40 sm:w-[440px] max-w-[calc(100vw-1.5rem)] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden`}
        >
          <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>{t.search.resultsTitle}</span>
            <span className="tabular-nums font-medium text-slate-700">
              {t.search.foundCount(matchingTasks.length)}
            </span>
          </div>

          {previewTasks.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                {t.search.noResults(filters.search.trim())}
              </p>
              <p className="text-xs text-slate-400 mt-1">{t.search.noResultsHint}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
              {previewTasks.map((task, idx) => {
                const assignee = getUserById(task.assigneeId);
                const project = getProjectById(task.projectId);
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li key={task.id} role="option" aria-selected={isHighlighted}>
                    <button
                      type="button"
                      onClick={() => handleSelectTask(task.id)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-start justify-between gap-3 ${
                        isHighlighted ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="font-mono font-medium text-slate-600 tabular-nums shrink-0">
                            {task.code}
                          </span>
                          {project && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="truncate">{project.name}</span>
                            </>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900 truncate mt-0.5">
                          {task.title}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <StatusLabel status={task.status} />
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <PriorityLabel priority={task.priority} compact />
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span className="text-slate-500 truncate">
                            {assignee ? assignee.name : t.filters.unassigned}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 shrink-0">
                        <Avatar user={assignee} size="xs" showTooltip={false} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleJumpToView('board')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-medium text-blue-700 hover:bg-blue-100/70 rounded-md transition-colors whitespace-nowrap"
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.search.viewOnBoard}</span>
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleJumpToView('list')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-200/70 rounded-md transition-colors whitespace-nowrap"
            >
              <List className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.search.viewOnList}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
