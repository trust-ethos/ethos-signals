import { getDbClient } from "./db.ts";
import { ulid } from "https://deno.land/x/ulid@v0.3.0/mod.ts";

export interface ExtensionAuthToken {
  id: string;
  walletAddress: string;
  ethosProfileId?: number;
  ethosUsername?: string;
  authToken: string;
  deviceIdentifier?: string;
  createdAt: number;
  lastUsedAt: number;
  expiresAt: number;
  isActive: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

// Rate limit configuration
const RATE_LIMITS = {
  'signals:create': { requests: 50, windowMs: 3600000 }, // 50 signals per hour
  'signals:list': { requests: 100, windowMs: 3600000 }, // 100 list requests per hour
  'default': { requests: 200, windowMs: 3600000 }, // 200 requests per hour default
};

/**
 * Verify a wallet signature to authenticate the user
 * Message format: "Sign this message to authenticate your wallet with Signals Extension.\n\nWallet: {address}\nTimestamp: {timestamp}"
 */
export async function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  timestamp: number
): Promise<boolean> {
  try {
    // Verify timestamp is recent (within 5 minutes)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (Math.abs(now - timestamp) > fiveMinutes) {
      console.error('Signature timestamp expired');
      return false;
    }

    // Create the expected message
    const message = `Sign this message to authenticate your wallet with Signals Extension.\n\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`;
    
    // Verify signature using web3 utilities
    // Note: In production, you may want to use a more robust library like ethers.js
    const messageHash = new TextEncoder().encode(message);
    
    // For Ethereum signatures, we need to verify using the eth_personal_sign format
    // This is a simplified check - in production use proper signature verification
    const isValid = await verifyEthereumSignature(message, signature, walletAddress);
    
    return isValid;
  } catch (error) {
    console.error('Error verifying wallet signature:', error);
    return false;
  }
}

/**
 * Verify Ethereum signature (simplified version)
 * In production, use ethers.js or web3.js for proper verification
 */
async function verifyEthereumSignature(
  message: string,
  signature: string,
  expectedAddress: string
): Promise<boolean> {
  try {
    // Import ethers dynamically (you'll need to add this dependency)
    const { ethers } = await import("npm:ethers@6.11.1");
    
    // Verify the signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    // Compare addresses (case-insensitive)
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Error in Ethereum signature verification:', error);
    return false;
  }
}

/**
 * Create a new authentication token for a verified wallet
 */
export async function createAuthToken(
  walletAddress: string,
  ethosProfileId?: number,
  ethosUsername?: string,
  deviceIdentifier?: string
): Promise<string> {
  const client = await getDbClient();
  const id = ulid();
  const authToken = generateSecureToken();
  const expiresAt = Date.now() + (90 * 24 * 60 * 60 * 1000); // 90 days
  
  try {
    await client.queryObject(`
      INSERT INTO extension_auth_tokens (
        id, wallet_address, ethos_profile_id, ethos_username, 
        auth_token, device_identifier, created_at, last_used_at, expires_at, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW(), NOW(), to_timestamp($7), $8
      )
    `, [
      id,
      walletAddress.toLowerCase(),
      ethosProfileId || null,
      ethosUsername || null,
      authToken,
      deviceIdentifier || null,
      expiresAt / 1000,
      true
    ]);
    
    return authToken;
  } catch (error) {
    console.error('Failed to create auth token:', error);
    throw error;
  }
}

/**
 * Validate an authentication token
 */
