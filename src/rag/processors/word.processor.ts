import { Injectable } from '@nestjs/common';
import { BaseDocumentProcessor } from './base.processor';
import { ProcessedDocument } from '../interfaces/document.interface';
import * as mammoth from 'mammoth';
import * as fs from 'fs';
import * as path from 'path';

const WordExtractor = require('word-extractor');

@Injectable()
export class WordDocumentProcessor extends BaseDocumentProcessor {
  supportedTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
  ];

  async process(file: Express.Multer.File): Promise<ProcessedDocument> {
    const documentId = this.generateDocumentId(file.originalname);
    let extractedText = '';

    try {
      // Save file temporarily
      const tempDir = './temp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempPath = path.join(tempDir, `${documentId}_${file.originalname}`);
      fs.writeFileSync(tempPath, file.buffer);

      if (
        file.originalname.endsWith('.docx') ||
        file.mimetype.includes('openxmlformats')
      ) {
        // Process .docx files
        const result = await mammoth.extractRawText({ path: tempPath });
        extractedText = result.value;
      } else if (
        file.originalname.endsWith('.doc') ||
        file.mimetype.includes('msword')
      ) {
        // Process .doc files
        const extractor = new WordExtractor();
        const doc = await extractor.extract(tempPath);
        extractedText = doc.getBody();
      }

      // Clean up temp file
      fs.unlinkSync(tempPath);
    } catch (error) {
      console.error('Error processing Word document:', error);
      throw new Error(`Failed to process Word document: ${error.message}`);
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
  }
}
