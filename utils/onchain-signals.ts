/**
 * Utilities for interacting with the SignalsAttestation smart contract
 * This allows storing and retrieving signals from the blockchain
 */

import { ethers } from "npm:ethers@6.9.0";
import SignalsAttestationABI from "../contracts/SignalsAttestation.abi.json" with { type: "json" };

// Contract address (update after deployment)
const CONTRACT_ADDRESS = Deno.env.get("SIGNALS_CONTRACT_ADDRESS") || "";

export interface OnchainSignal {
  author: string;
  subject: string;
  tweetUrl: string;
  tweetContent: string;
  isBullish: boolean;
  metadata: string;
  attestationDetails: {
    account: string;
    service: string;
  };
  timestamp: bigint;
  archived: boolean;
}

export interface SignalMetadata {
  dateTimeOfPost?: string; // ISO 8601 timestamp of when the tweet was posted
  dateTimeOfSave: string;  // ISO 8601 timestamp of when the signal was saved
  savedByHandle?: string;  // Ethos/Twitter handle of who saved it
  savedByProfileId?: number; // Ethos profile ID of who saved it
}

/**
 * Get a contract instance for read operations
 */
export function getSignalsContract(providerUrl?: string): ethers.Contract {
  const rpcUrl = providerUrl || Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { 
    staticNetwork: true 
  });
  return new ethers.Contract(CONTRACT_ADDRESS, SignalsAttestationABI, provider);
}

/**
 * Get a contract instance for write operations (requires signer)
 */
export function getSignalsContractWithSigner(
  privateKey: string,
  providerUrl?: string
): ethers.Contract {
  const rpcUrl = providerUrl || Deno.env.get("BASE_RPC_URL") || "https://mainnet.base.org";
  const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { 
    staticNetwork: true 
  });
  const wallet = new ethers.Wallet(privateKey, provider);
  return new ethers.Contract(CONTRACT_ADDRESS, SignalsAttestationABI, wallet);
}

/**
 * Create a signal onchain
 */
export async function createSignalOnchain(
  contract: ethers.Contract,
  signal: {
    subject: string;
    tweetUrl: string;
    tweetContent: string;
    isBullish: boolean;
    metadata: SignalMetadata;
    twitterAccountId: string;
  }
): Promise<{ signalId: bigint; txHash: string }> {
  const metadataJson = JSON.stringify(signal.metadata);
  
  const tx = await contract.createSignal(
    signal.subject,
    signal.tweetUrl,
    signal.tweetContent,
    signal.isBullish,
    metadataJson,
    signal.twitterAccountId,
    "x.com"
  );
  
  const receipt = await tx.wait();
  
  // Extract signal ID from event
  let signalId = 0n;
  for (const log of receipt.logs) {
    try {
      const parsed = contract.interface.parseLog({
        topics: [...log.topics],
        data: log.data
      });
      if (parsed?.name === "SignalCreated") {
        signalId = parsed.args[0];
        break;
      }
    } catch {
      // Not a SignalCreated event, continue
    }
  }
  
  return {
    signalId,
    txHash: receipt.hash,
  };
}

/**
 * Get a signal from the blockchain
 */
export async function getSignalOnchain(
  contract: ethers.Contract,
  signalId: number
): Promise<OnchainSignal | null> {
  try {
    const signal = await contract.getSignal(signalId);
    return {
      author: signal.author,
      subject: signal.subject,
      tweetUrl: signal.tweetUrl,
      tweetContent: signal.tweetContent,
      isBullish: signal.isBullish,
      metadata: signal.metadata,
      attestationDetails: {
        account: signal.attestationDetails.account,
        service: signal.attestationDetails.service,
      },
      timestamp: signal.timestamp,
      archived: signal.archived,
    };
  } catch (error) {
    console.error("Failed to get signal onchain:", error);
    return null;
  }
}

/**
 * Get all signals by an author
 */
export async function getSignalsByAuthorOnchain(
  contract: ethers.Contract,
  authorAddress: string
): Promise<number[]> {
  try {
    const signalIds = await contract.getSignalsByAuthor(authorAddress);
    return signalIds.map((id: bigint) => Number(id));
  } catch (error) {
    console.error("Failed to get signals by author:", error);
    return [];
  }
}

/**
 * Get all signals for a project
 */
export async function getSignalsByProjectOnchain(
  contract: ethers.Contract,
  projectHandle: string
): Promise<number[]> {
  try {
    const signalIds = await contract.getSignalsByProject(projectHandle);
    return signalIds.map((id: bigint) => Number(id));
  } catch (error) {
    console.error("Failed to get signals by project:", error);
    return [];
  }
}

/**
 * Get multiple signals in a batch
 */
export async function getSignalsBatchOnchain(
  contract: ethers.Contract,
  signalIds: number[]
): Promise<OnchainSignal[]> {
  try {
    const signals = await contract.getSignalsBatch(signalIds);
    return signals.map((signal: OnchainSignal) => ({
      author: signal.author,
      subject: signal.subject,
      tweetUrl: signal.tweetUrl,
      tweetContent: signal.tweetContent,
      isBullish: signal.isBullish,
      metadata: signal.metadata,
      attestationDetails: {
        account: signal.attestationDetails.account,
        service: signal.attestationDetails.service,
      },
      timestamp: signal.timestamp,
      archived: signal.archived,
    }));
  } catch (error) {
    console.error("Failed to get signals batch:", error);
    return [];
  }
}

/**
 * Get sentiment statistics for a project
 */
export async function getProjectSentimentOnchain(
  contract: ethers.Contract,
  projectHandle: string
): Promise<{ bullishCount: number; bearishCount: number }> {
  try {
    const [bullish, bearish] = await contract.getProjectSentiment(projectHandle);
    return {
      bullishCount: Number(bullish),
      bearishCount: Number(bearish),
    };
  } catch (error) {
    console.error("Failed to get project sentiment:", error);
    return { bullishCount: 0, bearishCount: 0 };
  }
}

/**
 * Archive a signal
 */
export async function archiveSignalOnchain(
  contract: ethers.Contract,
  signalId: number
): Promise<string> {
  const tx = await contract.archiveSignal(signalId);
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Restore an archived signal
 */
export async function restoreSignalOnchain(
  contract: ethers.Contract,
  signalId: number
): Promise<string> {
  const tx = await contract.restoreSignal(signalId);
  const receipt = await tx.wait();
  return receipt.hash;
}

/**
 * Get the total number of signals
 */
export async function getSignalCountOnchain(
  contract: ethers.Contract
): Promise<number> {
  try {
    const count = await contract.signalCount();
    return Number(count);
  } catch (error) {
    console.error("Failed to get signal count:", error);
    return 0;
  }
}


