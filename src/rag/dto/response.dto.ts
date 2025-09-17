import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BaseResponseDto {
  @ApiProperty({
    description: 'Indicates if the request was successful',
    example: true,
  })
  success: boolean;

  @ApiPropertyOptional({
    description: 'Error message if request failed',
    example: 'File format not supported',
  })
  error?: string;
}

export class DocumentMetadataDto {
  @ApiProperty({
    description: 'Document filename',
    example: 'company-policy.pdf',
  })
  filename: string;

  @ApiProperty({
    description: 'File MIME type',
    example: 'application/pdf',
  })
  fileType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  fileSize: number;

  @ApiPropertyOptional({
    description: 'Document title',
    example: 'Company HR Policy Document',
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Document author',
    example: 'HR Department',
  })
  author?: string;

  @ApiPropertyOptional({
    description: 'Number of pages in document',
    example: 25,
  })
  pageCount?: number;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  uploadedAt: string;
}

export class ChunkMetadataDto {
  @ApiProperty({
    description: 'Document ID this chunk belongs to',
    example: 'doc_1234567890_abc12345',
  })
  documentId: string;

  @ApiProperty({
    description: 'Chunk index within document',
    example: 5,
  })
  chunkIndex: number;

  @ApiProperty({
    description: 'Total chunks in document',
    example: 25,
  })
  totalChunks: number;

  @ApiProperty({
    description: 'Number of tokens in chunk',
    example: 450,
  })
  tokenCount: number;

  @ApiPropertyOptional({
    description: 'Page number where chunk appears',
    example: 3,
  })
  pageNumber?: number;

  @ApiPropertyOptional({
    description: 'Document section',
    example: 'Chapter 2: Employee Benefits',
  })
  section?: string;
}

export class DocumentChunkDto {
  @ApiProperty({
    description: 'Unique chunk identifier',
    example: 'doc_1234567890_abc12345_chunk_5',
  })
  id: string;

  @ApiProperty({
    description: 'Chunk text content',
    example: 'Employees are entitled to 15 days of annual leave per year...',
  })
  content: string;

  @ApiProperty({
    description: 'Chunk metadata',
    type: ChunkMetadataDto,
  })
  metadata: ChunkMetadataDto;
}

export class SearchResultDto {
  @ApiProperty({
    description: 'Similarity score (0-1)',
    example: 0.92,
  })
  score: number;

  @ApiProperty({
    description: 'Matching document chunk',
    type: DocumentChunkDto,
  })
  chunk: DocumentChunkDto;

  @ApiProperty({
    description: 'Source document metadata',
    type: DocumentMetadataDto,
  })
  document: DocumentMetadataDto;
}

export class UploadResponseDto extends BaseResponseDto {
  @ApiProperty({
    description: 'Upload result data',
    type: 'object',
    properties: {
      fileId: {
        type: 'number',
        description: 'Database ID of uploaded file',
        example: 123,
      },
      documentId: {
        type: 'string',
        description: 'Unique document identifier',
        example: 'doc_1234567890_abc12345',
      },
      chunksCount: {
        type: 'number',
        description: 'Number of chunks created',
        example: 25,
      },
      filename: {
        type: 'string',
        description: 'Original filename',
        example: 'company-policy.pdf',
      },
    },
  })
  data: {
    fileId: number;
    documentId: string;
    chunksCount: number;
    filename: string;
  };
}

export class SearchResponseDto extends BaseResponseDto {
  @ApiProperty({
    description: 'Search and RAG result data',
    type: 'object',
    properties: {
      answer: {
        type: 'string',
        description: 'AI-generated answer based on document context',
        example:
          'Theo chính sách của công ty, nhân viên được hưởng 15 ngày nghỉ phép có lương mỗi năm...',
      },
      confidence: {
        type: 'number',
        description: 'Confidence score of the answer (0-1)',
        example: 0.85,
      },
      processingTime: {
        type: 'number',
        description: 'Processing time in milliseconds',
        example: 1200,
      },
      sources: {
        type: 'array',
        description: 'Source chunks used to generate the answer',
        items: { $ref: '#/components/schemas/SearchResultDto' },
      },
    },
  })
  data: {
    answer: string;
    confidence: number;
    processingTime: number;
    sources: SearchResultDto[];
  };
}

