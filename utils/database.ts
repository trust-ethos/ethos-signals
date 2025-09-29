import { getDbClient } from "./db.ts";
import { ulid } from "https://deno.land/x/ulid@v0.3.0/mod.ts";

export function createUlid(): string {
  return ulid();
}

export type SignalSentiment = "bullish" | "bearish";

export interface TestSignal {
  id: string;
  twitterUsername: string;
  projectHandle: string;
  projectUserId?: number;
  projectDisplayName?: string;
  projectAvatarUrl?: string;
  verifiedProjectId?: string;
  tweetUrl: string;
  tweetContent?: string;
  sentiment: SignalSentiment;
  notedAt: string; // yyyy-mm-dd
  tweetTimestamp?: string; // ISO datetime
  createdAt: number; // epoch ms
}

export type VerifiedProjectType = "token" | "nft" | "pre_tge";

export interface VerifiedProject {
  id: string;
  ethosUserId: number;
  twitterUsername: string;
  displayName: string;
  avatarUrl: string;
  type: VerifiedProjectType;
  chain?: "ethereum" | "base" | "solana" | "bsc" | "plasma";
  link?: string;
  coinGeckoId?: string; // For Layer 1 tokens without contracts
  ticker?: string; // Token ticker symbol (e.g., MKR, ETH, XPL)
  createdAt: number;
}

// Signals functions
export async function saveTestSignal(signal: TestSignal): Promise<boolean> {
  const client = await getDbClient();
  
  try {
    await client.queryObject(`
      INSERT INTO signals (
        id, twitter_username, project_handle, project_user_id, 
        project_display_name, project_avatar_url, verified_project_id,
        tweet_url, tweet_content, sentiment, noted_at, tweet_timestamp, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, to_timestamp($13)
      )
      ON CONFLICT (id) DO UPDATE SET
        twitter_username = EXCLUDED.twitter_username,
        project_handle = EXCLUDED.project_handle,
        project_user_id = EXCLUDED.project_user_id,
        project_display_name = EXCLUDED.project_display_name,
        project_avatar_url = EXCLUDED.project_avatar_url,
        verified_project_id = EXCLUDED.verified_project_id,
        tweet_url = EXCLUDED.tweet_url,
        tweet_content = EXCLUDED.tweet_content,
        sentiment = EXCLUDED.sentiment,
        noted_at = EXCLUDED.noted_at,
        tweet_timestamp = EXCLUDED.tweet_timestamp
    `, [
      signal.id,
      signal.twitterUsername,
      signal.projectHandle,
      signal.projectUserId || null,
      signal.projectDisplayName || null,
      signal.projectAvatarUrl || null,
      signal.verifiedProjectId || null,
      signal.tweetUrl,
      signal.tweetContent || null,
      signal.sentiment,
      signal.notedAt,
      signal.tweetTimestamp || null,
      signal.createdAt / 1000, // Convert to seconds for PostgreSQL
    ]);
    
    return true;
  } catch (error) {
    console.error("Failed to save signal:", error);
    return false;
  }
}

export async function listTestSignals(username: string): Promise<TestSignal[]> {
  try {
    const client = await getDbClient();
    const result = await client.queryObject<{
      id: string;
      twitter_username: string;
      project_handle: string;
      project_user_id: number | null;
      project_display_name: string | null;
      project_avatar_url: string | null;
      verified_project_id: string | null;
      tweet_url: string;
      tweet_content: string | null;
      sentiment: SignalSentiment;
      noted_at: Date;
      tweet_timestamp: Date | null;
      created_at: Date;
    }>(`
      SELECT * FROM signals 
      WHERE twitter_username = $1 
      ORDER BY created_at DESC
    `, [username]);
    
    return result.rows.map(row => ({
      id: row.id,
      twitterUsername: row.twitter_username,
      projectHandle: row.project_handle,
      projectUserId: row.project_user_id || undefined,
      projectDisplayName: row.project_display_name || undefined,
      projectAvatarUrl: row.project_avatar_url || undefined,
      verifiedProjectId: row.verified_project_id || undefined,
      tweetUrl: row.tweet_url,
      tweetContent: row.tweet_content || undefined,
      sentiment: row.sentiment,
      notedAt: row.noted_at.toISOString().slice(0, 10), // Convert to yyyy-mm-dd
      tweetTimestamp: row.tweet_timestamp?.toISOString(),
      createdAt: row.created_at.getTime(), // Convert to epoch ms
    }));
  } catch (error) {
    console.error("Failed to list signals:", error);
    return [];
  }
}

