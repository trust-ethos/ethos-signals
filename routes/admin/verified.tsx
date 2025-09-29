import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
// Admin page is server-rendered; client logic is injected below.
import { VerifiedProject, listVerifiedProjects } from "../../utils/database.ts";
import AdminVerified from "../../islands/AdminVerified.tsx";

interface Data {
  items: VerifiedProject[];
}

export const handler: Handlers<Data> = {
  async GET(_, ctx) {
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
      <div class="min-h-screen bg-gray-50">
        <div class="max-w-5xl mx-auto px-4 py-8">
          <h1 class="text-2xl font-bold mb-6">Verified Projects</h1>
          <AdminVerified initialItems={data.items} />
        </div>
      </div>
    </>
  );
}


