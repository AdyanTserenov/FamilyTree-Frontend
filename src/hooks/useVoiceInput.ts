import { useCallback, useEffect, useRef, useState } from 'react';

interface UseVoiceInputOptions {
  lang?: string;
  onResult: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  interimTranscript: string;
  startListening: () => void;
  stopListening: () => void;
}

export const useVoiceInput = ({
  lang = 'ru-RU',
  onResult,
  onError,
}: UseVoiceInputOptions): UseVoiceInputReturn => {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.('Голосовой ввод не поддерживается в вашем браузере');
      return;
    }

    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognitionClass =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;

    const recognition = new SpeechRecognitionClass();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);

      if (final) {
        onResult(final.trim());
        setInterimTranscript('');
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      setInterimTranscript('');

      const errorMessages: Record<string, string> = {
        'not-allowed': 'Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.',
        'no-speech': 'Речь не обнаружена. Попробуйте ещё раз.',
        'network': 'Ошибка сети. Проверьте подключение к интернету.',
        'audio-capture': 'Микрофон не найден или недоступен.',
        'aborted': '',
      };

      const message = errorMessages[event.error] ?? `Ошибка распознавания: ${event.error}`;
      if (message) {
        onError?.(message);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [isSupported, isListening, lang, onResult, onError, stopListening]);

  // Останавливаем при размонтировании компонента
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    isListening,
    isSupported,
    interimTranscript,
    startListening,
    stopListening,
  };
};
