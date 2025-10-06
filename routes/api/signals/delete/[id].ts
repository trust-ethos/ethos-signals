import { Handlers } from "$fresh/server.ts";
import { getDbClient } from "../../../../utils/db.ts";
import { getAuthFromRequest } from "../../../../utils/auth-middleware.ts";

export const handler: Handlers = {
  async DELETE(req, ctx) {
    const { id } = ctx.params;
    
    // Get authenticated user from extension auth
    const auth = await getAuthFromRequest(req);
    
    if (!auth || !auth.authToken) {
      return new Response(
        JSON.stringify({ 
          error: "Authentication required",
          message: "Please authenticate with the Signals extension to delete signals"
        }),
        { 
          status: 401,
          headers: { "content-type": "application/json" }
        }
      );
    }
    
    const client = await getDbClient();
    
    try {
      // First, verify the signal belongs to the authenticated user
      const checkResult = await client.queryObject<{ auth_token: string | null }>(`
        SELECT auth_token FROM signals WHERE id = $1
      `, [id]);
      
      if (checkResult.rows.length === 0) {
        return new Response(
          JSON.stringify({ error: "Signal not found" }),
          { 
            status: 404,
            headers: { "content-type": "application/json" }
          }
        );
      }
      
      const signalAuthToken = checkResult.rows[0].auth_token;
      
      // Check if the auth token matches
      if (signalAuthToken !== auth.authToken) {
        return new Response(
          JSON.stringify({ 
            error: "Unauthorized - you can only delete signals you created" 
          }),
          { 
            status: 403,
            headers: { "content-type": "application/json" }
          }
        );
      }
      
      // Delete the signal
      await client.queryObject(`
        DELETE FROM signals WHERE id = $1 AND auth_token = $2
      `, [id, auth.authToken]);
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Signal deleted successfully" 
        }),
        { 
          status: 200,
          headers: { "content-type": "application/json" }
        }
      );
      
    } catch (error) {
      console.error("Error deleting signal:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to delete signal",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { 
          status: 500,
          headers: { "content-type": "application/json" }
        }
      );
    }
  },
};

