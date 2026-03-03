import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVoiceInput } from './useVoiceInput';

// ─── Mock SpeechRecognition ───────────────────────────────────────────────────
//
// The hook checks `'SpeechRecognition' in window` (the `in` operator).
// Object.defineProperty with `value: undefined` still leaves the property
// present in the object, so `in` returns true. We must DELETE the property
// to make `in` return false.
//
// The mock must use a regular `function` (not an arrow) so it can be called
// with `new`. We capture `this` so that when the hook sets
// `recognition.lang = lang` on the returned instance, we can read it back.

type MockRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
};

// Will be set to `this` inside the constructor so we can inspect mutations.
let mockRecognitionInstance: MockRecognitionInstance;

// Must use `function` keyword so it is constructable with `new`.
const MockSpeechRecognition = vi.fn(function (this: MockRecognitionInstance) {
  this.lang = '';
  this.continuous = false;
  this.interimResults = false;
  this.maxAlternatives = 1;
  this.onstart = null;
  this.onend = null;
  this.onresult = null;
  this.onerror = null;
  this.start = vi.fn();
  this.stop = vi.fn();
  this.abort = vi.fn();
  // Capture `this` so tests can read properties set by the hook after `new`.
  mockRecognitionInstance = this;
});

function setSpeechRecognition(value: unknown) {
  if (value === undefined) {
    // `in` operator returns true even for undefined values — must delete.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as unknown as Record<string, unknown>).SpeechRecognition;
  } else {
    Object.defineProperty(window, 'SpeechRecognition', {
      writable: true,
      configurable: true,
      value,
    });
  }
}

function setWebkitSpeechRecognition(value: unknown) {
  if (value === undefined) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
  } else {
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      writable: true,
      configurable: true,
      value,
    });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  setSpeechRecognition(MockSpeechRecognition);
  setWebkitSpeechRecognition(undefined);
});

