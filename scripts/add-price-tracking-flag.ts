import "$std/dotenv/load.ts";
import postgres from "https://deno.land/x/postgresjs@v3.4.3/mod.js";

const sql = postgres(Deno.env.get("DATABASE_URL")!);

try {
  console.log("Adding has_price_tracking column to verified_projects...");
  
  await sql`
    ALTER TABLE verified_projects
    ADD COLUMN IF NOT EXISTS has_price_tracking BOOLEAN DEFAULT true
  `;
  
  console.log("✅ Column added successfully!");
  console.log("Default value is TRUE for all existing projects");
  console.log("Set to FALSE for projects without price tracking");
  
} catch (error) {
  console.error("❌ Error:", error);
} finally {
  await sql.end();
}

