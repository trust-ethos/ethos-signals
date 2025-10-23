#!/usr/bin/env -S deno run -A

import "https://deno.land/std@0.216.0/dotenv/load.ts";
import { getDbClient } from "../utils/db.ts";

async function checkUrls() {
  console.log("🔍 Checking paid promo report URLs...\n");
  
  const client = await getDbClient();
  
  try {
    const result = await client.queryObject<{
      id: string;
      tweet_url: string;
      twitter_username: string;
      disclosure_status: string;
    }>(`
      SELECT id, tweet_url, twitter_username, disclosure_status
      FROM paid_promo_reports
      ORDER BY reported_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${result.rows.length} reports:\n`);
    
    for (const row of result.rows) {
      console.log(`Username: ${row.twitter_username}`);
      console.log(`Tweet URL: ${row.tweet_url}`);
      console.log(`Disclosure: ${row.disclosure_status}`);
      console.log('---');
    }
    
  } catch (error) {
    console.error("❌ Failed:", error);
    throw error;
  }
}

if (import.meta.main) {
  checkUrls()
    .then(() => Deno.exit(0))
    .catch(() => Deno.exit(1));
}

