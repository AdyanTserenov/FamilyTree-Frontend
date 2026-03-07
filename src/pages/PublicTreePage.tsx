import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { treeService } from '../api/trees';
import { Spinner } from '../components/ui/Spinner';
import type { Person } from '../types';

export const PublicTreePage = () => {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-tree', token],
    queryFn: () => treeService.getPublicTree(token!),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 gap-4">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-semibold text-gray-700">Дерево не найдено</h1>
        <p className="text-gray-500 text-sm">Ссылка недействительна или была отозвана</p>
      </div>
    );
  }

  const persons: Person[] = data?.data ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <span className="text-2xl">🌳</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Семейное дерево</h1>
            <p className="text-sm text-gray-500">Публичный просмотр · {persons.length} {persons.length === 1 ? 'персона' : persons.length < 5 ? 'персоны' : 'персон'}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {persons.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-gray-500">В этом дереве пока нет персон</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {persons.map((person) => (
              <div
                key={person.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {person.avatarUrl ? (
                      <img
                        src={person.avatarUrl}
                        alt={person.fullName ?? `${person.firstName} ${person.lastName}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-green-600 font-semibold text-sm">
                        {person.firstName.charAt(0)}{person.lastName.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">
                      {person.lastName} {person.firstName}
                      {person.middleName ? ` ${person.middleName}` : ''}
                    </p>
                    {(person.birthDate || person.deathDate) && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {person.birthDate ?? '?'}{person.deathDate ? ` — ${person.deathDate}` : ''}
                      </p>
                    )}
                    {person.birthPlace && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {person.birthPlace}</p>
                    )}
                  </div>
                </div>

                {person.biography && (
                  <p className="text-xs text-gray-500 mt-3 line-clamp-2">{person.biography}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-6 text-xs text-gray-400">
        Семейное дерево · Только для просмотра
      </div>
    </div>
  );
};
