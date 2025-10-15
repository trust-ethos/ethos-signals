import { Handlers } from "$fresh/server.ts";
import { createUlid, deleteVerifiedProject, listVerifiedProjects, saveVerifiedProject, type VerifiedProjectType } from "../../../utils/database.ts";
import { lookupCoinGeckoId } from "../../../utils/coingecko-lookup.ts";

// Simple authentication check
function checkAuth(req: Request): boolean {
  const adminPassword = Deno.env.get("ADMIN_PASSWORD");
  
  // If no password is set, allow access (for development)
  if (!adminPassword) {
    return true;
  }

  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  try {
    const base64Credentials = authHeader.slice(6);
    const credentials = atob(base64Credentials);
    const [_username, password] = credentials.split(":");
    return password === adminPassword;
  } catch {
    return false;
  }
}

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "WWW-Authenticate": 'Basic realm="Admin Area"',
    },
  });
}

export const handler: Handlers = {
  OPTIONS() {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
        "access-control-allow-headers": "content-type, x-ethos-client, authorization",
      },
    });
  },
  async GET(req) {
    // GET is public - no authentication required (used to display verified projects)
    // Check for status query parameter
    const url = new URL(req.url);
    const status = url.searchParams.get("status") as "all" | "verified" | "unverified" | null;
    
    // Default to "verified" to maintain backwards compatibility
    const verificationStatus = status === "all" || status === "unverified" ? status : "verified";
    
    const items = await listVerifiedProjects(verificationStatus);
    return new Response(JSON.stringify({ values: items }), { 
      headers: { 
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, DELETE",
        "access-control-allow-headers": "content-type"
      } 
    });
  },
  async POST(req) {
    // Check authentication for POST (creating/updating projects)
    if (!checkAuth(req)) {
      return unauthorizedResponse();
    }

    const body = await req.json();
        let { ethosUserId, twitterUsername, displayName, avatarUrl, type, link, chain, coinGeckoId, ticker } = body as {
          ethosUserId: number;
          twitterUsername: string;
          displayName: string;
          avatarUrl: string;
          type: VerifiedProjectType;
          link?: string;
          chain?: "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid";
          coinGeckoId?: string;
          ticker?: string;
        };
    if (!ethosUserId || !twitterUsername || !displayName || !avatarUrl || !type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }

    // Auto-lookup CoinGecko ID if not provided but contract address exists (tokens only)
    if (type === "token" && link && !coinGeckoId) {
      console.log(`🔍 Auto-looking up CoinGecko ID for ${displayName} (${link})...`);
      const foundId = await lookupCoinGeckoId(link, chain ?? "ethereum");
      if (foundId) {
        coinGeckoId = foundId;
        console.log(`✅ Auto-found CoinGecko ID: ${foundId}`);
      } else {
        console.log(`⚠️  No CoinGecko ID found, will use daily data from DefiLlama`);
      }
    }

    const ok = await saveVerifiedProject({
      id: createUlid(),
      ethosUserId,
      twitterUsername,
      displayName,
      avatarUrl,
      type,
      chain: chain ?? "ethereum",
      link,
      coinGeckoId,
      ticker,
      isVerified: true, // Admin-created projects are automatically verified
      verifiedAt: Date.now(),
      verifiedBy: "admin",
      createdAt: Date.now(),
    });
    return new Response(JSON.stringify({ ok }), { 
      headers: { 
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      } 
    });
  },
  async DELETE(req) {
    // Check authentication for DELETE
    if (!checkAuth(req)) {
      return unauthorizedResponse();
    }

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
    const ok = await deleteVerifiedProject(id);
    return new Response(JSON.stringify({ ok }), { 
      headers: { 
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      } 
    });
  },
};


