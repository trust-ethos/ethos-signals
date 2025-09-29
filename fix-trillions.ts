#!/usr/bin/env -S deno run -A
// Quick fix to add CoinGecko ID to Trillions entry

import "$std/dotenv/load.ts";
import { getDbClient } from "./utils/db.ts";

async function fixTrillions() {
  console.log("🔧 Fixing Trillions entry...");
  const client = await getDbClient();

  try {
    // First, let's find the Trillions entry
    console.log("🔍 Looking for Trillions in verified_projects...");
    const findResult = await client.queryObject(`
      SELECT id, twitter_username, display_name, chain, link, coingecko_id
      FROM verified_projects
      WHERE LOWER(twitter_username) LIKE '%trillion%' 
         OR LOWER(display_name) LIKE '%trillion%'
      ORDER BY created_at DESC
      LIMIT 5;
    `);

    if (findResult.rows.length === 0) {
      console.log("❌ No Trillions entry found. Please add it via the Admin UI.");
      return;
    }

    console.log(`\n📋 Found ${findResult.rows.length} matching entries:`);
    findResult.rows.forEach((row: any, idx) => {
      console.log(`  ${idx + 1}. ${row.display_name} (@${row.twitter_username})`);
      console.log(`     ID: ${row.id}`);
      console.log(`     Chain: ${row.chain || 'not set'}`);
      console.log(`     Contract: ${row.link || 'not set'}`);
      console.log(`     CoinGecko ID: ${row.coingecko_id || 'NOT SET ❌'}`);
      console.log();
    });

    // Update all Trillions entries to have the CoinGecko ID
    console.log("✏️  Updating entries with CoinGecko ID 'trillions'...");
    const updateResult = await client.queryObject(`
      UPDATE verified_projects
      SET coingecko_id = 'trillions',
          chain = 'plasma'
      WHERE (LOWER(twitter_username) LIKE '%trillion%' 
         OR LOWER(display_name) LIKE '%trillion%')
        AND coingecko_id IS NULL
      RETURNING id, display_name, twitter_username, coingecko_id, chain;
    `);

    if (updateResult.rows.length > 0) {
      console.log(`✅ Successfully updated ${updateResult.rows.length} entry/entries:`);
      updateResult.rows.forEach((row: any) => {
        console.log(`   • ${row.display_name} (@${row.twitter_username})`);
        console.log(`     - Chain: ${row.chain}`);
        console.log(`     - CoinGecko ID: ${row.coingecko_id}`);
      });
    } else {
      console.log("ℹ️  No entries needed updating (they already have CoinGecko ID set)");
    }

    // Verify the fix
    console.log("\n🔍 Verifying update...");
    const verifyResult = await client.queryObject(`
      SELECT id, twitter_username, display_name, chain, link, coingecko_id
      FROM verified_projects
      WHERE LOWER(twitter_username) LIKE '%trillion%' 
         OR LOWER(display_name) LIKE '%trillion%'
      LIMIT 5;
    `);

    console.log("\n✅ Current state of Trillions entries:");
    verifyResult.rows.forEach((row: any) => {
      console.log(`   ${row.display_name} (@${row.twitter_username})`);
      console.log(`   ├─ Chain: ${row.chain}`);
      console.log(`   ├─ Contract: ${row.link || 'none'}`);
      console.log(`   └─ CoinGecko ID: ${row.coingecko_id} ${row.coingecko_id === 'trillions' ? '✅' : '❌'}`);
      console.log();
    });

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await client.end();
  }

  console.log("🎉 Done! Trillions should now load prices correctly.");
  console.log("   Refresh your browser to see the updated data.");
}

if (import.meta.main) {
  await fixTrillions();
}
