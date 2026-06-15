export interface RankedCandidate {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface RerankProvider {
  readonly id: string;
  rerank(query: string, candidates: RankedCandidate[]): Promise<RankedCandidate[]>;
}
