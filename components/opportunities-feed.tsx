'use client';

import { useEffect, useState } from 'react';
import { OddsPayload, getBookmakerInfo } from '@/lib/sports';

export function OpportunitiesFeed() {
  const [odds, setOdds] = useState<OddsPayload[]>([]);
  const [filter, setFilter] = useState<'all' | 'early_payout' | 'super_odd'>('all');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let isUnmounted = false;

    const connect = () => {
        if (isUnmounted) return;

        if (eventSource) {
        eventSource.close();
        }

        eventSource = new EventSource('/api/stream');

        eventSource.onopen = () => {
        if (!isUnmounted) setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
        try {
            const newOdd: OddsPayload = JSON.parse(event.data);
            setOdds((prevOdds) => {
            const existingIndex = prevOdds.findIndex(
                (item) => item.house === newOdd.house && item.match_id === newOdd.match_id
            );

            if (existingIndex !== -1) {
                const updated = [...prevOdds];
                updated[existingIndex] = newOdd;
                return updated;
            }

            return [newOdd, ...prevOdds];
            });
        } catch (err) {
            console.error('Erro ao ler pacote SSE:', err);
        }
        };

        eventSource.onerror = () => {
        if (isUnmounted) return;
        
        setIsConnected(false);
        eventSource?.close();

        // Garante que não acumule múltiplos timeouts
        if (retryTimeout) clearTimeout(retryTimeout);

        // Tenta reconectar continuamente a cada 3 segundos até o Next.js terminar de recompilar
        retryTimeout = setTimeout(() => {
            connect();
        }, 3000);
        };
    };

    connect();

    return () => {
        isUnmounted = true;
        if (retryTimeout) clearTimeout(retryTimeout);
        if (eventSource) eventSource.close();
    };
    }, []);

  const filteredOdds = odds.filter((item) => {
    if (filter === 'early_payout') return item.has_early_payout;
    if (filter === 'super_odd') return item.is_super_odd;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Barra de Status e Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                isConnected ? 'bg-emerald-500' : 'bg-red-500'
              }`}
            />
          </span>
          <span className="text-sm font-medium text-slate-200">
            {isConnected ? 'Stream Ao Vivo Ativo' : 'Conectando ao servidor...'}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'all'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas ({odds.length})
          </button>
          <button
            onClick={() => setFilter('early_payout')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'early_payout'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Pagamento Antecipado
          </button>
          <button
            onClick={() => setFilter('super_odd')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'super_odd'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Super Odds
          </button>
        </div>
      </div>

      {/* Grid de Oportunidades */}
      {filteredOdds.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-slate-500">
          Aguardando novas oportunidades transmitidas pelo motor...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOdds.map((item, idx) => {
            const bookmaker = getBookmakerInfo(item.house);

            return (
              <div
                key={`${item.house}-${item.match_id}-${idx}`}
                className={`p-5 rounded-xl border bg-slate-900/90 hover:border-slate-700 transition space-y-4 shadow-lg ${bookmaker.borderColor}`}
              >
                {/* Header do Card */}
                <div className="flex justify-between items-center">
                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${bookmaker.badgeBg}`}
                  >
                    {bookmaker.name}
                  </span>

                  <div className="flex gap-1.5">
                    {item.has_early_payout && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded font-medium">
                        2+0 PA
                      </span>
                    )}
                    {item.is_super_odd && (
                      <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] px-2 py-0.5 rounded font-medium">
                        SUPER ODD
                      </span>
                    )}
                  </div>
                </div>

                {/* Confronto */}
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                    Partida
                  </p>
                  <p className="text-base font-bold text-slate-100 mt-0.5">
                    {item.home_team} <span className="text-slate-500 font-normal">vs</span>{' '}
                    {item.away_team}
                  </p>
                </div>

                {/* Seleção e Cotação */}
                <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center">
                  <div>
                    <span className="text-xs text-slate-400 block">Entrada</span>
                    <span className="text-sm font-semibold text-slate-200">
                      {item.selection}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Odd</span>
                    <span className="text-xl font-extrabold text-emerald-400">
                      {item.odd.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}