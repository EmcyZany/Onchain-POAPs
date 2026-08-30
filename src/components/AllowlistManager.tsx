import React, { useState } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { POAPEvent, BASE_SEPOLIA_CHAIN_ID, BASE_SEPOLIA_EXPLORER } from '../types/contract';
import { useAllowlist } from '../hooks/useAllowlist';
import { useCountdown } from '../hooks/useCountdown';
import { usePOAPContract } from '../hooks/usePOAPContract';
import { shortenAddress } from '../lib/utils';
import {
  Users,
  Upload,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  ArrowRight,
} from 'lucide-react';

interface AllowlistManagerProps {
  event: POAPEvent;
  creatorTimelock: bigint;
  onSuccess?: () => void;
}

export const AllowlistManager: React.FC<AllowlistManagerProps> = ({
  event,
  creatorTimelock,
  onSuccess,
}) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { updateAllowlistRoot, isWritePending, isTxConfirming, isTxSuccess, txHash } = usePOAPContract();

  const {
    rawInput,
    setRawInput,
    validAddresses,
    invalidLines,
    merkleRoot,
    totalCount,
    proofs,
    handleCsvUpload,
    targetSearchAddress,
    setTargetSearchAddress,
    searchVerification,
  } = useAllowlist();

  // Dynamic countdown based on createdAt + CREATOR_TIMELOCK
  const countdown = useCountdown(event.createdAt, creatorTimelock);

  const [copiedRoot, setCopiedRoot] = useState(false);
  const [copiedProofAddr, setCopiedProofAddr] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isCreator =
    address && event.creator && address.toLowerCase() === event.creator.toLowerCase();

  const hasExistingRoot =
    event.allowlistRoot &&
    event.allowlistRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000';

  const handleCopyRoot = () => {
    navigator.clipboard.writeText(merkleRoot);
    setCopiedRoot(true);
    setTimeout(() => setCopiedRoot(false), 2000);
  };

  const handleCopyProof = (addr: string, proof: `0x${string}`[]) => {
    navigator.clipboard.writeText(JSON.stringify(proof));
    setCopiedProofAddr(addr);
    setTimeout(() => setCopiedProofAddr(null), 2000);
  };

  const handleUpdateRoot = async () => {
    setSubmitError(null);

    if (!isConnected) {
      setSubmitError('Please connect your creator wallet.');
      return;
    }

    if (!isCreator) {
      setSubmitError('Only the event creator can set the allowlist root.');
      return;
    }

    if (countdown.isExpired) {
      setSubmitError('The CREATOR_TIMELOCK window has expired for this POAP.');
      return;
    }

    if (hasExistingRoot) {
      setSubmitError('The Allowlist root has already been set for this event and is immutable.');
      return;
    }

    if (totalCount === 0 || merkleRoot === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      setSubmitError('Please provide at least one valid address to build the Merkle Tree.');
      return;
    }

    try {
      if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
        await switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID });
      }
      await updateAllowlistRoot(event.id, merkleRoot);
    } catch (err: any) {
      console.error('Update allowlist root error:', err);
      let msg = err?.message || 'Failed to update allowlist root.';
      if (msg.includes('POAP__OnlyCreator')) msg = 'Caller is not the event creator.';
      if (msg.includes('POAP__RootAlreadySet')) msg = 'Allowlist root has already been set!';
      if (msg.includes('POAP__TimeLockExpired')) msg = 'Creator timelock expired.';
      setSubmitError(msg);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0052FF]/10 border border-[#0052FF]/30 text-[#0052FF] text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Merkle Allowlist Studio</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Allowlist Management for POAP #{event.id.toString()}
          </h2>
          <p className="text-xs sm:text-sm text-[#888888] mt-1">{event.name}</p>
        </div>

        {/* Timelock countdown badge */}
        <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] flex items-center gap-3">
          <Clock className={`w-5 h-5 ${countdown.isExpired ? 'text-red-400' : 'text-amber-400 animate-pulse'}`} />
          <div>
            <p className="text-[11px] text-[#888888] font-medium">CREATOR TIMELOCK</p>
            <p className="text-xs font-mono font-bold text-white">{countdown.formatted}</p>
          </div>
        </div>
      </div>

      {/* Plain Language Educational Explainer */}
      <div className="p-4 rounded-xl glass border-[#262626] text-xs text-neutral-300 space-y-2">
        <div className="flex items-center gap-2 font-bold text-white">
          <HelpCircle className="w-4 h-4 text-[#0052FF]" />
          <span>How Merkle Allowlists Work</span>
        </div>
        <p className="text-[#888888] leading-relaxed">
          Instead of storing hundreds of attendee wallet addresses onchain (which costs high gas), we hash the list into a single 32-byte <strong className="text-white">Merkle Root</strong> and write it once to Base Sepolia. Each eligible attendee then submits a cryptographic <strong className="text-white">Merkle Proof</strong> when claiming their POAP.
        </p>
      </div>

      {/* Current Onchain Status */}
      <div className="p-5 rounded-2xl glass border-[#262626] space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Onchain Status</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#121212] border border-[#262626]">
            <span className="text-[#888888] block mb-1">Current Onchain Root</span>
            <span className="font-mono text-neutral-200 text-[11px] break-all">
              {event.allowlistRoot || '0x000... (Not set)'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#121212] border border-[#262626]">
            <span className="text-[#888888] block mb-1">Update Status</span>
            <span className="font-semibold text-white">
              {hasExistingRoot ? (
                <span className="text-amber-400">Root Already Committed (Immutable)</span>
              ) : countdown.isExpired ? (
                <span className="text-red-400">Timelock Window Expired</span>
              ) : (
                <span className="text-emerald-400">Ready to Commit</span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Address Input & Merkle Tree Generator */}
      <div className="p-6 rounded-2xl glass border-[#262626] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0052FF] text-xs font-mono">1</span>
            <span>Input Eligible Attendee Addresses</span>
          </h3>

          <div className="flex items-center gap-2">
            <label
              htmlFor="csv-upload"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121212] border border-[#262626] hover:border-neutral-700 text-xs font-semibold text-neutral-300 cursor-pointer transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#0052FF]" />
              <span>Upload CSV / TXT</span>
            </label>
            <input
              id="csv-upload"
              type="file"
              accept=".csv,.txt"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCsvUpload(file);
              }}
              className="hidden"
            />
          </div>
        </div>

        <div className="space-y-2">
          <textarea
            rows={5}
            placeholder="Paste Ethereum addresses here (one per line, or comma-separated)&#10;0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045&#10;0xC3249356a483fbe17d5355D39105D2eA666d9de6"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            className="input-field font-mono text-xs"
          />

          <div className="flex flex-wrap items-center justify-between text-xs text-[#888888]">
            <span>
              Valid Addresses: <strong className="text-white">{totalCount}</strong>
            </span>
            {invalidLines.length > 0 && (
              <span className="text-red-400">
                {invalidLines.length} invalid line(s) ignored
              </span>
            )}
          </div>
        </div>

        {/* Generated Merkle Root Display */}
        {totalCount > 0 && (
          <div className="p-4 rounded-xl bg-[#121212] border border-[#0052FF]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0052FF]">Computed Merkle Root:</span>
              <button
                type="button"
                onClick={handleCopyRoot}
                className="flex items-center gap-1 text-xs text-[#888888] hover:text-white"
              >
                {copiedRoot ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRoot ? 'Copied' : 'Copy Root'}</span>
              </button>
            </div>
            <p className="font-mono text-xs text-white break-all">{merkleRoot}</p>
          </div>
        )}
      </div>

      {/* Address Proof Verification & Lookup Table */}
      {totalCount > 0 && (
        <div className="p-6 rounded-2xl glass border-[#262626] space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0052FF] text-xs font-mono">2</span>
            <span>Proof Generator & Lookup</span>
          </h3>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#888888] absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search or test an address to inspect its Merkle proof..."
              value={targetSearchAddress}
              onChange={(e) => setTargetSearchAddress(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[#121212] border border-[#262626] focus:border-[#0052FF] text-xs font-mono text-white placeholder-neutral-600 focus:outline-none transition-colors"
            />
          </div>

          {searchVerification && (
            <div
              className={`p-3.5 rounded-xl border text-xs ${
                searchVerification.isEligible
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}
            >
              {searchVerification.isEligible ? (
                <div className="space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Eligible! Address is included in this allowlist.</span>
                  </p>
                  <p className="font-mono text-[11px] text-[#888888] break-all">
                    Proof ({searchVerification.proof.length} hashes): {JSON.stringify(searchVerification.proof)}
                  </p>
                </div>
              ) : (
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>Not Found. Address is not part of this allowlist.</span>
                </p>
              )}
            </div>
          )}

          {/* Proof Table */}
          <div className="max-h-60 overflow-y-auto rounded-xl border border-[#262626] bg-[#121212] divide-y divide-[#262626]">
            {validAddresses.slice(0, 50).map((addr) => {
              const proof = proofs[addr.toLowerCase() as `0x${string}`] || [];
              const isCopied = copiedProofAddr === addr;
              return (
                <div key={addr} className="flex items-center justify-between p-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-mono text-white">{shortenAddress(addr, 6)}</span>
                    <span className="text-[11px] text-[#888888] block">
                      {proof.length} proof hashes
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyProof(addr, proof)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1A1A1A] hover:bg-neutral-800 text-neutral-300 text-xs transition-colors"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy Proof'}</span>
                  </button>
                </div>
              );
            })}
          </div>
          {validAddresses.length > 50 && (
            <p className="text-[11px] text-[#888888] text-center">
              Showing first 50 of {validAddresses.length} addresses.
            </p>
          )}
        </div>
      )}

      {/* Errors */}
      {submitError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Success */}
      {isTxSuccess && txHash && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-base text-white">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Allowlist Merkle Root Committed Onchain!</span>
          </div>
          <p className="text-xs text-neutral-300">
            The root is now verified on Base Sepolia. Eligible attendees can claim with their Merkle proofs.
          </p>
          <a
            href={`${BASE_SEPOLIA_EXPLORER}/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline pt-1"
          >
            <span>View Transaction on BaseScan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Submit button */}
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={handleUpdateRoot}
          disabled={
            isWritePending ||
            isTxConfirming ||
            hasExistingRoot ||
            countdown.isExpired ||
            totalCount === 0 ||
            !isCreator
          }
          className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#0052FF] hover:bg-blue-600 text-white font-bold text-sm shadow-xl shadow-[#0052FF]/25 transition-all active:scale-95 disabled:opacity-50"
        >
          {isWritePending || isTxConfirming ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{isWritePending ? 'Sign in Wallet...' : 'Committing Root on Base...'}</span>
            </>
          ) : (
            <>
              <span>Commit Root to Base Sepolia</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
