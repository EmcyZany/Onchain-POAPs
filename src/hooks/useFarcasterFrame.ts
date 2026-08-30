import { useEffect, useState } from 'react';
import { FarcasterState, initializeFarcaster } from '../lib/farcaster';

export function useFarcasterFrame() {
  const [farcasterState, setFarcasterState] = useState<FarcasterState>({
    isMiniApp: false,
    isReady: false,
  });

  useEffect(() => {
    let isMounted = true;
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
