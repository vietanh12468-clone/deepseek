import { Injectable } from '@nestjs/common';
import {
  DocumentProcessor,
  ProcessedDocument,
  DocumentChunk,
} from '../interfaces/document.interface';
import { encoding_for_model } from 'tiktoken';
import * as crypto from 'crypto';

@Injectable()
export abstract class BaseDocumentProcessor implements DocumentProcessor {
  protected enc = encoding_for_model('gpt-3.5-turbo');

  abstract supportedTypes: string[];
  abstract process(file: Express.Multer.File): Promise<ProcessedDocument>;

  protected async chunkText(
    text: string,
    documentId: string,
    filename: string,
    chunkSize: number = 500,
    overlap: number = 50,
  ): Promise<DocumentChunk[]> {
    const tokens = this.enc.encode(text);
    const chunks: DocumentChunk[] = [];

    let chunkIndex = 0;
    let start = 0;

    while (start < tokens.length) {
      const end = Math.min(start + chunkSize, tokens.length);
      const chunkTokens = tokens.slice(start, end);
      const chunkText = this.enc.decode(chunkTokens);

      const chunk: DocumentChunk = {
        id: `${documentId}_chunk_${chunkIndex}`,
        content:
          typeof chunkText === 'string'
            ? chunkText
            : new TextDecoder().decode(chunkText),
        startIndex: start,
        endIndex: end,
        metadata: {
          documentId,
          chunkIndex,
          totalChunks: 0, // Will be updated after all chunks are created
          tokenCount: chunkTokens.length,
        },
      };

      chunks.push(chunk);
      chunkIndex++;
      start += chunkSize - overlap;
    }

    // Update total chunks count
    chunks.forEach((chunk) => {
      chunk.metadata.totalChunks = chunks.length;
    });

    return chunks;
  }

  protected generateDocumentId(filename: string): string {
    return `doc_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`;
  }

  protected cleanText(text: string): string {
    return text
      .replace(/\r?\n|\r/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
