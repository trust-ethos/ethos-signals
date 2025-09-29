#!/usr/bin/env -S deno run -A --watch=static/,routes/

import dev from "$fresh/dev.ts";
import config from "./fresh.config.ts";
import { initializeDatabase } from "./utils/db.ts";

import "$std/dotenv/load.ts";

// Initialize database tables in development
try {
  await initializeDatabase();
  console.log("✅ Database initialized successfully");
} catch (error) {
  console.error("❌ Failed to initialize database:", error);
  console.log("Make sure your DATABASE_URL environment variable is set correctly");
}

await dev(import.meta.url, "./main.ts", config);

