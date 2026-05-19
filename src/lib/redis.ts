import Redis from 'ioredis';

declare global {
  var __redis: Redis | undefined;
}

function createClient(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is not set');
  }
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
}

export const redis: Redis = global.__redis ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  global.__redis = redis;
}
