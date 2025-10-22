import { Handlers } from "$fresh/server.ts";
import { getPaidPromoCountForTweet } from "../../../utils/database.ts";

export const handler: Handlers = {
  OPTIONS() {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
        "access-control-allow-headers": "content-type, x-ethos-client",
      },
    });
  },
  async GET(req) {
    const url = new URL(req.url);
    const tweetUrl = url.searchParams.get("tweetUrl");
    
    if (!tweetUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: tweetUrl" }), 
        { 
          status: 400,
          headers: { 
            "content-type": "application/json",
            "access-control-allow-origin": "*"
          }
        }
      );
    }
    
    const count = await getPaidPromoCountForTweet(tweetUrl);
    
    return new Response(JSON.stringify({ count }), {
      headers: { 
        "content-type": "application/json",
        "access-control-allow-origin": "*",
      },
    });
  },
};

