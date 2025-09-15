import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { PineconeService } from './pinecone.service';
import { get } from 'http';
import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import * as fs from 'fs';
import * as mammoth from 'mammoth';
import slugify from 'slugify';
const WordExtractor = require('word-extractor');

@Controller('pinecone')
export class PineconeController {
  constructor(private readonly pineconeService: PineconeService) {}

  @Post('upsert')
  @ApiOperation({ summary: 'Upload file', description: 'Upload file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'uploaded' })
  @UseInterceptors(FileInterceptor('file'))
  async upsertData(@UploadedFile() file: Express.Multer.File) {
    try {
      if (
        file.mimetype ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.mimetype === 'application/msword'
      ) {
        // Save the uploaded file buffer to a temporary file
        const tempDir = './temp';
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir);
        }
        const tempPath = `${tempDir}/${file.originalname}`;
        fs.writeFileSync(tempPath, file.buffer);

        const id = slugify(file.originalname, { lower: true, strict: true });

        if (file.originalname.endsWith('.docx')) {
          // Extract text from the .docx file using mammoth
          const { value: extractedText } = await mammoth.extractRawText({
            path: tempPath,
          });

          // Optionally, remove the temp file after extraction
          fs.unlinkSync(tempPath);

          const id = file.originalname
            .toLowerCase()
            .trim()
            .replace(/[\s\W-]+/g, '-') // Replace spaces and non-word characters with hyphen
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

          // Upsert the extracted text using pineconeService
          await this.pineconeService.upsertData(extractedText, id);

          return { success: true, result: extractedText };
        } else if (file.originalname.endsWith('.doc')) {
          console.log('tempPath:', tempPath);
          // Handle .doc files (you might need a different library for .doc files)
          // For simplicity, let's assume we can read it as text
          const extractor = new WordExtractor();
          const doc = await extractor.extract(tempPath);
          const extractedText = doc.getBody();

          // Optionally, remove the temp file after extraction
          fs.unlinkSync(tempPath);

          const id = file.originalname
            .toLowerCase()
            .trim()
            .replace(/[\s\W-]+/g, '-') // Replace spaces and non-word characters with hyphen
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

          // Upsert the extracted text using pineconeService
          await this.pineconeService.upsertData(extractedText, id);

          return { success: true, result: extractedText };
        }
      }
    } catch (error) {
      console.error('Error in upsertData:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload file', description: 'Upload file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'uploaded' })
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    try {
      console.log('File uploaded:', file);
      const result = await this.pineconeService.upsertData(file);
    } catch (error) {
      console.error('Error in upload:', error);
    }
  }

  async toUnicodeCodePoints(str: string) {
    return Array.from(str).map((char) => {
      const code = char.codePointAt(0)!;
      return 'U+' + code.toString(16).toUpperCase().padStart(4, '0');
    });
  }

  @Get('search')
  async searchSimilarText(@Query('text') text: string) {
    try {
      const res = await this.pineconeService.searchSimilarText(text);
      return { success: true, data: res };
    } catch (error) {
      console.error('Error in searchSimilarText:', error);
      return { success: false, error: error.message };
    }
  }

  @Delete('delete')
  async deleteData(@Body('ids') ids: string[]) {
    try {
      const res = await this.pineconeService.deleteData(ids);
      return res;
    } catch (error) {
      console.error('Error in deleteData:', error);
      return { success: false, error: error.message };
    }
  }

  @Get('/:id')
  async getDataById(@Param('id') id: string) {
    try {
      const data = await this.pineconeService.getDataById(id);
      return { success: true, data };
    } catch (error) {
      console.error('Error in getDataById:', error);
      return { success: false, error: error.message };
    }
  }

  @Get('reset/all')
  async reset() {
    try {
      await this.pineconeService.InsertNewData('temp');
    } catch (error) {
      console.error('Error in resetIndex:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('ask-history-questions')
  async askHistoryQuestions(
    @Body('question') question: string,
  ): Promise<string[]> {
    try {
      // Simulate a history question answer
      const response = await this.pineconeService.searchSimilarText(question);
      console.log('Response from Pinecone:', response);
      const results = [];
      // for (const item of response) {
      //     console.log('Found similar text:', item);
      //     results.push(item.metadata.context);
      // }

      return results;
    } catch (error) {
      console.error('Error in askHistoryQuestions:', error);
      return [];
    }
  }
}
