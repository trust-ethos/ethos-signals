#!/usr/bin/env -S deno run -A
// Deno Deploy entrypoint for Ethos Signals

import "$std/dotenv/load.ts";
import { start } from "$fresh/server.ts";
import manifest from "./fresh.gen.ts";
import config from "./fresh.config.ts";
import { initializeDatabase } from "./utils/db.ts";

// Initialize database tables
try {
  await initializeDatabase();
  console.log("✅ Database initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize database:", error);
  console.log("Make sure your DATABASE_URL environment variable is set correctly");
  // Throw error instead of Deno.exit() for Deno Deploy compatibility
  throw new Error("Database initialization failed. Check DATABASE_URL environment variable.");
}

await start(manifest, config);

