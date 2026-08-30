import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useSwitchChain } from 'wagmi';
import { useUserPOAPs, UserPOAPItem } from '../hooks/useUserPOAPs';
import { POAPEvent, BASE_SEPOLIA_CHAIN_ID, BASE_SEPOLIA_EXPLORER, OPENSEA_TESTNET_BASE, POAP_CONTRACT_ADDRESS, ONCHAIN_POAPS_ABI } from '../types/contract';
import { formatDate, shortenAddress } from '../lib/utils';
import { POAP_BADGE_TEMPLATES } from '../lib/svgOptimizer';
import { sharePoapToFarcaster } from '../lib/farcaster';
import { isAddress, getAddress } from 'viem';
import {
  Award,
  Lock,
  ExternalLink,
  Share2,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Compass,
} from 'lucide-react';

interface GalleryViewProps {
  onNavigateToExplore: () => void;
  onSelectPoap: (event: POAPEvent) => void;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  onNavigateToExplore,
  onSelectPoap,
}) => {
  const { address, isConnected } = useAccount();
  const { userPOAPs, isLoading, refetchUserPOAPs } = useUserPOAPs();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const [filter, setFilter] = useState<'all' | 'soulbound' | 'transferable'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Transfer modal state (for transferable POAPs)
  const [transferTarget, setTransferTarget] = useState<UserPOAPItem | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);

  const { writeContractAsync, isPending: isTransferPending } = useWriteContract();
  const [transferTxHash, setTransferTxHash] = useState<`0x${string}` | undefined>();

  const { isLoading: isTransferConfirming, isSuccess: isTransferSuccess } = useWaitForTransactionReceipt({
    hash: transferTxHash,
  });

  const filteredItems = React.useMemo(() => {
    return userPOAPs.filter((item) => {
      if (filter === 'soulbound' && !item.event.isSoulbound) return false;
      if (filter === 'transferable' && item.event.isSoulbound) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.event.name.toLowerCase().includes(q) ||
          (item.event.location && item.event.location.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [userPOAPs, filter, searchQuery]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError(null);

    if (!transferTarget || !address) return;

    if (transferTarget.event.isSoulbound) {
      setTransferError('This POAP is Soulbound and non-transferable.');
      return;
    }

    if (!isAddress(recipientAddress.trim())) {
      setTransferError('Please enter a valid Ethereum recipient address.');
      return;
    }

    try {
      if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
        await switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID });
      }

      const cleanRecipient = getAddress(recipientAddress.trim());
      const hash = await (writeContractAsync as any)({
        address: POAP_CONTRACT_ADDRESS,
        abi: ONCHAIN_POAPS_ABI,
        functionName: 'safeTransferFrom',
        args: [address, cleanRecipient, transferTarget.event.id, 1n, '0x'],
      });

      setTransferTxHash(hash);
      setTimeout(() => {
        refetchUserPOAPs();
      }, 3000);
    } catch (err: any) {
      console.error('Transfer error:', err);
      setTransferError(err?.message || 'Transfer failed.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0052FF]/10 border border-[#0052FF]/30 text-[#0052FF] text-xs font-semibold mb-2">
            <Award className="w-3.5 h-3.5" />
            <span>Personal Collection</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">My Onchain POAPs</h2>
          <p className="text-xs sm:text-sm text-[#888888] mt-1">
            Verified attendance badges owned by your connected wallet on Base Sepolia.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search my POAPs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#121212] border border-[#262626] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#0052FF] transition-colors"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121212] border border-[#262626] text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === 'all' ? 'bg-[#0052FF] text-white' : 'text-[#888888] hover:text-white'
              }`}
            >
              All ({userPOAPs.length})
            </button>
            <button
              onClick={() => setFilter('soulbound')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === 'soulbound' ? 'bg-[#0052FF] text-white' : 'text-[#888888] hover:text-white'
              }`}
            >
              Soulbound
            </button>
            <button
              onClick={() => setFilter('transferable')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                filter === 'transferable' ? 'bg-[#0052FF] text-white' : 'text-[#888888] hover:text-white'
              }`}
            >
              Transferable
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-8 h-8 text-[#0052FF] animate-spin" />
          <p className="text-sm text-[#888888] font-medium">Scanning Base Sepolia balances...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredItems.length === 0 && (
        <div className="py-16 px-4 rounded-3xl glass text-center max-w-lg mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#0052FF]/10 border border-[#0052FF]/20 flex items-center justify-center mx-auto text-[#0052FF]">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">No POAPs Collected Yet</h3>
            <p className="text-xs text-[#888888] leading-relaxed">
              {!isConnected
                ? 'Connect your wallet to inspect your attendance tokens and verified credentials.'
                : 'Explore available events to claim your first onchain POAP badge on Base Sepolia!'}
            </p>
          </div>
          <button
            onClick={onNavigateToExplore}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0052FF] hover:bg-blue-600 text-white text-xs font-bold shadow-lg shadow-[#0052FF]/20 transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>Explore Live Events</span>
          </button>
        </div>
      )}

      {/* Grid of User POAPs */}
      {!isLoading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map(({ event, balance }) => {
            const templateIndex = Number(event.id || 1n) % POAP_BADGE_TEMPLATES.length;
            const template = POAP_BADGE_TEMPLATES[templateIndex] || POAP_BADGE_TEMPLATES[0];
            const dateStr = formatDate(event.eventDate || event.createdAt);
            const artworkSrc =
              event.rawSvg && event.rawSvg.startsWith('data:')
                ? event.rawSvg
                : `data:image/svg+xml;utf8,${encodeURIComponent(
                    template.generateSvg(event.name, dateStr, '#0052FF')
                  )}`;

            return (
              <div
                key={event.id.toString()}
                id={`gallery-poap-${event.id.toString()}`}
                className="group flex flex-col justify-between rounded-2xl glass p-5 transition-all duration-300 hover:border-[#0052FF]/40 hover:shadow-2xl hover:shadow-[#0052FF]/10"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2 py-0.5 rounded-full bg-[#1A1A1A] border border-[#262626] text-neutral-300 font-mono text-[11px] font-semibold">
                      #{event.id.toString()}
                    </span>

                    {event.isSoulbound ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-medium">
                        <Lock className="w-3 h-3" />
                        <span>Soulbound</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
                        Balance: {balance.toString()}
                      </span>
                    )}
                  </div>

                  {/* Emblem */}
                  <div
                    onClick={() => onSelectPoap(event)}
                    className="w-full aspect-square max-w-[170px] mx-auto my-2 rounded-full overflow-hidden p-2 flex items-center justify-center cursor-pointer group-hover:scale-105 transition-transform bg-black/40 border border-[#262626]"
                  >
                    <img
                      src={artworkSrc}
                      alt={event.name}
                      className="w-full h-full object-contain drop-shadow-xl"
                    />
                  </div>

                  <h3
                    onClick={() => onSelectPoap(event)}
                    className="font-bold text-base text-white mt-2 group-hover:text-[#0052FF] transition-colors line-clamp-1 cursor-pointer"
                  >
                    {event.name}
                  </h3>

                  <p className="text-xs text-[#888888] line-clamp-2 mt-1 min-h-[32px]">
                    {event.description || 'Verified attendance on Base.'}
                  </p>

                  <div className="pt-2 border-t border-[#262626] text-[11px] text-[#888888] flex items-center justify-between">
                    <span>{formatDate(event.eventDate || event.createdAt)}</span>
                    <span className="font-mono">Creator: {shortenAddress(event.creator, 3)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-[#262626] flex items-center gap-2">
                  <a
                    href={`${OPENSEA_TESTNET_BASE}/${POAP_CONTRACT_ADDRESS}/${event.id.toString()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-neutral-200 text-xs font-semibold transition-colors border border-[#262626]"
                  >
                    <span>OpenSea</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {!event.isSoulbound && (
                    <button
                      onClick={() => setTransferTarget({ event, balance })}
                      className="p-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-neutral-300 transition-colors border border-[#262626]"
                      title="Transfer POAP"
                    >
                      <Send className="w-3.5 h-3.5 text-emerald-400" />
                    </button>
                  )}

                  <button
                    onClick={() => sharePoapToFarcaster(event.name, event.id)}
                    className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 transition-colors"
                    title="Share to Warpcast"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transfer Modal for Transferable POAPs */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl glass border-[#262626] p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Transfer POAP #{transferTarget.event.id.toString()}</span>
              </h3>
              <button
                onClick={() => {
                  setTransferTarget(null);
                  setTransferError(null);
                  setTransferTxHash(undefined);
                }}
                className="text-[#888888] hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-[#888888]">
              Send your transferable <strong className="text-white">{transferTarget.event.name}</strong> POAP to another Ethereum address via ERC-1155 <code className="text-emerald-400">safeTransferFrom</code>.
            </p>

            <form onSubmit={handleTransfer} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400">Recipient Address</label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="input-field font-mono text-xs"
                />
              </div>

              {transferError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{transferError}</span>
                </div>
              )}

              {isTransferSuccess && transferTxHash && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>POAP Transferred Successfully!</span>
                  </p>
                  <a
                    href={`${BASE_SEPOLIA_EXPLORER}/tx/${transferTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 underline block"
                  >
                    View on BaseScan
                  </a>
                </div>
              )}

              <button
                type="submit"
                disabled={isTransferPending || isTransferConfirming || !recipientAddress.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isTransferPending || isTransferConfirming ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Confirming Transfer...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send POAP</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
