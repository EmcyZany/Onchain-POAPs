'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense, Component, type ReactNode, type ErrorInfo } from 'react';
import { useAccount, useChainId, useSwitchChain, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { MerkleTree } from 'merkletreejs';
import { encodePacked, getAddress, isAddress, keccak256 } from 'viem';
import {
  POAP_CONTRACT_ADDRESS,
  ONCHAIN_POAPS_ABI,
  POAPEvent,
  BASE_SEPOLIA_CHAIN_ID,
  BASE_SEPOLIA_EXPLORER,
} from '../types/contract';
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
  ArrowRight,
  Lock,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  Info,
  Wallet,
  FileCheck2,
} from 'lucide-react';

// ==========================================
// 1. Error Boundary Component
// ==========================================
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AllowlistErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AllowlistStudio ErrorBoundary caught:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            <p className="text-sm text-neutral-300 max-w-md mx-auto font-mono text-xs break-all">
              {this.state.error?.message || 'Failed to load Allowlist Studio.'}
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 rounded-xl bg-[#0052FF] text-white text-xs font-bold hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 2. Cryptographic Helpers
// ==========================================

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
  if (!rawText || !rawText.trim()) {
    return { validAddresses: [], invalidLines: [] };
  }

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

// ==========================================
// 3. Fallback Route Parameter Helper
// ==========================================
function getRouteEventId(): string {
  if (typeof window === 'undefined') return '0';

  // Check URL Search Params (?id=... or ?eventId=...)
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const queryId = searchParams.get('id') || searchParams.get('eventId');
    if (queryId && queryId.trim()) return queryId.trim();

    // Check Pathname (/manage/1, /manage/2, /allowlist/1)
    const pathname = window.location.pathname;
    const match = pathname.match(/\/(manage|allowlist)\/(\d+)/i);
    if (match && match[2]) return match[2];
  } catch (e) {
    console.warn('Could not read route params:', e);
  }

  return '0';
}

// ==========================================
// 4. Main Allowlist Component Content
// ==========================================
export interface AllowlistManagerProps {
  eventId?: string | number | bigint;
  event?: POAPEvent | null;
  events?: POAPEvent[];
  creatorTimelock?: bigint;
  onEventChange?: (event: POAPEvent) => void;
  onSuccess?: () => void;
}

