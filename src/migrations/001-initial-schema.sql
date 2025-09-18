-- RAG System Database Schema
-- PostgreSQL with pgvector extension for vector similarity search

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS histories CASCADE;
DROP TABLE IF EXISTS files CASCADE;

-- Create files table for document metadata
CREATE TABLE files (
    id SERIAL PRIMARY KEY,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    chunk_count INTEGER NOT NULL DEFAULT 0,
    document_id TEXT UNIQUE NOT NULL,
    title TEXT,
    author TEXT,
    page_count INTEGER,
    tags TEXT,
    language TEXT DEFAULT 'vi',
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create histories table for document chunks and embeddings
CREATE TABLE histories (
    id SERIAL PRIMARY KEY,
    context TEXT NOT NULL,
    embedding TEXT NOT NULL, -- JSON array of vector values
    size INTEGER NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_count INTEGER NOT NULL,
    document_id TEXT NOT NULL,
    token_count INTEGER DEFAULT 0,
    start_index INTEGER DEFAULT 0,
    end_index INTEGER DEFAULT 0,
    page_number INTEGER,
    section TEXT,
    similarity_score DECIMAL(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX idx_files_document_id ON files(document_id);
CREATE INDEX idx_files_status ON files(status);
CREATE INDEX idx_files_uploaded_at ON files(uploaded_at DESC);
CREATE INDEX idx_files_file_type ON files(file_type);
CREATE INDEX idx_files_tags ON files(tags) WHERE tags IS NOT NULL;

CREATE INDEX idx_histories_file_id ON histories(file_id);
CREATE INDEX idx_histories_document_id ON histories(document_id);
CREATE INDEX idx_histories_chunk_index ON histories(chunk_index);
CREATE INDEX idx_histories_created_at ON histories(created_at DESC);
CREATE INDEX idx_histories_page_number ON histories(page_number) WHERE page_number IS NOT NULL;

-- Create GIN index for metadata JSONB queries
CREATE INDEX idx_files_processing_metadata ON files USING GIN(processing_metadata);
CREATE INDEX idx_histories_metadata ON histories USING GIN(metadata);

-- Create full-text search indexes
CREATE INDEX idx_histories_context_fts ON histories USING GIN(to_tsvector('english', context));
CREATE INDEX idx_files_title_fts ON files USING GIN(to_tsvector('english', COALESCE(title, '')));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_files_updated_at 
    BEFORE UPDATE ON files 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function for vector similarity search using cosine distance
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
        (1 - (h.embedding::vector <-> query_embedding::vector)) as similarity_score,
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
        AND (1 - (h.embedding::vector <-> query_embedding::vector)) >= similarity_threshold
    ORDER BY h.embedding::vector <-> query_embedding::vector
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing (optional)
INSERT INTO files (
    file_name, 
    file_type, 
    file_size, 
    chunk_count, 
    document_id, 
    title, 
    status
) VALUES 
(
    'sample-document.pdf',
    'application/pdf',
    1024000,
    0,
    'doc_' || extract(epoch from now())::bigint || '_sample',
    'Sample Document for Testing',
    'processing'
);

-- Create views for common queries
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
FROM files;

CREATE VIEW recent_documents AS
SELECT 
    f.*,
    COUNT(h.id) as actual_chunk_count
FROM files f
LEFT JOIN histories h ON f.id = h.file_id
WHERE f.uploaded_at >= NOW() - INTERVAL '7 days'
GROUP BY f.id
ORDER BY f.uploaded_at DESC;

-- Grants (adjust based on your user setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

COMMENT ON TABLE files IS 'Stores metadata for uploaded documents';
COMMENT ON TABLE histories IS 'Stores document chunks with embeddings for vector search';
COMMENT ON FUNCTION vector_similarity_search IS 'Performs vector similarity search with configurable threshold';
COMMENT ON VIEW document_stats IS 'Provides aggregate statistics about documents and chunks';
COMMENT ON VIEW recent_documents IS 'Shows documents uploaded in the last 7 days with chunk counts';

-- Display schema information
SELECT 'Database schema created successfully!' as status;
SELECT 'Tables created: files, histories' as tables;
SELECT 'Views created: document_stats, recent_documents' as views;
SELECT 'Functions created: vector_similarity_search' as functions;
