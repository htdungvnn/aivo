"use client";

/**
 * Health Reports Page - Report generation, scheduling, and history
 */

import React, { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState } from "@/components/shared/state-components";
import { cn } from "@/lib/utils";
import {
  FileText,
  Download,
  Clock,
  Calendar,
  Plus,
  Settings,
  Trash2,
  Eye,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Bell,
  Mail,
  Pause,
  Play,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface ReportSchedule {
  id: string;
  frequency: "weekly" | "biweekly" | "monthly";
  deliveryDay: number;
  deliveryTime: string;
  timezone: string;
  enabled: boolean;
  lastGeneratedAt: number | null;
  nextScheduledAt: number | null;
  emailNotification: boolean;
}

interface Report {
  id: string;
  type: "weekly" | "monthly" | "custom";
  periodStart: string;
  periodEnd: string;
  status: "processing" | "completed" | "failed" | "expired";
  createdAt: number;
  completedAt: number | null;
  expiresAt: number | null;
  downloadUrl: string | null;
  size?: number;
  language: string;
}

// =============================================================================
// Sample Data
// =============================================================================

const SAMPLE_SCHEDULE: ReportSchedule = {
  id: "schedule-1",
  frequency: "weekly",
  deliveryDay: 6, // Saturday
  deliveryTime: "09:00",
  timezone: "America/New_York",
  enabled: true,
  lastGeneratedAt: Date.now() - 86400000 * 3, // 3 days ago
  nextScheduledAt: Date.now() + 86400000 * 4, // 4 days from now
  emailNotification: true,
};

const SAMPLE_REPORTS: Report[] = [
  {
    id: "report-1",
    type: "weekly",
    periodStart: "2026-08-24",
    periodEnd: "2026-08-30",
    status: "completed",
    createdAt: Date.now() - 86400000 * 3,
    completedAt: Date.now() - 86400000 * 3 + 60000 * 5,
    expiresAt: Date.now() + 86400000 * 25,
    downloadUrl: "/reports/report-1.pdf",
    size: 2456789,
    language: "en",
  },
  {
    id: "report-2",
    type: "weekly",
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    status: "completed",
    createdAt: Date.now() - 86400000 * 10,
    completedAt: Date.now() - 86400000 * 10 + 60000 * 4,
    expiresAt: Date.now() + 86400000 * 18,
    downloadUrl: "/reports/report-2.pdf",
    size: 2234567,
    language: "en",
  },
  {
    id: "report-3",
    type: "monthly",
    periodStart: "2026-08-01",
    periodEnd: "2026-08-31",
    status: "processing",
    createdAt: Date.now() - 60000 * 10,
    completedAt: null,
    expiresAt: null,
    downloadUrl: null,
    language: "en",
  },
  {
    id: "report-4",
    type: "weekly",
    periodStart: "2026-08-10",
    periodEnd: "2026-08-16",
    status: "completed",
    createdAt: Date.now() - 86400000 * 17,
    completedAt: Date.now() - 86400000 * 17 + 60000 * 6,
    expiresAt: Date.now() + 86400000 * 11,
    downloadUrl: "/reports/report-4.pdf",
    size: 2156789,
    language: "en",
  },
];

// =============================================================================
// Components
// =============================================================================

interface ReportCardProps {
  report: Report;
  onPreview: (id: string) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
}

function ReportCard({ report, onPreview, onDownload, onDelete }: ReportCardProps) {
  const statusConfig = {
    completed: { color: "text-[var(--color-success)]", bg: "bg-[var(--color-success-muted)]", label: "Ready" },
    processing: { color: "text-[var(--color-info)]", bg: "bg-[var(--color-info-muted)]", label: "Processing" },
    failed: { color: "text-[var(--color-error)]", bg: "bg-[var(--color-error-muted)]", label: "Failed" },
    expired: { color: "text-[var(--color-tertiary)]", bg: "bg-[var(--color-muted)]", label: "Expired" },
  };

  const config = statusConfig[report.status];
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="hover:border-[var(--color-border-hover)] transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg shrink-0", config.bg)}>
              <FileText className={cn("h-5 w-5", config.color)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-[var(--color-foreground)]">
                  {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
                </h3>
                <Badge variant="subtle" size="sm" className="capitalize">
                  {report.status}
                </Badge>
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                {formatDate(report.periodStart)} - {formatDate(report.periodEnd)}
              </p>
              {report.status === "completed" && report.size && (
                <p className="text-xs text-[var(--color-tertiary)] mt-1">
                  {formatFileSize(report.size)}
                </p>
              )}
              {report.status === "processing" && (
                <div className="flex items-center gap-2 mt-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--color-info)]" />
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    Generating report...
                  </span>
                </div>
              )}
            </div>
          </div>

          {report.status === "completed" && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onPreview(report.id)}
                aria-label="Preview report"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDownload(report.id)}
                aria-label="Download report"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(report.id)}
                className="text-[var(--color-error)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-muted)]"
                aria-label="Delete report"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}

          {report.status === "failed" && (
            <Button variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ScheduleCardProps {
  schedule: ReportSchedule | null;
  onUpdate: (schedule: Partial<ReportSchedule>) => void;
  onToggle: () => void;
}

function ScheduleCard({ schedule, onUpdate, onToggle }: ScheduleCardProps) {
  const formatNextReport = (timestamp: number | null) => {
    if (!timestamp) return "Not scheduled";
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const frequencyLabels = {
    weekly: "Weekly",
    biweekly: "Every 2 weeks",
    monthly: "Monthly",
  };

  const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-[var(--color-muted-foreground)]" />
          <CardTitle className="text-base">Report Schedule</CardTitle>
        </div>
        <Button
          variant={schedule?.enabled ? "secondary" : "outline"}
          size="sm"
          onClick={onToggle}
        >
          {schedule?.enabled ? (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {schedule ? (
          <>
            <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-muted-foreground)]">Frequency</span>
              <select
                value={schedule.frequency}
                onChange={(e) => onUpdate({ frequency: e.target.value as ReportSchedule["frequency"] })}
                className="text-sm bg-transparent border border-[var(--color-border)] rounded-lg px-3 py-1.5"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Every 2 weeks</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-muted-foreground)]">Delivery day</span>
              <select
                value={schedule.deliveryDay}
                onChange={(e) => onUpdate({ deliveryDay: parseInt(e.target.value) })}
                className="text-sm bg-transparent border border-[var(--color-border)] rounded-lg px-3 py-1.5"
              >
                {dayLabels.map((day, index) => (
                  <option key={day} value={index}>{day}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-muted-foreground)]">Delivery time</span>
              <input
                type="time"
                value={schedule.deliveryTime}
                onChange={(e) => onUpdate({ deliveryTime: e.target.value })}
                className="text-sm bg-transparent border border-[var(--color-border)] rounded-lg px-3 py-1.5"
              />
            </div>

            <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
              <span className="text-sm text-[var(--color-muted-foreground)]">Email notification</span>
              <Button
                variant={schedule.emailNotification ? "primary" : "outline"}
                size="sm"
                onClick={() => onUpdate({ emailNotification: !schedule.emailNotification })}
              >
                <Mail className="h-4 w-4 mr-2" />
                {schedule.emailNotification ? "On" : "Off"}
              </Button>
            </div>

            <div className="pt-2">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Next report: <span className="text-[var(--color-foreground)]">{formatNextReport(schedule.nextScheduledAt)}</span>
              </p>
              {schedule.lastGeneratedAt && (
                <p className="text-xs text-[var(--color-tertiary)] mt-1">
                  Last generated: {new Date(schedule.lastGeneratedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
              No report schedule configured
            </p>
            <Button onClick={() => onUpdate({ enabled: true })}>
              <Plus className="h-4 w-4 mr-2" />
              Create Schedule
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function ReportsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [reports, setReports] = useState<Report[]>(SAMPLE_REPORTS);
  const [schedule, setSchedule] = useState<ReportSchedule | null>(SAMPLE_SCHEDULE);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showScheduleSettings, setShowScheduleSettings] = useState(false);

  const handleGenerateReport = useCallback(async () => {
    setIsGenerating(true);
    // Simulate report generation
    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    const newReport: Report = {
      id: `report-${Date.now()}`,
      type: "custom",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-30",
      status: "processing",
      createdAt: Date.now(),
      completedAt: null,
      expiresAt: null,
      downloadUrl: null,
      language: "en",
    };
    
    setReports((prev) => [newReport, ...prev]);
    setIsGenerating(false);
    
    // Simulate completion after a delay
    setTimeout(() => {
      setReports((prev) =>
        prev.map((r) =>
          r.id === newReport.id
            ? { ...r, status: "completed", completedAt: Date.now(), downloadUrl: `/reports/${r.id}.pdf`, size: 2567890 }
            : r
        )
      );
    }, 5000);
  }, []);

  const handlePreview = useCallback((reportId: string) => {
    console.log("Preview report:", reportId);
    // Open preview modal or navigate to preview page
  }, []);

  const handleDownload = useCallback((reportId: string) => {
    console.log("Download report:", reportId);
    // Trigger download
  }, []);

  const handleDelete = useCallback((reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  }, []);

  const handleScheduleUpdate = useCallback((updates: Partial<ReportSchedule>) => {
    setSchedule((prev) => prev ? { ...prev, ...updates } : null);
  }, []);

  const handleToggleSchedule = useCallback(() => {
    setSchedule((prev) => prev ? { ...prev, enabled: !prev.enabled } : null);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading reports..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const completedReports = reports.filter((r) => r.status === "completed");
  const processingReports = reports.filter((r) => r.status === "processing");

  return (
    <AppShell
      user={
        user
          ? {
              name: user.displayName || user.email,
              email: user.email,
              avatar: user.avatarUrl || undefined,
            }
          : undefined
      }
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
              Health Reports
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              View and download your wellness reports
            </p>
          </div>
          <Button onClick={handleGenerateReport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Generate Report
              </>
            )}
          </Button>
        </div>

        {/* Schedule Card */}
        <ScheduleCard
          schedule={schedule}
          onUpdate={handleScheduleUpdate}
          onToggle={handleToggleSchedule}
        />

        {/* Processing Reports */}
        {processingReports.length > 0 && (
          <div>
            <h2 className="section-title mb-4">Processing</h2>
            <div className="space-y-4">
              {processingReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}

        {/* Report History */}
        <div>
          <h2 className="section-title mb-4">Report History</h2>
          {completedReports.length > 0 ? (
            <div className="space-y-4">
              {completedReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onPreview={handlePreview}
                  onDownload={handleDownload}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-[var(--color-muted)] mb-4" />
                <h3 className="text-lg font-medium text-[var(--color-foreground)] mb-2">
                  No reports yet
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
                  Generate your first wellness report to see your progress over time.
                </p>
                <Button onClick={handleGenerateReport} disabled={isGenerating}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Info Card */}
        <Card className="bg-[var(--color-muted)]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-[var(--color-muted-foreground)] shrink-0 mt-0.5" />
              <div className="text-sm text-[var(--color-muted-foreground)]">
                <p className="font-medium text-[var(--color-foreground)] mb-1">
                  About Health Reports
                </p>
                <p>
                  Health reports are generated based on your tracked data and provide
                  a summary of your wellness over a specific period. Reports are
                  available for download for 28 days after generation. AIVO reports
                  provide general wellness guidance and are not medical documents.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-[var(--color-tertiary)]">
            AIVO provides general wellness guidance. Health reports are for informational
            purposes only and do not constitute medical advice.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
