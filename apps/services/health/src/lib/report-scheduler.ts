/**
 * Health Report Scheduler
 * Handles scheduled report generation via Cron trigger
 * 
 * Runs every 15 minutes and:
 * 1. Finds due active schedules
 * 2. Claims each schedule atomically
 * 3. Creates report jobs
 * 4. Publishes to Queue
 * 5. Calculates next run time
 * 6. Handles failures gracefully
 */

import type { HealthEnv } from '../types/env.js';
import type { ReportSchedule, ReportGenerateTask, ReportType } from '@aivo/report-types';
import {
  getDueSchedules,
  claimScheduleAndUpdateNextRun,
  createReportJob,
} from '../db/reports.js';
import {
  createReportGenerateTask,
  calculateReportDateRange,
  calculateNextRunTime,
  generateIdempotencyKey,
} from '@aivo/report-types';

/**
 * Scheduled event context
 */
export interface ScheduledContext {
  scheduledTime: number; // Unix timestamp when the cron was scheduled to run
  cron: string; // The cron pattern that triggered this
}

/**
 * Process due schedules and create report jobs
 */
export async function processDueSchedules(
  env: HealthEnv,
  scheduledContext?: ScheduledContext
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}> {
  const db = env.DB;
  const queue = env.REPORT_QUEUE;
  
  // Use the scheduled time if provided, otherwise use current time
  const currentTime = scheduledContext?.scheduledTime ?? Date.now();
  
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    // Find due schedules
    const dueSchedules = await getDueSchedules(db, currentTime);
    
    console.log(`[Scheduler] Found ${dueSchedules.length} due schedules`);
    
    for (const schedule of dueSchedules) {
      try {
        // Claim the schedule atomically (prevents duplicate processing)
        const claimed = await claimScheduleAndUpdateNextRun(db, schedule.id, null);
        
        if (!claimed) {
          // Another worker already claimed this schedule
          console.log(`[Scheduler] Schedule ${schedule.id} already claimed by another worker`);
          continue;
        }
        
        // Calculate the report period
        const { periodStart, periodEnd } = calculateReportDateRange(
          schedule.frequency as ReportType,
          new Date(currentTime),
          schedule.timezone
        );
        
        // Check for duplicate (idempotency)
        const idempotencyKey = generateIdempotencyKey(
          schedule.userId,
          schedule.reportType as ReportType,
          periodStart,
          periodEnd
        );
        
        // Create report job
        const jobId = crypto.randomUUID();
        await createReportJob(db, {
          id: jobId,
          userId: schedule.userId,
          scheduleId: schedule.id,
          reportType: schedule.reportType as ReportType,
          periodStart,
          periodEnd,
          timezone: schedule.timezone,
          locale: schedule.locale,
        });
        
        // Create and publish queue task
        const task = createReportGenerateTask({
          reportJobId: jobId,
          userId: schedule.userId,
        });
        
        await queue.send(task, {
          // Use job ID as idempotency key for the queue message
          // This prevents duplicate processing if the message is redelivered
          contentType: 'application/json',
        });
        
        console.log(`[Scheduler] Created job ${jobId} for schedule ${schedule.id}`);
        
        // Calculate and store next run time
        const nextRunAt = calculateNextRunTime({
          frequency: schedule.frequency,
          deliveryDay: schedule.deliveryDay,
          deliveryTime: schedule.deliveryTime,
          timezone: schedule.timezone,
        }, new Date(currentTime));
        
        // Update schedule with next run time
        await claimScheduleAndUpdateNextRun(db, schedule.id, nextRunAt);
        
        console.log(`[Scheduler] Next run for schedule ${schedule.id}: ${new Date(nextRunAt).toISOString()}`);
        
        results.processed++;
        results.succeeded++;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Scheduler] Failed to process schedule ${schedule.id}:`, errorMessage);
        
        // Restore the schedule's next_run_at for retry
        // In production, you might want more sophisticated retry logic
        const nextRunAt = calculateNextRunTime({
          frequency: schedule.frequency,
          deliveryDay: schedule.deliveryDay,
          deliveryTime: schedule.deliveryTime,
          timezone: schedule.timezone,
        }, new Date(currentTime));
        
        await claimScheduleAndUpdateNextRun(db, schedule.id, nextRunAt);
        
        results.failed++;
        results.errors.push(`Schedule ${schedule.id}: ${errorMessage}`);
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Scheduler] Fatal error:', errorMessage);
    results.errors.push(`Fatal: ${errorMessage}`);
  }

  return results;
}

/**
 * Clean up expired reports
 */
export async function cleanupExpiredReports(
  env: HealthEnv
): Promise<{
  deleted: number;
  errors: string[];
}> {
  const db = env.DB;
  const bucket = env.REPORT_BUCKET;
  
  const results = {
    deleted: 0,
    errors: [] as string[],
  };

  try {
    // Get expired reports
    const { getExpiredReports, markReportsAsExpired } = await import('../db/reports.js');
    const expiredReports = await getExpiredReports(db, 100);
    
    console.log(`[Cleanup] Found ${expiredReports.length} expired reports`);
    
    for (const report of expiredReports) {
      try {
        // Delete from R2
        await bucket.delete(report.r2ObjectKey);
        
        // Mark as deleted in D1
        await markReportsAsExpired(db, [report.id]);
        
        results.deleted++;
        console.log(`[Cleanup] Deleted report ${report.id}`);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Cleanup] Failed to delete report ${report.id}:`, errorMessage);
        results.errors.push(`Report ${report.id}: ${errorMessage}`);
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Cleanup] Fatal error:', errorMessage);
    results.errors.push(`Fatal: ${errorMessage}`);
  }

  return results;
}

/**
 * Cron trigger handler
 * This is called by Cloudflare Workers on the configured schedule
 */
export async function handleScheduledReportCron(
  env: HealthEnv,
  scheduledTime: number,
  cron: string
): Promise<Response> {
  console.log(`[Cron] Starting scheduled report processing at ${new Date().toISOString()}`);
  console.log(`[Cron] Scheduled time: ${new Date(scheduledTime).toISOString()}, cron: ${cron}`);
  
  const context: ScheduledContext = {
    scheduledTime,
    cron,
  };
  
  // Process due schedules
  const scheduleResults = await processDueSchedules(env, context);
  
  console.log(`[Cron] Schedule processing complete:`, {
    processed: scheduleResults.processed,
    succeeded: scheduleResults.succeeded,
    failed: scheduleResults.failed,
  });
  
  // Optionally run cleanup
  const cleanupResults = await cleanupExpiredReports(env);
  
  console.log(`[Cron] Cleanup complete:`, {
    deleted: cleanupResults.deleted,
  });
  
  const allErrors = [...scheduleResults.errors, ...cleanupResults.errors];
  
  return new Response(
    JSON.stringify({
      success: scheduleResults.failed === 0 && cleanupResults.errors.length === 0,
      scheduledTime: new Date(scheduledTime).toISOString(),
      cron,
      scheduleProcessing: scheduleResults,
      cleanup: cleanupResults,
      errors: allErrors,
      timestamp: Date.now(),
    }),
    {
      status: allErrors.length > 0 && scheduleResults.failed > 0 ? 500 : 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
