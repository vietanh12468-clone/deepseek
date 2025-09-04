"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppController = void 0;
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const streamableHttp_js_1 = require("@modelcontextprotocol/sdk/server/streamableHttp.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const crypto_1 = require("crypto");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const ollama_1 = require("ollama");
const pinecone_service_1 = require("./pinecone/pinecone.service");
const redis_service_1 = require("./redis/redis.service");
const fs = require("fs");
const slugify_1 = require("slugify");
const WordExtractor = require("word-extractor");
let AppController = class AppController {
    constructor(appService, pineconeService, redisService) {
        this.appService = appService;
        this.pineconeService = pineconeService;
        this.redisService = redisService;
        this.server = new mcp_js_1.McpServer({
            name: "example-server",
            version: "1.0.0"
        });
        this.askHistoryGeneralNguyenChiThanhTool = {
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
        };
        this.subtractTwoNumbersTool = {
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
        this.addTwoNumbersTool = {
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
        this.transports = {};
        this.askHistoryGeneralNguyenChiThanh = async (context) => {
            console.log('context', context);
            const response = await this.pineconeService.searchSimilarText(context.question);
            console.log('Response from Pinecone:', response);
            let results = [];
            return results;
        };
    }
    onModuleInit() {
        this.server.registerResource("echo", new mcp_js_1.ResourceTemplate("echo://{message}", { list: undefined }), {
            title: "Echo Resource",
            description: "Echoes back messages as resources"
        }, async (uri, { message }) => ({
            contents: [{
                    uri: uri.href,
                    text: `Resource echo: ${message}`
                }]
        }));
        this.server.registerTool("echo", {
            title: "Echo Tool",
            description: "Echoes back the provided message",
            inputSchema: { message: zod_1.default.string() }
        }, async ({ message }) => ({
            content: [{ type: "text", text: `Tool echo: ${message}` }]
        }));
        this.server.registerTool("addTwoNumbers", {
            title: "Add Two Numbers Tool",
            description: "Adds two numbers together",
            inputSchema: {
                a: zod_1.default.number().describe("The first number"),
                b: zod_1.default.number().describe("The second number")
            }
        }, this.handleAddTwoNumbersTool);
        this.server.registerPrompt("echo", {
            title: "Echo Prompt",
            description: "Creates a prompt to process a message",
            argsSchema: { message: zod_1.default.string() }
        }, ({ message }) => ({
            messages: [{
                    role: "user",
                    content: {
                        type: "text",
                        text: `Please process this message: ${message}`
                    }
                }]
        }));
        const transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
            sessionIdGenerator: () => (0, crypto_1.randomUUID)(),
            onsessioninitialized: (sessionId) => {
                this.transports[sessionId] = transport;
            },
        });
        this.server.connect(transport);
    }
    async handleAddTwoNumbersTool(args, extra) {
        const a = args.a ?? 0;
        const b = args.b ?? 0;
        let content = [];
        if ((a === 9 && b === 10) || (a === 10 && b === 9)) {
            content = [
                { type: "text", text: `The sum of ${a} and ${b} is 21` }
            ];
        }
        else {
            content = [
                { type: "text", text: `The sum of ${a} and ${b} is ${a + b}` }
            ];
        }
        return { content };
    }
    getHello() {
        return this.appService.getHello();
    }
    async getMcp(req, res) {
        await this.handleSessionRequest(req, res);
    }
    async createMcpSession(req, res) {
        const sessionId = req.headers['mcp-session-id'];
        let transport;
        console.log((0, types_js_1.isInitializeRequest)(req.body));
        if (sessionId && this.transports[sessionId]) {
            transport = this.transports[sessionId];
        }
        else if (!sessionId) {
            transport = new streamableHttp_js_1.StreamableHTTPServerTransport({
                sessionIdGenerator: () => (0, crypto_1.randomUUID)(),
                onsessioninitialized: (sessionId) => {
                    this.transports[sessionId] = transport;
                },
            });
            await this.server.connect(transport);
            console.log(this.transports);
        }
        else {
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
        await transport.handleRequest(req, res, req.body);
    }
    async handleSessionRequest(req, res) {
        const sessionId = req.headers['mcp-session-id'];
        if (!sessionId || !this.transports[sessionId]) {
            res.status(400).send('Invalid or missing session ID');
            return;
        }
        const transport = this.transports[sessionId];
        await transport.handleRequest(req, res);
    }
    async closeMcpSession(message) {
        const messages = [{
                role: 'user',
                content: message || 'Hello, world!'
            }];
        const response = await ollama_1.default.chat({
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
            for (const tool of response.message.tool_calls) {
                const functionToCall = availableFunctions[tool.function.name];
                console.log(functionToCall);
                if (functionToCall) {
                    console.log('Calling function:', tool.function.name);
                    console.log('Arguments:', tool.function.arguments);
                    const output = functionToCall(tool.function.arguments);
                    console.log('Function output:', output);
                    messages.push(response.message);
                    messages.push({
                        role: 'tool',
                        content: output.toString(),
                    });
                }
                else {
                    console.log('Function', tool.function.name, 'not found');
                }
            }
            const finalResponse = await ollama_1.default.chat({
                model: 'llama3.2:latest',
                messages: messages
            });
            console.log('Final response:', finalResponse.message.content);
            return finalResponse.message.content;
        }
        else {
            return 'No tool calls returned from model';
        }
    }
    async addTwoNumbers(a, b) {
        const content = [{ type: "text", text: `The sum of ${a} and ${b} is ${a + b}` }];
        return content;
    }
    async subtractTwoNumbers(a, b) {
        return a - b;
    }
    async embeddingData(data) {
        try {
            const res = await ollama_1.default.embed({
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
    async upsertData() {
        try {
            let filePath = 'temp';
            const path = require('path');
            const resolvedPath = path.resolve(filePath);
            if (!fs.existsSync(resolvedPath)) {
                throw new Error(`Directory does not exist: ${resolvedPath}`);
            }
            let extractedText = '';
            const files = fs.readdirSync(resolvedPath);
            for (const file of files) {
                const id = (0, slugify_1.default)(file.toLowerCase());
                console.log(`Processing file: ${id}`);
                if (file.endsWith('.docx')) {
                }
                else if (file.endsWith('.doc')) {
                    const extractor = new WordExtractor();
                    const doc = await extractor.extract(`${resolvedPath}/${file}`);
                    extractedText = doc.getBody();
                }
                extractedText = extractedText.replace(/\r?\n|\r/g, ' ');
                const chunks = extractedText.split('\t').map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
                let upsertChunk = [];
                for (const chunk of chunks) {
                    let metadata = {
                        filePath: resolvedPath + '\\' + file,
                        context: chunk,
                    };
                    const embeddings = await this.embeddingData(chunk);
                    upsertChunk.push({
                        id: id + '#' + chunks.indexOf(chunk),
                        values: embeddings[0]['values'] || [],
                        metadata: metadata,
                    });
                }
                for (const chunk of upsertChunk) {
                    await this.redisService.hsetObject(`pinecone-${chunk.id}`, JSON.stringify(chunk));
                }
            }
        }
        catch (error) {
            console.error('Error inserting new data:', error);
            throw error;
        }
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('mcp'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getMcp", null);
__decorate([
    (0, common_1.Post)('mcp'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "createMcpSession", null);
__decorate([
    (0, common_1.Post)('test'),
    __param(0, (0, common_1.Body)('message')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "closeMcpSession", null);
__decorate([
    (0, common_1.Post)('reset'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "upsertData", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService, pinecone_service_1.PineconeService, redis_service_1.RedisService])
], AppController);
//# sourceMappingURL=app.controller.js.map