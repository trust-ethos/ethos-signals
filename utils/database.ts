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
  authToken?: string; // Auth token of the user who created this signal
  onchainTxHash?: string; // Base blockchain transaction hash
  onchainSignalId?: number; // ID in SignalsAttestation contract
  savedBy?: {
    walletAddress: string;
    ethosUsername?: string;
    ethosProfileId?: number;
  };
}

export type VerifiedProjectType = "token" | "nft" | "pre_tge";

export interface VerifiedProject {
  id: string;
  ethosUserId: number;
  twitterUsername: string;
  displayName: string;
  avatarUrl: string;
  type: VerifiedProjectType;
  chain?: "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid";
  link?: string;
  coinGeckoId?: string; // For Layer 1 tokens without contracts
  ticker?: string; // Token ticker symbol (e.g., MKR, ETH, XPL)
  hasPriceTracking?: boolean; // Whether to show price performance (default: true)
  createdAt: number;
  isVerified?: boolean; // Whether admin has verified this project (default: true for admin-created)
  suggestedByAuthToken?: string; // Auth token of user who suggested this
  suggestedAt?: number; // Timestamp when suggested (epoch ms)
  verifiedAt?: number; // Timestamp when verified (epoch ms)
  verifiedBy?: string; // Admin identifier who verified it
  suggestedBy?: {
    walletAddress: string;
    ethosUsername?: string;
    ethosProfileId?: number;
  };
}

// Signals functions
export async function saveTestSignal(signal: TestSignal): Promise<boolean> {
  const client = await getDbClient();
  
  try {
    await client.queryObject(`
      INSERT INTO signals (
        id, twitter_username, project_handle, project_user_id, 
        project_display_name, project_avatar_url, verified_project_id,
        tweet_url, tweet_content, sentiment, noted_at, tweet_timestamp, created_at,
        auth_token, onchain_tx_hash, onchain_signal_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, to_timestamp($13), $14, $15, $16
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
        tweet_timestamp = EXCLUDED.tweet_timestamp,
        auth_token = COALESCE(EXCLUDED.auth_token, signals.auth_token),
        onchain_tx_hash = COALESCE(EXCLUDED.onchain_tx_hash, signals.onchain_tx_hash),
        onchain_signal_id = COALESCE(EXCLUDED.onchain_signal_id, signals.onchain_signal_id)
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
      signal.authToken || null,
      signal.onchainTxHash || null,
      signal.onchainSignalId || null,
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
      auth_token: string | null;
      onchain_tx_hash: string | null;
      onchain_signal_id: number | null;
      saved_by_wallet: string | null;
      saved_by_ethos_username: string | null;
      saved_by_ethos_profile_id: number | null;
    }>(`
      SELECT 
        s.*,
        eat.wallet_address as saved_by_wallet,
        eat.ethos_username as saved_by_ethos_username,
        eat.ethos_profile_id as saved_by_ethos_profile_id
      FROM signals s
      LEFT JOIN extension_auth_tokens eat ON s.auth_token = eat.auth_token
      WHERE s.twitter_username = $1 
      ORDER BY s.created_at DESC
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
      authToken: row.auth_token || undefined,
      onchainTxHash: row.onchain_tx_hash || undefined,
      onchainSignalId: row.onchain_signal_id || undefined,
      savedBy: row.saved_by_wallet ? {
        walletAddress: row.saved_by_wallet,
        ethosUsername: row.saved_by_ethos_username || undefined,
        ethosProfileId: row.saved_by_ethos_profile_id || undefined,
      } : undefined,
    }));
  } catch (error) {
    console.error("Failed to list signals:", error);
    return [];
  }
}

export async function countAllRecentSignals(): Promise<number> {
  try {
    const client = await getDbClient();
    const result = await client.queryObject<{ count: string }>(`
      SELECT COUNT(*) as count FROM signals
    `);
    
    return parseInt(result.rows[0]?.count || "0");
  } catch (error) {
    console.error("Failed to count signals:", error);
    return 0;
  }
}

