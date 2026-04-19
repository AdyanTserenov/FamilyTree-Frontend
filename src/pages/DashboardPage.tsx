import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, TreePine, Users, Trash2, Edit2, MoreVertical, Copy, Check, RefreshCw, AlertTriangle } from 'lucide-react';
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

  // ── URL params ──────────────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'all') as 'mine' | 'shared' | 'all';
  const sortBy = (searchParams.get('sort') || 'date') as 'date' | 'name' | 'persons';

  const setTab = (tab: string) =>
    setSearchParams(prev => { prev.set('tab', tab); return prev; });
  const setSort = (sort: string) =>
    setSearchParams(prev => { prev.set('sort', sort); return prev; });

  // ── Modal state ─────────────────────────────────────────────────────────────
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

  // ── Data fetching ────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['trees'],
    queryFn: () => treeService.getTrees(),
  });

  const trees = data?.data ?? [];

  // Keep selectedTree in sync with latest query data (e.g. after publicLinkToken changes)
  const currentSelectedTree = selectedTree
    ? (trees.find(t => t.id === selectedTree.id) ?? selectedTree)
    : null;

  // ── Filtered trees per tab ───────────────────────────────────────────────────
  const myTrees = useMemo(() => trees.filter(t => t.role === 'OWNER'), [trees]);
  const sharedTrees = useMemo(
    () => trees.filter(t => t.role === 'EDITOR' || t.role === 'VIEWER'),
    [trees]
  );
  const allTrees = trees;

  const tabTrees =
    activeTab === 'mine' ? myTrees : activeTab === 'shared' ? sharedTrees : allTrees;

  // ── Sorted trees ─────────────────────────────────────────────────────────────
  const sortedTrees = useMemo(() => {
    const arr = [...tabTrees];
    if (sortBy === 'name') return arr.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
    if (sortBy === 'persons')
      return arr.sort((a, b) => (b.personCount ?? 0) - (a.personCount ?? 0));
    // default: date — sort by updatedAt desc, fallback to id desc
    return arr.sort((a, b) => {
      const da = a.updatedAt ?? a.createdAt;
      const db = b.updatedAt ?? b.createdAt;
      return db.localeCompare(da) || b.id - a.id;
    });
  }, [tabTrees, sortBy]);

  // ── Mutations ────────────────────────────────────────────────────────────────
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

  const generatePublicLinkMutation = useMutation({
    mutationFn: (treeId: number) => treeService.generatePublicLink(treeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trees'] });
      toast.success('Публичная ссылка создана');
    },
    onError: () => toast.error('Ошибка создания публичной ссылки'),
  });

  const revokePublicLinkMutation = useMutation({
    mutationFn: (treeId: number) => treeService.revokePublicLink(treeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trees'] });
      toast.success('Публичная ссылка отключена');
    },
    onError: () => toast.error('Ошибка отключения публичной ссылки'),
  });

  // ── Handlers ─────────────────────────────────────────────────────────────────
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
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteLink);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = inviteLink;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setLinkCopied(true);
      toast.success('Ссылка скопирована!');
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      toast.error('Не удалось скопировать ссылку');
    }
  };

  const handleGeneratePublicLink = () => {
    if (!selectedTree) return;
    generatePublicLinkMutation.mutate(selectedTree.id);
  };

  const handleRevokePublicLink = () => {
    if (!selectedTree) return;
    revokePublicLinkMutation.mutate(selectedTree.id);
  };

  const handleRegeneratePublicLink = () => {
    if (!selectedTree) return;
    revokePublicLinkMutation.mutate(selectedTree.id, {
      onSuccess: () => {
        generatePublicLinkMutation.mutate(selectedTree.id);
      },
    });
  };

  const handleCopyPublicLink = async (token: string) => {
    const url = `${window.location.origin}/public/tree/${token}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      toast.success('Ссылка скопирована!');
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

  // ── Tab definitions ───────────────────────────────────────────────────────────
  const tabs = [
    { key: 'all', label: 'Все', count: allTrees.length },
    { key: 'mine', label: 'Мои', count: myTrees.length },
    { key: 'shared', label: 'Совместные', count: sharedTrees.length },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Sort control */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-gray-500">Сортировка:</span>
        <select
          value={sortBy}
          onChange={e => setSort(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
        >
          <option value="date">По дате изменения</option>
          <option value="name">По названию</option>
          <option value="persons">По количеству персон</option>
        </select>
      </div>

      {/* Trees grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : sortedTrees.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🌳</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            У вас пока нет семейных деревьев
          </h2>
          <p className="text-gray-500 mb-6">
            {activeTab === 'shared'
              ? 'Вас ещё не пригласили ни в одно дерево'
              : 'Создайте своё первое семейное дерево'}
          </p>
          {activeTab !== 'shared' && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              Создать первое дерево
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedTrees.map((tree) => (
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
                    {tree.role === 'OWNER' && (
                      <button
                        onClick={() => openInviteModal(tree)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        Пригласить
                      </button>
                    )}
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

          {/* Public link section — only for OWNER */}
          {currentSelectedTree?.role === 'OWNER' && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Публичная ссылка</h3>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Доступ по ссылке (без авторизации)</span>
                <button
                  onClick={currentSelectedTree?.publicLinkToken ? handleRevokePublicLink : handleGeneratePublicLink}
                  disabled={generatePublicLinkMutation.isPending || revokePublicLinkMutation.isPending}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                    currentSelectedTree?.publicLinkToken ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    currentSelectedTree?.publicLinkToken ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              {currentSelectedTree?.publicLinkToken && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={`${window.location.origin}/public/tree/${currentSelectedTree.publicLinkToken}`}
                      className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600"
                    />
                    <button
                      onClick={() => handleCopyPublicLink(currentSelectedTree.publicLinkToken!)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition-colors whitespace-nowrap"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Копировать
                    </button>
                  </div>
                  <button
                    onClick={handleRegeneratePublicLink}
                    disabled={revokePublicLinkMutation.isPending || generatePublicLinkMutation.isPending}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Создать новую ссылку
                    <span className="text-orange-500 ml-1 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Старая перестанет работать</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
