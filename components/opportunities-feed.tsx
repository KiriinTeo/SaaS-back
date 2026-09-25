'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { OddsPayload, getBookmakerInfo, BOOKMAKERS } from '@/lib/sports';
import { playNotificationSound } from '@/lib/audio';
import {
  Zap,
  Sparkles,
  Clock,
  Flame,
  Trophy,
  Search,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Layers,
  ArrowUpDown,
  RotateCcw,
  X,
  Radio
} from 'lucide-react';

type FeatureFilter = 'early_payout' | 'super_odd';
type SortOption =
  | 'relevance'
  | 'newest'
  | 'highest_odd'
  | 'lowest_odd'
  | 'match_asc'
  | 'league_asc'
  | 'bookmaker_asc';

function formatOdd(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : 'N/A';
}

function getOutcomeOdd(item: OddsPayload, outcome: 'home' | 'draw' | 'away'): number | string | null | undefined {
  if (outcome === 'home') {
    return (
      item.home_team_odd ??
      item.home_odd ??
      (item.selection?.toLowerCase() === item.home_team.toLowerCase() ? item.odd : undefined)
    );
  }
  if (outcome === 'away') {
    return (
      item.away_team_odd ??
      item.away_odd ??
      (item.selection?.toLowerCase() === item.away_team.toLowerCase() ? item.odd : undefined)
    );
  }
  return (
    item.draw ??
    item.draw_odd ??
    (item.selection?.toLowerCase() === 'draw' || item.selection?.toLowerCase() === 'empate'
      ? item.odd
      : undefined)
  );
}

function getHighestOdd(item: OddsPayload): number {
  const oddsList = [
    getOutcomeOdd(item, 'home'),
    getOutcomeOdd(item, 'draw'),
    getOutcomeOdd(item, 'away')
  ]
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((v) => Number.isFinite(v) && v > 0);

  return oddsList.length > 0 ? Math.max(...oddsList) : 0;
}

function getLowestOdd(item: OddsPayload): number {
  const oddsList = [
    getOutcomeOdd(item, 'home'),
    getOutcomeOdd(item, 'draw'),
    getOutcomeOdd(item, 'away')
  ]
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((v) => Number.isFinite(v) && v > 0);

  return oddsList.length > 0 ? Math.min(...oddsList) : 9999;
}

function getLeague(item: OddsPayload): string {
  return item.league || item.competition || item.market_type || 'Geral';
}

function getTimestamp(item: OddsPayload): number {
  const timestamp = item.timestamp ? Date.parse(item.timestamp) : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return 'Ao vivo';
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 10) return 'Agora';
  if (diffSeconds < 60) return `há ${diffSeconds}s`;
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `há ${diffMinutes}m`;
  return `${Math.floor(diffMinutes / 60)}h atrás`;
}

