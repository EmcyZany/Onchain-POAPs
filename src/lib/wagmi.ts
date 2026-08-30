import { http, createConfig } from 'wagmi';
import { defineChain } from 'viem';
import {
  connectorsForWallets,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
  rainbowWallet,
  walletConnectWallet,
  injectedWallet,
} from '@rainbow-me/rainbowkit/wallets';

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
 * Clean Choice Wallets list
 * ONLY metaMaskWallet (shimDisconnect: true), coinbaseWallet, rainbowWallet, walletConnectWallet, and injectedWallet (Browser Wallet fallback)
 */
export const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        rainbowWallet,
        walletConnectWallet,
        injectedWallet,
      ],
    },
  ],
  {
    appName: 'POAP Studio',
    appDescription: 'Create and collect onchain POAPs',
    appUrl: 'https://onchain-poaps-nu.vercel.app',
    appIcon: 'https://onchain-poaps-nu.vercel.app/icon.png',
    projectId: WALLET_CONNECT_PROJECT_ID,
  }
);

/**
 * Wagmi Config using RainbowKit getDefaultConfig
 */
export const config = getDefaultConfig({
  appName: 'POAP Studio',
  appDescription: 'Create and collect onchain POAPs',
  appUrl: 'https://onchain-poaps-nu.vercel.app',
  appIcon: 'https://onchain-poaps-nu.vercel.app/icon.png',
  projectId: WALLET_CONNECT_PROJECT_ID,
  chains: [baseSepolia],
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        metaMaskWallet,
        coinbaseWallet,
        rainbowWallet,
        walletConnectWallet,
        injectedWallet,
      ],
    },
  ],
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