export async function listAllRecentSignals(limit = 15, offset = 0): Promise<TestSignal[]> {
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
      auth_token: string | null;
      onchain_tx_hash: string | null;
      onchain_signal_id: number | null;
      saved_by_wallet: string | null;
      saved_by_ethos_username: string | null;
      saved_by_ethos_profile_id: number | null;
    }>(`
      SELECT 
        s.*,
        eat.wallet_address as saved_by_wallet,
        eat.ethos_username as saved_by_ethos_username,
        eat.ethos_profile_id as saved_by_ethos_profile_id
      FROM signals s
      LEFT JOIN extension_auth_tokens eat ON s.auth_token = eat.auth_token
      ORDER BY s.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
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
      authToken: row.auth_token || undefined,
      onchainTxHash: row.onchain_tx_hash || undefined,
      onchainSignalId: row.onchain_signal_id || undefined,
      savedBy: row.saved_by_wallet ? {
        walletAddress: row.saved_by_wallet,
        ethosUsername: row.saved_by_ethos_username || undefined,
        ethosProfileId: row.saved_by_ethos_profile_id || undefined,
      } : undefined,
    }));
  } catch (error) {
    console.error("Failed to list all recent signals:", error);
    return [];
  }
}

export async function getSignalsByContributor(ethosUsername: string): Promise<TestSignal[]> {
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
      auth_token: string | null;
      onchain_tx_hash: string | null;
      onchain_signal_id: number | null;
    }>(`
      SELECT s.* 
      FROM signals s
      LEFT JOIN extension_auth_tokens eat ON s.auth_token = eat.auth_token
      WHERE eat.ethos_username = $1
      ORDER BY s.created_at DESC
    `, [ethosUsername]);
    
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
      notedAt: row.noted_at.toISOString().slice(0, 10),
      tweetTimestamp: row.tweet_timestamp?.toISOString(),
      createdAt: row.created_at.getTime(),
      authToken: row.auth_token || undefined,
      onchainTxHash: row.onchain_tx_hash || undefined,
      onchainSignalId: row.onchain_signal_id || undefined,
    }));
  } catch (error) {
    console.error("Failed to get signals by contributor:", error);
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

export async function getSignalsByProject(projectHandle: string): Promise<TestSignal[]> {
  const client = await getDbClient();
  
  try {
    const result = await client.queryObject<{
      id: string;
      twitter_username: string;
      sentiment: "bullish" | "bearish";
      tweet_url: string;
      tweet_content: string;
      project_handle: string;
      noted_at: Date;
      tweet_timestamp: Date | null;
      project_user_id: number | null;
      project_display_name: string | null;
      project_avatar_url: string | null;
      created_at: Date;
      auth_token: string | null;
      onchain_tx_hash: string | null;
      onchain_signal_id: number | null;
      saved_by_wallet: string | null;
      saved_by_ethos_username: string | null;
      saved_by_ethos_profile_id: number | null;
    }>(`
      SELECT 
        s.*,
        eat.wallet_address as saved_by_wallet,
        eat.ethos_username as saved_by_ethos_username,
        eat.ethos_profile_id as saved_by_ethos_profile_id
      FROM signals s
      LEFT JOIN extension_auth_tokens eat ON s.auth_token = eat.auth_token
      WHERE LOWER(s.project_handle) = LOWER($1)
      ORDER BY COALESCE(s.tweet_timestamp, s.noted_at::timestamp) DESC
    `, [projectHandle]);
    
    return result.rows.map(row => ({
      id: row.id,
      twitterUsername: row.twitter_username,
      sentiment: row.sentiment,
      tweetUrl: row.tweet_url,
      tweetContent: row.tweet_content || undefined,
      projectHandle: row.project_handle,
      notedAt: row.noted_at.toISOString().slice(0, 10),
      tweetTimestamp: row.tweet_timestamp?.toISOString(),
      projectUserId: row.project_user_id || undefined,
      projectDisplayName: row.project_display_name || undefined,
      projectAvatarUrl: row.project_avatar_url || undefined,
      createdAt: row.created_at.getTime(),
      authToken: row.auth_token || undefined,
      onchainTxHash: row.onchain_tx_hash || undefined,
      onchainSignalId: row.onchain_signal_id || undefined,
      savedBy: row.saved_by_wallet ? {
        walletAddress: row.saved_by_wallet,
        ethosUsername: row.saved_by_ethos_username || undefined,
        ethosProfileId: row.saved_by_ethos_profile_id || undefined,
      } : undefined,
    }));
  } catch (error) {
    console.error("Failed to get signals by project:", error);
    return [];
  }
}

// Verified projects functions
export async function saveVerifiedProject(project: VerifiedProject): Promise<boolean> {
  const client = await getDbClient();
  
  try {
    await client.queryObject(`
      INSERT INTO verified_projects (
        id, ethos_user_id, twitter_username, display_name, 
        avatar_url, type, chain, link, coingecko_id, ticker, has_price_tracking, 
        is_verified, suggested_by_auth_token, suggested_at, verified_at, verified_by, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 
        (CASE WHEN $14::float IS NOT NULL THEN to_timestamp($14::float) ELSE NULL END)::timestamptz,
        (CASE WHEN $15::float IS NOT NULL THEN to_timestamp($15::float) ELSE NULL END)::timestamptz,
        $16, to_timestamp($17)
      )
      ON CONFLICT (ethos_user_id) DO UPDATE SET
        twitter_username = EXCLUDED.twitter_username,
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        type = EXCLUDED.type,
        chain = EXCLUDED.chain,
        link = EXCLUDED.link,
        coingecko_id = EXCLUDED.coingecko_id,
        ticker = EXCLUDED.ticker,
        has_price_tracking = EXCLUDED.has_price_tracking,
        is_verified = EXCLUDED.is_verified,
        suggested_by_auth_token = EXCLUDED.suggested_by_auth_token,
        suggested_at = EXCLUDED.suggested_at,
        verified_at = EXCLUDED.verified_at,
        verified_by = EXCLUDED.verified_by
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
      project.hasPriceTracking !== false, // Default to true
      project.isVerified !== false, // Default to true
      project.suggestedByAuthToken || null,
      project.suggestedAt ? project.suggestedAt / 1000 : null,
      project.verifiedAt ? project.verifiedAt / 1000 : null,
      project.verifiedBy || null,
      project.createdAt / 1000, // Convert to seconds
    ]);
    
    return true;
  } catch (error) {
    console.error("Failed to save verified project:", error);
    return false;
  }
}

