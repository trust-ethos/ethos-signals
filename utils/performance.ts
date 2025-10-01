// Performance calculation utilities for trading signals

export interface PerformanceMetrics {
  shortTerm: number | null; // Average of 1d and 7d
  longTerm: number | null;  // Average of 28d and all-time
  d1: number | null;
  d7: number | null;
  d28: number | null;
  allTime: number | null;
  totalSignals: number;
  correctSignals: {
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
    
    // 1 day performance
    if (callPrice && signal.priceAt1d !== null && signal.priceAt1d !== undefined) {
      count1d++;
      const priceChange = ((signal.priceAt1d - callPrice) / callPrice) * 100;
      if (isSignalCorrect(signal.sentiment, priceChange)) {
        correct1d++;
      }
    }
    
    // 7 day performance
    if (callPrice && signal.priceAt7d !== null && signal.priceAt7d !== undefined) {
      count7d++;
      const priceChange = ((signal.priceAt7d - callPrice) / callPrice) * 100;
      if (isSignalCorrect(signal.sentiment, priceChange)) {
        correct7d++;
      }
    }
    
    // 28 day performance
    if (callPrice && signal.priceAt28d !== null && signal.priceAt28d !== undefined) {
      count28d++;
      const priceChange = ((signal.priceAt28d - callPrice) / callPrice) * 100;
      if (isSignalCorrect(signal.sentiment, priceChange)) {
        correct28d++;
      }
    }
    
    // All-time performance (current price)
    if (callPrice && signal.currentPrice !== null && signal.currentPrice !== undefined) {
      countAllTime++;
      const priceChange = ((signal.currentPrice - callPrice) / callPrice) * 100;
      if (isSignalCorrect(signal.sentiment, priceChange)) {
        correctAllTime++;
      }
    }
  }
  
  // Calculate percentages
  const d1Accuracy = count1d > 0 ? (correct1d / count1d) * 100 : null;
  const d7Accuracy = count7d > 0 ? (correct7d / count7d) * 100 : null;
  const d28Accuracy = count28d > 0 ? (correct28d / count28d) * 100 : null;
  const allTimeAccuracy = countAllTime > 0 ? (correctAllTime / countAllTime) * 100 : null;
  
  // Calculate short-term (average of 1d and 7d)
  const shortTermValues = [d1Accuracy, d7Accuracy].filter(v => v !== null) as number[];
  const shortTerm = shortTermValues.length > 0 
    ? shortTermValues.reduce((a, b) => a + b, 0) / shortTermValues.length 
    : null;
  
  // Calculate long-term (average of 28d and all-time)
  const longTermValues = [d28Accuracy, allTimeAccuracy].filter(v => v !== null) as number[];
  const longTerm = longTermValues.length > 0 
    ? longTermValues.reduce((a, b) => a + b, 0) / longTermValues.length 
    : null;
  
  return {
    shortTerm,
    longTerm,
    d1: d1Accuracy,
    d7: d7Accuracy,
    d28: d28Accuracy,
    allTime: allTimeAccuracy,
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

