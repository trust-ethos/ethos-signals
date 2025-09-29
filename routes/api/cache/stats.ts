import { Handlers } from "$fresh/server.ts";
import { getCacheStats } from "../../../utils/kv-cache.ts";

export const handler: Handlers = {
  async GET() {
    const stats = await getCacheStats();
    
    return new Response(JSON.stringify({
      ...stats,
      cacheType: "Deno KV",
      status: "healthy",
    }), {
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      },
    });
  },
};
