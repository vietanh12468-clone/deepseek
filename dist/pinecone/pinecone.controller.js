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
exports.PineconeController = void 0;
const common_1 = require("@nestjs/common");
const pinecone_service_1 = require("./pinecone.service");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const fs = require("fs");
const mammoth = require("mammoth");
const slugify_1 = require("slugify");
const WordExtractor = require("word-extractor");
let PineconeController = class PineconeController {
    constructor(pineconeService) {
        this.pineconeService = pineconeService;
    }
    async upsertData(file) {
        try {
            if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.mimetype === 'application/msword') {
                const tempDir = './temp';
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir);
                }
                const tempPath = `${tempDir}/${file.originalname}`;
                fs.writeFileSync(tempPath, file.buffer);
                const id = (0, slugify_1.default)(file.originalname, { lower: true, strict: true });
                if (file.originalname.endsWith('.docx')) {
                    const { value: extractedText } = await mammoth.extractRawText({ path: tempPath });
                    fs.unlinkSync(tempPath);
                    const id = file.originalname
                        .toLowerCase()
                        .trim()
                        .replace(/[\s\W-]+/g, '-')
                        .replace(/^-+|-+$/g, '');
                    await this.pineconeService.upsertData(extractedText, id);
                    return { success: true, result: extractedText };
                }
                else if (file.originalname.endsWith('.doc')) {
                    console.log('tempPath:', tempPath);
                    const extractor = new WordExtractor();
                    const doc = await extractor.extract(tempPath);
                    const extractedText = doc.getBody();
                    fs.unlinkSync(tempPath);
                    const id = file.originalname
                        .toLowerCase()
                        .trim()
                        .replace(/[\s\W-]+/g, '-')
                        .replace(/^-+|-+$/g, '');
                    await this.pineconeService.upsertData(extractedText, id);
                    return { success: true, result: extractedText };
                }
            }
        }
        catch (error) {
            console.error('Error in upsertData:', error);
            return { success: false, error: error.message };
        }
    }
    async upload(file) {
        try {
            console.log('File uploaded:', file);
            const result = await this.pineconeService.upsertData(file);
        }
        catch (error) {
            console.error('Error in upload:', error);
        }
    }
    async toUnicodeCodePoints(str) {
        return Array.from(str).map(char => {
            const code = char.codePointAt(0);
            return 'U+' + code.toString(16).toUpperCase().padStart(4, '0');
        });
    }
    async searchSimilarText(text) {
        try {
            const res = await this.pineconeService.searchSimilarText(text);
            return { success: true, data: res };
        }
        catch (error) {
            console.error('Error in searchSimilarText:', error);
            return { success: false, error: error.message };
        }
    }
    async deleteData(ids) {
        try {
            const res = await this.pineconeService.deleteData(ids);
            return res;
        }
        catch (error) {
            console.error('Error in deleteData:', error);
            return { success: false, error: error.message };
        }
    }
    async getDataById(id) {
        try {
            const data = await this.pineconeService.getDataById(id);
            return { success: true, data };
        }
        catch (error) {
            console.error('Error in getDataById:', error);
            return { success: false, error: error.message };
        }
    }
    async reset() {
        try {
            await this.pineconeService.InsertNewData("temp");
        }
        catch (error) {
            console.error('Error in resetIndex:', error);
            return { success: false, error: error.message };
        }
    }
    async askHistoryQuestions(question) {
        try {
            const response = await this.pineconeService.searchSimilarText(question);
            console.log('Response from Pinecone:', response);
            let results = [];
            return results;
        }
        catch (error) {
            console.error('Error in askHistoryQuestions:', error);
            return [];
        }
    }
};
exports.PineconeController = PineconeController;
__decorate([
    (0, common_1.Post)('upsert'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload file', description: 'Upload file' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'uploaded' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PineconeController.prototype, "upsertData", null);
__decorate([
    (0, common_1.Post)('upload'),
    (0, swagger_1.ApiOperation)({ summary: 'Upload file', description: 'Upload file' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'uploaded' }),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PineconeController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('text')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PineconeController.prototype, "searchSimilarText", null);
__decorate([
    (0, common_1.Delete)('delete'),
    __param(0, (0, common_1.Body)('ids')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], PineconeController.prototype, "deleteData", null);
__decorate([
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PineconeController.prototype, "getDataById", null);
__decorate([
    (0, common_1.Get)('reset/all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PineconeController.prototype, "reset", null);
__decorate([
    (0, common_1.Post)('ask-history-questions'),
    __param(0, (0, common_1.Body)('question')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PineconeController.prototype, "askHistoryQuestions", null);
exports.PineconeController = PineconeController = __decorate([
    (0, common_1.Controller)('pinecone'),
    __metadata("design:paramtypes", [pinecone_service_1.PineconeService])
], PineconeController);
//# sourceMappingURL=pinecone.controller.js.map