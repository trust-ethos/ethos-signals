import "$std/dotenv/load.ts";
import { getDbClient } from "../utils/db.ts";

async function addTickerColumn() {
  const client = await getDbClient();
  
  try {
    // Add ticker column to verified_projects table
    await client.queryObject(`
      ALTER TABLE verified_projects 
      ADD COLUMN IF NOT EXISTS ticker VARCHAR(10);
    `);
    
    console.log("✅ Added ticker column to verified_projects table");
    
    // Create index for faster lookups
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_verified_projects_ticker 
      ON verified_projects(ticker);
    `);
    
    console.log("✅ Created index on ticker column");
    
  } catch (error) {
    console.error("❌ Failed to add ticker column:", error);
    throw error;
  }
}

if (import.meta.main) {
  await addTickerColumn();
  console.log("Done!");
  Deno.exit(0);
}
