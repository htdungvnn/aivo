/**
 * Event Idempotency Store
 * 
 * Provides idempotency checking for event consumers.
 * Ensures each event is processed exactly once.
 */

import type { D1Database } from '@cloudflare/workers-types';

// =============================================================================
// Types
// =============================================================================

export interface EventProcessingRecord {
  id: string;
  eventId: string;
  eventType: string;
  eventVersion: number;
  consumer: string;
  processedAt: number;
  status: 'processed' | 'failed';
  resultReference?: string;
  errorCode?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface ProcessingResult {
  status: 'success' | 'failure' | 'skipped';
  processedAt?: number;
  error?: {
    code: string;
    message: string;
  };
}

// =============================================================================
// Idempotency Store
// =============================================================================

export function createEventIdempotencyStore(db: D1Database, consumerName: string) {
  return {
    /**
     * Check if an event has already been processed.
     */
    async isProcessed(eventId: string): Promise<boolean> {
      const result = await db
        .prepare(`
          SELECT 1 FROM event_processing_log
          WHERE event_id = ? AND consumer = ? AND status = 'processed'
          LIMIT 1
        `)
        .bind(eventId, consumerName)
        .first();

      return result !== null;
    },

    /**
     * Mark an event as being processed (prevents race conditions).
     */
    async markProcessing(eventId: string, eventType: string, eventVersion: number): Promise<boolean> {
      const id = crypto.randomUUID();
      const now = Math.floor(Date.now() / 1000);

      try {
        await db
          .prepare(`
            INSERT INTO event_processing_log (
              id, event_id, event_type, event_version, 
              consumer, processed_at, status, retry_count,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'processed', 0, ?, ?)
          `)
          .bind(id, eventId, eventType, eventVersion, consumerName, now, now, now)
          .run();

        return true;
      } catch (error) {
        // Likely duplicate key - event was already processed
        if (error instanceof Error && error.message.includes('UNIQUE constraint')) {
          return false;
        }
        throw error;
      }
    },

    /**
     * Mark an event as successfully processed.
     */
    async markProcessed(
      eventId: string,
      resultReference?: string
    ): Promise<void> {
      const now = Math.floor(Date.now() / 1000);

      await db
        .prepare(`
          UPDATE event_processing_log
          SET status = 'processed',
              result_reference = ?,
              processed_at = ?,
              updated_at = ?
          WHERE event_id = ? AND consumer = ?
        `)
        .bind(resultReference || null, now, now, eventId, consumerName)
        .run();
    },

    /**
     * Mark an event processing as failed.
     */
    async markFailed(
      eventId: string,
      errorCode: string,
      errorMessage: string
    ): Promise<void> {
      const now = Math.floor(Date.now() / 1000);

      await db
        .prepare(`
          UPDATE event_processing_log
          SET status = 'failed',
              error_code = ?,
              error_message = ?,
              retry_count = retry_count + 1,
              updated_at = ?
          WHERE event_id = ? AND consumer = ?
        `)
        .bind(errorCode, errorMessage, now, eventId, consumerName)
        .run();
    },

    /**
     * Get processing record for an event.
     */
    async getRecord(eventId: string): Promise<EventProcessingRecord | null> {
      const result = await db
        .prepare(`
          SELECT * FROM event_processing_log
          WHERE event_id = ? AND consumer = ?
        `)
        .bind(eventId, consumerName)
        .first<EventProcessingRecord>();

      return result || null;
    },

    /**
     * Get failed events for retry.
     */
    async getFailedEvents(limit: number = 100): Promise<EventProcessingRecord[]> {
      const result = await db
        .prepare(`
          SELECT * FROM event_processing_log
          WHERE consumer = ? AND status = 'failed'
          ORDER BY created_at ASC
          LIMIT ?
        `)
        .bind(consumerName, limit)
        .all<EventProcessingRecord>();

      return result.results;
    },

    /**
     * Clear processing record (for testing or manual cleanup).
     */
    async clear(eventId: string): Promise<void> {
      await db
        .prepare(`
          DELETE FROM event_processing_log
          WHERE event_id = ? AND consumer = ?
        `)
        .bind(eventId, consumerName)
        .run();
    },

    /**
     * Clear all records (for testing).
     */
    async clearAll(): Promise<void> {
      await db
        .prepare(`
          DELETE FROM event_processing_log
          WHERE consumer = ?
        `)
        .bind(consumerName)
        .run();
    },
  };
}

// =============================================================================
// Types Export
// =============================================================================

export type EventIdempotencyStore = ReturnType<typeof createEventIdempotencyStore>;
