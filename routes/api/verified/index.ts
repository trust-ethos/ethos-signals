import { Handlers } from "$fresh/server.ts";
import { createUlid, deleteVerifiedProject, listVerifiedProjects, saveVerifiedProject, type VerifiedProjectType } from "../../../utils/database.ts";

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
    // Check authentication for GET (listing projects)
    if (!checkAuth(req)) {
      return unauthorizedResponse();
    }
    
    const items = await listVerifiedProjects();
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
        const { ethosUserId, twitterUsername, displayName, avatarUrl, type, link, chain, coinGeckoId, ticker } = body as {
          ethosUserId: number;
          twitterUsername: string;
          displayName: string;
          avatarUrl: string;
          type: VerifiedProjectType;
          link?: string;
          chain?: "ethereum" | "base" | "solana" | "bsc" | "plasma";
          coinGeckoId?: string;
          ticker?: string;
        };
    if (!ethosUserId || !twitterUsername || !displayName || !avatarUrl || !type) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
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


