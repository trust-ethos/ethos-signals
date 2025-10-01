// Performance calculation utilities for trading signals

export interface PerformanceMetrics {
  shortTerm: number | null; // Average return % across 1d and 7d periods
  longTerm: number | null;  // Average return % across 28d and all-time periods
  d1: number | null;        // Average 1-day return %
  d7: number | null;        // Average 7-day return %
  d28: number | null;       // Average 28-day return %
  allTime: number | null;   // Average all-time return %
  totalSignals: number;
  correctSignals: {         // Count of correct predictions (for reference)
    d1: number;
    d7: number;
    d28: number;
    allTime: number;
  };
}

export interface SignalWithPrice {
  id: string;
  sentiment: 'bullish' | 'bearish';
  notedAt: string;
  tweetTimestamp?: string;
  priceAtCall?: number | null;
  priceAt1d?: number | null;
  priceAt7d?: number | null;
  priceAt28d?: number | null;
  currentPrice?: number | null;
}

/**
 * Calculate if a signal was correct based on price movement and sentiment
 */
function isSignalCorrect(
  sentiment: 'bullish' | 'bearish',
  priceChange: number | null
): boolean | null {
  if (priceChange === null) return null;
  
  if (sentiment === 'bullish') {
    return priceChange > 0; // Bullish is correct if price went up
  } else {
    return priceChange < 0; // Bearish is correct if price went down
  }
}

/**
 * Calculate performance metrics for a set of signals
 * Returns average percentage returns, not accuracy
 */
export function calculatePerformance(signals: SignalWithPrice[]): PerformanceMetrics {
  const totalSignals = signals.length;
  
  if (totalSignals === 0) {
    return {
      shortTerm: null,
      longTerm: null,
      d1: null,
      d7: null,
      d28: null,
      allTime: null,
      totalSignals: 0,
      correctSignals: { d1: 0, d7: 0, d28: 0, allTime: 0 }
    };
  }
  
  let sum1d = 0;
  let sum7d = 0;
  let sum28d = 0;
  let sumAllTime = 0;
  
  let correct1d = 0;
  let correct7d = 0;
  let correct28d = 0;
  let correctAllTime = 0;
  
  let count1d = 0;
  let count7d = 0;
  let count28d = 0;
  let countAllTime = 0;
  
  for (const signal of signals) {
    const callPrice = signal.priceAtCall;
    
    // Calculate signal age
    const timestamp = signal.tweetTimestamp || `${signal.notedAt}T12:00:00Z`;
    const signalDate = new Date(timestamp);
    const now = new Date();
    const daysSinceSignal = (now.getTime() - signalDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // 1 day performance
    if (callPrice && signal.priceAt1d !== null && signal.priceAt1d !== undefined) {
      count1d++;
      const priceChange = ((signal.priceAt1d - callPrice) / callPrice) * 100;
      sum1d += priceChange;
      if (isSignalCorrect(signal.sentiment, priceChange)) {
        correct1d++;
      }
    }
    
    // 7 day performance
    if (callPrice && signal.priceAt7d !== null && signal.priceAt7d !== undefined) {
      count7d++;
      const priceChange = ((signal.priceAt7d - callPrice) / callPrice) * 100;
      sum7d += priceChange;
      if (isSignalCorrect(signal.sentiment, priceChange)) {
        correct7d++;
      }
    }
    
    // 28 day performance
    if (callPrice && signal.priceAt28d !== null && signal.priceAt28d !== undefined) {
      count28d++;
      const priceChange = ((signal.priceAt28d - callPrice) / callPrice) * 100;
      sum28d += priceChange;
      if (isSignalCorrect(signal.sentiment, priceChange)) {
        correct28d++;
      }
    }
    
    // All-time performance (current price) - only for signals 28+ days old
    if (callPrice && signal.currentPrice !== null && signal.currentPrice !== undefined && daysSinceSignal >= 28) {
      countAllTime++;
      const priceChange = ((signal.currentPrice - callPrice) / callPrice) * 100;
      sumAllTime += priceChange;
      if (isSignalCorrect(signal.sentiment, priceChange)) {
        correctAllTime++;
      }
    }
  }
  
  // Calculate average returns (not accuracy)
  const d1Avg = count1d > 0 ? sum1d / count1d : null;
  const d7Avg = count7d > 0 ? sum7d / count7d : null;
  const d28Avg = count28d > 0 ? sum28d / count28d : null;
  const allTimeAvg = countAllTime > 0 ? sumAllTime / countAllTime : null;
  
  // Calculate short-term (average of 1d and 7d returns)
  const shortTermValues = [d1Avg, d7Avg].filter(v => v !== null) as number[];
  const shortTerm = shortTermValues.length > 0 
    ? shortTermValues.reduce((a, b) => a + b, 0) / shortTermValues.length 
    : null;
  
  // Calculate long-term (average of 28d and all-time returns)
  const longTermValues = [d28Avg, allTimeAvg].filter(v => v !== null) as number[];
  const longTerm = longTermValues.length > 0 
    ? longTermValues.reduce((a, b) => a + b, 0) / longTermValues.length 
    : null;
  
  return {
    shortTerm,
    longTerm,
    d1: d1Avg,
    d7: d7Avg,
    d28: d28Avg,
    allTime: allTimeAvg,
    totalSignals,
    correctSignals: {
      d1: correct1d,
      d7: correct7d,
      d28: correct28d,
      allTime: correctAllTime
    }
  };
}

/**
 * Calculate aggregate performance across multiple assets
 */
export function calculateAggregatePerformance(
  signalsByAsset: Record<string, SignalWithPrice[]>
): PerformanceMetrics {
  // Combine all signals from all assets
  const allSignals = Object.values(signalsByAsset).flat();
  return calculatePerformance(allSignals);
}

/**
 * Format performance percentage for display
 */
export function formatPerformance(performance: number | null): string {
  if (performance === null) return '--';
  return `${performance >= 0 ? '+' : ''}${performance.toFixed(0)}%`;
}

