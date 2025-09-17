import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Document file to upload',
  })
  file?: Express.Multer.File;

  @ApiPropertyOptional({
    description: 'Custom title for the document',
    example: 'Company Policy Document',
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: 'Document category or tags',
    example: 'policy,hr,internal',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: 'Chunk size in tokens',
    minimum: 100,
    maximum: 2000,
    default: 500,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(2000)
  chunkSize?: number = 500;

  @ApiPropertyOptional({
    description: 'Overlap between chunks in tokens',
    minimum: 0,
    maximum: 200,
    default: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(200)
  chunkOverlap?: number = 50;
}
