import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTaskFlow } from '../../context/TaskFlowContext';

export function ProjectModal() {
  const { projectModalOpen, closeProjectModal, projects, users, currentUser, createProject } =
    useTaskFlow();
  const { t } = useLanguage();

  const projectColors = [
    { label: t.projectForm.colors.blue, value: '#2563EB' },
    { label: t.projectForm.colors.sky, value: '#0284C7' },
    { label: t.projectForm.colors.indigo, value: '#4F46E5' },
    { label: t.projectForm.colors.teal, value: '#0D9488' },
    { label: t.projectForm.colors.slate, value: '#475569' },
  ];

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [leadId, setLeadId] = useState(currentUser.id);
  const [accentColor, setAccentColor] = useState('#2563EB');
  const [errors, setErrors] = useState<{ name?: string; key?: string }>({});

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!projectModalOpen) return;
    setName('');
    setKey('');
    setDescription('');
    setLeadId(currentUser.id);
    setAccentColor('#2563EB');
    setErrors({});
    window.setTimeout(() => nameRef.current?.focus(), 30);
  }, [projectModalOpen, currentUser.id]);

  useEffect(() => {
    if (!projectModalOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeProjectModal();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [projectModalOpen, closeProjectModal]);

  if (!projectModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { name?: string; key?: string } = {};
    const trimmedName = name.trim();
    const cleanedKey = key.trim().toUpperCase();

    if (!trimmedName || trimmedName.length < 2) {
      nextErrors.name = t.projectForm.errNameMin;
    }
    if (!/^[A-Z0-9]{2,5}$/.test(cleanedKey)) {
      nextErrors.key = t.projectForm.errKeyFormat;
    } else if (projects.some((p) => p.key === cleanedKey)) {
      nextErrors.key = t.projectForm.errKeyDuplicate(cleanedKey);
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    createProject({
      name: trimmedName,
      key: cleanedKey,
      description,
      leadId,
      accentColor,
    });
    closeProjectModal();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="project-modal-title"
      onClick={closeProjectModal}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="project-modal-title" className="text-base font-semibold text-slate-900">
            {t.projectForm.heading}
          </h2>
          <button
            type="button"
            onClick={closeProjectModal}
            aria-label={t.actions.closeModalAria}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="project-name"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.projectForm.nameLabel} <span className="text-red-600">*</span>
              </label>
              <input
                ref={nameRef}
                id="project-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder={t.projectForm.namePlaceholder}
                className={`w-full h-10 px-3 text-sm bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.name
                    ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                }`}
              />
              {errors.name && (
                <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.name}</span>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="project-key"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.projectForm.keyLabel} <span className="text-red-600">*</span>
              </label>
              <input
                id="project-key"
                type="text"
                maxLength={5}
                value={key}
                onChange={(e) => {
                  setKey(e.target.value.toUpperCase());
                  if (errors.key) setErrors((prev) => ({ ...prev, key: undefined }));
                }}
                placeholder={t.projectForm.keyPlaceholder}
                className={`w-full h-10 px-3 text-sm font-mono uppercase bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.key
                    ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                }`}
              />
              {errors.key && (
                <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.key}</span>
                </p>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="project-description"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              {t.projectForm.descLabel}
            </label>
            <textarea
              id="project-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.projectForm.descPlaceholder}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="project-lead"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.projectForm.leadLabel}
              </label>
              <select
                id="project-lead"
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700 mb-2">
                {t.projectForm.colorLabel}
              </span>
              <div className="flex items-center gap-2.5 h-10">
                {projectColors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setAccentColor(c.value)}
                    aria-label={c.label}
                    aria-pressed={accentColor === c.value}
                    style={{ backgroundColor: c.value }}
                    className={`w-7 h-7 rounded-md transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600 ${
                      accentColor === c.value ? 'ring-2 ring-offset-2 ring-slate-900 scale-105' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={closeProjectModal}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {t.actions.createProject}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
