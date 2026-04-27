"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { analytics } from "@/lib/analytics";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Track page view when pathname changes
    if (pathname) {
      const url = pathname + searchParams.toString();
      analytics.pageview(url);
    }
  }, [pathname, searchParams]);

  return null;
}

// Hook for tracking custom events
export function useAnalytics() {
  return {
    track: analytics.track.bind(analytics),
    event: analytics.event.bind(analytics),
    error: analytics.error.bind(analytics),
    timing: analytics.timing.bind(analytics),
    identify: analytics.identify.bind(analytics),
    reset: analytics.reset.bind(analytics),
  };
}

// Component for tracking specific user interactions
interface TrackClickProps {
  name: string;
  properties?: Record<string, unknown>;
  children: React.ReactNode;
  className?: string;
}

export function TrackClick({ name, properties, children, className }: TrackClickProps) {
  const handleClick = (event: React.MouseEvent) => {
    const additionalProps = {
      element: event.target,
      ...properties,
    };
    analytics.track(name, additionalProps);
  };

  return (
    <div className={className} onClick={handleClick}>
      {children}
    </div>
  );
}

// Component for tracking form submissions
interface TrackFormProps {
  name: string;
  properties?: Record<string, unknown>;
  children: React.ReactNode;
  onSubmit?: (event: React.FormEvent) => void;
}

export function TrackForm({ name, properties, children, onSubmit }: TrackFormProps) {
  const handleSubmit = (event: React.FormEvent) => {
    analytics.track("form_submit", {
      form_name: name,
      ...properties,
    });
    onSubmit?.(event);
  };

  return <form onSubmit={handleSubmit}>{children}</form>;
}
