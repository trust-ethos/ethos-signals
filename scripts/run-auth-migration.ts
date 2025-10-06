#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read

import "$std/dotenv/load.ts";
import { getDbClient } from "../utils/db.ts";

async function runAuthMigration() {
  console.log("🚀 Running extension authentication migration...");
  
  try {
    const client = await getDbClient();
    
    // Table for storing extension authentication tokens
    console.log("Creating extension_auth_tokens table...");
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS extension_auth_tokens (
        id TEXT PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        ethos_profile_id INTEGER,
        ethos_username TEXT,
        auth_token TEXT NOT NULL UNIQUE,
        device_identifier TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      )
    `);
    console.log("✅ extension_auth_tokens table created");

    // Create indexes for auth tokens
    console.log("Creating indexes for extension_auth_tokens...");
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON extension_auth_tokens(auth_token)`);
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_auth_tokens_wallet ON extension_auth_tokens(wallet_address)`);
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_auth_tokens_active ON extension_auth_tokens(is_active, expires_at)`);
    console.log("✅ Indexes created for extension_auth_tokens");

    // Table for rate limiting tracking
    console.log("Creating rate_limit_tracking table...");
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS rate_limit_tracking (
        id TEXT PRIMARY KEY,
        auth_token TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 1,
        window_start TIMESTAMP NOT NULL DEFAULT NOW(),
        last_request_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (auth_token) REFERENCES extension_auth_tokens(auth_token) ON DELETE CASCADE
      )
    `);
    console.log("✅ rate_limit_tracking table created");

    // Create index for rate limit queries
    console.log("Creating indexes for rate_limit_tracking...");
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_rate_limit_token ON rate_limit_tracking(auth_token, endpoint, window_start)`);
    console.log("✅ Indexes created for rate_limit_tracking");

    // Add auth_token column to signals table
    console.log("Adding auth_token column to signals table...");
    await client.queryObject(`ALTER TABLE signals ADD COLUMN IF NOT EXISTS auth_token TEXT`);
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_signals_auth_token ON signals(auth_token)`);
    console.log("✅ auth_token column added to signals table");

    console.log("\n🎉 Migration completed successfully!");
    console.log("\nTables created:");
    console.log("  - extension_auth_tokens (stores authentication tokens)");
    console.log("  - rate_limit_tracking (tracks API usage)");
    console.log("  - signals.auth_token (links signals to auth tokens)");

    // Verify tables exist
    console.log("\n📊 Verifying tables...");
    const result = await client.queryObject<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('extension_auth_tokens', 'rate_limit_tracking', 'signals')
      ORDER BY table_name
    `);
    
    console.log("\nExisting tables:");
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    Deno.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    Deno.exit(1);
  }
}

runAuthMigration();

