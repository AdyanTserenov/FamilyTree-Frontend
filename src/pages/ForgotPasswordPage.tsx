import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TreePine, ArrowLeft, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { authService } from '../api/auth';
import { Spinner } from '../components/ui/Spinner';

const schema = z.object({
  email: z.string().email('Введите корректный email'),
});

type FormData = z.infer<typeof schema>;

export const ForgotPasswordPage = () => {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await authService.forgotPassword(data.email);
      if (response.success) {
        setSent(true);
        toast.success('Письмо отправлено на ваш email');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Ошибка отправки письма');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-blue-600 font-bold text-2xl">
            <TreePine className="w-7 h-7" />
            FamilyTree
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Восстановление пароля</h1>
          <p className="text-gray-600 mt-1">Введите email для получения инструкций</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Письмо отправлено!</h2>
              <p className="text-gray-600 mb-6">
                Проверьте вашу почту и перейдите по ссылке для сброса пароля.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Вернуться к входу
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="your@email.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Spinner size="sm" /> : null}
                  {isSubmitting ? 'Отправка...' : 'Отправить письмо'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Вернуться к входу
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
