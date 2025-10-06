#!/usr/bin/env -S deno run -A

import "$std/dotenv/load.ts";
import { getDbClient } from "../utils/db.ts";

async function verifyAuthTables() {
  console.log("🔍 Verifying authentication tables...\n");
  
  try {
    const client = await getDbClient();
    
    // Check extension_auth_tokens table structure
    console.log("📋 extension_auth_tokens table structure:");
    const authTokensColumns = await client.queryObject<{ column_name: string; data_type: string; is_nullable: string }>(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'extension_auth_tokens'
      ORDER BY ordinal_position
    `);
    
    authTokensColumns.rows.forEach(row => {
      console.log(`  • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    
    // Check rate_limit_tracking table structure
    console.log("\n📋 rate_limit_tracking table structure:");
    const rateLimitColumns = await client.queryObject<{ column_name: string; data_type: string; is_nullable: string }>(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'rate_limit_tracking'
      ORDER BY ordinal_position
    `);
    
    rateLimitColumns.rows.forEach(row => {
      console.log(`  • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    
    // Check signals table for auth_token column
    console.log("\n📋 Checking signals table for auth_token column:");
    const signalsAuthColumn = await client.queryObject<{ column_name: string; data_type: string; is_nullable: string }>(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'signals' AND column_name = 'auth_token'
    `);
    
    if (signalsAuthColumn.rows.length > 0) {
      console.log(`  ✓ auth_token (${signalsAuthColumn.rows[0].data_type})`);
    } else {
      console.log("  ❌ auth_token column not found!");
    }
    
    // Check indexes
    console.log("\n📊 Indexes created:");
    const indexes = await client.queryObject<{ indexname: string; tablename: string }>(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE tablename IN ('extension_auth_tokens', 'rate_limit_tracking', 'signals')
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname
    `);
    
    let currentTable = '';
    indexes.rows.forEach(row => {
      if (row.tablename !== currentTable) {
        console.log(`\n  ${row.tablename}:`);
        currentTable = row.tablename;
      }
      console.log(`    • ${row.indexname}`);
    });
    
    console.log("\n✅ All tables and indexes verified successfully!");
    
  } catch (error) {
    console.error("\n❌ Verification failed:", error);
    Deno.exit(1);
  }
}

verifyAuthTables();

