import { Controller, Get, Headers, Post, Request, Res, OnModuleInit, Body, UseInterceptors, UploadedFile, Render } from '@nestjs/common';
import { AppService } from './app.service';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import ollama, { EmbedResponse } from 'ollama'
import { PineconeService } from './pinecone/pinecone.service';
import { RedisService } from './redis/redis.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import slugify from 'slugify';
import * as mammoth from 'mammoth';
import { get_encoding, encoding_for_model } from "tiktoken";
import { promises } from 'dns';
import e from 'express';
const WordExtractor = require("word-extractor");

@Controller()
export class AppController implements OnModuleInit {
  constructor(private readonly appService: AppService, private readonly pineconeService: PineconeService, private readonly redisService: RedisService) { }
  public enc = encoding_for_model("gpt-3.5-turbo")

  private server = new McpServer({
    name: "example-server",
    version: "1.0.0"
  });

  public checkVietNamHistoryTool = {
    type: 'function',
    function: {
      name: 'checkVietNamHistory',
      description: 'retrieve history data of Viet Nam from database',
      parameters: {
        type: 'object',
        required: ['question'],
        properties: {
          question: { type: 'string', description: 'The history question to ask' }
        }
      }
    }
  }

  public subtractTwoNumbersTool = {
    type: 'function',
    function: {
      name: 'subtractTwoNumbers',
      description: 'Subtract two numbers',
      parameters: {
        type: 'object',
        required: ['a', 'b'],
        properties: {
          a: { type: 'number', description: 'The first number' },
          b: { type: 'number', description: 'The second number' }
        }
      }
    }
  };

  public addTwoNumbersTool = {
    type: 'function',
    function: {
      name: 'addTwoNumbers',
      description: 'Add two numbers together',
      parameters: {
        type: 'object',
        required: ['a', 'b'],
        properties: {
          a: { type: 'number', description: 'The first number' },
          b: { type: 'number', description: 'The second number' }
        }
      }
    }
  };

