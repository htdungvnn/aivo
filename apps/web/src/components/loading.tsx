"use client";

import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

export function LoadingSpinner({ size = "md", className, label = "Loading..." }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div
        className={cn(
          "border-cyan-500 border-t-transparent rounded-full animate-spin",
          sizeClasses[size]
        )}
      />
      {label && <span className="text-cyan-400 text-sm font-medium">{label}</span>}
    </div>
  );
}

interface PageLoaderProps {
  message?: string;
}

export function PageLoader({ message = "Loading..." }: PageLoaderProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Activity className="w-16 h-16 text-cyan-400" />
          <div className="absolute -inset-4 bg-cyan-400/20 rounded-full blur-xl animate-pulse" />
        </div>
        <span className="text-cyan-400 text-lg font-medium tracking-wide">{message}</span>
      </div>
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  variant?: "default" | "card" | "text";
}

export function Skeleton({ className, variant = "default" }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-slate-800/50";

  const variantClasses = {
    default: "rounded",
    card: "rounded-xl",
    text: "rounded h-4",
  };

  return <div className={cn(baseClasses, variantClasses[variant], className)} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 rounded-xl p-6 space-y-4">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="pt-4 border-t border-slate-700/30">
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="space-y-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
