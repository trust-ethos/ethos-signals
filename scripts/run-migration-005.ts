#!/usr/bin/env -S deno run -A

/**
 * Run migration 005: Add project suggestions support
 */

import "https://deno.land/std@0.216.0/dotenv/load.ts";
import { getDbClient } from "../utils/db.ts";

async function runMigration() {
  console.log("🚀 Running migration 005: Add project suggestions...\n");
  
  const client = await getDbClient();
  
  try {
    // Add verification tracking to verified_projects
    console.log("Adding verification tracking fields to verified_projects...");
    await client.queryObject(`
      ALTER TABLE verified_projects 
      ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS suggested_by_auth_token TEXT,
      ADD COLUMN IF NOT EXISTS suggested_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS verified_by TEXT
    `);
    console.log("✅ Added verification fields\n");

    // Create rate limiting table for suggestions
    console.log("Creating project_suggestion_rate_limit table...");
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS project_suggestion_rate_limit (
        id TEXT PRIMARY KEY,
        auth_token TEXT NOT NULL,
        suggestion_count INTEGER NOT NULL DEFAULT 0,
        window_start TIMESTAMPTZ NOT NULL,
        last_suggestion_at TIMESTAMPTZ NOT NULL,
        FOREIGN KEY (auth_token) REFERENCES extension_auth_tokens(auth_token) ON DELETE CASCADE
      )
    `);
    console.log("✅ Created project_suggestion_rate_limit table\n");

    // Create indexes
    console.log("Creating indexes...");
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_suggestion_rate_limit 
      ON project_suggestion_rate_limit(auth_token, window_start)
    `);
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_verified_projects_verified 
      ON verified_projects(is_verified)
    `);
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_verified_projects_suggested_by 
      ON verified_projects(suggested_by_auth_token)
    `);
    console.log("✅ Created indexes\n");

    // Backfill existing projects as verified
    console.log("Backfilling existing projects as verified...");
    const result = await client.queryObject(`
      UPDATE verified_projects 
      SET is_verified = TRUE, 
          verified_at = COALESCE(created_at, NOW())
      WHERE is_verified IS NULL
    `);
    console.log(`✅ Updated ${result.rowCount || 0} existing projects\n`);

    console.log("=" .repeat(60));
    console.log("🎉 Migration 005 completed successfully!");
    console.log("=" .repeat(60));
    
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    throw error;
  }
}

if (import.meta.main) {
  runMigration()
    .then(() => Deno.exit(0))
    .catch(() => Deno.exit(1));
}

