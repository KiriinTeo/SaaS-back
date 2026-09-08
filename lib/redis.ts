import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

const redisOptions = {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
  // Habilita suporte a TLS em produção (rediss://)
  tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
};

export const redis = globalForRedis.redis ?? new Redis(redisUrl, redisOptions);

export function createRedisSubscriber(): Redis {
  return new Redis(redisUrl, redisOptions);
}

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}