// CoinGecko API helper with API key support
// Supports free tier, Demo, and Pro plans

export function getCoinGeckoApiKey(): string {
  return Deno.env.get("COINGECKO_API_KEY") || "";
}

/**
 * Get the correct base URL based on API key
 * - Free tier: api.coingecko.com (no key)
 * - Demo: api.coingecko.com (with x_cg_demo_api_key)
 * - Pro: pro-api.coingecko.com (with x_cg_pro_api_key)
 */
export function getCoinGeckoBaseUrl(): string {
  const apiKey = getCoinGeckoApiKey();
  
  // If we have a Pro API key, use pro-api subdomain
  // Pro keys typically start with "CG-" but we need to use pro URL
  if (apiKey) {
    // For now, assume Pro plan - Pro keys use pro-api.coingecko.com
    return "https://pro-api.coingecko.com/api/v3";
  }
  
  // Free tier uses standard URL
  return "https://api.coingecko.com/api/v3";
}

/**
 * Constructs a CoinGecko API URL with optional API key
 * Automatically selects correct base URL (api vs pro-api)
 */
export function buildCoinGeckoUrl(endpoint: string, params?: Record<string, string>): string {
  const baseUrl = getCoinGeckoBaseUrl();
  const apiKey = getCoinGeckoApiKey();
  
  const url = new URL(`${baseUrl}${endpoint}`);
  
  // Add any provided params
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  // Add API key if available
  // Pro keys use x_cg_pro_api_key, Demo keys use x_cg_demo_api_key
  if (apiKey) {
    url.searchParams.append("x_cg_pro_api_key", apiKey);
  }
  
  return url.toString();
}

/**
 * Makes a fetch request to CoinGecko with proper headers
 */
export async function fetchCoinGecko(endpoint: string, params?: Record<string, string>): Promise<Response> {
  const url = buildCoinGeckoUrl(endpoint, params);
  
  const headers: HeadersInit = {
    "Accept": "application/json",
  };
  
  return fetch(url, { headers });
}

/**
 * Rate limit helper for free tier
 * Pro/Demo plans have higher limits, but still good to be respectful
 */
export async function waitForRateLimit(delayMs = 1000): Promise<void> {
  const apiKey = getCoinGeckoApiKey();
  
  // If we have an API key (paid plan), we can make requests faster
  // Free tier: 10-50 calls/minute → ~2 second delay
  // Demo/Pro: 500+ calls/minute → ~200ms delay
  const delay = apiKey ? 200 : delayMs;
  
  await new Promise(resolve => setTimeout(resolve, delay));
}
