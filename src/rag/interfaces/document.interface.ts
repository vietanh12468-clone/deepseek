export interface ProcessedDocument {
  id: string;
  filename: string;
  content: string;
  metadata: DocumentMetadata;
  chunks: DocumentChunk[];
}

export interface DocumentChunk {
  id: string;
  content: string;
  embedding?: number[];
  metadata: ChunkMetadata;
  startIndex: number;
  endIndex: number;
}

export interface DocumentMetadata {
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  processedAt?: Date;
  pageCount?: number;
  author?: string;
  title?: string;
  language?: string;
}

export interface ChunkMetadata {
  documentId: string;
  chunkIndex: number;
  totalChunks: number;
  tokenCount: number;
  pageNumber?: number;
  section?: string;
}

export interface DocumentProcessor {
  supportedTypes: string[];
  process(file: Express.Multer.File): Promise<ProcessedDocument>;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
  document: ProcessedDocument;
}

export interface RAGQuery {
  query: string;
  topK?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
}

export interface RAGResponse {
  answer: string;
  sources: SearchResult[];
  confidence: number;
  processingTime: number;
}
