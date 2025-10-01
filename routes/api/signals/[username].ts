import { Handlers } from "$fresh/server.ts";
import { createUlid, deleteTestSignal, listTestSignals, saveTestSignal, type SignalSentiment } from "../../../utils/database.ts";
import { getSignalsContractWithSigner, createSignalOnchain } from "../../../utils/onchain-signals.ts";

export const handler: Handlers = {
  OPTIONS() {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
        "access-control-allow-headers": "content-type, x-ethos-client",
      },
    });
  },
  async GET(_req, ctx) {
    const { username } = ctx.params;
    const items = await listTestSignals(username);
    return new Response(JSON.stringify({ values: items }), {
      headers: { 
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, DELETE",
        "access-control-allow-headers": "content-type, x-ethos-client"
      },
    });
  },
  async POST(req, ctx) {
    const { username } = ctx.params;
    const body = await req.json();
    const { sentiment, tweetUrl, tweetContent, projectHandle, notedAt, tweetTimestamp, projectUserId, projectDisplayName, projectAvatarUrl } = body as {
      sentiment: SignalSentiment;
      tweetUrl: string;
      tweetContent?: string;
      projectHandle: string;
      notedAt: string; // yyyy-mm-dd
      tweetTimestamp?: string; // ISO datetime
      projectUserId?: number;
      projectDisplayName?: string;
      projectAvatarUrl?: string;
    };
    if (!sentiment || !tweetUrl || !projectHandle || !notedAt) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    const id = createUlid();
    
    // Optional: Save onchain first if configured
    let onchainResult = null;
    const privateKey = Deno.env.get("PRIVATE_KEY");
    const enableOnchain = Deno.env.get("ENABLE_ONCHAIN_SIGNALS") === "true";
    
    if (enableOnchain && privateKey) {
      try {
        const contract = getSignalsContractWithSigner(privateKey);
        onchainResult = await createSignalOnchain(contract, {
          subject: projectHandle,
          tweetUrl,
          tweetContent: tweetContent || "",
          isBullish: sentiment === "bullish",
          metadata: {
            dateTimeOfPost: tweetTimestamp || undefined,
            dateTimeOfSave: new Date().toISOString(),
          },
          twitterAccountId: projectUserId?.toString() || "",
        });
        console.log(`✅ Signal ${id} saved onchain with ID: ${onchainResult.signalId}`);
      } catch (error) {
        console.error("Failed to save signal onchain:", error);
        // Continue to save in database even if onchain fails
      }
    }
    
    // Save to database (include onchain data if available)
    const ok = await saveTestSignal({
      id,
      twitterUsername: username,
      projectHandle,
      projectUserId,
      projectDisplayName,
      projectAvatarUrl,
      tweetUrl,
      tweetContent,
      sentiment,
      notedAt,
      tweetTimestamp,
      createdAt: Date.now(),
      onchainTxHash: onchainResult?.txHash,
      onchainSignalId: onchainResult ? Number(onchainResult.signalId) : undefined,
    });
    
    return new Response(JSON.stringify({ 
      ok, 
      id,
      onchain: onchainResult ? {
        signalId: onchainResult.signalId.toString(),
        txHash: onchainResult.txHash,
      } : null
    }), {
      headers: { 
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      },
      status: ok ? 200 : 500,
    });
  },
  async DELETE(req, ctx) {
    const { username } = ctx.params;
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return new Response(JSON.stringify({ error: "id required" }), { status: 400 });
    const ok = await deleteTestSignal(username, id);
    return new Response(JSON.stringify({ ok }), { 
      headers: { 
        "content-type": "application/json",
        "access-control-allow-origin": "*"
      } 
    });
  },
};


