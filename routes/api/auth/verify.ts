import { Handlers } from "$fresh/server.ts";
import { validateAuthToken } from "../../../utils/extension-auth.ts";

/**
 * GET /api/auth/verify
 * Verify an authentication token and return user info
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
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Ethos-Client",
      },
    });
  },

  async GET(req) {
    try {
      // Extract auth token from header
      const authHeader = req.headers.get("Authorization");
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return new Response(
          JSON.stringify({ 
            valid: false,
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
      const auth = await validateAuthToken(authToken);

      if (!auth) {
        return new Response(
          JSON.stringify({ 
            valid: false,
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

      return new Response(
        JSON.stringify({ 
          valid: true,
          walletAddress: auth.walletAddress,
          ethosProfileId: auth.ethosProfileId,
          ethosUsername: auth.ethosUsername,
          expiresAt: auth.expiresAt,
          lastUsedAt: auth.lastUsedAt,
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
      console.error("Error in /api/auth/verify:", error);
      return new Response(
        JSON.stringify({ 
          valid: false,
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

