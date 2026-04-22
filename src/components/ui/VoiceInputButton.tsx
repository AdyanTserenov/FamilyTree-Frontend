import { Mic, MicOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useVoiceInput } from '../../hooks/useVoiceInput';

interface VoiceInputButtonProps {
  /** Вызывается с финальным распознанным текстом */
  onResult: (text: string) => void;
  /** Язык распознавания (по умолчанию ru-RU) */
  lang?: string;
  /** Дополнительные CSS-классы */
  className?: string;
  /** Отключить кнопку */
  disabled?: boolean;
}

export const VoiceInputButton = ({
  onResult,
  lang = 'ru-RU',
  className = '',
  disabled = false,
}: VoiceInputButtonProps) => {
  const { isListening, isSupported, interimTranscript, startListening } = useVoiceInput({
    lang,
    onResult,
    onError: (error) => toast.error(error),
  });

  if (!isSupported) {
    return (
      <div className="relative inline-flex items-center">
        <button
          type="button"
          disabled
          title="Голосовой ввод недоступен в этом браузере"
          className={[
            'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
            'bg-gray-100 text-gray-400 opacity-40 cursor-not-allowed',
            className,
          ].join(' ')}
        >
          <Mic className="w-4 h-4" />
        </button>
        <span className="sr-only">Голосовой ввод</span>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={startListening}
        disabled={disabled}
        title={isListening ? 'Остановить запись' : 'Голосовой ввод'}
        className={[
          'flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200',
          isListening
            ? 'bg-red-100 text-red-600 hover:bg-red-200 ring-2 ring-red-400 ring-offset-1'
            : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-600',
          disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
          className,
        ].join(' ')}
      >
        {/* Пульсирующий индикатор во время записи */}
        {isListening && (
          <span className="absolute inset-0 rounded-lg animate-ping bg-red-300 opacity-50" />
        )}
        {isListening ? (
          <MicOff className="w-4 h-4 relative z-10" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Промежуточный текст (interim) во время записи */}
      {isListening && interimTranscript && (
        <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs text-gray-400 italic bg-white border border-gray-200 rounded px-2 py-1 shadow-sm z-20 max-w-48 truncate">
          {interimTranscript}…
        </span>
      )}
    </div>
  );
};
