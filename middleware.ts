import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/session'; // Função de sessão do SaaS Starter

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await getSession();

  const isAuthRoute = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up');
  const isPublicAsset = pathname.startsWith('/_next') || pathname.startsWith('/assets') || pathname.includes('.');

  if (isPublicAsset) {
    return NextResponse.next();
  }

  // 1. Não Logado: Bloqueia TUDO e força ir para a tela de Login
  if (!session && !isAuthRoute) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }

  // 2. Logado tentando acessar a tela de Login: Redireciona para a Home de Apresentação/Planos
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 3. Logado tentando acessar o Dashboard sem ter assinado um plano:
  // (A verificação do status da assinatura ocorre no acesso ao /dashboard ou na API /api/stream)
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};