afterEach(() => {
  setSpeechRecognition(undefined);
  setWebkitSpeechRecognition(undefined);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildSpeechResultEvent(transcript: string, isFinal: boolean): SpeechRecognitionEvent {
  const result = {
    isFinal,
    length: 1,
    item: () => ({ transcript, confidence: 1 }),
    0: { transcript, confidence: 1 },
  } as unknown as SpeechRecognitionResult;

  const resultList = {
    length: 1,
    item: () => result,
    0: result,
  } as unknown as SpeechRecognitionResultList;

  return {
    resultIndex: 0,
    results: resultList,
  } as unknown as SpeechRecognitionEvent;
}

function buildErrorEvent(error: string): SpeechRecognitionErrorEvent {
  return { error } as unknown as SpeechRecognitionErrorEvent;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useVoiceInput', () => {
  describe('isSupported', () => {
    it('возвращает true если SpeechRecognition доступен', () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn() })
      );
      expect(result.current.isSupported).toBe(true);
    });

    it('возвращает true если webkitSpeechRecognition доступен', () => {
      setSpeechRecognition(undefined);
      setWebkitSpeechRecognition(MockSpeechRecognition);

      const { result } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn() })
      );
      expect(result.current.isSupported).toBe(true);
    });

    it('возвращает false если Speech API недоступен', () => {
      setSpeechRecognition(undefined);
      setWebkitSpeechRecognition(undefined);

      const { result } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn() })
      );
      expect(result.current.isSupported).toBe(false);
    });
  });

  describe('startListening', () => {
    it('устанавливает isListening = true после onstart', () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn() })
      );

      act(() => {
        result.current.startListening();
      });

      // Симулируем onstart
      act(() => {
        mockRecognitionInstance.onstart?.(new Event('start'));
      });

      expect(result.current.isListening).toBe(true);
      expect(mockRecognitionInstance.start).toHaveBeenCalledOnce();
    });

    it('устанавливает lang из параметра', () => {
      const { result } = renderHook(() =>
        useVoiceInput({ lang: 'en-US', onResult: vi.fn() })
      );

      act(() => {
        result.current.startListening();
      });

      expect(mockRecognitionInstance.lang).toBe('en-US');
    });

    it('вызывает onError если Speech API не поддерживается', () => {
      setSpeechRecognition(undefined);
      setWebkitSpeechRecognition(undefined);

      const onError = vi.fn();
      const { result } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn(), onError })
      );

      act(() => {
        result.current.startListening();
      });

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('не поддерживается')
      );
    });
  });

  describe('onresult', () => {
    it('вызывает onResult с финальным текстом', () => {
      const onResult = vi.fn();
      const { result } = renderHook(() =>
        useVoiceInput({ onResult })
      );

      act(() => { result.current.startListening(); });
      act(() => { mockRecognitionInstance.onstart?.(new Event('start')); });

      act(() => {
        mockRecognitionInstance.onresult?.(
          buildSpeechResultEvent('Привет мир', true)
        );
      });

      expect(onResult).toHaveBeenCalledWith('Привет мир');
    });

    it('обновляет interimTranscript для промежуточных результатов', () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn() })
      );

      act(() => { result.current.startListening(); });
      act(() => { mockRecognitionInstance.onstart?.(new Event('start')); });

      act(() => {
        mockRecognitionInstance.onresult?.(
          buildSpeechResultEvent('Привет', false)
        );
      });

      expect(result.current.interimTranscript).toBe('Привет');
    });

    it('очищает interimTranscript после финального результата', () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn() })
      );

      act(() => { result.current.startListening(); });
      act(() => { mockRecognitionInstance.onstart?.(new Event('start')); });

      // Промежуточный
      act(() => {
        mockRecognitionInstance.onresult?.(buildSpeechResultEvent('Привет', false));
      });
      expect(result.current.interimTranscript).toBe('Привет');

      // Финальный
      act(() => {
        mockRecognitionInstance.onresult?.(buildSpeechResultEvent('Привет мир', true));
      });
      expect(result.current.interimTranscript).toBe('');
    });
  });

  describe('stopListening', () => {
    it('вызывает recognition.stop()', () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn() })
      );

      act(() => { result.current.startListening(); });
      act(() => { mockRecognitionInstance.onstart?.(new Event('start')); });
      act(() => { result.current.stopListening(); });

      expect(mockRecognitionInstance.stop).toHaveBeenCalledOnce();
    });

    it('устанавливает isListening = false после onend', () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn() })
      );

      act(() => { result.current.startListening(); });
      act(() => { mockRecognitionInstance.onstart?.(new Event('start')); });
      act(() => { mockRecognitionInstance.onend?.(new Event('end')); });

      expect(result.current.isListening).toBe(false);
    });
  });

  describe('onerror', () => {
    it('вызывает onError с русским сообщением для not-allowed', () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn(), onError })
      );

      act(() => { result.current.startListening(); });
      act(() => { mockRecognitionInstance.onstart?.(new Event('start')); });
      act(() => {
        mockRecognitionInstance.onerror?.(buildErrorEvent('not-allowed'));
      });

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('микрофону')
      );
    });

    it('вызывает onError с русским сообщением для no-speech', () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn(), onError })
      );

      act(() => { result.current.startListening(); });
      act(() => { mockRecognitionInstance.onstart?.(new Event('start')); });
      act(() => {
        mockRecognitionInstance.onerror?.(buildErrorEvent('no-speech'));
      });

      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Речь не обнаружена')
      );
    });

    it('не вызывает onError для aborted', () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn(), onError })
      );

      act(() => { result.current.startListening(); });
      act(() => { mockRecognitionInstance.onstart?.(new Event('start')); });
      act(() => {
        mockRecognitionInstance.onerror?.(buildErrorEvent('aborted'));
      });

      expect(onError).not.toHaveBeenCalled();
    });

    it('устанавливает isListening = false при ошибке', () => {
      const { result } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn() })
      );

      act(() => { result.current.startListening(); });
      act(() => { mockRecognitionInstance.onstart?.(new Event('start')); });
      act(() => {
        mockRecognitionInstance.onerror?.(buildErrorEvent('network'));
      });

      expect(result.current.isListening).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('вызывает stop при размонтировании', () => {
      const { result, unmount } = renderHook(() =>
        useVoiceInput({ onResult: vi.fn() })
      );

      act(() => { result.current.startListening(); });

      unmount();

      expect(mockRecognitionInstance.stop).toHaveBeenCalled();
    });
  });
});
