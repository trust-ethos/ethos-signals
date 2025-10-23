#!/usr/bin/env -S deno run -A

import "https://deno.land/std@0.216.0/dotenv/load.ts";
import { getDbClient } from "../utils/db.ts";

async function verifyMigration() {
  console.log("🔍 Verifying migration 008...\n");
  
  const client = await getDbClient();
  
  try {
    // Check if disclosure_status column exists
    const result = await client.queryObject<{
      column_name: string;
      data_type: string;
      column_default: string | null;
    }>(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'paid_promo_reports' 
      AND column_name = 'disclosure_status'
    `);
    
    if (result.rows.length > 0) {
      console.log("✅ disclosure_status column exists");
      console.log("   Type:", result.rows[0].data_type);
      console.log("   Default:", result.rows[0].column_default);
    } else {
      console.log("❌ disclosure_status column not found");
    }
    
    // Check if index exists
    const indexResult = await client.queryObject<{
      indexname: string;
    }>(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'paid_promo_reports' 
      AND indexname = 'idx_paid_promo_disclosure_status'
    `);
    
    if (indexResult.rows.length > 0) {
      console.log("✅ Index idx_paid_promo_disclosure_status exists");
    } else {
      console.log("❌ Index idx_paid_promo_disclosure_status not found");
    }
    
    console.log("\n✅ Migration 008 verification complete!");
    
  } catch (error) {
    console.error("❌ Verification failed:", error);
    throw error;
  }
}

if (import.meta.main) {
  verifyMigration()
    .then(() => Deno.exit(0))
    .catch(() => Deno.exit(1));
}