function AllowlistStudioInner({
  eventId: propEventId,
  event: propEvent,
  events: propEvents,
  creatorTimelock: propTimelock,
  onEventChange,
  onSuccess,
}: AllowlistManagerProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // 1. Resolve Event ID safely as a BigInt
  const [selectedIdStr, setSelectedIdStr] = useState<string>(() => {
    if (propEventId !== undefined && propEventId !== null) return propEventId.toString();
    if (propEvent) return propEvent.id.toString();
    return getRouteEventId();
  });

  const eventIdBigInt = useMemo(() => {
    try {
      if (!selectedIdStr || isNaN(Number(selectedIdStr))) return 0n;
      return BigInt(selectedIdStr);
    } catch {
      return 0n;
    }
  }, [selectedIdStr]);

  // 2. Direct Onchain Contract Reads
  const {
    data: eventDataRaw,
    isLoading: isEventLoading,
    error: eventReadError,
    refetch: refetchEventData,
  } = useReadContract({
    address: POAP_CONTRACT_ADDRESS,
    abi: ONCHAIN_POAPS_ABI,
    functionName: 'events',
    args: [eventIdBigInt],
  });

  const { data: contractTimelockRaw } = useReadContract({
    address: POAP_CONTRACT_ADDRESS,
    abi: ONCHAIN_POAPS_ABI,
    functionName: 'CREATOR_TIMELOCK',
  });

  // 3. Contract Write & Transaction Handling
  const {
    writeContractAsync,
    isPending: isWritePending,
    error: writeError,
    data: txHash,
  } = useWriteContract();

  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // 4. Normalize Event Data into Clean Object
  const currentEvent = useMemo<POAPEvent | null>(() => {
    if (propEvent && propEvent.id.toString() === selectedIdStr) {
      return propEvent;
    }
    if (!eventDataRaw) return null;

    const data = eventDataRaw as any;
    // Support both tuple array and object response from wagmi
    const name = (data.name ?? data[0] ?? '') as string;
    const description = (data.description ?? data[1] ?? '') as string;
    const imageUri = (data.imageUri ?? data[2] ?? '') as string;
    const creator = (data.creator ?? data[3] ?? '') as `0x${string}`;
    const eventType = Number(data.eventType ?? data[4] ?? 0);
    const maxSupply = BigInt(data.maxSupply ?? data[5] ?? 0n);
    const mintPrice = BigInt(data.mintPrice ?? data[6] ?? 0n);
    const createdAt = BigInt(data.createdAt ?? data[7] ?? 0n);
    const allowlistRoot = (data.allowlistRoot ?? data[8] ?? '0x0000000000000000000000000000000000000000000000000000000000000000') as `0x${string}`;

    // If event is empty/unregistered (creator is 0x0)
    if (!creator || creator === '0x0000000000000000000000000000000000000000') {
      return null;
    }

    return {
      id: eventIdBigInt,
      name,
      description,
      eventDate: createdAt,
      location: 'Base Sepolia',
      allowlistRoot,
      svgImage: imageUri || '',
      creator,
      createdAt,
      externalUrl: '',
      isSoulbound: false,
      isPublic: true,
      totalSupply: 0n,
    };
  }, [eventDataRaw, eventIdBigInt, propEvent, selectedIdStr]);

  // Sync back to parent if onEventChange provided
  useEffect(() => {
    if (currentEvent && onEventChange) {
      onEventChange(currentEvent);
    }
  }, [currentEvent, onEventChange]);

  // Refetch when transaction succeeds
  useEffect(() => {
    if (isTxSuccess) {
      refetchEventData();
      if (onSuccess) onSuccess();
    }
  }, [isTxSuccess, refetchEventData, onSuccess]);

  // 5. State for Address Inputs & Merkle Tree
  const [rawInput, setRawInput] = useState<string>('');
  const [parsedAddresses, setParsedAddresses] = useState<`0x${string}`[]>([]);
  const [ignoredLines, setIgnoredLines] = useState<string[]>([]);
  const [hasParsed, setHasParsed] = useState<boolean>(false);

  const [copiedRoot, setCopiedRoot] = useState<boolean>(false);
  const [copiedProofAddr, setCopiedProofAddr] = useState<string | null>(null);
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isCsvUploading, setIsCsvUploading] = useState<boolean>(false);

  // Parse Action Handler
  const handleParseAddresses = useCallback(() => {
    const { validAddresses, invalidLines } = parseAndValidateAddresses(rawInput);
    setParsedAddresses(validAddresses);
    setIgnoredLines(invalidLines);
    setHasParsed(true);
    setSubmitError(null);
  }, [rawInput]);

  // Automatically compute Merkle Tree from parsed addresses
  const { root: generatedRoot, proofs } = useMemo(
    () => buildMerkleTree(parsedAddresses),
    [parsedAddresses]
  );

  // 6. Timelock Countdown Calculation
  const timelockDuration = propTimelock || (contractTimelockRaw as bigint) || 2592000n; // default 30 days
  const [nowSec, setNowSec] = useState<number>(() => Math.floor(Date.now() / 1000));

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
  const isTimelockExpired = currentEvent && createdAtSec > 0 ? secondsRemaining <= 0 : false;

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

  // Onchain Root Status
  const hasOnchainRoot = Boolean(
    currentEvent?.allowlistRoot &&
      currentEvent.allowlistRoot !==
        '0x0000000000000000000000000000000000000000000000000000000000000000'
  );

  const allowlistStatus = useMemo<'Not set' | 'Active' | 'Closed'>(() => {
    if (isTimelockExpired) return 'Closed';
    if (hasOnchainRoot) return 'Active';
    return 'Not set';
  }, [isTimelockExpired, hasOnchainRoot]);

  // Creator Verification
  const isCreator = Boolean(
    address &&
      currentEvent?.creator &&
      address.toLowerCase() === currentEvent.creator.toLowerCase()
  );

  // CSV / TXT Upload Handler
  const handleCsvUpload = useCallback((file: File) => {
    setIsCsvUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      if (text) {
        setRawInput((prev) => (prev ? `${prev}\n${text}` : text));
        setHasParsed(false);
      }
      setIsCsvUploading(false);
    };
    reader.onerror = () => {
      setSubmitError('Failed to read uploaded CSV/TXT file.');
      setIsCsvUploading(false);
    };
    reader.readAsText(file);
  }, []);

  // Copy Root
  const handleCopyRoot = () => {
    const rootToCopy = generatedRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000' ? generatedRoot : currentEvent?.allowlistRoot;
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

  // Submit to Contract Handler: updateAllowlistRoot(eventId, newRoot)
  const handleSetAllowlist = async () => {
    setSubmitError(null);

    if (!currentEvent) {
      setSubmitError('No POAP event found.');
      return;
    }

    if (!isConnected) {
      setSubmitError('Please connect your creator wallet.');
      return;
    }

    if (!isCreator) {
      setSubmitError('Only the POAP creator can manage the allowlist.');
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

    if (!hasParsed || parsedAddresses.length === 0) {
      setSubmitError('Please click "Parse Addresses" and ensure at least one valid address is provided.');
      return;
    }

    try {
      if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
        await switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID });
      }

      await (writeContractAsync as any)({
        address: POAP_CONTRACT_ADDRESS,
        abi: ONCHAIN_POAPS_ABI,
        functionName: 'updateAllowlistRoot',
        args: [currentEvent.id, generatedRoot],
      });
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

  // Sample Addresses Loader
  const handleLoadSample = () => {
    const samples = [
      '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      '0xC3249356a483fbe17d5355D39105D2eA666d9de6',
      '0x3C44CdD46a1fB7F7668798C3725F7B87979b9C8D',
      '0x8479e0004576595F3779e5B63273e8eC538FE6b9',
      '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    ];
    if (address && !samples.includes(address)) {
      samples.unshift(address);
    }
    setRawInput(samples.join('\n'));
    setHasParsed(false);
  };

  // Filter addresses in distribution table
  const filteredTableAddresses = useMemo(() => {
    if (!searchTableQuery.trim()) return parsedAddresses;
    const q = searchTableQuery.toLowerCase().trim();
    return parsedAddresses.filter((addr) => addr.toLowerCase().includes(q));
  }, [parsedAddresses, searchTableQuery]);

  // ==========================================
  // VIEW RENDER BRANCHES (NEVER RETURN NULL)
  // ==========================================

  // Branch A: Loading State
  if (isEventLoading && !currentEvent) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="p-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-[#0052FF] animate-spin mx-auto" />
          <h3 className="text-base font-bold text-white">Loading POAP Event #{selectedIdStr}...</h3>
          <p className="text-xs text-neutral-400">Fetching onchain event details from Base Sepolia.</p>
        </div>
      </div>
    );
  }

  // Branch B: Event Not Found / Unregistered onchain
  if (!currentEvent) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="p-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">POAP Event #{selectedIdStr} Not Found</h2>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            This POAP event is not yet registered or has not been indexed on Base Sepolia.
          </p>
          {propEvents && propEvents.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-neutral-300 mb-2">Available POAPs:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {propEvents.map((ev) => (
                  <button
                    key={ev.id.toString()}
                    type="button"
                    onClick={() => {
                      setSelectedIdStr(ev.id.toString());
                      if (onEventChange) onEventChange(ev);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition-colors"
                  >
                    #{ev.id.toString()} - {ev.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Branch C: Wallet Not Connected
  if (!isConnected) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-8 sm:p-10 text-center space-y-6 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-[#0052FF]/10 border border-[#0052FF]/30 flex items-center justify-center mx-auto text-[#0052FF]">
            <Wallet className="w-7 h-7" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h2 className="text-2xl font-extrabold text-white">Connect Wallet to Manage POAP</h2>
            <p className="text-sm text-neutral-300">
              Connect your wallet to manage this POAP.
            </p>
            <p className="text-xs text-neutral-400 font-mono">
              POAP #{currentEvent.id.toString()} ({currentEvent.name}) Creator:{' '}
              {shortenAddress(currentEvent.creator, 6)}
            </p>
          </div>
          <div className="flex justify-center pt-2">
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  // Branch D: Connected but NOT Creator
  if (!isCreator) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-8 text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-amber-300">Only the POAP creator can manage the allowlist.</h2>
            <p className="text-xs text-amber-200/80 max-w-lg mx-auto leading-relaxed">
              You are connected with wallet{' '}
              <span className="font-mono font-bold text-white">{shortenAddress(address || '', 6)}</span>
              , but POAP #{currentEvent.id.toString()} was created by{' '}
              <span className="font-mono font-bold text-white">{shortenAddress(currentEvent.creator, 6)}</span>.
            </p>
          </div>

          {/* Quick switch to user-owned POAPs if available */}
          {propEvents && (
            <div className="pt-4 border-t border-amber-500/20 max-w-md mx-auto">
              <p className="text-xs text-neutral-300 mb-2 font-medium">Switch to a POAP you created:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {propEvents
                  .filter((ev) => address && ev.creator.toLowerCase() === address.toLowerCase())
                  .map((ev) => (
                    <button
                      key={ev.id.toString()}
                      type="button"
                      onClick={() => {
                        setSelectedIdStr(ev.id.toString());
                        if (onEventChange) onEventChange(ev);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white transition-colors"
                    >
                      #{ev.id.toString()} ({ev.name})
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // Branch E: Full Allowlist Studio Interface
  // ==========================================
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 font-sans">
      {/* 1. Header & Live Countdown Timer */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0052FF]/10 border border-[#0052FF]/30 text-[#0052FF] text-xs font-semibold mb-2">
              <Users className="w-3.5 h-3.5" />
              <span>Allowlist Studio</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Allowlist Studio
            </h1>
            <p className="text-sm text-neutral-400 mt-1 flex items-center gap-2">
              <span>Managing POAP #{currentEvent.id.toString()}:</span>
              <span className="font-semibold text-white">{currentEvent.name}</span>
            </p>
          </div>

          {/* POAP Switcher Dropdown */}
          {propEvents && propEvents.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="select-event" className="text-xs text-neutral-400 whitespace-nowrap">
                Switch POAP:
              </label>
              <div className="relative">
                <select
                  id="select-event"
                  value={currentEvent.id.toString()}
                  onChange={(e) => {
                    setSelectedIdStr(e.target.value);
                    const target = propEvents.find((ev) => ev.id.toString() === e.target.value);
                    if (target && onEventChange) onEventChange(target);
                  }}
                  className="appearance-none bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs text-white pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:border-[#0052FF] transition-colors"
                >
                  {propEvents.map((ev) => (
                    <option key={ev.id.toString()} value={ev.id.toString()}>
                      #{ev.id.toString()} - {ev.name.slice(0, 24)}
                      {address && ev.creator.toLowerCase() === address.toLowerCase() ? ' (You)' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Explainer Banner */}
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

      {/* 2. Onchain Overview Card: Status Badge & Timelock Countdown */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#0052FF]" />
            <span>Allowlist Onchain State</span>
          </h2>

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
              {allowlistStatus === 'Active' && <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
              {allowlistStatus === 'Closed' && <Lock className="w-3.5 h-3.5 mr-1" />}
              {allowlistStatus === 'Not set' && <AlertCircle className="w-3.5 h-3.5 mr-1" />}
              {allowlistStatus}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-1.5">
            <span className="text-neutral-400 block font-medium">Current Onchain Root</span>
            <span className="font-mono text-neutral-200 text-[11px] break-all select-all">
              {hasOnchainRoot
                ? currentEvent.allowlistRoot
                : '0x0000000000000000000000000000000000000000000000000000000000000000 (Not set)'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 font-medium">Creator Timelock Window</span>
              <Clock className={`w-4 h-4 ${isTimelockExpired ? 'text-rose-400' : 'text-amber-400 animate-pulse'}`} />
            </div>
            <p className={`text-xs font-semibold ${isTimelockExpired ? 'text-rose-400 font-bold' : 'text-emerald-400'}`}>
              {countdownText}
            </p>
            {createdAtSec > 0 && (
              <p className="text-[10px] text-neutral-500">
                Deadline: {new Date(deadlineSec * 1000).toLocaleDateString()} at{' '}
                {new Date(deadlineSec * 1000).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3. Address Textarea, CSV Upload, & Parse Button */}
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
              Paste Ethereum addresses or upload a CSV / TXT file.
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
              {isCsvUploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
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
            placeholder="Paste wallet addresses, one per line..."
            value={rawInput}
            onChange={(e) => {
              setRawInput(e.target.value);
              setHasParsed(false);
            }}
            className="w-full p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-[#0052FF] focus:ring-1 focus:ring-[#0052FF] text-xs font-mono text-white placeholder-neutral-600 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
          />

          {/* Action Bar with Parse Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleParseAddresses}
              disabled={!rawInput.trim() || hasOnchainRoot || isTimelockExpired}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <FileCheck2 className="w-4 h-4 text-[#0052FF]" />
              <span>Parse Addresses</span>
            </button>

            {/* Validation Count Badges */}
            {hasParsed && (
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold text-[11px]">
                  <Check className="w-3 h-3 mr-1" />
                  {parsedAddresses.length} Valid {parsedAddresses.length === 1 ? 'Address' : 'Addresses'}
                </span>

                {ignoredLines.length > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold text-[11px]">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {ignoredLines.length} Invalid {ignoredLines.length === 1 ? 'line' : 'lines'} ignored
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 4. Merkle Root Display with Copy Button */}
        {hasParsed && parsedAddresses.length > 0 && (
          <div className="p-4 rounded-xl bg-neutral-950 border border-[#0052FF]/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#0052FF]">Computed Merkle Root:</span>
                <span className="text-[11px] text-neutral-400 font-mono">({parsedAddresses.length} leaves)</span>
              </div>
              <button
                type="button"
                onClick={handleCopyRoot}
                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-white font-medium transition-colors"
              >
                {copiedRoot ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
      {(submitError || writeError || eventReadError) && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="space-y-1">
            <p className="font-semibold text-rose-200">Execution Notice</p>
            <p className="leading-relaxed">
              {submitError || writeError?.message || eventReadError?.message}
            </p>
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
            The Merkle root is now verified onchain. Eligible attendees can claim their POAP with their cryptographic proof.
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

      {/* 7. Submit Button calling updateAllowlistRoot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-neutral-800 bg-neutral-900/30">
        <div className="text-xs text-neutral-400">
          {hasOnchainRoot ? (
            <span className="text-amber-400 font-medium">Root is already set onchain and immutable.</span>
          ) : isTimelockExpired ? (
            <span className="text-rose-400 font-medium">Window closed: Timelock has expired.</span>
          ) : !hasParsed ? (
            <span>Click &ldquo;Parse Addresses&rdquo; before setting allowlist.</span>
          ) : (
            <span>Ready to commit {parsedAddresses.length} addresses to Base Sepolia.</span>
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
            !hasParsed ||
            parsedAddresses.length === 0 ||
            !isCreator
          }
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0052FF] hover:bg-blue-600 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#0052FF]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isWritePending || isTxConfirming ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{isWritePending ? 'Confirming in Wallet...' : 'Setting Allowlist on Base...'}</span>
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

      {/* 8. Proof Distribution Table (Shown after root is set or generated) */}
      {(hasOnchainRoot || (hasParsed && parsedAddresses.length > 0)) && (
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
                <code className="text-[#0052FF]">allowlistMint</code>.
              </p>
            </div>

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
                  {filteredTableAddresses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-xs text-neutral-500 font-sans">
                        {parsedAddresses.length === 0
                          ? 'Paste and parse addresses above to generate proofs.'
                          : 'No matching addresses found in table search.'}
                      </td>
                    </tr>
                  ) : (
                    filteredTableAddresses.slice(0, 100).map((addr, idx) => {
                      const proof = proofs[addr.toLowerCase()] || [];
                      const isCopied = copiedProofAddr === addr;
                      return (
                        <tr key={addr} className="hover:bg-neutral-900/50 transition-colors">
                          <td className="px-4 py-3 text-neutral-500 font-mono text-[11px]">{idx + 1}</td>
                          <td className="px-4 py-3 text-white font-medium">
                            <span className="hidden sm:inline">{addr}</span>
                            <span className="sm:hidden">{shortenAddress(addr, 6)}</span>
                          </td>
                          <td className="px-4 py-3 text-neutral-400 text-[11px]">{proof.length} hashes</td>
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
                    })
                  )}
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
}

// ==========================================
// 5. Default Exported Component wrapped in
//    Suspense Boundary & Error Boundary
// ==========================================
export function AllowlistManager(props: AllowlistManagerProps) {
  return (
    <AllowlistErrorBoundary>
      <Suspense
        fallback={
          <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="p-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-[#0052FF] animate-spin mx-auto" />
              <h3 className="text-base font-bold text-white">Loading Allowlist Studio...</h3>
              <p className="text-xs text-neutral-400">Preparing cryptographic Merkle engine.</p>
            </div>
          </div>
        }
      >
        <AllowlistStudioInner {...props} />
      </Suspense>
    </AllowlistErrorBoundary>
  );
}

export default AllowlistManager;
