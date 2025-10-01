import { useEffect, useRef, useState } from "preact/hooks";
import { createChart, IChartApi, ISeriesApi, Time } from "lightweight-charts";

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
        background: { color: "rgba(0, 0, 0, 0.2)" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.05)" },
        horzLines: { color: "rgba(255, 255, 255, 0.05)" },
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
        minMove: 0.00000001, // Allow very small price movements
      },
    });

    chartRef.current = chart;

    // Create area series with high precision for low-value tokens
    const areaSeries = chart.addAreaSeries({
      lineColor: "#60a5fa",
      topColor: "rgba(96, 165, 250, 0.3)",
      bottomColor: "rgba(96, 165, 250, 0.0)",
      lineWidth: 2,
      priceFormat: {
        type: 'price',
        precision: 8,  // Show up to 8 decimal places
        minMove: 0.00000001,
      },
    });

    seriesRef.current = areaSeries;

    // Fetch and display price data
    (async () => {
      try {
        setIsLoading(true);
        
        // Calculate date range based on user selection
        const now = Date.now();
        let startTime: number;
        let displayStartTime: number; // For initial view
        
        switch (dateRange) {
          case "30d":
            displayStartTime = now - (30 * 24 * 60 * 60 * 1000);
            // Fetch 90 days so zooming out reveals more data
            startTime = now - (90 * 24 * 60 * 60 * 1000);
            break;
          case "90d":
            displayStartTime = now - (90 * 24 * 60 * 60 * 1000);
            // Fetch 180 days so zooming out reveals more data
            startTime = now - (180 * 24 * 60 * 60 * 1000);
            break;
          case "180d":
            displayStartTime = now - (180 * 24 * 60 * 60 * 1000);
            // Fetch 1 year so zooming out reveals more data
            startTime = now - (365 * 24 * 60 * 60 * 1000);
            break;
          case "1y":
            displayStartTime = now - (365 * 24 * 60 * 60 * 1000);
            // Fetch 2 years so zooming out reveals more data
            startTime = now - (2 * 365 * 24 * 60 * 60 * 1000);
            break;
          case "all":
          default: {
            // Show data from 60 days before earliest signal, or 2 years if no signals
            if (signals.length > 0) {
              const timestamps = signals.map(s => new Date(s.timestamp).getTime());
              const earliestSignal = Math.min(...timestamps);
              // Add 60 days of context before the earliest signal
              startTime = earliestSignal - (60 * 24 * 60 * 60 * 1000);
              displayStartTime = startTime; // Show all in "All" mode
            } else {
              // Default to 2 years of data if no signals
              startTime = now - (2 * 365 * 24 * 60 * 60 * 1000);
              displayStartTime = startTime;
            }
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
          
          // Show markers with usernames
          const markers = signals.map(signal => {
            const timestamp = Math.floor(new Date(signal.timestamp).getTime() / 1000) as Time;
            const isBullish = signal.sentiment === "bullish";
            
            return {
              time: timestamp,
              position: isBullish ? "belowBar" as const : "aboveBar" as const,
              color: isBullish ? "#22c55e" : "#ef4444",
              shape: isBullish ? "arrowUp" as const : "arrowDown" as const,
              text: signal.twitterUsername,
            };
          });
          
          areaSeries.setMarkers(markers);
          
          // Set initial visible range based on selected date range
          // This allows zooming out to reveal the extra fetched data
          if (dateRange !== "all") {
            const displayFrom = Math.floor(displayStartTime / 1000) as Time;
            const displayTo = Math.floor(now / 1000) as Time;
            chart.timeScale().setVisibleRange({ from: displayFrom, to: displayTo });
          } else {
            // For "All" mode, fit all content
            chart.timeScale().fitContent();
          }
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
  }, [coinGeckoId, chain, address, signals, dateRange, timeInterval]);

  return (
    <div class="mt-4">
      {/* Chart Controls */}
      <div class="mb-3 flex items-center justify-between flex-wrap gap-2">
        <div class="text-sm font-medium text-white">
          {projectName} Price Chart {isLoading && <span class="text-gray-500">(Loading...)</span>}
        </div>
        
        <div class="flex gap-2 flex-wrap">
          {/* Time Interval Selector (only for CoinGecko data) */}
          {coinGeckoId && (
            <div class="flex border border-white/20 rounded-xl overflow-hidden backdrop-blur-sm">
              {(["1h", "4h", "1d"] as TimeInterval[]).map((interval) => (
                <button
                  key={interval}
                  type="button"
                  onClick={() => setTimeInterval(interval)}
                  class={`px-3 py-1 text-xs font-medium transition-all duration-200 ${
                    timeInterval === interval
                      ? "bg-blue-500 text-white"
                      : "bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                  disabled={isLoading}
                >
                  {interval}
                </button>
              ))}
            </div>
          )}
          
          {/* Date Range Selector */}
          <div class="flex border border-white/20 rounded-xl overflow-hidden backdrop-blur-sm">
            {(["30d", "90d", "180d", "1y", "all"] as DateRange[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDateRange(range)}
                class={`px-3 py-1 text-xs font-medium transition-all duration-200 ${
                  dateRange === range
                    ? "bg-blue-500 text-white"
                    : "bg-white/5 text-gray-300 hover:bg-white/10"
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
        <div ref={chartContainerRef} class="rounded-2xl border border-white/10 overflow-hidden glass-subtle" />
      </div>
    </div>
  );
}
