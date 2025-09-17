import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { File } from './file.entity';

@Entity('histories')
@Index('idx_histories_embedding', { synchronize: false }) // For vector similarity search
@Index('idx_histories_file_id', ['fileId'])
@Index('idx_histories_chunk_index', ['chunkIndex'])
export class History {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text')
  context: string;

  @Column('text')
  embedding: string; // JSON string of vector array

  @Column('int')
  size: number;

  @Column('int', { name: 'chunk_index' })
  chunkIndex: number;

  @Column('int', { name: 'chunk_count' })
  chunkCount: number;

  @Column('text', { name: 'document_id' })
  documentId: string;

  @Column('int', { name: 'token_count', default: 0 })
  tokenCount: number;

  @Column('int', { name: 'start_index', default: 0 })
  startIndex: number;

  @Column('int', { name: 'end_index', default: 0 })
  endIndex: number;

  @Column('int', { name: 'page_number', nullable: true })
  pageNumber?: number;

  @Column('text', { name: 'section', nullable: true })
  section?: string;

  @Column('decimal', { name: 'similarity_score', nullable: true, precision: 5, scale: 4 })
  similarityScore?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => File, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'file_id' })
  file: File;

  @Column('int', { name: 'file_id' })
  fileId: number;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, any>;
}
