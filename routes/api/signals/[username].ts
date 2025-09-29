import { Handlers } from "$fresh/server.ts";
import { createUlid, deleteTestSignal, listTestSignals, saveTestSignal, type SignalSentiment } from "../../../utils/database.ts";

export const handler: Handlers = {
  async OPTIONS() {
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
    });
    return new Response(JSON.stringify({ ok, id }), {
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


