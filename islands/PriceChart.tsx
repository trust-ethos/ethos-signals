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
  const [iconMarkers, setIconMarkers] = useState<Array<{
    x: number;
    y: number;
    type: "bull" | "bear";
  }>>([]);

  // Update icon marker positions
  const updateIconMarkers = () => {
    const chart = chartRef.current;
    const series = areaSeriesRef.current;
    if (!chart || !series) {
      console.log('No chart or series ref');
      return;
    }
    
    const markers: typeof iconMarkers = [];
    const visibleRange = chart.timeScale().getVisibleRange();
    if (!visibleRange) {
      console.log('No visible range');
      return;
    }
    
    // Get actual data points from the series
    const seriesData = priceData;
    if (seriesData.length === 0) {
      console.log('No price data available');
      return;
    }
    
    console.log(`Updating icon markers for ${signals.length} signals, ${seriesData.length} price points`);
    
    // For each signal, find the nearest price data point
    signals.forEach((signal, idx) => {
      const signalTimestamp = Math.floor(new Date(signal.timestamp).getTime() / 1000);
      
      // Check if in visible range
      if (signalTimestamp < visibleRange.from || signalTimestamp > visibleRange.to) {
        return;
      }
      
      // Find the nearest price data point
      let nearestPoint = seriesData[0];
      let minDiff = Math.abs(Number(seriesData[0].time) - signalTimestamp);
      
      for (const point of seriesData) {
        const diff = Math.abs(Number(point.time) - signalTimestamp);
        if (diff < minDiff) {
          minDiff = diff;
          nearestPoint = point;
        }
      }
      
      // Use the nearest point's timestamp for positioning
      const x = chart.timeScale().timeToCoordinate(nearestPoint.time);
      if (x === null) {
        console.log(`Signal ${idx}: Could not get coordinate for nearest point`);
        return;
      }
      
      // Get the price coordinate (y position)
      const y = series.priceToCoordinate(nearestPoint.value);
      if (y === null) {
        console.log(`Signal ${idx}: Could not get price coordinate`);
        return;
      }
      
      markers.push({
        x,
        y: y - (signal.sentiment === "bullish" ? 30 : -30), // Offset above/below the actual price
        type: signal.sentiment === "bullish" ? "bull" : "bear",
      });
    });
    
    console.log(`Setting ${markers.length} icon markers`);
    setIconMarkers(markers);
  };

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
          
          // No built-in markers - we'll use SVG overlay instead
          
          // Update icon positions after chart renders
          setTimeout(() => {
            updateIconMarkers();
          }, 100);
          
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
        updateIconMarkers();
      }
    };

    // Subscribe to visible range changes (pan/zoom)
    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleLogicalRangeChange(() => {
      updateIconMarkers();
    });

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
        
        {/* SVG Icon Overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          {console.log(`Rendering ${iconMarkers.length} icon markers in JSX`)}
          {iconMarkers.map((marker, idx) => (
            <img
              key={idx}
              src={marker.type === "bull" ? "/bull.svg" : "/bear.svg"}
              alt={marker.type}
              style={{
                position: "absolute",
                left: `${marker.x - 12}px`,
                top: `${marker.y - 12}px`,
                width: "24px",
                height: "24px",
                pointerEvents: "auto",
                cursor: "pointer",
                transition: "transform 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
