import { useEffect, useRef, useState } from "preact/hooks";
import { createChart, IChartApi, ISeriesApi, Time } from "lightweight-charts";
import { getUserByTwitterUsername } from "../utils/ethos-api.ts";

type Sentiment = "bullish" | "bearish";

interface Signal {
  timestamp: string;
  sentiment: Sentiment;
  price?: number;
  tweetContent?: string;
  twitterUsername: string; // The user who made this signal
}

type TimeInterval = "1h" | "4h" | "1d";
type DateRange = "30d" | "90d" | "180d" | "1y" | "all";

interface Props {
  coinGeckoId?: string;
  chain?: string;
  address?: string;
  signals: Signal[];
  projectName: string;
}

export default function PriceChart({ coinGeckoId, chain, address, signals, projectName }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const [timeInterval, setTimeInterval] = useState<TimeInterval>("1h");
  const [isLoading, setIsLoading] = useState(false);
  const [userAvatars, setUserAvatars] = useState<Record<string, { displayName: string; avatarUrl: string }>>({});

  // Fetch avatars for all unique users in signals
  useEffect(() => {
    const uniqueUsernames = [...new Set(signals.map(s => s.twitterUsername))];
    
    (async () => {
      const avatarMap: Record<string, { displayName: string; avatarUrl: string }> = {};
      
      for (const username of uniqueUsernames) {
        try {
          const user = await getUserByTwitterUsername(username);
          if (user && user.avatarUrl) {
            avatarMap[username] = {
              displayName: user.displayName || username,
              avatarUrl: user.avatarUrl,
            };
          }
        } catch (error) {
          console.error(`Failed to fetch avatar for ${username}:`, error);
        }
      }
      
      setUserAvatars(avatarMap);
    })();
  }, [signals]);

  // Helper function to aggregate price data based on interval
  const aggregatePriceData = (
    data: Array<{ time: Time; value: number }>,
    interval: TimeInterval
  ): Array<{ time: Time; value: number }> => {
    if (interval === "1d" || data.length === 0) {
      // For daily, aggregate by day (take first price of each day)
      const dailyMap = new Map<string, { time: Time; value: number }>();
      for (const point of data) {
        const date = new Date((point.time as number) * 1000).toISOString().slice(0, 10);
        if (!dailyMap.has(date)) {
          dailyMap.set(date, point);
        }
      }
      return Array.from(dailyMap.values()).sort((a, b) => (a.time as number) - (b.time as number));
    }
    
    // For hourly intervals, aggregate by hour or 4-hour blocks
    const intervalMs = interval === "1h" ? 3600 : 4 * 3600; // in seconds
    const aggregated = new Map<number, { sum: number; count: number; time: Time }>();
    
    for (const point of data) {
      const bucket = Math.floor((point.time as number) / intervalMs) * intervalMs;
      if (!aggregated.has(bucket)) {
        aggregated.set(bucket, { sum: 0, count: 0, time: bucket as Time });
      }
      const agg = aggregated.get(bucket)!;
      agg.sum += point.value;
      agg.count += 1;
    }
    
    return Array.from(aggregated.values())
      .map(({ sum, count, time }) => ({ time, value: sum / count }))
      .sort((a, b) => (a.time as number) - (b.time as number));
  };

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#ffffff" },
        textColor: "#333",
      },
      grid: {
        vertLines: { color: "#f0f0f0" },
        horzLines: { color: "#f0f0f0" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        scaleMargins: {
          top: 0.1,    // Reduced from default 0.2 (10% padding instead of 20%)
          bottom: 0.1, // Reduced from default 0.2 (10% padding instead of 20%)
        },
      },
    });

    chartRef.current = chart;

    // Create area series
    const areaSeries = chart.addAreaSeries({
      lineColor: "#2962FF",
      topColor: "rgba(41, 98, 255, 0.4)",
      bottomColor: "rgba(41, 98, 255, 0.0)",
      lineWidth: 2,
    });

    seriesRef.current = areaSeries;

    // Fetch and display price data
    (async () => {
      try {
        setIsLoading(true);
        
        // Calculate date range based on user selection
        const now = Date.now();
        let startTime: number;
        
        switch (dateRange) {
          case "30d":
            startTime = now - (30 * 24 * 60 * 60 * 1000);
            break;
          case "90d":
            startTime = now - (90 * 24 * 60 * 60 * 1000);
            break;
          case "180d":
            startTime = now - (180 * 24 * 60 * 60 * 1000);
            break;
          case "1y":
            startTime = now - (365 * 24 * 60 * 60 * 1000);
            break;
          case "all":
          default: {
            // Use earliest signal or 1 year, whichever is earlier
            const timestamps = signals.map(s => new Date(s.timestamp).getTime());
            const earliestSignal = signals.length > 0 ? Math.min(...timestamps) : now - (365 * 24 * 60 * 60 * 1000);
            startTime = Math.min(earliestSignal, now - (365 * 24 * 60 * 60 * 1000));
            break;
          }
        }
        
        // Fetch price data based on what's available
        let priceData: Array<{ time: Time; value: number }> = [];
        
        if (coinGeckoId) {
          // CoinGecko provides 5-minute data through market_chart/range
          // We can aggregate this based on the selected interval
          const from = Math.floor(startTime / 1000);
          const to = Math.floor(now / 1000);
          const response = await fetch(
            `/api/price/chart?coinGeckoId=${coinGeckoId}&from=${from}&to=${to}`
          );
          const data = await response.json();
          
          if (data.prices && Array.isArray(data.prices)) {
            const rawPrices = data.prices.map(([timestamp, price]: [number, number]) => ({
              time: Math.floor(timestamp / 1000) as Time,
              value: price,
            }));
            
            // Aggregate data based on selected interval
            priceData = aggregatePriceData(rawPrices, timeInterval);
          }
        } else if (chain && address) {
          // DefiLlama only provides daily data
          // Ignore interval selection for DefiLlama (always daily)
          const days = Math.ceil((now - startTime) / (24 * 60 * 60 * 1000));
          
          const dailyPrices: Array<{ time: Time; value: number }> = [];
          
          // Fetch in parallel for better performance
          const promises = [];
          for (let i = days; i >= 0; i--) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().slice(0, 10);
            promises.push(
              fetch(`/api/price/token?chain=${chain}&address=${address}&date=${dateStr}`)
                .then(res => res.json())
                .then(data => ({ date, price: data.price }))
                .catch(() => ({ date, price: null }))
            );
          }
          
          const results = await Promise.all(promises);
          for (const { date, price } of results) {
            if (price) {
              dailyPrices.push({
                time: Math.floor(date.getTime() / 1000) as Time,
                value: price,
              });
            }
          }
          
          priceData = dailyPrices;
        }
        
        if (priceData.length > 0) {
          areaSeries.setData(priceData);
          
          // Add signal markers with bull/bear emojis
          // Use custom marker text that shows both avatar emoji placeholder and bull/bear
          const markers = signals.map(signal => {
            const timestamp = Math.floor(new Date(signal.timestamp).getTime() / 1000) as Time;
            const animalEmoji = signal.sentiment === "bullish" ? "🐂" : "🐻";
            
            return {
              time: timestamp,
              position: signal.sentiment === "bullish" ? "belowBar" as const : "aboveBar" as const,
              color: signal.sentiment === "bullish" ? "#22c55e" : "#ef4444",
              shape: "circle" as const,
              text: animalEmoji,
            };
          });
          
          areaSeries.setMarkers(markers);
          
          // Add custom HTML markers with avatar + emoji after chart renders
          if (Object.keys(userAvatars).length > 0) {
            setTimeout(() => {
              const chartContainer = chartContainerRef.current;
              if (!chartContainer) return;
              
              // Remove any existing custom markers
              const existing = chartContainer.querySelectorAll('.custom-signal-marker');
              existing.forEach(el => el.remove());
              
              signals.forEach((signal) => {
                const userAvatar = userAvatars[signal.twitterUsername];
                if (!userAvatar || !userAvatar.avatarUrl) return; // Skip if avatar not loaded
                
                const timestamp = Math.floor(new Date(signal.timestamp).getTime() / 1000);
                const animalEmoji = signal.sentiment === "bullish" ? "🐂" : "🐻";
                const color = signal.sentiment === "bullish" ? "#22c55e" : "#ef4444";
                
                // Get coordinate for this time
                const coordinate = areaSeries.priceToCoordinate(priceData.find(p => 
                  Math.abs((p.time as number) - timestamp) < 86400
                )?.value || priceData[0]?.value || 0);
                
                const timeCoordinate = chart.timeScale().timeToCoordinate(timestamp as Time);
                
                if (coordinate !== null && timeCoordinate !== null) {
                  const markerDiv = document.createElement('div');
                  markerDiv.className = 'custom-signal-marker';
                  markerDiv.style.cssText = `
                    position: absolute;
                    left: ${timeCoordinate - 20}px;
                    top: ${coordinate + (signal.sentiment === "bullish" ? 10 : -40)}px;
                    display: flex;
                    align-items: center;
                    gap: 2px;
                    pointer-events: none;
                    z-index: 10;
                  `;
                  
                  markerDiv.innerHTML = `
                    <img
                      src="${userAvatar.avatarUrl}"
                      alt="${userAvatar.displayName}"
                      style="width: 24px; height: 24px; border-radius: 50%; border: 2px solid ${color}; background: white;"
                    />
                    <span style="font-size: 16px; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));">${animalEmoji}</span>
                  `;
                  
                  chartContainer.appendChild(markerDiv);
                }
              });
            }, 100);
          }
          
          // Fit content
          chart.timeScale().fitContent();
        }
      } catch (error) {
        console.error("Failed to fetch price data for chart:", error);
      } finally {
        setIsLoading(false);
      }
    })();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    globalThis.addEventListener("resize", handleResize);

    return () => {
      globalThis.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [coinGeckoId, chain, address, signals, userAvatars, dateRange, timeInterval]);

  return (
    <div class="mt-4">
      {/* Chart Controls */}
      <div class="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div class="text-sm font-medium text-gray-700">
          {projectName} Price Chart {isLoading && <span class="text-gray-400">(Loading...)</span>}
        </div>
        
        <div class="flex gap-2 flex-wrap">
          {/* Time Interval Selector (only for CoinGecko data) */}
          {coinGeckoId && (
            <div class="flex border border-gray-300 rounded-md overflow-hidden">
              {(["1h", "4h", "1d"] as TimeInterval[]).map((interval) => (
                <button
                  key={interval}
                  type="button"
                  onClick={() => setTimeInterval(interval)}
                  class={`px-3 py-1 text-xs font-medium transition-colors ${
                    timeInterval === interval
                      ? "bg-blue-500 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                  disabled={isLoading}
                >
                  {interval}
                </button>
              ))}
            </div>
          )}
          
          {/* Date Range Selector */}
          <div class="flex border border-gray-300 rounded-md overflow-hidden">
            {(["30d", "90d", "180d", "1y", "all"] as DateRange[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDateRange(range)}
                class={`px-3 py-1 text-xs font-medium transition-colors ${
                  dateRange === range
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                disabled={isLoading}
              >
                {range === "all" ? "All" : range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Chart Container */}
      <div style={{ position: "relative" }}>
        <div ref={chartContainerRef} class="rounded-lg border border-gray-200 overflow-hidden" />
      </div>
    </div>
  );
}
