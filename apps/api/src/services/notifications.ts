/**
 * Notification service for sending push notifications via Expo
 */
import { eq } from "drizzle-orm";
import type { createDrizzleInstance} from "@aivo/db";
import { users, notifications } from "@aivo/db";

interface ExpoPushResponse {
  data?: { id?: string } | null;
  ticket?: string;
  error?: string;
}

export interface PushNotification {
  to: string; // Expo push token
  title: string;
  body: string;
  data?: Record<string, string | number | boolean>;
  sound?: string;
}

export async function sendExpoPushNotification(
  pushToken: string,
  notification: PushNotification
): Promise<{ success: boolean; ticket?: string; error?: string }> {
  const message = {
    to: pushToken,
    title: notification.title,
    body: notification.body,
    data: notification.data || {},
    sound: notification.sound || "default",
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json() as ExpoPushResponse | null;

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error("[Notifications] Expo push error:", result);
      return { success: false, error: result?.error || "Failed to send push" };
    }

    // Expo returns a ticket for tracking
    const ticket = result?.data?.id || result?.ticket;
    return { success: true, ticket };
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[Notifications] Push send error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

export async function sendFormAnalysisCompleteNotification(
  drizzle: ReturnType<typeof createDrizzleInstance>,
  userId: string,
  videoId: string,
  grade: string,
  overallScore: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user's push token
    const user = await drizzle.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.expoPushToken) {
      return { success: false, error: "No push token for user" };
    }

    // Create notification record
    const notificationId = `notif_${crypto.randomUUID()}`;
    const now = Math.floor(Date.now() / 1000);

    await drizzle.insert(notifications).values({
      id: notificationId,
      userId,
      type: "form_analysis_complete",
      title: "Form Analysis Ready!",
      body: `Your ${grade} form analysis is complete. Overall score: ${Math.round(overallScore)}/100.`,
      data: JSON.stringify({ videoId, grade, overallScore }),
      channel: "push",
      status: "pending",
      createdAt: now,
    });

    // Send push notification
    const pushResult = await sendExpoPushNotification(user.expoPushToken, {
      to: user.expoPushToken,
      title: "Form Analysis Ready!",
      body: `Your form analysis is complete. Score: ${Math.round(overallScore)}/100 - Grade: ${grade}`,
      data: { videoId, grade, overallScore, type: "form_analysis_complete" },
      sound: "default",
    });

    if (pushResult.success) {
      // Update notification as sent
      await drizzle
        .update(notifications)
        .set({
          status: "sent",
          expoPushTicket: pushResult.ticket,
          sentAt: now,
        })
        .where(eq(notifications.id, notificationId));

      return { success: true };
    } else {
      // Mark notification as failed
      await drizzle
        .update(notifications)
        .set({ status: "failed" })
        .where(eq(notifications.id, notificationId));
      return { success: false, error: pushResult.error };
    }
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error("[Notifications] Failed to send form complete notification:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}
