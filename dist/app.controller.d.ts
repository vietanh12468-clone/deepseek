import { OnModuleInit } from '@nestjs/common';
import { AppService } from './app.service';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { PineconeService } from './pinecone/pinecone.service';
import { RedisService } from './redis/redis.service';
export declare class AppController implements OnModuleInit {
    private readonly appService;
    private readonly pineconeService;
    private readonly redisService;
    constructor(appService: AppService, pineconeService: PineconeService, redisService: RedisService);
    private server;
    askHistoryGeneralNguyenChiThanhTool: {
        type: string;
        function: {
            name: string;
            description: string;
            parameters: {
                type: string;
                required: string[];
                properties: {
                    question: {
                        type: string;
                        description: string;
                    };
                };
            };
        };
    };
    subtractTwoNumbersTool: {
        type: string;
        function: {
            name: string;
            description: string;
            parameters: {
                type: string;
                required: string[];
                properties: {
                    a: {
                        type: string;
                        description: string;
                    };
                    b: {
                        type: string;
                        description: string;
                    };
                };
            };
        };
    };
    addTwoNumbersTool: {
        type: string;
        function: {
            name: string;
            description: string;
            parameters: {
                type: string;
                required: string[];
                properties: {
                    a: {
                        type: string;
                        description: string;
                    };
                    b: {
                        type: string;
                        description: string;
                    };
                };
            };
        };
    };
    onModuleInit(): void;
    handleAddTwoNumbersTool(args: {
        a?: number;
        b?: number;
    }, extra?: any): Promise<{
        content: any[];
    }>;
    getHello(): string;
    transports: {
        [sessionId: string]: StreamableHTTPServerTransport;
    };
    getMcp(req: any, res: any): Promise<void>;
    createMcpSession(req: any, res: any): Promise<void>;
    handleSessionRequest(req: any, res: any): Promise<void>;
    closeMcpSession(message: string): Promise<string>;
    addTwoNumbers(a: number, b: number): Promise<{
        type: string;
        text: string;
    }[]>;
    subtractTwoNumbers(a: number, b: number): Promise<number>;
    askHistoryGeneralNguyenChiThanh: (context: {
        question: string;
    }) => Promise<string[]>;
    embeddingData(data: any): Promise<Array<any>>;
    upsertData(): Promise<void>;
}
