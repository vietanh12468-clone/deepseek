import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { File } from '../../file.entity';
import { DocumentService } from './document.service';
import { VectorService } from './vector.service';
import { EmbeddingService } from './embedding.service';
import { RAGResponse, SearchResult } from '../interfaces/document.interface';
import { UploadDocumentDto } from '../dto/upload-document.dto';
import { SearchQueryDto } from '../dto/search-query.dto';
import { ChatQueryDto, ChatResponseDto } from '../dto/chat.dto';
import ollama from 'ollama';

@Injectable()
export class RAGService {
  constructor(
    @InjectRepository(File)
    private readonly fileRepository: Repository<File>,
    private readonly documentService: DocumentService,
    private readonly vectorService: VectorService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async processAndStoreDocument(
    file: Express.Multer.File,
    options: Partial<UploadDocumentDto> = {},
  ): Promise<{ fileId: number; documentId: string; chunksCount: number }> {
    try {
      // Step 1: Process document
      const processedDocument =
        await this.documentService.processDocument(file);

      // Step 2: Save file metadata to database
      const fileEntity = new File();
      fileEntity.fileName = file.originalname;
      fileEntity.fileType = file.mimetype;
      fileEntity.fileSize = file.size;
      fileEntity.chunkCount = processedDocument.chunks.length;
      fileEntity.documentId = processedDocument.id;
      fileEntity.title = options.title || processedDocument.metadata.title;
      fileEntity.author = processedDocument.metadata.author;
      fileEntity.pageCount = processedDocument.metadata.pageCount;
      fileEntity.tags = options.tags;
      fileEntity.status = 'processing';
      fileEntity.processingMetadata = {
        chunkSize: options.chunkSize || 500,
        chunkOverlap: options.chunkOverlap || 50,
        processingStarted: new Date(),
      };

      const savedFile = await this.fileRepository.save(fileEntity);

      // Step 3: Generate embeddings and store vectors
      await this.vectorService.storeVectors(
        processedDocument.chunks,
        savedFile.id,
      );

      // Step 4: Update file status
      savedFile.status = 'completed';
      savedFile.processingMetadata = {
        ...fileEntity.processingMetadata,
        processingCompleted: new Date().toISOString(),
      };
      await this.fileRepository.save(savedFile);

      console.log(
        `Successfully processed document ${file.originalname} with ${processedDocument.chunks.length} chunks`,
      );

      return {
        fileId: savedFile.id,
        documentId: processedDocument.id,
        chunksCount: processedDocument.chunks.length,
      };
    } catch (error) {
      console.error('Error in RAG processing pipeline:', error);
      throw error;
    }
  }

  async searchDocuments(query: SearchQueryDto): Promise<RAGResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Vector search
      const searchResults = await this.vectorService.searchSimilar(
        query.query,
        query.topK || 5,
        query.threshold || 0.7,
      );

      if (searchResults.length === 0) {
        return {
          answer: 'Không tìm thấy thông tin liên quan đến câu hỏi của bạn.',
          sources: [],
          confidence: 0,
          processingTime: Date.now() - startTime,
        };
      }

      // Step 2: Generate answer using RAG
      const answer = await this.generateAnswer(query.query, searchResults);

      // Step 3: Calculate confidence score
      const confidence = this.calculateConfidence(searchResults);

      return {
        answer,
        sources: searchResults,
        confidence,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error('Error in document search:', error);
      throw error;
    }
  }

  private async generateAnswer(
    query: string,
    searchResults: SearchResult[],
  ): Promise<string> {
    try {
      // Prepare context from search results
      const context = searchResults
        .map((result, index) => `[${index + 1}] ${result.chunk.content}`)
        .join('\n\n');

      const messages = [
        {
          role: 'system',
          content: `Bạn là một trợ lý AI thông minh. Hãy trả lời câu hỏi dựa trên thông tin được cung cấp.

Quy tắc:
1. Chỉ sử dụng thông tin từ context được cung cấp
2. Trả lời bằng tiếng Việt
3. Nếu không tìm thấy thông tin, hãy nói rõ
4. Trích dẫn nguồn khi có thể
5. Trả lời ngắn gọn và chính xác

Context:
${context}`,
        },
        {
          role: 'user',
          content: query,
        },
      ];

      const response = await ollama.chat({
        model: process.env.OLLAMA_MODEL || 'llama3.2',
        messages,
        options: {
          temperature: 0.1, // Lower temperature for more consistent answers
          top_p: 0.9,
        },
      });

      return response.message.content;
    } catch (error) {
      console.error('Error generating answer:', error);
      return 'Xin lỗi, đã có lỗi xảy ra khi tạo câu trả lời.';
    }
  }

  private calculateConfidence(searchResults: SearchResult[]): number {
    if (searchResults.length === 0) return 0;

    // Calculate average similarity score
    const averageScore =
      searchResults.reduce((sum, result) => sum + result.score, 0) /
      searchResults.length;

    // Normalize to 0-1 range and apply some adjustments
    let confidence = Math.min(averageScore * 1.2, 1.0);

    // Boost confidence if we have multiple good results
    if (searchResults.length >= 3 && averageScore > 0.8) {
      confidence = Math.min(confidence * 1.1, 1.0);
    }

    return Math.round(confidence * 100) / 100;
  }

