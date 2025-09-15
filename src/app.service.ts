import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { History } from './history.entity';
import { File } from './file.entity';

@Injectable()
export class AppService {
  constructor(
    @InjectRepository(History) private historyRepository: Repository<History>,
    @InjectRepository(File) private fileRepository: Repository<File>,
  ) { }
  getHello(): string {
    return 'Hello World!';
  }

  async insertHisory(context: string, embedding: number[], fileId: number, chunkIndex: number): Promise<any> {
    const fileSize = Buffer.byteLength(context, 'utf-8');
    await this.historyRepository.save({
      context: context,
      embedding: `[${embedding}]`,
      size: fileSize,
      chunkIndex: chunkIndex,
      chunkCount: context.length, // This should be set appropriately
      fileId: fileId,
      metadata: {}
    });

    // await this.historyRepository.query(
    //   `INSERT INTO histories (embedding, context) VALUES ('[${embedding}]', '${context}');`
    // );
  }

  async searchSimilarVietNamHistory(embedding: number[]): Promise<History[]> {
    const histories = await this.historyRepository.manager.query(
      `SELECT * FROM histories ORDER BY embedding <-> '[${embedding}]' LIMIT 5;`
    );

    return histories;
  }

  async saveFile(fileName: string, fileType: string, fileSize: number, chunkCount: number): Promise<any> {
    const result = await this.fileRepository
      .createQueryBuilder().insert()
      .into(File)
      .values({ fileName, fileType, fileSize, chunkCount })
      .returning('id')
      .execute()
      .then(res => res.raw);
    return result[0].id;
  }
}