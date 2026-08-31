import React, { useState } from 'react';
import { POAP_CONTRACT_ADDRESS, BASE_SEPOLIA_CHAIN_ID, BASE_SEPOLIA_EXPLORER, ONCHAIN_POAPS_ABI } from '../types/contract';
import {
  BookOpen,
  Sparkles,
  ShieldCheck,
  Lock,
  Globe,
  Users,
  KeyRound,
  Code,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  FileCode,
  Layers,
} from 'lucide-react';

export const DocsSection: React.FC = () => {
  const [copiedAbi, setCopiedAbi] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);
  const [activeDocTab, setActiveDocTab] = useState<'organizer' | 'developer' | 'errors' | 'abi'>('organizer');

  const handleCopyAbi = () => {
    navigator.clipboard.writeText(JSON.stringify(ONCHAIN_POAPS_ABI, null, 2));
    setCopiedAbi(true);
    setTimeout(() => setCopiedAbi(false), 2000);
  };

  const handleCopyContract = () => {
    navigator.clipboard.writeText(POAP_CONTRACT_ADDRESS);
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0052FF]/10 border border-[#0052FF]/30 text-[#0052FF] text-xs font-semibold mb-2">
          <BookOpen className="w-3.5 h-3.5" />
          <span>Documentation & Architecture</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Onchain POAPs Protocol Docs</h2>
        <p className="text-xs sm:text-sm text-[#888888] mt-1">
          Complete guide for event organizers, smart contract developers, and Farcaster mini-app integrations.
        </p>
      </div>

      {/* Nav tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl glass border-[#262626] text-xs font-semibold">
        <button
          onClick={() => setActiveDocTab('organizer')}
          className={`flex-1 py-2 rounded-lg transition-colors ${
            activeDocTab === 'organizer' ? 'bg-[#0052FF] text-white shadow-sm' : 'text-[#888888] hover:text-white'
          }`}
        >
          Organizer Guide
        </button>
        <button
          onClick={() => setActiveDocTab('developer')}
          className={`flex-1 py-2 rounded-lg transition-colors ${
            activeDocTab === 'developer' ? 'bg-[#0052FF] text-white shadow-sm' : 'text-[#888888] hover:text-white'
          }`}
        >
          Smart Contract Specs
        </button>
        <button
          onClick={() => setActiveDocTab('errors')}
          className={`flex-1 py-2 rounded-lg transition-colors ${
            activeDocTab === 'errors' ? 'bg-[#0052FF] text-white shadow-sm' : 'text-[#888888] hover:text-white'
          }`}
        >
          Revert Errors
        </button>
        <button
          onClick={() => setActiveDocTab('abi')}
          className={`flex-1 py-2 rounded-lg transition-colors ${
            activeDocTab === 'abi' ? 'bg-[#0052FF] text-white shadow-sm' : 'text-[#888888] hover:text-white'
          }`}
        >
          Contract ABI
        </button>
      </div>

      {/* Tab 1: Organizer Guide */}
      {activeDocTab === 'organizer' && (
        <div className="space-y-6 text-sm text-neutral-300">
          <div className="p-6 rounded-2xl glass border-[#262626] space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#0052FF]" />
              <span>1. Creating an Onchain POAP</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#888888] leading-relaxed">
              To host an event badge on Base Sepolia, navigate to <strong>Create POAP</strong>. Fill out the event details, choose or customize an SVG emblem, and configure the permissions bitmask. Once submitted, your event ID will be permanently registered onchain.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
                <span className="font-bold text-white">Event Name & Date</span>
                <p className="text-[#888888]">Stored onchain in the event struct, visible on explorers and marketplaces.</p>
              </div>
              <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
                <span className="font-bold text-white">SVG Image String</span>
                <p className="text-[#888888]">Pure vector code optimized with SVGO and stored directly onchain.</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl glass border-[#262626] space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <span>2. The 3 Minting Mechanisms</span>
            </h3>
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-[#121212] border border-[#262626] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span>Public Mint (`mint(eventId)`)</span>
                </div>
                <p className="text-xs text-[#888888]">
                  When <code className="text-neutral-300 font-mono">isPublic == true</code>, any connected wallet can claim 1 token. You can toggle public minting on or off during the <code className="text-neutral-300 font-mono">CREATOR_TIMELOCK</code> period.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#121212] border border-[#262626] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-white">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>Allowlist Mint (`allowlistMint(eventId, merkleProof)`)</span>
                </div>
                <p className="text-xs text-[#888888]">
                  The organizer hashes an address list into a 32-byte Merkle root. When attendees claim, their client provides the cryptographic proof verifying their address is inside the root without revealing the whole list.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#121212] border border-[#262626] space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-white">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Signature Mint (`mintWithSignature(eventId, signature)`)</span>
                </div>
                <p className="text-xs text-[#888888]">
                  Ideal for live in-person events or secret drops. The creator signs an authorization hash with their wallet. Attendees scan a QR code with the pre-filled signature to claim.
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl glass border-[#262626] space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span>3. Timelocks & Deadlines</span>
            </h3>
            <p className="text-xs sm:text-sm text-[#888888] leading-relaxed">
              The smart contract exposes a view function <code className="text-amber-400 font-mono">CREATOR_TIMELOCK()</code> (typically 30 days). Creators have full control to toggle public status, update allowlists, or issue signatures before <code className="text-neutral-300 font-mono">createdAt + CREATOR_TIMELOCK</code> expires.
            </p>
          </div>
        </div>
      )}

      {/* Tab 2: Developer Specs */}
      {activeDocTab === 'developer' && (
        <div className="space-y-6 text-xs sm:text-sm text-neutral-300">
          <div className="p-6 rounded-2xl glass border-[#262626] space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-[#0052FF]" />
              <span>uint8 Flags Bitmask Specification</span>
            </h3>
            <p className="text-xs text-[#888888]">
              The contract compresses boolean configurations into a single byte (<code className="text-neutral-300 font-mono">uint8 flags</code>) to minimize deployment gas costs:
            </p>
            <div className="p-4 rounded-xl bg-[#121212] border border-[#262626] font-mono text-xs space-y-2">
              <div className="flex justify-between text-[#888888]">
                <span>Bit 0 (0b00000001 = 1):</span>
                <span className="text-emerald-400">isPublic (true = open mint enabled)</span>
              </div>
              <div className="flex justify-between text-[#888888]">
                <span>Bit 1 (0b00000010 = 2):</span>
                <span className="text-amber-400">isSoulbound (true = non-transferable token)</span>
              </div>
              <div className="flex justify-between text-[#888888] pt-2 border-t border-[#262626]">
                <span>Value 3 (0b00000011):</span>
                <span className="text-white">Public Mint + Soulbound</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl glass border-[#262626] space-y-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>Contract Architecture & Addresses</span>
            </h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="p-3 rounded-xl bg-[#121212] border border-[#262626] flex items-center justify-between">
                <span className="text-[#888888]">Base Sepolia Contract:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white">{POAP_CONTRACT_ADDRESS}</span>
                  <button onClick={handleCopyContract} className="hover:text-[#0052FF]">
                    {copiedContract ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#121212] border border-[#262626] flex items-center justify-between">
                <span className="text-[#888888]">Chain ID:</span>
                <span className="text-white">84532 (Base Sepolia)</span>
              </div>
              <div className="p-3 rounded-xl bg-[#121212] border border-[#262626] flex items-center justify-between">
                <span className="text-[#888888]">Standard:</span>
                <span className="text-white">ERC-1155 Multi-Token (with Soulbound override)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Revert Errors Reference */}
      {activeDocTab === 'errors' && (
        <div className="rounded-2xl glass border-[#262626] p-6 space-y-4">
          <h3 className="text-base font-bold text-white">Smart Contract Custom Error Reference</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
              <code className="font-bold text-red-400">POAP__AlreadyClaimed()</code>
              <p className="text-[#888888]">Caller has already claimed a token for this event ID.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
              <code className="font-bold text-red-400">POAP__EventNotPublic()</code>
              <p className="text-[#888888]">Attempted <code className="text-neutral-300">mint()</code> when <code className="text-neutral-300">isPublic == false</code>.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
              <code className="font-bold text-red-400">POAP__AllowlistNotEnabled()</code>
              <p className="text-[#888888]">Called <code className="text-neutral-300">allowlistMint()</code> with an unset/zero Merkle root.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
              <code className="font-bold text-red-400">ECDSAInvalidSignature()</code>
              <p className="text-[#888888]">Cryptographic signature recovery did not match the event creator.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
              <code className="font-bold text-red-400">POAP__SoulboundNotTransferable()</code>
              <p className="text-[#888888]">Blocked ERC-1155 transfer on a token marked soulbound.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-[#121212] border border-[#262626] space-y-1">
              <code className="font-bold text-red-400">POAP__TimeLockExpired()</code>
              <p className="text-[#888888]">Action attempted after <code className="text-neutral-300">createdAt + CREATOR_TIMELOCK</code>.</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: ABI */}
      {activeDocTab === 'abi' && (
        <div className="rounded-2xl glass border-[#262626] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-[#0052FF]" />
              <span>Exact Onchain POAPs ABI</span>
            </h3>
            <button
              onClick={handleCopyAbi}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1A1A1A] hover:bg-[#262626] text-xs font-semibold text-neutral-200 transition-colors border border-[#262626]"
            >
              {copiedAbi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedAbi ? 'Copied ABI' : 'Copy ABI'}</span>
            </button>
          </div>
          <pre className="max-h-96 overflow-y-auto p-4 rounded-xl bg-[#121212] border border-[#262626] font-mono text-[11px] text-neutral-300 leading-relaxed">
            {JSON.stringify(ONCHAIN_POAPS_ABI, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
