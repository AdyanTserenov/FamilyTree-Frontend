import { useState } from 'react';

export interface TreeFilters {
  onlyDescendants: boolean;
  onlyAncestors: boolean;
  bornAfter: string;
  bornBefore: string;
  birthPlace: string;
  gender: 'all' | 'MALE' | 'FEMALE';
  showPhotos: boolean;
  showBirthPlace: boolean;
  hasMedia: boolean;
}

export const defaultFilters: TreeFilters = {
  onlyDescendants: false,
  onlyAncestors: false,
  bornAfter: '',
  bornBefore: '',
  birthPlace: '',
  gender: 'all',
  showPhotos: true,
  showBirthPlace: false,
  hasMedia: false,
};

interface TreeFiltersPanelProps {
  filters: TreeFilters;
  onChange: (filters: TreeFilters) => void;
}

export const TreeFiltersPanel = ({ filters, onChange }: TreeFiltersPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const update = (partial: Partial<TreeFilters>) => onChange({ ...filters, ...partial });

  return (
    <div
      className={`absolute right-0 top-0 h-full z-10 flex transition-all duration-300 ${
        isOpen ? 'w-72' : 'w-10'
      }`}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full bg-white border border-gray-200 rounded-l-lg px-2 py-3 shadow-md hover:bg-gray-50 transition-colors z-20"
        title={isOpen ? 'Свернуть панель' : 'Развернуть фильтры'}
      >
        <span className="text-gray-600 text-sm">{isOpen ? '▶' : '◀'}</span>
      </button>

      {/* Panel content */}
      {isOpen && (
        <div className="w-72 h-full bg-white border-l border-gray-200 shadow-lg overflow-y-auto">
          <div className="p-4">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Фильтры</h3>

            {/* Display filters */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Фильтры отображения
              </h4>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onlyDescendants}
                  onChange={e => update({ onlyDescendants: e.target.checked, onlyAncestors: false })}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Только прямые потомки</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.onlyAncestors}
                  onChange={e => update({ onlyAncestors: e.target.checked, onlyDescendants: false })}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Только прямые предки</span>
              </label>
            </div>

            {/* Birth period */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Период жизни
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Год рождения от</label>
                  <input
                    type="number"
                    placeholder="Год"
                    value={filters.bornAfter}
                    onChange={e => update({ bornAfter: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="0"
                    max="2100"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Год рождения до</label>
                  <input
                    type="number"
                    placeholder="Год"
                    value={filters.bornBefore}
                    onChange={e => update({ bornBefore: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="0"
                    max="2100"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Место рождения</label>
                  <input
                    type="text"
                    placeholder="Например: Москва"
                    value={filters.birthPlace}
                    onChange={e => update({ birthPlace: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            {/* Gender */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Пол
              </h4>
              <div className="space-y-1">
                {(['all', 'MALE', 'FEMALE'] as const).map(g => (
                  <label key={g} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={filters.gender === g}
                      onChange={() => update({ gender: g })}
                      className="text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">
                      {g === 'all' ? 'Все' : g === 'MALE' ? 'Мужчины' : 'Женщины'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Media filter */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Медиафайлы
              </h4>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.hasMedia}
                  onChange={e => update({ hasMedia: e.target.checked })}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Только с медиафайлами</span>
              </label>
            </div>

            {/* Display settings */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Настройки отображения
              </h4>
              <label className="flex items-center gap-2 mb-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showPhotos}
                  onChange={e => update({ showPhotos: e.target.checked })}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Показывать фотографии</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showBirthPlace}
                  onChange={e => update({ showBirthPlace: e.target.checked })}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">Показывать место рождения</span>
              </label>
            </div>

            {/* Reset button */}
            <button
              onClick={() => onChange(defaultFilters)}
              className="w-full text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg py-2 hover:bg-gray-50 transition-colors"
            >
              Сбросить фильтры
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
