const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
  console.log('🚀 Starting database setup...');

  const config = {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: 'postgres', // Connect to default database first
  };

  const dbName = process.env.POSTGRES_DB || 'deepseek';
  
  let client = new Client(config);

  try {
    // Connect to PostgreSQL
    await client.connect();
    console.log('✅ Connected to PostgreSQL server');

    // Check if database exists
    const dbCheckResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (dbCheckResult.rows.length === 0) {
      // Create database if it doesn't exist
      console.log(`📦 Creating database: ${dbName}`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log('✅ Database created successfully');
    } else {
      console.log(`✅ Database ${dbName} already exists`);
    }

    await client.end();

    // Connect to the target database
    config.database = dbName;
    client = new Client(config);
    await client.connect();
    console.log(`✅ Connected to database: ${dbName}`);

    // Try to use pgvector schema first, fallback to basic schema
    let schemaPath = path.join(__dirname, '..', 'src', 'migrations', '001-initial-schema.sql');
    let useBasicSchema = false;
    
    // Check if pgvector extension is available
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS vector");
      console.log('✅ pgvector extension available, using advanced schema');
    } catch (error) {
      console.log('⚠️  pgvector extension not available, using basic schema');
      schemaPath = path.join(__dirname, '..', 'src', 'migrations', '002-basic-schema.sql');
      useBasicSchema = true;
    }
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log(`📋 Executing database schema${useBasicSchema ? ' (basic version)' : ' (with pgvector)'}...`);
    
    await client.query(schemaSql);
    console.log('✅ Database schema executed successfully');
    
    if (useBasicSchema) {
      console.log('ℹ️  Note: Using basic vector search implementation');
      console.log('   For better performance, install pgvector extension');
    }

    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('📊 Tables created:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Verify indexes were created
    const indexesResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
      ORDER BY indexname
    `);

    console.log('🔍 Indexes created:');
    indexesResult.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });

    // Check extensions
    const extensionsResult = await client.query(`
      SELECT extname 
      FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'vector')
      ORDER BY extname
    `);

    console.log('🔌 Extensions enabled:');
    extensionsResult.rows.forEach(row => {
      console.log(`  - ${row.extname}`);
    });

    // Display database stats
    const statsResult = await client.query('SELECT * FROM document_stats');
    console.log('📈 Database statistics:');
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      console.log(`  - Total documents: ${stats.total_documents}`);
      console.log(`  - Completed documents: ${stats.completed_documents}`);
      console.log(`  - Processing documents: ${stats.processing_documents}`);
      console.log(`  - Failed documents: ${stats.failed_documents}`);
      console.log(`  - Total chunks: ${stats.total_chunks}`);
    }

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Start your application: npm run start:dev');
    console.log('2. Access Swagger UI: http://localhost:15001/api');
    console.log('3. Upload documents via /rag/upload endpoint');
    console.log('4. Test search via /rag/search endpoint');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Check your .env file configuration');
    console.error('3. Ensure the user has CREATE DATABASE permissions');
    console.error('4. For pgvector extension, install: apt-get install postgresql-16-pgvector');
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
    }
  }
}

// Run the setup
if (require.main === module) {
  setupDatabase().catch(console.error);
}

module.exports = { setupDatabase };
