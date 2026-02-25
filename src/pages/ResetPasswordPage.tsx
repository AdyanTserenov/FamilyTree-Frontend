import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TreePine } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../api/auth';
import { Spinner } from '../components/ui/Spinner';

const schema = z.object({
  newPassword: z.string().min(8, 'Пароль должен содержать минимум 8 символов'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) {
      toast.error('Недействительная ссылка для сброса пароля');
      return;
    }
    try {
      const response = await authService.resetPassword(token, data.newPassword);
      if (response.success) {
        toast.success('Пароль успешно изменён!');
        navigate('/login');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Ошибка сброса пароля. Ссылка могла устареть.');
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Недействительная ссылка</h1>
          <p className="text-gray-600 mb-6">Ссылка для сброса пароля недействительна или устарела.</p>
          <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 font-medium">
            Запросить новую ссылку
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-blue-600 font-bold text-2xl">
            <TreePine className="w-7 h-7" />
            FamilyTree
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Новый пароль</h1>
          <p className="text-gray-600 mt-1">Введите новый пароль для вашего аккаунта</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Новый пароль</label>
              <input
                {...register('newPassword')}
                type="password"
                placeholder="Минимум 8 символов"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.newPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Подтвердите пароль</label>
              <input
                {...register('confirmPassword')}
                type="password"
                placeholder="Повторите пароль"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Spinner size="sm" /> : null}
              {isSubmitting ? 'Сохранение...' : 'Сохранить пароль'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
