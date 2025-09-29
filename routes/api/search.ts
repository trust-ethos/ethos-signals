import { Handlers } from "$fresh/server.ts";
import { searchUsersByTwitter } from "../../utils/ethos-api.ts";

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const q = url.searchParams.get("q") ?? "";
    const corsHeaders = {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET",
      "access-control-allow-headers": "content-type"
    };
    if (!q) return new Response(JSON.stringify({ values: [] }), { headers: corsHeaders });
    const values = await searchUsersByTwitter(q);
    return new Response(JSON.stringify({ values }), { headers: corsHeaders });
  },
};




