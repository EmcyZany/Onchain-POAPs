import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { BASE_SEPOLIA_EXPLORER, POAP_CONTRACT_ADDRESS } from '../types/contract';
import { shortenAddress } from '../lib/utils';
import { FarcasterUserContext } from '../lib/farcaster';
import { BrandLogo } from './BrandLogo';
import {
  Sparkles,
  PlusCircle,
  Award,
  BookOpen,
  KeyRound,
  Users,
  Compass,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  farcasterUser?: FarcasterUserContext;
  isMiniApp: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  farcasterUser,
  isMiniApp,
}) => {
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  const navLinks = [
    { id: 'explore', label: 'Explore', icon: Compass },
    { id: 'register', label: 'Create POAP', icon: PlusCircle },
    { id: 'gallery', label: 'My POAPs', icon: Award },
    { id: 'allowlist', label: 'Allowlist Studio', icon: Users },
    { id: 'signatures', label: 'Signatures & QR', icon: KeyRound },
    { id: 'docs', label: 'Docs', icon: BookOpen },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#262626] bg-[#050505]/75 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('explore')}
          className="flex items-center gap-3 cursor-pointer group"
          id="brand-logo"
        >
          <BrandLogo size="md" variant="horizontal" />
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider font-semibold bg-[#0052FF]/10 text-[#0052FF] border border-[#0052FF]/30">
            BASE SEPOLIA
          </span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                id={`nav-link-${link.id}`}
                onClick={() => setActiveTab(link.id)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#0052FF]/10 text-white border border-[#0052FF]/40 shadow-sm shadow-[#0052FF]/10'
                    : 'text-[#888888] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#0052FF]' : 'text-neutral-400'}`} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: RainbowKit ConnectButton & Farcaster */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Farcaster Mini App Badge */}
          {isMiniApp && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
              <div className="w-4 h-4 rounded bg-purple-600 flex items-center justify-center text-[9px] font-bold text-white">F</div>
              <span>{farcasterUser?.username ? `@${farcasterUser.username}` : 'Frame Active'}</span>
            </div>
          )}

          {/* RainbowKit ConnectButton - Modal choice with showBalance=false */}
          <div id="rainbowkit-connect-wrapper">
            <ConnectButton showBalance={false} />
          </div>

          {/* Mobile Menu Toggle */}
          <button
            id="mobile-nav-toggle"
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="lg:hidden p-2 rounded-lg bg-[#1A1A1A] border border-[#262626] text-neutral-300"
          >
            <ChevronDown className={`w-5 h-5 transition-transform ${isMobileNavOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {isMobileNavOpen && (
        <div className="lg:hidden border-t border-[#262626] bg-[#050505] px-4 py-3 space-y-1.5">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeTab === link.id;
            return (
              <button
                key={link.id}
                onClick={() => {
                  setActiveTab(link.id);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#0052FF]/10 text-white border border-[#0052FF]/40'
                    : 'text-[#888888] hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#0052FF]' : 'text-neutral-500'}`} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};

