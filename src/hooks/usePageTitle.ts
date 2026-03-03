import { useEffect } from 'react';

const APP_NAME = 'Семейное дерево';

/**
 * Sets the browser tab title.
 * Format: "<pageTitle> — Семейное дерево"
 * If no title is provided, falls back to just "Семейное дерево".
 */
export const usePageTitle = (pageTitle?: string) => {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} — ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [pageTitle]);
};