  onModuleInit() {
    this.server.registerResource(
      "echo",
      new ResourceTemplate("echo://{message}", { list: undefined }),
      {
        title: "Echo Resource",
        description: "Echoes back messages as resources"
      },
      async (uri, { message }) => ({
        contents: [{
          uri: uri.href,
          text: `Resource echo: ${message}`
        }]
      })
    );

    this.server.registerTool(
      "echo",
      {
        title: "Echo Tool",
        description: "Echoes back the provided message",
        inputSchema: { message: z.string() }
      },
      async ({ message }) => ({
        content: [{ type: "text", text: `Tool echo: ${message}` }]
      })
    );

    this.server.registerTool(
      "addTwoNumbers",
      {
        title: "Add Two Numbers Tool",
        description: "Adds two numbers together",
        inputSchema: {
          a: z.number().describe("The first number"),
          b: z.number().describe("The second number")
        }
      },
      this.handleAddTwoNumbersTool
    );

    this.server.registerPrompt(
      "echo",
      {
        title: "Echo Prompt",
        description: "Creates a prompt to process a message",
        argsSchema: { message: z.string() }
      },
      ({ message }) => ({
        messages: [{
          role: "user",
          content: {
            type: "text",
            text: `Please process this message: ${message}`
          }
        }]
      })
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

  async handleAddTwoNumbersTool(
    args: { a?: number; b?: number },
    extra?: any
  ) {
    const a = args.a ?? 0;
    const b = args.b ?? 0;

    let content = []
    if ((a === 9 && b === 10) || (a === 10 && b === 9)) {
      content = [
        { type: "text" as const, text: `The sum of ${a} and ${b} is 21` }
      ];
    }
    else {
      content = [
        { type: "text" as const, text: `The sum of ${a} and ${b} is ${a + b}` }
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

  @Post('test')
  async closeMcpSession(@Body('message') message: string) {
    const messages = [
      { role: "system", content: "Think step by step (COT), then make a decision (COD) before answering. Always respond in vietnamese, no matter the input language." },
      {
        role: 'user',
        content: message || 'Hello, world!'
      }
    ]

    // const response = await this.pineconeService.searchSimilarText(message)
    // console.log('Response from Pinecone:', response);
    // let results = [];
    // for (const item of response) {
    //   console.log('Found similar text:', item);
    //   results.push(item.metadata.context);
    // }

    // return results;

    const response = await ollama.chat({
      model: 'llama3.2',
      messages: messages,
      tools: [this.subtractTwoNumbersTool, this.addTwoNumbersTool, this.checkVietNamHistoryTool],
    });

    const availableFunctions = {
      addTwoNumbers: this.addTwoNumbers,
      subtractTwoNumbers: this.subtractTwoNumbers,
      checkVietNamHistory: this.checkVietNamHistory
    };

    if (response.message.tool_calls) {
      // Process tool calls from the response
      for (const tool of response.message.tool_calls) {
        const functionToCall = availableFunctions[tool.function.name];
        console.log(functionToCall);
        if (functionToCall) {
          console.log('Calling function:', tool.function.name);
          console.log('Arguments:', tool.function.arguments);
          const output = await functionToCall(tool.function.arguments);

          // Add the function response to messages for the model to use
          messages.push(response.message);
          messages.push({
            role: 'tool',
            content: output.toString(),
          });
        } else {
          console.log('Function', tool.function.name, 'not found');
        }
      }

      console.log('Messages for final response:', messages);

      // Get final response from model with function outputs
      const finalResponse = await ollama.chat({
        model: 'llama3.2',
        messages: messages
      });
      console.log('Final response:', finalResponse.message.content);
      return finalResponse.message.content;
    } else {
      return 'No tool calls returned from model: ' + JSON.stringify(response.message.content);
    }
  }

  async addTwoNumbers(a: number, b: number) {
    const content = [{ type: "text", text: `The sum of ${a} and ${b} is ${a + b}` }]

    return content
  }

  async subtractTwoNumbers(a: number, b: number): Promise<number> {
    return a - b;
  }

  checkVietNamHistory = async (context: { question: string }): Promise<string> => {
    // Simulate a history question answer
    console.log('context', context);
    // const response = await this.pineconeService.searchSimilarText(context.question)
    const embeddings = (await this.embeddingData(context.question))[0];
    // console.log('embeddings', embeddings);
    const response = await this.appService.searchSimilarVietNamHistory(embeddings);
    // console.log('Response from Pinecone:', response);
    let results = [];
    for (const item of response) {
      console.log('Found similar text:', item);
      results.push(item.context);
    }
    const answer = results.join(' . ');
    console.log('Answer:', answer);
    return answer;
  }

  async embeddingData(data: any): Promise<number[][]> {
    try {
      const res = await ollama.embed({
        model: 'mxbai-embed-large',
        input: data
      });
      return res.embeddings;
    }
    catch (error) {
      console.error('Error in embeddingData:', error);
      throw error;
    }
  }

  @Post('reset')
  async upsertData() {
    try {
      let filePath = 'temp'
      //get all the files in the directory
      const path = require('path');
      const resolvedPath = path.resolve(filePath);
      if (!fs.existsSync(resolvedPath)) {
        throw new Error(`Directory does not exist: ${resolvedPath}`);
      }

      let extractedText = '';
      const files = fs.readdirSync(resolvedPath);
      for (const file of files) {
        const id = slugify(file.toLowerCase())
        console.log(`Processing file: ${id}`);

        if (file.endsWith('.docx')) {
          // Extract text from the .docx file using mammoth
          // Upsert the extracted text using pineconeService
          const { value: extractedText } = await mammoth.extractRawText({ path: `${resolvedPath}/${file}` });
        }

        else if (file.endsWith('.doc')) {
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

        let upsertChunk = []
        for (const chunk of chunks) {
          let metadata = {
            filePath: resolvedPath + '\\' + file,
            context: chunk,
          }

          // Extract the vector array from the embedding result
          const embeddings = await this.embeddingData(chunk);

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
          this.appService.insertHisory(chunk.metadata.context, chunk.values, 45, i);
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

  @Post('Search')
  async searchSimilarVietNamHistory(@Body('question') question: string) {
    try {
      const embeddings = (await this.embeddingData('question'))[0];
      const res = await this.appService.searchSimilarVietNamHistory(embeddings);
      return { success: true, data: res };
    } catch (error) {
      console.error('Error in searchSimilarText:', error);
      return { success: false, error: error.message };
    }
  }

  async chunkByTokens(text: string, chunkSize = 500, overlap = 50): Promise<string[]> {
    const tokens = this.enc.encode(text);
    const chunks: string[] = [];

    let start = 0;
    while (start < tokens.length) {
      const end = Math.min(start + chunkSize, tokens.length);
      const chunk = this.enc.decode(tokens.slice(start, end));
      chunks.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk));
      start += chunkSize - overlap;
    }
    return chunks;
  }

  @Get('home')
  @Render('index')
  async homeView() {
    return {
      tags: ["🤔 What is WappGPT?", "💰 Pricing", "❓ FAQs"],
      placeholder: "1.Type your message here..."
    };
  }

  @Post('check-confirm')
  @Render('index')
  @UseInterceptors(FileInterceptor('file'))
  async handleCheckConfirm(@UploadedFile() file: Express.Multer.File, @Body() body: any) {
    try {

      // Use file.filename to check extension and file.path for actual file location
      let extractedText = '';
      // Get the file name without the .docx or .doc extension
      let baseName = file.originalname
        .replace(/\.docx?$/i, '') // Remove .doc or .docx (case-insensitive)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      let extension = '.' + file.originalname.split('.').pop();
      let newName = slugify(baseName, { lower: true, strict: true, locale: 'vi' }) + extension;

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
      let chunks = await this.chunkByTokens(extractedText, 500, 50);

      return {
        tags: ["🤔 What is WappGPT?", "💰 Pricing", "❓ FAQs"],
        placeholder: "1.Type your message here...",
        chunks: chunks,
        extractedText: extractedText,
        file: { name: newName, size: file.size, type: file.mimetype, path: resolvedPath },
      };

    } catch (error) {
      console.error('Error handling form submission:', error);
    }
  }

  @Post('confirm')
  async handleConfirm(@Body() body: any) {
    try {
      let upsertChunk = []

      console.log('Body received:', body);
      let extractedText = '';
      if (body.fileName.endsWith('.docx')) {
        // Extract text from the .docx file using mammoth
        // Upsert the extracted text using pineconeService
        extractedText = (await mammoth.extractRawText({ path: `${body.resolvedPath}` }).then(result => result.value));
      }

      else if (body.fileName.endsWith('.doc')) {
        // Handle .doc files (you might need a different library for .doc files)
        // For simplicity, let's assume we can read it as text
        const extractor = new WordExtractor();
        const doc = await extractor.extract(`${body.resolvedPath}`);
        extractedText = doc.getBody();
      }

      let chunks = await this.chunkByTokens(extractedText, 500, 50);

      let fileId = await this.appService.saveFile(body.fileName, body.fileType, body.fileSize, chunks.length);
      console.log('Saved file with ID:', fileId);

      for (const chunk of chunks) {
        let metadata = {
          filePath: body.resolvedPath,
          context: chunk,
        }

        // Extract the vector array from the embedding result
        const embeddings = await this.embeddingData(chunk);

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
        this.appService.insertHisory(chunk.metadata.context, chunk.values, fileId, chunkIndex);
        chunkIndex++;
      }

      return { success: true };

    }
    catch (error) {
      console.error('Error inserting new data:', error);
      return { success: false, error: error.message };
    }
  }
}