import React from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { BASE_SEPOLIA_CHAIN_ID, BASE_SEPOLIA_EXPLORER, POAP_CONTRACT_ADDRESS } from '../types/contract';
import { shortenAddress } from '../lib/utils';
import { FarcasterUserContext } from '../lib/farcaster';
import {
  Sparkles,
  Wallet,
  PlusCircle,
  Award,
  BookOpen,
  KeyRound,
  Users,
  Compass,
  ExternalLink,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Zap,
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
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [isWalletMenuOpen, setIsWalletMenuOpen] = React.useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  const isCorrectNetwork = chainId === BASE_SEPOLIA_CHAIN_ID;

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
          <div className="w-8 h-8 bg-[#0052FF] rounded-full flex items-center justify-center font-bold text-sm text-white shadow-lg shadow-[#0052FF]/30 group-hover:scale-105 transition-transform">
            OP
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">Onchain POAPs</span>
              <span className="text-[#0052FF] text-xs font-mono tracking-wider font-semibold">
                [BASE SEPOLIA]
              </span>
            </div>
            <p className="text-[11px] text-[#888888] font-mono hidden sm:block">
              {shortenAddress(POAP_CONTRACT_ADDRESS, 3)}
            </p>
          </div>
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

        {/* Right Section: Network & Wallet & Farcaster */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Farcaster Mini App Badge */}
          {isMiniApp && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
              <div className="w-4 h-4 rounded bg-purple-600 flex items-center justify-center text-[9px] font-bold text-white">F</div>
              <span>{farcasterUser?.username ? `@${farcasterUser.username}` : 'Frame Active'}</span>
            </div>
          )}

          {/* Network Switcher Alert if not Base Sepolia */}
          {isConnected && !isCorrectNetwork && (
            <button
              id="switch-network-btn"
              onClick={() => switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID })}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-colors animate-bounce"
            >
              Switch to Base Sepolia
            </button>
          )}

          {/* Base Sepolia Pill (when connected and correct) */}
          {isConnected && isCorrectNetwork && (
            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full border border-emerald-400/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Connected</span>
            </div>
          )}

          {/* Wallet Connect/Disconnect */}
          {!isConnected ? (
            <button
              id="connect-wallet-btn"
              onClick={() => connect({ connector: connectors[0] })}
              disabled={isPending}
              className="flex items-center gap-2 bg-[#0052FF] hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-[#0052FF]/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Wallet className="w-4 h-4" />
              <span>{isPending ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          ) : (
            <div className="relative">
              <button
                id="wallet-user-menu-btn"
                onClick={() => setIsWalletMenuOpen(!isWalletMenuOpen)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1A1A1A] border border-[#262626] hover:border-[#0052FF]/50 text-sm font-mono text-white transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-[#0052FF]" />
                <span>{shortenAddress(address)}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#888888]" />
              </button>

              {isWalletMenuOpen && (
                <div
                  id="wallet-dropdown-menu"
                  className="absolute right-0 mt-2 w-64 rounded-xl bg-[#121212] border border-[#262626] shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2"
                >
                  <div className="p-2 border-b border-[#262626] mb-1">
                    <p className="text-xs text-[#888888] font-sans">Connected Address</p>
                    <p className="text-xs font-mono text-white truncate">{address}</p>
                  </div>

                  <a
                    href={`${BASE_SEPOLIA_EXPLORER}/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-white/[0.04] transition-colors"
                  >
                    <span>View on BaseScan</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#888888]" />
                  </a>

                  <a
                    href={`${BASE_SEPOLIA_EXPLORER}/address/${POAP_CONTRACT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-neutral-300 hover:bg-white/[0.04] transition-colors"
                  >
                    <span>POAP Contract Code</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-[#888888]" />
                  </a>

                  <button
                    onClick={() => {
                      disconnect();
                      setIsWalletMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 mt-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <span>Disconnect</span>
                    <LogOut className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              )}
            </div>
          )}

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
