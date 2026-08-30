import React, { useState } from 'react';
import { POAPEvent, BASE_SEPOLIA_EXPLORER, OPENSEA_TESTNET_BASE, POAP_CONTRACT_ADDRESS } from '../types/contract';
import { formatDate, formatDateTime, shortenAddress } from '../lib/utils';
import { sharePoapToFarcaster } from '../lib/farcaster';
import { useCountdown } from '../hooks/useCountdown';
import { usePOAPContract } from '../hooks/usePOAPContract';
import { POAP_BADGE_TEMPLATES } from '../lib/svgOptimizer';
import {
  X,
  Calendar,
  MapPin,
  Lock,
  Globe,
  Users,
  KeyRound,
  ExternalLink,
  Share2,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

interface POAPDetailModalProps {
  event: POAPEvent;
  userAddress?: string;
  creatorTimelock: bigint;
  onClose: () => void;
  onMintClick: (event: POAPEvent) => void;
  onAllowlistClick: (event: POAPEvent) => void;
  onSignatureClick: (event: POAPEvent) => void;
}

export const POAPDetailModal: React.FC<POAPDetailModalProps> = ({
  event,
  userAddress,
  creatorTimelock,
  onClose,
  onMintClick,
  onAllowlistClick,
  onSignatureClick,
}) => {
  const isCreator =
    userAddress &&
    event.creator &&
    userAddress.toLowerCase() === event.creator.toLowerCase();

  const countdown = useCountdown(event.createdAt, creatorTimelock);
  const { updateEventPublic, isWritePending, isTxConfirming } = usePOAPContract();

  const [togglingPublic, setTogglingPublic] = useState(false);

  const artworkSrc = React.useMemo(() => {
    if (event.rawSvg && event.rawSvg.startsWith('data:')) {
      return event.rawSvg;
    }
    const templateIndex = Number(event.id || 1n) % POAP_BADGE_TEMPLATES.length;
    const template = POAP_BADGE_TEMPLATES[templateIndex] || POAP_BADGE_TEMPLATES[0];
    const dateStr = formatDate(event.eventDate || event.createdAt);
    const svgStr = template.generateSvg(event.name, dateStr, '#0052FF');
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
  }, [event]);

  const handleTogglePublic = async () => {
    try {
      setTogglingPublic(true);
      await updateEventPublic(event.id, !event.isPublic);
    } catch (err) {
      console.error('Toggle public error:', err);
    } finally {
      setTogglingPublic(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl glass border-[#262626] p-6 sm:p-8 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-[#1A1A1A] hover:bg-[#262626] text-[#888888] hover:text-white transition-colors border border-[#262626]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full bg-black/40 border border-[#262626] p-2 flex items-center justify-center shrink-0 shadow-lg">
            <img src={artworkSrc} alt={event.name} className="w-full h-full object-contain drop-shadow-xl" />
          </div>

          <div className="space-y-2 text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#1A1A1A] border border-[#262626] text-neutral-300 font-mono text-xs font-semibold">
                POAP #{event.id.toString()}
              </span>

              {event.isSoulbound ? (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
                  <Lock className="w-3 h-3" />
                  <span>Soulbound</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
                  Transferable
                </span>
              )}

              {event.hasClaimed && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#0052FF]/20 text-blue-300 text-xs font-semibold border border-[#0052FF]/40">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Collected</span>
                </span>
              )}
            </div>

            <h2 className="text-2xl font-extrabold text-white">{event.name}</h2>
            <p className="text-xs text-[#888888] line-clamp-3">
              {event.description || 'Verified attendance badge on Base Sepolia.'}
            </p>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
            <span className="text-[#888888] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0052FF]" />
              <span>Event Date:</span>
            </span>
            <p className="font-semibold text-white">{formatDate(event.eventDate || event.createdAt)}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
            <span className="text-[#888888] flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0052FF]" />
              <span>Location:</span>
            </span>
            <p className="font-semibold text-white truncate">{event.location || 'Online / Metaverse'}</p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
            <span className="text-[#888888] flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Creator Address:</span>
            </span>
            <a
              href={`${BASE_SEPOLIA_EXPLORER}/address/${event.creator}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[#0052FF] hover:underline block truncate"
            >
              {event.creator}
            </a>
          </div>

          <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
            <span className="text-[#888888] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Timelock Remaining:</span>
            </span>
            <p className="font-mono font-semibold text-white">{countdown.formatted}</p>
          </div>
        </div>

        {/* Creator Control Panel if connected */}
        {isCreator && (
          <div className="p-4 rounded-2xl bg-[#0052FF]/10 border border-[#0052FF]/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-white">
                <Sparkles className="w-4 h-4 text-[#0052FF]" />
                <span>Creator Controls</span>
              </div>
              <span className="text-[11px] text-blue-300 font-mono">You created this event</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleTogglePublic}
                disabled={isWritePending || isTxConfirming || countdown.isExpired}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  event.isPublic
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30'
                }`}
              >
                {event.isPublic ? 'Disable Public Mint' : 'Enable Public Mint'}
              </button>

              <button
                onClick={() => {
                  onClose();
                  onAllowlistClick(event);
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs font-bold border border-purple-500/30 transition-colors"
              >
                Manage Allowlist
              </button>

              <button
                onClick={() => {
                  onClose();
                  onSignatureClick(event);
                }}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors"
              >
                Generate Signatures & QR
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 border-t border-[#262626] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <a
              href={`${OPENSEA_TESTNET_BASE}/${POAP_CONTRACT_ADDRESS}/${event.id.toString()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-neutral-200 text-xs font-semibold transition-colors border border-[#262626]"
            >
              <span>OpenSea</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <a
              href={`${BASE_SEPOLIA_EXPLORER}/address/${POAP_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-neutral-200 text-xs font-semibold transition-colors border border-[#262626]"
            >
              <span>BaseScan</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              onClick={() => sharePoapToFarcaster(event.name, event.id)}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Warpcast</span>
            </button>
          </div>

          <button
            onClick={() => {
              onClose();
              onMintClick(event);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0052FF] hover:bg-blue-600 text-white font-bold text-xs shadow-lg shadow-[#0052FF]/20 transition-all"
          >
            <span>{event.hasClaimed ? 'Claim / Mint Page' : 'Claim POAP'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
