import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || undefined;

const qdrant = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY });

async function main() {
  for (const name of ['chunks', 'episodes']) {
    try {
      await qdrant.deleteCollection(name);
      console.log(`✓ dropped collection "${name}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`• skip "${name}": ${message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
