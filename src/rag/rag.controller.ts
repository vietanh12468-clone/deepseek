import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

import { RAGService } from './services/rag.service';
import { DocumentService } from './services/document.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { SearchQueryDto } from './dto/search-query.dto';
import {
  UploadResponseDto,
  SearchResponseDto,
  DocumentListResponseDto,
  DocumentDetailResponseDto,
  StatsResponseDto,
  SupportedTypesResponseDto,
} from './dto/response.dto';

@ApiTags('RAG')
@Controller('rag')
export class RAGController {
  constructor(
    private readonly ragService: RAGService,
    private readonly documentService: DocumentService,
  ) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload and process document',
    description:
      'Upload a document and process it for RAG pipeline. Supports Word, PDF, Excel, CSV, and text files.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file to upload',
        },
        title: {
          type: 'string',
          description: 'Custom title for the document',
        },
        tags: {
          type: 'string',
          description: 'Comma-separated tags',
        },
        chunkSize: {
          type: 'number',
          description: 'Chunk size in tokens (100-2000)',
          minimum: 100,
          maximum: 2000,
          default: 500,
        },
        chunkOverlap: {
          type: 'number',
          description: 'Overlap between chunks in tokens (0-200)',
          minimum: 0,
          maximum: 200,
          default: 50,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Document uploaded and processed successfully',
    type: UploadResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file or parameters',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Unsupported file type: image/jpeg' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadDocumentDto,
  ) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      if (!this.documentService.isFileSupported(file)) {
        throw new BadRequestException(
          `Unsupported file type: ${file.mimetype}. Supported types: ${this.documentService.getSupportedExtensions().join(', ')}`,
        );
      }

      const result = await this.ragService.processAndStoreDocument(
        file,
        uploadDto,
      );

      return {
        success: true,
        data: {
          ...result,
          filename: file.originalname,
        },
      };
    } catch (error) {
      console.error('Error uploading document:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('search')
  @ApiOperation({
    summary: 'Search documents using RAG',
    description:
      'Search through processed documents and get AI-generated answers with sources.',
  })
  @ApiBody({ type: SearchQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Search completed successfully',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid query parameters',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Query text is required' },
      },
    },
  })
  async searchDocuments(@Body() searchQuery: SearchQueryDto) {
    try {
      const result = await this.ragService.searchDocuments(searchQuery);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Error searching documents:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('documents')
  @ApiOperation({
    summary: 'Get all documents',
    description: 'Retrieve list of all processed documents.',
  })
  @ApiResponse({
    status: 200,
    description: 'Documents retrieved successfully',
    type: DocumentListResponseDto,
  })
  async getAllDocuments() {
    try {
      const documents = await this.ragService.getAllDocuments();

      return {
        success: true,
        data: documents,
      };
    } catch (error) {
      console.error('Error getting documents:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('documents/:id')
  @ApiOperation({
    summary: 'Get document by ID',
    description: 'Retrieve a specific document with its chunks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Document retrieved successfully',
    type: DocumentDetailResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Document not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        error: { type: 'string', example: 'Document not found' },
      },
    },
  })
  async getDocumentById(@Param('id', ParseIntPipe) id: number) {
    try {
      const document = await this.ragService.getDocumentById(id);

      if (!document) {
        return {
          success: false,
          error: 'Document not found',
        };
      }

      return {
        success: true,
        data: document,
      };
    } catch (error) {
      console.error('Error getting document:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Delete('documents/:id')
  @ApiOperation({
    summary: 'Delete document',
    description: 'Delete a document and all its associated chunks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Document deleted successfully',
  })
  async deleteDocument(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.ragService.deleteDocument(id);

      return {
        success: true,
        message: 'Document deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting document:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get RAG system statistics',
    description:
      'Get statistics about the RAG system including document count, chunk count, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: StatsResponseDto,
  })
  async getStats() {
    try {
      const stats = await this.ragService.getStats();

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('supported-types')
  @ApiOperation({
    summary: 'Get supported file types',
    description: 'Get list of supported file types and extensions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported types retrieved successfully',
    type: SupportedTypesResponseDto,
  })
  async getSupportedTypes() {
    try {
      const supportedTypes = this.documentService.getSupportedTypes();
      const supportedExtensions = this.documentService.getSupportedExtensions();
      const processorInfo = this.documentService.getProcessorInfo();

      return {
        success: true,
        data: {
          mimeTypes: supportedTypes,
          extensions: supportedExtensions,
          processors: processorInfo,
        },
      };
    } catch (error) {
      console.error('Error getting supported types:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
