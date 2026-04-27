// Web Vitals types
export interface WebVital {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
}

// Core Web Vitals metrics
export const CORE_WEB_VITALS = {
  LCP: "Largest Contentful Paint",
  FID: "First Input Delay",
  CLS: "Cumulative Layout Shift",
  FCP: "First Contentful Paint",
  TTFB: "Time to First Byte",
} as const;

// Thresholds for ratings (in ms or unitless for CLS)
const VITAL_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
};

// Rating helper
export function getRating(value: number, metric: keyof typeof VITAL_THRESHOLDS): "good" | "needs-improvement" | "poor" {
  const thresholds = VITAL_THRESHOLDS[metric];
  if (value <= thresholds.good) {
    return "good";
  }
  if (value <= thresholds.poor) {
    return "needs-improvement";
  }
  return "poor";
}

// Format value for display
export function formatVitalValue(metric: keyof typeof VITAL_THRESHOLDS, value: number): string {
  switch (metric) {
    case "CLS":
      return value.toFixed(3);
    default:
      return `${Math.round(value)}ms`;
  }
}

// Send Web Vitals to analytics
export function sendWebVitalToAnalytics(metric: WebVital) {
  if (typeof window === "undefined" || !window.gtag) {
    return;
  }

  const { name, value, rating } = metric;

  // Send as custom event
  window.gtag("event", "web_vital", {
    event_category: "Web Vitals",
    event_label: name,
    value: Math.round(value),
    metric_rating: rating,
    metric_name: name,
  });
}

// Report Web Vitals
export function reportWebVitals(metric: { name: string; value: number; delta: number }) {
  const fullName = CORE_WEB_VITALS[metric.name as keyof typeof CORE_WEB_VITALS] || metric.name;
  const rating = getRating(metric.value, metric.name as keyof typeof VITAL_THRESHOLDS);

  const webVital: WebVital = {
    name: fullName,
    value: metric.value,
    rating,
    delta: metric.delta,
  };

  // Send to analytics
  sendWebVitalToAnalytics(webVital);

  // Log in development
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log(`[Web Vitals] ${fullName}:`, {
      value: formatVitalValue(metric.name as keyof typeof VITAL_THRESHOLDS, metric.value),
      rating,
      delta: metric.delta,
    });
  }

  return webVital;
}

// Initialize Web Vitals monitoring
export function initializeWebVitals() {
  if (typeof window === "undefined") {
    return;
  }

  // Check for the Web Vitals API
  const getWebVitals = async () => {
    try {
      // Dynamic import of web-vitals (v5+ uses onINP instead of onFID)
      const { onCLS, onFCP, onINP, onLCP, onTTFB } = await import("web-vitals");

      // Set up observers for each metric
      onCLS((metric) => reportWebVitals(metric));
      onFCP((metric) => reportWebVitals(metric));
      onINP((metric) => reportWebVitals(metric)); // INP replaces FID in web-vitals v5
      onLCP((metric) => reportWebVitals(metric));
      onTTFB((metric) => reportWebVitals(metric));
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.warn("Web Vitals library not available:", error);
      }
    }
  };

  // Only load in production
  if (process.env.NODE_ENV === "production") {
    getWebVitals();
  }
}

// Performance observer for custom metrics
export function measureCustomMetric(name: string, startTime: number, endTime?: number) {
  const duration = endTime ? endTime - startTime : performance.now() - startTime;

  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "custom_timing", {
      event_category: "Performance",
      event_label: name,
      value: Math.round(duration),
    });
  }

  return duration;
}

// Mark for performance timing
export const perfMark = (name: string) => {
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(name);
  }
};

// Measure from mark
export const perfMeasure = (name: string, startMark: string, endMark?: string) => {
  if (typeof performance !== "undefined" && performance.measure) {
    const end = endMark || `${name}_end`;
    try {
      performance.measure(name, startMark, end);
      const [measure] = performance.getEntriesByName(name);
      if (measure) {
        return measure.duration;
      }
    } catch (error) {
      // Measure might not exist if endMark doesn't exist
      if (process.env.NODE_ENV === "development") {
        // eslint-disable-next-line no-console
        console.warn("Performance measure error:", error);
      }
    }
  }
  return null;
};

// Clear performance marks
export const clearPerfMarks = () => {
  if (typeof performance !== "undefined" && performance.clearMarks) {
    performance.clearMarks();
  }
  if (typeof performance !== "undefined" && performance.clearMeasures) {
    performance.clearMeasures();
  }
};
