import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatQueryDto {
  @ApiProperty({
    description: 'The message/query to send to the AI',
    example: 'What is the vacation policy?',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Whether to use RAG (document search) or normal chat',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  useRAG?: boolean = true;

  @ApiProperty({
    description: 'Number of similar documents to retrieve for RAG',
    example: 5,
    default: 5,
    minimum: 1,
    maximum: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  topK?: number = 5;

  @ApiProperty({
    description: 'Similarity threshold for document retrieval',
    example: 0.7,
    default: 0.7,
    minimum: 0.1,
    maximum: 1.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(1.0)
  threshold?: number = 0.7;

  @ApiProperty({
    description: 'Temperature for AI response generation',
    example: 0.1,
    default: 0.1,
    minimum: 0.0,
    maximum: 2.0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.0)
  @Max(2.0)
  temperature?: number = 0.1;
}

export class ChatResponseDto {
  @ApiProperty({
    description: 'The AI response',
    example: 'Based on the company handbook, the vacation policy allows...',
  })
  answer: string;

  @ApiProperty({
    description: 'Whether RAG was used for this response',
    example: true,
  })
  usedRAG: boolean;

  @ApiProperty({
    description: 'Source documents used for RAG (if applicable)',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        documentId: { type: 'string' },
        filename: { type: 'string' },
        score: { type: 'number' },
        content: { type: 'string' },
      },
    },
    required: false,
  })
  sources?: Array<{
    documentId: string;
    filename: string;
    score: number;
    content: string;
  }>;

  @ApiProperty({
    description: 'Confidence score of the response',
    example: 0.85,
    required: false,
  })
  confidence?: number;

  @ApiProperty({
    description: 'Processing time in milliseconds',
    example: 1250,
  })
  processingTime: number;

  @ApiProperty({
    description: 'Model used for generation',
    example: 'llama3.2',
  })
  model: string;
}
