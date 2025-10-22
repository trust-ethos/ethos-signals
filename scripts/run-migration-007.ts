#!/usr/bin/env -S deno run -A

/**
 * Run migration 007: Add tweet content to paid promo reports
 */

import "https://deno.land/std@0.216.0/dotenv/load.ts";
import { getDbClient } from "../utils/db.ts";

async function runMigration() {
  console.log("🚀 Running migration 007: Add tweet content to paid promo reports...\n");
  
  const client = await getDbClient();
  
  try {
    // Add tweet_content column to paid_promo_reports table
    console.log("Adding tweet_content column to paid_promo_reports table...");
    await client.queryObject(`
      ALTER TABLE paid_promo_reports 
      ADD COLUMN IF NOT EXISTS tweet_content TEXT
    `);
    console.log("✅ Added tweet_content column\n");

    // Add column comment
    console.log("Adding column comment...");
    await client.queryObject(`
      COMMENT ON COLUMN paid_promo_reports.tweet_content IS 'The content/text of the tweet that was reported as paid promo'
    `);
    console.log("✅ Added column comment\n");

    console.log("=" .repeat(60));
    console.log("🎉 Migration 007 completed successfully!");
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