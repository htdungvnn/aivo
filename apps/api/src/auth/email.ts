import type { AuthEnv } from "./middleware.ts";

/**
 * Sends transactional authentication email through Cloudflare's Email
 * Service binding.
 *
 * The sender address is configured rather than hardcoded, and the binding is
 * only available in environments where the sending domain is verified.
 */
export async function sendAuthEmail(
  env: AuthEnv["Bindings"],
  message: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  },
): Promise<void> {
  const sender = env.AUTH_EMAIL_FROM;
  if (!sender) {
    throw new Error("AUTH_EMAIL_FROM is not configured");
  }

  await env.EMAIL.send({
    from: sender,
    to: message.to,
    subject: message.subject,
    text: message.text,
    ...(message.html ? { html: message.html } : {}),
  });
}
