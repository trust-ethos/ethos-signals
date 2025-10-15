import { Handlers, PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import { listVerifiedProjects } from "../utils/database.ts";

interface ProjectWithStats {
  id: string;
  twitterUsername: string;
  displayName: string;
  avatarUrl: string;
  type: "token" | "nft" | "pre_tge";
  chain?: string;
  ticker?: string;
  signalCount: number;
}

interface ProjectsPageData {
  projects: ProjectWithStats[];
}

export const handler: Handlers<ProjectsPageData> = {
  async GET(_req, ctx) {
    const allProjects = await listVerifiedProjects();
    
    // Get signal counts for each project
    const { getSignalsByProject } = await import("../utils/database.ts");
    
    const projectsWithStats = await Promise.all(
      allProjects.map(async (project) => {
        const signals = await getSignalsByProject(project.twitterUsername);
        return {
          id: project.id,
          twitterUsername: project.twitterUsername,
          displayName: project.displayName,
          avatarUrl: project.avatarUrl,
          type: project.type,
          chain: project.chain,
          ticker: project.ticker,
          signalCount: signals.length,
        };
      })
    );
    
    // Sort by signal count (highest first)
    projectsWithStats.sort((a, b) => b.signalCount - a.signalCount);
    
    return ctx.render({ projects: projectsWithStats });
  },
};

export default function ProjectsPage({ data }: PageProps<ProjectsPageData>) {
  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "token": return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "nft": return "bg-purple-500/20 text-purple-400 border-purple-500/50";
      case "pre_tge": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };
  
  const getTypeLabel = (type: string) => {
    switch (type) {
      case "token": return "Token";
      case "nft": return "NFT";
      case "pre_tge": return "Pre-TGE";
      default: return type;
    }
  };

  return (
    <>
      <Head>
        <title>Verified Projects - Ethos Signals</title>
        <meta name="description" content="Browse all verified crypto projects tracked on Ethos Signals" />
      </Head>
      
      <div class="min-h-screen gradient-mesh">
        {/* Navigation */}
        <nav class="glass-nav fixed top-0 left-0 right-0 z-50">
          <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <a href="/" class="flex items-center group">
                  <span class="text-xl font-bold text-white">Signals</span>
                </a>
              </div>
              <div class="flex items-center space-x-4">
                <a 
                  href="/projects" 
                  class="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                >
                  Verified Projects
                </a>
                <a 
                  href="/admin/verified" 
                  class="text-gray-300 hover:text-white font-medium transition-colors"
                >
                  Admin
                </a>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div class="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
          <div class="mb-8">
            <h1 class="text-4xl font-bold text-white mb-4">Verified Projects</h1>
            <p class="text-xl text-gray-400">
              Browse all tracked crypto projects with verified trading signals
            </p>
          </div>

          {/* Projects Grid */}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.projects.map((project) => {
              const urlType = project.type === 'pre_tge' ? 'pre-tge' : project.type;
              return (
              <a
                key={project.id}
                href={`/${urlType}/${project.twitterUsername}`}
                class="glass-strong rounded-xl p-6 border border-white/10 hover:bg-white/10 transition-all group"
              >
                <div class="flex items-start gap-4">
                  <img 
                    src={project.avatarUrl} 
                    alt={project.displayName}
                    class="w-16 h-16 rounded-full border-2 border-blue-500/50 group-hover:scale-110 transition-transform"
                  />
                  <div class="flex-1 min-w-0">
                    <h3 class="text-lg font-bold text-white mb-1 truncate group-hover:text-blue-400 transition-colors">
                      {project.displayName}
                    </h3>
                    <p class="text-sm text-gray-400 mb-2 truncate">
                      @{project.twitterUsername}
                    </p>
                    
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class={`px-2 py-1 rounded-md text-xs font-semibold border ${getTypeBadgeColor(project.type)}`}>
                        {getTypeLabel(project.type)}
                      </span>
                      {project.ticker && (
                        <span class="px-2 py-1 rounded-md text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/50">
                          ${project.ticker}
                        </span>
                      )}
                      {project.chain && (
                        <span class="px-2 py-1 rounded-md text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/50 capitalize">
                          {project.chain}
                        </span>
                      )}
                    </div>
                    
                    <div class="mt-3 flex items-center gap-4 text-sm">
                      <div>
                        <span class="text-white font-bold">{project.signalCount}</span>
                        <span class="text-gray-400 ml-1">signals</span>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
              );
            })}
          </div>
          
          {data.projects.length === 0 && (
            <div class="text-center py-12">
              <p class="text-gray-400 text-lg">No verified projects yet</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

