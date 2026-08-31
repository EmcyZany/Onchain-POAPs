import { sdk } from '@farcaster/miniapp-sdk';

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
    // Check if running inside actual Farcaster Mini App with short timeout
    const isMiniAppCheck = await Promise.race([
      sdk.isInMiniApp(),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 600)),
    ]).catch(() => false);

    if (!isMiniAppCheck) {
      return { isMiniApp: false, isReady: true };
    }

    const context = await Promise.race([
      sdk.context,
      new Promise<any>((resolve) => setTimeout(() => resolve(null), 600)),
    ]).catch(() => null);

    // Notify Farcaster client to hide the splash screen
    await sdk.actions.ready().catch(() => {});

    if (context && context.user && context.user.fid) {
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

    return {
      isMiniApp: !!context,
      isReady: true,
    };
  } catch (err) {
    console.debug('Farcaster Mini App SDK init notice:', err);
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

