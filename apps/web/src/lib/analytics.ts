// Analytics types
export interface AnalyticsEvent {
  name: string;
  parameters?: Record<string, unknown>;
  timestamp?: number;
}

export interface AnalyticsPageView {
  path: string;
  title?: string;
  referrer?: string;
  timestamp?: number;
}

// Analytics configuration
export const ANALYTICS_CONFIG = {
  googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID || "G-XXXXXXXXXX",
  enabled: process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true",
  debug: process.env.NODE_ENV === "development",
} as const;

// Queue for events when page is not visible
let eventQueue: AnalyticsEvent[] = [];
let isInitialized = false;

// Initialize analytics
function initializeAnalytics() {
  if (isInitialized || !ANALYTICS_CONFIG.enabled) {
    return;
  }

  // Load Google Analytics script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_CONFIG.googleAnalyticsId}`;
  document.head.appendChild(script);

  script.onload = () => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("js", new Date());
      window.gtag("config", ANALYTICS_CONFIG.googleAnalyticsId, {
        page_title: document.title,
        page_location: window.location.href,
        anonymize_ip: true,
        allow_ad_personalization_signals: false,
      });
    }
    isInitialized = true;

    // Flush queued events
    eventQueue.forEach((event) => sendEventInternal(event));
    eventQueue = [];
  };
}

// Send event (internal)
function sendEventInternal(event: AnalyticsEvent) {
  if (!ANALYTICS_CONFIG.enabled) {
    return;
  }

  const fullEvent: AnalyticsEvent = {
    ...event,
    timestamp: event.timestamp || Date.now(),
  };

  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", fullEvent.name, fullEvent.parameters);
  } else {
    // Queue event for later
    eventQueue.push(fullEvent);
  }

  if (ANALYTICS_CONFIG.debug) {
    // eslint-disable-next-line no-console
    console.log("[Analytics]", fullEvent);
  }
}

// Public API
export const analytics = {
  // Page view tracking
  pageview: (path: string, options?: { title?: string; referrer?: string }) => {
    if (typeof window === "undefined") {
      return;
    }

    initializeAnalytics();

    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("config", ANALYTICS_CONFIG.googleAnalyticsId, {
        page_path: path,
        page_title: options?.title,
        document_referrer: options?.referrer,
      });
    }

    // Also send as custom event for tracking
    sendEventInternal({
      name: "page_view",
      parameters: {
        path,
        title: options?.title || document.title,
        referrer: options?.referrer || document.referrer,
      },
    });
  },

  // Custom event tracking
  event: (name: string, parameters?: Record<string, unknown>) => {
    sendEventInternal({ name, parameters });
  },

  // Track user interaction
  track: (eventName: string, properties?: Record<string, unknown>) => {
    sendEventInternal({
      name: eventName,
      parameters: properties,
    });
  },

  // Track errors
  error: (error: Error, context?: Record<string, unknown>) => {
    sendEventInternal({
      name: "error",
      parameters: {
        message: error.message,
        stack: error.stack,
        ...context,
      },
    });
  },

  // Performance timing
  timing: (variableName: string, value: number, category?: string) => {
    sendEventInternal({
      name: "timing_complete",
      parameters: {
        name: variableName,
        value,
        category: category || "web_vitals",
      },
    });
  },

  // Identify user (for logged-in users)
  identify: (userId: string, traits?: Record<string, unknown>) => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("set", { user_id: userId });
      if (traits) {
        window.gtag("set", { user_properties: traits });
      }
    }
  },

  // Reset user session
  reset: () => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("set", { user_id: null });
    }
  },
};

// Type declaration for window.gtag
declare global {
  interface Window {
    gtag?: (
      command: "js" | "config" | "event" | "set",
      ...args: unknown[]
    ) => void;
    dataLayer?: unknown[];
  }
}
