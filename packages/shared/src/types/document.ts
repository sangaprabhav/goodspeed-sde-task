export interface Document {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  userId: string;
  chunkIndex: number;
  content: string;
  embeddingModel: string;
  embeddingDimensions: number;
  embeddingProviderId: string;
  tokenCount?: number;
  createdAt: string;
}

export interface CorpusConfig {
  userId: string;
  embeddingModel: string;
  embeddingDimensions: number;
  embeddingProviderId: string;
  updatedAt: string;
}
