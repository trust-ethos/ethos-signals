#!/usr/bin/env -S deno run -A

import "https://deno.land/std@0.216.0/dotenv/load.ts";
import { initializeDatabase } from "../utils/db.ts";
import { saveVerifiedProject, createUlid } from "../utils/database.ts";

async function addPlasmaProject() {
  console.log("🔥 Adding PlasmaFDN as verified project...");
  
  await initializeDatabase();
  
  // Add PlasmaFDN with plasma CoinGecko ID
  const success = await saveVerifiedProject({
    id: createUlid(),
    ethosUserId: 999999, // Dummy ID since we don't know the real one
    twitterUsername: "plasmafdn",
    displayName: "Plasma",
    avatarUrl: "https://pbs.twimg.com/profile_images/1234567890/placeholder.jpg",
    type: "token",
    chain: "ethereum",
    link: undefined, // No contract address for Layer 1
    coinGeckoId: "plasma", // Use the plasma CoinGecko ID
    createdAt: Date.now(),
  });
  
  if (success) {
    console.log("✅ Successfully added PlasmaFDN with CoinGecko ID: plasma");
  } else {
    console.error("❌ Failed to add PlasmaFDN");
  }
}

if (import.meta.main) {
  addPlasmaProject();
}
