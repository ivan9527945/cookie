import OpenAI from 'openai';

declare global {
  var __openai: OpenAI | undefined;
}

function createClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey });
}

const openai: OpenAI = global.__openai ?? createClient();

if (process.env.NODE_ENV !== 'production') {
  global.__openai = openai;
}

const MODEL = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';
const DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 1536);

export async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: MODEL,
    input: text,
    dimensions: DIMENSIONS,
  });
  return res.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await openai.embeddings.create({
    model: MODEL,
    input: texts,
    dimensions: DIMENSIONS,
  });
  return res.data.map((d) => d.embedding);
}

export const EMBEDDING_DIMENSIONS = DIMENSIONS;
