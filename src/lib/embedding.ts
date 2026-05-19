import OpenAI from 'openai';

declare global {
  var __openai: OpenAI | undefined;
}

function getClient(): OpenAI {
  if (global.__openai) return global.__openai;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  const client = new OpenAI({ apiKey });
  if (process.env.NODE_ENV !== 'production') {
    global.__openai = client;
  }
  return client;
}

const MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
const DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);

export async function embed(text: string): Promise<number[]> {
  const res = await getClient().embeddings.create({
    model: MODEL,
    input: text,
    dimensions: DIMENSIONS,
  });
  return res.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await getClient().embeddings.create({
    model: MODEL,
    input: texts,
    dimensions: DIMENSIONS,
  });
  return res.data.map((d) => d.embedding);
}

export const EMBEDDING_DIMENSIONS = DIMENSIONS;
