import sdk from '@farcaster/frame-sdk';

export interface FarcasterUserContext {
  fid?: number;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
}

export interface FarcasterState {
  isMiniApp: boolean;
  user?: FarcasterUserContext;
  isReady: boolean;
}

/**
 * Initialize Farcaster Mini App SDK safely in browser or iframe
 */
export async function initializeFarcaster(): Promise<FarcasterState> {
  if (typeof window === 'undefined') {
    return { isMiniApp: false, isReady: false };
  }

  try {
    const context = await sdk.context;
    if (context && context.user) {
      // Notify Warpcast the app is ready
      await sdk.actions.ready();
      return {
        isMiniApp: true,
        user: {
          fid: context.user.fid,
          username: context.user.username,
          displayName: context.user.displayName,
          pfpUrl: context.user.pfpUrl,
        },
        isReady: true,
      };
    }
  } catch {
    // Not running inside a Warpcast frame/miniapp environment
  }

  return { isMiniApp: false, isReady: true };
}

/**
 * Share a POAP to Warpcast with pre-filled cast text & embed
 */
export function sharePoapToFarcaster(poapName: string, eventId: bigint | number, url?: string) {
  const targetUrl = url || (typeof window !== 'undefined' ? `${window.location.origin}/mint/${eventId}` : `https://poaps.base.org/mint/${eventId}`);
  const text = `Just collected my onchain POAP for "${poapName}" on Base Sepolia! 🟣⚓️ Mint yours:`;
  const warpcastUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(targetUrl)}`;
  
  if (typeof window !== 'undefined') {
    try {
      if (sdk?.actions?.openUrl) {
        sdk.actions.openUrl(warpcastUrl);
        return;
      }
    } catch {
      // Fallback
    }
    window.open(warpcastUrl, '_blank', 'noopener,noreferrer');
  }
}
