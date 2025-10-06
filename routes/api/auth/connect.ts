import { Handlers } from "$fresh/server.ts";
import { verifyWalletSignature, createAuthToken } from "../../../utils/extension-auth.ts";

/**
 * POST /api/auth/connect
 * Authenticate a wallet and create an auth token
 * 
 * Request body:
 * {
 *   walletAddress: string,
 *   signature: string,
 *   timestamp: number,
 *   ethosProfileId?: number,
 *   ethosUsername?: string,
 *   deviceIdentifier?: string
 * }
 */
export const handler: Handlers = {
  OPTIONS() {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Ethos-Client",
      },
    });
  },

  async POST(req) {
    try {
      const body = await req.json();
      const { 
        walletAddress, 
        signature, 
        timestamp,
        ethosProfileId,
        ethosUsername,
        deviceIdentifier 
      } = body;

      // Validate required fields
      if (!walletAddress || !signature || !timestamp) {
        return new Response(
          JSON.stringify({ 
            error: "Missing required fields",
            code: "VALIDATION_ERROR",
            required: ["walletAddress", "signature", "timestamp"]
          }),
          { 
            status: 400,
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }

      // Verify the wallet signature
      const isValid = await verifyWalletSignature(
        walletAddress,
        signature,
        timestamp
      );

      if (!isValid) {
        return new Response(
          JSON.stringify({ 
            error: "Invalid signature",
            code: "INVALID_SIGNATURE",
            message: "The wallet signature could not be verified. Please try again."
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

      // Create auth token
      const authToken = await createAuthToken(
        walletAddress,
        ethosProfileId,
        ethosUsername,
        deviceIdentifier
      );

      return new Response(
        JSON.stringify({ 
          success: true,
          authToken,
          walletAddress: walletAddress.toLowerCase(),
          ethosProfileId,
          ethosUsername,
          expiresAt: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days
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
      console.error("Error in /api/auth/connect:", error);
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

