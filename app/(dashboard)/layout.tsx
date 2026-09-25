'use client';

import Link from 'next/link';
import { useState, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Zap,
  Users,
  Settings,
  Shield,
  Activity,
  LogOut,
  Menu,
  X,
  CreditCard,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const navItems = [
  { href: '/dashboard', icon: Zap, label: 'Oportunidades' },
  { href: '/dashboard/team', icon: Users, label: 'Equipe' },
  { href: '/dashboard/general', icon: Settings, label: 'Geral' },
  { href: '/dashboard/activity', icon: Activity, label: 'Atividade' },
  { href: '/dashboard/security', icon: Shield, label: 'Segurança' }
];

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/pricing"
          className="text-xs font-semibold text-slate-400 hover:text-emerald-400 transition"
        >
          Planos
        </Link>
        <Button
          asChild
          size="sm"
          className="rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 shadow-[0_0_15px_rgba(16,185,129,0.3)] text-xs h-8"
        >
          <Link href="/sign-up">Entrar / Registrar</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger className="flex items-center gap-2 p-1 rounded-full hover:bg-emerald-950/40 transition outline-none border border-transparent hover:border-emerald-500/30">
        <Avatar className="size-8 ring-2 ring-emerald-500/40">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback className="bg-emerald-950 text-emerald-400 font-bold text-xs">
            {user.email
              ? user.email
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
              : 'U'}
          </AvatarFallback>
        </Avatar>
        <span className="hidden sm:inline-block text-xs font-semibold text-slate-200 max-w-[110px] truncate">
          {user.name || user.email?.split('@')[0]}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-[#0E151A] border border-emerald-900/40 text-slate-200 shadow-2xl backdrop-blur-xl p-1.5 rounded-xl z-50"
      >
        <div className="px-3 py-2 border-b border-emerald-900/30 mb-1">
          <p className="text-[11px] text-slate-400">Conectado como</p>
          <p className="text-xs font-semibold text-emerald-400 truncate">{user.email}</p>
        </div>
        <DropdownMenuItem asChild className="cursor-pointer hover:bg-emerald-500/10 focus:bg-emerald-500/10 rounded-lg">
          <Link href="/dashboard" className="flex w-full items-center gap-2 text-xs py-1.5">
            <Zap className="h-4 w-4 text-emerald-400" />
            <span>Feed de Oportunidades</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer hover:bg-emerald-500/10 focus:bg-emerald-500/10 rounded-lg">
          <Link href="/dashboard/team" className="flex w-full items-center gap-2 text-xs py-1.5">
            <CreditCard className="h-4 w-4 text-amber-400" />
            <span>Assinatura & Equipe</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-emerald-900/30 my-1" />
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="w-full">
            <DropdownMenuItem className="w-full cursor-pointer text-red-400 hover:bg-red-500/10 focus:bg-red-500/10 rounded-lg text-xs py-1.5">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair da conta</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#0B0F12]/85 backdrop-blur-xl border-b border-emerald-900/30 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      <div className="w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="size-9 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-600 to-teal-800 p-0.5 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-transform group-hover:scale-105">
                <div className="w-full h-full bg-[#0B0F12] rounded-[10px] flex items-center justify-center">
                  <Zap className="h-5 w-5 text-emerald-400 fill-emerald-400/20" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-base font-extrabold tracking-wider text-slate-100 uppercase">
                    Bet<span className="text-emerald-400">Pulse</span>
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded tracking-widest uppercase shadow-[0_0_8px_rgba(245,158,11,0.2)]">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono tracking-tight hidden sm:block">
                  Live Opportunity Engine
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Tabs - Moved from Sidebar to Header as requested */}
          <nav className="hidden md:flex items-center gap-1 bg-[#10171D]/90 p-1.5 rounded-xl border border-emerald-900/30 backdrop-blur-md shadow-inner">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)] border border-emerald-500/40 font-bold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border border-transparent'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Header: User Menu & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <Suspense fallback={<div className="h-8 w-24 bg-slate-800/40 rounded-full animate-pulse" />}>
              <UserMenu />
            </Suspense>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-emerald-400"
              aria-label="Abrir menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-emerald-950/80 py-3 px-2 space-y-1 bg-[#0B0F12]/98 animate-in slide-in-from-top-2 duration-200">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4 text-emerald-400" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex flex-col min-h-screen bg-[#0B0F12] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-x-hidden">
      {/* Subtle Atmospheric Ambient Glows (Weightless depth from antigravity-design-expert) */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-emerald-500/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-amber-500/4 blur-[130px]" />
      </div>

      <Header />
      <div className="flex-1 w-full relative z-10">{children}</div>
    </section>
  );
}
