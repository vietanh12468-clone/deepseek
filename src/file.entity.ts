import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
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

  @OneToMany(() => History, (history) => history.file)
  histories: History[];
}
