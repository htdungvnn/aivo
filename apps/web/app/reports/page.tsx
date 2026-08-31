'use client';

/**
 * Health Reports Page
 * Web app integration for health report scheduling, generation, and download
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Card,
  Button,
  Select,
  Switch,
  Badge,
  Spinner,
  Modal,
} from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

interface ReportSchedule {
  id: string;
  frequency: 'weekly' | 'monthly' | 'custom';
  timezone: string;
  deliveryDay: number | null;
  deliveryTime: string;
  locale: 'en' | 'vi';
  emailEnabled: boolean;
  status: 'active' | 'paused' | 'deleted';
  nextRunAt: number | null;
  lastRunAt: number | null;
  createdAt: number;
}

interface HealthReport {
  id: string;
  reportType: 'weekly' | 'monthly' | 'custom';
  periodStart: string;
  periodEnd: string;
  fileName: string;
  fileSize: number;
  dataCompleteness: 'full' | 'partial' | 'minimal';
  generatedAt: number;
  expiresAt: number;
}

interface ReportJob {
  id: string;
  reportType: 'weekly' | 'monthly' | 'custom';
  periodStart: string;
  periodEnd: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled';
  attemptCount: number;
  errorCategory: string | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
}

const BASE_URL = process.env.NEXT_PUBLIC_HEALTH_API_URL || 'http://localhost:3002/api/v1/reports';

export default function HealthReportsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<ReportSchedule | null>(null);
  const [reports, setReports] = useState<HealthReport[]>([]);
  const [generatingJob, setGeneratingJob] = useState<ReportJob | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Form state
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [deliveryDay, setDeliveryDay] = useState(1);
  const [deliveryTime, setDeliveryTime] = useState('09:00');
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [locale, setLocale] = useState<'en' | 'vi'>('en');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const token = localStorage.getItem('aivo_access_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const [scheduleRes, reportsRes] = await Promise.all([
        fetch(`${BASE_URL}/schedules`, { headers }),
        fetch(`${BASE_URL}?limit=20&offset=0`, { headers }),
      ]);

      if (scheduleRes.ok && reportsRes.ok) {
        const scheduleData = await scheduleRes.json();
        const reportsData = await reportsRes.json();

        if (scheduleData.data?.schedules?.length > 0) {
          const activeSchedule = scheduleData.data.schedules.find(
            (s: ReportSchedule) => s.status !== 'deleted'
          );
          if (activeSchedule) {
            setSchedule(activeSchedule);
            setFrequency(activeSchedule.frequency as 'weekly' | 'monthly');
            setDeliveryDay(activeSchedule.deliveryDay ?? 1);
            setEmailEnabled(activeSchedule.emailEnabled);
            setLocale(activeSchedule.locale);
            setDeliveryTime(activeSchedule.deliveryTime);
          }
        }

        setReports(reportsData.data?.reports ?? []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user, authLoading, router, loadData]);

  const handleSaveSchedule = async () => {
    try {
      const token = localStorage.getItem('aivo_access_token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const body = {
        frequency,
        timezone,
        deliveryDay: frequency === 'weekly' ? deliveryDay : undefined,
        deliveryTime,
        emailEnabled,
        locale,
      };

      if (schedule) {
        await fetch(`${BASE_URL}/schedules/${schedule.id}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(body),
        });
      } else {
        await fetch(`${BASE_URL}/schedules`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
      }

      alert('Schedule saved successfully');
      loadData();
    } catch (error) {
      alert('Failed to save schedule');
    }
  };

  const handlePauseResume = async () => {
    if (!schedule) return;

    try {
      const token = localStorage.getItem('aivo_access_token');
      const action = schedule.status === 'active' ? 'pause' : 'resume';
      await fetch(`${BASE_URL}/schedules/${schedule.id}/${action}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      loadData();
    } catch (error) {
      alert('Failed to update schedule');
    }
  };

  const handleDeleteSchedule = async () => {
    if (!schedule) return;
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      const token = localStorage.getItem('aivo_access_token');
      await fetch(`${BASE_URL}/schedules/${schedule.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSchedule(null);
      loadData();
    } catch (error) {
      alert('Failed to delete schedule');
    }
  };

  const handleGenerateReport = async (type: 'weekly' | 'monthly') => {
    try {
      const token = localStorage.getItem('aivo_access_token');
      const now = new Date();
      const end = now.toISOString().split('T')[0];
      let start: string;

      if (type === 'weekly') {
        const s = new Date(now);
        s.setDate(s.getDate() - 7);
        start = s.toISOString().split('T')[0];
      } else {
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start = s.toISOString().split('T')[0];
      }

      const res = await fetch(`${BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportType: type,
          periodStart: start,
          periodEnd: end,
        }),
      });

      const data = await res.json();
      setGeneratingJob(data.data);

      // Poll for status
      const poll = async () => {
        const jobRes = await fetch(`${BASE_URL}/jobs/${data.data.jobId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const jobData = await jobRes.json();
        setGeneratingJob(jobData.data);

        if (jobData.data.status === 'completed' || jobData.data.status === 'failed') {
          loadData();
        } else {
          setTimeout(poll, 2000);
        }
      };

      poll();
    } catch (error) {
      alert('Failed to generate report');
    }
  };

  const handleDownload = async (report: HealthReport) => {
    try {
      setDownloading(report.id);
      const token = localStorage.getItem('aivo_access_token');

      const res = await fetch(`${BASE_URL}/${report.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      // Open download URL
      window.open(data.data.downloadUrl, '_blank');
    } catch (error) {
      alert('Failed to download report');
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      const token = localStorage.getItem('aivo_access_token');
      await fetch(`${BASE_URL}/${reportId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      loadData();
    } catch (error) {
      alert('Failed to delete report');
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (authLoading || loading) {
    return (
      <Container>
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="max-w-4xl mx-auto py-8 space-y-8">
        {/* Schedule Section */}
        <Card>
          <Card.Header>
            <Card.Title>Report Schedule</Card.Title>
            {schedule && (
              <div className="flex items-center gap-3">
                <Badge variant={schedule.status === 'active' ? 'success' : 'secondary'}>
                  {schedule.status}
                </Badge>
                {schedule.nextRunAt && (
                  <span className="text-sm text-muted-foreground">
                    Next: {formatDate(schedule.nextRunAt)}
                  </span>
                )}
              </div>
            )}
          </Card.Header>
          <Card.Content className="space-y-6">
            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium mb-2">Frequency</label>
              <div className="flex gap-3">
                <Button
                  variant={frequency === 'weekly' ? 'default' : 'outline'}
                  onClick={() => setFrequency('weekly')}
                >
                  Weekly
                </Button>
                <Button
                  variant={frequency === 'monthly' ? 'default' : 'outline'}
                  onClick={() => setFrequency('monthly')}
                >
                  Monthly
                </Button>
              </div>
            </div>

            {/* Delivery Day (Weekly) */}
            {frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium mb-2">Delivery Day</label>
                <Select
                  value={deliveryDay.toString()}
                  onChange={(e) => setDeliveryDay(parseInt(e.target.value))}
                >
                  {days.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Delivery Time */}
            <div>
              <label className="block text-sm font-medium mb-2">Delivery Time</label>
              <input
                type="time"
                value={deliveryTime}
                onChange={(e) => setDeliveryTime(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium mb-2">Language</label>
              <div className="flex gap-3">
                <Button
                  variant={locale === 'en' ? 'default' : 'outline'}
                  onClick={() => setLocale('en')}
                >
                  English
                </Button>
                <Button
                  variant={locale === 'vi' ? 'default' : 'outline'}
                  onClick={() => setLocale('vi')}
                >
                  Tiếng Việt
                </Button>
              </div>
            </div>

            {/* Email Notification */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Email Notification</label>
              <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={handleSaveSchedule}>
                {schedule ? 'Update Schedule' : 'Create Schedule'}
              </Button>
              {schedule && (
                <>
                  <Button variant="outline" onClick={handlePauseResume}>
                    {schedule.status === 'active' ? 'Pause' : 'Resume'}
                  </Button>
                  <Button variant="destructive" onClick={handleDeleteSchedule}>
                    Delete
                  </Button>
                </>
              )}
            </div>
          </Card.Content>
        </Card>

        {/* Generate Report Section */}
        <Card>
          <Card.Header>
            <Card.Title>Generate Report</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="flex gap-3">
              <Button
                onClick={() => handleGenerateReport('weekly')}
                disabled={!!generatingJob}
              >
                Weekly Report
              </Button>
              <Button
                onClick={() => handleGenerateReport('monthly')}
                disabled={!!generatingJob}
              >
                Monthly Report
              </Button>
            </div>

            {generatingJob && (
              <div className="mt-4 flex items-center gap-2">
                <Spinner size="sm" />
                <span>
                  {generatingJob.status === 'queued' && 'Report queued...'}
                  {generatingJob.status === 'processing' && 'Generating report...'}
                  {generatingJob.status === 'completed' && 'Report ready!'}
                  {generatingJob.status === 'failed' && 'Generation failed'}
                </span>
              </div>
            )}
          </Card.Content>
        </Card>

        {/* Report History */}
        <Card>
          <Card.Header>
            <Card.Title>Report History</Card.Title>
          </Card.Header>
          <Card.Content>
            {reports.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No reports yet
              </p>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h4 className="font-medium">
                        {report.reportType.charAt(0).toUpperCase() +
                          report.reportType.slice(1)}{' '}
                        Report
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(report.generatedAt)} •{' '}
                        {formatFileSize(report.fileSize)} • {report.dataCompleteness}{' '}
                        data
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleDownload(report)}
                        disabled={downloading === report.id}
                      >
                        {downloading === report.id ? (
                          <Spinner size="sm" />
                        ) : (
                          'Download'
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>
      </div>
    </Container>
  );
}
