#!/usr/bin/env -S deno run -A
// Add coingecko_id column to verified_projects table

import "$std/dotenv/load.ts";
import { getDbClient } from "../utils/db.ts";

async function addColumn() {
  console.log("📊 Adding coingecko_id column to verified_projects table...");
  
  const client = await getDbClient();
  
  try {
    await client.queryObject(`
      ALTER TABLE verified_projects 
      ADD COLUMN IF NOT EXISTS coingecko_id TEXT
    `);
    
    console.log("✅ Successfully added coingecko_id column");
  } catch (error) {
    console.error("❌ Error adding column:", error);
  }
}

if (import.meta.main) {
  await addColumn();
}


