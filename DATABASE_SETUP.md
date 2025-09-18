# 🗄️ Database Setup Guide

## 📋 Overview

This guide will help you set up the PostgreSQL database for the RAG System with all necessary tables, indexes, and sample data.

## 🔧 Prerequisites

### 1. PostgreSQL Installation
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS (using Homebrew)
brew install postgresql

# Windows
# Download from: https://www.postgresql.org/download/windows/
```

### 2. pgvector Extension (Required for vector similarity search)
```bash
# Ubuntu/Debian
sudo apt install postgresql-16-pgvector

# macOS (using Homebrew)
brew install pgvector

# From source
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install
```

### 3. Environment Configuration
Create or update your `.env` file:
```bash
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=deepseek

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Application Configuration
PORT=15001
OLLAMA_MODEL=llama3.2
OLLAMA_EMBED_MODEL=mxbai-embed-large
```

## 🚀 Quick Setup

### Option 1: Automated Setup (Recommended)
```bash
# Install dependencies
npm install

# Setup database with schema and sample data
npm run db:setup
npm run db:seed

# Start the application
npm run start:dev
```

### Option 2: Manual Setup
```bash
# 1. Create database manually
createdb deepseek

# 2. Run schema SQL file
psql -d deepseek -f src/migrations/001-initial-schema.sql

# 3. Seed with sample data
npm run db:seed
```

## 📊 Database Schema

### Tables

#### 🗂️ Files Table
Stores document metadata and processing information.

```sql
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
    status TEXT DEFAULT 'processing',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_metadata JSONB
);
```

**Key Fields:**
- `document_id`: Unique identifier for each document
- `status`: 'processing', 'completed', 'failed'
- `processing_metadata`: JSON with processing details
- `tags`: Comma-separated tags for categorization

#### 📝 Histories Table
Stores document chunks with vector embeddings for similarity search.

```sql
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
```

**Key Fields:**
- `context`: The actual text content of the chunk
- `embedding`: Vector representation as JSON string
- `chunk_index`: Position of chunk within document
- `page_number`: Source page (for PDFs)
- `section`: Document section name

### Indexes

#### Performance Indexes
```sql
-- Files table indexes
CREATE INDEX idx_files_document_id ON files(document_id);
CREATE INDEX idx_files_status ON files(status);
CREATE INDEX idx_files_uploaded_at ON files(uploaded_at DESC);
CREATE INDEX idx_files_file_type ON files(file_type);

-- Histories table indexes
CREATE INDEX idx_histories_file_id ON histories(file_id);
CREATE INDEX idx_histories_document_id ON histories(document_id);
CREATE INDEX idx_histories_chunk_index ON histories(chunk_index);
CREATE INDEX idx_histories_created_at ON histories(created_at DESC);
```

#### Search Indexes
```sql
-- Full-text search
CREATE INDEX idx_histories_context_fts ON histories 
    USING GIN(to_tsvector('english', context));

-- JSONB search
CREATE INDEX idx_files_processing_metadata ON files 
    USING GIN(processing_metadata);
CREATE INDEX idx_histories_metadata ON histories 
    USING GIN(metadata);
```

### Functions

#### Vector Similarity Search
```sql
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
)
```

**Usage Example:**
```sql
SELECT * FROM vector_similarity_search(
    '[0.1, 0.2, 0.3, ...]',  -- Query embedding
    0.75,                     -- Similarity threshold
    10                        -- Max results
);
```

### Views

#### Document Statistics
```sql
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
```

#### Recent Documents
```sql
CREATE VIEW recent_documents AS
SELECT 
    f.*,
    COUNT(h.id) as actual_chunk_count
FROM files f
LEFT JOIN histories h ON f.id = h.file_id
WHERE f.uploaded_at >= NOW() - INTERVAL '7 days'
GROUP BY f.id
ORDER BY f.uploaded_at DESC;
```

## 🔧 Database Scripts

### Available NPM Scripts
```bash
# Setup database and schema
npm run db:setup

# Reset database (drops and recreates)
npm run db:reset

# Seed with sample data
npm run db:seed

# Run TypeORM migrations
npm run db:migrate

