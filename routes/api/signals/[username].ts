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
    
    // Convert BigInt to number for JSON serialization
    const serializedItems = items.map(item => ({
      ...item,
      onchainSignalId: item.onchainSignalId ? Number(item.onchainSignalId) : undefined,
    }));
    
    return new Response(JSON.stringify({ values: serializedItems }), {
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
    
    // Save to database IMMEDIATELY (fast response for user)
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
      // Onchain data will be added later
    });
    
    // Start onchain save in the background (non-blocking, fire-and-forget)
    const privateKey = Deno.env.get("PRIVATE_KEY");
    const enableOnchain = Deno.env.get("ENABLE_ONCHAIN_SIGNALS") === "true";
    
    if (ok && enableOnchain && privateKey) {
      // Don't await - let this run in background
      (async () => {
        try {
          const contract = getSignalsContractWithSigner(privateKey);
          const onchainResult = await createSignalOnchain(contract, {
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
          
          console.log(`✅ Signal ${id} saved onchain with ID: ${onchainResult.signalId}, TX: ${onchainResult.txHash}`);
          
          // Update database with onchain info
          await saveTestSignal({
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
            onchainTxHash: onchainResult.txHash,
            onchainSignalId: Number(onchainResult.signalId),
          });
          
          console.log(`✅ Database updated with onchain data for signal ${id}`);
        } catch (error) {
          console.error(`❌ Failed to save signal ${id} onchain:`, error);
          // Signal is still in database, just without onchain data
        }
      })();
    }
    
    // Return immediately - user doesn't wait for blockchain!
    return new Response(JSON.stringify({ 
      ok, 
      id,
      onchain: "pending" // Indicates onchain save is in progress
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


