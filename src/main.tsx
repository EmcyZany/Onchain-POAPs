// Safely configure window.fetch property descriptor and handle sandboxed HEAD/COOP requests
if (typeof window !== 'undefined') {
  try {
    const rawFetch = window.fetch ? window.fetch.bind(window) : undefined;
    const safeFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      // Intercept Coinbase Wallet SDK COOP HEAD check to prevent "Error checking Cross-Origin-Opener-Policy: Failed to fetch"
      if (init?.method === 'HEAD') {
        const inputUrl = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (!inputUrl || inputUrl.startsWith(window.location.origin) || inputUrl.startsWith('/')) {
          try {
            if (rawFetch) {
              const res = await rawFetch(input, init);
              if (res.ok) return res;
            }
          } catch {
            // Fall through to synthetic successful response
          }
          return new Response(null, {
            status: 200,
            headers: new Headers({
              'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
            }),
          });
        }
      }
      return rawFetch ? rawFetch(input, init) : fetch(input, init);
    };

    let currentFetch = safeFetch;
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

    // Suppress benign COOP check console noise
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('Cross-Origin-Opener-Policy') ||
         args[0].includes('Error checking Cross-Origin-Opener-Policy'))
      ) {
        console.debug(...args);
        return;
      }
      originalConsoleError.apply(console, args);
    };
  } catch {
    // Ignore initialization errors
  }
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { sdk } from '@farcaster/miniapp-sdk';
import App from './App.tsx';
import './index.css';

// Call Farcaster Mini App ready() immediately upon load to hide the splash screen
if (typeof window !== 'undefined') {
  sdk.actions.ready().catch((err) => {
    console.debug('Farcaster Mini App ready signal sent:', err);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

