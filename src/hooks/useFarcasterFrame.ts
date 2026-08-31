import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { FarcasterState, initializeFarcaster } from '../lib/farcaster';

export function useFarcasterFrame() {
  const [farcasterState, setFarcasterState] = useState<FarcasterState>({
    isMiniApp: false,
    isReady: false,
  });

  useEffect(() => {
    let isMounted = true;

    // Immediately notify Farcaster client to dismiss splash screen
    sdk.actions.ready().catch(() => {});

    initializeFarcaster().then((state) => {
      if (isMounted) {
        setFarcasterState(state);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return farcasterState;
}

