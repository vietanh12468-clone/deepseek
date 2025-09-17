import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { History } from './history.entity';
import { File } from './file.entity';
import ollama from 'ollama';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(History) private historyRepository: Repository<History>,
    @InjectRepository(File) private fileRepository: Repository<File>,
  ) {}
  getHello(): string {
    return 'Hello World!';
  }

  public checkVietNamHistoryTool = {
    type: 'function',
    function: {
      name: 'checkVietNamHistory',
      description: 'retrieve history data of Viet Nam from database',
      parameters: {
        type: 'object',
        required: ['question'],
        properties: {
          question: {
            type: 'string',
            description: 'The history question to ask',
          },
        },
      },
    },
  };

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
          b: { type: 'number', description: 'The second number' },
        },
      },
    },
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
          b: { type: 'number', description: 'The second number' },
        },
      },
    },
  };

  async insertHisory(
    context: string,
    embedding: number[],
    fileId: number,
    chunkIndex: number,
  ): Promise<any> {
    const fileSize = Buffer.byteLength(context, 'utf-8');
    await this.historyRepository.save({
      context: context,
      embedding: `[${embedding}]`,
      size: fileSize,
      chunkIndex: chunkIndex,
      chunkCount: context.length, // This should be set appropriately
      fileId: fileId,
      metadata: {},
    });

    // await this.historyRepository.query(
    //   `INSERT INTO histories (embedding, context) VALUES ('[${embedding}]', '${context}');`
    // );
  }

  async searchSimilarVietNamHistory(embedding: number[]): Promise<History[]> {
    const histories = await this.historyRepository.manager.query(
      `SELECT * FROM histories ORDER BY embedding <-> '[${embedding}]' LIMIT 5;`,
    );

    return histories;
  }

  async saveFile(
    fileName: string,
    fileType: string,
    fileSize: number,
    chunkCount: number,
  ): Promise<any> {
    const result = await this.fileRepository
      .createQueryBuilder()
      .insert()
      .into(File)
      .values({ fileName, fileType, fileSize, chunkCount })
      .returning('id')
      .execute()
      .then((res) => res.raw);
    return result[0].id;
  }

  async askQuestion(message: string): Promise<string> {
    const messages = [
      {
        role: 'system',
        content:
          'Think step by step (COT), then make a decision (COD) before answering. Always respond in vietnamese, no matter the input language.',
      },
      {
        role: 'user',
        content: message || 'Hello, world!',
      },
    ];

    // let results = [];
    // for (const item of response) {
    //   console.log('Found similar text:', item);
    //   results.push(item.metadata.context);
    // }

    // return results;

    const response = await ollama.chat({
      model: process.env.OLLAMA_MODEL || 'llama3.2',
      messages: messages,
      tools: [
        this.subtractTwoNumbersTool,
        this.addTwoNumbersTool,
        this.checkVietNamHistoryTool,
      ],
    });

    const availableFunctions = {
      addTwoNumbers: this.addTwoNumbers,
      subtractTwoNumbers: this.subtractTwoNumbers,
      checkVietNamHistory: this.checkVietNamHistory,
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
        model: process.env.OLLAMA_MODEL || 'llama3.2',
        messages: messages,
      });
      console.log('Final response:', finalResponse.message.content);
      return finalResponse.message.content;
    } else {
      console.log(
        'No tool calls returned from model:',
        response.message.content,
      );
      return response.message.content;
    }
  }

  async addTwoNumbers(a: number, b: number) {
    const content = [
      { type: 'text', text: `The sum of ${a} and ${b} is ${a + b}` },
    ];

    return content;
  }

  async subtractTwoNumbers(a: number, b: number): Promise<number> {
    return a - b;
  }

  checkVietNamHistory = async (context: {
    question: string;
  }): Promise<string> => {
    // Simulate a history question answer
    console.log('context', context);
    const embeddings = (await this.embeddingData(context.question))[0];
    // console.log('embeddings', embeddings);
    const response = await this.searchSimilarVietNamHistory(embeddings);
    const results = [];
    for (const item of response) {
      console.log('Found similar text:', item);
      results.push(item.context);
    }
    const answer = results.join(' . ');
    console.log('Answer:', answer);
    return answer;
  };

  async embeddingData(data: any): Promise<number[][]> {
    try {
      const res = await ollama.embed({
        model: process.env.OLLAMA_EMBED_MODEL || 'mxbai-embed-large',
        input: data,
      });
      return res.embeddings;
    } catch (error) {
      console.error('Error in embeddingData:', error);
      throw error;
    }
  }

  async getAllHistoryByFileId(id: number): Promise<History[]> {
    return this.historyRepository.find({
      where: {
        fileId: id,
      },
    });
  }
}
