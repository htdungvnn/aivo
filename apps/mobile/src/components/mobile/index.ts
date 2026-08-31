/**
 * AIVO Mobile Components - Index
 * Re-exports all mobile-specific components
 */

// Screen components
export {
  Screen,
  ScrollScreen,
  KeyboardAwareScreen,
} from './Screen';

// Button components
export {
  Button,
  IconButton,
  TextButton,
  type ButtonVariant,
  type ButtonSize,
} from './Button';

// Card components
export {
  Card,
  SectionCard,
} from './Card';

// Score and progress components
export {
  ScoreRing,
  ScoreRingCompact,
  ProgressRing,
} from './ScoreRing';

// Metric components
export {
  MetricCard,
  MetricRow,
  MetricStack,
} from './MetricCard';

// Badge and indicator components
export {
  Badge,
  PillBadge,
  ConfidenceBadge,
  DataSourceBadge,
  FreshnessIndicator,
  TrendIndicator,
  InsightCard,
  Disclaimer,
  type BadgeVariant,
} from './Badge';

// Header components
export {
  AppHeader,
  BackHeader,
  SectionHeader,
  TabHeader,
  GreetingHeader,
  ListHeader,
  HeaderSpacer,
} from './Header';

// State components
export {
  LoadingState,
  Skeleton,
  SkeletonCard,
  EmptyState,
  ErrorState,
  OfflineState,
  PartialDataState,
  StaleDataState,
  OfflineBanner,
} from './StateComponents';

// Re-export types
export type {
  ScreenProps,
  CardProps,
  BadgeProps,
  MetricCardProps,
  ConfidenceBadgeProps,
  DataSourceBadgeProps,
  EmptyStateProps,
  ErrorStateProps,
  OfflineStateProps,
} from './StateComponents';
