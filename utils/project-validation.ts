// Project validation utilities for suggestions and admin approval

import { VerifiedProjectType } from "./database.ts";

export interface ProjectSuggestionData {
  twitterUsername: string;
  displayName: string;
  avatarUrl: string;
  type: VerifiedProjectType;
  chain?: "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid";
  link?: string; // Contract address
  coinGeckoId?: string;
  ticker?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Validate project suggestion data
export function validateProjectSuggestion(data: Partial<ProjectSuggestionData>): ValidationResult {
  const errors: string[] = [];
  
  // Required fields
  if (!data.twitterUsername || data.twitterUsername.trim().length === 0) {
    errors.push("Twitter username is required");
  }
  
  if (!data.displayName || data.displayName.trim().length === 0) {
    errors.push("Display name is required");
  }
  
  if (!data.avatarUrl || data.avatarUrl.trim().length === 0) {
    errors.push("Avatar URL is required");
  }
  
  if (!data.type || !["token", "nft", "pre_tge"].includes(data.type)) {
    errors.push("Valid project type is required (token, nft, or pre_tge)");
  }
  
  // Chain is required for non-pre_tge projects
  if (data.type !== "pre_tge" && !data.chain) {
    errors.push("Chain is required for token and NFT projects");
  }
  
  // Must have either contract address or CoinGecko ID for non-pre_tge projects
  if (data.type !== "pre_tge" && !data.link && !data.coinGeckoId) {
    errors.push("Either contract address or CoinGecko ID is required for token and NFT projects");
  }
  
  // Validate Twitter username format (no @ symbol, alphanumeric + underscore)
  if (data.twitterUsername) {
    const cleanUsername = data.twitterUsername.trim().replace(/^@/, '');
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleanUsername)) {
      errors.push("Invalid Twitter username format");
    }
  }
  
  // Validate contract address format (if provided)
  if (data.link && data.link.trim().length > 0) {
    const address = data.link.trim();
    
    // Ethereum-like chains (Ethereum, Base, BSC, Plasma)
    if (["ethereum", "base", "bsc", "plasma"].includes(data.chain || "")) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        errors.push("Invalid Ethereum address format");
      }
    }
    
    // Solana
    if (data.chain === "solana") {
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        errors.push("Invalid Solana address format");
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Lookup Ethos user by Twitter handle
export async function lookupEthosUserByTwitter(twitterHandle: string): Promise<{ id: number; username: string; displayName: string; avatarUrl: string } | null> {
  try {
    const cleanHandle = twitterHandle.trim().replace(/^@/, '');
    const response = await fetch(
      `https://api.ethos.network/api/v2/user/by/x/${encodeURIComponent(cleanHandle)}`,
      {
        headers: {
          'X-Ethos-Client': 'signals-app@1.0.0',
        },
      }
    );
    
    if (!response.ok) {
      return null;
    }
    
    const data = await response.json();
    
    // Extract relevant data from Ethos API response
    return {
      id: data.id,
      username: data.primaryAddress?.twitter || cleanHandle,
      displayName: data.name || cleanHandle,
      avatarUrl: data.avatar || `https://unavatar.io/twitter/${cleanHandle}`,
    };
  } catch (error) {
    console.error("Failed to lookup Ethos user by Twitter:", error);
    return null;
  }
}

// Normalize contract address (checksum for Ethereum, etc.)
export function normalizeContractAddress(address: string, chain: string): string {
  const trimmed = address.trim();
  
  // For Ethereum-like chains, ensure proper case (simplified version - full checksum would need web3)
  if (["ethereum", "base", "bsc", "plasma"].includes(chain)) {
    return trimmed.toLowerCase();
  }
  
  // For Solana and others, return as-is
  return trimmed;
}

// Check if project already exists by Twitter username
export async function checkProjectExists(twitterUsername: string): Promise<boolean> {
  try {
    const response = await fetch(`https://signals.deno.dev/api/verified`);
    if (!response.ok) return false;
    
    const data = await response.json();
    const projects = data.values || [];
    
    const cleanUsername = twitterUsername.trim().replace(/^@/, '').toLowerCase();
    return projects.some((p: { twitterUsername: string }) => 
      p.twitterUsername.toLowerCase() === cleanUsername
    );
  } catch (error) {
    console.error("Failed to check if project exists:", error);
    return false;
  }
}

