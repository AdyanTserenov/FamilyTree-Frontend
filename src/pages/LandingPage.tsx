import { Link } from 'react-router-dom';
import { TreePine, Users, GitBranch, Shield, Star, ArrowRight } from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
            <TreePine className="w-6 h-6" />
            <span>FamilyTree</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Войти
            </Link>
            <Link
              to="/register"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Star className="w-4 h-4" />
            Сохраните историю вашей семьи
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Создайте семейное дерево,
            <br />
            <span className="text-blue-600">которое живёт вечно</span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
            Храните истории, фотографии и связи вашей семьи в одном месте.
            Делитесь с родственниками и исследуйте свои корни.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl hover:bg-blue-700 transition-colors font-semibold text-lg"
            >
              Начать бесплатно
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-white text-gray-700 px-8 py-4 rounded-xl border border-gray-300 hover:bg-gray-50 transition-colors font-semibold text-lg"
            >
              Войти в аккаунт
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Всё что нужно для семейной истории
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-blue-50">
              <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Интерактивный граф</h3>
              <p className="text-gray-600">
                Визуализируйте семейные связи в виде интерактивного дерева с возможностью масштабирования
              </p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-green-50">
              <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Совместная работа</h3>
              <p className="text-gray-600">
                Приглашайте родственников для совместного редактирования с гибкой системой ролей
              </p>
            </div>
            <div className="text-center p-8 rounded-2xl bg-purple-50">
              <div className="w-14 h-14 bg-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">AI-анализ биографий</h3>
              <p className="text-gray-600">
                Автоматически извлекайте даты, места и события из биографий с помощью искусственного интеллекта
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Начните сохранять историю семьи сегодня
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Бесплатная регистрация. Никаких скрытых платежей.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors font-semibold text-lg"
          >
            Создать аккаунт
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-200 text-center text-gray-500">
        <p>© 2024 FamilyTree. Все права защищены.</p>
      </footer>
    </div>
  );
};
