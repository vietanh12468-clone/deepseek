import { Injectable } from '@nestjs/common';
import ollama from 'ollama';

@Injectable()
export class EmbeddingService {
  private readonly defaultModel: string;

  constructor() {
    this.defaultModel = process.env.OLLAMA_EMBED_MODEL || 'mxbai-embed-large';
  }

  async generateEmbedding(text: string, model?: string): Promise<number[]> {
    try {
      const response = await ollama.embed({
        model: model || this.defaultModel,
        input: text,
      });
      
      return response.embeddings[0];
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  async generateEmbeddings(texts: string[], model?: string): Promise<number[][]> {
    try {
      const response = await ollama.embed({
        model: model || this.defaultModel,
        input: texts,
      });
      
      return response.embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    }
  }

  async batchGenerateEmbeddings(
    texts: string[],
    batchSize: number = 10,
    model?: string,
  ): Promise<number[][]> {
    const results: number[][] = [];
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchEmbeddings = await this.generateEmbeddings(batch, model);
      results.push(...batchEmbeddings);
      
      // Add small delay to prevent overwhelming the service
      if (i + batchSize < texts.length) {
        await this.sleep(100);
      }
    }
    
    return results;
  }

  async getEmbeddingDimension(model?: string): Promise<number> {
    try {
      const testEmbedding = await this.generateEmbedding('test', model);
      return testEmbedding.length;
    } catch (error) {
      console.error('Error getting embedding dimension:', error);
      // Return default dimension for mxbai-embed-large
      return 1024;
    }
  }

  getDefaultModel(): string {
    return this.defaultModel;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
