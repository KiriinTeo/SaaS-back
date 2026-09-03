import { NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { redis, createRedisSubscriber } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Validação de Autenticação via Sessão
  const user = await getUser();
  if (!user) {
    return new NextResponse('Não autorizado', { status: 401 });
  }

  // Validação de Assinatura Stripe no Drizzle (Time/Usuário)
  const team = await getTeamForUser();
  const isSubscribed = team?.stripeSubscriptionId && team?.planName !== 'Free';

  // para testes: Comente a condição abaixo se quiser testar localmente sem criar assinatura no Stripe
  //if (!isSubscribed) {
  //  return new NextResponse('Assinatura ativa necessária', { status: 403 });
  //}

  // Inicialização do Cliente Subscriber Dedicado
  const subscriber = createRedisSubscriber();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // 1- Snapshot Inicial: Envia odds já existentes no Redis ao conectar
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
        console.error('Erro ao carregar snapshot inicial do Redis:', err);
      }

      // 2- Escuta em Tempo Real do Canal Pub/Sub
      await subscriber.subscribe('odds_stream');
      subscriber.on('message', (channel, message) => {
        if (channel === 'odds_stream') {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        }
      });

      // 3- Limpeza de Conexão ao Fechar a Aba ou Desconectar
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