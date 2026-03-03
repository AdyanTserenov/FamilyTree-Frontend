import '@testing-library/jest-dom';

// ─── localStorage polyfill for jsdom 28.x ────────────────────────────────────
// jsdom 28.x (bundled with vitest 4.x) requires a --localstorage-file CLI flag
// to enable localStorage. Without it, localStorage is a non-functional stub.
// We replace it with a simple in-memory implementation here, in the global
// setup file, so it is available before any test module is imported.
const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string): string | null { return store[key] ?? null; },
    setItem(key: string, value: string): void { store[key] = String(value); },
    removeItem(key: string): void { delete store[key]; },
    clear(): void { store = {}; },
    get length(): number { return Object.keys(store).length; },
    key(index: number): string | null { return Object.keys(store)[index] ?? null; },
  };
};

Object.defineProperty(globalThis, 'localStorage', {
  value: createLocalStorageMock(),
  writable: true,
  configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: createLocalStorageMock(),
  writable: true,
  configurable: true,
});
