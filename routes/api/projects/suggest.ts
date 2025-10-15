import { Handlers } from "$fresh/server.ts";
import { createUlid, saveVerifiedProject, type VerifiedProjectType } from "../../../utils/database.ts";
import { getAuthFromRequest } from "../../../utils/auth-middleware.ts";
import { 
  checkSuggestionRateLimit, 
  incrementSuggestionCount 
} from "../../../utils/extension-auth.ts";
import {
  validateProjectSuggestion,
  lookupEthosUserByTwitter,
  normalizeContractAddress,
} from "../../../utils/project-validation.ts";

export const handler: Handlers = {
  OPTIONS() {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type, authorization",
      },
    });
  },

  async POST(req) {
    try {
      // Optional authentication - check if provided
      const auth = await getAuthFromRequest(req);
      
      // If authenticated, check rate limit (5 suggestions per 24 hours)
      if (auth) {
        const rateLimit = await checkSuggestionRateLimit(auth.authToken);
        if (!rateLimit.allowed) {
          const hoursUntilReset = Math.ceil((rateLimit.resetAt - Date.now()) / (1000 * 60 * 60));
          return new Response(
            JSON.stringify({
              error: "Rate limit exceeded",
              code: "RATE_LIMIT_EXCEEDED",
              message: `You have reached your daily limit of ${rateLimit.limit} project suggestions. Please try again in ${hoursUntilReset} hours.`,
              remaining: rateLimit.remaining,
              resetAt: rateLimit.resetAt,
              limit: rateLimit.limit,
            }),
            {
              status: 429,
              headers: {
                "content-type": "application/json",
                "access-control-allow-origin": "*",
                "retry-after": (hoursUntilReset * 3600).toString(),
              },
            }
          );
        }
      }

      // Parse and validate request body
      const body = await req.json();
      const {
        twitterUsername,
        displayName,
        avatarUrl,
        type,
        chain,
        link,
        coinGeckoId,
        ticker,
      } = body as {
        twitterUsername: string;
        displayName: string;
        avatarUrl: string;
        type: VerifiedProjectType;
        chain?: "ethereum" | "base" | "solana" | "bsc" | "plasma" | "hyperliquid";
        link?: string;
        coinGeckoId?: string;
        ticker?: string;
      };

      // Validate the suggestion
      const validation = validateProjectSuggestion({
        twitterUsername,
        displayName,
        avatarUrl,
        type,
        chain,
        link,
        coinGeckoId,
        ticker,
      });

      if (!validation.valid) {
        return new Response(
          JSON.stringify({
            error: "Validation failed",
            code: "VALIDATION_ERROR",
            errors: validation.errors,
          }),
          {
            status: 400,
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*",
            },
          }
        );
      }

      // Lookup Ethos user ID from Twitter handle
      const cleanTwitterHandle = twitterUsername.trim().replace(/^@/, '');
      const ethosUser = await lookupEthosUserByTwitter(cleanTwitterHandle);

      if (!ethosUser) {
        return new Response(
          JSON.stringify({
            error: "Ethos profile not found",
            code: "ETHOS_NOT_FOUND",
            message: `Could not find an Ethos profile for @${cleanTwitterHandle}. The project must have an Ethos profile to be added.`,
          }),
          {
            status: 404,
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*",
            },
          }
        );
      }

      // Normalize contract address if provided
      const normalizedLink = link && chain 
        ? normalizeContractAddress(link, chain) 
        : undefined;

      // Save as unverified project suggestion
      const projectId = createUlid();
      const success = await saveVerifiedProject({
        id: projectId,
        ethosUserId: ethosUser.id,
        twitterUsername: cleanTwitterHandle,
        displayName: displayName.trim(),
        avatarUrl: avatarUrl.trim(),
        type,
        chain: chain || "ethereum",
        link: normalizedLink,
        coinGeckoId: coinGeckoId?.trim(),
        ticker: ticker?.trim(),
        isVerified: false, // Mark as unverified suggestion
        suggestedByAuthToken: auth?.authToken, // Optional - only if authenticated
        suggestedAt: Date.now(),
        createdAt: Date.now(),
      });

      if (!success) {
        return new Response(
          JSON.stringify({
            error: "Failed to save suggestion",
            code: "SAVE_ERROR",
            message: "Could not save your project suggestion. Please try again later.",
          }),
          {
            status: 500,
            headers: {
              "content-type": "application/json",
              "access-control-allow-origin": "*",
            },
          }
        );
      }

      // Increment suggestion count for rate limiting (only if authenticated)
      if (auth) {
        await incrementSuggestionCount(auth.authToken);
      }

      const responseData: Record<string, unknown> = {
        success: true,
        message: "Project suggestion submitted successfully! It will be reviewed by an admin.",
        projectId,
      };

      // Only include rate limit info if authenticated
      if (auth) {
        const rateLimit = await checkSuggestionRateLimit(auth.authToken);
        responseData.remainingSuggestions = rateLimit.remaining;
        responseData.resetAt = rateLimit.resetAt;
      }

      return new Response(
        JSON.stringify(responseData),
        {
          status: 201,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        }
      );
    } catch (error) {
      console.error("Error in project suggestion endpoint:", error);
      return new Response(
        JSON.stringify({
          error: "Internal server error",
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred. Please try again later.",
        }),
        {
          status: 500,
          headers: {
            "content-type": "application/json",
            "access-control-allow-origin": "*",
          },
        }
      );
    }
  },
};

