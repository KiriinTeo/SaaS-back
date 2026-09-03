import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

// Cliente principal para leituras/buscas diretas de chaves (raw_odd:*)
export const redis =
  globalForRedis.redis ??
  new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
  });

// Função para instanciar clientes dedicados ao Pub/Sub (necessário para SSE)
export function createRedisSubscriber(): Redis {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
  });
}

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}