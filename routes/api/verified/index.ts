import { Handlers } from "$fresh/server.ts";
import { createUlid, deleteVerifiedProject, listVerifiedProjects, saveVerifiedProject, type VerifiedProjectType } from "../../../utils/database.ts";

export const handler: Handlers = {
  async OPTIONS() {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
        "access-control-allow-headers": "content-type, x-ethos-client",
      },
    });
  },
  async GET() {
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
    const body = await req.json();
        const { ethosUserId, twitterUsername, displayName, avatarUrl, type, link, chain, coinGeckoId } = body as {
          ethosUserId: number;
          twitterUsername: string;
          displayName: string;
          avatarUrl: string;
          type: VerifiedProjectType;
          link?: string;
          chain?: "ethereum" | "base" | "solana" | "bsc" | "plasma";
          coinGeckoId?: string;
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


