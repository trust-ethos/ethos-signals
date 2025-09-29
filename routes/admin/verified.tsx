import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
// Admin page is server-rendered; client logic is injected below.
import { VerifiedProject, listVerifiedProjects } from "../../utils/database.ts";
import AdminVerified from "../../islands/AdminVerified.tsx";

interface Data {
  items: VerifiedProject[];
}

// Simple authentication middleware
function checkAuth(req: Request): boolean {
  const adminPassword = Deno.env.get("ADMIN_PASSWORD");
  
  // If no password is set in env, allow access (for development)
  if (!adminPassword) {
    console.warn("⚠️  ADMIN_PASSWORD not set - admin page is unprotected!");
    return true;
  }

  const authHeader = req.headers.get("Authorization");
  
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  try {
    const base64Credentials = authHeader.slice(6);
    const credentials = atob(base64Credentials);
    const [_username, password] = credentials.split(":");
    
    // Simple check - username can be anything, just check password
    return password === adminPassword;
  } catch {
    return false;
  }
}

function unauthorizedResponse(): Response {
  return new Response("Unauthorized", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Admin Area"',
    },
  });
}

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    // Check authentication
    if (!checkAuth(req)) {
      return unauthorizedResponse();
    }

    const items = await listVerifiedProjects();
    return ctx.render({ items });
  },
};

export default function VerifiedAdminPage({ data }: PageProps<Data>) {
  return (
    <>
      <Head>
        <title>Signals Admin - Verified Projects</title>
      </Head>
      <div class="min-h-screen gradient-mesh">
        <div class="max-w-5xl mx-auto px-4 py-8">
          <h1 class="text-3xl font-bold mb-6 text-white">Verified Projects</h1>
          <AdminVerified initialItems={data.items} />
        </div>
      </div>
    </>
  );
}


