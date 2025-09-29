#!/usr/bin/env -S deno run -A
// Migration script to add Plasma chain support to the database

import "$std/dotenv/load.ts";
import { getDbClient } from "../utils/db.ts";

async function migrate() {
  console.log("🔄 Starting migration to add Plasma chain support...");
  const client = await getDbClient();

  try {
    console.log("📋 Dropping old chain constraint...");
    await client.queryObject(`
      ALTER TABLE verified_projects DROP CONSTRAINT IF EXISTS verified_projects_chain_check;
    `);

    console.log("✅ Adding new constraint with Plasma support...");
    await client.queryObject(`
      ALTER TABLE verified_projects ADD CONSTRAINT verified_projects_chain_check
        CHECK (chain IN ('ethereum', 'base', 'solana', 'bsc', 'plasma'));
    `);

    console.log("🔍 Verifying constraint...");
    const result = await client.queryObject(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'verified_projects'::regclass
        AND conname = 'verified_projects_chain_check';
    `);

    if (result.rows.length > 0) {
      console.log("✅ Migration successful!");
      console.log("📊 New constraint:", result.rows[0].pg_get_constraintdef);
    } else {
      console.error("❌ Failed to verify constraint update.");
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await client.end();
    console.log("🎉 Done! Plasma chain support has been added to the database.");
  }
}

if (import.meta.main) {
  await migrate();
}
