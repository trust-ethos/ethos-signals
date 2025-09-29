// Multi-source token lookup for auto-populating verified projects
// Uses CoinGecko, DefiLlama, and other sources

interface TokenInfo {
  name: string;
  symbol: string;
  twitter?: string;
  contracts: Array<{
    chain: "ethereum" | "base" | "solana" | "bsc";
    address: string;
  }>;
  image?: string;
  source: "coingecko" | "defillama" | "manual";
}

// Predefined list of popular tokens with known Twitter handles and contracts
// This gives us immediate results for common tokens while we build the API integration
const POPULAR_TOKENS: Record<string, TokenInfo> = {
  "ethereum": {
    name: "Ethereum",
    symbol: "ETH",
    twitter: "ethereum",
    contracts: [], // Native token, no contract
    source: "manual"
  },
  "chainlink": {
    name: "Chainlink",
    symbol: "LINK", 
    twitter: "chainlink",
    contracts: [
      { chain: "ethereum", address: "0x514910771af9ca656af840dff83e8264ecf986ca" }
    ],
    source: "manual"
  },
  "uniswap": {
    name: "Uniswap",
    symbol: "UNI",
    twitter: "uniswap",
    contracts: [
      { chain: "ethereum", address: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984" }
    ],
    source: "manual"
  },
  "compound": {
    name: "Compound",
    symbol: "COMP",
    twitter: "compoundfinance",
    contracts: [
      { chain: "ethereum", address: "0xc00e94cb662c3520282e6f5717214004a7f26888" }
    ],
    source: "manual"
  },
  "aave": {
    name: "Aave",
    symbol: "AAVE",
    twitter: "aave",
    contracts: [
      { chain: "ethereum", address: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9" }
    ],
    source: "manual"
  },
  "makerdao": {
    name: "MakerDAO",
    symbol: "MKR",
    twitter: "makerdao",
    contracts: [
      { chain: "ethereum", address: "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2" }
    ],
    source: "manual"
  },
  "polygon": {
    name: "Polygon",
    symbol: "MATIC",
    twitter: "0xpolygon",
    contracts: [
      { chain: "ethereum", address: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0" }
    ],
    source: "manual"
  },
  "base": {
    name: "Base",
    symbol: "BASE",
    twitter: "base",
    contracts: [], // Base is a chain, not a token
    source: "manual"
  },
  "arbitrum": {
    name: "Arbitrum",
    symbol: "ARB",
    twitter: "arbitrum",
    contracts: [
      { chain: "ethereum", address: "0xb50721bcf8d664c30412cfbc6cf2d15fa8431bd3" }
    ],
    source: "manual"
  },
  "optimism": {
    name: "Optimism",
    symbol: "OP", 
    twitter: "optimism",
    contracts: [
      { chain: "ethereum", address: "0x4200000000000000000000000000000000000042" }
    ],
    source: "manual"
  },
  "solana": {
    name: "Solana",
    symbol: "SOL",
    twitter: "solana",
    contracts: [], // Native token
    source: "manual"
  },
  "pudgypenguins": {
    name: "Pudgy Penguins",
    symbol: "PENGU",
    twitter: "pudgypenguins", 
    contracts: [
      { chain: "ethereum", address: "0xbd3531da5cf5857e7cfaa92426877b022e612cf8" }
    ],
    source: "manual"
  }
};

export async function lookupTokenByTwitter(twitterHandle: string): Promise<TokenInfo | null> {
  const handle = twitterHandle.toLowerCase();
  
  // 1. Check our predefined list first
  if (POPULAR_TOKENS[handle]) {
    return POPULAR_TOKENS[handle];
  }
  
  // 2. Try CoinGecko search (rate limited)
  try {
    const coinGeckoResult = await searchCoinGecko(handle);
    if (coinGeckoResult) {
      return coinGeckoResult;
    }
  } catch (_err) {
    // Continue to next source
  }
  
  // 3. Could add DefiLlama or other sources here in the future
  
  return null;
}

async function searchCoinGecko(twitterHandle: string): Promise<TokenInfo | null> {
  try {
    // First try direct coin ID lookup
    const possibleIds = [
      twitterHandle,
      `${twitterHandle}-token`,
      `${twitterHandle}-coin`,
      `${twitterHandle}-protocol`
    ];
    
    for (const id of possibleIds) {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`
        );
        
        if (response.ok) {
          const coin = await response.json();
          
          // Check if this coin has Twitter data matching our search
          if (coin.links?.twitter_screen_name?.toLowerCase() === twitterHandle.toLowerCase()) {
            return {
              name: coin.name,
              symbol: coin.symbol?.toUpperCase(),
              twitter: coin.links.twitter_screen_name,
              contracts: extractContracts(coin.platforms || {}),
              image: coin.image?.large,
              source: "coingecko"
            };
          }
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (_err) {
        continue;
      }
    }
    
    return null;
  } catch (_err) {
    return null;
  }
}

function extractContracts(platforms: Record<string, string>): Array<{ chain: "ethereum" | "base" | "solana"; address: string }> {
  const contracts: Array<{ chain: "ethereum" | "base" | "solana"; address: string }> = [];
  
  if (platforms.ethereum && platforms.ethereum !== "") {
    contracts.push({ chain: "ethereum", address: platforms.ethereum });
  }
  
  if (platforms.base && platforms.base !== "") {
    contracts.push({ chain: "base", address: platforms.base });
  }
  
  if (platforms.solana && platforms.solana !== "") {
    contracts.push({ chain: "solana", address: platforms.solana });
  }
  
  return contracts;
}
