import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TreePine } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../api/auth';
import { Spinner } from '../components/ui/Spinner';
import { usePageTitle } from '../hooks/usePageTitle';
import { Modal } from '../components/ui/Modal';

const schema = z.object({
  firstName: z.string().min(1, 'Введите имя'),
  lastName: z.string().min(1, 'Введите фамилию'),
  middleName: z.string().optional(),
  email: z.string().email('Некорректный формат email'),
  password: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
  confirmPassword: z.string(),
  privacyPolicy: z.boolean().refine((val) => val === true, {
    message: 'Необходимо принять политику конфиденциальности',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export const RegisterPage = () => {
  usePageTitle('Регистрация');
  const navigate = useNavigate();
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const { confirmPassword: _confirm, privacyPolicy: _privacy, ...signUpData } = data;
      void _confirm;
      void _privacy;
      const response = await authService.signUp(signUpData);
      if (response.status === 'success') {
        toast.success('Регистрация успешна! Проверьте email для подтверждения.');
        navigate('/login');
      } else {
        toast.error(response.error || 'Ошибка регистрации');
      }
    } catch (error: unknown) {
      const err = error as {
        response?: {
          data?: {
            error?: string;
            message?: string;
            details?: Record<string, string | unknown>;
          };
        };
      };
      const respData = err.response?.data;
      if (respData?.details && Object.keys(respData.details).length > 0) {
        // Show each field validation error on a separate toast
        Object.values(respData.details).forEach((msg) => {
          toast.error(String(msg));
        });
      } else if (respData?.error) {
        toast.error(respData.error);
      } else if (respData?.message) {
        toast.error(respData.message);
      } else {
        toast.error('Ошибка регистрации. Попробуйте ещё раз.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-green-600 font-bold text-2xl">
            <TreePine className="w-7 h-7" />
            FamilyTree
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Создать аккаунт</h1>
          <p className="text-gray-600 mt-1">Заполните форму для регистрации</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Имя *</label>
                <input
                  {...register('firstName')}
                  placeholder="Иван"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Фамилия *</label>
                <input
                  {...register('lastName')}
                  placeholder="Иванов"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Отчество</label>
              <input
                {...register('middleName')}
                placeholder="Иванович (необязательно)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                {...register('email')}
                type="email"
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пароль *</label>
              <input
                {...register('password')}
                type="password"
                placeholder="Минимум 8 символов"
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Подтвердите пароль *</label>
              <input
                {...register('confirmPassword')}
                type="password"
                placeholder="Повторите пароль"
                autoComplete="new-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="flex items-start gap-2">
              <input
                {...register('privacyPolicy')}
                type="checkbox"
                id="privacyPolicy"
                className="mt-1 w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <label htmlFor="privacyPolicy" className="text-sm text-gray-600">
                Я согласен с{' '}
                <span
                  className="text-green-600 hover:text-green-700 cursor-pointer underline"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPrivacyModalOpen(true);
                  }}
                >
                  политикой конфиденциальности
                </span>
              </label>
            </div>
            {errors.privacyPolicy && (
              <p className="text-red-500 text-xs mt-1">{errors.privacyPolicy.message}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? <Spinner size="sm" /> : null}
              {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-green-600 hover:text-green-700 font-medium">
              Войти
            </Link>
          </p>
        </div>
      </div>

      <Modal
        isOpen={privacyModalOpen}
        onClose={() => setPrivacyModalOpen(false)}
        title="Политика конфиденциальности"
        size="lg"
      >
        <div className="space-y-5 text-sm text-gray-700">
          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">1. Какие данные мы собираем</h3>
            <p>
              При регистрации и использовании сервиса FamilyTree мы собираем следующие персональные данные:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>Имя, фамилия и отчество пользователя</li>
              <li>Адрес электронной почты (email)</li>
              <li>Данные о родственниках, добавляемых в семейное дерево (имена, даты рождения/смерти, биографические сведения)</li>
              <li>Фотографии и медиафайлы, загружаемые пользователем</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">2. Как используются данные</h3>
            <p>
              Собранные данные используются исключительно для обеспечения работы сервиса FamilyTree:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>Идентификация и аутентификация пользователя</li>
              <li>Отображение и управление семейным деревом</li>
              <li>Отправка уведомлений и системных сообщений на email</li>
              <li>Обеспечение совместного доступа к деревьям по приглашению</li>
            </ul>
            <p className="mt-2">
              Мы <strong>не передаём</strong> ваши данные третьим лицам и не используем их в рекламных целях.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">3. Хранение и защита данных</h3>
            <p>
              Безопасность ваших данных обеспечивается следующими мерами:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>Аутентификация осуществляется с использованием JWT-токенов с ограниченным сроком действия</li>
              <li>Пароли хранятся в зашифрованном виде (bcrypt)</li>
              <li>Передача данных осуществляется по защищённому протоколу HTTPS</li>
              <li>Медиафайлы хранятся в защищённом облачном хранилище</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">4. Права пользователя</h3>
            <p>Вы имеете право в любой момент:</p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
              <li>Просматривать и редактировать свои персональные данные в профиле</li>
              <li>Удалить свой аккаунт и все связанные данные через настройки профиля</li>
              <li>Запросить экспорт своих данных, обратившись в службу поддержки</li>
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">5. Контакты</h3>
            <p>
              По вопросам, связанным с обработкой персональных данных, вы можете обратиться к нам:{' '}
              <span className="text-green-600 font-medium">familytree@support.ru</span>
            </p>
          </section>
        </div>
      </Modal>
    </div>
  );
};