export async function listAllRecentSignals(limit = 15): Promise<TestSignal[]> {
  try {
    const client = await getDbClient();
    const result = await client.queryObject<{
      id: string;
      twitter_username: string;
      project_handle: string;
      project_user_id: number | null;
      project_display_name: string | null;
      project_avatar_url: string | null;
      verified_project_id: string | null;
      tweet_url: string;
      tweet_content: string | null;
      sentiment: SignalSentiment;
      noted_at: Date;
      tweet_timestamp: Date | null;
      created_at: Date;
    }>(`
      SELECT * FROM signals 
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      twitterUsername: row.twitter_username,
      projectHandle: row.project_handle,
      projectUserId: row.project_user_id || undefined,
      projectDisplayName: row.project_display_name || undefined,
      projectAvatarUrl: row.project_avatar_url || undefined,
      verifiedProjectId: row.verified_project_id || undefined,
      tweetUrl: row.tweet_url,
      tweetContent: row.tweet_content || undefined,
      sentiment: row.sentiment,
      notedAt: row.noted_at.toISOString().slice(0, 10), // Convert to yyyy-mm-dd
      tweetTimestamp: row.tweet_timestamp?.toISOString(),
      createdAt: row.created_at.getTime(), // Convert to epoch ms
    }));
  } catch (error) {
    console.error("Failed to list all recent signals:", error);
    return [];
  }
}

export async function deleteTestSignal(username: string, id: string): Promise<boolean> {
  const client = await getDbClient();
  
  try {
    const result = await client.queryObject(`
      DELETE FROM signals 
      WHERE id = $1 AND twitter_username = $2
    `, [id, username]);
    
    return result.rowCount !== undefined && result.rowCount > 0;
  } catch (error) {
    console.error("Failed to delete signal:", error);
    return false;
  }
}

// Verified projects functions
export async function saveVerifiedProject(project: VerifiedProject): Promise<boolean> {
  const client = await getDbClient();
  
  try {
    await client.queryObject(`
      INSERT INTO verified_projects (
        id, ethos_user_id, twitter_username, display_name, 
        avatar_url, type, chain, link, coingecko_id, ticker, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, to_timestamp($11)
      )
      ON CONFLICT (ethos_user_id) DO UPDATE SET
        twitter_username = EXCLUDED.twitter_username,
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        type = EXCLUDED.type,
        chain = EXCLUDED.chain,
        link = EXCLUDED.link,
        coingecko_id = EXCLUDED.coingecko_id,
        ticker = EXCLUDED.ticker
    `, [
      project.id,
      project.ethosUserId,
      project.twitterUsername,
      project.displayName,
      project.avatarUrl,
      project.type,
      project.chain || "ethereum",
      project.link || null,
      project.coinGeckoId || null,
      project.ticker || null,
      project.createdAt / 1000, // Convert to seconds
    ]);
    
    return true;
  } catch (error) {
    console.error("Failed to save verified project:", error);
    return false;
  }
}

export async function listVerifiedProjects(): Promise<VerifiedProject[]> {
  try {
    const client = await getDbClient();
    
    const result = await client.queryObject<{
      id: string;
      ethos_user_id: number;
      twitter_username: string;
      display_name: string;
      avatar_url: string;
      type: VerifiedProjectType;
      chain: string;
      link: string | null;
      coingecko_id: string | null;
      created_at: Date;
    }>(`
      SELECT 
        id, ethos_user_id, twitter_username, display_name, 
        avatar_url, type, chain, link, coingecko_id, created_at
      FROM verified_projects 
      ORDER BY created_at DESC
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      ethosUserId: row.ethos_user_id,
      twitterUsername: row.twitter_username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      type: row.type,
      chain: row.chain as "ethereum" | "base" | "solana",
      link: row.link || undefined,
      coinGeckoId: row.coingecko_id || undefined,
      createdAt: row.created_at.getTime(), // Convert to epoch ms
    }));
  } catch (error) {
    console.error("Failed to list verified projects:", error);
    return [];
  }
}

export async function deleteVerifiedProject(id: string): Promise<boolean> {
  const client = await getDbClient();
  
  try {
    const result = await client.queryObject(`
      DELETE FROM verified_projects WHERE id = $1
    `, [id]);
    
    return result.rowCount !== undefined && result.rowCount > 0;
  } catch (error) {
    console.error("Failed to delete verified project:", error);
    return false;
  }
}

export async function getVerifiedByUsername(username: string): Promise<VerifiedProject | null> {
  const client = await getDbClient();
  
  try {
    const result = await client.queryObject<{
      id: string;
      ethos_user_id: number;
      twitter_username: string;
      display_name: string;
      avatar_url: string;
      type: VerifiedProjectType;
      chain: string;
      link: string | null;
      created_at: Date;
    }>(`
      SELECT * FROM verified_projects 
      WHERE LOWER(twitter_username) = LOWER($1) 
      LIMIT 1
    `, [username]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      ethosUserId: row.ethos_user_id,
      twitterUsername: row.twitter_username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      type: row.type,
      chain: row.chain as "ethereum" | "base" | "solana",
      link: row.link || undefined,
      createdAt: row.created_at.getTime(),
    };
  } catch (error) {
    console.error("Failed to get verified project by username:", error);
    return null;
  }
}

// Price cache functions
export async function getCachedPrice(cacheKey: string): Promise<number | null> {
  const client = await getDbClient();
  
  try {
    const result = await client.queryObject<{
      price: string;
      expires_at: Date;
    }>(`
      SELECT price, expires_at FROM price_cache 
      WHERE cache_key = $1 AND expires_at > NOW()
    `, [cacheKey]);
    
    if (result.rows.length === 0) return null;
    
    return parseFloat(result.rows[0].price);
  } catch (error) {
    console.error("Failed to get cached price:", error);
    return null;
  }
}

export async function setCachedPrice(cacheKey: string, price: number, expirationHours = 1): Promise<boolean> {
  const client = await getDbClient();
  
  try {
    await client.queryObject(`
      INSERT INTO price_cache (cache_key, price, expires_at) 
      VALUES ($1, $2, NOW() + INTERVAL '${expirationHours} hours')
      ON CONFLICT (cache_key) DO UPDATE SET
        price = EXCLUDED.price,
        cached_at = NOW(),
        expires_at = NOW() + INTERVAL '${expirationHours} hours'
    `, [cacheKey, price]);
    
    return true;
  } catch (error) {
    console.error("Failed to cache price:", error);
    return false;
  }
}

// Cleanup expired cache entries (can be called periodically)
export async function cleanupExpiredCache(): Promise<void> {
  const client = await getDbClient();
  
  try {
    await client.queryObject(`
      DELETE FROM price_cache WHERE expires_at < NOW()
    `);
  } catch (error) {
    console.error("Failed to cleanup expired cache:", error);
  }
}
