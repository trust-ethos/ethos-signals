import { Head } from "$fresh/runtime.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import { EthosUser, getUserByTwitterUsername, getUserScore } from "../../utils/ethos-api.ts";
import { Card, CardContent } from "../../components/ui/Card.tsx";
import { Badge } from "../../components/ui/Badge.tsx";
import { Button } from "../../components/ui/Button.tsx";
import SignalsForm from "../../islands/SignalsForm.tsx";

interface ProfileData {
  user: EthosUser;
  scoreDetails: { score?: number; level: string };
}

export const handler: Handlers<ProfileData | null> = {
  async GET(_req, ctx) {
    const { username } = ctx.params;
    
    try {
      const user = await getUserByTwitterUsername(username);
      
      if (!user) {
        return ctx.renderNotFound();
      }

      // Get additional score details using the best available userkey
      const userkey = user.profileId ? `profileId:${user.profileId}` : user.userkeys[0];
      const scoreDetails = await getUserScore(userkey);

      return ctx.render({ user, scoreDetails });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      return ctx.renderNotFound();
    }
  },
};

export default function ProfilePage({ data }: PageProps<ProfileData | null>) {
  if (!data) {
    return (
      <>
        <Head>
          <title>Profile Not Found - Signals</title>
        </Head>
        <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          <Card class="max-w-md mx-auto">
            <CardContent class="p-8 text-center">
              <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h1 class="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h1>
              <p class="text-gray-600 mb-6">The user you're looking for doesn't exist or isn't connected to Ethos.</p>
              <a href="/">
                <Button variant="outline">
                  ← Back to Search
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const { user, scoreDetails } = data;

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 2000) return "success";
    if (score >= 1600) return "default";
    if (score >= 1200) return "secondary";
    if (score >= 800) return "warning";
    return "destructive";
  };

  const getScoreLevel = (score: number) => {
    if (score >= 2000) return "Exemplary";
    if (score >= 1600) return "Reputable";
    if (score >= 1200) return "Neutral";
    if (score >= 800) return "Questionable";
    return "Untrusted";
  };

  return (
    <>
      <Head>
        <title>{user.displayName} - Signals Profile</title>
        <meta name="description" content={`View ${user.displayName}'s Ethos profile and trading signals history.`} />
      </Head>
      
      <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Navigation */}
        <nav class="border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between h-16">
              <div class="flex items-center">
                <a href="/" class="mr-4">
                  <Button variant="ghost">
                    <div class="flex items-center">
                      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      <span>Back to Search</span>
                    </div>
                  </Button>
                </a>
                <img src="/logo.svg" width="32" height="32" alt="Signals logo" class="mr-3" />
                <span class="text-xl font-bold text-gray-900">Signals</span>
              </div>
            </div>
          </div>
        </nav>

        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Profile Header Card */}
          <Card class="mb-8 backdrop-blur-sm bg-white/90 border-gray-200/50">
            <CardContent class="p-8">
              <div class="flex flex-col lg:flex-row items-start gap-8">
                {/* Avatar and Basic Info */}
                <div class="flex flex-col items-center lg:items-start">
                  <div class="relative">
                    <img
                      src={user.avatarUrl}
                      alt={user.displayName}
                      class="w-32 h-32 rounded-full ring-4 ring-white shadow-lg"
                    />
                    {user.status === "ACTIVE" && (
                      <div class="absolute -bottom-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-4 border-white"></div>
                    )}
                  </div>
                  
                  <div class="mt-6 flex gap-3">
                    <Button variant="outline" size="sm" onClick={() => { globalThis.open(user.links.profile, '_blank'); }}>
                      <div class="flex items-center">
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span>View on Ethos</span>
                      </div>
                    </Button>
                    {user.username && (
                      <Button variant="outline" size="sm" onClick={() => { globalThis.open(`https://twitter.com/${user.username}`, '_blank'); }}>
                        <div class="flex items-center">
                          <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          <span>View on Twitter</span>
                        </div>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Profile Details */}
                <div class="flex-1 w-full">
                  <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6">
                    <div>
                      <h1 class="text-4xl font-bold text-gray-900 mb-3">
                        {user.displayName}
                      </h1>
                      {user.username && (
                        <p class="text-xl text-gray-600 mb-3">@{user.username}</p>
                      )}
                      <Badge variant={getScoreBadgeVariant(user.score)} class="text-sm">
                        {`${getScoreLevel(user.score)} • ${scoreDetails.level}`}
                      </Badge>
                    </div>
                  </div>

                  {user.description && (
                    <p class="text-gray-700 mb-6 text-lg leading-relaxed">{user.description}</p>
                  )}

                  {/* Stats Grid */}
                  <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200/50">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <span class="text-sm font-medium text-blue-700">Ethos Score</span>
                      </div>
                      <div class="text-3xl font-bold text-blue-900">{user.score}</div>
                    </div>

                    <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200/50">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                        </div>
                        <span class="text-sm font-medium text-green-700">Positive Reviews</span>
                      </div>
                      <div class="text-3xl font-bold text-green-900">{user.stats.review.received.positive}</div>
                      <div class="text-xs text-green-600">
                        {user.stats.review.received.neutral} neutral
                      </div>
                    </div>

                    <div class="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 border border-red-200/50">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                          </svg>
                        </div>
                        <span class="text-sm font-medium text-red-700">Negative Reviews</span>
                      </div>
                      <div class="text-3xl font-bold text-red-900">{user.stats.review.received.negative}</div>
                    </div>

                    <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200/50">
                      <div class="flex items-center gap-2 mb-2">
                        <div class="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <span class="text-sm font-medium text-orange-700">Vouches</span>
                      </div>
                      <div class="text-3xl font-bold text-orange-900">{user.stats.vouch.received.count}</div>
                      <div class="text-xs text-orange-600">
                        {(parseFloat(user.stats.vouch.received.amountWeiTotal.toString()) / 1e18).toFixed(2)} ETH
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signals History */}
          <SignalsForm username={user.username || user.displayName} />
        </div>
      </div>
    </>
  );
}
