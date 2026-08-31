"use client";

/**
 * State Components - Loading, Empty, Stale, Error, and Offline states
 * Provide consistent UI for data loading states
 */

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// =============================================================================
// Loading States
// =============================================================================

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-3",
  };

  return (
    <div
      className={cn(
        "rounded-full border-[var(--color-primary)] border-t-transparent animate-spin",
        sizeClasses[size],
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
}: SkeletonProps) {
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={cn(
        "animate-shimmer bg-[var(--color-elevated)]",
        variantClasses[variant],
        className
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

interface LoadingStateProps {
  message?: string;
  description?: string;
  className?: string;
}

export function LoadingState({
  message = "Loading...",
  description,
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 text-center",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="lg" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-[var(--color-foreground)]">
          {message}
        </p>
        {description && (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

// Grid skeleton for dashboard loading
interface DashboardSkeletonProps {
  className?: string;
}

export function DashboardSkeleton({ className }: DashboardSkeletonProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton width={200} height={32} />
          <Skeleton width={150} height={16} />
        </div>
        <Skeleton width={120} height={40} />
      </div>

      {/* Main metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CardSkeleton aspectRatio="wide" />
        <CardSkeleton aspectRatio="wide" />
      </div>
    </div>
  );
}

function CardSkeleton({ aspectRatio }: { aspectRatio?: "square" | "wide" }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3",
        aspectRatio === "wide" ? "h-64" : "h-40"
      )}
    >
      <Skeleton width="40%" height={16} />
      <Skeleton width="60%" height={32} />
      <Skeleton width="80%" height={12} />
      <div className="flex-1">
        <Skeleton width="100%" height="100%" />
      </div>
    </div>
  );
}

// List skeleton
interface ListSkeletonProps {
  count?: number;
  itemHeight?: number;
  className?: string;
}

export function ListSkeleton({
  count = 5,
  itemHeight = 60,
  className,
}: ListSkeletonProps) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-label="Loading items">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height={16} />
            <Skeleton width="40%" height={12} />
          </div>
          <Skeleton width={60} height={24} />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Empty States
// =============================================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-12 text-center",
        className
      )}
      role="status"
    >
      {icon && (
        <div className="p-4 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm">
            {description}
          </p>
        )}
      </div>
      {action && (
        <Button onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Specialized empty states
export function NoDataEmptyState({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      }
      title="No data yet"
      description="Start tracking to see your data here."
      className={className}
    />
  );
}

export function NoResultsEmptyState({
  searchQuery,
  className,
}: {
  searchQuery?: string;
  className?: string;
}) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      title="No results found"
      description={
        searchQuery
          ? `No results for "${searchQuery}". Try a different search term.`
          : "No results match your filters. Try adjusting your criteria."
      }
      className={className}
    />
  );
}

// =============================================================================
// Stale Data State
// =============================================================================

interface StaleDataStateProps {
  lastUpdated: Date;
  onRefresh: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function StaleDataState({
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  className,
}: StaleDataStateProps) {
  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    }
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    }
    return "Just now";
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning-muted)] p-3",
        className
      )}
      role="alert"
    >
      <div className="flex items-center gap-2 text-sm">
        <svg
          className="h-4 w-4 text-[var(--color-warning)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-[var(--color-warning)] font-medium">
          Data may be outdated
        </span>
        <span className="text-[var(--color-muted-foreground)]">
          Last updated {formatLastUpdated(lastUpdated)}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={isRefreshing}
        className="shrink-0"
      >
        <svg
          className={cn("h-4 w-4 mr-1", isRefreshing && "animate-spin")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        Refresh
      </Button>
    </div>
  );
}

// =============================================================================
// Error States
// =============================================================================

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this data.",
  onRetry,
  onDismiss,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-8 text-center rounded-lg border border-[var(--color-error)]/30 bg-[var(--color-error-muted)] p-6",
        className
      )}
      role="alert"
    >
      <div className="p-3 rounded-full bg-[var(--color-error)]/10">
        <svg
          className="h-6 w-6 text-[var(--color-error)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          {title}
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm">
          {message}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  );
}

// Inline error for forms
interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <p
      className={cn(
        "flex items-center gap-1 text-sm text-[var(--color-error)]",
        className
      )}
      role="alert"
    >
      <svg
        className="h-4 w-4 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {message}
    </p>
  );
}

// =============================================================================
// Offline State
// =============================================================================

interface OfflineStateProps {
  onRetry?: () => void;
  className?: string;
}

export function OfflineState({ onRetry, className }: OfflineStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 py-8 text-center rounded-lg border border-[var(--color-muted)] bg-[var(--color-muted)]/50 p-6",
        className
      )}
      role="alert"
    >
      <div className="p-3 rounded-full bg-[var(--color-muted)]">
        <svg
          className="h-6 w-6 text-[var(--color-muted-foreground)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
          />
        </svg>
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          You're offline
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)] max-w-sm">
          Please check your internet connection and try again.
        </p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          <svg
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Retry
        </Button>
      )}
    </div>
  );
}

// =============================================================================
// Page State Combinations
// =============================================================================

interface PageStateProps {
  isLoading?: boolean;
  isError?: boolean;
  isEmpty?: boolean;
  isOffline?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
  children?: React.ReactNode;
  className?: string;
}

export function PageState({
  isLoading,
  isError,
  isEmpty,
  isOffline,
  error,
  onRetry,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
  className,
}: PageStateProps) {
  if (isLoading) {
    return (
      <div className={className}>
        <LoadingState />
      </div>
    );
  }

  if (isOffline) {
    return (
      <div className={className}>
        <OfflineState onRetry={onRetry} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={className}>
        <ErrorState
          message={error?.message}
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={className}>
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle || "No data"}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }

  return <>{children}</>;
}
