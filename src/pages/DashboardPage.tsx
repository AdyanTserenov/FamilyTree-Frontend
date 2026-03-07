import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TreePine, Users, Trash2, Edit2, MoreVertical, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { treeService } from '../api/trees';
import { useAuthStore } from '../store/authStore';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { roleLabels } from '../utils/roleUtils';
import { formatDate } from '../utils/formatDate';
import { usePageTitle } from '../hooks/usePageTitle';
import type { Tree } from '../types';

export const DashboardPage = () => {
  usePageTitle('Мои деревья');
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [newTreeName, setNewTreeName] = useState('');
  const [editTreeName, setEditTreeName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER');
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['trees'],
    queryFn: () => treeService.getTrees(),
  });

  const trees = data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (name: string) => treeService.createTree(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trees'] });
      setCreateModalOpen(false);
      setNewTreeName('');
      toast.success('Дерево создано!');
    },
    onError: () => toast.error('Ошибка создания дерева'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => treeService.updateTree(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trees'] });
      setEditModalOpen(false);
      setSelectedTree(null);
      toast.success('Дерево обновлено!');
    },
    onError: () => toast.error('Ошибка обновления дерева'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => treeService.deleteTree(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trees'] });
      setDeleteModalOpen(false);
      setSelectedTree(null);
      toast.success('Дерево удалено');
    },
    onError: () => toast.error('Ошибка удаления дерева'),
  });

  const inviteMutation = useMutation({
    mutationFn: ({ treeId, email, role }: { treeId: number; email: string; role: 'EDITOR' | 'VIEWER' }) =>
      treeService.inviteMember(treeId, { email, role }),
    onSuccess: () => {
      setInviteEmail('');
      toast.success('Приглашение отправлено!');
    },
    onError: () => toast.error('Ошибка отправки приглашения'),
  });

  const getInviteLinkMutation = useMutation({
    mutationFn: ({ treeId, email, role }: { treeId: number; email: string; role: string }) =>
      treeService.getInviteLink(treeId, email, role),
    onSuccess: (data) => {
      if (data.data?.inviteLink) {
        setInviteLink(data.data.inviteLink);
      }
    },
    onError: () => toast.error('Ошибка получения ссылки'),
  });

  const handleCreateTree = () => {
    if (!newTreeName.trim()) return;
    createMutation.mutate(newTreeName.trim());
  };

  const handleEditTree = () => {
    if (!selectedTree || !editTreeName.trim()) return;
    updateMutation.mutate({ id: selectedTree.id, name: editTreeName.trim() });
  };

  const handleDeleteTree = () => {
    if (!selectedTree) return;
    deleteMutation.mutate(selectedTree.id);
  };

  const handleInvite = () => {
    if (!selectedTree || !inviteEmail.trim()) return;
    inviteMutation.mutate({ treeId: selectedTree.id, email: inviteEmail.trim(), role: inviteRole });
  };

  const handleGetInviteLink = () => {
    if (!selectedTree) return;
    getInviteLinkMutation.mutate({ treeId: selectedTree.id, email: inviteEmail.trim(), role: inviteRole });
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      toast.success('Ссылка скопирована!');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать ссылку');
    }
  };

  const openEditModal = (tree: Tree) => {
    setSelectedTree(tree);
    setEditTreeName(tree.name);
    setEditModalOpen(true);
    setOpenMenuId(null);
  };

  const openDeleteModal = (tree: Tree) => {
    setSelectedTree(tree);
    setDeleteModalOpen(true);
    setOpenMenuId(null);
  };

  const openInviteModal = (tree: Tree) => {
    setSelectedTree(tree);
    setInviteEmail('');
    setInviteLink('');
    setInviteModalOpen(true);
    setOpenMenuId(null);
  };

  const roleVariant: Record<string, 'info' | 'success' | 'default'> = {
    OWNER: 'info',
    EDITOR: 'success',
    VIEWER: 'default',
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои деревья</h1>
          <p className="text-gray-600 mt-1">Добро пожаловать, {user?.firstName}!</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Создать дерево
        </button>
      </div>

      {/* Trees grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : trees.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TreePine className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Нет семейных деревьев</h2>
          <p className="text-gray-600 mb-6">Создайте первое дерево, чтобы начать</p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            <Plus className="w-5 h-5" />
            Создать дерево
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {trees.map((tree) => (
            <div
              key={tree.id}
              className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md transition-shadow relative"
            >
              {/* Menu button */}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => setOpenMenuId(openMenuId === tree.id ? null : tree.id)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {openMenuId === tree.id && (
                  <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-[160px] py-1">
                    <button
                      onClick={() => openInviteModal(tree)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      Пригласить
                    </button>
                    {tree.role === 'OWNER' && (
                      <>
                        <button
                          onClick={() => openEditModal(tree)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Переименовать
                        </button>
                        <button
                          onClick={() => openDeleteModal(tree)}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Удалить
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              <Link to={`/trees/${tree.id}`} className="block">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <TreePine className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="min-w-0 flex-1 pr-6">
                    <h3 className="font-semibold text-gray-900 truncate">{tree.name}</h3>
                    <Badge variant={roleVariant[tree.role] ?? 'default'} className="mt-1">
                      {roleLabels[tree.role]}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Создано {formatDate(tree.createdAt)}</span>
                  {tree.memberCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {tree.memberCount}
                    </span>
                  )}
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Click outside to close menu */}
      {openMenuId !== null && (
        <div className="fixed inset-0 z-0" onClick={() => setOpenMenuId(null)} />
      )}

      {/* Create Tree Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Создать дерево">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название дерева</label>
            <input
              value={newTreeName}
              onChange={(e) => setNewTreeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTree()}
              placeholder="Например: Семья Ивановых"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleCreateTree}
              disabled={!newTreeName.trim() || createMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? <Spinner size="sm" /> : null}
              Создать
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Tree Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Переименовать дерево">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Новое название</label>
            <input
              value={editTreeName}
              onChange={(e) => setEditTreeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleEditTree()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleEditTree}
              disabled={!editTreeName.trim() || updateMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? <Spinner size="sm" /> : null}
              Сохранить
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Tree Modal */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Удалить дерево">
        <div className="space-y-4">
          <p className="text-gray-600">
            Вы уверены, что хотите удалить дерево{' '}
            <span className="font-semibold text-gray-900">«{selectedTree?.name}»</span>?
            Это действие нельзя отменить.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setDeleteModalOpen(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleDeleteTree}
              disabled={deleteMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteMutation.isPending ? <Spinner size="sm" /> : null}
              Удалить
            </button>
          </div>
        </div>
      </Modal>

      {/* Invite Modal */}
      <Modal isOpen={inviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Пригласить участника" size="lg">
        <div className="space-y-6">
          {/* Email invite */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Пригласить по email</h3>
            <div className="flex gap-2">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                type="email"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'EDITOR' | 'VIEWER')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
              >
                <option value="VIEWER">Наблюдатель</option>
                <option value="EDITOR">Редактор</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {inviteMutation.isPending ? <Spinner size="sm" /> : null}
                Отправить
              </button>
            </div>
          </div>

          {/* Invite link */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Пригласительная ссылка</h3>
            {inviteLink ? (
              <div className="flex gap-2">
                <input
                  value={inviteLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-600"
                />
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700"
                >
                  {linkCopied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  {linkCopied ? 'Скопировано' : 'Копировать'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleGetInviteLink}
                disabled={getInviteLinkMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50"
              >
                {getInviteLinkMutation.isPending ? <Spinner size="sm" /> : null}
                Создать ссылку
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
