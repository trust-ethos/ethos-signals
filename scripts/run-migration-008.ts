#!/usr/bin/env -S deno run -A

/**
 * Run migration 008: Add disclosure status to paid promo reports
 */

import "https://deno.land/std@0.216.0/dotenv/load.ts";
import { getDbClient } from "../utils/db.ts";

async function runMigration() {
  console.log("🚀 Running migration 008: Add disclosure status to paid promo reports...\n");
  
  const client = await getDbClient();
  
  try {
    // Add disclosure_status column to paid_promo_reports table
    console.log("Adding disclosure_status column to paid_promo_reports table...");
    await client.queryObject(`
      ALTER TABLE paid_promo_reports 
      ADD COLUMN IF NOT EXISTS disclosure_status TEXT NOT NULL DEFAULT 'disclosed' 
      CHECK (disclosure_status IN ('disclosed', 'undisclosed'))
    `);
    console.log("✅ Added disclosure_status column\n");

    // Add index for efficient filtering
    console.log("Creating index on disclosure_status...");
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_paid_promo_disclosure_status 
      ON paid_promo_reports (disclosure_status)
    `);
    console.log("✅ Created index\n");

    // Add column comment
    console.log("Adding column comment...");
    await client.queryObject(`
      COMMENT ON COLUMN paid_promo_reports.disclosure_status IS 'Whether the paid promotion was disclosed or undisclosed'
    `);
    console.log("✅ Added column comment\n");

    console.log("=".repeat(60));
    console.log("🎉 Migration 008 completed successfully!");
    console.log("=".repeat(60));
    
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

