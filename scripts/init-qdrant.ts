import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || undefined;
const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);

const qdrant = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });

async function ensureCollection(
  name: string,
  config: Parameters<QdrantClient['createCollection']>[1]
) {
  const { collections } = await qdrant.getCollections();
  if (collections.some((c) => c.name === name)) {
    console.log(`• collection "${name}" already exists`);
    return;
  }
  await qdrant.createCollection(name, config);
  console.log(`✓ created collection "${name}"`);
}

async function ensurePayloadIndex(
  collection: string,
  field: string,
  schema: 'keyword' | 'integer' | 'float' | 'datetime' | 'bool'
) {
  try {
    await qdrant.createPayloadIndex(collection, {
      field_name: field,
      field_schema: schema,
    });
    console.log(`✓ index ${collection}.${field} (${schema})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('already exists')) {
      console.log(`• index ${collection}.${field} already exists`);
      return;
    }
    throw err;
  }
}

async function main() {
  await ensureCollection('chunks', {
    vectors: { size: EMBEDDING_DIMENSIONS, distance: 'Cosine' },
    hnsw_config: { m: 32, ef_construct: 200 },
    optimizers_config: { indexing_threshold: 10000 },
  });
  await ensurePayloadIndex('chunks', 'userId', 'keyword');
  await ensurePayloadIndex('chunks', 'chatType', 'keyword');
  await ensurePayloadIndex('chunks', 'importance', 'integer');
  await ensurePayloadIndex('chunks', 'startTime', 'datetime');

  await ensureCollection('episodes', {
    vectors: { size: EMBEDDING_DIMENSIONS, distance: 'Cosine' },
    hnsw_config: { m: 16, ef_construct: 100 },
  });
  await ensurePayloadIndex('episodes', 'userId', 'keyword');
  await ensurePayloadIndex('episodes', 'sessionId', 'keyword');
  await ensurePayloadIndex('episodes', 'importance', 'integer');

  console.log('done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
