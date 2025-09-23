import { Injectable, BadRequestException } from '@nestjs/common';
import {
  DocumentProcessor,
  ProcessedDocument,
} from '../interfaces/document.interface';
import { WordDocumentProcessor } from '../processors/word.processor';
import { PDFDocumentProcessor } from '../processors/pdf.processor';
import { ExcelDocumentProcessor } from '../processors/excel.processor';
import { TextDocumentProcessor } from '../processors/text.processor';

@Injectable()
export class DocumentService {
  private processors: DocumentProcessor[] = [];

  constructor(
    private readonly wordProcessor: WordDocumentProcessor,
    private readonly pdfProcessor: PDFDocumentProcessor,
    private readonly excelProcessor: ExcelDocumentProcessor,
    private readonly textProcessor: TextDocumentProcessor,
  ) {
    this.processors = [
      this.wordProcessor,
      this.pdfProcessor,
      this.excelProcessor,
      this.textProcessor,
    ];
  }

  async processDocument(file: Express.Multer.File): Promise<ProcessedDocument> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const processor = this.findProcessor(file.mimetype);
    if (!processor) {
      throw new BadRequestException(
        `Unsupported file type: ${file.mimetype}. Supported types: ${this.getSupportedTypes().join(', ')}`,
      );
    }

    try {
      const processedDocument = await processor.process(file);
      console.log(`Successfully processed document: ${file.originalname}`);
      console.log(`Generated ${processedDocument.chunks.length} chunks`);

      return processedDocument;
    } catch (error) {
      console.error(`Error processing document ${file.originalname}:`, error);
      throw new BadRequestException(
        `Failed to process document: ${error.message}`,
      );
    }
  }

  private findProcessor(mimeType: string): DocumentProcessor | null {
    return (
      this.processors.find((processor) =>
        processor.supportedTypes.includes(mimeType),
      ) || null
    );
  }

  getSupportedTypes(): string[] {
    return this.processors.flatMap((processor) => processor.supportedTypes);
  }

  getSupportedExtensions(): string[] {
    const extensionMap: Record<string, string> = {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        '.docx',
      'application/msword': '.doc',
      'application/pdf': '.pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        '.xlsx',
      'application/vnd.ms-excel': '.xls',
      'text/csv': '.csv',
      'text/plain': '.txt',
      'text/markdown': '.md',
      'application/json': '.json',
      'application/xml': '.xml',
      'text/xml': '.xml',
    };

    return Object.values(extensionMap);
  }

  isFileSupported(file: Express.Multer.File): boolean {
    return this.findProcessor(file.mimetype) !== null;
  }

  getProcessorInfo(): Array<{ name: string; supportedTypes: string[] }> {
    return this.processors.map((processor) => ({
      name: processor.constructor.name,
      supportedTypes: processor.supportedTypes,
    }));
  }
}
