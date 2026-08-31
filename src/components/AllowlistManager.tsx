import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { MerkleTree } from 'merkletreejs';
import { encodePacked, getAddress, isAddress, keccak256 } from 'viem';
import {
  POAPEvent,
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_EXPLORER,
} from '../types/contract';
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
  FileText,
  Lock,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  Info,
} from 'lucide-react';

export interface AllowlistManagerProps {
  event?: POAPEvent | null;
  events?: POAPEvent[];
  creatorTimelock?: bigint;
  onEventChange?: (event: POAPEvent) => void;
  onSuccess?: () => void;
}

/**
 * Hash an address leaf according to OpenZeppelin MerkleProof standard:
 * keccak256(encodePacked(['address'], [checksummedAddress]))
 */
function hashAddressLeaf(address: string): Buffer {
  const checksummed = getAddress(address.trim());
  const hexHash = keccak256(encodePacked(['address'], [checksummed]));
  return Buffer.from(hexHash.slice(2), 'hex');
}

/**
 * Parse raw text / CSV into validated unique addresses & invalid lines
 */
function parseAndValidateAddresses(rawText: string): {
  validAddresses: `0x${string}`[];
  invalidLines: string[];
} {
  const tokens = rawText
    .split(/[\n,;\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const validAddresses: `0x${string}`[] = [];
  const invalidLines: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    if (isAddress(token)) {
      try {
        const checksummed = getAddress(token);
        if (!seen.has(checksummed.toLowerCase())) {
          seen.add(checksummed.toLowerCase());
          validAddresses.push(checksummed);
        }
      } catch {
        invalidLines.push(token);
      }
    } else if (token.length > 0) {
      invalidLines.push(token);
    }
  }

  return { validAddresses, invalidLines };
}

/**
 * Generate Merkle Tree, Root Hash, and Proof dictionary using merkletreejs & keccak256
 */
function buildMerkleTree(addresses: `0x${string}`[]) {
  if (addresses.length === 0) {
    return {
      root: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
      proofs: {} as Record<string, `0x${string}`[]>,
      tree: null,
    };
  }

  const leaves = addresses.map((addr) => hashAddressLeaf(addr));

  const tree = new MerkleTree(
    leaves,
    (buf: Buffer) => {
      const hex = keccak256(`0x${buf.toString('hex')}` as `0x${string}`);
      return Buffer.from(hex.slice(2), 'hex');
    },
    { sortPairs: true }
  );

  const root = `0x${tree.getRoot().toString('hex')}` as `0x${string}`;
  const proofs: Record<string, `0x${string}`[]> = {};

  addresses.forEach((addr) => {
    const leaf = hashAddressLeaf(addr);
    const proofArray = tree
      .getProof(leaf)
      .map((p) => `0x${p.data.toString('hex')}` as `0x${string}`);
    proofs[addr.toLowerCase()] = proofArray;
  });

  return { root, proofs, tree };
}

export const AllowlistManager: React.FC<AllowlistManagerProps> = ({
  event: initialEvent,
  events: propEvents,
  creatorTimelock: propTimelock,
  onEventChange,
  onSuccess,
}) => {
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const {
    events: contractEvents,
    creatorTimelock: contractTimelock,
    updateAllowlistRoot,
    isWritePending,
    isTxConfirming,
    isTxSuccess,
    txHash,
    refetchEvents,
  } = usePOAPContract();

  const allAvailableEvents = propEvents || contractEvents;
  const timelockDuration = propTimelock || contractTimelock || 2592000n; // Default 30 days in seconds

  // Event resolution state
  const [selectedEventId, setSelectedEventId] = useState<string>(() => {
    if (initialEvent) return initialEvent.id.toString();
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const urlId = searchParams.get('id') || searchParams.get('eventId');
      if (urlId) return urlId;

      const path = window.location.pathname;
      const match = path.match(/\/(manage|allowlist)\/(\d+)/i);
      if (match && match[2]) return match[2];
    }
    return '';
  });

  // Active event object
  const currentEvent = useMemo<POAPEvent | null>(() => {
    if (selectedEventId && allAvailableEvents.length > 0) {
      const found = allAvailableEvents.find(
        (e) => e.id.toString() === selectedEventId
      );
      if (found) return found;
    }
    if (initialEvent) return initialEvent;
    if (allAvailableEvents.length > 0) {
      // Prioritize events created by the connected address
      if (connectedAddress) {
        const myEvent = allAvailableEvents.find(
          (e) => e.creator.toLowerCase() === connectedAddress.toLowerCase()
        );
        if (myEvent) return myEvent;
      }
      return allAvailableEvents[0];
    }
    return null;
  }, [selectedEventId, allAvailableEvents, initialEvent, connectedAddress]);

  // Sync back to parent if selected event changes
  useEffect(() => {
    if (currentEvent && onEventChange) {
      onEventChange(currentEvent);
    }
  }, [currentEvent, onEventChange]);

  // Address Inputs & Tree state
  const [rawInput, setRawInput] = useState<string>('');
  const [copiedRoot, setCopiedRoot] = useState<boolean>(false);
  const [copiedProofAddr, setCopiedProofAddr] = useState<string | null>(null);
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCsvUploading, setIsCsvUploading] = useState<boolean>(false);

  // Address parsing & Merkle Tree computation
  const { validAddresses, invalidLines } = useMemo(
    () => parseAndValidateAddresses(rawInput),
    [rawInput]
  );

  const { root: generatedRoot, proofs } = useMemo(
    () => buildMerkleTree(validAddresses),
    [validAddresses]
  );

  // Timelock calculation
  const [nowSec, setNowSec] = useState<number>(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const createdAtSec = currentEvent ? Number(currentEvent.createdAt) : 0;
  const durationSec = Number(timelockDuration);
  const deadlineSec = createdAtSec + durationSec;
  const secondsRemaining = Math.max(0, deadlineSec - nowSec);
  const isTimelockExpired = currentEvent ? secondsRemaining <= 0 : false;

  const daysRemaining = Math.floor(secondsRemaining / 86400);
  const hoursRemaining = Math.floor((secondsRemaining % 86400) / 3600);
  const minutesRemaining = Math.floor((secondsRemaining % 3600) / 60);

  let countdownText = '';
  if (isTimelockExpired) {
    countdownText = 'Window closed';
  } else if (daysRemaining > 1) {
    countdownText = `Allowlist can be set for ${daysRemaining} more days.`;
  } else if (daysRemaining === 1) {
    countdownText = `Allowlist can be set for 1 more day (${hoursRemaining}h ${minutesRemaining}m).`;
  } else if (hoursRemaining > 0) {
    countdownText = `Allowlist can be set for ${hoursRemaining}h ${minutesRemaining}m.`;
  } else {
    countdownText = `Allowlist can be set for ${minutesRemaining} minutes.`;
  }

  // Current Onchain Root state
  const hasOnchainRoot = Boolean(
    currentEvent?.allowlistRoot &&
      currentEvent.allowlistRoot !==
        '0x0000000000000000000000000000000000000000000000000000000000000000'
  );

  // Status calculation: "Not set" | "Active" | "Closed"
  const allowlistStatus = useMemo<'Not set' | 'Active' | 'Closed'>(() => {
    if (isTimelockExpired) return 'Closed';
    if (hasOnchainRoot) return 'Active';
    return 'Not set';
  }, [isTimelockExpired, hasOnchainRoot]);

  // Creator check
  const isCreator = Boolean(
    connectedAddress &&
      currentEvent?.creator &&
      connectedAddress.toLowerCase() === currentEvent.creator.toLowerCase()
  );

  // CSV File upload
  const handleCsvUpload = useCallback(
    (file: File) => {
      setIsCsvUploading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = (e.target?.result as string) || '';
        if (text) {
          setRawInput((prev) => (prev ? `${prev}\n${text}` : text));
        }
        setIsCsvUploading(false);
      };
      reader.onerror = () => {
        setSubmitError('Failed to read uploaded CSV file.');
        setIsCsvUploading(false);
      };
      reader.readAsText(file);
    },
    []
  );

  // Copy Root
  const handleCopyRoot = () => {
    const rootToCopy = generatedRoot;
    if (rootToCopy) {
      navigator.clipboard.writeText(rootToCopy);
      setCopiedRoot(true);
      setTimeout(() => setCopiedRoot(false), 2000);
    }
  };

  // Copy Proof per address
  const handleCopyProof = (addr: string) => {
    const proof = proofs[addr.toLowerCase()] || [];
    navigator.clipboard.writeText(JSON.stringify(proof));
    setCopiedProofAddr(addr);
    setTimeout(() => setCopiedProofAddr(null), 2000);
  };

  // Submit to contract: updateAllowlistRoot(eventId, newRoot)
  const handleSetAllowlist = async () => {
    setSubmitError(null);

    if (!currentEvent) {
      setSubmitError('No POAP event selected.');
      return;
    }

    if (!isConnected) {
      setSubmitError('Please connect your creator wallet.');
      return;
    }

    if (!isCreator) {
      setSubmitError('Not authorized: Only the POAP creator can set the allowlist.');
      return;
    }

    if (hasOnchainRoot) {
      setSubmitError('POAP__RootAlreadySet: The allowlist root for this event has already been set and is permanently immutable.');
      return;
    }

    if (isTimelockExpired) {
      setSubmitError('POAP__TimeLockExpired: The creator timelock has expired. Allowlist updates are now closed.');
      return;
    }

    if (
      validAddresses.length === 0 ||
      generatedRoot === '0x0000000000000000000000000000000000000000000000000000000000000000'
    ) {
      setSubmitError('Please paste or upload at least one valid recipient address.');
      return;
    }

    try {
      if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
        await switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID });
      }

      await updateAllowlistRoot(currentEvent.id, generatedRoot);
      refetchEvents();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Update allowlist root error:', err);
      let message = err?.message || 'Failed to submit allowlist root.';
      if (message.includes('POAP__RootAlreadySet')) {
        message = 'POAP__RootAlreadySet: The allowlist root has already been set for this POAP and cannot be modified.';
      } else if (message.includes('POAP__TimeLockExpired')) {
        message = 'POAP__TimeLockExpired: The CREATOR_TIMELOCK window has expired for this event.';
      } else if (message.includes('POAP__OnlyCreator')) {
        message = 'POAP__OnlyCreator: Only the POAP creator can perform this action.';
      } else if (message.includes('User rejected')) {
        message = 'Transaction was rejected in your wallet.';
      }
      setSubmitError(message);
    }
  };

  // Filter addresses in distribution table
  const filteredTableAddresses = useMemo(() => {
    if (!searchTableQuery.trim()) return validAddresses;
    const q = searchTableQuery.toLowerCase().trim();
    return validAddresses.filter((addr) => addr.toLowerCase().includes(q));
  }, [validAddresses, searchTableQuery]);

  // Load sample addresses for quick testing
  const handleLoadSample = () => {
    const samples = [
      '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
      '0xC3249356a483fbe17d5355D39105D2eA666d9de6',
      '0x3C44CdD46a1fB7F7668798C3725F7B87979b9C8D',
      '0x8479e0004576595F3779e5B63273e8eC538FE6b9',
      '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    ];
    if (connectedAddress && !samples.includes(connectedAddress)) {
      samples.unshift(connectedAddress);
    }
    setRawInput(samples.join('\n'));
  };

  // If no events exist yet
  if (!currentEvent && allAvailableEvents.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#0052FF]/10 border border-[#0052FF]/20 flex items-center justify-center mx-auto text-[#0052FF]">
            <Users className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">No POAP Events Registered</h2>
          <p className="text-sm text-neutral-400 max-w-md mx-auto">
            You must register a POAP event on Base Sepolia before configuring an allowlist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 font-sans">
      {/* 1. Header & Plain-Language Explainer */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0052FF]/10 border border-[#0052FF]/30 text-[#0052FF] text-xs font-semibold mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Allowlist Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Allowlist Management
            </h1>
            {currentEvent && (
              <p className="text-sm text-neutral-400 mt-1 flex items-center gap-2">
                <span>Managing POAP #{currentEvent.id.toString()}:</span>
                <span className="font-semibold text-white">{currentEvent.name}</span>
              </p>
            )}
          </div>

          {/* Event Selector Dropdown */}
          {allAvailableEvents.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="select-event" className="text-xs text-neutral-400 whitespace-nowrap">
                Switch POAP:
              </label>
              <div className="relative">
                <select
                  id="select-event"
                  value={currentEvent?.id.toString() || ''}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    const target = allAvailableEvents.find(
                      (ev) => ev.id.toString() === e.target.value
                    );
                    if (target && onEventChange) onEventChange(target);
                  }}
                  className="appearance-none bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs text-white pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:border-[#0052FF] transition-colors"
                >
                  {allAvailableEvents.map((ev) => (
                    <option key={ev.id.toString()} value={ev.id.toString()}>
                      #{ev.id.toString()} - {ev.name.slice(0, 24)}
                      {connectedAddress &&
                      ev.creator.toLowerCase() === connectedAddress.toLowerCase()
                        ? ' (You)'
                        : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Plain Language Explainer Banner */}
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 flex items-start gap-3.5 shadow-sm">
          <Info className="w-5 h-5 text-[#0052FF] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-white">How allowlists work</h4>
            <p className="text-xs text-neutral-300 leading-relaxed">
              An allowlist lets you choose exactly who can mint your POAP. Upload a list of wallet addresses, and only those addresses will be able to claim it.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Creator Gate Verification */}
      {currentEvent && (!isConnected || !isCreator) && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <h3 className="text-sm font-bold text-amber-300">
                {!isConnected ? 'Wallet Not Connected' : 'Not authorized'}
              </h3>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {!isConnected ? (
                  'Please connect your creator wallet to manage the allowlist for this POAP.'
                ) : (
                  <>
                    You are connected as{' '}
                    <span className="font-mono font-bold text-white">
                      {shortenAddress(connectedAddress || '', 6)}
                    </span>
                    , but POAP #{currentEvent.id.toString()} was created by{' '}
                    <span className="font-mono font-bold text-white">
                      {shortenAddress(currentEvent.creator, 6)}
                    </span>
                    . Only the original POAP creator can configure and commit the allowlist root.
                  </>
                )}
              </p>
            </div>
          </div>

          {/* If the user created other events, show quick switch */}
          {connectedAddress && (
            <div className="pt-2 border-t border-amber-500/20">
              <p className="text-xs text-neutral-300 mb-2 font-medium">
                Your registered POAPs:
              </p>
              <div className="flex flex-wrap gap-2">
                {allAvailableEvents
                  .filter(
                    (ev) =>
                      ev.creator.toLowerCase() === connectedAddress.toLowerCase()
                  )
                  .map((ev) => (
                    <button
                      key={ev.id.toString()}
                      type="button"
                      onClick={() => {
                        setSelectedEventId(ev.id.toString());
                        if (onEventChange) onEventChange(ev);
                      }}
                      className="px-3 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white transition-colors"
                    >
                      Switch to #{ev.id.toString()} ({ev.name})
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Onchain Overview Card: Status Badge, Root Hash & Countdown */}
      {currentEvent && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0052FF]" />
              <span>Allowlist Onchain State</span>
            </h2>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-400">Status:</span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  allowlistStatus === 'Active'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : allowlistStatus === 'Closed'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                {allowlistStatus === 'Active' && (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                )}
                {allowlistStatus === 'Closed' && (
                  <Lock className="w-3.5 h-3.5 mr-1" />
                )}
                {allowlistStatus === 'Not set' && (
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                )}
                {allowlistStatus}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Current Root */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-1.5">
              <span className="text-neutral-400 block font-medium">
                Current Onchain Root
              </span>
              <span className="font-mono text-neutral-200 text-[11px] break-all select-all">
                {hasOnchainRoot
                  ? currentEvent.allowlistRoot
                  : '0x0000000000000000000000000000000000000000000000000000000000000000 (Not set)'}
              </span>
            </div>

            {/* Live Countdown Timer */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400 font-medium">
                  Creator Timelock Window
                </span>
                <Clock
                  className={`w-4 h-4 ${
                    isTimelockExpired
                      ? 'text-rose-400'
                      : 'text-amber-400 animate-pulse'
                  }`}
                />
              </div>
              <p
                className={`text-xs font-semibold ${
                  isTimelockExpired ? 'text-rose-400 font-bold' : 'text-emerald-400'
                }`}
              >
                {countdownText}
              </p>
              <p className="text-[10px] text-neutral-500">
                Deadline: {new Date(deadlineSec * 1000).toLocaleDateString()} at{' '}
                {new Date(deadlineSec * 1000).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Address Input & Merkle Tree Generator */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0052FF] text-white text-xs font-mono font-bold">
                1
              </span>
              <span>Attendee Address Input</span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Paste Ethereum addresses or upload a CSV / TXT file. Whitespace and duplicates are automatically cleaned.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadSample}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-300 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#0052FF]" />
              <span>Load Sample</span>
            </button>

            <label
              htmlFor="allowlist-file-upload"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0052FF]/10 hover:bg-[#0052FF]/20 border border-[#0052FF]/30 text-xs font-semibold text-[#0052FF] cursor-pointer transition-colors"
            >
              {isCsvUploading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>Upload CSV / TXT</span>
            </label>
            <input
              id="allowlist-file-upload"
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

        {/* Textarea */}
        <div className="space-y-2">
          <textarea
            id="allowlist-addresses-input"
            rows={7}
            disabled={hasOnchainRoot || isTimelockExpired}
            placeholder={`Paste wallet addresses here (one per line, or comma-separated):\n0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045\n0xC3249356a483fbe17d5355D39105D2eA666d9de6\n0x3C44CdD46a1fB7F7668798C3725F7B87979b9C8D`}
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF] text-xs font-mono text-white placeholder-neutral-600 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
          />

          {/* Validation Metrics Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[11px]">
                <Check className="w-3 h-3 mr-1" />
                {validAddresses.length} Valid {validAddresses.length === 1 ? 'Address' : 'Addresses'}
              </span>

              {invalidLines.length > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold text-[11px]">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {invalidLines.length} Invalid {invalidLines.length === 1 ? 'line' : 'lines'} ignored
                </span>
              )}
            </div>

            {validAddresses.length > 0 && (
              <button
                type="button"
                onClick={() => setRawInput('')}
                className="text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* Computed Merkle Root Display Card */}
        {validAddresses.length > 0 && (
          <div className="p-4 rounded-xl bg-neutral-950 border border-[#0052FF]/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0052FF]">
                  Computed Merkle Root:
                </span>
                <span className="text-[11px] text-neutral-400 font-mono">
                  ({validAddresses.length} leaves)
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyRoot}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white font-medium transition-colors"
              >
                {copiedRoot ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedRoot ? 'Copied Root' : 'Copy Root'}</span>
              </button>
            </div>
            <p className="font-mono text-xs text-white break-all bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800 select-all">
              {generatedRoot}
            </p>
          </div>
        )}
      </div>

      {/* 5. Error Alerts */}
      {submitError && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-200">Execution Notice</p>
            <p className="leading-relaxed">{submitError}</p>
          </div>
        </div>
      )}

      {/* 6. Success Alert */}
      {isTxSuccess && txHash && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-white">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Allowlist Root Successfully Set on Base Sepolia!</span>
          </div>
          <p className="text-xs text-neutral-300">
            The Merkle root is now verified onchain. Eligible attendees can claim their POAP by submitting their corresponding Merkle proof.
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

      {/* 7. Action Button: Set Allowlist */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/30">
        <div className="text-xs text-neutral-400">
          {hasOnchainRoot ? (
            <span className="text-amber-400 font-medium">
              Root is already set onchain and immutable.
            </span>
          ) : isTimelockExpired ? (
            <span className="text-rose-400 font-medium">
              Window closed: Timelock has expired.
            </span>
          ) : !isCreator ? (
            <span className="text-amber-400 font-medium">
              Only the POAP creator can commit this root.
            </span>
          ) : (
            <span>Ready to commit {validAddresses.length} addresses to Base Sepolia.</span>
          )}
        </div>

        <button
          id="set-allowlist-button"
          type="button"
          onClick={handleSetAllowlist}
          disabled={
            isWritePending ||
            isTxConfirming ||
            hasOnchainRoot ||
            isTimelockExpired ||
            validAddresses.length === 0 ||
            !isCreator
          }
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0052FF] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#0052FF]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isWritePending || isTxConfirming ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>
                {isWritePending
                  ? 'Confirming in Wallet...'
                  : 'Setting Allowlist on Base...'}
              </span>
            </>
          ) : hasOnchainRoot ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Allowlist Already Set</span>
            </>
          ) : isTimelockExpired ? (
            <>
              <Lock className="w-4 h-4" />
              <span>Window closed</span>
            </>
          ) : (
            <>
              <span>Set Allowlist</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* 8. Proof Distribution Table */}
      {validAddresses.length > 0 && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0052FF] text-white text-xs font-mono font-bold">
                  2
                </span>
                <span>Proof Distribution Table</span>
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Each attendee requires their cryptographic Merkle proof to claim via{' '}
                <code className="text-[#0052FF]">allowlistMint</code>. Copy individual proofs below.
              </p>
            </div>

            {/* Table Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search address..."
                value={searchTableQuery}
                onChange={(e) => setSearchTableQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#0052FF]"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="bg-neutral-900/80 text-[11px] font-semibold text-neutral-400 border-b border-neutral-800 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Eligible Wallet Address</th>
                    <th className="px-4 py-3">Proof Depth</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono">
                  {filteredTableAddresses.slice(0, 100).map((addr, idx) => {
                    const proof = proofs[addr.toLowerCase()] || [];
                    const isCopied = copiedProofAddr === addr;
                    return (
                      <tr
                        key={addr}
                        className="hover:bg-neutral-900/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-neutral-500 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-3 text-white font-medium">
                          <span className="hidden sm:inline">{addr}</span>
                          <span className="sm:hidden">{shortenAddress(addr, 6)}</span>
                        </td>
                        <td className="px-4 py-3 text-neutral-400 text-[11px]">
                          {proof.length} hashes
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleCopyProof(addr)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-sans font-semibold transition-colors active:scale-95"
                          >
                            {isCopied ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5 text-neutral-400" />
                            )}
                            <span>{isCopied ? 'Copied' : 'Copy Proof'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredTableAddresses.length > 100 && (
              <div className="p-3 bg-neutral-900/50 border-t border-neutral-800 text-center text-[11px] text-neutral-400">
                Showing first 100 of {filteredTableAddresses.length} addresses.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
