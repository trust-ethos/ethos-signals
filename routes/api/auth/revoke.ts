import { Handlers } from "$fresh/server.ts";
import { validateAuthToken, revokeAuthToken } from "../../../utils/extension-auth.ts";

/**
 * POST /api/auth/revoke
 * Revoke an authentication token (logout)
 * 
 * Headers:
 *   Authorization: Bearer <token>
 */
export const handler: Handlers = {
  OPTIONS() {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Ethos-Client",
      },
    });
  },

  async POST(req) {
    try {
      // Extract auth token from header
      const authHeader = req.headers.get("Authorization");
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ 
            error: "No authentication token provided",
            code: "NO_TOKEN"
          }),
          { 
            status: 401,
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }

      const authToken = authHeader.slice(7);
      
      // Verify token exists before revoking
      const auth = await validateAuthToken(authToken);
      if (!auth) {
        return new Response(
          JSON.stringify({ 
            error: "Invalid or expired token",
            code: "INVALID_TOKEN"
          }),
          { 
            status: 401,
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }

      // Revoke the token
      const revoked = await revokeAuthToken(authToken);

      if (!revoked) {
        return new Response(
          JSON.stringify({ 
            error: "Failed to revoke token",
            code: "REVOKE_FAILED"
          }),
          { 
            status: 500,
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: "Token revoked successfully"
        }),
        { 
          status: 200,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    } catch (error) {
      console.error("Error in /api/auth/revoke:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          code: "INTERNAL_ERROR"
        }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
  },
};