export async function listVerifiedProjects(verificationStatus: "all" | "verified" | "unverified" = "verified"): Promise<VerifiedProject[]> {
  try {
    const client = await getDbClient();
    
    let whereClause = "";
    if (verificationStatus === "verified") {
      whereClause = "WHERE vp.is_verified = TRUE";
    } else if (verificationStatus === "unverified") {
      whereClause = "WHERE vp.is_verified = FALSE";
    }
    
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
      ticker: string | null;
      has_price_tracking: boolean;
      is_verified: boolean;
      suggested_by_auth_token: string | null;
      suggested_at: Date | null;
      verified_at: Date | null;
      verified_by: string | null;
      created_at: Date;
      suggester_wallet: string | null;
      suggester_username: string | null;
      suggester_profile_id: number | null;
    }>(`
      SELECT 
        vp.id, vp.ethos_user_id, vp.twitter_username, vp.display_name, 
        vp.avatar_url, vp.type, vp.chain, vp.link, vp.coingecko_id, vp.ticker, 
        vp.has_price_tracking, vp.is_verified, vp.suggested_by_auth_token, 
        vp.suggested_at, vp.verified_at, vp.verified_by, vp.created_at,
        eat.wallet_address as suggester_wallet,
        eat.ethos_username as suggester_username,
        eat.ethos_profile_id as suggester_profile_id
      FROM verified_projects vp
      LEFT JOIN extension_auth_tokens eat ON vp.suggested_by_auth_token = eat.auth_token
      ${whereClause}
      ORDER BY vp.created_at DESC
    `);
    
    return result.rows.map(row => ({
      id: row.id,
      ethosUserId: row.ethos_user_id,
      twitterUsername: row.twitter_username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      type: row.type,
      chain: row.chain as "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid",
      link: row.link || undefined,
      coinGeckoId: row.coingecko_id || undefined,
      ticker: row.ticker || undefined,
      hasPriceTracking: row.has_price_tracking,
      isVerified: row.is_verified,
      suggestedByAuthToken: row.suggested_by_auth_token || undefined,
      suggestedAt: row.suggested_at?.getTime(),
      verifiedAt: row.verified_at?.getTime(),
      verifiedBy: row.verified_by || undefined,
      createdAt: row.created_at.getTime(), // Convert to epoch ms
      suggestedBy: row.suggester_wallet ? {
        walletAddress: row.suggester_wallet,
        ethosUsername: row.suggester_username || undefined,
        ethosProfileId: row.suggester_profile_id || undefined,
      } : undefined,
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
      coingecko_id: string | null;
      ticker: string | null;
      has_price_tracking: boolean;
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
      coinGeckoId: row.coingecko_id || undefined,
      ticker: row.ticker || undefined,
      hasPriceTracking: row.has_price_tracking,
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

// Update verified project (for admin approval/edits)
export async function updateVerifiedProject(id: string, updates: Partial<VerifiedProject>): Promise<boolean> {
  const client = await getDbClient();
  
  try {
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;
    
    if (updates.twitterUsername !== undefined) {
      setClauses.push(`twitter_username = $${paramIndex++}`);
      values.push(updates.twitterUsername);
    }
    if (updates.displayName !== undefined) {
      setClauses.push(`display_name = $${paramIndex++}`);
      values.push(updates.displayName);
    }
    if (updates.avatarUrl !== undefined) {
      setClauses.push(`avatar_url = $${paramIndex++}`);
      values.push(updates.avatarUrl);
    }
    if (updates.type !== undefined) {
      setClauses.push(`type = $${paramIndex++}`);
      values.push(updates.type);
    }
    if (updates.chain !== undefined) {
      setClauses.push(`chain = $${paramIndex++}`);
      values.push(updates.chain);
    }
    if (updates.link !== undefined) {
      setClauses.push(`link = $${paramIndex++}`);
      values.push(updates.link || null);
    }
    if (updates.coinGeckoId !== undefined) {
      setClauses.push(`coingecko_id = $${paramIndex++}`);
      values.push(updates.coinGeckoId || null);
    }
    if (updates.ticker !== undefined) {
      setClauses.push(`ticker = $${paramIndex++}`);
      values.push(updates.ticker || null);
    }
    if (updates.hasPriceTracking !== undefined) {
      setClauses.push(`has_price_tracking = $${paramIndex++}`);
      values.push(updates.hasPriceTracking);
    }
    if (updates.isVerified !== undefined) {
      setClauses.push(`is_verified = $${paramIndex++}`);
      values.push(updates.isVerified);
    }
    if (updates.verifiedAt !== undefined) {
      setClauses.push(`verified_at = $${paramIndex++}`);
      values.push(updates.verifiedAt ? new Date(updates.verifiedAt) : null);
    }
    if (updates.verifiedBy !== undefined) {
      setClauses.push(`verified_by = $${paramIndex++}`);
      values.push(updates.verifiedBy || null);
    }
    
    if (setClauses.length === 0) {
      return true; // No updates to make
    }
    
    values.push(id);
    const result = await client.queryObject(`
      UPDATE verified_projects 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
    `, values);
    
    return result.rowCount !== undefined && result.rowCount > 0;
  } catch (error) {
    console.error("Failed to update verified project:", error);
    return false;
  }
}

// Get verified project by ID
export async function getVerifiedProjectById(id: string): Promise<VerifiedProject | null> {
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
      coingecko_id: string | null;
      ticker: string | null;
      has_price_tracking: boolean;
      is_verified: boolean;
      suggested_by_auth_token: string | null;
      suggested_at: Date | null;
      verified_at: Date | null;
      verified_by: string | null;
      created_at: Date;
      suggester_wallet: string | null;
      suggester_username: string | null;
      suggester_profile_id: number | null;
    }>(`
      SELECT 
        vp.*,
        eat.wallet_address as suggester_wallet,
        eat.ethos_username as suggester_username,
        eat.ethos_profile_id as suggester_profile_id
      FROM verified_projects vp
      LEFT JOIN extension_auth_tokens eat ON vp.suggested_by_auth_token = eat.auth_token
      WHERE vp.id = $1
      LIMIT 1
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const row = result.rows[0];
    return {
      id: row.id,
      ethosUserId: row.ethos_user_id,
      twitterUsername: row.twitter_username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      type: row.type,
      chain: row.chain as "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid",
      link: row.link || undefined,
      coinGeckoId: row.coingecko_id || undefined,
      ticker: row.ticker || undefined,
      hasPriceTracking: row.has_price_tracking,
      isVerified: row.is_verified,
      suggestedByAuthToken: row.suggested_by_auth_token || undefined,
      suggestedAt: row.suggested_at?.getTime(),
      verifiedAt: row.verified_at?.getTime(),
      verifiedBy: row.verified_by || undefined,
      createdAt: row.created_at.getTime(),
      suggestedBy: row.suggester_wallet ? {
        walletAddress: row.suggester_wallet,
        ethosUsername: row.suggester_username || undefined,
        ethosProfileId: row.suggester_profile_id || undefined,
      } : undefined,
    };
  } catch (error) {
    console.error("Failed to get verified project by ID:", error);
    return null;
  }
}

// Contributor statistics
export interface ContributorStats {
  twitterUsername: string;
  signalCount: number;
}

export async function getContributorStatsLast7Days(): Promise<ContributorStats[]> {
  const client = await getDbClient();
  
  try {
    const result = await client.queryObject<{
      twitter_username: string;
      signal_count: string;
    }>(`
      SELECT 
        twitter_username,
        COUNT(*) as signal_count
      FROM signals
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY twitter_username
      ORDER BY signal_count DESC, twitter_username ASC
    `);
    
    return result.rows.map(row => ({
      twitterUsername: row.twitter_username,
      signalCount: parseInt(row.signal_count),
    }));
  } catch (error) {
    console.error("Failed to get contributor stats:", error);
    return [];
  }
}
