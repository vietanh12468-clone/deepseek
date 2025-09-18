import { Injectable } from '@nestjs/common';
import { BaseDocumentProcessor } from './base.processor';
import { ProcessedDocument } from '../interfaces/document.interface';

@Injectable()
export class TextDocumentProcessor extends BaseDocumentProcessor {
  supportedTypes = [
    'text/plain',
    'text/markdown',
    'application/json',
    'application/xml',
    'text/xml',
  ];

  async process(file: Express.Multer.File): Promise<ProcessedDocument> {
    const documentId = this.generateDocumentId(file.originalname);

    try {
      let extractedText = file.buffer.toString('utf-8');

      // Format based on file type
      if (file.mimetype === 'application/json') {
        extractedText = this.formatJsonData(extractedText);
      } else if (file.mimetype.includes('xml')) {
        extractedText = this.formatXmlData(extractedText);
      }

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
        },
        chunks,
      };
    } catch (error) {
      console.error('Error processing text document:', error);
      throw new Error(`Failed to process text document: ${error.message}`);
    }
  }

  private formatJsonData(jsonText: string): string {
    try {
      const jsonData = JSON.parse(jsonText);
      return this.jsonToReadableText(jsonData);
    } catch {
      return jsonText; // Return as-is if parsing fails
    }
  }

  private jsonToReadableText(obj: any, prefix = ''): string {
    let result = '';

    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          result += `${prefix}[${index}]: ${this.jsonToReadableText(item, prefix + '  ')}\n`;
        });
      } else {
        Object.entries(obj).forEach(([key, value]) => {
          result += `${prefix}${key}: ${this.jsonToReadableText(value, prefix + '  ')}\n`;
        });
      }
    } else {
      result = String(obj);
    }

    return result;
  }

  private formatXmlData(xmlText: string): string {
    // Simple XML to text conversion - remove tags and format
    return xmlText
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
