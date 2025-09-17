import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:15001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Static assets and views
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'public/views'));
  app.setViewEngine('hbs');

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('RAG System API')
    .setDescription(
      `
# RAG (Retrieval-Augmented Generation) System API

This is a comprehensive document processing and intelligent Q&A system built with NestJS.

## Features

### 📄 Document Processing
- **Multi-format Support**: Word (.doc, .docx), PDF, Excel (.xls, .xlsx), CSV, Text, JSON, XML
- **Intelligent Chunking**: Smart text splitting with token-based chunking
- **Metadata Extraction**: Extract document metadata like title, author, page count

### 🔍 Vector Search
- **Semantic Search**: Find relevant document chunks using vector similarity
- **PostgreSQL Integration**: Efficient vector storage and retrieval
- **Configurable Similarity**: Adjustable similarity thresholds

### 🤖 AI-Powered Answers
- **RAG Pipeline**: Retrieval-Augmented Generation for accurate answers
- **Ollama Integration**: Local LLM for generating responses
- **Context-Aware**: Answers based on relevant document chunks
- **Vietnamese Support**: Optimized for Vietnamese language

### 📊 Management
- **Document Management**: Upload, list, view, and delete documents
- **System Statistics**: Monitor document count, chunks, processing status
- **Real-time Processing**: Background document processing with status tracking

## Getting Started

1. **Upload Documents**: Use \`POST /rag/upload\` to upload and process documents
2. **Search & Ask**: Use \`POST /rag/search\` to ask questions about your documents
3. **Manage Documents**: Use document management endpoints to organize your files
4. **Monitor System**: Check system stats and supported file types

## Supported File Types

| Type | Extensions | Description |
|------|------------|-------------|
| **Word** | .doc, .docx | Microsoft Word documents |
| **PDF** | .pdf | Portable Document Format |
| **Excel** | .xls, .xlsx, .csv | Spreadsheets and CSV files |
| **Text** | .txt, .md, .json, .xml | Plain text and structured data |

## Authentication

Currently, the API is open for development. In production, implement proper authentication.
    `,
    )
    .setVersion('1.0.0')
    .addTag('RAG', 'Retrieval-Augmented Generation endpoints')
    .addTag('Documents', 'Document management endpoints')
    .addTag('System', 'System information and statistics')
    .addTag('Legacy', 'Legacy endpoints (deprecated)')
    .addServer('http://localhost:15001', 'Development Server')
    .addServer('https://your-production-domain.com', 'Production Server')
    .setContact(
      'RAG System Support',
      'https://github.com/your-repo',
      'support@yourcompany.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
  });

  SwaggerModule.setup('api', app, document, {
    customSiteTitle: 'RAG System API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { color: #2563eb; }
      .swagger-ui .scheme-container { background: #f8fafc; border: 1px solid #e2e8f0; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'none',
      defaultModelsExpandDepth: 2,
      defaultModelExpandDepth: 2,
    },
  });

  const port = process.env.PORT || 15001;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 Swagger Documentation: http://localhost:${port}/api`);
  console.log(`🏠 Web Interface: http://localhost:${port}/home`);
}

bootstrap();