export class DocumentDto {
  @ApiProperty({
    description: 'File database ID',
    example: 123,
  })
  id: number;

  @ApiProperty({
    description: 'Original filename',
    example: 'company-policy.pdf',
  })
  fileName: string;

  @ApiProperty({
    description: 'File MIME type',
    example: 'application/pdf',
  })
  fileType: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  fileSize: number;

  @ApiProperty({
    description: 'Number of chunks created',
    example: 25,
  })
  chunkCount: number;

  @ApiProperty({
    description: 'Unique document identifier',
    example: 'doc_1234567890_abc12345',
  })
  documentId: string;

  @ApiPropertyOptional({
    description: 'Document title',
    example: 'Company HR Policy',
  })
  title?: string;

  @ApiPropertyOptional({
    description: 'Document author',
    example: 'HR Department',
  })
  author?: string;

  @ApiPropertyOptional({
    description: 'Number of pages',
    example: 25,
  })
  pageCount?: number;

  @ApiPropertyOptional({
    description: 'Document tags',
    example: 'policy,hr,internal',
  })
  tags?: string;

  @ApiProperty({
    description: 'Processing status',
    example: 'completed',
    enum: ['processing', 'completed', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: 'Upload timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  uploadedAt: string;

  @ApiProperty({
    description: 'Processing completion timestamp',
    example: '2024-01-15T10:32:15Z',
  })
  processedAt: string;
}

export class DocumentListResponseDto extends BaseResponseDto {
  @ApiProperty({
    description: 'List of documents',
    type: [DocumentDto],
  })
  data: DocumentDto[];
}

export class DocumentDetailResponseDto extends BaseResponseDto {
  @ApiProperty({
    description: 'Document details with chunks',
    type: DocumentDto,
  })
  data: DocumentDto;
}

export class StatsResponseDto extends BaseResponseDto {
  @ApiProperty({
    description: 'System statistics',
    type: 'object',
    properties: {
      totalDocuments: {
        type: 'number',
        description: 'Total number of documents',
        example: 150,
      },
      totalChunks: {
        type: 'number',
        description: 'Total number of chunks',
        example: 3750,
      },
      supportedFileTypes: {
        type: 'array',
        description: 'Supported file extensions',
        items: { type: 'string' },
        example: [
          '.pdf',
          '.docx',
          '.doc',
          '.xlsx',
          '.xls',
          '.csv',
          '.txt',
          '.md',
          '.json',
          '.xml',
        ],
      },
      processingStatus: {
        type: 'object',
        description: 'Documents by processing status',
        additionalProperties: { type: 'number' },
        example: { completed: 145, processing: 3, failed: 2 },
      },
    },
  })
  data: {
    totalDocuments: number;
    totalChunks: number;
    supportedFileTypes: string[];
    processingStatus: Record<string, number>;
  };
}

export class SupportedTypesResponseDto extends BaseResponseDto {
  @ApiProperty({
    description: 'Supported file types information',
    type: 'object',
    properties: {
      mimeTypes: {
        type: 'array',
        description: 'Supported MIME types',
        items: { type: 'string' },
        example: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      },
      extensions: {
        type: 'array',
        description: 'Supported file extensions',
        items: { type: 'string' },
        example: [
          '.pdf',
          '.docx',
          '.doc',
          '.xlsx',
          '.xls',
          '.csv',
          '.txt',
          '.md',
          '.json',
          '.xml',
        ],
      },
      processors: {
        type: 'array',
        description: 'Available document processors',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'PDFDocumentProcessor' },
            supportedTypes: {
              type: 'array',
              items: { type: 'string' },
              example: ['application/pdf'],
            },
          },
        },
      },
    },
  })
  data: {
    mimeTypes: string[];
    extensions: string[];
    processors: Array<{
      name: string;
      supportedTypes: string[];
    }>;
  };
}
