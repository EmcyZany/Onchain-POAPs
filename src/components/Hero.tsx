import React from 'react';
import { Sparkles, PlusCircle, Compass, ShieldCheck, Copy, Check, ExternalLink } from 'lucide-react';
import { POAP_CONTRACT_ADDRESS, BASE_SEPOLIA_EXPLORER } from '../types/contract';
import { shortenAddress } from '../lib/utils';

interface HeroProps {
  totalEvents?: number;
  isLoading?: boolean;
  onNavigate?: (tab: string) => void;
  onExploreClick?: () => void;
  onCreateClick?: () => void;
}

export const Hero: React.FC<HeroProps> = ({
  totalEvents,
  isLoading = false,
  onNavigate,
  onExploreClick,
  onCreateClick,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopyContract = () => {
    navigator.clipboard.writeText(POAP_CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = () => {
    if (onCreateClick) onCreateClick();
    else if (onNavigate) onNavigate('register');
  };

  const handleExplore = () => {
    if (onExploreClick) onExploreClick();
    else if (onNavigate) onNavigate('explore');
  };

  return (
    <div className="relative overflow-hidden border-b border-[#262626] bg-gradient-to-b from-[#0e0e0e] via-[#050505] to-[#050505] py-12 md:py-16">
      {/* Background glow accents */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-[#0052FF]/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-1/3 right-10 w-[300px] h-[200px] bg-[#5EEAD4]/10 blur-[100px] pointer-events-none rounded-full" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0052FF]/10 border border-[#0052FF]/30 text-[#0052FF] text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Decentralized Proof of Attendance on Base</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Onchain POAPs & Verifiable Attendance
            </h1>

            <p className="text-base sm:text-lg text-[#888888] leading-relaxed">
              Mint, create, and distribute cryptographic attendance badges stored directly on Base Sepolia.
              Works natively inside Farcaster mini apps and across Web3 browsers.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                id="hero-create-btn"
                onClick={handleCreate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0052FF] hover:bg-blue-600 text-white font-semibold text-sm shadow-lg shadow-[#0052FF]/25 transition-all active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create New POAP</span>
              </button>

              <button
                id="hero-explore-btn"
                onClick={handleExplore}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#1A1A1A] border border-[#262626] hover:border-[#0052FF]/40 text-neutral-200 font-medium text-sm transition-all"
              >
                <Compass className="w-4 h-4 text-[#888888]" />
                <span>Explore Events</span>
              </button>

              <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#121212] border border-[#262626] text-xs font-mono text-[#888888]">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Contract:</span>
                <span className="text-neutral-300">{shortenAddress(POAP_CONTRACT_ADDRESS, 4)}</span>
                <button
                  onClick={handleCopyContract}
                  className="p-1 hover:text-white transition-colors"
                  title="Copy contract address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={`${BASE_SEPOLIA_EXPLORER}/address/${POAP_CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 hover:text-white transition-colors"
                  title="View on BaseScan"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
            <div className="p-4 rounded-xl glass hover:border-[#0052FF]/40 transition-colors">
              <p className="text-[11px] text-[#888888] font-semibold uppercase tracking-wider">Registered POAPs</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">
                {isLoading && totalEvents === undefined ? (
                  <span className="inline-block animate-pulse text-neutral-400">...</span>
                ) : (
                  totalEvents ?? 0
                )}
              </p>
              <p className="text-[11px] text-[#0052FF] font-medium mt-1">Live on Base Sepolia</p>
            </div>

            <div className="p-4 rounded-xl glass hover:border-[#0052FF]/40 transition-colors">
              <p className="text-[11px] text-[#888888] font-semibold uppercase tracking-wider">Standard</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">ERC-1155</p>
              <p className="text-[11px] text-emerald-400 font-medium mt-1">Soulbound / Dynamic</p>
            </div>

            <div className="p-4 rounded-xl glass hover:border-[#0052FF]/40 transition-colors">
              <p className="text-[11px] text-[#888888] font-semibold uppercase tracking-wider">Mint Methods</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">3 Types</p>
              <p className="text-[11px] text-purple-400 font-medium mt-1">Public, Merkle & Sig</p>
            </div>

            <div className="p-4 rounded-xl glass hover:border-[#0052FF]/40 transition-colors">
              <p className="text-[11px] text-[#888888] font-semibold uppercase tracking-wider">Mini App</p>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-1 font-mono">vNext</p>
              <p className="text-[11px] text-purple-400 font-medium mt-1">Farcaster Ready</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

