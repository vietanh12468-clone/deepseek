# 📚 RAG System API Documentation

## 🌐 Swagger UI Access

### Development Environment
- **Swagger UI**: http://localhost:15001/api
- **Custom Swagger UI**: http://localhost:15001/swagger-ui-custom.html
- **API JSON**: http://localhost:15001/api-json
- **OpenAPI Spec**: http://localhost:15001/swagger.json

## 🎯 API Overview

The RAG System API provides comprehensive endpoints for document processing and intelligent Q&A functionality. All endpoints return JSON responses with consistent structure.

### Response Format
```json
{
  "success": boolean,
  "data": object | array,
  "error": string (only when success is false)
}
```

## 📋 Available Endpoints

### 🔥 RAG Endpoints (Recommended)

#### 📤 Upload Document
```http
POST /rag/upload
Content-Type: multipart/form-data
```

**Parameters:**
- `file` (required): Document file
- `title` (optional): Custom document title
- `tags` (optional): Comma-separated tags
- `chunkSize` (optional): Chunk size in tokens (100-2000, default: 500)
- `chunkOverlap` (optional): Overlap in tokens (0-200, default: 50)

**Supported File Types:**
- **Word**: .doc, .docx
- **PDF**: .pdf
- **Excel**: .xls, .xlsx, .csv
- **Text**: .txt, .md, .json, .xml

**Example Response:**
```json
{
  "success": true,
  "data": {
    "fileId": 123,
    "documentId": "doc_1234567890_abc12345",
    "chunksCount": 25,
    "filename": "company-policy.pdf"
  }
}
```

#### 🔍 Search Documents
```http
POST /rag/search
Content-Type: application/json
```

**Request Body:**
```json
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
    "answer": "Theo chính sách của công ty, nhân viên được hưởng 15 ngày nghỉ phép có lương mỗi năm...",
    "confidence": 0.85,
    "processingTime": 1200,
    "sources": [
      {
        "score": 0.92,
        "chunk": {
          "id": "doc_123_chunk_5",
          "content": "Company vacation policy states...",
          "metadata": {
            "documentId": "doc_123",
            "chunkIndex": 5,
            "pageNumber": 2
          }
        },
        "document": {
          "filename": "hr-policy.pdf",
          "fileType": "application/pdf",
          "fileSize": 1024000
        }
      }
    ]
  }
}
```

#### 📋 Document Management
```http
GET /rag/documents              # List all documents
GET /rag/documents/{id}         # Get document by ID
DELETE /rag/documents/{id}      # Delete document
GET /rag/stats                  # System statistics
GET /rag/supported-types        # Supported file types
```

### 🏠 Frontend Endpoints

#### 🏡 Web Interface
```http
GET /home                       # File upload interface
GET /chat                       # Real-time chat interface
```

## 🔧 Using Swagger UI

### 1. **Interactive Testing**
- Navigate to http://localhost:15001/api
- Click on any endpoint to expand it
- Click "Try it out" button
- Fill in parameters
- Click "Execute" to test

### 2. **Authentication**
Currently no authentication required for development. In production, implement proper auth.

### 3. **File Upload Testing**
1. Go to `POST /rag/upload`
2. Click "Try it out"
3. Click "Choose File" and select a document
4. Optionally add title and tags
5. Click "Execute"

### 4. **Search Testing**
1. First upload a document using `/rag/upload`
2. Go to `POST /rag/search`
3. Click "Try it out"
4. Enter your query in the request body:
   ```json
   {
     "query": "Your question here",
     "topK": 5
   }
   ```
5. Click "Execute"

## 📊 Response Status Codes

| Code | Description | Example |
|------|-------------|---------|
| **200** | Success | Document retrieved successfully |
| **201** | Created | Document uploaded and processed |
| **400** | Bad Request | Invalid file type or missing parameters |
| **404** | Not Found | Document not found |
| **500** | Server Error | Internal processing error |

## 🎯 Best Practices

### Upload Guidelines
- **File Size**: Keep files under 50MB
- **File Types**: Use supported formats only
- **Naming**: Use descriptive filenames
- **Tags**: Add relevant tags for organization

### Search Guidelines
- **Specific Queries**: More specific questions yield better results
- **Threshold**: Use 0.7-0.8 for high accuracy
- **TopK**: 3-7 results provide good context
- **Language**: Questions in Vietnamese work best

### Performance Tips
- **Batch Upload**: Upload related documents together
- **Chunking**: Adjust chunk size based on document type
- **Caching**: Results are cached for better performance

## 🐛 Common Issues & Solutions

### 1. **File Upload Fails**
- **Issue**: Unsupported file type
- **Solution**: Check supported types at `/rag/supported-types`

### 2. **No Search Results**
- **Issue**: High similarity threshold
- **Solution**: Lower threshold to 0.5-0.6

### 3. **Slow Processing**
- **Issue**: Large files or many chunks
- **Solution**: Reduce chunk size or split large documents

### 4. **Poor Answer Quality**
- **Issue**: Irrelevant context retrieved
- **Solution**: Use more specific queries or adjust topK

## 🔒 Security Considerations

### Development
- API is open for testing
- No rate limiting applied
- All file types accepted

### Production Recommendations
- Implement authentication (JWT/OAuth)
- Add rate limiting
- Validate file contents
- Implement access control
- Enable HTTPS
- Add request logging

## 📈 Monitoring & Analytics

### Available Metrics
```http
GET /rag/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalDocuments": 150,
    "totalChunks": 3750,
    "supportedFileTypes": [".pdf", ".docx", "..."],
    "processingStatus": {
      "completed": 145,
      "processing": 3,
      "failed": 2
    }
  }
}
```

### Key Performance Indicators
- **Document Processing Time**: Average time to process documents
- **Search Response Time**: Time to return search results
- **Answer Accuracy**: User feedback on answer quality
- **System Usage**: Number of uploads and searches per day

## 🚀 Integration Examples

### JavaScript/TypeScript
```typescript
// Upload document
const formData = new FormData();
formData.append('file', file);
formData.append('title', 'My Document');

const uploadResponse = await fetch('/rag/upload', {
  method: 'POST',
  body: formData
});

// Search documents
const searchResponse = await fetch('/rag/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What is the policy?',
    topK: 5
  })
});
```

### Python
```python
import requests

# Upload document
files = {'file': open('document.pdf', 'rb')}
data = {'title': 'My Document'}
response = requests.post('http://localhost:15001/rag/upload', 
                        files=files, data=data)

# Search documents
search_data = {
    'query': 'What is the policy?',
    'topK': 5
}
response = requests.post('http://localhost:15001/rag/search',
                        json=search_data)
```

### cURL
```bash
# Upload document
curl -X POST http://localhost:15001/rag/upload \
  -F "file=@document.pdf" \
  -F "title=My Document"

# Search documents
curl -X POST http://localhost:15001/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the policy?",
    "topK": 5
  }'
```

## 📞 Support

- **Documentation**: http://localhost:15001/api
- **GitHub**: https://github.com/your-repo
- **Email**: support@yourcompany.com

---

**Happy API Testing! 🎉**
