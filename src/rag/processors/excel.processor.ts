import { Injectable } from '@nestjs/common';
import { BaseDocumentProcessor } from './base.processor';
import { ProcessedDocument } from '../interfaces/document.interface';
import * as XLSX from 'xlsx';

@Injectable()
export class ExcelDocumentProcessor extends BaseDocumentProcessor {
  supportedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv', // .csv
  ];

  async process(file: Express.Multer.File): Promise<ProcessedDocument> {
    const documentId = this.generateDocumentId(file.originalname);

    try {
      let extractedText = '';

      if (file.mimetype === 'text/csv') {
        // Handle CSV files
        extractedText = file.buffer.toString('utf-8');
        extractedText = this.formatCsvData(extractedText);
      } else {
        // Handle Excel files (.xlsx, .xls)
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        extractedText = this.extractFromWorkbook(workbook);
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
      console.error('Error processing Excel document:', error);
      throw new Error(`Failed to process Excel document: ${error.message}`);
    }
  }

  private extractFromWorkbook(workbook: XLSX.WorkBook): string {
    const sheets = workbook.SheetNames;
    let allText = '';

    sheets.forEach((sheetName, index) => {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
      });

      allText += `\n\n=== Sheet: ${sheetName} ===\n`;

      // Convert sheet data to readable text
      sheetData.forEach((row: any[], rowIndex) => {
        if (row.some((cell) => cell !== '')) {
          const rowText = row.map((cell) => String(cell)).join(' | ');
          allText += `Row ${rowIndex + 1}: ${rowText}\n`;
        }
      });
    });

    return allText;
  }

  private formatCsvData(csvText: string): string {
    const lines = csvText.split('\n');
    let formattedText = '=== CSV Data ===\n';

    lines.forEach((line, index) => {
      if (line.trim()) {
        const columns = line
          .split(',')
          .map((col) => col.trim().replace(/"/g, ''));
        formattedText += `Row ${index + 1}: ${columns.join(' | ')}\n`;
      }
    });

    return formattedText;
  }
}
