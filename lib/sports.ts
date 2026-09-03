export interface OddsPayload {
  house: string;
  match_id: string;
  home_team: string;
  away_team: string;
  selection: string;
  odd: number;
  has_early_payout: boolean;
  is_super_odd: boolean;
  timestamp?: string;
}

export interface BookmakerConfig {
  name: string;
  badgeBg: string;
  borderColor: string;
  logo: string;
}

export const BOOKMAKERS: Record<string, BookmakerConfig> = {
  superbet: {
    name: 'Superbet',
    badgeBg: 'bg-red-500/10 text-red-500',
    borderColor: 'border-red-500/30',
    logo: '/assets/houses/superbet.svg',
  },
  vaidebet: {
    name: 'Vaidebet',
    badgeBg: 'bg-yellow-500/10 text-yellow-500',
    borderColor: 'border-yellow-500/30',
    logo: '/assets/houses/vaidebet.svg',
  },
  kto: {
    name: 'KTO',
    badgeBg: 'bg-orange-500/10 text-orange-500',
    borderColor: 'border-orange-500/30',
    logo: '/assets/houses/kto.svg',
  },
  novibet: {
    name: 'Novibet',
    badgeBg: 'bg-blue-500/10 text-blue-500',
    borderColor: 'border-blue-500/30',
    logo: '/assets/houses/novibet.svg',
  },
  betnacional: {
    name: 'Betnacional',
    badgeBg: 'bg-cyan-500/10 text-cyan-500',
    borderColor: 'border-cyan-500/30',
    logo: '/assets/houses/betnacional.svg',
  },
  stake: {
    name: 'Stake',
    badgeBg: 'bg-emerald-500/10 text-emerald-500',
    borderColor: 'border-emerald-500/30',
    logo: '/assets/houses/stake.svg',
  },
  betano: {
    name: 'Betano',
    badgeBg: 'bg-amber-500/10 text-amber-500',
    borderColor: 'border-amber-500/30',
    logo: '/assets/houses/betano.svg',
  },
  betfair: {
    name: 'Betfair',
    badgeBg: 'bg-yellow-500/10 text-yellow-500',
    borderColor: 'border-yellow-500/30',
    logo: '/assets/houses/betfair.svg',
  },
  sportingbet: {
    name: 'Sportingbet',
    badgeBg: 'bg-sky-500/10 text-sky-500',
    borderColor: 'border-sky-500/30',
    logo: '/assets/houses/sportingbet.svg',
  },
};


  // Retorna as configurações visuais da casa de aposta com fallback para marcas não mapeadas

export function getBookmakerInfo(slug: string): BookmakerConfig {
  const key = slug ? slug.toLowerCase().trim() : 'default';
  return (
    BOOKMAKERS[key] || {
      name: slug ? slug.toUpperCase() : 'DESCONHECIDA',
      badgeBg: 'bg-zinc-500/10 text-zinc-400',
      borderColor: 'border-zinc-500/30',
      logo: '/assets/houses/default.svg',
    }
  );
}

