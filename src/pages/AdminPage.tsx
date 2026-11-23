import { useState } from 'react';
import {
  RotateCcw,
  ShieldAlert,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AddMemberModal } from '../components/admin/AddMemberModal';
import { AccessRoleLabel } from '../components/common/AccessRoleLabel';
import { Avatar } from '../components/common/Avatar';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmDeleteModal } from '../components/tasks/ConfirmDeleteModal';
import { useLanguage } from '../context/LanguageContext';
import { useTaskFlow } from '../context/TaskFlowContext';

export function AdminPage() {
  const {
    users,
    projects,
    tasks,
    currentUser,
    isAdmin,
    switchCurrentUser,
    updateUserAccessRole,
    deleteProject,
    openProjectModal,
    resetDemoData,
    getUserById,
  } = useTaskFlow();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [projectToDeleteId, setProjectToDeleteId] = useState<string | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const firstAdmin = users.find((u) => u.accessRole === 'admin');

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <EmptyState
          title={t.admin.restrictedTitle}
          description={t.admin.restrictedDesc}
          icon={<ShieldAlert className="w-5 h-5 text-red-600" />}
          primaryAction={
            firstAdmin
              ? {
                  label: t.admin.switchToAdminBtn,
                  onClick: () => switchCurrentUser(firstAdmin.id),
                }
              : undefined
          }
          secondaryAction={{
            label: t.actions.backToBoard,
            onClick: () => navigate('/board'),
          }}
        />
      </div>
    );
  }

  const adminCount = users.filter((u) => u.accessRole === 'admin').length;
  const memberCount = users.length - adminCount;

  const projectToDelete = projectToDeleteId
    ? projects.find((p) => p.id === projectToDeleteId) ?? null
    : null;
  const projectToDeleteTaskCount = projectToDelete
    ? tasks.filter((item) => item.projectId === projectToDelete.id).length
    : 0;

  const stats = [
    { label: t.admin.statAdmins, value: adminCount, valueClass: 'text-blue-600' },
    { label: t.admin.statMembers, value: memberCount, valueClass: 'text-slate-900' },
    { label: t.admin.statProjects, value: projects.length, valueClass: 'text-slate-900' },
    { label: t.admin.statTasks, value: tasks.length, valueClass: 'text-slate-900' },
  ];

  return (
    <>
      <div className="space-y-6">
        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {t.admin.heading}
            </h1>
            <p className="text-sm text-slate-500 mt-1">{t.admin.subtitle}</p>
          </div>

          <button
            type="button"
            onClick={() => setAddMemberOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <UserPlus className="w-4 h-4" aria-hidden="true" />
            <span>{t.admin.addMemberBtn}</span>
          </button>
        </div>

        {/* 4-column Admin summary strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((item) => (
            <div
              key={item.label}
              className="bg-white border border-slate-200 rounded-xl p-5"
            >
              <p className="text-xs font-medium text-slate-500">{item.label}</p>
              <p className={`mt-2 text-3xl font-bold tabular-nums tracking-tight ${item.valueClass}`}>
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Team Members & Access Role Management */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t.admin.roleSectionTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.admin.roleSectionSub}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-5">{t.admin.colUser}</th>
                  <th className="py-3 px-4">{t.admin.colEmail}</th>
                  <th className="py-3 px-4">{t.admin.colRole}</th>
                  <th className="py-3 px-4 text-right">{t.admin.colAssignedTasks}</th>
                  <th className="py-3 px-5 text-right">{t.admin.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((user) => {
                  const assignedCount = tasks.filter((item) => item.assigneeId === user.id).length;
                  const isLastAdmin = user.accessRole === 'admin' && adminCount <= 1;
                  const isSelf = user.id === currentUser.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <Avatar user={user} size="sm" showTooltip={false} />
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span className="truncate">{user.name}</span>
                              {isSelf && (
                                <span className="text-xs font-normal text-slate-400">
                                  ({t.admin.youTag})
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500">{user.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 font-mono">
                        {user.email}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <AccessRoleLabel accessRole={user.accessRole} />
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 tabular-nums">
                        {assignedCount}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        {user.accessRole === 'admin' ? (
                          <button
                            type="button"
                            disabled={isLastAdmin}
                            title={isLastAdmin ? t.admin.lastAdminTooltip : undefined}
                            onClick={() => updateUserAccessRole(user.id, 'member')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                              isLastAdmin
                                ? 'text-slate-400 border-slate-200 bg-slate-50 cursor-not-allowed'
                                : 'text-slate-700 border-slate-300 bg-white hover:bg-slate-50'
                            }`}
                          >
                            {t.admin.demoteToMember}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateUserAccessRole(user.id, 'admin')}
                            className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors whitespace-nowrap"
                          >
                            {t.admin.promoteToAdmin}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Project Governance */}
        <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                {t.admin.projectSectionTitle}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{t.admin.projectSectionSub}</p>
            </div>
            <button
              type="button"
              onClick={openProjectModal}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap self-start sm:self-auto"
            >
              {t.actions.newProjectShort}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-5">{t.admin.colProjectName}</th>
                  <th className="py-3 px-4">{t.admin.colProjectLead}</th>
                  <th className="py-3 px-4 text-right">{t.admin.colProjectTasks}</th>
                  <th className="py-3 px-5 text-right">{t.admin.colActions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {projects.map((project) => {
                  const lead = getUserById(project.leadId);
                  const count = tasks.filter((item) => item.projectId === project.id).length;

                  return (
                    <tr key={project.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                            style={{ backgroundColor: project.accentColor }}
                            aria-hidden="true"
                          />
                          <span className="font-mono text-xs font-semibold text-slate-500">
                            {project.key}
                          </span>
                          <span className="font-medium text-slate-900">{project.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {lead?.name ?? '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-medium text-slate-700 tabular-nums">
                        {count}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setProjectToDeleteId(project.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors whitespace-nowrap"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{t.admin.deleteProjectBtn}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Workspace Reset Utility */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {t.admin.workspaceToolsTitle}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{t.admin.workspaceToolsSub}</p>
          </div>
          <button
            type="button"
            onClick={() => setResetModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{t.admin.resetDemoBtn}</span>
          </button>
        </section>
      </div>

      <AddMemberModal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} />

      <ConfirmDeleteModal
        open={Boolean(projectToDelete)}
        title={projectToDelete ? t.admin.confirmDeleteProjectTitle(projectToDelete.name) : ''}
        description={t.admin.confirmDeleteProjectDesc(projectToDeleteTaskCount)}
        confirmLabel={t.admin.deleteProjectBtn}
        onConfirm={() => {
          if (projectToDelete) deleteProject(projectToDelete.id);
          setProjectToDeleteId(null);
        }}
        onCancel={() => setProjectToDeleteId(null)}
      />

      <ConfirmDeleteModal
        open={resetModalOpen}
        title={t.admin.confirmResetTitle}
        description={t.admin.confirmResetDesc}
        confirmLabel={t.admin.confirmResetBtn}
        onConfirm={() => {
          resetDemoData();
          setResetModalOpen(false);
        }}
        onCancel={() => setResetModalOpen(false)}
      />
    </>
  );
}
