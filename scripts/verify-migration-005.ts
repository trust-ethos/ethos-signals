#!/usr/bin/env -S deno run -A

/**
 * Verify migration 005 was applied correctly
 */

import "https://deno.land/std@0.216.0/dotenv/load.ts";
import { getDbClient } from "../utils/db.ts";

async function verifyMigration() {
  console.log("🔍 Verifying migration 005...\n");
  
  const client = await getDbClient();
  
  try {
    // Check verified_projects table has new columns
    console.log("Checking verified_projects table columns...");
    const columns = await client.queryObject(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'verified_projects'
        AND column_name IN ('is_verified', 'suggested_by_auth_token', 'suggested_at', 'verified_at', 'verified_by')
      ORDER BY column_name
    `);
    
    if (columns.rows.length === 5) {
      console.log("✅ All 5 new columns exist:");
      columns.rows.forEach((col: any) => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log(`⚠️  Expected 5 columns, found ${columns.rows.length}`);
    }
    console.log();

    // Check project_suggestion_rate_limit table exists
    console.log("Checking project_suggestion_rate_limit table...");
    const tableExists = await client.queryObject(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'project_suggestion_rate_limit'
      ) as exists
    `);
    
    if ((tableExists.rows[0] as any).exists) {
      console.log("✅ project_suggestion_rate_limit table exists");
      
      // Check columns
      const rateLimitCols = await client.queryObject(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'project_suggestion_rate_limit'
        ORDER BY ordinal_position
      `);
      console.log(`   ${rateLimitCols.rows.length} columns:`);
      rateLimitCols.rows.forEach((col: any) => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log("❌ project_suggestion_rate_limit table does NOT exist");
    }
    console.log();

    // Check indexes
    console.log("Checking indexes...");
    const indexes = await client.queryObject(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('verified_projects', 'project_suggestion_rate_limit')
        AND indexname IN ('idx_suggestion_rate_limit', 'idx_verified_projects_verified', 'idx_verified_projects_suggested_by')
      ORDER BY indexname
    `);
    
    console.log(`✅ Found ${indexes.rows.length} indexes:`);
    indexes.rows.forEach((idx: any) => {
      console.log(`   - ${idx.indexname}`);
    });
    console.log();

    console.log("=" .repeat(60));
    console.log("🎉 Migration 005 verification complete!");
    console.log("=" .repeat(60));
    
  } catch (error) {
    console.error("\n❌ Verification failed:", error);
    throw error;
  }
}

if (import.meta.main) {
  verifyMigration()
    .then(() => Deno.exit(0))
    .catch(() => Deno.exit(1));
}

