const { Client } = require('pg');
require('dotenv').config();

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');

  const config = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DB || 'deepseek',
  };

  const client = new Client(config);

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await client.query('DELETE FROM histories');
    await client.query('DELETE FROM files');
    await client.query('ALTER SEQUENCE files_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE histories_id_seq RESTART WITH 1');

    // Sample documents
    const sampleDocuments = [
      {
        fileName: 'company-handbook.pdf',
        fileType: 'application/pdf',
        fileSize: 2048000,
        title: 'Company Employee Handbook',
        author: 'HR Department',
        pageCount: 50,
        tags: 'hr,policy,handbook',
        status: 'completed'
      },
      {
        fileName: 'technical-documentation.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 1024000,
        title: 'Technical Documentation Guide',
        author: 'Engineering Team',
        pageCount: 25,
        tags: 'technical,documentation,guide',
        status: 'completed'
      },
      {
        fileName: 'financial-report-q3.xlsx',
        fileType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: 512000,
        title: 'Q3 Financial Report',
        author: 'Finance Department',
        pageCount: 15,
        tags: 'finance,report,quarterly',
        status: 'completed'
      },
      {
        fileName: 'meeting-notes.md',
        fileType: 'text/markdown',
        fileSize: 25600,
        title: 'Weekly Team Meeting Notes',
        author: 'Project Manager',
        pageCount: 3,
        tags: 'meeting,notes,team',
        status: 'processing'
      }
    ];

    // Insert sample documents
    console.log('📄 Inserting sample documents...');
    const fileIds = [];
    
    for (const doc of sampleDocuments) {
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      
      const result = await client.query(`
        INSERT INTO files (
          file_name, file_type, file_size, document_id, title, author, 
          page_count, tags, status, chunk_count, processing_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [
        doc.fileName,
        doc.fileType,
        doc.fileSize,
        documentId,
        doc.title,
        doc.author,
        doc.pageCount,
        doc.tags,
        doc.status,
        0, // Will be updated when we add chunks
        JSON.stringify({
          chunkSize: 500,
          chunkOverlap: 50,
          processingStarted: new Date().toISOString()
        })
      ]);
      
      fileIds.push({ id: result.rows[0].id, documentId, title: doc.title });
      console.log(`  ✅ Created: ${doc.title} (ID: ${result.rows[0].id})`);
    }

    // Sample chunks for completed documents
    const sampleChunks = [
      {
        fileId: fileIds[0].id, // Company handbook
        documentId: fileIds[0].documentId,
        chunks: [
          {
            content: 'Company vacation policy: All full-time employees are entitled to 15 days of paid vacation per year. Vacation days accrue monthly and can be carried over to the next year with manager approval.',
            pageNumber: 12,
            section: 'Employee Benefits'
          },
          {
            content: 'Work from home policy: Employees may work remotely up to 3 days per week with manager approval. All remote work must be coordinated with team members and documented in the project management system.',
            pageNumber: 18,
            section: 'Work Arrangements'
          },
          {
            content: 'Performance review process: Annual performance reviews are conducted every December. Employees receive feedback on goals achievement, skill development, and career progression opportunities.',
            pageNumber: 25,
            section: 'Performance Management'
          }
        ]
      },
      {
        fileId: fileIds[1].id, // Technical documentation
        documentId: fileIds[1].documentId,
        chunks: [
          {
            content: 'API authentication: All API requests must include a valid JWT token in the Authorization header. Tokens expire after 24 hours and must be refreshed using the refresh endpoint.',
            pageNumber: 5,
            section: 'Authentication'
          },
          {
            content: 'Database connection: The application uses PostgreSQL with connection pooling. Maximum pool size is 20 connections. Use environment variables to configure database credentials.',
            pageNumber: 8,
            section: 'Database Setup'
          },
          {
            content: 'Error handling: Implement proper error handling using try-catch blocks. Log errors with appropriate severity levels and return meaningful error messages to the client.',
            pageNumber: 15,
            section: 'Best Practices'
          }
        ]
      },
      {
        fileId: fileIds[2].id, // Financial report
        documentId: fileIds[2].documentId,
        chunks: [
          {
            content: 'Q3 revenue summary: Total revenue for Q3 was $2.5M, representing a 15% increase compared to Q2. Major contributors were enterprise sales and subscription renewals.',
            pageNumber: 2,
            section: 'Revenue Analysis'
          },
          {
            content: 'Expense breakdown: Operating expenses totaled $1.8M in Q3. Largest categories were personnel costs (60%), infrastructure (25%), and marketing (15%).',
            pageNumber: 7,
            section: 'Expense Analysis'
          }
        ]
      }
    ];

    // Generate sample embeddings (random vectors for demonstration)
    function generateSampleEmbedding(dimension = 1024) {
      const embedding = [];
      for (let i = 0; i < dimension; i++) {
        embedding.push(Math.random() * 2 - 1); // Random values between -1 and 1
      }
      return embedding;
    }

    // Insert sample chunks
    console.log('📝 Inserting sample chunks...');
    let totalChunks = 0;

    for (const docChunks of sampleChunks) {
      for (let i = 0; i < docChunks.chunks.length; i++) {
        const chunk = docChunks.chunks[i];
        const embedding = generateSampleEmbedding();
        
        await client.query(`
          INSERT INTO histories (
            context, embedding, size, chunk_index, chunk_count, document_id,
            token_count, start_index, end_index, page_number, section,
            file_id, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          chunk.content,
          `[${embedding.join(',')}]`,
          Buffer.byteLength(chunk.content, 'utf8'),
          i,
          docChunks.chunks.length,
          docChunks.documentId,
          chunk.content.split(' ').length, // Approximate token count
          0,
          chunk.content.length,
          chunk.pageNumber,
          chunk.section,
          docChunks.fileId,
          JSON.stringify({
            processingTime: Math.random() * 1000 + 200,
            confidence: Math.random() * 0.3 + 0.7
          })
        ]);
        
        totalChunks++;
      }

      // Update file chunk count
      await client.query(`
        UPDATE files SET chunk_count = $1, status = 'completed' WHERE id = $2
      `, [docChunks.chunks.length, docChunks.fileId]);
    }

    console.log(`  ✅ Created ${totalChunks} sample chunks`);

    // Display seeded data statistics
    const stats = await client.query('SELECT * FROM document_stats');
    console.log('\n📊 Seeded data statistics:');
    if (stats.rows.length > 0) {
      const data = stats.rows[0];
      console.log(`  - Total documents: ${data.total_documents}`);
      console.log(`  - Completed documents: ${data.completed_documents}`);
      console.log(`  - Processing documents: ${data.processing_documents}`);
      console.log(`  - Total chunks: ${data.total_chunks}`);
      console.log(`  - Average chunks per document: ${Math.round(data.avg_chunks_per_document * 100) / 100}`);
      console.log(`  - Total file size: ${Math.round(data.total_file_size / 1024 / 1024 * 100) / 100} MB`);
    }

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Sample data includes:');
    console.log('  - Company Employee Handbook (HR policies)');
    console.log('  - Technical Documentation Guide (API, database)');
    console.log('  - Q3 Financial Report (revenue, expenses)');
    console.log('  - Weekly Meeting Notes (in processing status)');
    
    console.log('\n🔍 Try these sample queries:');
    console.log('  - "What is the vacation policy?"');
    console.log('  - "How do I authenticate with the API?"');
    console.log('  - "What was the Q3 revenue?"');
    console.log('  - "What are the work from home rules?"');

  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the seeding
if (require.main === module) {
  seedDatabase().catch(console.error);
}

module.exports = { seedDatabase };