  async getDocumentById(fileId: number): Promise<File | null> {
    return await this.fileRepository.findOne({
      where: { id: fileId },
      relations: ['histories'],
    });
  }

  async getAllDocuments(): Promise<File[]> {
    return await this.fileRepository.find({
      order: { uploadedAt: 'DESC' },
    });
  }

  async deleteDocument(fileId: number): Promise<void> {
    try {
      // Delete vectors first
      await this.vectorService.deleteVectorsByFileId(fileId);

      // Delete file record
      await this.fileRepository.delete(fileId);

      console.log(`Successfully deleted document with ID ${fileId}`);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  async getStats(): Promise<{
    totalDocuments: number;
    totalChunks: number;
    supportedFileTypes: string[];
    processingStatus: Record<string, number>;
  }> {
    try {
      const [totalDocuments, vectorStats, statusCounts] = await Promise.all([
        this.fileRepository.count(),
        this.vectorService.getVectorStats(),
        this.fileRepository
          .createQueryBuilder('file')
          .select('file.status, COUNT(*) as count')
          .groupBy('file.status')
          .getRawMany(),
      ]);

      const processingStatus = statusCounts.reduce((acc, item) => {
        acc[item.file_status] = parseInt(item.count);
        return acc;
      }, {});

      return {
        totalDocuments,
        totalChunks: vectorStats.totalVectors,
        supportedFileTypes: this.documentService.getSupportedExtensions(),
        processingStatus,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  async chat(chatQuery: ChatQueryDto): Promise<ChatResponseDto> {
    const startTime = Date.now();
    const model = process.env.OLLAMA_MODEL || 'llama3.2';

    try {
      if (chatQuery.useRAG) {
        // Use RAG: Search documents first, then generate answer
        const searchResults = await this.vectorService.searchSimilar(
          chatQuery.message,
          chatQuery.topK || 5,
          chatQuery.threshold || 0.7,
        );

        if (searchResults.length === 0) {
          // No relevant documents found, fall back to normal chat
          const answer = await this.generateNormalChatResponse(
            chatQuery.message,
            model,
            chatQuery.temperature,
          );

          return {
            answer,
            usedRAG: false,
            processingTime: Date.now() - startTime,
            model,
          };
        }

        // Generate answer using RAG
        const answer = await this.generateRAGAnswer(
          chatQuery.message,
          searchResults,
          chatQuery.temperature,
        );
        const confidence = this.calculateConfidence(searchResults);

        // Format sources
        const sources = searchResults.map((result) => ({
          documentId: result.chunk.metadata.documentId,
          filename: result.document.filename,
          score: result.score,
          content: result.chunk.content.substring(0, 200) + '...',
        }));

        return {
          answer,
          usedRAG: true,
          sources,
          confidence,
          processingTime: Date.now() - startTime,
          model,
        };
      } else {
        // Normal chat without RAG
        const answer = await this.generateNormalChatResponse(
          chatQuery.message,
          model,
          chatQuery.temperature,
        );

        return {
          answer,
          usedRAG: false,
          processingTime: Date.now() - startTime,
          model,
        };
      }
    } catch (error) {
      console.error('Error in chat:', error);

      // Fallback response
      return {
        answer:
          'Xin lỗi, đã có lỗi xảy ra khi xử lý câu hỏi của bạn. Vui lòng thử lại.',
        usedRAG: false,
        processingTime: Date.now() - startTime,
        model,
      };
    }
  }

  private async generateNormalChatResponse(
    message: string,
    model: string,
    temperature: number = 0.1,
  ): Promise<string> {
    const messages = [
      {
        role: 'system',
        content:
          'Bạn là một trợ lý AI thông minh và hữu ích. Hãy trả lời câu hỏi một cách chính xác và hữu ích. Luôn trả lời bằng tiếng Việt.',
      },
      {
        role: 'user',
        content: message,
      },
    ];

    const response = await ollama.chat({
      model,
      messages,
      options: {
        temperature,
        top_p: 0.9,
      },
    });

    return response.message.content;
  }

  private async generateRAGAnswer(
    query: string,
    searchResults: SearchResult[],
    temperature: number = 0.1,
  ): Promise<string> {
    try {
      // Prepare context from search results
      const context = searchResults
        .map((result, index) => `[${index + 1}] ${result.chunk.content}`)
        .join('\n\n');

      const messages = [
        {
          role: 'system',
          content: `Bạn là một trợ lý AI thông minh. Hãy trả lời câu hỏi dựa trên thông tin được cung cấp.

Quy tắc:
1. Chỉ sử dụng thông tin từ context được cung cấp
2. Trả lời bằng tiếng Việt
3. Nếu không tìm thấy thông tin, hãy nói rõ
4. Trích dẫn nguồn khi có thể
5. Trả lời ngắn gọn và chính xác

Context:
${context}`,
        },
        {
          role: 'user',
          content: query,
        },
      ];

      const response = await ollama.chat({
        model: process.env.OLLAMA_MODEL || 'llama3.2',
        messages,
        options: {
          temperature,
          top_p: 0.9,
        },
      });

      return response.message.content;
    } catch (error) {
      console.error('Error generating RAG answer:', error);
      return 'Xin lỗi, đã có lỗi xảy ra khi tạo câu trả lời dựa trên tài liệu.';
    }
  }
}
