import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { History } from './history.entity';

@Entity('files')
export class File {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('text', { name: 'file_name', nullable: false })
  fileName: string;

  @Column('text', { name: 'file_type' })
  fileType: string;

  @Column('int', { name: 'file_size' })
  fileSize: number;

  @Column('int', { name: 'chunk_count' })
  chunkCount: number;

  @Column('text', { name: 'document_id', unique: true })
  documentId: string;

  @Column('text', { name: 'title', nullable: true })
  title?: string;

  @Column('text', { name: 'author', nullable: true })
  author?: string;

  @Column('int', { name: 'page_count', nullable: true })
  pageCount?: number;

  @Column('text', { name: 'tags', nullable: true })
  tags?: string;

  @Column('text', { name: 'language', nullable: true })
  language?: string;

  @Column('text', { name: 'status', default: 'processing' })
  status: string; // processing, completed, failed

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;

  @UpdateDateColumn({ name: 'processed_at' })
  processedAt: Date;

  @Column('simple-json', { name: 'processing_metadata', nullable: true })
  processingMetadata?: Record<string, any>;

  @OneToMany(() => History, (history) => history.file)
  histories: History[];
}
