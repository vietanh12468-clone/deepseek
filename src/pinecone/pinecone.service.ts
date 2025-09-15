import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  EmbeddingsList,
  Index,
  Pinecone,
  QueryResponse,
} from '@pinecone-database/pinecone';
import { embed, rerank } from '@pinecone-database/pinecone/dist/inference';
import e, { query } from 'express';
import * as fs from 'fs';
import * as mammoth from 'mammoth';
import slugify from 'slugify';
const WordExtractor = require('word-extractor');

@Injectable()
export class PineconeService implements OnModuleInit {
  public pinecone: Pinecone;
  public index: Index;
  public namespace: Index;
  public idNamespace: Index;

  public docParameters = {
    inputType: 'passage',
    outputType: 'END',
  };

  constructor() {
    console.log(
      'Initializing Pinecone service...' + process.env.PINECONE_API_KEY,
    );
    this.pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
  }

  async onModuleInit() {
    try {
      // try {
      //     console.log('Creating Pinecone index if it does not exist...' + process.env.PINECONE_INDEX_NAME);
      //     // If the index does not exist, create it
      //     await this.pinecone.createIndexForModel({
      //         name: process.env.PINECONE_INDEX_NAME,
      //         cloud: 'aws',
      //         region: 'us-east-1',
      //         embed: {
      //             model: "llama-text-embed-v2",
      //             fieldMap: {
      //                 text: "embedding"
      //             }
      //         },
      //         waitUntilReady: true,
      //     });

      //     this.index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
      // }
      // catch (error) {
      // console.error('Error creating index:', error);
      this.index = this.pinecone.index(process.env.PINECONE_INDEX_NAME);
      // }
      this.namespace =
        this.index.namespace(process.env.PINECONE_NAMESPACE) ||
        this.index.namespace('sample-namespace');
      this.idNamespace =
        this.index.namespace(process.env.PINECONE_ID_NAMESPACE) ||
        this.index.namespace('sample-id-namespace');
    } catch (error) {
      console.error('Error initializing Pinecone service:', error);
      throw error;
    }
  }

  async upsertData(data: any, id: string = 'id2', metadata: any = {}) {
    // Extract the vector array from the embedding result
    const embeddings = await this.embeddingData(data);
    await this.namespace.upsert([
      {
        id,
        values: embeddings[0]['values'] || [],
        metadata: metadata || {},
      },
    ]);

    return embeddings;
  }

  async embeddingData(data: any): Promise<Array<any>> {
    try {
      const embedData = await this.pinecone.inference.embed(
        process.env.PINECONE_MODEL_NAME,
        [data],
        {
          inputType: 'query',
          truncate: 'END',
        },
      );

      return Array.from(embedData.data.values());
    } catch (error) {
      console.error('Error generating embeddings:', error);
    }
  }

  async searchSimilarText(text: string) {
    try {
      const embeddings = await this.embeddingData(text);

      const queryVector = embeddings[0]['values'] || [];

      const response = await this.namespace.query({
        vector: queryVector,
        topK: 5,
        includeMetadata: true,
      });

      console.log('Response from Pinecone:', response);

      // console.log('Response from Pinecone:', response);

      const rankedResult = await this.pinecone.inference.rerank(
        process.env.PINECONE_RERANK_MODEL_NAME,
        text,
        response.matches.map((match: any) => match.metadata),
        {
          topN: 5,
          rankFields: ['context'],
        },
      );

      console.log('Ranked Result:', rankedResult);

      // const response = await this.namespace.searchRecords({
      //     query: {
      //         inputs: { text: text },
      //         topK: 5
      //     },
      //     rerank: {
      //         model: process.env.PINECONE_RERANK_MODEL_NAME,
      //         topN: 5,
      //         rankFields: ['context']
      //     },
      //     fields: ['context', 'filePath']
      // })

      console.log('Response from Pinecone:', response);

      return rankedResult.data;

      // return (await response)
    } catch (error) {
      console.error('Error searching similar text:', error);
      throw error;
    }
  }

  // async rerankResult(resqonse: QueryResponse, query: any) {
  //     this.pinecone.inference.rerank(
  //         model = process.env.PINECONE_RERANK_MODEL_NAME,
  //         query,
  //         documents = resqonse.matches

  //     );
  // }

  async deleteData(ids: string[]) {
    try {
      await this.namespace.deleteMany(ids);
      return {
        success: true,
        message: `Data with id ${ids} deleted successfully.`,
      };
    } catch (error) {
      console.error('Error deleting data:', error);
      return { success: false, error: error.message };
    }
  }

  async getDataById(id: string) {
    try {
      const response = await this.namespace.fetch([id]);
      if (response.records[id]) {
        return response.records[id];
      }
    } catch (error) {
      console.error('Error fetching data by id:', error);
      throw error;
    }
  }

  async InsertNewData(filePath: string) {
    try {
      //get all the files in the directory
      const path = require('path');
      const resolvedPath = path.resolve(filePath);
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
          extractedText = await mammoth
            .extractRawText({ path: `${resolvedPath}/${file}` })
            .then((result) => result.value);

          // Upsert the extracted text using pineconeService
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
        const chunks = extractedText
          .split('\t')
          .map((chunk) => chunk.trim())
          .filter((chunk) => chunk.length > 0);

        const upsertChunk = [];
        for (const chunk of chunks) {
          const metadata = {
            filePath: resolvedPath + '\\' + file,
            context: chunk,
          };

          // Extract the vector array from the embedding result
          const embeddings = await this.embeddingData(chunk);

          upsertChunk.push({
            id: id + '#' + chunks.indexOf(chunk),
            values: embeddings[0]['values'] || [],
            metadata: metadata,
          });
        }

        await this.createIdNameSpace(id);

        await this.namespace.upsert(upsertChunk);

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

  // async checkDuplicate(chunk: string) {
  //     try {
  //         const response = await this.namespace.fetchAll();
  //         return response.records;
  //     } catch (error) {
  //         console.error('Error fetching all data:', error);
  //         throw error;
  //     }
  // }

  async createIdNameSpace(
    id: string,
    idName: string | null = null,
  ): Promise<void> {
    try {
      const generatedIdName =
        idName ?? Math.random().toString(36).substring(2, 10);
      const embeddings = await this.embeddingData(id);
      await this.idNamespace.upsert([
        {
          id: `${id}#${generatedIdName}`,
          values: embeddings[0]['values'] || [], // You may want to provide actual embedding values here
          metadata: {
            id: id,
            name: generatedIdName,
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating ID namespace:', error);
      throw error;
    }
  }
}