# Revert last migration
npm run db:migrate:revert
```

### Direct SQL Commands
```bash
# Connect to database
psql -h localhost -U postgres -d deepseek

# Check tables
\dt

# Check indexes
\di

# Check views
\dv

# Check functions
\df

# View document stats
SELECT * FROM document_stats;

# View recent documents
SELECT * FROM recent_documents;
```

## 📈 Sample Data

The seed script creates sample documents with realistic content:

### Documents
1. **Company Employee Handbook** (PDF)
   - HR policies, vacation, work arrangements
   - 3 chunks with different sections

2. **Technical Documentation Guide** (DOCX)
   - API authentication, database setup, best practices
   - 3 chunks covering technical topics

3. **Q3 Financial Report** (XLSX)
   - Revenue analysis, expense breakdown
   - 2 chunks with financial data

4. **Weekly Meeting Notes** (Markdown)
   - Processing status for testing

### Sample Queries to Test
After seeding, try these search queries:
- "What is the vacation policy?"
- "How do I authenticate with the API?"
- "What was the Q3 revenue?"
- "What are the work from home rules?"

## 🔍 Monitoring & Maintenance

### Check Database Health
```sql
-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Index usage
SELECT 
    indexrelname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Document processing status
SELECT 
    status,
    COUNT(*) as count,
    AVG(chunk_count) as avg_chunks
FROM files 
GROUP BY status;
```

### Performance Optimization
```sql
-- Analyze tables for better query plans
ANALYZE files;
ANALYZE histories;

-- Vacuum to reclaim space
VACUUM ANALYZE files;
VACUUM ANALYZE histories;

-- Check for unused indexes
SELECT 
    schemaname, 
    tablename, 
    indexname, 
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

## 🐛 Troubleshooting

### Common Issues

#### 1. pgvector Extension Missing
```
ERROR: extension "vector" is not available
```
**Solution:**
```bash
# Install pgvector extension
sudo apt install postgresql-16-pgvector
# or compile from source
```

#### 2. Permission Denied
```
ERROR: permission denied to create database
```
**Solution:**
```sql
-- Grant database creation permissions
ALTER USER postgres CREATEDB;
-- or use superuser account
```

#### 3. Connection Refused
```
ERROR: connection to server at "localhost" (127.0.0.1), port 5432 failed
```
**Solution:**
```bash
# Start PostgreSQL service
sudo systemctl start postgresql
# or
brew services start postgresql
```

#### 4. Out of Memory During Migration
```
ERROR: out of memory
```
**Solution:**
```sql
-- Increase work_mem temporarily
SET work_mem = '256MB';
-- Run migration
-- Reset to default
RESET work_mem;
```

### Backup & Restore
```bash
# Create backup
pg_dump -h localhost -U postgres deepseek > backup.sql

# Restore from backup
psql -h localhost -U postgres -d deepseek < backup.sql

# Backup with custom format (recommended)
pg_dump -h localhost -U postgres -Fc deepseek > backup.dump

# Restore custom format
pg_restore -h localhost -U postgres -d deepseek backup.dump
```

## 🔒 Security Considerations

### Production Setup
1. **Create dedicated database user:**
```sql
CREATE USER rag_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE deepseek TO rag_user;
GRANT USAGE ON SCHEMA public TO rag_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rag_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rag_user;
```

2. **Configure connection limits:**
```sql
ALTER USER rag_user CONNECTION LIMIT 20;
```

3. **Enable SSL:**
```bash
# In postgresql.conf
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
```

4. **Restrict connections:**
```bash
# In pg_hba.conf
host deepseek rag_user 127.0.0.1/32 md5
```

---

## 🎉 Next Steps

After successful database setup:

1. **Start the application:**
   ```bash
   npm run start:dev
   ```

2. **Access Swagger UI:**
   ```
   http://localhost:15001/api
   ```

3. **Test the RAG system:**
   - Upload documents via `/rag/upload`
   - Search and ask questions via `/rag/search`
   - Monitor via `/rag/stats`

4. **Monitor database:**
   ```sql
   SELECT * FROM document_stats;
   ```

Happy coding! 🚀
