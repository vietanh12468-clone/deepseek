# Hệ thống RAG (Retrieval-Augmented Generation) 

## 🎯 Tổng quan

Hệ thống RAG được xây dựng theo chuẩn enterprise với khả năng xử lý nhiều loại tài liệu và trả lời câu hỏi thông minh.

### ✨ Tính năng chính

- **Multi-format Document Processing**: Hỗ trợ Word (.doc, .docx), PDF, Excel (.xls, .xlsx), CSV, Text, JSON, XML
- **Intelligent Chunking**: Chia nhỏ tài liệu thông minh với token-based chunking
- **Vector Search**: Tìm kiếm ngữ nghĩa với PostgreSQL vector operations
- **AI-powered Answers**: Trả lời câu hỏi bằng Ollama LLM với context từ tài liệu
- **RESTful APIs**: APIs đầy đủ với Swagger documentation
- **Real-time Processing**: Xử lý tài liệu trong background

## 🏗️ Kiến trúc hệ thống

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   File Upload   │───▶│ Document Processor│───▶│  Text Chunking  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   PostgreSQL    │◀───│ Vector Storage   │◀───│ Embedding Gen   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   AI Response   │◀───│  RAG Pipeline    │◀───│ Vector Search   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📁 Cấu trúc thư mục

```
src/rag/
├── dto/                    # Data Transfer Objects
│   ├── upload-document.dto.ts
│   └── search-query.dto.ts
├── interfaces/             # TypeScript interfaces
│   └── document.interface.ts
├── processors/             # Document processors
│   ├── base.processor.ts
│   ├── word.processor.ts
│   ├── pdf.processor.ts
│   ├── excel.processor.ts
│   └── text.processor.ts
├── services/              # Business logic services
│   ├── document.service.ts
│   ├── embedding.service.ts
│   ├── vector.service.ts
│   └── rag.service.ts
├── rag.controller.ts      # API endpoints
└── rag.module.ts          # NestJS module
```

## 🚀 API Endpoints

### 📤 Upload Document
```http
POST /rag/upload
Content-Type: multipart/form-data

Body:
- file: Document file (required)
- title: Custom title (optional)
- tags: Comma-separated tags (optional)
- chunkSize: Chunk size in tokens (100-2000, default: 500)
- chunkOverlap: Overlap in tokens (0-200, default: 50)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fileId": 123,
    "documentId": "doc_1234567890_abc12345",
    "chunksCount": 25,
    "filename": "document.pdf"
  }
}
```

### 🔍 Search Documents
```http
POST /rag/search
Content-Type: application/json

{
  "query": "What is the company vacation policy?",
  "topK": 5,
  "threshold": 0.7,
  "fileType": "pdf",
  "tags": "policy,hr",
  "includeMetadata": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Theo chính sách của công ty...",
    "confidence": 0.85,
    "processingTime": 1200,
    "sources": [
      {
        "score": 0.92,
        "chunk": {
          "content": "Company vacation policy states...",
          "metadata": {
            "documentId": "doc_123",
            "chunkIndex": 5,
            "pageNumber": 2
          }
        },
        "document": {
          "filename": "hr-policy.pdf",
          "metadata": {
            "fileType": "application/pdf",
            "fileSize": 1024000
          }
        }
      }
    ]
  }
}
```

### 📋 Get All Documents
```http
GET /rag/documents
```

### 📄 Get Document by ID
```http
GET /rag/documents/{id}
```

### 🗑️ Delete Document
```http
DELETE /rag/documents/{id}
```

### 📊 Get System Statistics
```http
GET /rag/stats
```

### 📝 Get Supported File Types
```http
GET /rag/supported-types
```

## 🔧 Supported File Types

| File Type | Extensions | Processor | Description |
|-----------|------------|-----------|-------------|
| **Word Documents** | .doc, .docx | WordDocumentProcessor | Microsoft Word documents |
| **PDF Documents** | .pdf | PDFDocumentProcessor | Portable Document Format |
| **Excel Files** | .xls, .xlsx, .csv | ExcelDocumentProcessor | Spreadsheets and CSV files |
| **Text Files** | .txt, .md, .json, .xml | TextDocumentProcessor | Plain text and structured data |

## ⚙️ Configuration

### Environment Variables

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=your_database

# Redis (Optional)
REDIS_HOST=localhost
REDIS_PORT=6379

# Ollama
OLLAMA_MODEL=llama3.2
OLLAMA_EMBED_MODEL=mxbai-embed-large

