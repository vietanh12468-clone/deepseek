import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { File } from './file.entity'; // Adjust the path if needed

@Entity('histories')
export class History {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  context: string;

  @Column('text')
  embedding: string;

  @Column('int')
  size: number;

  @Column('int', { name: 'chunk_index' })
  chunkIndex: number;

  @Column('int', { name: 'chunk_count' })
  chunkCount: number;

  @ManyToOne(() => File, { nullable: false })
  @JoinColumn({ name: 'file_id' })
  file: File;

  @Column('int', { name: 'file_id' })
  fileId: number;

  @Column('simple-json', { nullable: true })
  metadata: Record<string, any>;
}
