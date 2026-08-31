import React, { useState, useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount, useConnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig, baseSepolia } from './lib/wagmi';
import { useFarcasterFrame } from './hooks/useFarcasterFrame';

import { usePOAPContract } from './hooks/usePOAPContract';
import { POAPEvent } from './types/contract';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { POAPCard } from './components/POAPCard';
import { RegistrationForm } from './components/RegistrationForm';
import { MintInterface } from './components/MintInterface';
import { AllowlistManager } from './components/AllowlistManager';
import { SignatureStudio } from './components/SignatureStudio';
import { GalleryView } from './components/GalleryView';
import { DocsSection } from './components/DocsSection';
import { POAPDetailModal } from './components/POAPDetailModal';
import { BrandLogo } from './components/BrandLogo';
import { parseSignatureQueryParams } from './lib/signatures';
import {
  Search,
  Filter,
  Sparkles,
  Award,
  Layers,
  Globe,
  RefreshCw,
  SlidersHorizontal,
  Compass,
  PlusCircle,
  Users,
  KeyRound,
  BookOpen,
} from 'lucide-react';

const queryClient = new QueryClient();

export function MainAppContent() {
  const { isMiniApp, user, isReady } = useFarcasterFrame();
  const { isConnected, address } = useAccount();
  const { connectors, connect } = useConnect();
  const { events, isLoadingEvents, creatorTimelock, refetchEvents } = usePOAPContract();

  // Navigation State
  const [activeTab, setActiveTab] = useState<
    'explore' | 'register' | 'mint' | 'manage' | 'signatures' | 'gallery' | 'docs'
  >('explore');

  // Selected event for Mint / Manage / Detail Modal
  const [selectedEvent, setSelectedEvent] = useState<POAPEvent | null>(null);
  const [detailEvent, setDetailEvent] = useState<POAPEvent | null>(null);

  // Filters for Explore
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'public' | 'soulbound' | 'allowlist'>('all');

  // Auto-connect ONLY within Farcaster Mini App environment (Web app remains strictly manual)
  useEffect(() => {
    if (isMiniApp && !isConnected && connectors && connectors.length > 0) {
      const farcasterConnector = connectors.find(
        (c) => c.id === 'farcaster' || c.name.toLowerCase().includes('farcaster')
      );
      if (farcasterConnector) {
        connect(
          { connector: farcasterConnector, chainId: baseSepolia.id },
          {
            onError: (err) => {
              console.warn('Farcaster wallet auto-connect notice:', err.message);
            },
          }
        );
      }
    }
  }, [isMiniApp, isConnected, connectors, connect]);

  // Handle URL params for direct linking (e.g. from QR codes or Farcaster casts)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab');
      const eventIdStr = params.get('id') || params.get('eventId');
      const sig = params.get('sig');

      if (urlTab && ['explore', 'register', 'mint', 'manage', 'signatures', 'gallery', 'docs'].includes(urlTab)) {
        setActiveTab(urlTab as any);
      }

      if (eventIdStr && events.length > 0) {
        const found = events.find((e) => e.id.toString() === eventIdStr);
        if (found) {
          setSelectedEvent(found);
          if (sig) {
            setActiveTab('mint');
          }
        }
      }
    }
  }, [events]);

  // Filtered explore list
  const filteredEvents = React.useMemo(() => {
    return events.filter((ev) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = ev.name.toLowerCase().includes(q);
        const matchDesc = (ev.description || '').toLowerCase().includes(q);
        const matchLoc = (ev.location || '').toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchLoc) return false;
      }
      // Type Filter
      if (typeFilter === 'public' && !ev.isPublic) return false;
      if (typeFilter === 'soulbound' && !ev.isSoulbound) return false;
      if (typeFilter === 'allowlist') {
        const hasRoot = ev.allowlistRoot && ev.allowlistRoot !== '0x0000000000000000000000000000000000000000000000000000000000000000';
        if (!hasRoot) return false;
      }
      return true;
    });
  }, [events, searchQuery, typeFilter]);

  const handleMintClick = (event: POAPEvent) => {
    setSelectedEvent(event);
    setActiveTab('mint');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleManageClick = (event: POAPEvent) => {
    setSelectedEvent(event);
    setActiveTab('manage');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDetailClick = (event: POAPEvent) => {
    setDetailEvent(event);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 flex flex-col font-sans selection:bg-[#0052FF] selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMiniApp={isMiniApp}
        farcasterUser={user}
      />

      {/* Main View Body */}
      <main className="flex-1 pb-16">
        {/* TAB 1: EXPLORE */}
        {activeTab === 'explore' && (
          <div>
            <Hero
              totalEvents={events.length}
              isLoading={isLoadingEvents}
              onExploreClick={() => {
                const el = document.getElementById('explore-catalog');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onCreateClick={() => setActiveTab('register')}
            />

            <div id="explore-catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
              {/* Filter and Search Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
                    <Compass className="w-5 h-5 text-[#0052FF]" />
                    <span>Explore Onchain Events</span>
                  </h2>
                  <p className="text-xs text-[#888888] mt-0.5">
                    Browse active POAPs, verify eligibility, and claim attendance badges on Base Sepolia.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Search */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-[#888888] absolute left-3 top-2.5" />
                    <input
                      id="search-events-input"
                      type="text"
                      placeholder="Search events, city, name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#121212] border border-[#262626] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#0052FF] transition-colors"
                    />
                  </div>

                  {/* Filter tabs */}
                  <div className="flex items-center gap-1 p-1 rounded-lg bg-[#121212] border border-[#262626] text-xs">
                    <button
                      onClick={() => setTypeFilter('all')}
                      className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                        typeFilter === 'all' ? 'bg-[#0052FF] text-white' : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setTypeFilter('public')}
                      className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                        typeFilter === 'public' ? 'bg-[#0052FF] text-white' : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      Public
                    </button>
                    <button
                      onClick={() => setTypeFilter('soulbound')}
                      className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                        typeFilter === 'soulbound' ? 'bg-[#0052FF] text-white' : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      Soulbound
                    </button>
                    <button
                      onClick={() => setTypeFilter('allowlist')}
                      className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                        typeFilter === 'allowlist' ? 'bg-[#0052FF] text-white' : 'text-[#888888] hover:text-white'
                      }`}
                    >
                      Allowlist
                    </button>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {isLoadingEvents && (
                <div className="py-20 flex flex-col items-center justify-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-[#0052FF] animate-spin" />
                  <p className="text-sm text-[#888888] font-medium">Fetching onchain POAP registry...</p>
                </div>
              )}

              {/* Empty State */}
              {!isLoadingEvents && filteredEvents.length === 0 && (
                <div className="py-16 px-4 rounded-3xl glass text-center max-w-md mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#0052FF]/10 border border-[#0052FF]/20 flex items-center justify-center mx-auto text-[#0052FF]">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">No Events Found</h3>
                    <p className="text-xs text-[#888888]">
                      Try adjusting your search criteria or register a new event.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('register')}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0052FF] hover:bg-blue-600 text-white text-xs font-semibold transition-all shadow-md shadow-[#0052FF]/20"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Create First POAP</span>
                  </button>
                </div>
              )}

              {/* Events Cards Grid */}
              {!isLoadingEvents && filteredEvents.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {filteredEvents.map((ev) => (
                    <POAPCard
                      key={ev.id.toString()}
                      event={ev}
                      userAddress={address}
                      onMintClick={handleMintClick}
                      onManageClick={handleManageClick}
                      onDetailClick={handleDetailClick}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'register' && (
          <RegistrationForm
            onSuccess={() => {
              refetchEvents();
              setActiveTab('explore');
            }}
          />
        )}

        {/* TAB 3: MINT */}
        {activeTab === 'mint' && (
          <div>
            {selectedEvent ? (
              <MintInterface
                event={selectedEvent}
                onSuccess={() => {
                  refetchEvents();
                }}
              />
            ) : events.length > 0 ? (
              <MintInterface
                event={events[0]}
                onSuccess={() => {
                  refetchEvents();
                }}
              />
            ) : (
              <div className="max-w-md mx-auto py-20 text-center space-y-4">
                <p className="text-sm text-[#888888]">No event selected. Please choose an event to mint.</p>
                <button
                  onClick={() => setActiveTab('explore')}
                  className="px-4 py-2 rounded-lg bg-[#0052FF] text-white text-xs font-bold"
                >
                  Go to Explore
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MANAGE (ALLOWLIST / CREATOR CONTROLS) */}
        {activeTab === 'manage' && (
          <div>
            {selectedEvent ? (
              <AllowlistManager
                event={selectedEvent}
                creatorTimelock={creatorTimelock}
                onSuccess={() => {
                  refetchEvents();
                }}
              />
            ) : events.length > 0 ? (
              <AllowlistManager
                event={events[0]}
                creatorTimelock={creatorTimelock}
                onSuccess={() => {
                  refetchEvents();
                }}
              />
            ) : (
              <div className="max-w-md mx-auto py-20 text-center space-y-4">
                <p className="text-sm text-[#888888]">No event selected for management.</p>
                <button
                  onClick={() => setActiveTab('explore')}
                  className="px-4 py-2 rounded-lg bg-[#0052FF] text-white text-xs font-bold"
                >
                  Go to Explore
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SIGNATURES / QR STUDIO */}
        {activeTab === 'signatures' && (
          <SignatureStudio
            events={events}
            selectedEventId={selectedEvent?.id}
            onNavigateToEvent={(id) => {
              const target = events.find((e) => e.id === id);
              if (target) {
                setSelectedEvent(target);
                setActiveTab('mint');
              }
            }}
          />
        )}

        {/* TAB 6: MY POAPS (GALLERY) */}
        {activeTab === 'gallery' && (
          <GalleryView
            onNavigateToExplore={() => setActiveTab('explore')}
            onSelectPoap={(event) => {
              setDetailEvent(event);
            }}
          />
        )}

        {/* TAB 7: DOCS */}
        {activeTab === 'docs' && <DocsSection />}
      </main>

      {/* POAP Detail Modal */}
      {detailEvent && (
        <POAPDetailModal
          event={detailEvent}
          userAddress={address}
          creatorTimelock={creatorTimelock}
          onClose={() => setDetailEvent(null)}
          onMintClick={handleMintClick}
          onAllowlistClick={handleManageClick}
          onSignatureClick={(ev) => {
            setSelectedEvent(ev);
            setActiveTab('signatures');
          }}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-[#262626] bg-[#050505] py-8 px-4 sm:px-6 lg:px-8 text-xs text-[#888888]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" variant="horizontal" />
            <span className="text-[#888888] font-mono text-[11px]">• Base Sepolia</span>
          </div>

          <div className="flex items-center gap-4 text-[#888888]">
            <button onClick={() => setActiveTab('docs')} className="hover:text-white transition-colors">
              Documentation
            </button>
            <a
              href="https://github.com/jvaleskadevs/onchain-poaps"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub Contract
            </a>
            <a
              href="https://farcaster.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-purple-400 transition-colors"
            >
              Farcaster
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    sdk.actions.ready().catch(() => {});
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          modalSize="compact"
          showRecentTransactions={true}
          theme={darkTheme({
            accentColor: '#0052FF',
            accentColorForeground: 'white',
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
        >
          <MainAppContent />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
