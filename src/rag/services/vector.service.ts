import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { History } from '../../history.entity';
import { SearchResult, DocumentChunk } from '../interfaces/document.interface';
import { EmbeddingService } from './embedding.service';

@Injectable()
export class VectorService {
  constructor(
    @InjectRepository(History)
    private readonly historyRepository: Repository<History>,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async storeVector(chunk: DocumentChunk, fileId: number): Promise<void> {
    try {
      // Generate embedding if not provided
      if (!chunk.embedding) {
        chunk.embedding = await this.embeddingService.generateEmbedding(
          chunk.content,
        );
      }

      const vectorData = {
        context: chunk.content,
        embedding: `[${chunk.embedding.join(',')}]`,
        size: Buffer.byteLength(chunk.content, 'utf-8'),
        chunkIndex: chunk.metadata.chunkIndex,
        chunkCount: chunk.metadata.totalChunks,
        fileId: fileId,
        metadata: {
          documentId: chunk.metadata.documentId,
          tokenCount: chunk.metadata.tokenCount,
          pageNumber: chunk.metadata.pageNumber,
          section: chunk.metadata.section,
        },
      };

      await this.historyRepository.save(vectorData);
    } catch (error) {
      console.error('Error storing vector:', error);
      throw new Error(`Failed to store vector: ${error.message}`);
    }
  }

  async storeVectors(chunks: DocumentChunk[], fileId: number): Promise<void> {
    try {
      // Generate embeddings for all chunks
      const textsToEmbed = chunks
        .filter((chunk) => !chunk.embedding)
        .map((chunk) => chunk.content);

      if (textsToEmbed.length > 0) {
        const embeddings =
          await this.embeddingService.batchGenerateEmbeddings(textsToEmbed);

        let embeddingIndex = 0;
        chunks.forEach((chunk) => {
          if (!chunk.embedding) {
            chunk.embedding = embeddings[embeddingIndex++];
          }
        });
      }

      // Prepare batch insert data
      const vectorData = chunks.map((chunk) => ({
        context: chunk.content,
        embedding: `[${chunk.embedding!.join(',')}]`,
        size: Buffer.byteLength(chunk.content, 'utf-8'),
        chunkIndex: chunk.metadata.chunkIndex,
        chunkCount: chunk.metadata.totalChunks,
        fileId: fileId,
        metadata: {
          documentId: chunk.metadata.documentId,
          tokenCount: chunk.metadata.tokenCount,
          pageNumber: chunk.metadata.pageNumber,
          section: chunk.metadata.section,
        },
      }));

      // Batch insert
      await this.historyRepository.save(vectorData);
      console.log(
        `Successfully stored ${chunks.length} vectors for file ${fileId}`,
      );
    } catch (error) {
      console.error('Error storing vectors:', error);
      throw new Error(`Failed to store vectors: ${error.message}`);
    }
  }

  async searchSimilar(
    queryText: string,
    topK: number = 5,
    threshold: number = 0.7,
    fileId?: number,
  ): Promise<SearchResult[]> {
    try {
      // Generate embedding for query
      const queryEmbedding =
        await this.embeddingService.generateEmbedding(queryText);

      // Build SQL query - using simple text search for now
      let sqlQuery = `
        SELECT h.*, f.file_name, f.file_type, f.file_size,
               0.8 as similarity_score
        FROM histories h
        JOIN files f ON h.file_id = f.id
        WHERE h.context ILIKE $1
      `;

      const queryParams: any[] = [`%${queryText}%`];

      if (fileId) {
        sqlQuery += ' AND h.file_id = $2';
        queryParams.push(fileId);
      }

      sqlQuery += `
        ORDER BY h.id DESC
        LIMIT ${topK}
      `;

      const results = await this.historyRepository.manager.query(
        sqlQuery,
        queryParams,
      );

      // Filter by threshold and format results
      return results
        .filter((result: any) => result.similarity_score >= threshold)
        .map((result: any) => ({
          chunk: {
            id: `${result.metadata?.documentId || 'unknown'}_chunk_${result.chunk_index}`,
            content: result.context,
            embedding: this.parseEmbedding(result.embedding),
            startIndex: 0,
            endIndex: result.context.length,
            metadata: {
              documentId: result.metadata?.documentId || 'unknown',
              chunkIndex: result.chunk_index,
              totalChunks: result.chunk_count,
              tokenCount: result.metadata?.tokenCount || 0,
              pageNumber: result.metadata?.pageNumber,
              section: result.metadata?.section,
            },
          },
          score: result.similarity_score,
          document: {
            id: result.metadata?.documentId || 'unknown',
            filename: result.file_name,
            content: '',
            metadata: {
              filename: result.file_name,
              fileType: result.file_type,
              fileSize: result.file_size,
              uploadedAt: new Date(),
            },
            chunks: [],
          },
        }));
    } catch (error) {
      console.error('Error searching similar vectors:', error);
      throw new Error(`Failed to search similar vectors: ${error.message}`);
    }
  }

  async deleteVectorsByFileId(fileId: number): Promise<void> {
    try {
      await this.historyRepository.delete({ fileId });
      console.log(`Successfully deleted vectors for file ${fileId}`);
    } catch (error) {
      console.error('Error deleting vectors:', error);
      throw new Error(`Failed to delete vectors: ${error.message}`);
    }
  }

  async getVectorStats(): Promise<{
    totalVectors: number;
    totalFiles: number;
    avgChunksPerFile: number;
  }> {
    try {
      const stats = await this.historyRepository.manager.query(`
        SELECT 
          COUNT(*) as total_vectors,
          COUNT(DISTINCT file_id) as total_files,
          AVG(chunk_count) as avg_chunks_per_file
        FROM histories
      `);

      return {
        totalVectors: parseInt(stats[0].total_vectors),
        totalFiles: parseInt(stats[0].total_files),
        avgChunksPerFile: parseFloat(stats[0].avg_chunks_per_file) || 0,
      };
    } catch (error) {
      console.error('Error getting vector stats:', error);
      throw new Error(`Failed to get vector stats: ${error.message}`);
    }
  }

  private parseEmbedding(embeddingStr: string): number[] {
    try {
      return JSON.parse(embeddingStr);
    } catch {
      return [];
    }
  }
}
