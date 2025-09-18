import { Injectable } from '@nestjs/common';
import { BaseDocumentProcessor } from './base.processor';
import { ProcessedDocument } from '../interfaces/document.interface';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class PDFDocumentProcessor extends BaseDocumentProcessor {
  supportedTypes = ['application/pdf'];

  async process(file: Express.Multer.File): Promise<ProcessedDocument> {
    const documentId = this.generateDocumentId(file.originalname);

    try {
      const pdfData = await pdfParse(file.buffer);
      const extractedText = pdfData.text;

      const cleanedText = this.cleanText(extractedText);
      const chunks = await this.chunkText(
        cleanedText,
        documentId,
        file.originalname,
      );

      return {
        id: documentId,
        filename: file.originalname,
        content: cleanedText,
        metadata: {
          filename: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date(),
          processedAt: new Date(),
          pageCount: pdfData.numpages,
          title: pdfData.info?.Title,
          author: pdfData.info?.Author,
        },
        chunks,
      };
    } catch (error) {
      console.error('Error processing PDF document:', error);
      throw new Error(`Failed to process PDF document: ${error.message}`);
    }
  }
}
