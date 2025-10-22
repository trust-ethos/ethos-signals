#!/usr/bin/env -S deno run -A

/**
 * Run migration 006: Add paid promo reports support
 */

import "https://deno.land/std@0.216.0/dotenv/load.ts";
import { getDbClient } from "../utils/db.ts";

async function runMigration() {
  console.log("🚀 Running migration 006: Add paid promo reports...\n");
  
  const client = await getDbClient();
  
  try {
    // Create paid_promo_reports table
    console.log("Creating paid_promo_reports table...");
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS paid_promo_reports (
        id TEXT PRIMARY KEY,
        tweet_url TEXT NOT NULL,
        twitter_username TEXT NOT NULL,
        evidence TEXT,
        reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        auth_token TEXT,
        CONSTRAINT fk_auth_token 
          FOREIGN KEY (auth_token) 
          REFERENCES extension_auth_tokens(auth_token)
          ON DELETE SET NULL,
        CONSTRAINT unique_tweet_reporter 
          UNIQUE (tweet_url, auth_token)
      )
    `);
    console.log("✅ Created paid_promo_reports table\n");

    // Create indexes for efficient queries
    console.log("Creating indexes...");
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_paid_promo_twitter_username ON paid_promo_reports (twitter_username)
    `);
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_paid_promo_tweet_url ON paid_promo_reports (tweet_url)
    `);
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_paid_promo_reported_at ON paid_promo_reports (reported_at)
    `);
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_paid_promo_auth_token ON paid_promo_reports (auth_token)
    `);
    console.log("✅ Created indexes\n");

    // Add table comment
    console.log("Adding table comment...");
    await client.queryObject(`
      COMMENT ON TABLE paid_promo_reports IS 'Reports from users flagging tweets as potential paid promotions'
    `);
    console.log("✅ Added table comment\n");

    console.log("=" .repeat(60));
    console.log("🎉 Migration 006 completed successfully!");
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