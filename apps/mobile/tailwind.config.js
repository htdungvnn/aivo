/** @type {import('nativewind').NativeWindConfig} */
module.exports = {
  presets: {
    nativewind: "nativewind-preset",
  },
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        facebook: {
          DEFAULT: "#1877F2",
          light: "rgba(24, 119, 242, 0.1)",
        },
        google: {
          DEFAULT: "#4285F4",
        },
        success: {
          DEFAULT: "#22c55e",
          light: "rgba(34, 197, 94, 0.1)",
        },
        error: {
          DEFAULT: "#ef4444",
        },
        // Gray scale for dark theme
        gray: {
          50: "#f9fafb",
          100: "#f3f4f6",
          200: "#e5e7eb",
          300: "#d1d5db",
          400: "#9ca3af",
          500: "#6b7280",
          600: "#4b5563",
          700: "#374151",
          800: "#1f2937",
          900: "#111827",
          950: "#030712",
        },
      },
    },
  },
};
