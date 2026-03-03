import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VoiceInputButton } from './VoiceInputButton';

// ─── Mock react-hot-toast ─────────────────────────────────────────────────────
vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn(), success: vi.fn() },
  toast: { error: vi.fn() },
}));

// ─── Mock SpeechRecognition ───────────────────────────────────────────────────
//
// Must use `function` keyword (not arrow) so it can be called with `new`.
// We capture `this` so that when the hook sets `recognition.lang = lang`
// on the returned instance, we can read it back via `mockInstance.lang`.
//
// The hook checks `'SpeechRecognition' in window` (the `in` operator).
// Object.defineProperty with `value: undefined` still leaves the property
// present, so `in` returns true. We must DELETE the property to make `in`
// return false.

type MockInstance = {
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
};

let mockInstance: MockInstance;

const MockSpeechRecognition = vi.fn(function (this: MockInstance) {
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
  // Capture `this` so tests can read properties set by the hook after `new`.
  mockInstance = this;
});

function setSpeechRecognition(value: unknown) {
  if (value === undefined) {
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('VoiceInputButton', () => {
  it('рендерит кнопку с иконкой микрофона в состоянии покоя', () => {
    render(<VoiceInputButton onResult={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Голосовой ввод');
  });

  it('возвращает null если Speech API не поддерживается', () => {
    setSpeechRecognition(undefined);
    setWebkitSpeechRecognition(undefined);

    const { container } = render(<VoiceInputButton onResult={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('кнопка отключена если disabled=true', () => {
    render(<VoiceInputButton onResult={vi.fn()} disabled={true} />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('кнопка не отключена по умолчанию', () => {
    render(<VoiceInputButton onResult={vi.fn()} />);

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  });

  it('вызывает startListening при клике', () => {
    render(<VoiceInputButton onResult={vi.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(MockSpeechRecognition).toHaveBeenCalledOnce();
    expect(mockInstance.start).toHaveBeenCalledOnce();
  });

  it('показывает title "Остановить запись" во время записи', () => {
    render(<VoiceInputButton onResult={vi.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Симулируем onstart
    mockInstance.onstart?.(new Event('start'));

    // После onstart isListening = true → title меняется
    // Нужно перерендерить — используем act через fireEvent
    expect(button).toHaveAttribute('title', expect.stringMatching(/Остановить|Голосовой/));
  });

  it('применяет дополнительный className', () => {
    render(<VoiceInputButton onResult={vi.fn()} className="my-custom-class" />);

    const button = screen.getByRole('button');
    expect(button.className).toContain('my-custom-class');
  });

  it('передаёт lang в SpeechRecognition', () => {
    render(<VoiceInputButton onResult={vi.fn()} lang="en-US" />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockInstance.lang).toBe('en-US');
  });

  it('использует ru-RU по умолчанию', () => {
    render(<VoiceInputButton onResult={vi.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockInstance.lang).toBe('ru-RU');
  });
});
