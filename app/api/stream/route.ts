import { NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { redis, createRedisSubscriber } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Limite de 5 minutos mantendo o streaming ativo

export async function GET(request: Request) {
  // 1. Validação de Autenticação
  const user = await getUser();
  if (!user) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  // 2. Validação Dinâmica de Assinatura Stripe
  const team = await getTeamForUser();
  const isSubscribed = Boolean(team?.stripeSubscriptionId && team?.planName !== 'Free');
  const disableCheck = process.env.DISABLE_SUBSCRIPTION_CHECK === 'true';

  // Se não estiver pago E a trava não estiver desativada via .env, bloqueia
  if (!isSubscribed && !disableCheck) {
    return new NextResponse('Assinatura ativa necessária', { status: 403 });
  }

  // 3. Inicialização do Cliente Subscriber
  const subscriber = createRedisSubscriber();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Snapshot Inicial
      try {
        const keys = await redis.keys('raw_odd:*');
        if (keys.length > 0) {
          const snapshotData = await redis.mget(...keys);
          for (const item of snapshotData) {
            if (item) {
              controller.enqueue(encoder.encode(`data: ${item}\n\n`));
            }
          }
        }
      } catch (err) {
        console.error('Erro no snapshot do Redis:', err);
      }

      // Escuta Pub/Sub em tempo real
      await subscriber.subscribe('odds_stream');
      subscriber.on('message', (channel, message) => {
        if (channel === 'odds_stream') {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        }
      });

      // Cleanup no Abort
      request.signal.addEventListener('abort', async () => {
        await subscriber.unsubscribe('odds_stream');
        await subscriber.quit();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}