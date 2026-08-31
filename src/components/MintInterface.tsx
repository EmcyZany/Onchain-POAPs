import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { POAPEvent, BASE_SEPOLIA_CHAIN_ID, BASE_SEPOLIA_EXPLORER, OPENSEA_TESTNET_BASE, POAP_CONTRACT_ADDRESS } from '../types/contract';
import { formatDate, formatDateTime, shortenAddress, parsePOAPImageUri } from '../lib/utils';
import { sharePoapToFarcaster } from '../lib/farcaster';
import { parseSignatureQueryParams } from '../lib/signatures';
import { usePOAPContract } from '../hooks/usePOAPContract';
import confetti from 'canvas-confetti';
import {
  Globe,
  Users,
  KeyRound,
  CheckCircle2,
  Calendar,
  MapPin,
  Lock,
  ExternalLink,
  Share2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  QrCode,
  ShieldAlert,
} from 'lucide-react';
import { POAP_BADGE_TEMPLATES } from '../lib/svgOptimizer';

interface MintInterfaceProps {
  event: POAPEvent;
  onSuccess?: () => void;
}

export const MintInterface: React.FC<MintInterfaceProps> = ({ event, onSuccess }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const {
    mint,
    allowlistMint,
    mintWithSignature,
    isWritePending,
    isTxConfirming,
    isTxSuccess,
    txHash,
  } = usePOAPContract();

  // Active minting route tab
  const [activeRoute, setActiveRoute] = useState<'public' | 'allowlist' | 'signature'>(() => {
    if (event.isPublic) return 'public';
    if (event.allowlistRoot && event.allowlistRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return 'allowlist';
    }
    return 'signature';
  });

  // Inputs for allowlist & signature
  const [merkleProofInput, setMerkleProofInput] = useState<string>('');
  const [signatureInput, setSignatureInput] = useState<string>('');
  const [mintError, setMintError] = useState<string | null>(null);

  // Parse signature from URL query parameter if user arrived via QR code
  useEffect(() => {
    const { sig } = parseSignatureQueryParams();
    if (sig) {
      setSignatureInput(sig);
      setActiveRoute('signature');
    }
  }, []);

  // Track celebration state to prevent endless looping or re-triggers
  const celebratedTxRef = React.useRef<string | null>(null);

  // Trigger celebration confetti exactly twice on success, then gracefully fade out
  useEffect(() => {
    if (isTxSuccess && txHash && celebratedTxRef.current !== txHash) {
      celebratedTxRef.current = txHash;

      // Burst 1: Left-center angle
      confetti({
        particleCount: 70,
        spread: 65,
        angle: 60,
        origin: { x: 0.25, y: 0.6 },
        colors: ['#0052FF', '#8B5CF6', '#10B981', '#F59E0B', '#FFFFFF'],
        ticks: 200,
        gravity: 1.1,
        decay: 0.93,
        scalar: 1.05,
        disableForReducedMotion: true,
      });

      // Burst 2: Right-center angle after brief delay (fired twice total)
      const secondBurstTimer = setTimeout(() => {
        confetti({
          particleCount: 70,
          spread: 65,
          angle: 120,
          origin: { x: 0.75, y: 0.6 },
          colors: ['#0052FF', '#8B5CF6', '#10B981', '#F59E0B', '#FFFFFF'],
          ticks: 200,
          gravity: 1.1,
          decay: 0.93,
          scalar: 1.05,
          disableForReducedMotion: true,
        });
      }, 350);

      if (onSuccess) onSuccess();

      return () => clearTimeout(secondBurstTimer);
    }
  }, [isTxSuccess, txHash, onSuccess]);

  const artworkSrc = React.useMemo(() => {
    const parsedRaw = parsePOAPImageUri(event.rawSvg);
    if (parsedRaw) return parsedRaw;

    const parsedSvgImage = parsePOAPImageUri(event.svgImage);
    if (parsedSvgImage) return parsedSvgImage;

    const templateIndex = Number(event.id || 1n) % POAP_BADGE_TEMPLATES.length;
    const template = POAP_BADGE_TEMPLATES[templateIndex] || POAP_BADGE_TEMPLATES[0];
    const dateStr = formatDate(event.eventDate || event.createdAt);
    const svgStr = template.generateSvg(event.name, dateStr, '#0052FF');
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgStr)}`;
  }, [event]);

  const handleMint = async () => {
    setMintError(null);

    if (!isConnected) {
      setMintError('Please connect your wallet to mint.');
      return;
    }

    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      try {
        await switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID });
      } catch {
        setMintError('Please switch network to Base Sepolia.');
        return;
      }
    }

    try {
      if (activeRoute === 'public') {
        if (!event.isPublic) {
          setMintError('Public minting is currently closed for this event.');
          return;
        }
        await mint(event.id);
      } else if (activeRoute === 'allowlist') {
        const rawParts = merkleProofInput
          .split(/[\n,;\s]+/)
          .map((p) => p.trim())
          .filter((p) => p.startsWith('0x') && p.length === 66) as `0x${string}`[];

        if (rawParts.length === 0) {
          setMintError('Please provide a valid array of bytes32 Merkle proof hashes.');
          return;
        }
        await allowlistMint(event.id, rawParts);
      } else if (activeRoute === 'signature') {
        const sig = signatureInput.trim() as `0x${string}`;
        if (!sig.startsWith('0x') || sig.length < 130) {
          setMintError('Invalid signature. Please provide a valid 65-byte hex signature (0x...).');
          return;
        }
        await mintWithSignature(event.id, sig);
      }
    } catch (err: any) {
      console.error('Minting error:', err);
      let msg = err?.message || 'Mint transaction failed.';
      if (msg.includes('POAP__AlreadyClaimed')) {
        msg = 'You have already collected this POAP!';
      } else if (msg.includes('POAP__EventNotPublic')) {
        msg = 'Public mint is disabled for this POAP.';
      } else if (msg.includes('POAP__AllowlistNotEnabled')) {
        msg = 'Allowlist is not enabled or root is empty.';
      } else if (msg.includes('ECDSAInvalidSignature')) {
        msg = 'Invalid signature! Ensure this signature was signed by the creator for your wallet address.';
      } else if (msg.includes('POAP__TimeLockExpired')) {
        msg = 'Signature minting window has expired for this event.';
      }
      setMintError(msg);
    }
  };

  const hasAllowlist =
    event.allowlistRoot &&
    event.allowlistRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000';

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      <div className="rounded-3xl glass border-[#262626] shadow-2xl p-6 sm:p-8 space-y-8 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-80 h-32 bg-[#0052FF]/15 blur-[80px] pointer-events-none rounded-full" />

        {/* Header & Artwork showcase */}
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 pb-6 border-b border-[#262626] relative z-10">
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden p-2 flex items-center justify-center bg-black/60 border-2 border-[#262626] shadow-xl shrink-0 group">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#0052FF]/15 to-transparent pointer-events-none" />
            <img
              src={artworkSrc}
              alt={event.name}
              className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-300 z-10"
            />
            {event.hasClaimed && (
              <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-[#0052FF] text-white text-[10px] font-bold flex items-center gap-1 shadow-md z-20">
                <CheckCircle2 className="w-3 h-3" />
                <span>Owned</span>
              </div>
            )}
          </div>

          <div className="space-y-3 flex-1 text-center sm:text-left">
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
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">{event.name}</h2>

            <p className="text-xs sm:text-sm text-[#888888] leading-relaxed">
              {event.description || 'Onchain attendance proof on Base Sepolia.'}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-[#888888] pt-1 font-mono">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#888888]" />
                <span>{formatDate(event.eventDate || event.createdAt)}</span>
              </span>
              {event.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#888888]" />
                  <span>{event.location}</span>
                </span>
              )}
              <span>Creator: {shortenAddress(event.creator, 3)}</span>
            </div>
          </div>
        </div>

        {/* Already Claimed Notice */}
        {event.hasClaimed && (
          <div className="p-4 rounded-2xl bg-[#0052FF]/10 border border-[#0052FF]/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#0052FF] shrink-0" />
              <div>
                <p className="font-bold text-sm text-white">You have already claimed this POAP!</p>
                <p className="text-xs text-[#888888]">View it in your personal collectible gallery.</p>
              </div>
            </div>
            <button
              onClick={() => sharePoapToFarcaster(event.name, event.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-bold border border-purple-500/30 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Cast</span>
            </button>
          </div>
        )}

        {/* Minting Pathways Selector */}
        <div className="space-y-4">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
            Select Minting Mechanism
          </label>

          <div className="grid grid-cols-3 gap-2">
            {/* Route 1: Public */}
            <button
              type="button"
              onClick={() => setActiveRoute('public')}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeRoute === 'public'
                  ? 'bg-[#0052FF]/15 border-[#0052FF] text-white'
                  : 'bg-[#1A1A1A] border-[#262626] text-[#888888] hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Globe className={`w-4 h-4 ${event.isPublic ? 'text-emerald-400' : 'text-neutral-500'}`} />
                <span className="font-bold text-xs">Public Mint</span>
              </div>
              <p className="text-[11px] text-[#888888]">
                {event.isPublic ? 'Open to everyone' : 'Currently closed'}
              </p>
            </button>

            {/* Route 2: Allowlist */}
            <button
              type="button"
              onClick={() => setActiveRoute('allowlist')}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeRoute === 'allowlist'
                  ? 'bg-[#0052FF]/15 border-[#0052FF] text-white'
                  : 'bg-[#1A1A1A] border-[#262626] text-[#888888] hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Users className={`w-4 h-4 ${hasAllowlist ? 'text-purple-400' : 'text-neutral-500'}`} />
                <span className="font-bold text-xs">Allowlist</span>
              </div>
              <p className="text-[11px] text-[#888888]">
                {hasAllowlist ? 'Merkle proof required' : 'No root set'}
              </p>
            </button>

            {/* Route 3: Signature */}
            <button
              type="button"
              onClick={() => setActiveRoute('signature')}
              className={`p-3 rounded-xl border text-left transition-all ${
                activeRoute === 'signature'
                  ? 'bg-[#0052FF]/15 border-[#0052FF] text-white'
                  : 'bg-[#1A1A1A] border-[#262626] text-[#888888] hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs">Signature</span>
              </div>
              <p className="text-[11px] text-[#888888]">Via creator QR code / bytes</p>
            </button>
          </div>
        </div>

        {/* Pathway Custom Inputs */}
        {activeRoute === 'public' && (
          <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#262626] space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">Public Mint Policy</span>
            </div>
            <p className="text-xs text-[#888888]">
              {event.isPublic
                ? 'Public minting is enabled by the event organizer. Any wallet can claim 1 token directly.'
                : 'Public minting is disabled for this POAP. Use the Allowlist or Signature method instead.'}
            </p>
          </div>
        )}

        {activeRoute === 'allowlist' && (
          <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#262626] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-white">Merkle Proof Input</span>
              </div>
              <span className="text-[11px] font-mono text-[#888888]">
                Root: {shortenAddress(event.allowlistRoot, 4)}
              </span>
            </div>
            <p className="text-xs text-[#888888]">
              Paste the cryptographic proof array (comma or newline separated 32-byte hex hashes):
            </p>
            <textarea
              rows={3}
              placeholder="0x123...abc, 0x456...def"
              value={merkleProofInput}
              onChange={(e) => setMerkleProofInput(e.target.value)}
              className="input-field font-mono text-xs"
            />
          </div>
        )}

        {activeRoute === 'signature' && (
          <div className="p-4 rounded-xl bg-[#1A1A1A] border border-[#262626] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">Cryptographic Signature</span>
              </div>
              <span className="text-[11px] text-[#888888]">Provided by Organizer</span>
            </div>
            <p className="text-xs text-[#888888]">
              Enter the 65-byte hex signature created by the event organizer (<code className="text-neutral-300 font-mono">0x...</code>):
            </p>
            <textarea
              rows={2}
              placeholder="0x9937172... (or scan the event organizer's QR code)"
              value={signatureInput}
              onChange={(e) => setSignatureInput(e.target.value)}
              className="input-field font-mono text-xs"
            />
          </div>
        )}

        {/* Error notice */}
        {mintError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{mintError}</span>
          </div>
        )}

        {/* Success confirmation */}
        {isTxSuccess && txHash && (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-3">
            <div className="flex items-center gap-2 font-bold text-base text-white">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>Congratulations! POAP Minted Successfully! 🎉</span>
            </div>
            <p className="text-xs text-neutral-300">
              The onchain token has been minted to your connected address on Base Sepolia.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={`${BASE_SEPOLIA_EXPLORER}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
              >
                <span>View on BaseScan</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <a
                href={`${OPENSEA_TESTNET_BASE}/${POAP_CONTRACT_ADDRESS}/${event.id.toString()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:underline"
              >
                <span>View on OpenSea</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                onClick={() => sharePoapToFarcaster(event.name, event.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600/30 text-purple-200 text-xs font-bold hover:bg-purple-600/40 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share on Farcaster</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            id="execute-mint-btn"
            onClick={handleMint}
            disabled={isWritePending || isTxConfirming}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-xl bg-[#0052FF] hover:bg-blue-600 text-white font-bold text-base shadow-xl shadow-[#0052FF]/25 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {isWritePending || isTxConfirming ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{isWritePending ? 'Confirm in Wallet...' : 'Minting on Base Sepolia...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>
                  {activeRoute === 'public'
                    ? 'Claim Public POAP'
                    : activeRoute === 'allowlist'
                    ? 'Claim Allowlist POAP'
                    : 'Claim with Signature'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
