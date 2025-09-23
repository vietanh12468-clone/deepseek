import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1726613820000 implements MigrationInterface {
  name = 'InitialSchema1726613820000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable required extensions
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);

    // Create files table
    await queryRunner.query(`
      CREATE TABLE "files" (
        "id" SERIAL NOT NULL,
        "file_name" character varying NOT NULL,
        "file_type" character varying NOT NULL,
        "file_size" integer NOT NULL,
        "chunk_count" integer NOT NULL DEFAULT '0',
        "document_id" character varying NOT NULL,
        "title" character varying,
        "author" character varying,
        "page_count" integer,
        "tags" character varying,
        "language" character varying DEFAULT 'vi',
        "status" character varying NOT NULL DEFAULT 'processing',
        "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "processed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "processing_metadata" jsonb,
        CONSTRAINT "UQ_files_document_id" UNIQUE ("document_id"),
        CONSTRAINT "PK_files_id" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_files_status" CHECK ("status" IN ('processing', 'completed', 'failed'))
      )
    `);

    // Create histories table
    await queryRunner.query(`
      CREATE TABLE "histories" (
        "id" SERIAL NOT NULL,
        "context" text NOT NULL,
        "embedding" text NOT NULL,
        "size" integer NOT NULL,
        "chunk_index" integer NOT NULL,
        "chunk_count" integer NOT NULL,
        "document_id" character varying NOT NULL,
        "token_count" integer NOT NULL DEFAULT '0',
        "start_index" integer NOT NULL DEFAULT '0',
        "end_index" integer NOT NULL DEFAULT '0',
        "page_number" integer,
        "section" character varying,
        "similarity_score" numeric(5,4),
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "file_id" integer NOT NULL,
        "metadata" jsonb,
        CONSTRAINT "PK_histories_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_histories_file_id" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE CASCADE
      )
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "idx_files_document_id" ON "files" ("document_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_files_status" ON "files" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_files_uploaded_at" ON "files" ("uploaded_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_files_file_type" ON "files" ("file_type")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_files_tags" ON "files" ("tags") WHERE "tags" IS NOT NULL`,
    );

    await queryRunner.query(
      `CREATE INDEX "idx_histories_file_id" ON "histories" ("file_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_histories_document_id" ON "histories" ("document_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_histories_chunk_index" ON "histories" ("chunk_index")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_histories_created_at" ON "histories" ("created_at" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_histories_page_number" ON "histories" ("page_number") WHERE "page_number" IS NOT NULL`,
    );

    // Create GIN indexes for JSONB
    await queryRunner.query(
      `CREATE INDEX "idx_files_processing_metadata" ON "files" USING GIN("processing_metadata")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_histories_metadata" ON "histories" USING GIN("metadata")`,
    );

    // Create full-text search indexes
    await queryRunner.query(
      `CREATE INDEX "idx_histories_context_fts" ON "histories" USING GIN(to_tsvector('english', "context"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_files_title_fts" ON "files" USING GIN(to_tsvector('english', COALESCE("title", '')))`,
    );

    // Create update trigger function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.processed_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `);

    // Create trigger
    await queryRunner.query(`
      CREATE TRIGGER update_files_processed_at 
        BEFORE UPDATE ON "files" 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column()
    `);

    // Create vector similarity search function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION vector_similarity_search(
          query_embedding TEXT,
          similarity_threshold FLOAT DEFAULT 0.7,
          result_limit INTEGER DEFAULT 5,
          target_file_id INTEGER DEFAULT NULL
      )
      RETURNS TABLE (
          id INTEGER,
          context TEXT,
          similarity_score FLOAT,
          chunk_index INTEGER,
          document_id TEXT,
          file_name TEXT,
          file_type TEXT,
          page_number INTEGER,
          section TEXT,
          metadata JSONB
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              h.id,
              h.context,
              (1 - (h.embedding <-> query_embedding)) as similarity_score,
              h.chunk_index,
              h.document_id,
              f.file_name,
              f.file_type,
              h.page_number,
              h.section,
              h.metadata
          FROM histories h
          JOIN files f ON h.file_id = f.id
          WHERE 
              (target_file_id IS NULL OR h.file_id = target_file_id)
              AND f.status = 'completed'
              AND (1 - (h.embedding <-> query_embedding)) >= similarity_threshold
          ORDER BY h.embedding <-> query_embedding
          LIMIT result_limit;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Create views
    await queryRunner.query(`
      CREATE VIEW document_stats AS
      SELECT 
          COUNT(*) as total_documents,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_documents,
          COUNT(*) FILTER (WHERE status = 'processing') as processing_documents,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_documents,
          SUM(chunk_count) as total_chunks,
          AVG(chunk_count) as avg_chunks_per_document,
          SUM(file_size) as total_file_size,
          AVG(file_size) as avg_file_size
      FROM files
    `);

    await queryRunner.query(`
      CREATE VIEW recent_documents AS
      SELECT 
          f.*,
          COUNT(h.id) as actual_chunk_count
      FROM files f
      LEFT JOIN histories h ON f.id = h.file_id
      WHERE f.uploaded_at >= NOW() - INTERVAL '7 days'
      GROUP BY f.id
      ORDER BY f.uploaded_at DESC
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop views
    await queryRunner.query(`DROP VIEW IF EXISTS "recent_documents"`);
    await queryRunner.query(`DROP VIEW IF EXISTS "document_stats"`);

    // Drop function
    await queryRunner.query(`DROP FUNCTION IF EXISTS vector_similarity_search`);

    // Drop trigger and function
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_files_processed_at ON "files"`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column`);

    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_files_title_fts"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_histories_context_fts"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_histories_metadata"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_files_processing_metadata"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_histories_page_number"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_histories_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_histories_chunk_index"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_histories_document_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_histories_file_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_files_tags"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_files_file_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_files_uploaded_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_files_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_files_document_id"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "histories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "files"`);
  }
}
