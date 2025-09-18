import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { File } from './file.entity';
import { History } from './history.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'deepseek',
  synchronize: false, // Set to false for production
  logging: process.env.NODE_ENV === 'development',
  entities: [File, History],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Initialize the data source
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Database connection established successfully');
  })
  .catch((error) => {
    console.error('❌ Error during database initialization:', error);
  });
