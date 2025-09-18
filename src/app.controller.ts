import {
  Controller,
  Get,
  Post,
  Request,
  Res,
  OnModuleInit,
  Body,
  UseInterceptors,
  UploadedFile,
  Render,
  Param,
} from '@nestjs/common';
import { AppService } from './app.service';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import { PineconeService } from './pinecone/pinecone.service';
import { RedisService } from './redis/redis.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import slugify from 'slugify';
import * as mammoth from 'mammoth';
import { encoding_for_model } from 'tiktoken';
const WordExtractor = require('word-extractor')
import * as XLSX from 'xlsx';

import { History } from './history.entity';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class AppController implements OnModuleInit {
  constructor(
    private readonly appService: AppService,
    private readonly pineconeService: PineconeService,
    private readonly redisService: RedisService,
  ) { }
  public enc = encoding_for_model('gpt-3.5-turbo');

  private server = new McpServer({
    name: 'example-server',
    version: '1.0.0',
  });

  onModuleInit() {
    this.server.registerResource(
      'echo',
      new ResourceTemplate('echo://{message}', { list: undefined }),
      {
        title: 'Echo Resource',
        description: 'Echoes back messages as resources',
      },
      async (uri, { message }) => ({
        contents: [
          {
            uri: uri.href,
            text: `Resource echo: ${message}`,
          },
        ],
      }),
    );

    this.server.registerTool(
      'echo',
      {
        title: 'Echo Tool',
        description: 'Echoes back the provided message',
        inputSchema: { message: z.string() },
      },
      async ({ message }) => ({
        content: [{ type: 'text', text: `Tool echo: ${message}` }],
      }),
    );

    this.server.registerTool(
      'addTwoNumbers',
      {
        title: 'Add Two Numbers Tool',
        description: 'Adds two numbers together',
        inputSchema: {
          a: z.number().describe('The first number'),
          b: z.number().describe('The second number'),
        },
      },
      this.handleAddTwoNumbersTool,
    );

    this.server.registerPrompt(
      'echo',
      {
        title: 'Echo Prompt',
        description: 'Creates a prompt to process a message',
        argsSchema: { message: z.string() },
      },
      ({ message }) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Please process this message: ${message}`,
            },
          },
        ],
      }),
    );

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        this.transports[sessionId] = transport;
      },
      // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
      // locally, make sure to set:
      // enableDnsRebindingProtection: true,
      // allowedHosts: ['127.0.0.1'],
    });
    this.server.connect(transport);
  }

  async handleAddTwoNumbersTool(args: { a?: number; b?: number }) {
    const a = args.a ?? 0;
    const b = args.b ?? 0;

    let content = [];
    if ((a === 9 && b === 10) || (a === 10 && b === 9)) {
      content = [
        { type: 'text' as const, text: `The sum of ${a} and ${b} is 21` },
      ];
    } else {
      content = [
        { type: 'text' as const, text: `The sum of ${a} and ${b} is ${a + b}` },
      ];
    }
    return { content };
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

  @Get('mcp')
  @ApiOperation({ summary: 'Connect to the MCP server through the HTTP transport' })
  @ApiResponse({ status: 200, description: 'Connected to the MCP server' })
  async getMcp(@Request() req: any, @Res() res: any) {
    await this.handleSessionRequest(req, res);
  }

  // handleSessionRequest(req, res) {
  //   const sessionId = req.headers['mcp-session-id'] as string | undefined;
  //   if (!sessionId || !transports[sessionId]) {
  //     res.status(400).send('Invalid or missing session ID');
  //     return;
  //   }

  //   const transport = transports[sessionId];
  //   await transport.handleRequest(req, res);
  // };

  @Post('mcp')
  @ApiOperation({ summary: 'Create a new MCP session or reuse an existing one' })
  @ApiResponse({ status: 200, description: 'MCP session created or reused' })
  async createMcpSession(@Request() req: any, @Res() res: any) {
    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    console.log(isInitializeRequest(req.body));

    if (sessionId && this.transports[sessionId]) {
      // Reuse existing transport
      transport = this.transports[sessionId];
    } else if (!sessionId) {
      // New initialization request
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          // Store the transport by session ID
          this.transports[sessionId] = transport;
        },
        // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
        // locally, make sure to set:
        // enableDnsRebindingProtection: true,
        // allowedHosts: ['127.0.0.1'],
      });

      // // Clean up transport when closed
      // transport.onclose = () => {
      //   if (transport.sessionId) {
      //     delete this.transports[transport.sessionId];
      //   }
      // };
      // ... set up server resources, tools, and prompts ...

      // Connect to the MCP server
      await this.server.connect(transport);

      console.log(this.transports);
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
      return;
    }

    // Handle the request
    await transport.handleRequest(req, res, req.body);
  }

  async handleSessionRequest(req: any, res: any) {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    if (!sessionId || !this.transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = this.transports[sessionId];
    await transport.handleRequest(req, res);
  }

  @Post('ask-question')
  @ApiOperation({ summary: 'chat with Ollama in api' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'What is 9 plus 10?' },
      },
    },
  })
  async askQuestion(@Body('message') message: string) {
    try {
      const response = await this.appService.askQuestion(message);
      return { success: true, data: response };
    } catch (error) {
      console.error('Error in askQuestion:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('reset')
  @ApiOperation({ summary: 'reset data from .docx and .doc infiles in the temp directory to postgres' })
  @ApiResponse({ status: 200, description: 'Data upserted successfully' })
  async upsertData() {
    try {
      const filePath = 'temp';
      //get all the files in the directory
      const resolvedPath = require('path').resolve(filePath);
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Directory does not exist: ${resolvedPath}`);
      }

      let extractedText = '';
      const files = fs.readdirSync(resolvedPath);
      for (const file of files) {
        const id = slugify(file.toLowerCase());
        console.log(`Processing file: ${id}`);

        if (file.endsWith('.docx')) {
          // Extract text from the .docx file using mammoth
          // Upsert the extracted text using pineconeService
          extractedText = (
            await mammoth.extractRawText({
              path: `${resolvedPath}/${file}`,
            })
          ).value;
        } else if (file.endsWith('.doc')) {
          // Handle .doc files (you might need a different library for .doc files)
          // For simplicity, let's assume we can read it as text
          const extractor = new WordExtractor();
          const doc = await extractor.extract(`${resolvedPath}/${file}`);
          extractedText = doc.getBody();
        }
        // Remove all newlines and replace them with a normal space
        extractedText = extractedText.replace(/\r?\n|\r/g, ' ');

        // chunk the text into smaller parts by each '/t'
        const chunks = await this.chunkByTokens(extractedText, 500, 50);

        const upsertChunk = [];
        for (const chunk of chunks) {
          const metadata = {
            filePath: resolvedPath + '\\' + file,
            context: chunk,
          };

          // Extract the vector array from the embedding result
          const embeddings = await this.appService.embeddingData(chunk);

          upsertChunk.push({
            id: id + '#' + chunks.indexOf(chunk),
            values: embeddings,
            metadata: metadata,
          });
        }

        let i = 0;
        for (const chunk of upsertChunk) {
          // await this.redisService.hsetObject(`pinecone-${chunk.id}`, JSON.stringify(chunk)); // Store vector as part of the hash
          i++;
          this.appService.insertHisory(
            chunk.metadata.context,
            chunk.values,
            45,
            i,
          );
        }

        // let i = 0;
        // chunks.forEach(chunk => {
        //     let metadata = {
        //         filePath: resolvedPath,
        //         context: chunk,
        //     }

        //     this.upsertData(chunk, id + '-' + i, metadata);
        //     i++;
        // });
        // console.log('Chunks:', chunks);
        // return { success: true };

        // let metadata = {
        //     filePath: resolvedPath + '\\' + file,
        //     context: extractedText,
        // };

        // await this.upsertData(extractedText, id, metadata);
      }
    } catch (error) {
      console.error('Error inserting new data:', error);
      throw error;
    }
  }

  @Post('search')
  @ApiOperation({ summary: 'search similar VietNam history using embedding vector to postgres database' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        question: { type: 'string', example: 'Who is famous in Viet Nam?' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Data get successfully' })
  async searchSimilarVietNamHistory(@Body('question') question: string) {
    try {
      const embeddings = (await this.appService.embeddingData(question))[0];
      const res = await this.appService.searchSimilarVietNamHistory(embeddings);
      return { success: true, data: res };
    } catch (error) {
      console.error('Error in searchSimilarText:', error);
      return { success: false, error: error.message };
    }
  }

  async chunkByTokens(
    text: string,
    chunkSize = 500,
    overlap = 50,
  ): Promise<string[]> {
    const tokens = this.enc.encode(text);
    const chunks: string[] = [];

    let start = 0;
    while (start < tokens.length) {
      const end = Math.min(start + chunkSize, tokens.length);
      const chunk = this.enc.decode(tokens.slice(start, end));
      chunks.push(
        typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk),
      );
      start += chunkSize - overlap;
    }
    return chunks;
  }

  @Get('home')
  @ApiOperation({ summary: 'Home page ( CMS ) for upload file into Vietnam history postgres database' })
  @ApiResponse({ status: 200, description: 'Data get successfully' })
  @Render('index')
  async homeView() {
    return {
      placeholder: '1.Type your message here...',
    };
  }

  @Post('check-confirm')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Load file doc or docx into home page for confirm' })
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
  @ApiResponse({ status: 200, description: 'Data get successfully' })
  @Render('index')
  @UseInterceptors(FileInterceptor('file'))
  async handleCheckConfirm(@UploadedFile() file: Express.Multer.File) {
    try {
      // Use file.filename to check extension and file.path for actual file location
      let extractedText = '';
      // Get the file name without the .docx or .doc extension
      const baseName = file.originalname
        .replace(/\.docx?$/i, '') // Remove .doc or .docx (case-insensitive)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      const extension = '.' + file.originalname.split('.').pop();
      const newName =
        slugify(baseName, { lower: true, strict: true, locale: 'vi' }) +
        extension;

      //save temp file to local disk
      fs.writeFileSync(`./temp/${newName}`, file.buffer);
      const resolvedPath = require('path').resolve(`./temp/${newName}`);

      if (file.originalname.endsWith('.docx')) {
        // Extract text from the .docx file using mammoth
        const { value } = await mammoth.extractRawText({ path: resolvedPath });
        extractedText = value;
      } else if (file.originalname.endsWith('.doc')) {
        // Handle .doc files
        if (fs.existsSync(resolvedPath)) {
          const extractor = new WordExtractor();
          const doc = await extractor.extract(resolvedPath);
          extractedText = doc.getBody();
        } else {
          throw new Error(`File does not exist: ${resolvedPath}`);
        }
      }

      // Remove all newlines and replace them with a normal space
      extractedText = extractedText.replace(/\r?\n|\r/g, ' ');

      //count total chunk
      const chunks = await this.chunkByTokens(extractedText, 500, 50);

      return {
        tags: ['🤔 What is WappGPT?', '💰 Pricing', '❓ FAQs'],
        placeholder: '1.Type your message here...',
        chunks: chunks,
        extractedText: extractedText,
        file: {
          name: newName,
          size: file.size,
          type: file.mimetype,
          path: resolvedPath,
        },
      };
    } catch (error) {
      console.error('Error handling form submission:', error);
    }
  }

  @Post('confirm')
  @ApiOperation({ summary: 'Press the confirm after load file doc or docx into home page' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fileName: {
          type: 'string',
        },
        fileType: {
          type: 'string',
        },
        fileSize: {
          type: 'number',
        },
        resolvedPath: {
          type: 'string',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Data get successfully' })
  @Render('index')
  async handleConfirm(@Body() body: any) {
    try {
      const upsertChunk = [];

      console.log('Body received:', body);
      let extractedText = '';
      if (body.fileName.endsWith('.docx')) {
        // Extract text from the .docx file using mammoth
        // Upsert the extracted text using pineconeService
        extractedText = await mammoth
          .extractRawText({ path: `${body.resolvedPath}` })
          .then((result) => result.value);
      } else if (body.fileName.endsWith('.doc')) {
        // Handle .doc files (you might need a different library for .doc files)
        // For simplicity, let's assume we can read it as text
        const extractor = new WordExtractor();
        const doc = await extractor.extract(`${body.resolvedPath}`);
        extractedText = doc.getBody();
      }

      const chunks = await this.chunkByTokens(extractedText, 500, 50);

      const fileId = await this.appService.saveFile(
        body.fileName,
        body.fileType,
        body.fileSize,
        chunks.length,
      );
      console.log('Saved file with ID:', fileId);

      for (const chunk of chunks) {
        const metadata = {
          filePath: body.resolvedPath,
          context: chunk,
        };

        // Extract the vector array from the embedding result
        const embeddings = await this.appService.embeddingData(chunk);

        upsertChunk.push({
          values: embeddings,
          metadata: metadata,
        });

        console.log('Chunk processed:', chunk);
      }

      console.log(upsertChunk);

      let chunkIndex = 1;
      for (const chunk of upsertChunk) {
        // await this.redisService.hsetObject(`pinecone-${chunk.id}`, JSON.stringify(chunk)); // Store vector as part of the hash
        this.appService.insertHisory(
          chunk.metadata.context,
          chunk.values,
          fileId,
          chunkIndex,
        );
        chunkIndex++;
      }

      return { success: true };
    } catch (error) {
      console.error('Error inserting new data:', error);
      return { success: false, error: error.message };
    }
  }

  @Get('chat')
  @ApiOperation({ summary: 'Open chat page to chat with Ollama through websocket' })
  @ApiResponse({ status: 200, description: 'Get page successfully' })
  @Render('chat')
  async chat() {
    try {
      return {};
    } catch (error) {
      console.error('Error in searchSimilarText:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('upload-file')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload Vietname history file in api to postgres database' })
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
  @ApiResponse({ status: 200, description: 'Data get successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    try {
      const upsertChunk = [];
      // Use file.filename to check extension and file.path for actual file location
      let extractedText = '';
      // Get the file name without the .docx or .doc extension
      const baseName = file.originalname
        .replace(/\.docx?$/i, '') // Remove .doc or .docx (case-insensitive)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      const extension = '.' + file.originalname.split('.').pop();
      const newName =
        slugify(baseName, { lower: true, strict: true, locale: 'vi' }) +
        extension;

      //save temp file to local disk
      fs.writeFileSync(`./temp/${newName}`, file.buffer);
      const resolvedPath = require('path').resolve(`./temp/${newName}`);

      if (file.originalname.endsWith('.docx')) {
        // Extract text from the .docx file using mammoth
        const { value } = await mammoth.extractRawText({ path: resolvedPath });
        extractedText = value;
      } else if (file.originalname.endsWith('.doc')) {
        // Handle .doc files
        if (fs.existsSync(resolvedPath)) {
          const extractor = new WordExtractor();
          const doc = await extractor.extract(resolvedPath);
          extractedText = doc.getBody();
        } else {
          throw new Error(`File does not exist: ${resolvedPath}`);
        }
      }
      else if (file.originalname.endsWith('.xlsx')) {
        let workbook = XLSX.readFile(resolvedPath);
        const allText = [];

        workbook.SheetNames.forEach((sheetName) => {
          //get the
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet, {header: 1});
          data.forEach((row: any[]) => {
            const text = row.filter(Boolean).join(' ');
            if(text.trim){
              allText.push(text);
            }
          });
        })

        extractedText = allText.join('\n');
      }

      // Remove all newlines and replace them with a normal space
      extractedText = extractedText.replace(/\r?\n|\r/g, ' ');

      //count total chunk
      const chunks = await this.chunkByTokens(extractedText, 500, 50);

      const fileId = await this.appService.saveFile(
        newName,
        file.mimetype,
        file.size,
        chunks.length,
      );
      console.log('Saved file with ID:', fileId);

      for (const chunk of chunks) {
        const metadata = {
          filePath: resolvedPath,
          context: chunk,
        };

        // Extract the vector array from the embedding result
        const embeddings = await this.appService.embeddingData(chunk);

        upsertChunk.push({
          values: embeddings,
          metadata: metadata,
        });

        console.log('Chunk processed:', chunk);
      }

      console.log(upsertChunk);

      let chunkIndex = 1;
      for (const chunk of upsertChunk) {
        // await this.redisService.hsetObject(`pinecone-${chunk.id}`, JSON.stringify(chunk)); // Store vector as part of the hash
        this.appService.insertHisory(
          chunk.metadata.context,
          chunk.values,
          fileId,
          chunkIndex,
        );
        chunkIndex++;
      }

      return { success: true, file_id: fileId };
    } catch (error) {
      console.error('Error in uploadFile:', error);
      return { success: false, error: error.message };
    }
  }

  @Get('history/:id')
  @ApiOperation({ summary: 'Get all history by file id' })
  @ApiResponse({ status: 200, description: 'Get history successfully' })
  async getAllHistoryByFileId(@Param('id') id: number): Promise<History[]> {
    return await this.appService.getAllHistoryByFileId(id);
  }
}
