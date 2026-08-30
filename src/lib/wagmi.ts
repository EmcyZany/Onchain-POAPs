import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    injected({
      target() {
        return {
          id: 'injected',
          name: 'Browser Wallet',
          provider: typeof window !== 'undefined' ? (window as any).ethereum : undefined,
        };
      },
    }),
  ],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [base.id]: http('https://mainnet.base.org'),
  },
});

export const wagmiConfig = config;

declare module 'wagmi' {
  interface Register {
    config: typeof config;
  }
}
