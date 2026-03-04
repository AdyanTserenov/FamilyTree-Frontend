import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { TreePine, CheckCircle, XCircle } from 'lucide-react';
import { authService } from '../api/auth';
import { Spinner } from '../components/ui/Spinner';
import { usePageTitle } from '../hooks/usePageTitle';

type Status = 'loading' | 'success' | 'error';

export const ConfirmEmailPage = () => {
  usePageTitle('Подтверждение email');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Токен подтверждения не найден.');
      return;
    }

    const confirm = async () => {
      try {
        const response = await authService.confirmEmail(token);
        if (response.status === 'success') {
          setStatus('success');
          setMessage('Ваш email успешно подтверждён!');
        } else {
          setStatus('error');
          setMessage(response.error || 'Ошибка подтверждения email.');
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string; message?: string } } };
        const errMsg = err.response?.data?.error || err.response?.data?.message || '';
        // If token was already used — email was already confirmed, treat as success
        if (errMsg.toLowerCase().includes('уже использовался') || errMsg.toLowerCase().includes('already used')) {
          setStatus('success');
          setMessage('Ваш email уже был подтверждён ранее!');
        } else {
          setStatus('error');
          setMessage(errMsg || 'Ссылка недействительна или устарела.');
        }
      }
    };

    confirm();
  }, [token]);

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
              <p className="text-gray-600">Подтверждение email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-9 h-9 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Email подтверждён!</h1>
              <p className="text-gray-600 mb-8">{message}</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Войти в аккаунт
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-9 h-9 text-red-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Ошибка подтверждения</h1>
              <p className="text-gray-600 mb-8">{message}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Войти
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 px-6 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors font-semibold"
                >
                  Зарегистрироваться
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
