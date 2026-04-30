import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatNumber, formatPercentage, formatDuration, formatRelativeTime, formatShortDate, formatFullDate } from "@aivo/shared-types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Re-export formatting utilities from shared-types for convenience
export {
  formatNumber,
  formatPercentage,
  formatDuration,
  formatRelativeTime,
  formatShortDate,
  formatFullDate
};

