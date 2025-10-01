import { useEffect, useState } from "preact/hooks";
import { formatPerformance, type PerformanceMetrics } from "../utils/performance.ts";

interface Props {
  username: string;
  inline?: boolean; // If true, renders as fragments instead of grid
}

export default function PerformanceMetrics({ username, inline = false }: Props) {
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/performance/${username}`);
        const data = await res.json();
        setPerformance(data.overall);
      } catch (err) {
        console.error("Failed to fetch performance:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [username]);

  if (loading) {
    if (inline) {
      return (
        <>
          <div class="bg-gray-700/20 rounded-xl p-4 h-32 animate-pulse"></div>
          <div class="bg-gray-700/20 rounded-xl p-4 h-32 animate-pulse"></div>
        </>
      );
    }
    return (
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
        <div class="bg-gray-700/20 rounded-xl p-4 h-32"></div>
        <div class="bg-gray-700/20 rounded-xl p-4 h-32"></div>
      </div>
    );
  }

  if (!performance) {
    return null;
  }

  const getPerformanceColor = (perf: number | null) => {
    if (perf === null) return { bg: 'from-gray-500/20 to-gray-600/20', border: 'border-gray-500/30', icon: 'bg-gray-500', text: 'text-gray-300' };
    // Color based on positive vs negative performance
    if (perf > 0) return { bg: 'from-green-500/20 to-green-600/20', border: 'border-green-500/30', icon: 'bg-green-500', text: 'text-green-300' };
    if (perf < 0) return { bg: 'from-red-500/20 to-red-600/20', border: 'border-red-500/30', icon: 'bg-red-500', text: 'text-red-300' };
    return { bg: 'from-gray-500/20 to-gray-600/20', border: 'border-gray-500/30', icon: 'bg-gray-500', text: 'text-gray-300' };
  };

  const shortColors = getPerformanceColor(performance.shortTerm);
  const longColors = getPerformanceColor(performance.longTerm);

  const content = (
    <>
      {/* Short Term Performance */}
      <div class={`bg-gradient-to-br ${shortColors.bg} rounded-xl p-4 border ${shortColors.border} backdrop-blur-sm`}>
        <div class="flex items-center gap-2 mb-2">
          <div class={`w-8 h-8 ${shortColors.icon} rounded-lg flex items-center justify-center`}>
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <span class={`text-sm font-medium ${shortColors.text}`}>Short-Term</span>
        </div>
        <div class="text-3xl font-bold text-white mb-1">
          {performance.shortTerm !== null ? `${performance.shortTerm >= 0 ? '+' : ''}${performance.shortTerm.toFixed(0)}%` : '--'}
        </div>
        <div class="text-xs text-gray-400">
          1d: {formatPerformance(performance.d1)} • 7d: {formatPerformance(performance.d7)}
        </div>
      </div>

      {/* Long Term Performance */}
      <div class={`bg-gradient-to-br ${longColors.bg} rounded-xl p-4 border ${longColors.border} backdrop-blur-sm`}>
        <div class="flex items-center gap-2 mb-2">
          <div class={`w-8 h-8 ${longColors.icon} rounded-lg flex items-center justify-center`}>
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span class={`text-sm font-medium ${longColors.text}`}>Long-Term</span>
        </div>
        <div class="text-3xl font-bold text-white mb-1">
          {performance.longTerm !== null ? `${performance.longTerm >= 0 ? '+' : ''}${performance.longTerm.toFixed(0)}%` : '--'}
        </div>
        <div class="text-xs text-gray-400">
          28d: {formatPerformance(performance.d28)} • All: {formatPerformance(performance.allTime)}
        </div>
      </div>
    </>
  );

  if (inline) {
    return content;
  }

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {content}
    </div>
  );
}