export async function validateAuthToken(authToken: string): Promise<ExtensionAuthToken | null> {
  const client = await getDbClient();
  
  try {
    const result = await client.queryObject<{
      id: string;
      wallet_address: string;
      ethos_profile_id: number | null;
      ethos_username: string | null;
      auth_token: string;
      device_identifier: string | null;
      created_at: Date;
      last_used_at: Date;
      expires_at: Date;
      is_active: boolean;
    }>(`
      SELECT * FROM extension_auth_tokens 
      WHERE auth_token = $1 
        AND is_active = TRUE 
        AND expires_at > NOW()
      LIMIT 1
    `, [authToken]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    // Update last_used_at
    await client.queryObject(`
      UPDATE extension_auth_tokens 
      SET last_used_at = NOW() 
      WHERE auth_token = $1
    `, [authToken]);
    
    return {
      id: row.id,
      walletAddress: row.wallet_address,
      ethosProfileId: row.ethos_profile_id || undefined,
      ethosUsername: row.ethos_username || undefined,
      authToken: row.auth_token,
      deviceIdentifier: row.device_identifier || undefined,
      createdAt: row.created_at.getTime(),
      lastUsedAt: row.last_used_at.getTime(),
      expiresAt: row.expires_at.getTime(),
      isActive: row.is_active,
    };
  } catch (error) {
    console.error('Failed to validate auth token:', error);
    return null;
  }
}

/**
 * Check rate limit for a given auth token and endpoint
 */
export async function checkRateLimit(
  authToken: string,
  endpoint: string
): Promise<RateLimitResult> {
  const client = await getDbClient();
  const config = RATE_LIMITS[endpoint as keyof typeof RATE_LIMITS] || RATE_LIMITS.default;
  const windowStart = Date.now() - config.windowMs;
  
  try {
    // Get or create rate limit record for this window
    const result = await client.queryObject<{
      request_count: number;
      window_start: Date;
    }>(`
      SELECT request_count, window_start 
      FROM rate_limit_tracking 
      WHERE auth_token = $1 
        AND endpoint = $2 
        AND window_start > to_timestamp($3)
      ORDER BY window_start DESC
      LIMIT 1
    `, [authToken, endpoint, windowStart / 1000]);
    
    let requestCount = 0;
    let currentWindowStart = Date.now();
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      requestCount = row.request_count;
      currentWindowStart = row.window_start.getTime();
    }
    
    // Check if limit exceeded
    if (requestCount >= config.requests) {
      const resetAt = currentWindowStart + config.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
        limit: config.requests,
      };
    }
    
    // Increment counter
    if (result.rows.length > 0) {
      await client.queryObject(`
        UPDATE rate_limit_tracking 
        SET request_count = request_count + 1, last_request_at = NOW()
        WHERE auth_token = $1 AND endpoint = $2 AND window_start = to_timestamp($3)
      `, [authToken, endpoint, currentWindowStart / 1000]);
    } else {
      const id = ulid();
      await client.queryObject(`
        INSERT INTO rate_limit_tracking (id, auth_token, endpoint, request_count, window_start, last_request_at)
        VALUES ($1, $2, $3, 1, NOW(), NOW())
      `, [id, authToken, endpoint]);
    }
    
    return {
      allowed: true,
      remaining: config.requests - requestCount - 1,
      resetAt: currentWindowStart + config.windowMs,
      limit: config.requests,
    };
  } catch (error) {
    console.error('Failed to check rate limit:', error);
    // On error, allow the request but log it
    return {
      allowed: true,
      remaining: config.requests,
      resetAt: Date.now() + config.windowMs,
      limit: config.requests,
    };
  }
}

/**
 * Revoke an authentication token
 */
export async function revokeAuthToken(authToken: string): Promise<boolean> {
  const client = await getDbClient();
  
  try {
    const result = await client.queryObject(`
      UPDATE extension_auth_tokens 
      SET is_active = FALSE 
      WHERE auth_token = $1
    `, [authToken]);
    
    return result.rowCount !== undefined && result.rowCount > 0;
  } catch (error) {
    console.error('Failed to revoke auth token:', error);
    return false;
  }
}

/**
 * Clean up expired tokens and old rate limit records
 */
export async function cleanupExpiredAuth(): Promise<void> {
  const client = await getDbClient();
  
  try {
    // Deactivate expired tokens
    await client.queryObject(`
      UPDATE extension_auth_tokens 
      SET is_active = FALSE 
      WHERE expires_at < NOW() AND is_active = TRUE
    `);
    
    // Delete old rate limit records (older than 24 hours)
    await client.queryObject(`
      DELETE FROM rate_limit_tracking 
      WHERE window_start < NOW() - INTERVAL '24 hours'
    `);
  } catch (error) {
    console.error('Failed to cleanup expired auth:', error);
  }
}

/**
 * Get auth token info (for debugging/admin purposes)
 */
export async function getAuthTokenInfo(walletAddress: string): Promise<ExtensionAuthToken[]> {
  const client = await getDbClient();
  
  try {
    const result = await client.queryObject<{
      id: string;
      wallet_address: string;
      ethos_profile_id: number | null;
      ethos_username: string | null;
      auth_token: string;
      device_identifier: string | null;
      created_at: Date;
      last_used_at: Date;
      expires_at: Date;
      is_active: boolean;
    }>(`
      SELECT * FROM extension_auth_tokens 
      WHERE wallet_address = $1 
      ORDER BY created_at DESC
    `, [walletAddress.toLowerCase()]);
    
    return result.rows.map(row => ({
      id: row.id,
      walletAddress: row.wallet_address,
      ethosProfileId: row.ethos_profile_id || undefined,
      ethosUsername: row.ethos_username || undefined,
      authToken: row.auth_token,
      deviceIdentifier: row.device_identifier || undefined,
      createdAt: row.created_at.getTime(),
      lastUsedAt: row.last_used_at.getTime(),
      expiresAt: row.expires_at.getTime(),
      isActive: row.is_active,
    }));
  } catch (error) {
    console.error('Failed to get auth token info:', error);
    return [];
  }
}

/**
 * Generate a secure random token
 */
function generateSecureToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

