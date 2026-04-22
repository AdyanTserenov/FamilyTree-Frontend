import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock, CheckCircle, AlertCircle, Trash2, AlertTriangle, BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { authService } from '../api/auth';
import { treeService } from '../api/trees';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/ui/Spinner';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatDate } from '../utils/formatDate';

const profileSchema = z.object({
  firstName: z.string().min(1, 'Введите имя'),
  lastName: z.string().min(1, 'Введите фамилию'),
  middleName: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Введите текущий пароль'),
    newPassword: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export const ProfilePage = () => {
  usePageTitle('Профиль');
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'profile' | 'password'>('profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [stats, setStats] = useState<{ treeCount: number; personCount: number } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await treeService.getTrees();
        const trees = response.data ?? [];
        const treeCount = trees.length;
        const personCount = trees.reduce((sum, t) => sum + (t.personCount ?? 0), 0);
        setStats({ treeCount, personCount });
      } catch {
        // ignore stats fetch errors
      }
    };
    fetchStats();
  }, []);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      middleName: user?.middleName ?? '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      const response = await authService.updateProfile({
        firstName: data.firstName,
        lastName: data.lastName,
        middleName: data.middleName,
      });
      if (response.status === 'success' && response.data) {
        setUser(response.data);
        toast.success('Профиль обновлён!');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Ошибка обновления профиля');
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      const response = await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      if (response.status === 'success') {
        toast.success('Пароль успешно изменён!');
        resetPassword();
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Ошибка изменения пароля');
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) return;
    try {
      await authService.resendVerification(user.email);
      toast.success('Письмо с подтверждением отправлено');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Ошибка отправки письма');
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await authService.deleteAccount();
      toast.success('Аккаунт удалён');
      logout();
      navigate('/login');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string; message?: string } } };
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Ошибка удаления аккаунта');
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent';

  const fullName = [user?.firstName, user?.middleName, user?.lastName].filter(Boolean).join(' ');
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('');

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Профиль</h1>

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {initials || <User className="w-8 h-8" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{fullName || 'Пользователь'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600 text-sm">{user?.email}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              {user?.emailVerified ? (
                <div className="flex items-center gap-1.5 text-green-600 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span>Email подтверждён</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-amber-600 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>Email не подтверждён</span>
                  </div>
                  <button
                    onClick={handleResendVerification}
                    className="text-xs text-green-600 hover:text-green-700 underline"
                  >
                    Отправить письмо
                  </button>
                </div>
              )}
            </div>
            {user?.createdAt && (
              <p className="text-xs text-gray-400 mt-1">
                Зарегистрирован {formatDate(user.createdAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Statistics block */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-900">Статистика</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats?.treeCount ?? '—'}</p>
            <p className="text-sm text-gray-600 mt-1">деревьев</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats?.personCount ?? '—'}</p>
            <p className="text-sm text-gray-600 mt-1">персон</p>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveSection('profile')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
              activeSection === 'profile'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <User className="w-4 h-4" />
            Личные данные
          </button>
          <button
            onClick={() => setActiveSection('password')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
              activeSection === 'password'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Lock className="w-4 h-4" />
            Безопасность
          </button>
        </div>

        <div className="p-6">
          {/* Profile section */}
          {activeSection === 'profile' && (
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
                  <input
                    {...registerProfile('firstName')}
                    className={inputClass}
                  />
                  {profileErrors.firstName && (
                    <p className="text-red-500 text-xs mt-1">{profileErrors.firstName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия *</label>
                  <input
                    {...registerProfile('lastName')}
                    className={inputClass}
                  />
                  {profileErrors.lastName && (
                    <p className="text-red-500 text-xs mt-1">{profileErrors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Отчество</label>
                <input
                  {...registerProfile('middleName')}
                  placeholder="Необязательно"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="flex items-center gap-2">
                  <input
                    value={user?.email ?? ''}
                    readOnly
                    className={inputClass + ' bg-gray-50 text-gray-500 cursor-not-allowed'}
                  />
                  {user?.emailVerified ? (
                    <Badge variant="success">Подтверждён</Badge>
                  ) : (
                    <Badge variant="warning">Не подтверждён</Badge>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">Email нельзя изменить</p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={profileSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {profileSubmitting ? <Spinner size="sm" /> : null}
                  Сохранить изменения
                </button>
              </div>
            </form>
          )}

          {/* Password section */}
          {activeSection === 'password' && (
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <p className="font-medium mb-1">Требования к паролю:</p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                  <li>Минимум 8 символов</li>
                  <li>Рекомендуется использовать буквы, цифры и символы</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Текущий пароль
                </label>
                <input
                  {...registerPassword('currentPassword')}
                  type="password"
                  placeholder="Введите текущий пароль"
                  className={inputClass}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {passwordErrors.currentPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Новый пароль
                </label>
                <input
                  {...registerPassword('newPassword')}
                  type="password"
                  placeholder="Минимум 8 символов"
                  className={inputClass}
                />
                {passwordErrors.newPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {passwordErrors.newPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Подтвердите пароль
                </label>
                <input
                  {...registerPassword('confirmPassword')}
                  type="password"
                  placeholder="Повторите новый пароль"
                  className={inputClass}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordSubmitting ? <Spinner size="sm" /> : null}
                  Изменить пароль
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Delete account button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => setShowDeleteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold"
        >
          <Trash2 className="w-4 h-4" />
          Удалить аккаунт
        </button>
      </div>

      {/* Delete account confirmation modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => !deleteLoading && setShowDeleteModal(false)}
        title="Удаление аккаунта"
        size="sm"
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-7 h-7 text-red-600" />
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">
            Это действие невозможно отменить. Будут удалены все ваши деревья,
            персоны, фотографии и данные аккаунта. Восстановление невозможно.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={deleteLoading}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Отмена
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleteLoading ? <Spinner size="sm" /> : null}
              Да, удалить аккаунт
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
