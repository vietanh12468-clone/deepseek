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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PineconeService = void 0;
const common_1 = require("@nestjs/common");
const pinecone_1 = require("@pinecone-database/pinecone");
const fs = require("fs");
const mammoth = require("mammoth");
const slugify_1 = require("slugify");
const WordExtractor = require("word-extractor");
let PineconeService = class PineconeService {
    constructor() {
        this.docParameters = {
            inputType: 'passage',
            outputType: 'END',
        };
        console.log('Initializing Pinecone service...' + process.env.PINECONE_API_KEY);
        this.pinecone = new pinecone_1.Pinecone({
            apiKey: process.env.PINECONE_API_KEY,
        });
    }
    async onModuleInit() {
        try {
            this.index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
            this.namespace = this.index.namespace(process.env.PINECONE_NAMESPACE) || this.index.namespace('sample-namespace');
            this.idNamespace = this.index.namespace(process.env.PINECONE_ID_NAMESPACE) || this.index.namespace('sample-id-namespace');
        }
        catch (error) {
            console.error('Error initializing Pinecone service:', error);
            throw error;
        }
    }
    async upsertData(data, id = 'id2', metadata = {}) {
        const embeddings = await this.embeddingData(data);
        await this.namespace.upsert([
            {
                id,
                values: embeddings[0]['values'] || [],
                metadata: metadata || {},
            }
        ]);
        return embeddings;
    }
    async embeddingData(data) {
        try {
            const embedData = await this.pinecone.inference.embed(process.env.PINECONE_MODEL_NAME, [data], {
                inputType: 'query',
                truncate: 'END',
            });
            return Array.from(embedData.data.values());
        }
        catch (error) {
            console.error('Error generating embeddings:', error);
        }
    }
    async searchSimilarText(text) {
        try {
            const embeddings = await this.embeddingData(text);
            const queryVector = embeddings[0]['values'] || [];
            const response = await this.namespace.query({
                vector: queryVector,
                topK: 5,
                includeMetadata: true,
            });
            console.log('Response from Pinecone:', response);
            const rankedResult = await this.pinecone.inference.rerank(process.env.PINECONE_RERANK_MODEL_NAME, text, response.matches.map((match) => match.metadata), {
                topN: 5,
                rankFields: ['context'],
            });
            console.log('Ranked Result:', rankedResult);
            console.log('Response from Pinecone:', response);
            return rankedResult.data;
        }
        catch (error) {
            console.error('Error searching similar text:', error);
            throw error;
        }
    }
    async deleteData(ids) {
        try {
            await this.namespace.deleteMany(ids);
            return { success: true, message: `Data with id ${ids} deleted successfully.` };
        }
        catch (error) {
            console.error('Error deleting data:', error);
            return { success: false, error: error.message };
        }
    }
    async getDataById(id) {
        try {
            const response = await this.namespace.fetch([id]);
            if (response.records[id]) {
                return response.records[id];
            }
        }
        catch (error) {
            console.error('Error fetching data by id:', error);
            throw error;
        }
    }
    async InsertNewData(filePath) {
        try {
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
                    extractedText = await mammoth.extractRawText({ path: `${resolvedPath}/${file}` }).then(result => result.value);
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
                await this.createIdNameSpace(id);
                await this.namespace.upsert(upsertChunk);
            }
        }
        catch (error) {
            console.error('Error inserting new data:', error);
            throw error;
        }
    }
    async createIdNameSpace(id, idName = null) {
        try {
            const generatedIdName = idName ?? Math.random().toString(36).substring(2, 10);
            const embeddings = await this.embeddingData(id);
            await this.idNamespace.upsert([
                {
                    id: `${id}#${generatedIdName}`,
                    values: embeddings[0]['values'] || [],
                    metadata: {
                        id: id,
                        name: generatedIdName,
                    },
                }
            ]);
        }
        catch (error) {
            console.error('Error creating ID namespace:', error);
            throw error;
        }
    }
};
exports.PineconeService = PineconeService;
exports.PineconeService = PineconeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PineconeService);
//# sourceMappingURL=pinecone.service.js.map