"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    // Only register in production
    if (typeof window === "undefined" || process.env.NODE_ENV !== "production") {
      return;
    }

    if ("serviceWorker" in navigator) {
      // Register the service worker
      const register = async () => {
        try {
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });

          // eslint-disable-next-line no-console
          console.log("[SW] Registered successfully:", registration);

          // Check for updates
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  // New content is available
                  // eslint-disable-next-line no-console
                  console.log("[SW] New content is available; please refresh.");
                  // You could show a toast/notification here
                }
              });
            }
          });

          // Listen for messages from the service worker
          navigator.serviceWorker.addEventListener("message", (event) => {
            // eslint-disable-next-line no-console
            console.log("[SW] Message from service worker:", event.data);
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("[SW] Registration failed:", error);
        }
      };

      // Wait for page load to register
      if (document.readyState === "complete") {
        register();
      } else {
        window.addEventListener("load", register);
      }

      // Cleanup
      return () => {
        window.removeEventListener("load", register);
      };
    }
  }, []);

  return null;
}

export default ServiceWorkerRegistration;
