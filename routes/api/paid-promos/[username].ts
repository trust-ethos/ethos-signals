import { Handlers } from "$fresh/server.ts";
import { 
  createUlid, 
  getPaidPromoReportsByUsername, 
  savePaidPromoReport 
} from "../../../utils/database.ts";
import { getAuthFromRequest } from "../../../utils/auth-middleware.ts";
import { checkRateLimit } from "../../../utils/extension-auth.ts";

export const handler: Handlers = {
  OPTIONS() {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type, authorization, x-ethos-client",
      },
    });
  },
  async GET(req, ctx) {
    const { username } = ctx.params;
    
    // Check authentication (optional for GET)
    const auth = await getAuthFromRequest(req);
    
    // If authenticated, check rate limit
    if (auth) {
      const rateLimit = await checkRateLimit(auth.authToken, 'paid-promos:list');
      if (!rateLimit.allowed) {
        const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            code: 'RATE_LIMIT_EXCEEDED',
            resetAt: rateLimit.resetAt,
          }),
          { 
            status: 429,
            headers: { 
              "content-type": "application/json",
              "access-control-allow-origin": "*",
              "retry-after": retryAfter.toString(),
            }
          }
        );
      }
    }
    
    const reports = await getPaidPromoReportsByUsername(username);
    
    return new Response(JSON.stringify({ values: reports }), {
      headers: { 
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "content-type, authorization, x-ethos-client"
      },
    });
  },
  async POST(req, ctx) {
    const { username } = ctx.params;
    
    // Require authentication for POST
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          message: 'Please connect your wallet in the extension to report paid promos.'
        }),
        { 
          status: 401,
          headers: { 
            "content-type": "application/json",
            "access-control-allow-origin": "*"
          }
        }
      );
    }
    
    // Check rate limit
    const rateLimit = await checkRateLimit(auth.authToken, 'paid-promos:create');
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          resetAt: rateLimit.resetAt,
          limit: rateLimit.limit,
        }),
        { 
          status: 429,
          headers: { 
            "content-type": "application/json",
            "access-control-allow-origin": "*",
            "retry-after": retryAfter.toString(),
          }
        }
      );
    }
    
    const body = await req.json();
    const { tweetUrl, tweetContent, evidence, disclosureStatus } = body as {
      tweetUrl: string;
      tweetContent?: string;
      evidence?: string;
      disclosureStatus?: "disclosed" | "undisclosed";
    };
    
    if (!tweetUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required field: tweetUrl" }), 
        { 
          status: 400,
          headers: { 
            "content-type": "application/json",
            "access-control-allow-origin": "*"
          }
        }
      );
    }
    
    const id = createUlid();
    
    // Save the paid promo report
    const ok = await savePaidPromoReport({
      id,
      tweetUrl,
      twitterUsername: username,
      tweetContent,
      evidence,
      disclosureStatus: disclosureStatus || "disclosed", // Default to disclosed
      reportedAt: Date.now(),
      authToken: auth.authToken,
    });
    
    return new Response(JSON.stringify({ 
      ok, 
      id,
    }), {
      headers: { 
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      },
      status: ok ? 200 : 500,
    });
  },
};

