import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TreePine } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/ui/Spinner';
import { usePageTitle } from '../hooks/usePageTitle';

const schema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
});

type FormData = z.infer<typeof schema>;

export const LoginPage = () => {
  usePageTitle('Вход');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth, setUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      const response = await authService.signIn(data);
      if (response.status === 'success' && response.data) {
        // Backend returns the JWT as a plain string in response.data
        const token = response.data as unknown as string;
        // Store token immediately so axios interceptor sends it on subsequent requests
        setAuth({ id: 0, email: data.email, firstName: '', lastName: '', emailVerified: false, createdAt: '' }, token);
        // Fetch full profile in background — update user data without changing token
        authService.getProfile().then((profileResponse) => {
          if (profileResponse.status === 'success' && profileResponse.data) {
            setUser(profileResponse.data);
          }
        }).catch(() => {
          // Profile fetch failed — user stays with minimal data, not a blocker
        });
        const redirect = searchParams.get('redirect');
        navigate(redirect || '/dashboard');
      } else {
        toast.error(response.error || 'Неверный email или пароль');
      }
    } catch (error: unknown) {
      const err = error as {
        response?: { data?: { error?: string; message?: string } };
      };
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Неверный email или пароль');
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
          <h1 className="text-2xl font-bold text-gray-900 mt-4">Вход в аккаунт</h1>
          <p className="text-gray-600 mt-1">Введите ваши данные для входа</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="your@email.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
              <input
                {...register('password')}
                type="password"
                placeholder="Введите пароль"
                autoComplete="current-password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-green-600 hover:text-green-700">
                Забыли пароль?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Spinner size="sm" /> : null}
              {isSubmitting ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-green-600 hover:text-green-700 font-medium">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
