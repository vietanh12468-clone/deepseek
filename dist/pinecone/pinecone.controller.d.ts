import { PineconeService } from './pinecone.service';
export declare class PineconeController {
    private readonly pineconeService;
    constructor(pineconeService: PineconeService);
    upsertData(file: Express.Multer.File): Promise<{
        success: boolean;
        result: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        result?: undefined;
    }>;
    upload(file: Express.Multer.File): Promise<void>;
    toUnicodeCodePoints(str: string): Promise<string[]>;
    searchSimilarText(text: string): Promise<{
        success: boolean;
        data: import("@pinecone-database/pinecone").RankedDocument[];
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    deleteData(ids: string[]): Promise<{
        success: boolean;
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
    }>;
    getDataById(id: string): Promise<{
        success: boolean;
        data: import("@pinecone-database/pinecone").PineconeRecord<import("@pinecone-database/pinecone").RecordMetadata>;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        data?: undefined;
    }>;
    reset(): Promise<{
        success: boolean;
        error: any;
    }>;
    askHistoryQuestions(question: string): Promise<string[]>;
}
