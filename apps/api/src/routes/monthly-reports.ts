import { Hono } from "hono";
import { z } from "zod";
import { createDrizzleInstance } from "@aivo/db";
import { sendMonthlyReport, defaultEmailConfig } from "@aivo/email-reporter";
import { users } from "@aivo/db";
import { eq } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { authenticate, getUserFromContext, type AuthUser } from "../middleware/auth";

interface EnvWithR2 {
  DB: D1Database;
}

// Minimal user data needed for monthly reports - matches DB schema + name for emails
interface MonthlyReportUser {
  id: string;
  email: string;
  name: string;
  receiveMonthlyReports: number;
}

const MonthlyReportSchema = z.object({
  year: z.number().int().positive(),
  month: z.number().int().min(1).max(12),
  dryRun: z.boolean().optional(),
});

export async function triggerMonthlyReports(
  drizzle: ReturnType<typeof createDrizzleInstance>,
  year: number,
  month: number,
  dryRun: boolean = false
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const userRows = await drizzle.query.users.findMany({
    where: eq(users.receiveMonthlyReports, 1),
    columns: {
      id: true,
      email: true,
      name: true,
      receiveMonthlyReports: true,
    },
  }) as MonthlyReportUser[];

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  const batchSize = 10;
  for (let i = 0; i < userRows.length; i += batchSize) {
    const batch = userRows.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (user) => {
        if (dryRun) {
          return { success: true, user: user.email };
        }
        // Cast to any to bypass type mismatch - sendMonthlyReport only uses id, email, name
        return sendMonthlyReport(drizzle, user as any, year, month, defaultEmailConfig);
      })
    );

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        const value = result.value as { success: boolean; error?: string };
        if (value.success) {
          sent++;
        } else {
          failed++;
          const errorMsg = value.error || 'Unknown error';
          errors.push(`Failed for ${batch[idx].email}: ${errorMsg}`);
        }
      } else {
        failed++;
        errors.push(`Failed for ${batch[idx].email}: ${String(result.reason)}`);
      }
    });

    if (i + batchSize < userRows.length && !dryRun) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return { sent, failed, errors };
}

export const MonthlyReportRouter = () => {
  const router = new Hono<{ Bindings: EnvWithR2 }>();

  // Apply authentication to admin routes (cron endpoint uses Cloudflare cron auth)
  router.use("*", authenticate);

  router.get("/cron/monthly-reports", async (c) => {
    const cf = c.req.raw.cf;
    if (!cf || cf.cron !== "0 9 1 * *") {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    try {
      const drizzle = createDrizzleInstance(c.env.DB);
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();

      let reportYear = year;
      let reportMonth = month;
      if (month === 0) {
        reportYear = year - 1;
        reportMonth = 12;
      }

      const { sent, failed, errors } = await triggerMonthlyReports(drizzle, reportYear, reportMonth, false);

      // eslint-disable-next-line no-console
      console.log(`Monthly report cron: processed ${sent + failed}, sent=${sent}, failed=${failed}`);

      return c.json({
        success: true,
        year: reportYear,
        month: reportMonth,
        processed: sent + failed,
        sent,
        failed,
        errors: errors.slice(0, 10),
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Monthly report cron error:", error);
      return c.json({ success: false, error: "Cron failed" }, 500);
    }
  });

  router.post("/admin/monthly-reports", async (c) => {
    try {
      const { year, month, dryRun = false } = MonthlyReportSchema.parse(await c.req.json());
      const drizzle = createDrizzleInstance(c.env.DB);

      const { sent, failed, errors } = await triggerMonthlyReports(drizzle, year, month, dryRun);

      return c.json({
        success: true,
        year,
        month,
        processed: sent + failed,
        sent,
        failed,
        errors: errors.slice(0, 10),
        dryRun,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Monthly report trigger error:", error);
      return c.json({ success: false, error: "Failed to trigger monthly reports" }, 500);
    }
  });

  router.put("/users/:userId/email-preferences", async (c) => {
    const authUser = getUserFromContext(c) as AuthUser;
    const requesterId = authUser.id;
    const targetUserId = c.req.param("userId");

    if (requesterId !== targetUserId) {
      return c.json({ success: false, error: "Unauthorized" }, 403);
    }

    try {
      const { receiveMonthlyReports } = z.object({
        receiveMonthlyReports: z.boolean().optional(),
      }).parse(await c.req.json());

      const drizzle = createDrizzleInstance(c.env.DB);

      await drizzle
        .update(users)
        .set({
          ...(receiveMonthlyReports !== undefined && { receiveMonthlyReports: receiveMonthlyReports ? 1 : 0 }),
          updatedAt: Math.floor(Date.now() / 1000),
        })
        .where(eq(users.id, c.req.param("userId")));

      return c.json({ success: true, message: "Preferences updated" });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Update email preferences error:", error);
      return c.json({ success: false, error: "Failed to update preferences" }, 500);
    }
  });

  return router;
};