// Minimal placeholder icon or loaded logo component
// User can place custom SVG/PNG files into /public/assets/houses/${slug}.svg
function BookmakerLogo({
  slug,
  name,
  className = 'w-7 h-7'
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const normalizedSlug = slug.toLowerCase().trim();
  const info = getBookmakerInfo(normalizedSlug);

  // Distinct monogram & accent colors for fallback placeholders
  const monograms: Record<string, { initials: string; bg: string; text: string }> = {
    superbet: { initials: 'SB', bg: 'from-red-600 to-rose-700', text: 'text-white' },
    betano: { initials: 'BT', bg: 'from-orange-500 to-amber-600', text: 'text-white' },
    stake: { initials: 'ST', bg: 'from-emerald-500 to-teal-700', text: 'text-white' },
    novibet: { initials: 'NV', bg: 'from-blue-600 to-cyan-700', text: 'text-white' },
    vaidebet: { initials: 'VB', bg: 'from-amber-400 to-yellow-600', text: 'text-slate-950 font-black' },
    kto: { initials: 'KT', bg: 'from-red-500 to-orange-600', text: 'text-white' },
    betnacional: { initials: 'BN', bg: 'from-cyan-500 to-blue-600', text: 'text-white' },
    betfair: { initials: 'BF', bg: 'from-yellow-400 to-amber-500', text: 'text-slate-950 font-black' },
    sportingbet: { initials: 'SP', bg: 'from-sky-500 to-blue-600', text: 'text-white' }
  };

  const mono = monograms[normalizedSlug] || {
    initials: name.slice(0, 2).toUpperCase(),
    bg: 'from-emerald-700 to-teal-900',
    text: 'text-emerald-200'
  };

  if (!imgError && info.logo) {
    return (
      <img
        src={info.logo}
        alt={name}
        className={`${className} object-contain rounded-md`}
        onError={() => setImgError(true)}
      />
    );
  }

  // Stylish SVG placeholder badge
  return (
    <div
      className={`${className} rounded-lg bg-gradient-to-br ${mono.bg} flex items-center justify-center font-extrabold text-[11px] tracking-wider shadow-inner ${mono.text}`}
      title={name}
    >
      {mono.initials}
    </div>
  );
}

export function OpportunitiesFeed() {
  const [odds, setOdds] = useState<OddsPayload[]>([]);
  const [featureFilters, setFeatureFilters] = useState<FeatureFilter[]>([]);
  const [bookmakerFilter, setBookmakerFilter] = useState<string>('all');
  const [leagueFilter, setLeagueFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const isMutedRef = useRef(isMuted);
  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // SSE Stream listener
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;
      eventSource?.close();
      eventSource = new EventSource('/api/stream');

      eventSource.onopen = () => {
        if (!isUnmounted) setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const newOdd: OddsPayload = JSON.parse(event.data);
          setLastUpdated(Date.now());
          setOdds((previousOdds) => {
            const existingIndex = previousOdds.findIndex(
              (item) =>
                (item.bookmaker || item.house) === (newOdd.bookmaker || newOdd.house) &&
                item.match_id === newOdd.match_id &&
                item.market_type === newOdd.market_type
            );
            if (existingIndex === -1 && !isMutedRef.current) {
              playNotificationSound();
            }
            if (existingIndex !== -1) {
              const updated = [...previousOdds];
              updated[existingIndex] = newOdd;
              return updated;
            }
            return [newOdd, ...previousOdds];
          });
        } catch (error) {
          console.error('Erro ao ler pacote SSE:', error);
        }
      };

      eventSource.onerror = () => {
        if (isUnmounted) return;
        setIsConnected(false);
        eventSource?.close();
        if (retryTimeout) clearTimeout(retryTimeout);
        retryTimeout = setTimeout(connect, 3000);
      };
    };

    connect();
    refreshInterval = setInterval(connect, 60_000);

    return () => {
      isUnmounted = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (refreshInterval) clearInterval(refreshInterval);
      eventSource?.close();
    };
  }, []);

  // Compute active bookmakers list with counts
  const bookmakerStats = useMemo(() => {
    const counts: Record<string, number> = {};
    odds.forEach((item) => {
      const house = (item.bookmaker || item.house || 'default').toLowerCase().trim();
      counts[house] = (counts[house] || 0) + 1;
    });

    // Merge default known bookmakers with any dynamic houses from stream
    const allSlugs = Array.from(new Set([...Object.keys(BOOKMAKERS), ...Object.keys(counts)])).filter(
      (slug) => slug !== 'default'
    );

    return allSlugs.map((slug) => ({
      slug,
      name: getBookmakerInfo(slug).name,
      count: counts[slug] || 0
    }));
  }, [odds]);

  // Compute leagues list with counts
  const leagueStats = useMemo(() => {
    const counts: Record<string, number> = {};
    odds.forEach((item) => {
      const league = getLeague(item);
      counts[league] = (counts[league] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([league, count]) => ({ league, count }))
      .sort((a, b) => b.count - a.count);
  }, [odds]);

  // Filtered and sorted opportunities
  const filteredOdds = useMemo(() => {
    const search = searchQuery.toLowerCase().trim();

    const visible = odds.filter((item) => {
      // Feature filters (AND condition)
      const matchesFeatures = featureFilters.every((feature) =>
        feature === 'early_payout' ? item.has_early_payout : item.is_super_odd
      );
      if (!matchesFeatures) return false;

      // Bookmaker filter
      const bookmaker = (item.bookmaker || item.house || '').toLowerCase().trim();
      if (bookmakerFilter !== 'all' && bookmaker !== bookmakerFilter.toLowerCase().trim()) {
        return false;
      }

      // League filter
      if (leagueFilter !== 'all' && getLeague(item) !== leagueFilter) {
        return false;
      }

      // Search query
      if (search) {
        const matchLabel = item.match || `${item.home_team} vs ${item.away_team}`;
        const league = getLeague(item);
        const matchesSearch =
          matchLabel.toLowerCase().includes(search) ||
          league.toLowerCase().includes(search) ||
          item.home_team.toLowerCase().includes(search) ||
          item.away_team.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      return true;
    });

    return [...visible].sort((left, right) => {
      if (sortBy === 'newest') return getTimestamp(right) - getTimestamp(left);
      if (sortBy === 'highest_odd') return getHighestOdd(right) - getHighestOdd(left);
      if (sortBy === 'lowest_odd') return getLowestOdd(left) - getLowestOdd(right);
      if (sortBy === 'match_asc') {
        const leftMatch = left.match || `${left.home_team} ${left.away_team}`;
        const rightMatch = right.match || `${right.home_team} ${right.away_team}`;
        return leftMatch.localeCompare(rightMatch);
      }
      if (sortBy === 'league_asc') return getLeague(left).localeCompare(getLeague(right));
      if (sortBy === 'bookmaker_asc') {
        return (left.bookmaker || left.house).localeCompare(right.bookmaker || right.house);
      }
      // Default: relevance (features weight + timestamp)
      const leftRelevance = (left.is_super_odd ? 2 : 0) + (left.has_early_payout ? 1 : 0);
      const rightRelevance = (right.is_super_odd ? 2 : 0) + (right.has_early_payout ? 1 : 0);
      return rightRelevance - leftRelevance || getTimestamp(right) - getTimestamp(left);
    });
  }, [bookmakerFilter, featureFilters, leagueFilter, odds, searchQuery, sortBy]);

  const toggleFeature = (feature: FeatureFilter) => {
    setFeatureFilters((current) =>
      current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]
    );
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const hasActiveFilters =
    featureFilters.length > 0 ||
    bookmakerFilter !== 'all' ||
    leagueFilter !== 'all' ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setFeatureFilters([]);
    setBookmakerFilter('all');
    setLeagueFilter('all');
    setSearchQuery('');
    setSortBy('relevance');
  };

  // Telemetry metrics
  const superOddsCount = useMemo(() => odds.filter((o) => o.is_super_odd).length, [odds]);
  const earlyPayoutCount = useMemo(() => odds.filter((o) => o.has_early_payout).length, [odds]);

  return (
    <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Stream Telemetry & Live Control Bar */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-[#10171D]/90 p-4 rounded-2xl border border-emerald-900/30 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-wrap items-center gap-4">
          {/* Live Radar Beacon */}
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0B0F12]/80 border border-emerald-900/40 shadow-inner">
            <span className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="text-xs font-bold tracking-wide uppercase text-slate-200">
              {isConnected ? 'Stream Ao Vivo Ativo' : 'Conectando ao Motor...'}
            </span>
          </div>

          {/* Sound Alert Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl transition border ${
              isMuted
                ? 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
            }`}
            title={isMuted ? 'Ativar alertas sonoros' : 'Silenciar alertas sonoros'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />}
            <span>{isMuted ? 'Alertas Silenciados' : 'Alertas Ativos'}</span>
          </button>

          {/* Timestamp */}
          {lastUpdated && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-mono">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{formatRelativeTime(lastUpdated)}</span>
            </div>
          )}
        </div>

        {/* Telemetry Pills */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            Total:{' '}
            <span className="font-extrabold text-emerald-400 font-mono">{filteredOdds.length}</span>
            <span className="text-slate-500 text-[11px] ml-1">/ {odds.length}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400">
            <Zap className="w-3 h-3" />
            <span>{earlyPayoutCount} 2+0 P.A.</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-400">
            <Sparkles className="w-3 h-3" />
            <span>{superOddsCount} Super Odds</span>
          </div>

          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="lg:hidden flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros {hasActiveFilters && '•'}</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Spatial Layout */}
      <div className="flex flex-col lg:flex-row items-start gap-6 relative">
        {/* COLUMN 1: LEFT SLIM MINIMAL SIDEBAR (BOOKMAKERS RAIL) */}
        <aside className="w-full lg:w-20 shrink-0 lg:sticky lg:top-24 z-20">
          <div className="bg-[#10171D]/90 border border-emerald-900/30 rounded-2xl p-2.5 backdrop-blur-xl shadow-2xl flex lg:flex-col items-center gap-2.5 overflow-x-auto lg:overflow-visible no-scrollbar">
            {/* "Todas as Casas" Button */}
            <div className="relative group shrink-0">
              <button
                onClick={() => setBookmakerFilter('all')}
                className={`size-12 rounded-xl flex items-center justify-center transition-all duration-300 relative ${
                  bookmakerFilter === 'all'
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.4)] scale-105'
                    : 'bg-slate-900/90 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/30'
                }`}
                aria-label="Todas as casas de aposta"
              >
                <Layers className="w-5 h-5" />
                {bookmakerFilter === 'all' && (
                  <span className="hidden lg:block absolute -left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-400 rounded-r-full shadow-[0_0_8px_#10B981]" />
                )}
              </button>
              {/* Tooltip on hover */}
              <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#0B0F12] border border-emerald-900/40 rounded-xl text-xs whitespace-nowrap z-50 shadow-2xl flex-col pointer-events-none">
                <span className="font-bold text-slate-100">Todas as Casas</span>
                <span className="text-[10px] text-emerald-400">{odds.length} oportunidades ativas</span>
              </div>
            </div>

            <div className="hidden lg:block w-8 h-[1px] bg-emerald-900/40 my-1" />

            {/* Individual Bookmaker Slots */}
            {bookmakerStats.map((house) => {
              const isSelected = bookmakerFilter.toLowerCase() === house.slug.toLowerCase();
              return (
                <div key={house.slug} className="relative group shrink-0">
                  <button
                    onClick={() => setBookmakerFilter(isSelected ? 'all' : house.slug)}
                    className={`size-12 rounded-xl flex items-center justify-center transition-all duration-300 relative p-1.5 ${
                      isSelected
                        ? 'bg-emerald-500/20 border-2 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)] scale-105'
                        : 'bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800/90 hover:border-emerald-500/40 hover:scale-102'
                    }`}
                    aria-label={`Filtrar por ${house.name}`}
                  >
                    <BookmakerLogo slug={house.slug} name={house.name} className="w-7 h-7" />

                    {/* Active side indicator notch on desktop */}
                    {isSelected && (
                      <span className="hidden lg:block absolute -left-2.5 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-emerald-400 rounded-r-full shadow-[0_0_8px_#10B981]" />
                    )}

                    {/* Count pill badge */}
                    {house.count > 0 && (
                      <span
                        className={`absolute -top-1 -right-1 text-[9px] font-extrabold px-1.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center ${
                          isSelected
                            ? 'bg-emerald-400 text-slate-950 font-black'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {house.count}
                      </span>
                    )}
                  </button>

                  {/* Tooltip on hover */}
                  <div className="hidden lg:group-hover:flex absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-[#0B0F12] border border-emerald-900/40 rounded-xl text-xs whitespace-nowrap z-50 shadow-2xl flex-col pointer-events-none">
                    <span className="font-bold text-slate-100 flex items-center gap-1.5">
                      {house.name}
                      {isSelected && <span className="text-[10px] text-emerald-400 font-normal">• Ativo</span>}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {house.count} {house.count === 1 ? 'oportunidade' : 'oportunidades'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* COLUMN 2: CENTER FEED (DYNAMIC CARD GRID - PINTEREST & MERCADO LIVRE HYBRID) */}
        <main className="flex-1 min-w-0 w-full space-y-4">
          {/* Active Filter Chips Bar */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[#10171D]/60 border border-emerald-900/30 backdrop-blur-md">
              <span className="text-xs text-slate-400 font-medium">Filtros ativos:</span>

              {bookmakerFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                  Casa: {getBookmakerInfo(bookmakerFilter).name}
                  <button onClick={() => setBookmakerFilter('all')} className="hover:text-emerald-200">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {leagueFilter !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                  Liga: {leagueFilter}
                  <button onClick={() => setLeagueFilter('all')} className="hover:text-emerald-200">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {featureFilters.map((feature) => (
                <span
                  key={feature}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-400 text-xs font-semibold border border-amber-500/30"
                >
                  {feature === 'early_payout' ? '2+0 Pagamento Antecipado' : 'Super Odds'}
                  <button onClick={() => toggleFeature(feature)} className="hover:text-amber-200">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold">
                  Busca: "{searchQuery}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              <button
                onClick={resetFilters}
                className="text-xs text-slate-400 hover:text-emerald-400 ml-auto flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Limpar todos
              </button>
            </div>
          )}

          {/* Empty State */}
          {filteredOdds.length === 0 ? (
            <div className="py-20 px-6 text-center border border-dashed border-emerald-900/40 rounded-2xl bg-[#10171D]/40 backdrop-blur-md space-y-4">
              <div className="size-16 rounded-full bg-emerald-950/60 border border-emerald-500/30 mx-auto flex items-center justify-center">
                <Radio className="w-8 h-8 text-emerald-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-200">Nenhuma oportunidade encontrada</h3>
                <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                  {hasActiveFilters
                    ? 'Nenhum resultado corresponde aos filtros selecionados. Tente relaxar seus critérios de busca.'
                    : 'Aguardando novas oportunidades transmitidas em tempo real pelo motor de scraping...'}
                </p>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg transition"
                >
                  Resetar Filtros
                </button>
              )}
            </div>
          ) : (
            /* Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5">
              {filteredOdds.map((item, index) => {
                const bookmaker = getBookmakerInfo(item.bookmaker || item.house);
                const houseSlug = (item.bookmaker || item.house || 'default').toLowerCase().trim();
                const matchLabel = item.match || `${item.home_team} vs ${item.away_team}`;
                const cardId = `${houseSlug}-${item.match_id}-${item.market_type || 'default'}-${index}`;
                const isCopied = copiedId === cardId;
                const matchTimestamp = getTimestamp(item);

                const homeOdd = getOutcomeOdd(item, 'home');
                const drawOdd = getOutcomeOdd(item, 'draw');
                const awayOdd = getOutcomeOdd(item, 'away');

                const copyCardText = `${matchLabel} | ${getLeague(item)} | ${bookmaker.name} -> Casa: ${formatOdd(
                  homeOdd
                )} | Empate: ${formatOdd(drawOdd)} | Fora: ${formatOdd(awayOdd)}`;

                return (
                  <div
                    key={cardId}
                    className="group bg-[#10171D]/85 hover:bg-[#131C24] border border-emerald-900/30 hover:border-emerald-500/50 rounded-2xl p-5 shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition-all duration-300 relative flex flex-col justify-between backdrop-blur-md hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.6),0_0_24px_rgba(16,185,129,0.12)]"
                  >
                    {/* Top Row: Bookmaker Badge & Promotional Tags (Mercado Livre inspired) */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {/* Bookmaker Brand Pill */}
                      <div className="flex items-center gap-2">
                        <BookmakerLogo slug={houseSlug} name={bookmaker.name} className="w-6 h-6" />
                        <span className="text-xs font-bold text-slate-200 tracking-wide uppercase">
                          {bookmaker.name}
                        </span>
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5">
                        {item.has_early_payout && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                            title="Pagamento Antecipado: Se abrir 2 gols de vantagem, aposta liquidada como ganha!"
                          >
                            <Zap className="w-2.5 h-2.5 fill-emerald-300" />
                            2+0 P.A.
                          </span>
                        )}
                        {item.is_super_odd && (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.25)]"
                            title="Super Odd: Cotação turbinada com margem reduzida!"
                          >
                            <Sparkles className="w-2.5 h-2.5 fill-amber-300" />
                            Super Odd
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle: League Pill & Match Confrontation */}
                    <div className="space-y-2 mb-4">
                      {/* League pill */}
                      <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-900/60 px-2 py-0.5 rounded-md border border-slate-800">
                        <Trophy className="w-3 h-3 text-emerald-400/80" />
                        <span className="truncate max-w-[200px]">{getLeague(item)}</span>
                      </div>

                      {/* Teams Confrontation */}
                      <div>
                        <div className="text-base font-extrabold text-slate-100 group-hover:text-emerald-300 transition-colors leading-tight">
                          {matchLabel}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="font-semibold text-emerald-400/90">
                            {item.market_type || 'Resultado Final (1X2)'}
                          </span>
                          {matchTimestamp > 0 && (
                            <>
                              <span>•</span>
                              <span>{formatRelativeTime(matchTimestamp)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Core: Tactile 1X2 Odds Chips (Mercado Livre Price Highlight style) */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 mb-4">
                      {/* Home */}
                      <div
                        onClick={() => copyToClipboard(String(homeOdd), `${cardId}-home`)}
                        className="rounded-xl bg-[#0B0F12]/80 hover:bg-emerald-950/70 border border-emerald-900/40 hover:border-emerald-500/60 p-2.5 text-center transition-all cursor-pointer group/odd relative"
                        title="Copiar cotação da Casa"
                      >
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Casa (1)
                        </span>
                        <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono tracking-tight block mt-0.5 group-hover/odd:text-emerald-300 group-hover/odd:scale-105 transition-transform">
                          {formatOdd(homeOdd)}
                        </span>
                        {copiedId === `${cardId}-home` && (
                          <span className="absolute inset-0 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-xl flex items-center justify-center">
                            Copiado!
                          </span>
                        )}
                      </div>

                      {/* Draw */}
                      <div
                        onClick={() => copyToClipboard(String(drawOdd), `${cardId}-draw`)}
                        className="rounded-xl bg-[#0B0F12]/80 hover:bg-emerald-950/70 border border-emerald-900/40 hover:border-emerald-500/60 p-2.5 text-center transition-all cursor-pointer group/odd relative"
                        title="Copiar cotação do Empate"
                      >
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Empate (X)
                        </span>
                        <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono tracking-tight block mt-0.5 group-hover/odd:text-emerald-300 group-hover/odd:scale-105 transition-transform">
                          {formatOdd(drawOdd)}
                        </span>
                        {copiedId === `${cardId}-draw` && (
                          <span className="absolute inset-0 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-xl flex items-center justify-center">
                            Copiado!
                          </span>
                        )}
                      </div>

                      {/* Away */}
                      <div
                        onClick={() => copyToClipboard(String(awayOdd), `${cardId}-away`)}
                        className="rounded-xl bg-[#0B0F12]/80 hover:bg-emerald-950/70 border border-emerald-900/40 hover:border-emerald-500/60 p-2.5 text-center transition-all cursor-pointer group/odd relative"
                        title="Copiar cotação de Fora"
                      >
                        <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                          Fora (2)
                        </span>
                        <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono tracking-tight block mt-0.5 group-hover/odd:text-emerald-300 group-hover/odd:scale-105 transition-transform">
                          {formatOdd(awayOdd)}
                        </span>
                        {copiedId === `${cardId}-away` && (
                          <span className="absolute inset-0 bg-emerald-500 text-slate-950 text-[10px] font-bold rounded-xl flex items-center justify-center">
                            Copiado!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Quick Actions (Pinterest inspired) */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                      <button
                        onClick={() => copyCardText && copyToClipboard(copyCardText, cardId)}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition"
                        title="Copiar resumo da oportunidade"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 font-bold">Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar Oportunidade</span>
                          </>
                        )}
                      </button>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 font-mono uppercase">
                          ID: {item.match_id.slice(-6)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* COLUMN 3: RIGHT FLOATING FILTER CARD (STICKY PANEL) */}
        <aside
          className={`lg:w-80 shrink-0 lg:sticky lg:top-24 z-30 transition-all ${
            mobileFiltersOpen
              ? 'fixed inset-x-4 top-20 bottom-6 overflow-y-auto block'
              : 'hidden lg:block'
          }`}
        >
          <div className="bg-[#10171D]/95 border border-emerald-900/30 rounded-2xl p-5 shadow-2xl backdrop-blur-xl space-y-5">
            {/* Header & Reset */}
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/30">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  Filtros & Ordenação
                </h3>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition font-medium"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpar
                </button>
              )}
              {/* Mobile Close Button */}
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="lg:hidden p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Buscar Confronto ou Time</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ex: Flamengo, Real Madrid..."
                  className="w-full bg-[#0B0F12] border border-emerald-900/40 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Smart Feature Toggles */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Vantagens & Bônus</label>
              <div className="space-y-2">
                {/* 2+0 Pagamento Antecipado */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0F12]/80 hover:bg-[#131C24] border border-emerald-900/30 hover:border-emerald-500/40 cursor-pointer transition">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Pagamento Antecipado</span>
                      <span className="text-[10px] text-slate-400 block">Vantagem de 2 gols (2+0)</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={featureFilters.includes('early_payout')}
                    onChange={() => toggleFeature('early_payout')}
                    className="rounded bg-slate-900 border-slate-700 text-emerald-500 focus:ring-emerald-400 h-4 w-4 cursor-pointer"
                  />
                </label>

                {/* Super Odds */}
                <label className="flex items-center justify-between p-2.5 rounded-xl bg-[#0B0F12]/80 hover:bg-[#131C24] border border-emerald-900/30 hover:border-emerald-500/40 cursor-pointer transition">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">Super Odds</span>
                      <span className="text-[10px] text-slate-400 block">Cotações turbinadas</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={featureFilters.includes('super_odd')}
                    onChange={() => toggleFeature('super_odd')}
                    className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-400 h-4 w-4 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Sort Order Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Critério de Ordenação</span>
                <ArrowUpDown className="w-3 h-3 text-slate-500" />
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="w-full bg-[#0B0F12] border border-emerald-900/40 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="relevance">Mais relevantes (Destaques EV)</option>
                <option value="newest">Mais recentes (Timestamp)</option>
                <option value="highest_odd">Maior Odd (Decrescente)</option>
                <option value="lowest_odd">Menor Odd (Crescente)</option>
                <option value="match_asc">Partida (A - Z)</option>
                <option value="league_asc">Liga (A - Z)</option>
                <option value="bookmaker_asc">Casa de Aposta (A - Z)</option>
              </select>
            </div>

            {/* Filter by League */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">Filtrar por Liga</label>
                <span className="text-[10px] text-slate-500">{leagueStats.length} ligas</span>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                <button
                  onClick={() => setLeagueFilter('all')}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    leagueFilter === 'all'
                      ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <span>Todas as Ligas</span>
                  <span className="text-[10px] font-mono">{odds.length}</span>
                </button>

                {leagueStats.map(({ league, count }) => (
                  <button
                    key={league}
                    onClick={() => setLeagueFilter(leagueFilter === league ? 'all' : league)}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition text-left ${
                      leagueFilter === league
                        ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <span className="truncate pr-2">{league}</span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">{count}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Summary Progress Bar */}
            <div className="pt-3 border-t border-emerald-900/30 space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Oportunidades Visíveis</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {filteredOdds.length} / {odds.length}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                  style={{
                    width: `${odds.length > 0 ? (filteredOdds.length / odds.length) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
