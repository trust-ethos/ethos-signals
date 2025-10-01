/**
 * API endpoint for onchain signal operations
 * Combines database and blockchain storage
 */

import { Handlers } from "$fresh/server.ts";
import { saveTestSignal, TestSignal } from "../../../utils/database.ts";
import { 
  getSignalsContractWithSigner, 
  createSignalOnchain,
  getSignalsContract,
  getSignalsByProjectOnchain,
  getSignalsBatchOnchain,
  getProjectSentimentOnchain
} from "../../../utils/onchain-signals.ts";

export const handler: Handlers = {
  // POST: Create a signal both in database and onchain
  async POST(req) {
    try {
      const body = await req.json();
      const { signal, walletPrivateKey } = body;
      
      if (!signal) {
        return new Response(
          JSON.stringify({ error: "Signal data required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Validate signal structure
      const testSignal: TestSignal = {
        id: signal.id,
        twitterUsername: signal.twitterUsername,
        projectHandle: signal.projectHandle,
        projectUserId: signal.projectUserId,
        projectDisplayName: signal.projectDisplayName,
        projectAvatarUrl: signal.projectAvatarUrl,
        verifiedProjectId: signal.verifiedProjectId,
        tweetUrl: signal.tweetUrl,
        tweetContent: signal.tweetContent,
        sentiment: signal.sentiment,
        notedAt: signal.notedAt,
        tweetTimestamp: signal.tweetTimestamp,
        createdAt: signal.createdAt || Date.now(),
      };
      
      // Save to database first (fast)
      const dbSuccess = await saveTestSignal(testSignal);
      if (!dbSuccess) {
        return new Response(
          JSON.stringify({ error: "Failed to save to database" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      
      let onchainResult = null;
      
      // If private key provided, also save onchain
      if (walletPrivateKey) {
        try {
          const contract = getSignalsContractWithSigner(walletPrivateKey);
          onchainResult = await createSignalOnchain(contract, {
            subject: testSignal.projectHandle,
            tweetUrl: testSignal.tweetUrl,
            tweetContent: testSignal.tweetContent || "",
            isBullish: testSignal.sentiment === "bullish",
            metadata: {
              twitterUsername: testSignal.twitterUsername,
              notedAt: testSignal.notedAt,
              projectDisplayName: testSignal.projectDisplayName,
              projectUserId: testSignal.projectUserId,
              projectAvatarUrl: testSignal.projectAvatarUrl,
              verifiedProjectId: testSignal.verifiedProjectId,
            },
            twitterAccountId: testSignal.projectUserId?.toString() || "",
          });
        } catch (error) {
          console.error("Failed to save onchain:", error);
          // Continue - database save was successful
        }
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          signal: testSignal,
          onchain: onchainResult ? {
            signalId: onchainResult.signalId.toString(),
            txHash: onchainResult.txHash,
            explorer: `https://basescan.org/tx/${onchainResult.txHash}`,
          } : null,
        }),
        { 
          status: 201, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    } catch (error) {
      console.error("Error in onchain signal endpoint:", error);
      return new Response(
        JSON.stringify({ error: "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
  
  // GET: Query onchain signals
  async GET(req) {
    try {
      const url = new URL(req.url);
      const project = url.searchParams.get("project");
      const action = url.searchParams.get("action");
      
      const contract = getSignalsContract();
      
      // Get sentiment stats for a project
      if (action === "sentiment" && project) {
        const sentiment = await getProjectSentimentOnchain(contract, project);
        return new Response(
          JSON.stringify(sentiment),
          { headers: { "Content-Type": "application/json" } }
        );
      }
      
      // Get all signals for a project
      if (project) {
        const signalIds = await getSignalsByProjectOnchain(contract, project);
        const signals = await getSignalsBatchOnchain(contract, signalIds);
        
        // Format for frontend
        const formatted = signals
          .filter(s => !s.archived)
          .map(s => ({
            signalId: signalIds[signals.indexOf(s)],
            author: s.author,
            subject: s.subject,
            tweetUrl: s.tweetUrl,
            tweetContent: s.tweetContent,
            sentiment: s.isBullish ? "bullish" : "bearish",
            timestamp: Number(s.timestamp) * 1000, // Convert to ms
            metadata: JSON.parse(s.metadata),
            attestation: s.attestationDetails,
          }));
        
        return new Response(
          JSON.stringify(formatted),
          { headers: { "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Error querying onchain signals:", error);
      return new Response(
        JSON.stringify({ error: "Failed to query onchain signals" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  },
};


