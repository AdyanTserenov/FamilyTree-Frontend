import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import {
  Edit2,
  Trash2,
  Upload,
  MessageSquare,
  Image,
  Sparkles,
  User,
  Calendar,
  MapPin,
  Send,
  Download,
  X,
  Clock,
  Pencil,
  Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { personService, commentService, mediaService, aiService, treeService } from '../api/trees';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { VoiceInputButton } from '../components/ui/VoiceInputButton';
import { canEdit } from '../utils/roleUtils';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatDate, formatDateTime, getAge } from '../utils/formatDate';
import type { Person, TreeRole, Comment, MediaFile, PersonHistoryEntry } from '../types';

type Tab = 'info' | 'comments' | 'media' | 'ai' | 'history';

const fieldLabels: Record<string, string> = {
  firstName: 'Имя',
  lastName: 'Фамилия',
  middleName: 'Отчество',
  birthDate: 'Дата рождения',
  deathDate: 'Дата смерти',
  gender: 'Пол',
  biography: 'Биография',
  birthPlace: 'Место рождения',
};

const actionIcon = (action: string) => {
  if (action === 'CREATE') return <Plus className="w-4 h-4 text-green-500" />;
  if (action === 'DELETE') return <Trash2 className="w-4 h-4 text-red-500" />;
  return <Pencil className="w-4 h-4 text-blue-500" />;
};

const formatHistoryDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const HistoryTab = ({ treeId, personId }: { treeId: number; personId: number }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['personHistory', treeId, personId],
    queryFn: () => personService.getPersonHistory(treeId, personId),
  });

  if (isLoading)
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );

  const history: PersonHistoryEntry[] = data?.data ?? [];

  if (history.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>История изменений пуста</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="mt-0.5">{actionIcon(entry.action)}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-800">
              <span className="font-medium">{entry.userName}</span>
              {entry.action === 'CREATE' && ' создал(а) персону'}
              {entry.action === 'DELETE' && ' удалил(а) персону'}
              {entry.action === 'UPDATE' && entry.fieldName && (
                <>
                  {' '}изменил(а) поле{' '}
                  <span className="font-medium">«{fieldLabels[entry.fieldName] ?? entry.fieldName}»</span>
                </>
              )}
            </p>
            {entry.action === 'UPDATE' && (entry.oldValue || entry.newValue) && (
              <p className="text-xs text-gray-500 mt-0.5">
                {entry.oldValue && <span className="line-through mr-2">{entry.oldValue}</span>}
                {entry.newValue && <span className="text-green-600">{entry.newValue}</span>}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-1">{formatHistoryDate(entry.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

const MAX_MEDIA_FILES = 10;

export const PersonPage = () => {
  const { treeId, personId } = useParams<{ treeId: string; personId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const currentUserId = user?.id;
  const treeIdNum = Number(treeId);
  const personIdNum = Number(personId);

  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [editingComment, setEditingComment] = useState<{ id: number; content: string } | null>(null);
  const [aiText, setAiText] = useState('');
  const [aiResult, setAiResult] = useState<{
    dates: string[];
    places: string[];
    professions: string[];
    events: string[];
    summary: string;
    success: boolean;
    errorMessage?: string;
  } | null>(null);
  const [personForm, setPersonForm] = useState<Partial<Person>>({});

  // Fetch trees for role check
  const { data: treesData } = useQuery({
    queryKey: ['trees'],
    queryFn: () => treeService.getTrees(),
  });
  const currentTree = treesData?.data?.find((t) => t.id === treeIdNum);
  const userRole = currentTree?.role as TreeRole | undefined;
  const canEditTree = canEdit(userRole);

  // Fetch person
  const { data: personData, isLoading: personLoading } = useQuery({
    queryKey: ['person', treeIdNum, personIdNum],
    queryFn: () => personService.getPerson(treeIdNum, personIdNum),
    enabled: !!treeIdNum && !!personIdNum,
  });
  const person = personData?.data;
  usePageTitle(person?.fullName ?? person?.firstName);

  // Fetch comments
  const { data: commentsData } = useQuery({
    queryKey: ['comments', treeIdNum, personIdNum],
    queryFn: () => commentService.getComments(treeIdNum, personIdNum),
    enabled: activeTab === 'comments' && !!treeIdNum && !!personIdNum,
  });
  const comments = commentsData?.data ?? [];

  // Fetch media
  const { data: mediaData } = useQuery({
    queryKey: ['media', treeIdNum, personIdNum],
    queryFn: () => mediaService.getMedia(treeIdNum, personIdNum),
    enabled: activeTab === 'media' && !!treeIdNum && !!personIdNum,
  });
  const mediaFiles = mediaData?.data ?? [];

  // Mutations
  const updatePersonMutation = useMutation({
    mutationFn: (data: Partial<Person>) =>
      personService.updatePerson(treeIdNum, personIdNum, {
        firstName: data.firstName ?? '',
        lastName: data.lastName ?? '',
        middleName: data.middleName,
        gender: data.gender ?? 'MALE',
        birthDate: data.birthDate,
        deathDate: data.deathDate,
        birthPlace: data.birthPlace,
        deathPlace: data.deathPlace,
        biography: data.biography,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', treeIdNum, personIdNum] });
      queryClient.invalidateQueries({ queryKey: ['graph', treeIdNum] });
      setEditModalOpen(false);
      toast.success('Данные обновлены!');
    },
    onError: () => toast.error('Ошибка обновления'),
  });

  const deletePersonMutation = useMutation({
    mutationFn: () => personService.deletePerson(treeIdNum, personIdNum),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graph', treeIdNum] });
      toast.success('Персона удалена');
      navigate(`/trees/${treeIdNum}`);
    },
    onError: () => toast.error('Ошибка удаления'),
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => personService.uploadAvatar(treeIdNum, personIdNum, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['person', treeIdNum, personIdNum] });
      toast.success('Фото обновлено!');
    },
    onError: () => toast.error('Ошибка загрузки фото'),
  });

  const addCommentMutation = useMutation({
    mutationFn: () =>
      commentService.addComment(treeIdNum, personIdNum, {
        content: commentText,
        parentCommentId: replyTo ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', treeIdNum, personIdNum] });
      setCommentText('');
      setReplyTo(null);
    },
    onError: () => toast.error('Ошибка добавления комментария'),
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      commentService.updateComment(treeIdNum, personIdNum, id, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', treeIdNum, personIdNum] });
      setEditingComment(null);
    },
    onError: () => toast.error('Ошибка обновления комментария'),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: number) => commentService.deleteComment(treeIdNum, personIdNum, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', treeIdNum, personIdNum] });
    },
    onError: () => toast.error('Ошибка удаления комментария'),
  });

  const uploadMediaMutation = useMutation({
    mutationFn: ({ file, type }: { file: File; type: string }) =>
      mediaService.uploadMedia(treeIdNum, personIdNum, file, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', treeIdNum, personIdNum] });
      toast.success('Файл загружен!');
    },
    onError: () => toast.error('Ошибка загрузки файла'),
  });

  const deleteMediaMutation = useMutation({
    mutationFn: (fileId: number) => mediaService.deleteMedia(treeIdNum, personIdNum, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media', treeIdNum, personIdNum] });
      toast.success('Файл удалён');
    },
    onError: () => toast.error('Ошибка удаления файла'),
  });

  const aiMutation = useMutation({
    mutationFn: () => aiService.extractFacts({ biography: aiText, personId: personIdNum }),
    onSuccess: (data) => {
      if (data.data) {
        setAiResult(data.data);
      }
    },
    onError: () => toast.error('Ошибка AI-анализа'),
  });

  const openEditModal = () => {
    if (!person) return;
    setPersonForm({ ...person });
    setEditModalOpen(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadAvatarMutation.mutate(file);
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const type = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
      ? 'IMAGE'
      : ['mp4', 'mov', 'avi'].includes(ext)
      ? 'VIDEO'
      : ['mp3', 'wav', 'ogg'].includes(ext)
      ? 'AUDIO'
      : 'DOCUMENT';
    uploadMediaMutation.mutate({ file, type });
  };

  const handleDownload = async (file: MediaFile) => {
    try {
      const blob = await mediaService.downloadMedia(treeIdNum, personIdNum, file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Ошибка скачивания файла');
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';

  if (personLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!person) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600">Персона не найдена</p>
        <Link
          to={`/trees/${treeIdNum}`}
          className="text-green-600 hover:text-green-700 mt-4 inline-block"
        >
          Вернуться к дереву
        </Link>
      </div>
    );
  }

  const fullName = [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ');
  const initials = [person.firstName?.[0], person.lastName?.[0]].filter(Boolean).join('');
  const isMale = person.gender === 'MALE';
  const isFemale = person.gender === 'FEMALE';
  const age = getAge(person.birthDate, person.deathDate);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; restricted?: boolean }[] = [
    { id: 'info', label: 'Информация', icon: <User className="w-4 h-4" /> },
    { id: 'comments', label: 'Комментарии', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'media', label: 'Медиа', icon: <Image className="w-4 h-4" /> },
    { id: 'ai', label: 'AI-анализ', icon: <Sparkles className="w-4 h-4" /> },
    ...(userRole === 'OWNER' || userRole === 'EDITOR'
      ? [{ id: 'history' as Tab, label: 'История', icon: <Clock className="w-4 h-4" />, restricted: true }]
      : []),
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/dashboard" className="hover:text-gray-700">
          Деревья
        </Link>
        <span>/</span>
        <Link to={`/trees/${treeIdNum}`} className="hover:text-gray-700">
          {currentTree?.name ?? 'Дерево'}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">
          {person.firstName} {person.lastName}
        </span>
      </div>

      {/* Person header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {person.avatarUrl ? (
              <img
                src={person.avatarUrl}
                alt={fullName}
                className="w-24 h-24 rounded-2xl object-cover"
              />
            ) : (
              <div
                className={`w-24 h-24 rounded-2xl flex items-center justify-center text-white text-2xl font-bold ${
                  isMale ? 'bg-green-500' : isFemale ? 'bg-pink-500' : 'bg-gray-500'
                }`}
              >
                {initials || '?'}
              </div>
            )}
            {canEditTree && (
              <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-green-700 transition-colors shadow-md">
                <Upload className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <Badge variant={isMale ? 'info' : 'default'}>
                    {isMale ? 'Мужской' : isFemale ? 'Женский' : 'Другой'}
                  </Badge>
                  {age && <span className="text-sm text-gray-500">{age}</span>}
                  {person.deathDate && <Badge variant="default">Умер(ла)</Badge>}
                </div>
              </div>
              {canEditTree && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={openEditModal}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 text-sm transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Изменить
                  </button>
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 border border-red-200 rounded-lg hover:bg-red-50 text-red-600 text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Key dates */}
            <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
              {person.birthDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Рождение: {formatDate(person.birthDate)}</span>
                  {person.birthPlace && (
                    <span className="text-gray-400">· {person.birthPlace}</span>
                  )}
                </div>
              )}
              {person.deathDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Смерть: {formatDate(person.deathDate)}</span>
                  {person.deathPlace && (
                    <span className="text-gray-400">· {person.deathPlace}</span>
                  )}
                </div>
              )}
              {person.birthPlace && !person.birthDate && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{person.birthPlace}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {person.biography ? (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Биография
                  </h3>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {person.biography}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">Биография не добавлена</p>
              )}

              {/* Relationships */}
              {person.relationships && person.relationships.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    Связи
                  </h3>
                  <div className="space-y-2">
                    {person.relationships.map((rel) => {
                      const other =
                        rel.person1Id === personIdNum ? rel.person2 : rel.person1;
                      const isParent =
                        rel.type === 'PARENT_CHILD' && rel.person1Id === personIdNum;
                      const isChild =
                        rel.type === 'PARENT_CHILD' && rel.person2Id === personIdNum;
                      const label = isParent
                        ? 'Родитель'
                        : isChild
                        ? 'Ребёнок'
                        : 'Партнёр';
                      return (
                        <div
                          key={rel.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                        >
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={rel.type === 'PARENT_CHILD' ? 'info' : 'success'}
                            >
                              {label}
                            </Badge>
                            {other ? (
                              <Link
                                to={`/trees/${treeIdNum}/persons/${other.id}`}
                                className="text-green-600 hover:text-green-700 font-medium"
                              >
                                {other.firstName} {other.lastName}
                              </Link>
                            ) : (
                              <span className="text-gray-500">Неизвестно</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-4">
              {/* Add comment */}
              <div className="flex gap-3">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder={
                    replyTo ? 'Ответить на комментарий...' : 'Написать комментарий...'
                  }
                  rows={2}
                  className={inputClass + ' resize-none flex-1'}
                />
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => addCommentMutation.mutate()}
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addCommentMutation.isPending ? (
                      <Spinner size="sm" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                  {replyTo && (
                    <button
                      onClick={() => setReplyTo(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 text-sm"
                    >
                      Отмена
                    </button>
                  )}
                </div>
              </div>

              {/* Comments list */}
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет комментариев</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment: Comment) => (
                    <div key={comment.id} className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm">
                              {comment.authorName}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDateTime(comment.createdAt)}
                            </span>
                          </div>
                          {editingComment?.id === comment.id ? (
                            <div className="flex gap-2 mt-2">
                              <input
                                value={editingComment.content}
                                onChange={(e) =>
                                  setEditingComment({
                                    ...editingComment,
                                    content: e.target.value,
                                  })
                                }
                                className={inputClass + ' text-sm'}
                              />
                              <button
                                onClick={() =>
                                  updateCommentMutation.mutate({
                                    id: editingComment.id,
                                    content: editingComment.content,
                                  })
                                }
                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                              >
                                Сохранить
                              </button>
                              <button
                                onClick={() => setEditingComment(null)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                              >
                                Отмена
                              </button>
                            </div>
                          ) : (
                            <p className="text-gray-700 text-sm">{comment.content}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setReplyTo(comment.id)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Ответить"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          {comment.authorId === currentUserId && (
                            <>
                              <button
                                onClick={() =>
                                  setEditingComment({
                                    id: comment.id,
                                    content: comment.content,
                                  })
                                }
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Редактировать"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteCommentMutation.mutate(comment.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Удалить"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 ml-4 space-y-2 border-l-2 border-gray-200 pl-4">
                          {comment.replies.map((reply: Comment) => (
                            <div key={reply.id} className="bg-white rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900 text-xs">
                                  {reply.authorName}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {formatDateTime(reply.createdAt)}
                                </span>
                              </div>
                              <p className="text-gray-700 text-sm">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <div className="space-y-4">
              {canEditTree && (
                <label
                  className={`flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl transition-colors ${
                    mediaFiles.length >= MAX_MEDIA_FILES
                      ? 'border-gray-200 bg-gray-50 text-gray-400 opacity-50 cursor-not-allowed'
                      : 'border-gray-300 cursor-pointer hover:border-green-400 hover:bg-green-50 text-gray-600 hover:text-green-600'
                  }`}
                >
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">Загрузить файл</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleMediaUpload}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                    disabled={mediaFiles.length >= MAX_MEDIA_FILES}
                  />
                  {uploadMediaMutation.isPending && <Spinner size="sm" />}
                </label>
              )}

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">
                  Файлов: <span className="font-medium text-gray-700">{mediaFiles.length}</span>{' '}
                  из <span className="font-medium text-gray-700">{MAX_MEDIA_FILES}</span>
                </span>
                {mediaFiles.length >= MAX_MEDIA_FILES && (
                  <span className="text-xs text-red-500">Достигнут лимит файлов</span>
                )}
              </div>

              {mediaFiles.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Нет медиафайлов</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaFiles.map((file: MediaFile) => (
                    <div
                      key={file.id}
                      className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200"
                    >
                      {file.fileType === 'IMAGE' ? (
                        <div className="aspect-square bg-gray-100">
                          <img
                            src={file.url}
                            alt={file.fileName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-square bg-gray-100 flex items-center justify-center">
                          <Image className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs text-gray-700 truncate font-medium">
                          {file.fileName}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {(file.fileSize / 1024).toFixed(0)} KB
                        </p>
                        <div className="flex gap-1 mt-2">
                          <button
                            onClick={() => handleDownload(file)}
                            className="flex-1 flex items-center justify-center py-1 text-xs text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          {canEditTree && (
                            <button
                              onClick={() => deleteMediaMutation.mutate(file.id)}
                              className="flex-1 flex items-center justify-center py-1 text-xs text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Текст для анализа
                </label>
                <textarea
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder="Вставьте биографию или любой текст для AI-анализа..."
                  rows={6}
                  className={inputClass + ' resize-none'}
                />
                {person.biography && !aiText && (
                  <button
                    onClick={() => setAiText(person.biography ?? '')}
                    className="mt-2 text-sm text-green-600 hover:text-green-700"
                  >
                    Использовать биографию персоны
                  </button>
                )}
              </div>

              <button
                onClick={() => aiMutation.mutate()}
                disabled={!aiText.trim() || aiMutation.isPending}
                className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {aiMutation.isPending ? <Spinner size="sm" /> : <Sparkles className="w-5 h-5" />}
                {aiMutation.isPending ? 'Анализ...' : 'Анализировать'}
              </button>

              {/* AI Results */}
              {aiResult && (() => {
                const hasData =
                  (aiResult.summary && aiResult.summary.trim().length > 0) ||
                  (Array.isArray(aiResult.dates) && aiResult.dates.length > 0) ||
                  (Array.isArray(aiResult.places) && aiResult.places.length > 0) ||
                  (Array.isArray(aiResult.professions) && aiResult.professions.length > 0) ||
                  (Array.isArray(aiResult.events) && aiResult.events.length > 0);
                return (
                  <div className="space-y-4">
                    {!aiResult.success && (
                      <div className="bg-red-50 rounded-xl p-4">
                        <p className="text-red-700 text-sm font-medium">Сервис AI недоступен</p>
                        <p className="text-red-600 text-sm mt-1">
                          {aiResult.errorMessage ?? 'Сервис AI временно недоступен. Попробуйте позже.'}
                        </p>
                      </div>
                    )}
                    {aiResult.success && !hasData && (
                      <div className="bg-yellow-50 rounded-xl p-4">
                        <p className="text-yellow-700 text-sm">
                          AI не смог извлечь факты из текста. Попробуйте предоставить более подробную биографию.
                        </p>
                      </div>
                    )}

                    {aiResult.summary && (
                      <div className="bg-green-50 rounded-xl p-4">
                        <h4 className="text-sm font-semibold text-green-800 mb-2">Краткое резюме</h4>
                        <p className="text-green-700 text-sm">{aiResult.summary}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {(aiResult.dates?.length ?? 0) > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Даты
                          </h4>
                          <ul className="space-y-1">
                            {aiResult.dates.map((d, i) => (
                              <li key={i} className="text-sm text-gray-600">• {d}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(aiResult.places?.length ?? 0) > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Места
                          </h4>
                          <ul className="space-y-1">
                            {aiResult.places.map((p, i) => (
                              <li key={i} className="text-sm text-gray-600">• {p}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(aiResult.professions?.length ?? 0) > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Профессии
                          </h4>
                          <ul className="space-y-1">
                            {aiResult.professions.map((p, i) => (
                              <li key={i} className="text-sm text-gray-600">• {p}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(aiResult.events?.length ?? 0) > 0 && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            События
                          </h4>
                          <ul className="space-y-1">
                            {aiResult.events.map((e, i) => (
                              <li key={i} className="text-sm text-gray-600">• {e}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (userRole === 'OWNER' || userRole === 'EDITOR') && (
            <HistoryTab treeId={treeIdNum} personId={personIdNum} />
          )}
        </div>
      </div>

      {/* Edit Person Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Редактировать персону"
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
              <input
                value={personForm.firstName ?? ''}
                onChange={(e) => setPersonForm((f) => ({ ...f, firstName: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия *</label>
              <input
                value={personForm.lastName ?? ''}
                onChange={(e) => setPersonForm((f) => ({ ...f, lastName: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Отчество</label>
            <input
              value={personForm.middleName ?? ''}
              onChange={(e) => setPersonForm((f) => ({ ...f, middleName: e.target.value }))}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Пол</label>
            <select
              value={personForm.gender ?? 'MALE'}
              onChange={(e) =>
                setPersonForm((f) => ({
                  ...f,
                  gender: e.target.value as 'MALE' | 'FEMALE' | 'OTHER',
                }))
              }
              className={inputClass + ' bg-white'}
            >
              <option value="MALE">Мужской</option>
              <option value="FEMALE">Женский</option>
              <option value="OTHER">Другой</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата рождения</label>
              <input
                type="date"
                value={personForm.birthDate ?? ''}
                onChange={(e) => setPersonForm((f) => ({ ...f, birthDate: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата смерти</label>
              <input
                type="date"
                value={personForm.deathDate ?? ''}
                onChange={(e) => setPersonForm((f) => ({ ...f, deathDate: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Место рождения</label>
              <input
                value={personForm.birthPlace ?? ''}
                onChange={(e) => setPersonForm((f) => ({ ...f, birthPlace: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Место смерти</label>
              <input
                value={personForm.deathPlace ?? ''}
                onChange={(e) => setPersonForm((f) => ({ ...f, deathPlace: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Биография</label>
              <VoiceInputButton
                onResult={(text) =>
                  setPersonForm((f) => ({
                    ...f,
                    biography: (f.biography ? f.biography + ' ' : '') + text,
                  }))
                }
              />
            </div>
            <textarea
              value={personForm.biography ?? ''}
              onChange={(e) => setPersonForm((f) => ({ ...f, biography: e.target.value }))}
              rows={4}
              className={inputClass + ' resize-none'}
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              onClick={() => setEditModalOpen(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={() => updatePersonMutation.mutate(personForm)}
              disabled={
                !personForm.firstName?.trim() ||
                !personForm.lastName?.trim() ||
                updatePersonMutation.isPending
              }
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updatePersonMutation.isPending ? <Spinner size="sm" /> : null}
              Сохранить
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Person Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Удалить персону"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Вы уверены, что хотите удалить{' '}
            <span className="font-semibold text-gray-900">{fullName}</span>?
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
              onClick={() => deletePersonMutation.mutate()}
              disabled={deletePersonMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletePersonMutation.isPending ? <Spinner size="sm" /> : null}
              Удалить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};