import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TreePine, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { treeService } from '../api/trees';
import { useAuthStore } from '../store/authStore';
import { Spinner } from '../components/ui/Spinner';
import { usePageTitle } from '../hooks/usePageTitle';

type Status = 'loading' | 'success' | 'error' | 'unauthenticated';

export const AcceptInvitePage = () => {
  usePageTitle('Приглашение');
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setStatus('unauthenticated');
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('Токен приглашения не найден.');
      return;
    }

    const accept = async () => {
      try {
        const response = await treeService.acceptInvite(token);
        if (response.success) {
          setStatus('success');
          toast.success('Вы успешно присоединились к дереву!');
          setTimeout(() => navigate('/dashboard'), 2000);
        } else {
          setStatus('error');
          setMessage(response.message || 'Ошибка принятия приглашения.');
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setStatus('error');
        setMessage(err.response?.data?.message || 'Приглашение недействительно или устарело.');
      }
    };

    accept();
  }, [token, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-green-600 font-bold text-2xl">
            <TreePine className="w-7 h-7" />
            FamilyTree
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          {status === 'loading' && (
            <div className="py-8">
              <Spinner size="lg" className="mx-auto mb-4" />
              <p className="text-gray-600">Принятие приглашения...</p>
            </div>
          )}

          {status === 'unauthenticated' && (
            <div className="py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TreePine className="w-9 h-9 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Войдите для принятия</h1>
              <p className="text-gray-600 mb-8">
                Для принятия приглашения необходимо войти в аккаунт или зарегистрироваться.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to={`/login?redirect=/invite/${token}`}
                  className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Войти
                </Link>
                <Link
                  to={`/register?redirect=/invite/${token}`}
                  className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-semibold"
                >
                  Зарегистрироваться
                </Link>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Приглашение принято!</h1>
              <p className="text-gray-600 mb-2">Вы успешно присоединились к семейному дереву.</p>
              <p className="text-gray-500 text-sm">Перенаправление на дашборд...</p>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-9 h-9 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Ошибка</h1>
              <p className="text-gray-600 mb-8">{message}</p>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                На главную
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
