import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchQueryDto {
  @ApiProperty({
    description: 'Search query text',
    example: 'What is the company vacation policy?',
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: 'Number of results to return',
    minimum: 1,
    maximum: 20,
    default: 5,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  topK?: number = 5;

  @ApiPropertyOptional({
    description: 'Minimum similarity score threshold',
    minimum: 0,
    maximum: 1,
    default: 0.7,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  threshold?: number = 0.7;

  @ApiPropertyOptional({
    description: 'Document type filter',
    example: 'pdf',
  })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiPropertyOptional({
    description: 'Tag filter',
    example: 'policy,hr',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: 'Include document metadata in response',
    default: true,
  })
  @IsOptional()
  includeMetadata?: boolean = true;
}
