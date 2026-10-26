import { expoClient } from "@better-auth/expo";
import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import * as SecureStore from "expo-secure-store";

/**
 * The Better Auth client used by the mobile app.
 *
 * The Expo client plugin stores the session cookie in the device's secure
 * store and drives the social sign-in flow through the system browser.
 *
 * The API base URL is public configuration — no secret is ever bundled into
 * the app. It defaults to the deployed API so a release build talks to
 * production; set `EXPO_PUBLIC_API_URL` to point at a local Worker instead.
 */
export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "https://api.htdung-aivo.workers.dev",
  basePath: "/api/auth",
  plugins: [
    expoClient({
      scheme: "aivo",
      storagePrefix: "aivo",
      storage: SecureStore,
    }),
    emailOTPClient(),
  ],
});
