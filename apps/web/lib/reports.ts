/**
 * Reports API Client for Web (Next.js)
 * Handles health report generation, scheduling, and retrieval
 */

const BASE_URL = process.env.NEXT_PUBLIC_HEALTH_API_URL || '/api/v1/health';

export interface ReportSchedule {
  id: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  deliveryDay: number; // 0-6 for weekly, 1-28 for monthly
  deliveryTime: string; // HH:mm format
  timezone: string;
  enabled: boolean;
  lastGeneratedAt: number | null;
  nextScheduledAt: number | null;
  emailNotification: boolean;
}

export interface Report {
  id: string;
  type: 'weekly' | 'monthly' | 'custom';
  periodStart: string;
  periodEnd: string;
  status: 'processing' | 'completed' | 'failed' | 'expired';
  createdAt: number;
  completedAt: number | null;
  expiresAt: number | null;
  downloadUrl: string | null;
  previewData?: ReportPreview;
  size?: number;
  language: string;
}

export interface ReportPreview {
  summary: {
    readinessAverage: number;
    sleepAverage: number;
    workoutCompletion: number;
    nutritionAdherence: number;
    topHighlights: string[];
    areasForImprovement: string[];
  };
  sections: ReportSection[];
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  metrics?: Array<{
    label: string;
    value: string | number;
    unit?: string;
    trend?: 'up' | 'down' | 'stable';
    change?: number;
  }>;
  chartType?: 'line' | 'bar' | 'area';
  data?: Array<{ label: string; value: number }>;
}

export interface ReportGenerationRequest {
  type: 'weekly' | 'monthly' | 'custom';
  startDate: string;
  endDate: string;
  language?: string;
  sections?: string[];
}

export interface ReportListOptions {
  page?: number;
  pageSize?: number;
  status?: Report['status'];
  type?: Report['type'];
}

export class ReportsApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ReportsApiError';
  }
}

export class ReportsApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Get auth token from cookies
   */
  private getToken(): string | null {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'aivo_access_token') {
        return value;
      }
    }
    return null;
  }
  
  /**
   * Make authenticated request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    
    if (!token) {
      throw new ReportsApiError('Not authenticated', 'UNAUTHORIZED', 401);
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      const error = data.error || { code: 'UNKNOWN_ERROR', message: 'An error occurred' };
      throw new ReportsApiError(error.message, error.code, response.status);
    }
    
    return data.data;
  }
  
  // ===========================================================================
  // Schedule API
  // ===========================================================================
  
  /**
   * Get current report schedule
   */
  async getSchedule(): Promise<ReportSchedule | null> {
    try {
      return await this.request('/reports/schedule');
    } catch (error) {
      if (error instanceof ReportsApiError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Update report schedule
   */
  async updateSchedule(schedule: Partial<ReportSchedule>): Promise<{
    schedule: ReportSchedule;
  }> {
    return this.request('/reports/schedule', {
      method: 'PUT',
      body: JSON.stringify(schedule),
    });
  }
  
  /**
   * Enable/disable scheduled reports
   */
  async setScheduleEnabled(enabled: boolean): Promise<{
    schedule: ReportSchedule;
  }> {
    return this.request('/reports/schedule/status', {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
  }
  
  // ===========================================================================
  // Report Generation API
  // ===========================================================================
  
  /**
   * Generate a new report
   */
  async generateReport(request: ReportGenerationRequest): Promise<{
    report: Report;
    estimatedTime: number;
  }> {
    return this.request('/reports/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
  
  /**
   * Get report status
   */
  async getReportStatus(reportId: string): Promise<{
    reportId: string;
    status: Report['status'];
    progress?: {
      stage: string;
      percent: number;
    };
    completedAt: number | null;
    errorMessage: string | null;
  }> {
    return this.request(`/reports/${reportId}/status`);
  }
  
  // ===========================================================================
  // Report Retrieval API
  // ===========================================================================
  
  /**
   * List reports
   */
  async listReports(options: ReportListOptions = {}): Promise<{
    reports: Report[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    const params = new URLSearchParams();
    if (options.page) params.append('page', String(options.page));
    if (options.pageSize) params.append('pageSize', String(options.pageSize));
    if (options.status) params.append('status', options.status);
    if (options.type) params.append('type', options.type);
    
    return this.request(`/reports?${params.toString()}`);
  }
  
  /**
   * Get a specific report
   */
  async getReport(reportId: string): Promise<Report> {
    return this.request(`/reports/${reportId}`);
  }
  
  /**
   * Get report preview (without downloading)
   */
  async getReportPreview(reportId: string): Promise<{
    preview: ReportPreview;
  }> {
    return this.request(`/reports/${reportId}/preview`);
  }
  
  /**
   * Get report download URL
   */
  async getReportDownloadUrl(reportId: string): Promise<{
    url: string;
    expiresAt: number;
  }> {
    return this.request(`/reports/${reportId}/download`);
  }
  
  /**
   * Delete a report
   */
  async deleteReport(reportId: string): Promise<{
    deleted: boolean;
  }> {
    return this.request(`/reports/${reportId}`, {
      method: 'DELETE',
    });
  }
  
  // ===========================================================================
  // Report History API
  // ===========================================================================
  
  /**
   * Get recent reports summary
   */
  async getRecentReports(limit: number = 5): Promise<{
    reports: Array<{
      id: string;
      type: Report['type'];
      periodStart: string;
      periodEnd: string;
      createdAt: number;
      status: Report['status'];
    }>;
  }> {
    return this.request(`/reports/recent?limit=${limit}`);
  }
  
  /**
   * Get next scheduled report info
   */
  async getNextScheduledReport(): Promise<{
    scheduledAt: number;
    type: Report['type'];
    deliveryDay: string;
    deliveryTime: string;
  } | null> {
    return this.request('/reports/next-scheduled');
  }
}

// Singleton instance
let clientInstance: ReportsApiClient | null = null;

export function getReportsClient(baseUrl?: string): ReportsApiClient {
  if (!clientInstance) {
    clientInstance = new ReportsApiClient(baseUrl);
  }
  return clientInstance;
}

export function resetReportsClient(): void {
  clientInstance = null;
}
