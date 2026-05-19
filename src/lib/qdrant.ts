import { QdrantClient } from '@qdrant/js-client-rest';

declare global {
  var __qdrant: QdrantClient | undefined;
}

function getClient(): QdrantClient {
  if (global.__qdrant) return global.__qdrant;
  const url = process.env.QDRANT_URL;
  if (!url) {
    throw new Error('QDRANT_URL is not set');
  }
  const client = new QdrantClient({
    url,
    apiKey: process.env.QDRANT_API_KEY || undefined,
  });
  if (process.env.NODE_ENV !== 'production') {
    global.__qdrant = client;
  }
  return client;
}

export const qdrant = new Proxy({} as QdrantClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
}) as QdrantClient;

export const COLLECTIONS = {
  chunks: 'chunks',
  episodes: 'episodes',
} as const;
