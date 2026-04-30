"use client";

import React, { memo } from "react";
import { Button } from "@/components/ui/button";
import { Moon } from "lucide-react";

interface SleepLogEntryProps {
  date: string;
  duration: number;
  quality?: number;
  onEdit?: () => void;
}

const SleepLogEntry = memo(function SleepLogEntry({
  date,
  duration,
  quality,
  onEdit,
}: SleepLogEntryProps) {
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const qualityColor =
    quality && quality >= 80
      ? "text-emerald-400"
      : quality && quality >= 60
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-slate-700/50 rounded-lg">
          <Moon className="w-4 h-4 text-slate-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">{formattedDate}</p>
          {quality && <p className={`text-xs ${qualityColor}`}>Quality: {quality}%</p>}
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-white">{duration}h</p>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-cyan-400 hover:text-cyan-300 p-0 h-auto"
          >
            Edit
          </Button>
        )}
      </div>
    </div>
  );
});

SleepLogEntry.displayName = "SleepLogEntry";

export default SleepLogEntry;