# Server
PORT=15001
```

### Database Setup

Hệ thống sử dụng PostgreSQL với pgvector extension:

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Files table
CREATE TABLE files (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  chunk_count INTEGER,
  document_id TEXT UNIQUE,
  title TEXT,
  author TEXT,
  page_count INTEGER,
  tags TEXT,
  language TEXT,
  status TEXT DEFAULT 'processing',
  uploaded_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP DEFAULT NOW(),
  processing_metadata JSONB
);

-- Histories table (vector chunks)
CREATE TABLE histories (
  id SERIAL PRIMARY KEY,
  context TEXT,
  embedding TEXT, -- JSON array of vector
  size INTEGER,
  chunk_index INTEGER,
  chunk_count INTEGER,
  document_id TEXT,
  token_count INTEGER DEFAULT 0,
  start_index INTEGER DEFAULT 0,
  end_index INTEGER DEFAULT 0,
  page_number INTEGER,
  section TEXT,
  similarity_score DECIMAL(5,4),
  created_at TIMESTAMP DEFAULT NOW(),
  file_id INTEGER REFERENCES files(id) ON DELETE CASCADE,
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_histories_file_id ON histories(file_id);
CREATE INDEX idx_histories_chunk_index ON histories(chunk_index);
CREATE INDEX idx_histories_document_id ON histories(document_id);
```

## 🔄 Processing Pipeline

### 1. Document Upload
```typescript
// Upload file via API
const formData = new FormData();
formData.append('file', file);
formData.append('title', 'My Document');
formData.append('tags', 'important,policy');

const response = await fetch('/rag/upload', {
  method: 'POST',
  body: formData
});
```

### 2. Document Processing
- **File Validation**: Kiểm tra file type và size
- **Text Extraction**: Trích xuất text từ file
- **Text Cleaning**: Làm sạch và chuẩn hóa text
- **Chunking**: Chia text thành các chunk nhỏ
- **Embedding Generation**: Tạo vector embeddings
- **Storage**: Lưu vào database

### 3. Search & Retrieval
- **Query Processing**: Xử lý câu hỏi của user
- **Vector Search**: Tìm chunks tương tự
- **Context Assembly**: Ghép context từ chunks
- **Answer Generation**: Tạo câu trả lời bằng LLM

## 🎯 Best Practices

### Document Upload
- **File Size**: Giới hạn < 50MB per file
- **Chunk Size**: 300-800 tokens tùy loại tài liệu
- **Overlap**: 50-100 tokens cho tài liệu dài
- **Tags**: Sử dụng tags để phân loại tài liệu

### Search Queries
- **Specific Questions**: Câu hỏi cụ thể cho kết quả tốt hơn
- **Threshold**: 0.7-0.8 cho độ chính xác cao
- **TopK**: 3-7 results cho context đủ

### Performance
- **Batch Processing**: Upload nhiều file cùng lúc
- **Index Optimization**: Tạo index cho các trường search
- **Caching**: Sử dụng Redis cho cache embeddings

## 🐛 Troubleshooting

### Common Issues

1. **File Processing Failed**
   - Kiểm tra file format có được hỗ trợ
   - Đảm bảo file không bị corrupt
   - Check disk space và memory

2. **Search Returns No Results**
   - Giảm threshold xuống 0.5-0.6
   - Thử query khác nhau
   - Kiểm tra document đã được process

3. **Slow Performance**
   - Tạo index cho database
   - Optimize chunk size
   - Sử dụng Redis caching

### Error Codes

- **400**: Bad Request - File format không hỗ trợ
- **413**: File quá lớn
- **500**: Server error - Check logs

## 📈 Monitoring & Analytics

### Key Metrics
- **Document Count**: Số lượng tài liệu đã xử lý
- **Chunk Count**: Tổng số chunks trong hệ thống
- **Search Accuracy**: Độ chính xác của search results
- **Response Time**: Thời gian xử lý query

### Logs
```bash
# Check processing logs
tail -f logs/rag-processing.log

# Monitor search performance
tail -f logs/search-performance.log
```

## 🔒 Security

- **File Validation**: Validate file types và content
- **Input Sanitization**: Clean user inputs
- **Rate Limiting**: Limit API calls
- **Access Control**: Implement authentication

---

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   yarn install
   ```

2. **Setup Database**
   ```bash
   # Create database và run migrations
   npm run migration:run
   ```

3. **Start Services**
   ```bash
   # Start Ollama
   ollama serve

   # Pull required models
   ollama pull llama3.2
   ollama pull mxbai-embed-large

   # Start application
   npm run start:dev
   ```

4. **Test API**
   ```bash
   # Access Swagger UI
   http://localhost:15001/api
   ```

Hệ thống RAG hiện đã sẵn sàng để xử lý tài liệu và trả lời câu hỏi thông minh! 🎉
