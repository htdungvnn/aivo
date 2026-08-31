/**
 * Shared Components - Reusable UI components for the AIVO app
 */

// Shell components
export { AppShell, Sidebar, MobileNavigation, TopHeader, useAppShell } from "../shell";

// Score and progress
export { ScoreRing } from "./score-ring";

// Cards
export { MetricCard, QuickMetric } from "./metric-card";
export { ChartCard, SimpleChart } from "./chart-card";

// State components
export {
  LoadingSpinner,
  Skeleton,
  LoadingState,
  DashboardSkeleton,
  ListSkeleton,
  EmptyState,
  NoDataEmptyState,
  NoResultsEmptyState,
  StaleDataState,
  ErrorState,
  InlineError,
  OfflineState,
  PageState,
} from "./state-components";

// i18n
export { LanguageSwitcher } from "./language-switcher";
