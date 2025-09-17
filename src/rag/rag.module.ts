import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { File } from '../file.entity';
import { History } from '../history.entity';

// Services
import { RAGService } from './services/rag.service';
import { DocumentService } from './services/document.service';
import { VectorService } from './services/vector.service';
import { EmbeddingService } from './services/embedding.service';

// Processors
import { WordDocumentProcessor } from './processors/word.processor';
import { PDFDocumentProcessor } from './processors/pdf.processor';
import { ExcelDocumentProcessor } from './processors/excel.processor';
import { TextDocumentProcessor } from './processors/text.processor';

// Controllers
import { RAGController } from './rag.controller';

@Module({
  imports: [TypeOrmModule.forFeature([File, History])],
  providers: [
    // Services
    RAGService,
    DocumentService,
    VectorService,
    EmbeddingService,

    // Processors
    WordDocumentProcessor,
    PDFDocumentProcessor,
    ExcelDocumentProcessor,
    TextDocumentProcessor,
  ],
  controllers: [RAGController],
  exports: [RAGService, DocumentService, VectorService, EmbeddingService],
})
export class RAGModule {}
