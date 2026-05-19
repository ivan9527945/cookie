import { QdrantClient } from '@qdrant/js-client-rest';

declare global {
  var __qdrant: QdrantClient | undefined;
}

function createClient(): QdrantClient {
  const url = process.env.QDRANT_URL;
  if (!url) {
    throw new Error('QDRANT_URL is not set');
  }
  return new QdrantClient({
    url,
    apiKey: process.env.QDRANT_API_KEY || undefined,
  });
}

export const qdrant: QdrantClient = global.__qdrant ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  global.__qdrant = qdrant;
}

export const COLLECTIONS = {
  chunks: 'chunks',
  episodes: 'episodes',
} as const;
