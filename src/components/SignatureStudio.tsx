import React, { useState, useRef } from 'react';
import { useAccount } from 'wagmi';
import { QRCodeSVG } from 'qrcode.react';
import { POAPEvent } from '../types/contract';
import { useSignatureMint } from '../hooks/useSignatureMint';
import { isAddress, getAddress } from 'viem';
import {
  KeyRound,
  QrCode,
  Sparkles,
  Download,
  Copy,
  Check,
  AlertCircle,
  HelpCircle,
  Share2,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { sharePoapToFarcaster } from '../lib/farcaster';

interface SignatureStudioProps {
  events: POAPEvent[];
  selectedEventId?: bigint;
  onNavigateToEvent?: (id: bigint) => void;
}

export const SignatureStudio: React.FC<SignatureStudioProps> = ({
  events,
  selectedEventId,
  onNavigateToEvent,
}) => {
  const { address, isConnected } = useAccount();
  const [activeEventId, setActiveEventId] = useState<bigint>(() => {
    if (selectedEventId) return selectedEventId;
    if (events.length > 0) return events[0].id;
    return 1n;
  });

  const {
    recipientInput,
    setRecipientInput,
    generatedSignature,
    isSigning,
    error,
    signForRecipient,
    getShareUrl,
  } = useSignatureMint(activeEventId);

  const [copiedSig, setCopiedSig] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const currentEvent = events.find((e) => e.id === activeEventId) || events[0];

  const shareUrl = generatedSignature ? getShareUrl(generatedSignature, recipientInput) : '';

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientInput.trim()) return;
    await signForRecipient(recipientInput, activeEventId);
  };

  const handleCopySig = () => {
    if (!generatedSignature) return;
    navigator.clipboard.writeText(generatedSignature);
    setCopiedSig(true);
    setTimeout(() => setCopiedSig(false), 2000);
  };

  const handleCopyUrl = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `POAP-${activeEventId.toString()}-QR.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0052FF]/10 border border-[#0052FF]/30 text-[#0052FF] text-xs font-semibold mb-2">
          <KeyRound className="w-3.5 h-3.5" />
          <span>ECDSA Signatures & QR Distribution</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Signature Minting Studio & QR Codes
        </h2>
        <p className="text-xs sm:text-sm text-[#888888] mt-1">
          Generate cryptographic authorization for in-person attendees and live stream participants.
        </p>
      </div>

      {/* Guide & Plain-Language Explanation */}
      <div className="rounded-2xl glass border-[#262626] p-5 space-y-3">
        <div className="flex items-center gap-2 font-bold text-white text-sm">
          <HelpCircle className="w-4 h-4 text-[#0052FF]" />
          <span>How Signature Minting Works</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[#888888]">
          <div className="p-3 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
            <span className="font-bold text-white block">1. Creator Signs</span>
            <p>The event organizer signs an authorization hash with their wallet private key for an attendee.</p>
          </div>
          <div className="p-3 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
            <span className="font-bold text-white block">2. Attendee Receives</span>
            <p>The attendee scans a QR code containing the event link and signature URL parameter.</p>
          </div>
          <div className="p-3 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
            <span className="font-bold text-white block">3. Contract Verifies</span>
            <p>The smart contract verifies ECDSA recovery on Base Sepolia and issues the POAP badge.</p>
          </div>
        </div>
      </div>

      {/* Form & QR Generator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Signer Controls (Left) */}
        <div className="lg:col-span-7 rounded-2xl glass border-[#262626] p-6 space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#0052FF]" />
            <span>Generate Signature for Attendee</span>
          </h3>

          <form onSubmit={handleSign} className="space-y-4">
            {/* Event Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Select POAP Event</label>
              <select
                value={activeEventId.toString()}
                onChange={(e) => setActiveEventId(BigInt(e.target.value))}
                className="input-field cursor-pointer"
              >
                {events.map((ev) => (
                  <option key={ev.id.toString()} value={ev.id.toString()}>
                    POAP #{ev.id.toString()} - {ev.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Recipient Address */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400">
                  Recipient Ethereum Address <span className="text-red-400">*</span>
                </label>
                {address && (
                  <button
                    type="button"
                    onClick={() => setRecipientInput(address)}
                    className="text-[11px] text-[#0052FF] hover:underline"
                  >
                    Paste Connected Address
                  </button>
                )}
              </div>
              <input
                type="text"
                required
                placeholder="0x..."
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                className="input-field font-mono text-xs"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSigning || !recipientInput.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#0052FF] hover:bg-blue-600 text-white font-bold text-xs shadow-lg shadow-[#0052FF]/25 transition-all active:scale-95 disabled:opacity-50"
            >
              {isSigning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Requesting Wallet Signature...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign Authorization Hash</span>
                </>
              )}
            </button>
          </form>

          {/* Generated Signature Result */}
          {generatedSignature && (
            <div className="p-4 rounded-xl bg-[#121212] border border-[#262626] space-y-3 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cryptographic Signature Created</span>
                </span>
                <button
                  onClick={handleCopySig}
                  className="flex items-center gap-1 text-xs text-[#888888] hover:text-white"
                >
                  {copiedSig ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSig ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="font-mono text-[11px] text-neutral-300 break-all p-2.5 rounded-lg bg-black/60 border border-[#262626]">
                {generatedSignature}
              </p>
            </div>
          )}
        </div>

        {/* Live Event QR Code Display (Right) */}
        <div className="lg:col-span-5 rounded-2xl glass border-[#262626] p-6 flex flex-col items-center justify-center text-center space-y-4">
          <div className="flex items-center gap-2 font-bold text-white text-sm">
            <QrCode className="w-4 h-4 text-[#0052FF]" />
            <span>Attendee QR Code</span>
          </div>

          <div
            ref={qrRef}
            className="p-4 rounded-2xl bg-white border border-neutral-300 shadow-2xl flex items-center justify-center"
          >
            <QRCodeSVG
              value={shareUrl || (typeof window !== 'undefined' ? `${window.location.origin}/mint/${activeEventId.toString()}` : `https://poaps.base.org/mint/${activeEventId.toString()}`)}
              size={180}
              level="M"
              includeMargin={false}
            />
          </div>

          <div className="space-y-1 w-full text-center">
            <p className="font-bold text-xs text-white truncate max-w-[240px] mx-auto">
              {currentEvent?.name || `POAP #${activeEventId.toString()}`}
            </p>
            <p className="text-[11px] text-[#888888]">
              {generatedSignature ? 'Scan to mint directly with signature' : 'Default event mint URL'}
            </p>
          </div>

          <div className="flex items-center gap-2 w-full pt-2">
            <button
              onClick={handleDownloadQR}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#121212] border border-[#262626] hover:border-neutral-700 text-xs font-semibold text-neutral-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download QR</span>
            </button>

            {shareUrl && (
              <button
                onClick={handleCopyUrl}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#0052FF]/10 border border-[#0052FF]/30 hover:bg-[#0052FF]/20 text-xs font-semibold text-blue-300 transition-colors"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Copied Link' : 'Copy Link'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
