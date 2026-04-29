// ============================================
// AIVO Shared Types - Barrel Export
// ============================================
// Re-export all types from domain modules

export * from "./common";
export * from "./user";
export * from "./body";
export * from "./workout";
export * from "./ai";
export * from "./voice";
export * from "./gamification";
export * from "./activity";
export * from "./api";
export * from "./compute";
export * from "./social";
export * from "./admin";
export * from "./errors";
export * from "./validation";
export * from "./content";
export * from "./config";
export * from "./files";
export * from "./notifications";
export * from "./form";
export * from "./live-workout";
export * from "./calc";
export * from "./user-extended";
export * from "./health";
export * from "./nutrition";
export * from "./biometric";
export * from "./posture";
export * from "./planning";

// Platform-agnostic utilities (re-export from body module)
export { HeatmapRenderer } from "./body";
