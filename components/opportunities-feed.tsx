'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { OddsPayload, getBookmakerInfo } from '@/lib/sports';
import { playNotificationSound } from '@/lib/audio';

type FeatureFilter = 'early_payout' | 'super_odd';
type SortOption = 'relevance' | 'newest' | 'bookmaker' | 'league' | 'match';

function formatOdd(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return 'N/A';
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(2) : 'N/A';
}

function getOutcomeOdd(item: OddsPayload, outcome: 'home' | 'draw' | 'away') {
  if (outcome === 'home') return item.home_team_odd ?? item.home_odd ?? (item.selection?.toLowerCase() === item.home_team.toLowerCase() ? item.odd : undefined);
  if (outcome === 'away') return item.away_team_odd ?? item.away_odd ?? (item.selection?.toLowerCase() === item.away_team.toLowerCase() ? item.odd : undefined);
  return item.draw ?? item.draw_odd ?? (item.selection?.toLowerCase() === 'draw' ? item.odd : undefined);
}

function getLeague(item: OddsPayload) {
  return item.league || item.competition || item.market_type || 'Sem liga';
}

function getTimestamp(item: OddsPayload) {
  const timestamp = item.timestamp ? Date.parse(item.timestamp) : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function OpportunitiesFeed() {
  const [odds, setOdds] = useState<OddsPayload[]>([]);
  const [featureFilters, setFeatureFilters] = useState<FeatureFilter[]>([]);
  const [bookmakerFilter, setBookmakerFilter] = useState('all');
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const isMutedRef = useRef(isMuted);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let refreshInterval: ReturnType<typeof setInterval> | null = null;
    let isUnmounted = false;

    const connect = () => {
      if (isUnmounted) return;
      eventSource?.close();
      eventSource = new EventSource('/api/stream');
      eventSource.onopen = () => { if (!isUnmounted) setIsConnected(true); };
      eventSource.onmessage = (event) => {
        try {
          const newOdd: OddsPayload = JSON.parse(event.data);
          setLastUpdated(Date.now());
          setOdds((previousOdds) => {
            const existingIndex = previousOdds.findIndex((item) =>
              (item.bookmaker || item.house) === (newOdd.bookmaker || newOdd.house) &&
              item.match_id === newOdd.match_id && item.market_type === newOdd.market_type
            );
            if (existingIndex === -1 && !isMutedRef.current) playNotificationSound();
            if (existingIndex !== -1) {
              const updated = [...previousOdds];
              updated[existingIndex] = newOdd;
              return updated;
            }
            return [newOdd, ...previousOdds];
          });
        } catch (error) { console.error('Erro ao ler pacote SSE:', error); }
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

  const bookmakers = useMemo(() => Array.from(new Set(odds.map((item) => item.bookmaker || item.house))).sort(), [odds]);
  const leagues = useMemo(() => Array.from(new Set(odds.map(getLeague))).sort((left, right) => left.localeCompare(right)), [odds]);
  const filteredOdds = useMemo(() => {
    const visible = odds.filter((item) => {
      const matchesFeatures = featureFilters.every((feature) => feature === 'early_payout' ? item.has_early_payout : item.is_super_odd);
      const bookmaker = item.bookmaker || item.house;
      return matchesFeatures && (bookmakerFilter === 'all' || bookmaker === bookmakerFilter) && (leagueFilter === 'all' || getLeague(item) === leagueFilter);
    });
    return [...visible].sort((left, right) => {
      if (sortBy === 'newest') return getTimestamp(right) - getTimestamp(left);
      if (sortBy === 'bookmaker') return (left.bookmaker || left.house).localeCompare(right.bookmaker || right.house);
      if (sortBy === 'league') return getLeague(left).localeCompare(getLeague(right));
      if (sortBy === 'match') return (left.match || `${left.home_team} ${left.away_team}`).localeCompare(right.match || `${right.home_team} ${right.away_team}`);
      const leftRelevance = Number(left.has_early_payout) + Number(left.is_super_odd);
      const rightRelevance = Number(right.has_early_payout) + Number(right.is_super_odd);
      return rightRelevance - leftRelevance || getTimestamp(right) - getTimestamp(left);
    });
  }, [bookmakerFilter, featureFilters, leagueFilter, odds, sortBy]);

  const toggleFeature = (feature: FeatureFilter) => setFeatureFilters((current) => current.includes(feature) ? current.filter((selected) => selected !== feature) : [...current, feature]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5"><span className={`relative flex h-3 w-3 ${isConnected ? 'bg-emerald-500' : 'bg-red-500'} rounded-full`} /><span className="text-sm font-medium text-slate-200">{isConnected ? 'Stream Ao Vivo Ativo' : 'Conectando ao servidor...'}</span></div>
          <button onClick={() => setIsMuted(!isMuted)} className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition border border-slate-700" title={isMuted ? 'Ativar alertas sonoros' : 'Silenciar alertas sonoros'}>{isMuted ? 'Som Desativado' : 'Som Ativado'}</button>
        </div>
        <div className="flex flex-wrap items-center gap-2"><span className="text-xs text-slate-400">{filteredOdds.length} de {odds.length}</span>{lastUpdated && <span className="text-xs text-slate-500">Atualizado {new Date(lastUpdated).toLocaleTimeString()}</span>}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-900/60 p-4 border border-slate-800 rounded-xl">
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={featureFilters.includes('early_payout')} onChange={() => toggleFeature('early_payout')} />Pagamento antecipado</label>
        <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={featureFilters.includes('super_odd')} onChange={() => toggleFeature('super_odd')} />Super odds</label>
        <select value={bookmakerFilter} onChange={(event) => setBookmakerFilter(event.target.value)} className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200"><option value="all">Todas as casas</option>{bookmakers.map((bookmaker) => <option key={bookmaker} value={bookmaker}>{bookmaker}</option>)}</select>
        <select value={leagueFilter} onChange={(event) => setLeagueFilter(event.target.value)} className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200"><option value="all">Todas as ligas</option>{leagues.map((league) => <option key={league} value={league}>{league}</option>)}</select>
        <select value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200"><option value="relevance">Mais relevantes</option><option value="newest">Mais recentes</option><option value="bookmaker">Casa A-Z</option><option value="league">Liga A-Z</option><option value="match">Partida A-Z</option></select>
      </div>

      {filteredOdds.length === 0 ? <div className="p-12 text-center border border-dashed border-slate-800 bg-slate-900/40 text-slate-500">Aguardando novas oportunidades transmitidas pelo motor...</div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOdds.map((item, index) => {
          const bookmaker = getBookmakerInfo(item.bookmaker || item.house);
          const matchLabel = item.match || `${item.home_team} vs ${item.away_team}`;
          return <div key={`${item.bookmaker || item.house}-${item.match_id}-${item.market_type || 'default'}-${index}`} className={`p-5 border bg-slate-900/90 hover:border-slate-700 transition space-y-4 shadow-lg ${bookmaker.borderColor}`}>
            <div className="flex justify-between items-center"><span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${bookmaker.badgeBg}`}>{bookmaker.name}</span><div className="flex gap-1.5">{item.has_early_payout && <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded font-medium">2+0 PA</span>}{item.is_super_odd && <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] px-2 py-0.5 rounded font-medium">SUPER ODD</span>}</div></div>
            <div><p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Partida</p><p className="text-base font-bold text-slate-100 mt-0.5">{matchLabel}</p><p className="text-xs text-slate-500 mt-1">{getLeague(item)}</p></div>
            <div className="pt-2 border-t border-slate-800/80"><span className="text-xs text-slate-400 block">Casa de Aposta</span><span className="text-sm font-semibold text-slate-200">{bookmaker.name}</span></div>
            <div className="grid grid-cols-3 gap-2">{(['home', 'draw', 'away'] as const).map((outcome) => <div key={outcome} className="rounded-lg bg-slate-800/70 p-2 text-center"><span className="text-[11px] text-slate-400 block">{outcome === 'home' ? 'Casa' : outcome === 'draw' ? 'Empate' : 'Fora'}</span><span className="text-lg font-extrabold text-emerald-400">{formatOdd(getOutcomeOdd(item, outcome))}</span></div>)}</div>
          </div>;
        })}
      </div>}
    </div>
  );
}
