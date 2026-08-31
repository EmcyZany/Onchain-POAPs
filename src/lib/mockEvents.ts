import { POAPEvent } from '../types/contract';
import { POAP_BADGE_TEMPLATES } from './svgOptimizer';

export const SAMPLE_FALLBACK_EVENTS: POAPEvent[] = [
  {
    id: 1n,
    name: 'Base Builder Summit 2026',
    description: 'Official proof of attendance for the global Base ecosystem builder gathering in San Francisco & onchain Farcaster livestream.',
    eventDate: BigInt(Math.floor(Date.now() / 1000) - 86400 * 2),
    location: 'San Francisco, CA & Base Sepolia',
    allowlistRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
    svgImage: '0x0000000000000000000000000000000000000000',
    creator: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400 * 5),
    externalUrl: 'https://base.org',
    isSoulbound: true,
    isPublic: true,
    totalSupply: 142n,
    rawSvg: `data:image/svg+xml;utf8,${encodeURIComponent(
      POAP_BADGE_TEMPLATES[0].generateSvg('Base Builder Summit', '2026 Base Sepolia', '#0052FF')
    )}`,
  },
  {
    id: 2n,
    name: 'ETHDenver 2026 Hacker Pass',
    description: 'Awarded to developers hacking on verifiable credentials and decentralized protocols in the BUIDLathon.',
    eventDate: BigInt(Math.floor(Date.now() / 1000) - 86400 * 1),
    location: 'Denver, Colorado',
    allowlistRoot: '0x4d5b2496a782e443fe06bb505e6b72a420b987fa541d40ce213980753065a26a',
    svgImage: '0x0000000000000000000000000000000000000000',
    creator: '0xC3249356a483fbe17d5355D39105D2eA666d9de6',
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 86400 * 3),
    externalUrl: 'https://ethdenver.com',
    isSoulbound: true,
    isPublic: false,
    totalSupply: 89n,
    rawSvg: `data:image/svg+xml;utf8,${encodeURIComponent(
      POAP_BADGE_TEMPLATES[1].generateSvg('ETHDenver BUIDL', 'VERIFIED ONCHAIN', '#EC4899')
    )}`,
  },
  {
    id: 3n,
    name: 'Farcaster Mini App Pioneer',
    description: 'Commemorating early builders testing frames and interactive client-side miniapps on Base.',
    eventDate: BigInt(Math.floor(Date.now() / 1000)),
    location: 'Farcaster & Global Network',
    allowlistRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
    svgImage: '0x0000000000000000000000000000000000000000',
    creator: '0x1234567890123456789012345678901234567890',
    createdAt: BigInt(Math.floor(Date.now() / 1000) - 3600 * 12),
    externalUrl: 'https://farcaster.xyz',
    isSoulbound: false,
    isPublic: true,
    totalSupply: 531n,
    rawSvg: `data:image/svg+xml;utf8,${encodeURIComponent(
      POAP_BADGE_TEMPLATES[2].generateSvg('Mini App Pioneer', 'FARCASTER 2026', '#EAB308')
    )}`,
  },
];
