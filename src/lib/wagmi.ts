import { http } from 'wagmi';
import { defineChain } from 'viem';
import {
  connectorsForWallets,
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

/**
 * Exact Base Sepolia Chain Configuration
 * Uses ONLY the official Base Sepolia HTTPS RPC: https://sepolia.base.org
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
      http: ['https://sepolia.base.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org',
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
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
  ssr: true,
});

export const wagmiConfig = config;

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}


