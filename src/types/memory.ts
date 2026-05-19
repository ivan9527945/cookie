export interface ChunkRetrievalResult {
  id: string;
  score: number;
  summary: string;
  yourPosition: string | null;
  topics: string[];
  importance: number;
}

export interface EpisodeRetrievalResult {
  id: string;
  score: number;
  summary: string;
  importance: number;
  createdAt: string;
}

export interface RetrievalResult {
  chunks: ChunkRetrievalResult[];
  episodes: EpisodeRetrievalResult[];
}

export interface ExtractedEpisode {
  summary: string;
  importance: number;
  emotionalValence: number;
}
