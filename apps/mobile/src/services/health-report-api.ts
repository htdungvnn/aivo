/**
 * Health Report API Client for Mobile
 */

import { getAuthClient } from '@aivo/api-client';

const BASE_URL = process.env.EXPO_PUBLIC_HEALTH_API_URL || 'http://localhost:3002/api/v1/reports';

export interface ReportSchedule {
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

export interface CreateScheduleRequest {
  frequency: 'weekly' | 'monthly' | 'custom';
  timezone: string;
  deliveryDay?: number;
  deliveryTime: string;
  locale?: 'en' | 'vi';
  emailEnabled?: boolean;
}

export interface UpdateScheduleRequest {
  frequency?: 'weekly' | 'monthly' | 'custom';
  timezone?: string;
  deliveryDay?: number | null;
  deliveryTime?: string;
  locale?: 'en' | 'vi';
  emailEnabled?: boolean;
}

export interface ReportJob {
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
  reportId?: string;
}

export interface HealthReport {
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

export interface CreateReportRequest {
  reportType: 'weekly' | 'monthly' | 'custom';
  periodStart: string;
  periodEnd: string;
  timezone?: string;
  locale?: 'en' | 'vi';
}

export interface DownloadUrl {
  downloadUrl: string;
  expiresAt: number;
  fileName: string;
}

class HealthReportApiClient {
  private client = getAuthClient(BASE_URL);

  /**
   * Get user's report schedule
   */
  async getSchedule(): Promise<{ schedules: ReportSchedule[] }> {
    const response = await fetch(`${BASE_URL}/schedules`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * Create a report schedule
   */
  async createSchedule(data: CreateScheduleRequest): Promise<ReportSchedule> {
    const response = await fetch(`${BASE_URL}/schedules`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  /**
   * Update a report schedule
   */
  async updateSchedule(scheduleId: string, data: UpdateScheduleRequest): Promise<ReportSchedule> {
    const response = await fetch(`${BASE_URL}/schedules/${scheduleId}`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  /**
   * Pause a schedule
   */
  async pauseSchedule(scheduleId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/schedules/${scheduleId}/pause`, {
      method: 'POST',
      headers: await this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to pause schedule');
    }
  }

  /**
   * Resume a schedule
   */
  async resumeSchedule(scheduleId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/schedules/${scheduleId}/resume`, {
      method: 'POST',
      headers: await this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to resume schedule');
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/schedules/${scheduleId}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete schedule');
    }
  }

  /**
   * Generate report manually
   */
  async generateReport(data: CreateReportRequest): Promise<{ jobId: string; status: string }> {
    const response = await fetch(`${BASE_URL}/generate`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  /**
   * Get report job status
   */
  async getJobStatus(jobId: string): Promise<ReportJob> {
    const response = await fetch(`${BASE_URL}/jobs/${jobId}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * Get job history
   */
  async getJobHistory(limit = 20, offset = 0): Promise<{ jobs: ReportJob[]; pagination: { limit: number; offset: number } }> {
    const response = await fetch(`${BASE_URL}/jobs?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * Retry failed report
   */
  async retryReport(jobId: string): Promise<{ jobId: string; status: string }> {
    const response = await fetch(`${BASE_URL}/jobs/${jobId}/retry`, {
      method: 'POST',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * List reports
   */
  async listReports(limit = 20, offset = 0): Promise<{ reports: HealthReport[]; pagination: { limit: number; offset: number; total: number } }> {
    const response = await fetch(`${BASE_URL}?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * Get report details
   */
  async getReportDetails(reportId: string): Promise<HealthReport & { fileName: string; fileSize: number; expiresAt: number }> {
    const response = await fetch(`${BASE_URL}/${reportId}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * Get download URL
   */
  async getDownloadUrl(reportId: string, expiresInSeconds = 3600): Promise<DownloadUrl> {
    const response = await fetch(`${BASE_URL}/${reportId}/download?expiresIn=${expiresInSeconds}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  /**
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/${reportId}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete report');
    }
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = this.client.getAccessToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    return data.data || data;
  }
}

export const healthReportApi = new HealthReportApiClient();
