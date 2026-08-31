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
      // Notify Farcaster client the app is ready
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
    // Not running inside a Farcaster frame/miniapp environment
  }

  return { isMiniApp: false, isReady: true };
}

export const FARCASTER_MINIAPP_URL = 'https://farcaster.xyz/miniapps/2IRa5QcXgO6R/onchain-poaps';

/**
 * Share a POAP to Farcaster with pre-filled cast text & embed
 */
export function sharePoapToFarcaster(poapName: string, _eventId?: bigint | number, url?: string) {
  const targetUrl = url || FARCASTER_MINIAPP_URL;
  const text = `Just collected my onchain POAP for "${poapName}" on Base Sepolia! 🟣⚓️ Mint yours: ${FARCASTER_MINIAPP_URL}`;
  const farcasterShareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(targetUrl)}`;
  
  if (typeof window !== 'undefined') {
    try {
      if (sdk?.actions?.openUrl) {
        sdk.actions.openUrl(farcasterShareUrl);
        return;
      }
    } catch {
      // Fallback
    }
    window.open(farcasterShareUrl, '_blank', 'noopener,noreferrer');
  }
}
