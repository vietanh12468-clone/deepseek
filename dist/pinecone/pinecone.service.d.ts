import { OnModuleInit } from '@nestjs/common';
import { Index, Pinecone } from '@pinecone-database/pinecone';
export declare class PineconeService implements OnModuleInit {
    pinecone: Pinecone;
    index: Index;
    namespace: Index;
    idNamespace: Index;
    docParameters: {
        inputType: string;
        outputType: string;
    };
    constructor();
    onModuleInit(): Promise<void>;
    upsertData(data: any, id?: string, metadata?: any): Promise<any[]>;
    embeddingData(data: any): Promise<Array<any>>;
    searchSimilarText(text: string): Promise<import("@pinecone-database/pinecone").RankedDocument[]>;
    deleteData(ids: string[]): Promise<{
        success: boolean;
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        message?: undefined;
    }>;
    getDataById(id: string): Promise<import("@pinecone-database/pinecone").PineconeRecord<import("@pinecone-database/pinecone").RecordMetadata>>;
    InsertNewData(filePath: string): Promise<void>;
    createIdNameSpace(id: string, idName?: string | null): Promise<void>;
}
