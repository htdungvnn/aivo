/**
 * Health Report Generator
 * Processes queue messages and generates health reports
 * 
 * Responsibilities:
 * 1. Load authorized health data from D1
 * 2. Calculate summaries and chart datasets
 * 3. Generate PDF report
 * 4. Upload to R2
 * 5. Save metadata
 * 6. Publish delivery task
 */

import type { HealthEnv } from '../types/env.js';
import type {
  ReportGenerateTask,
  ReportDeliverTask,
  ReportType,
  SupportedLocale,
  DataCompleteness,
} from '@aivo/report-types';
import {
  createReportDeliverTask,
  REPORT_PRIVACY_NOTICE,
  REPORT_DISCLAIMER,
  REPORT_CONTENT_VERSION,
} from '@aivo/report-types';
import {
  getReportJobWithSchedule,
  updateReportJobStatus,
  createReport,
} from '../db/reports.js';
import { generateReportPDF, ReportContent } from './report-pdf.js';
import { aggregateReportData, ReportAggregatedData } from './report-aggregation.js';
import { generateAIReportSummary, type AISummaryResult } from './report-ai.js';

/**
 * Process a report generation task
 */
export async function processReportGeneration(
  env: HealthEnv,
  task: ReportGenerateTask
): Promise<{
  success: boolean;
  reportId?: string;
  error?: string;
}> {
  const db = env.DB;
  const bucket = env.REPORT_BUCKET;
  const correlationId = task.correlationId;
  
  console.log(`[Generator] Processing job ${task.reportJobId} for user ${task.userId}`);
  
  try {
    // Get job with schedule info
    const jobWithSchedule = await getReportJobWithSchedule(db, task.reportJobId);
    
    if (!jobWithSchedule) {
      throw new Error(`Job ${task.reportJobId} not found`);
    }
    
    const { job, schedule } = jobWithSchedule;
    
    // Check if already completed
    if (job.status === 'completed') {
      console.log(`[Generator] Job ${task.reportJobId} already completed`);
      return { success: true };
    }
    
    // Update status to processing
    await updateReportJobStatus(db, job.id, 'processing');
    
    // Aggregate health data for the period
    const aggregatedData = await aggregateReportData(db, {
      userId: job.userId,
      periodStart: job.periodStart,
      periodEnd: job.periodEnd,
      timezone: job.timezone,
      locale: job.locale,
    });
    
    // Generate AI summary if enabled
    let aiSummary: AISummaryResult | null = null;
    if (env.AI_ENABLED === 'true' && schedule?.emailEnabled) {
      try {
        aiSummary = await generateAIReportSummary(env, {
          userId: job.userId,
          aggregatedData,
          reportType: job.reportType,
          locale: job.locale,
        });
      } catch (error) {
        // AI is optional - log but don't fail
        console.warn(`[Generator] AI summary generation failed:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    // Build report content
    const reportContent: ReportContent = {
      version: REPORT_CONTENT_VERSION,
      generatedAt: Date.now(),
      userId: job.userId,
      reportType: job.reportType,
      periodStart: job.periodStart,
      periodEnd: job.periodEnd,
      locale: job.locale,
      data: aggregatedData,
      aiSummary,
      privacyNotice: REPORT_PRIVACY_NOTICE[job.locale] ?? REPORT_PRIVACY_NOTICE.en,
      disclaimer: REPORT_DISCLAIMER[job.locale] ?? REPORT_DISCLAIMER.en,
    };
    
    // Generate PDF
    const { pdfBuffer, fileName } = await generateReportPDF(reportContent);
    
    // Calculate file checksum
    const checksum = await calculateChecksum(pdfBuffer);
    
    // Determine R2 object key
    const year = new Date(job.periodEnd).getFullYear();
    const r2ObjectKey = `health-reports/${job.userId}/${year}/${job.id}.pdf`;
    
    // Upload to R2
    await bucket.put(r2ObjectKey, pdfBuffer, {
      httpMetadata: {
        contentType: 'application/pdf',
        contentDisposition: `attachment; filename="${fileName}"`,
      },
      customMetadata: {
        userId: job.userId,
        reportId: job.id,
        reportVersion: REPORT_CONTENT_VERSION,
        generatedAt: String(reportContent.generatedAt),
      },
    });
    
    console.log(`[Generator] Uploaded report to R2: ${r2ObjectKey}`);
    
    // Determine data completeness
    const dataCompleteness = determineDataCompleteness(aggregatedData);
    
    // Save report metadata
    const report = await createReport(db, {
      id: crypto.randomUUID(),
      userId: job.userId,
      jobId: job.id,
      reportVersion: REPORT_CONTENT_VERSION,
      fileName,
      r2ObjectKey,
      fileSize: pdfBuffer.length,
      checksum,
      dataCompleteness,
    });
    
    // Update job status
    await updateReportJobStatus(db, job.id, 'completed');
    
    console.log(`[Generator] Job ${job.id} completed successfully`);
    
    // Publish delivery task if email is enabled
    if (schedule?.emailEnabled) {
      try {
        const deliverTask: ReportDeliverTask = createReportDeliverTask({
          reportId: report.id,
          userId: job.userId,
          reportType: job.reportType,
          periodStart: job.periodStart,
          periodEnd: job.periodEnd,
          locale: job.locale,
          emailEnabled: schedule.emailEnabled,
        });

        // Use the DELIVER_QUEUE binding (configured in wrangler.jsonc)
        // The mail worker consumes from aivo-health-report-deliver-queue
        if (env.DELIVER_QUEUE) {
          await env.DELIVER_QUEUE.send(deliverTask);
          console.log(`[Generator] Published delivery task for report ${report.id} to DELIVER_QUEUE`);
        } else {
          console.warn(`[Generator] DELIVER_QUEUE not configured, skipping delivery notification`);
        }
      } catch (error) {
        // Don't fail the generation if delivery fails
        console.error(`[Generator] Failed to publish delivery task:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    return { success: true, reportId: report.id };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Generator] Failed to process job ${task.reportJobId}:`, errorMessage);
    
    // Update job status to failed
    const errorCategory = categorizeError(error);
    await updateReportJobStatus(db, task.reportJobId, 'failed', errorCategory);
    
    return { success: false, error: errorMessage };
  }
}

/**
 * Calculate SHA-256 checksum of buffer
 */
async function calculateChecksum(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Determine data completeness level
 */
function determineDataCompleteness(data: ReportAggregatedData): DataCompleteness {
  const hasReadiness = data.readiness.scores.length > 0;
  const hasNutrition = data.nutrition.daysWithData > 0;
  const hasActivity = data.activity.steps.length > 0;
  const hasWorkouts = data.fitness.completedWorkouts > 0;
  
  const availableCount = [hasReadiness, hasNutrition, hasActivity, hasWorkouts].filter(Boolean).length;
  
  if (availableCount >= 3) return 'full';
  if (availableCount >= 1) return 'partial';
  return 'minimal';
}

/**
 * Categorize errors for retry logic
 */
function categorizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  
  if (message.includes('D1') || message.includes('database')) {
    return 'database_error';
  }
  if (message.includes('R2') || message.includes('storage')) {
    return 'storage_error';
  }
  if (message.includes('timeout') || message.includes('network')) {
    return 'transient_error';
  }
  if (message.includes('AI') || message.includes('model')) {
    return 'ai_error';
  }
  return 'unknown_error';
}

/**
 * Process batch of generation tasks
 */
export async function processReportGenerationBatch(
  env: HealthEnv,
  tasks: ReportGenerateTask[]
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ jobId: string; error: string }>;
}> {
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [] as Array<{ jobId: string; error: string }>,
  };

  for (const task of tasks) {
    try {
      const result = await processReportGeneration(env, task);
      results.processed++;
      
      if (result.success) {
        results.succeeded++;
      } else {
        results.failed++;
        if (result.error) {
          results.errors.push({ jobId: task.reportJobId, error: result.error });
        }
      }
    } catch (error) {
      results.processed++;
      results.failed++;
      results.errors.push({
        jobId: task.reportJobId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}
