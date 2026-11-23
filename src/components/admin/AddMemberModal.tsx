import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useTaskFlow } from '../../context/TaskFlowContext';
import { UserAccessRole } from '../../types/taskflow';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
}

interface MemberFormErrors {
  name?: string;
  role?: string;
  email?: string;
}

export function AddMemberModal({ open, onClose }: AddMemberModalProps) {
  const { users, addMember } = useTaskFlow();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [accessRole, setAccessRole] = useState<UserAccessRole>('member');
  const [errors, setErrors] = useState<MemberFormErrors>({});

  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setRole('');
    setEmail('');
    setAccessRole('member');
    setErrors({});
    window.setTimeout(() => nameRef.current?.focus(), 30);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: MemberFormErrors = {};
    const trimmedName = name.trim();
    const trimmedRole = role.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      nextErrors.name = t.admin.memberModal.errName;
    }
    if (!trimmedRole) {
      nextErrors.role = t.admin.memberModal.errRole;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      nextErrors.email = t.admin.memberModal.errEmail;
    } else if (users.some((u) => u.email.toLowerCase() === trimmedEmail)) {
      nextErrors.email = t.admin.memberModal.errEmailDuplicate;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    addMember({
      name: trimmedName,
      role: trimmedRole,
      email: trimmedEmail,
      accessRole,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-member-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 id="add-member-modal-title" className="text-base font-semibold text-slate-900">
            {t.admin.memberModal.heading}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.actions.closeModalAria}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          <div>
            <label
              htmlFor="member-name"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              {t.admin.memberModal.nameLabel} <span className="text-red-600">*</span>
            </label>
            <input
              ref={nameRef}
              id="member-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder={t.admin.memberModal.namePlaceholder}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="member-role"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.admin.memberModal.roleLabel} <span className="text-red-600">*</span>
              </label>
              <input
                id="member-role"
                type="text"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  if (errors.role) setErrors((prev) => ({ ...prev, role: undefined }));
                }}
                placeholder={t.admin.memberModal.rolePlaceholder}
                className={`w-full h-10 px-3 text-sm bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.role
                    ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                    : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
                }`}
              />
              {errors.role && (
                <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.role}</span>
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="member-access-role"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                {t.admin.memberModal.accessRoleLabel}
              </label>
              <select
                id="member-access-role"
                value={accessRole}
                onChange={(e) => setAccessRole(e.target.value as UserAccessRole)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
              >
                <option value="member">{t.roles.member}</option>
                <option value="admin">{t.roles.admin}</option>
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="member-email"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              {t.admin.memberModal.emailLabel} <span className="text-red-600">*</span>
            </label>
            <input
              id="member-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              placeholder={t.admin.memberModal.emailPlaceholder}
              className={`w-full h-10 px-3 text-sm bg-white border rounded-lg text-slate-900 focus:outline-none focus:ring-2 ${
                errors.email
                  ? 'border-red-500 focus:border-red-600 focus:ring-red-500/15'
                  : 'border-slate-300 focus:border-blue-600 focus:ring-blue-600/15'
              }`}
            />
            {errors.email && (
              <p role="alert" className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.email}</span>
              </p>
            )}
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
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              {t.admin.memberModal.submitBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
