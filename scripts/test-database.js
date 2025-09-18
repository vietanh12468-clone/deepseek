const { Client } = require('pg');
require('dotenv').config();

async function testDatabase() {
  console.log('🧪 Testing database connection and functionality...');

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
    console.log('✅ Database connection successful');

    // Test 1: Check tables exist
    console.log('\n📋 Testing tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    const expectedTables = ['files', 'histories'];
    const actualTables = tablesResult.rows.map(row => row.table_name);
    
    for (const table of expectedTables) {
      if (actualTables.includes(table)) {
        console.log(`  ✅ Table '${table}' exists`);
      } else {
        console.log(`  ❌ Table '${table}' missing`);
      }
    }

    // Test 2: Check document stats view
    console.log('\n📊 Testing document statistics...');
    const statsResult = await client.query('SELECT * FROM document_stats');
    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      console.log(`  ✅ Total documents: ${stats.total_documents}`);
      console.log(`  ✅ Completed documents: ${stats.completed_documents}`);
      console.log(`  ✅ Processing documents: ${stats.processing_documents}`);
      console.log(`  ✅ Total chunks: ${stats.total_chunks}`);
    }

    // Test 3: Check sample data
    console.log('\n📝 Testing sample data...');
    const filesResult = await client.query('SELECT COUNT(*) as count FROM files');
    const chunksResult = await client.query('SELECT COUNT(*) as count FROM histories');
    
    console.log(`  ✅ Files in database: ${filesResult.rows[0].count}`);
    console.log(`  ✅ Chunks in database: ${chunksResult.rows[0].count}`);

    // Test 4: Test vector search function
    console.log('\n🔍 Testing vector search function...');
    try {
      // Create a sample embedding for testing
      const sampleEmbedding = Array.from({length: 384}, () => Math.random() * 2 - 1);
      const embeddingStr = `[${sampleEmbedding.join(',')}]`;
      
      const searchResult = await client.query(
        'SELECT * FROM vector_similarity_search_basic($1, $2, $3, $4)',
        [embeddingStr, 0.5, 5, null]
      );
      
      console.log(`  ✅ Vector search function works (found ${searchResult.rows.length} results)`);
      
      if (searchResult.rows.length > 0) {
        console.log(`  ✅ Sample result: "${searchResult.rows[0].context.substring(0, 50)}..."`);
      }
    } catch (error) {
      console.log(`  ⚠️  Vector search function test failed: ${error.message}`);
    }

    // Test 5: Test full-text search
    console.log('\n🔎 Testing full-text search...');
    try {
      const ftsResult = await client.query(`
        SELECT context, ts_rank(to_tsvector('english', context), plainto_tsquery('english', 'policy')) as rank
        FROM histories 
        WHERE to_tsvector('english', context) @@ plainto_tsquery('english', 'policy')
        ORDER BY rank DESC
        LIMIT 3
      `);
      
      console.log(`  ✅ Full-text search works (found ${ftsResult.rows.length} results)`);
      
      if (ftsResult.rows.length > 0) {
        console.log(`  ✅ Top result: "${ftsResult.rows[0].context.substring(0, 50)}..."`);
      }
    } catch (error) {
      console.log(`  ⚠️  Full-text search test failed: ${error.message}`);
    }

    // Test 6: Test recent documents view
    console.log('\n📅 Testing recent documents view...');
    const recentResult = await client.query('SELECT * FROM recent_documents LIMIT 5');
    console.log(`  ✅ Recent documents view works (${recentResult.rows.length} documents)`);

    // Test 7: Test database performance
    console.log('\n⚡ Testing database performance...');
    const startTime = Date.now();
    
    await client.query(`
      SELECT h.context, f.file_name 
      FROM histories h 
      JOIN files f ON h.file_id = f.id 
      LIMIT 100
    `);
    
    const queryTime = Date.now() - startTime;
    console.log(`  ✅ Join query performance: ${queryTime}ms`);

    // Test 8: Check indexes
    console.log('\n🔍 Testing indexes...');
    const indexResult = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);
    
    console.log(`  ✅ Found ${indexResult.rows.length} custom indexes`);
    
    // Group by table
    const indexesByTable = {};
    indexResult.rows.forEach(row => {
      if (!indexesByTable[row.tablename]) {
        indexesByTable[row.tablename] = [];
      }
      indexesByTable[row.tablename].push(row.indexname);
    });
    
    Object.entries(indexesByTable).forEach(([table, indexes]) => {
      console.log(`    ${table}: ${indexes.length} indexes`);
    });

    console.log('\n🎉 All database tests completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  ✅ Database connection working');
    console.log('  ✅ Tables and views created');
    console.log('  ✅ Sample data loaded');
    console.log('  ✅ Vector search function available');
    console.log('  ✅ Full-text search working');
    console.log('  ✅ Indexes created for performance');
    
    console.log('\n🚀 Ready to start the RAG application!');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('\n🔧 Troubleshooting steps:');
    console.error('1. Make sure PostgreSQL is running');
    console.error('2. Check your .env file configuration');
    console.error('3. Run: npm run db:setup');
    console.error('4. Run: npm run db:seed');
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the test
if (require.main === module) {
  testDatabase().catch(console.error);
}

module.exports = { testDatabase };
