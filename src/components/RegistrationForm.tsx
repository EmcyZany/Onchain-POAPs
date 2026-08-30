import React, { useState, useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { BASE_SEPOLIA_CHAIN_ID, BASE_SEPOLIA_EXPLORER } from '../types/contract';
import { computeFlags, getFlagBitBreakdown } from '../lib/bitmask';
import { sanitizeAndOptimizeSvg, POAP_BADGE_TEMPLATES, BadgeTemplate } from '../lib/svgOptimizer';
import { usePOAPContract } from '../hooks/usePOAPContract';
import {
  Sparkles,
  Upload,
  Lock,
  Globe,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Code,
  FileCode,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Palette,
} from 'lucide-react';

interface RegistrationFormProps {
  onSuccess: (eventId?: bigint) => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSuccess }) => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { registerEvent, isWritePending, isTxConfirming, isTxSuccess, txHash, txError } = usePOAPContract();

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    return today;
  });
  const [location, setLocation] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [allowlistRoot, setAllowlistRoot] = useState<string>(
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  );

  // Toggles
  const [isSoulbound, setIsSoulbound] = useState(true);
  const [isPublic, setIsPublic] = useState(true);

  // SVG Mode: 'template' | 'custom' | 'upload'
  const [svgMode, setSvgMode] = useState<'template' | 'custom' | 'upload'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<BadgeTemplate>(POAP_BADGE_TEMPLATES[0]);
  const [badgeColor, setBadgeColor] = useState('#0052FF');
  const [rawSvgInput, setRawSvgInput] = useState('');

  // Computed flags
  const flagBreakdown = getFlagBitBreakdown(isPublic, isSoulbound);

  // Current active SVG
  const currentSvg = React.useMemo(() => {
    if (svgMode === 'template') {
      const dateDisplay = eventDate || '2026';
      return selectedTemplate.generateSvg(name || 'BASE EVENT', dateDisplay, badgeColor);
    }
    return rawSvgInput;
  }, [svgMode, selectedTemplate, name, eventDate, badgeColor, rawSvgInput]);

  const optimized = React.useMemo(() => {
    return sanitizeAndOptimizeSvg(currentSvg);
  }, [currentSvg]);

  // Handle file drop / upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setRawSvgInput(text);
          setSvgMode('custom');
        }
      };
      reader.readAsText(file);
    }
  };

  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isConnected) {
      setFormError('Please connect your Web3 wallet first.');
      return;
    }

    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      try {
        await switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID });
      } catch {
        setFormError('Please switch network to Base Sepolia.');
        return;
      }
    }

    if (!name.trim()) {
      setFormError('POAP Name is required.');
      return;
    }

    if (!optimized.isValid || !optimized.optimizedSvg) {
      setFormError(optimized.errorMessage || 'Please provide a valid SVG image.');
      return;
    }

    // Check size limit: onchain raw SVGs shouldn't exceed ~24KB for reasonable gas
    if (optimized.optimizedSize > 24576) {
      setFormError(`SVG size is too large (${(optimized.optimizedSize / 1024).toFixed(1)} KB). Please simplify to under 24 KB for gas optimization.`);
      return;
    }

    try {
      const dateTimestamp = eventDate ? BigInt(Math.floor(new Date(eventDate).getTime() / 1000)) : BigInt(Math.floor(Date.now() / 1000));
      const rootHex = allowlistRoot.startsWith('0x') && allowlistRoot.length === 66 ? (allowlistRoot as `0x${string}`) : '0x0000000000000000000000000000000000000000000000000000000000000000';
      const flagsUint8 = computeFlags(isPublic, isSoulbound);

      await registerEvent({
        name: name.trim(),
        description: description.trim(),
        eventDate: dateTimestamp,
        location: location.trim(),
        allowlistRoot: rootHex,
        svgImage: optimized.optimizedSvg,
        externalUrl: externalUrl.trim(),
        flags: flagsUint8,
      });
    } catch (err: any) {
      console.error('Registration failed:', err);
      setFormError(err?.message || 'Transaction was rejected or failed.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0052FF]/10 border border-[#0052FF]/30 text-[#0052FF] text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Register POAP Event</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Register POAP Event</h2>
        <p className="text-sm text-[#888888] mt-1">
          Mint your achievements directly on Base with gas-optimized onchain SVGs.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Form Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Section 1: Basic Details */}
          <div className="glass rounded-2xl p-6 space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0052FF] text-xs font-mono font-bold text-white">1</span>
              <span>Event Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Event Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="poap-name-input"
                  type="text"
                  required
                  placeholder="e.g. Base Buildathon 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</label>
                <textarea
                  id="poap-description-input"
                  rows={2}
                  placeholder="Official digital collectible for participants and builders on Base."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Event Date</label>
                <input
                  id="poap-date-input"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Location</label>
                <input
                  id="poap-location-input"
                  type="text"
                  placeholder="Global Virtual / Denver, CO"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">External URL / Project Link</label>
                <input
                  id="poap-url-input"
                  type="url"
                  placeholder="https://warpcast.com/... or https://base.org"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Bitmask Flags & Minting Policies */}
          <div className="glass rounded-2xl p-6 space-y-5">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0052FF] text-xs font-mono font-bold text-white">2</span>
              <span>Permissions & Flags</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 glass rounded-xl">
              {/* Public Mint Toggle */}
              <div
                onClick={() => setIsPublic(!isPublic)}
                className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">Public Minting</p>
                  <p className="text-xs text-[#888888]">Allow anyone to mint</p>
                </div>
                <div className={`toggle-pill ${isPublic ? 'active' : ''}`}>
                  <div className="toggle-dot" />
                </div>
              </div>

              {/* Soulbound Toggle */}
              <div
                onClick={() => setIsSoulbound(!isSoulbound)}
                className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-white">Soulbound</p>
                  <p className="text-xs text-[#888888]">Non-transferable token</p>
                </div>
                <div className={`toggle-pill ${isSoulbound ? 'active' : ''}`}>
                  <div className="toggle-dot" />
                </div>
              </div>
            </div>

            {/* Computed flags bar */}
            <div className="bg-[#0052FF]/10 border border-[#0052FF]/20 p-3 rounded-lg flex items-center justify-between">
              <span className="text-xs text-blue-400 font-mono">
                Computed flags (uint8): <strong className="text-white">{flagBreakdown.totalDecimal}</strong> ({flagBreakdown.binaryString})
              </span>
              <span className="text-[10px] text-[#888888] italic">Bit 0 (Public) + Bit 1 (Soulbound)</span>
            </div>

            {/* Optional Merkle Allowlist Root */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Allowlist Root (Optional)</label>
                <span className="text-[11px] text-[#888888]">Can update within 30 days</span>
              </div>
              <input
                type="text"
                placeholder="0x0000000000000000000000000000000000000000000000000000000000000000"
                value={allowlistRoot}
                onChange={(e) => setAllowlistRoot(e.target.value)}
                className="input-field font-mono text-xs"
              />
            </div>
          </div>

          {/* Section 3: SVG Badge Generator & Optimizer */}
          <div className="glass rounded-2xl p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#0052FF] text-xs font-mono font-bold text-white">3</span>
                <span>Artwork Code</span>
              </h3>

              {/* Mode Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[#1A1A1A] border border-[#262626] text-xs">
                <button
                  type="button"
                  onClick={() => setSvgMode('template')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    svgMode === 'template' ? 'bg-[#0052FF] text-white' : 'text-[#888888] hover:text-white'
                  }`}
                >
                  Generator
                </button>
                <button
                  type="button"
                  onClick={() => setSvgMode('custom')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    svgMode === 'custom' ? 'bg-[#0052FF] text-white' : 'text-[#888888] hover:text-white'
                  }`}
                >
                  Raw SVG
                </button>
                <button
                  type="button"
                  onClick={() => setSvgMode('upload')}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    svgMode === 'upload' ? 'bg-[#0052FF] text-white' : 'text-[#888888] hover:text-white'
                  }`}
                >
                  Upload
                </button>
              </div>
            </div>

            {svgMode === 'template' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Choose Badge Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {POAP_BADGE_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => setSelectedTemplate(tmpl)}
                        className={`p-3 rounded-xl text-left border text-xs transition-all ${
                          selectedTemplate.id === tmpl.id
                            ? 'bg-[#0052FF]/10 border-[#0052FF] text-white'
                            : 'bg-[#1A1A1A] border-[#262626] text-[#888888] hover:border-neutral-700'
                        }`}
                      >
                        <p className="font-bold text-white">{tmpl.name}</p>
                        <p className="text-[11px] text-[#888888] mt-0.5">{tmpl.category}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-400" />
                    <span>Theme Accent Color</span>
                  </label>
                  <div className="flex items-center gap-3">
                    {['#0052FF', '#F43F5E', '#10B981', '#EAB308', '#8B5CF6', '#EC4899'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBadgeColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-full transition-transform ${
                          badgeColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                        }`}
                      />
                    ))}
                    <input
                      type="color"
                      value={badgeColor}
                      onChange={(e) => setBadgeColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                  </div>
                </div>
              </div>
            )}

            {svgMode === 'custom' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Paste Raw &lt;svg&gt; Code</label>
                <textarea
                  rows={6}
                  placeholder="<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'>...</svg>"
                  value={rawSvgInput}
                  onChange={(e) => setRawSvgInput(e.target.value)}
                  className="input-field font-mono text-xs"
                />
              </div>
            )}

            {svgMode === 'upload' && (
              <div className="p-6 rounded-2xl border-2 border-dashed border-[#262626] hover:border-[#0052FF]/50 bg-[#1A1A1A] text-center space-y-3">
                <Upload className="w-8 h-8 text-[#888888] mx-auto" />
                <div>
                  <p className="text-sm font-semibold text-white">Upload SVG File</p>
                  <p className="text-xs text-[#888888] mt-0.5">Drag & drop or browse from your computer</p>
                </div>
                <input
                  type="file"
                  accept=".svg"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="svg-file-input"
                />
                <label
                  htmlFor="svg-file-input"
                  className="inline-block px-4 py-2 rounded-lg bg-[#262626] hover:bg-neutral-700 text-xs font-semibold text-white cursor-pointer transition-colors"
                >
                  Select SVG File
                </label>
              </div>
            )}

            {/* Optimizer statistics */}
            <div className="p-3.5 rounded-xl bg-[#1A1A1A] border border-[#262626] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#888888] flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-[#0052FF]" />
                  <span>Optimized Payload Size:</span>
                </span>
                <span className="font-mono font-bold text-white">
                  {optimized.optimizedSize} bytes ({(optimized.optimizedSize / 1024).toFixed(2)} KB)
                </span>
              </div>
              {optimized.savingsPercentage > 0 && (
                <div className="flex items-center justify-between text-emerald-400 font-mono">
                  <span>Minification Savings:</span>
                  <span className="font-bold">{optimized.savingsPercentage}% reduced</span>
                </div>
              )}
            </div>
          </div>

          {/* Error message */}
          {formError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Success message with BaseScan link */}
          {isTxSuccess && txHash && (
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-base text-white">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>POAP Registered Successfully Onchain!</span>
              </div>
              <p className="text-xs text-neutral-300">
                Your POAP event is now live on the Base Sepolia blockchain. Attendees can mint it based on your configured permissions.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a
                  href={`${BASE_SEPOLIA_EXPLORER}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:underline"
                >
                  <span>View Transaction on BaseScan</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => onSuccess()}
                  className="px-3 py-1 rounded-lg bg-emerald-500/20 text-xs font-bold text-white hover:bg-emerald-500/30"
                >
                  Go to Explore
                </button>
              </div>
            </div>
          )}

          {/* Submit Action */}
          <div>
            <button
              id="submit-register-btn"
              type="submit"
              disabled={isWritePending || isTxConfirming}
              className="w-full bg-[#0052FF] hover:bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-[#0052FF]/25 transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
            >
              {isWritePending || isTxConfirming ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>{isWritePending ? 'Approve in Wallet...' : 'Confirming on Base Sepolia...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Register Event & Deploy Onchain</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side: Immersive Live Emblem Preview */}
        <div className="lg:col-span-5 flex flex-col sticky top-24">
          <div className="glass rounded-3xl p-8 flex flex-col items-center justify-center glow-blue relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="bg-[#0052FF]/20 text-[#0052FF] text-[10px] font-bold px-2 py-1 rounded border border-[#0052FF]/30">
                LIVE PREVIEW
              </span>
            </div>

            {/* Badge Ring */}
            <div className="badge-ring w-64 h-64 shadow-2xl shadow-blue-500/20 my-4 flex items-center justify-center">
              <div className="w-full h-full bg-black rounded-full flex flex-col items-center justify-center border-4 border-black relative overflow-hidden p-4">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/30 to-transparent pointer-events-none" />
                {optimized.dataUri ? (
                  <img
                    src={optimized.dataUri}
                    alt="POAP Live Preview"
                    className="w-40 h-40 object-contain drop-shadow-xl z-10"
                  />
                ) : (
                  <div className="text-center text-neutral-500 text-xs z-10 p-4">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[#888888]" />
                    <span>No valid SVG badge</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-0 right-0 text-center z-10">
                  <p className="text-[10px] font-mono tracking-widest text-[#888888] uppercase">BASE NETWORK</p>
                </div>
              </div>
            </div>

            <div className="mt-4 text-center space-y-1.5 w-full">
              <h3 className="text-xl font-bold text-white truncate px-4">
                {name || 'Base Buildathon 2026'}
              </h3>
              <p className="text-xs text-[#888888] px-4 line-clamp-2">
                {description || 'Official digital collectible for participants and builders on Base.'}
              </p>
            </div>

            <div className="w-full mt-6 pt-6 border-t border-[#262626] grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-[10px] text-[#888888] uppercase font-semibold">Event Date</p>
                <p className="text-sm font-mono text-white mt-0.5">{eventDate || 'TBD'}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-[#888888] uppercase font-semibold">Type</p>
                <p className="text-sm font-mono text-blue-400 mt-0.5">
                  {isSoulbound ? 'Soulbound' : 'Transferable'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
