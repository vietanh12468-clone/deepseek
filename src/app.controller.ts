import { Controller, Get, Headers, Post, Request, Res, OnModuleInit, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { AppService } from './app.service';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'crypto';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import z from 'zod';
import ollama from 'ollama'
import { PineconeService } from './pinecone/pinecone.service';
import { RedisService } from './redis/redis.service';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import slugify from 'slugify';
import * as mammoth from 'mammoth';
const WordExtractor = require("word-extractor");

@Controller()
export class AppController implements OnModuleInit {
  constructor(private readonly appService: AppService, private readonly pineconeService: PineconeService, private readonly redisService: RedisService) { }

  private server = new McpServer({
    name: "example-server",
    version: "1.0.0"
  });

  public askHistoryGeneralNguyenChiThanhTool = {
    type: 'function',
    function: {
      name: 'askHistoryGeneralNguyenChiThanh',
      description: 'retrieve history data of General Nguyen Chi Thanh from database',
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
    const messages = [{
      role: 'user',
      content: message || 'Hello, world!'
    }]

    // const response = await this.pineconeService.searchSimilarText(message)
    // console.log('Response from Pinecone:', response);
    // let results = [];
    // for (const item of response) {
    //   console.log('Found similar text:', item);
    //   results.push(item.metadata.context);
    // }

    // return results;

    const response = await ollama.chat({
      model: 'llama3.2:latest',
      messages: messages,
      tools: [this.subtractTwoNumbersTool, this.addTwoNumbersTool, this.askHistoryGeneralNguyenChiThanhTool],
    });

    const availableFunctions = {
      addTwoNumbers: this.addTwoNumbers,
      subtractTwoNumbers: this.subtractTwoNumbers,
      askHistoryGeneralNguyenChiThanh: this.askHistoryGeneralNguyenChiThanh
    };

    if (response.message.tool_calls) {
      // Process tool calls from the response
      for (const tool of response.message.tool_calls) {
        const functionToCall = availableFunctions[tool.function.name];
        console.log(functionToCall);
        if (functionToCall) {
          console.log('Calling function:', tool.function.name);
          console.log('Arguments:', tool.function.arguments);
          const output = functionToCall(tool.function.arguments);
          console.log('Function output:', output);

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

      // Get final response from model with function outputs
      const finalResponse = await ollama.chat({
        model: 'llama3.2:latest',
        messages: messages
      });
      console.log('Final response:', finalResponse.message.content);
      return finalResponse.message.content;
    } else {
      return 'No tool calls returned from model';
    }
  }

  async addTwoNumbers(a: number, b: number) {
    const content = [{ type: "text", text: `The sum of ${a} and ${b} is ${a + b}` }]

    return content
  }

  async subtractTwoNumbers(a: number, b: number): Promise<number> {
    return a - b;
  }

  askHistoryGeneralNguyenChiThanh = async (context: { question: string }): Promise<string[]> => {
    // Simulate a history question answer
    console.log('context', context);
    const response = await this.pineconeService.searchSimilarText(context.question)
    console.log('Response from Pinecone:', response);
    let results = [];
    // for (const item of response) {
    //   console.log('Found similar text:', item);
    //   results.push(item.metadata.context);
    // }

    return results;
  }

  async embeddingData(data: any): Promise<Array<any>> {
    try {
      const res = await ollama.embed({
        model: 'nomic-embed-text',
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
        const chunks = extractedText.split('\t').map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);

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
            values: embeddings[0]['values'] || [],
            metadata: metadata,
          });
        }

        for (const chunk of upsertChunk) {
          await this.redisService.hsetObject(`pinecone-${chunk.id}`, JSON.stringify(chunk)); // Store vector as part of the hash
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
}