import React from 'react';
import { POAPEvent } from '../types/contract';
import { formatDate, shortenAddress } from '../lib/utils';
import { sharePoapToFarcaster } from '../lib/farcaster';
import {
  Calendar,
  MapPin,
  Lock,
  Globe,
  CheckCircle2,
  Share2,
  ArrowRight,
  Settings,
  Sparkles,
} from 'lucide-react';
import { POAP_BADGE_TEMPLATES } from '../lib/svgOptimizer';

interface POAPCardProps {
  event: POAPEvent;
  userAddress?: string;
  onMintClick: (event: POAPEvent) => void;
  onManageClick: (event: POAPEvent) => void;
  onDetailClick: (event: POAPEvent) => void;
}

export const POAPCard: React.FC<POAPCardProps> = ({
  event,
  userAddress,
  onMintClick,
  onManageClick,
  onDetailClick,
}) => {
  const isCreator =
    userAddress &&
    event.creator &&
    userAddress.toLowerCase() === event.creator.toLowerCase();

  // Determine Artwork URL or generated fallback
  const artworkSrc = React.useMemo(() => {
    if (event.rawSvg && event.rawSvg.startsWith('data:')) {
      return event.rawSvg;
    }
    // Fallback based on event ID or name
    const templateIndex = Number(event.id || 1n) % POAP_BADGE_TEMPLATES.length;
    const template = POAP_BADGE_TEMPLATES[templateIndex] || POAP_BADGE_TEMPLATES[0];
    const dateStr = formatDate(event.eventDate || event.createdAt);
    const svgStr = template.generateSvg(event.name, dateStr, '#0052FF');
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
  }, [event]);

  const hasAllowlist =
    event.allowlistRoot &&
    event.allowlistRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000';

  return (
    <div
      id={`poap-card-${event.id.toString()}`}
      className="group relative flex flex-col justify-between rounded-2xl glass p-5 transition-all duration-300 hover:border-[#0052FF]/50 hover:shadow-xl hover:shadow-[#0052FF]/10"
    >
      {/* Top badges bar */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-1.5">
          <span className="px-2.5 py-0.5 rounded-full bg-[#1A1A1A] border border-[#262626] text-neutral-300 font-mono text-xs font-semibold">
            #{event.id.toString()}
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
        </div>

        {/* Claimed badge */}
        {event.hasClaimed ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0052FF]/20 border border-[#0052FF]/40 text-[#0052FF] text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Collected</span>
          </span>
        ) : event.isPublic ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/30">
            <Globe className="w-3 h-3" />
            <span>Public Mint</span>
          </span>
        ) : hasAllowlist ? (
          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-xs font-medium border border-purple-500/30">
            Allowlist
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-full bg-[#1A1A1A] border border-[#262626] text-[#888888] text-xs font-medium">
            Signature
          </span>
        )}
      </div>

      {/* POAP Artwork Emblem */}
      <div
        onClick={() => onDetailClick(event)}
        className="relative w-full aspect-square max-w-[190px] mx-auto my-2 rounded-full p-2 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 cursor-pointer"
      >
        <div className="w-full h-full rounded-full bg-black/60 border-2 border-[#262626] group-hover:border-[#0052FF]/60 flex items-center justify-center p-3 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0052FF]/10 to-transparent pointer-events-none" />
          <img
            src={artworkSrc}
            alt={event.name}
            className="w-full h-full object-contain drop-shadow-xl z-10"
          />
        </div>
      </div>

      {/* Content details */}
      <div className="space-y-2 mt-3">
        <h3
          onClick={() => onDetailClick(event)}
          className="font-bold text-base text-white group-hover:text-[#0052FF] transition-colors line-clamp-1 cursor-pointer"
        >
          {event.name}
        </h3>

        <p className="text-xs text-[#888888] line-clamp-2 min-h-[32px]">
          {event.description || 'Verified attendance badge for event participants.'}
        </p>

        <div className="pt-2 border-t border-[#262626] space-y-1.5 text-xs text-[#888888]">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#888888]" />
              <span>{formatDate(event.eventDate || event.createdAt)}</span>
            </span>
            <span className="font-mono text-zinc-400 text-[11px]">
              Creator: {shortenAddress(event.creator, 3)}
            </span>
          </div>

          {event.location && (
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#888888] shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-[#262626] flex items-center gap-2">
        <button
          id={`mint-poap-btn-${event.id.toString()}`}
          onClick={() => onMintClick(event)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#0052FF] hover:bg-blue-600 text-white text-xs font-semibold transition-all shadow-md shadow-[#0052FF]/20 active:scale-95"
        >
          <span>{event.hasClaimed ? 'Mint Again / View' : 'Mint POAP'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>

        {isCreator && (
          <button
            id={`manage-poap-btn-${event.id.toString()}`}
            onClick={() => onManageClick(event)}
            className="p-2 rounded-lg bg-[#1A1A1A] hover:bg-neutral-800 border border-[#262626] text-neutral-300 transition-colors"
            title="Creator Management (Allowlist, Public Mint, Signatures)"
          >
            <Settings className="w-4 h-4 text-[#0052FF]" />
          </button>
        )}

        <button
          onClick={() => sharePoapToFarcaster(event.name, event.id)}
          className="p-2 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition-colors"
          title="Share to Warpcast / Farcaster"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
