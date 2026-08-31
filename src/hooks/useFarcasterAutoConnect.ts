import { useEffect, useRef } from 'react';
import { useAccount, useConnect } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { baseSepolia } from '../lib/wagmi';

/**
 * Automatically connects the Farcaster in-app wallet ONLY when running
 * inside the Farcaster Mini App environment (Warpcast / Farcaster client).
 * Standard standalone web browsers remain purely manual.
 */
export function useFarcasterAutoConnect(isMiniApp: boolean) {
  const { isConnected, isConnecting } = useAccount();
  const { connectors, connectAsync } = useConnect();
  const attemptedRef = useRef(false);

  useEffect(() => {
    // Only proceed if strictly confirmed inside Farcaster Mini App and not already connected/connecting
    if (!isMiniApp || isConnected || isConnecting || attemptedRef.current) {
      return;
    }

    let isMounted = true;

    async function attemptAutoConnect() {
      try {
        const farcasterConnector = connectors.find(
          (c) =>
            c.id === 'farcaster' ||
            c.id === 'farcasterFrame' ||
            c.name?.toLowerCase().includes('farcaster')
        );

        if (!farcasterConnector) {
          return;
        }

        attemptedRef.current = true;
        await connectAsync({
          connector: farcasterConnector,
          chainId: baseSepolia.id,
        });
      } catch (err: any) {
        if (isMounted) {
          console.debug('Farcaster wallet auto-connect skipped:', err?.message);
        }
      }
    }

    if (connectors.length > 0) {
      attemptAutoConnect();
    }

    return () => {
      isMounted = false;
    };
  }, [isMiniApp, isConnected, isConnecting, connectors, connectAsync]);
}
