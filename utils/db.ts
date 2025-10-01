import { Client } from "postgres";

let client: Client | null = null;
let isConnected = false;
let connectionPromise: Promise<Client> | null = null;

function getDatabaseUrl(): string {
  const url = Deno.env.get("DATABASE_URL");
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required");
  }
  return url;
}

export async function getDbClient(): Promise<Client> {
  // If we have a valid connection, return it
  if (client && isConnected) {
    try {
      // Test the connection with a simple query
      await client.queryObject("SELECT 1");
      return client;
    } catch (error) {
      // Connection is bad, clean up
      console.log("Database connection test failed, reconnecting...");
      await closeDb();
    }
  }

  // If there's already a connection attempt in progress, wait for it
  if (connectionPromise) {
    return await connectionPromise;
  }

  // Create new connection
  connectionPromise = (async () => {
    try {
      if (client) {
        await client.end().catch(() => {}); // Clean up old connection
      }
      
      client = new Client(getDatabaseUrl());
      await client.connect();
      isConnected = true;
      
      return client;
    } catch (error) {
      console.error("Failed to create database connection:", error);
      client = null;
      isConnected = false;
      throw error;
    } finally {
      connectionPromise = null;
    }
  })();

  return await connectionPromise;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
    isConnected = false;
  }
}

// Database initialization - create tables if they don't exist
export async function initializeDatabase(): Promise<void> {
  const client = await getDbClient();
  
  try {
    
    // Create signals table
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS signals (
        id TEXT PRIMARY KEY,
        twitter_username TEXT NOT NULL,
        project_handle TEXT NOT NULL,
        project_user_id INTEGER,
        project_display_name TEXT,
        project_avatar_url TEXT,
        verified_project_id TEXT,
        tweet_url TEXT NOT NULL,
        tweet_content TEXT,
        sentiment TEXT NOT NULL CHECK (sentiment IN ('bullish', 'bearish')),
        noted_at DATE NOT NULL,
        tweet_timestamp TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes for signals table
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_signals_twitter_username ON signals (twitter_username)`);
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_signals_noted_at ON signals (noted_at)`);
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_signals_created_at ON signals (created_at)`);

    // Create verified_projects table
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS verified_projects (
        id TEXT PRIMARY KEY,
        ethos_user_id INTEGER NOT NULL UNIQUE,
        twitter_username TEXT NOT NULL,
        display_name TEXT NOT NULL,
        avatar_url TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('token', 'nft', 'pre_tge')),
        chain TEXT DEFAULT 'ethereum' CHECK (chain IN ('ethereum', 'base', 'solana', 'bsc', 'plasma', 'hyperliquid')),
        link TEXT,
        coingecko_id TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // Create indexes for verified_projects table
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_verified_projects_twitter_username ON verified_projects (twitter_username)`);
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_verified_projects_type ON verified_projects (type)`);
    await client.queryObject(`CREATE INDEX IF NOT EXISTS idx_verified_projects_created_at ON verified_projects (created_at)`);

    // Create price_cache table for caching API responses
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS price_cache (
        cache_key TEXT PRIMARY KEY,
        price DECIMAL(20, 10) NOT NULL,
        cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour'
      )
    `);

    // Create index for expired cache cleanup
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_price_cache_expires_at ON price_cache (expires_at)
    `);

    console.log("Database tables initialized successfully");
  } catch (error) {
    console.error("Failed to initialize database:", error);
    throw error;
  }
}
