import { expoClient } from "@better-auth/expo/client";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

/**
 * The Better Auth client used by the mobile app.
 *
 * The Expo client plugin stores the session cookie in the device's secure
 * store and drives the social sign-in flow through the system browser.
 *
 * The API base URL is public configuration — no secret is ever bundled into
 * the app.
 */
export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001",
  basePath: "/api/auth",
  plugins: [
    expoClient({
      scheme: "aivo",
      storagePrefix: "aivo",
      storage: SecureStore,
    }),
  ],
});
