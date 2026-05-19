import Redis from 'ioredis';

declare global {
  var __redis: Redis | undefined;
}

function getClient(): Redis {
  if (global.__redis) return global.__redis;
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error('REDIS_URL is not set');
  }
  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
  });
  if (process.env.NODE_ENV !== 'production') {
    global.__redis = client;
  }
  return client;
}

export const redis = new Proxy({} as Redis, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
}) as Redis;
