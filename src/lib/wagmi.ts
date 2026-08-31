import { http } from 'wagmi';
import { defineChain, fallback } from 'viem';
import {
  getDefaultConfig,
  Wallet,
} from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
  rainbowWallet,
  walletConnectWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';

// Ensure Coinbase wallet doesn't trigger popup COOP cross-origin errors in iframes/mini-apps
try {
  coinbaseWallet.preference = 'eoaOnly';
} catch {
  // Ignore
}

/**
 * Robust Base Sepolia Chain Configuration with Multicall3
 */
export const baseSepolia = defineChain({
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        'https://base-sepolia-rpc.publicnode.com',
        'https://sepolia.base.org',
        'https://1rpc.io/base-sepolia',
        'https://base-sepolia.blockpi.network/v1/rpc/public',
      ],
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
    },
  },
  testnet: true,
});

export const WALLET_CONNECT_PROJECT_ID =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) ||
  '043441a0cbd89a4290740967db440476';

/**
 * Dedicated Farcaster In-App Mini App Wallet Connector
 */
export const farcasterWallet = (): Wallet => ({
  id: 'farcaster',
  name: 'Farcaster Wallet',
  iconUrl: async () => 'https://onchain-poaps-nu.vercel.app/icon.png',
  iconBackground: '#855DCD',
  createConnector: () => farcasterMiniApp(),
});

/**
 * Choice Wallets list: Standard web options + Farcaster in-app wallet
 */
export const walletGroups = [
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet,
      coinbaseWallet,
      rainbowWallet,
      walletConnectWallet,
      injectedWallet,
      farcasterWallet,
    ],
  },
];

/**
 * Resilient multi-RPC Transport with batching
 */
export const baseSepoliaTransport = fallback([
  http('https://base-sepolia-rpc.publicnode.com', { batch: { batchSize: 1024, wait: 16 } }),
  http('https://sepolia.base.org', { batch: { batchSize: 1024, wait: 16 } }),
  http('https://1rpc.io/base-sepolia', { batch: { batchSize: 1024, wait: 16 } }),
  http('https://base-sepolia.blockpi.network/v1/rpc/public', { batch: { batchSize: 1024, wait: 16 } }),
]);

/**
 * RainbowKit & Wagmi Configuration
 */
export const config = getDefaultConfig({
  appName: 'Onchain POAPs',
  appDescription: 'Create and collect onchain POAPs on Base Sepolia',
  appUrl: 'https://onchain-poaps-nu.vercel.app',
  appIcon: 'https://onchain-poaps-nu.vercel.app/icon.png',
  projectId: WALLET_CONNECT_PROJECT_ID,
  chains: [baseSepolia],
  wallets: walletGroups,
  transports: {
    [baseSepolia.id]: baseSepoliaTransport,
  },
  ssr: true,
});

export const wagmiConfig = config;

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}



