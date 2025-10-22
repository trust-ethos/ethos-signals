import { Handlers } from "$fresh/server.ts";
import { deletePaidPromoReport } from "../../../../utils/database.ts";
import { getAuthFromRequest } from "../../../../utils/auth-middleware.ts";

export const handler: Handlers = {
  OPTIONS() {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "DELETE, OPTIONS",
        "access-control-allow-headers": "content-type, authorization, x-ethos-client",
      },
    });
  },
  async DELETE(req, ctx) {
    const { id } = ctx.params;
    
    // Require authentication
    const auth = await getAuthFromRequest(req);
    if (!auth) {
      return new Response(
        JSON.stringify({ 
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
          message: 'Please connect your wallet to delete reports.'
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
    
    // Delete the report (only if it belongs to the authenticated user)
    const ok = await deletePaidPromoReport(id, auth.authToken);
    
    if (!ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete report. It may not exist or you may not have permission.',
          code: 'DELETE_FAILED'
        }),
        { 
          status: 404,
          headers: { 
            "content-type": "application/json",
            "access-control-allow-origin": "*"
          }
        }
      );
    }
    
    return new Response(JSON.stringify({ ok }), { 
      headers: { 
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      } 
    });
  },
};

