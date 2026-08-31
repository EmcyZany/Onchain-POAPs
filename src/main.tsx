// Safely configure window.fetch property descriptor to prevent "Cannot set property fetch of #<Window> which has only a getter"
if (typeof window !== 'undefined') {
  try {
    const originalFetch = window.fetch ? window.fetch.bind(window) : undefined;
    let currentFetch = originalFetch;
    if (originalFetch) {
      try {
        Object.defineProperty(window, 'fetch', {
          get() {
            return currentFetch;
          },
          set(newFetch) {
            if (typeof newFetch === 'function') {
              currentFetch = newFetch;
            }
          },
          configurable: true,
          enumerable: true,
        });
      } catch {
        // Ignore if environment prevents re-defining property
      }
    }
  } catch {
    // Ignore initialization errors
  }
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

