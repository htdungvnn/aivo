/**
 * AIVO Mobile - State Components
 * Loading, Empty, Error, and Offline states
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/ui';

import { Colors, spacingNamed, fontSize, fontWeight, borderRadius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Button } from './Button';

// =============================================================================
// Loading State
// =============================================================================

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
  style?: ViewStyle;
}

export function LoadingState({
  message = 'Loading...',
  size = 'large',
  fullScreen = false,
  style,
}: LoadingStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const content = (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && (
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );

  if (fullScreen) {
    return (
      <View style={[styles.fullScreenContainer, { backgroundColor: colors.background }, style]}>
        {content}
      </View>
    );
  }

  return <View style={[styles.loadingWrapper, style]}>{content}</View>;
}

// Skeleton loading
interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceMuted,
        },
        style,
      ]}
    />
  );
}

// Skeleton card
interface SkeletonCardProps {
  lines?: number;
  showHeader?: boolean;
  style?: ViewStyle;
}

export function SkeletonCard({ lines = 3, showHeader = true, style }: SkeletonCardProps) {
  return (
    <View style={[styles.skeletonCard, style]}>
      {showHeader && (
        <View style={styles.skeletonHeader}>
          <Skeleton width={120} height={16} />
          <Skeleton width={60} height={14} />
        </View>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '60%' : '100%'}
          height={14}
          style={styles.skeletonLine}
        />
      ))}
    </View>
  );
}

// =============================================================================
// Empty State
// =============================================================================

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap | ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  style,
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      return (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={48}
          color={colors.textMuted}
        />
      );
    }
    return icon;
  };

  return (
    <View style={[styles.emptyContainer, style]}>
      {icon && <View style={styles.emptyIcon}>{renderIcon()}</View>}
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {description && (
        <Text style={[styles.emptyDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      )}
      {(action || secondaryAction) && (
        <View style={styles.emptyActions}>
          {action && (
            <Button
              title={action.label}
              onPress={action.onPress}
              variant="primary"
              size="md"
            />
          )}
          {secondaryAction && (
            <Button
              title={secondaryAction.label}
              onPress={secondaryAction.onPress}
              variant="ghost"
              size="md"
            />
          )}
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Error State
// =============================================================================

interface ErrorStateProps {
  title?: string;
  message?: string;
  error?: Error | null;
  onRetry?: () => void;
  onContactSupport?: () => void;
  style?: ViewStyle;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  error,
  onRetry,
  onContactSupport,
  style,
}: ErrorStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const displayMessage = message || error?.message || 'An unexpected error occurred.';

  return (
    <View style={[styles.errorContainer, style]}>
      <View style={styles.errorIcon}>
        <Ionicons name="alert-circle" size={48} color={colors.danger} />
      </View>
      <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
        {displayMessage}
      </Text>
      <View style={styles.errorActions}>
        {onRetry && (
          <Button
            title="Try Again"
            onPress={onRetry}
            variant="primary"
            size="md"
          />
        )}
        {onContactSupport && (
          <Button
            title="Contact Support"
            onPress={onContactSupport}
            variant="ghost"
            size="md"
          />
        )}
      </View>
    </View>
  );
}

// =============================================================================
// Offline State
// =============================================================================

interface OfflineStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  lastSyncTime?: Date | null;
  style?: ViewStyle;
}

export function OfflineState({
  title = 'You\'re offline',
  message = 'Check your internet connection and try again.',
  onRetry,
  lastSyncTime,
  style,
}: OfflineStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const formatLastSync = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  return (
    <View style={[styles.offlineContainer, style]}>
      <View style={[styles.offlineBanner, { backgroundColor: colors.warning + '20' }]}>
        <Ionicons name="cloud-offline" size={20} color={colors.warning} />
        <Text style={[styles.offlineBannerText, { color: colors.warning }]}>
          Offline Mode
        </Text>
      </View>
      
      <View style={styles.offlineContent}>
        <View style={styles.offlineIcon}>
          <Ionicons name="wifi" size={48} color={colors.textMuted} />
        </View>
        <Text style={[styles.offlineTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.offlineMessage, { color: colors.textSecondary }]}>
          {message}
        </Text>
        
        {lastSyncTime && (
          <Text style={[styles.lastSync, { color: colors.textMuted }]}>
            Last synced: {formatLastSync(lastSyncTime)}
          </Text>
        )}
        
        {onRetry && (
          <Button
            title="Retry"
            onPress={onRetry}
            variant="primary"
            size="md"
            style={styles.retryButton}
          />
        )}
      </View>
    </View>
  );
}

// =============================================================================
// Partial Data State
// =============================================================================

interface PartialDataStateProps {
  title?: string;
  message: string;
  missingData: string[];
  onRefresh?: () => void;
  style?: ViewStyle;
}

export function PartialDataState({
  title = 'Incomplete data',
  message,
  missingData,
  onRefresh,
  style,
}: PartialDataStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.partialContainer, style]}>
      <View style={[styles.partialBanner, { backgroundColor: colors.info + '15' }]}>
        <Ionicons name="information-circle" size={20} color={colors.info} />
        <Text style={[styles.partialBannerText, { color: colors.info }]}>
          {title}
        </Text>
      </View>

      <Text style={[styles.partialMessage, { color: colors.textSecondary }]}>
        {message}
      </Text>

      {missingData.length > 0 && (
        <View style={styles.missingList}>
          <Text style={[styles.missingTitle, { color: colors.textSecondary }]}>
            Missing:
          </Text>
          {missingData.map((item, index) => (
            <View key={index} style={styles.missingItem}>
              <Ionicons name="ellipse" size={6} color={colors.textMuted} />
              <Text style={[styles.missingText, { color: colors.textMuted }]}>
                {item}
              </Text>
            </View>
          ))}
        </View>
      )}

      {onRefresh && (
        <Button
          title="Refresh"
          onPress={onRefresh}
          variant="outline"
          size="sm"
          style={styles.refreshButton}
        />
      )}
    </View>
  );
}

// =============================================================================
// Stale Data State
// =============================================================================

interface StaleDataStateProps {
  lastUpdated: Date;
  onRefresh?: () => void;
  style?: ViewStyle;
}

export function StaleDataState({
  lastUpdated,
  onRefresh,
  style,
}: StaleDataStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const formatLastUpdated = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (hours < 1) return 'Updated less than an hour ago';
    if (hours < 24) return `Updated ${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days === 1) return 'Updated yesterday';
    return `Updated ${days} days ago`;
  };

  return (
    <View style={[styles.staleContainer, style]}>
      <View style={styles.staleContent}>
        <Ionicons name="time" size={16} color={colors.warning} />
        <Text style={[styles.staleText, { color: colors.textSecondary }]}>
          {formatLastUpdated(lastUpdated)}
        </Text>
      </View>
      {onRefresh && (
        <Button
          title="Refresh"
          onPress={onRefresh}
          variant="ghost"
          size="sm"
        />
      )}
    </View>
  );
}

// =============================================================================
// Offline Banner
// =============================================================================

interface OfflineBannerProps {
  onRetry?: () => void;
  style?: ViewStyle;
}

export function OfflineBanner({ onRetry, style }: OfflineBannerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.offlineBannerContainer, { backgroundColor: colors.warning + '20' }, style]}>
      <Ionicons name="cloud-offline" size={16} color={colors.warning} />
      <Text style={[styles.offlineBannerText, { color: colors.warning }]}>
        You're offline
      </Text>
      {onRetry && (
        <Button
          title="Retry"
          onPress={onRetry}
          variant="ghost"
          size="sm"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Loading
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingNamed['2xl'],
  },
  loadingWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacingNamed.md,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },

  // Skeleton
  skeleton: {
    overflow: 'hidden',
  },
  skeletonCard: {
    padding: spacingNamed.lg,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacingNamed.md,
  },
  skeletonLine: {
    marginBottom: spacingNamed.sm,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingNamed['3xl'],
  },
  emptyIcon: {
    marginBottom: spacingNamed.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacingNamed.sm,
  },
  emptyDescription: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacingNamed.lg,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: spacingNamed.md,
  },

  // Error
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingNamed['3xl'],
  },
  errorIcon: {
    marginBottom: spacingNamed.lg,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacingNamed.sm,
  },
  errorMessage: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacingNamed.lg,
  },
  errorActions: {
    flexDirection: 'row',
    gap: spacingNamed.md,
  },

  // Offline
  offlineContainer: {
    flex: 1,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingNamed.sm,
    paddingHorizontal: spacingNamed.lg,
    gap: spacingNamed.sm,
  },
  offlineBannerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  offlineContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacingNamed['3xl'],
  },
  offlineIcon: {
    marginBottom: spacingNamed.lg,
  },
  offlineTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacingNamed.sm,
  },
  offlineMessage: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  lastSync: {
    fontSize: fontSize.xs,
    marginTop: spacingNamed.lg,
  },
  retryButton: {
    marginTop: spacingNamed.lg,
  },

  // Partial Data
  partialContainer: {},
  partialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingNamed.sm,
    paddingHorizontal: spacingNamed.lg,
    gap: spacingNamed.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacingNamed.md,
  },
  partialBannerText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  partialMessage: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacingNamed.md,
  },
  missingList: {
    marginBottom: spacingNamed.md,
  },
  missingTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacingNamed.sm,
  },
  missingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.sm,
    marginBottom: spacingNamed.xs,
  },
  missingText: {
    fontSize: fontSize.sm,
  },
  refreshButton: {
    alignSelf: 'flex-start',
  },

  // Stale
  staleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  staleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.sm,
  },
  staleText: {
    fontSize: fontSize.xs,
  },

  // Offline Banner
  offlineBannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacingNamed.sm,
    paddingHorizontal: spacingNamed.md,
    gap: spacingNamed.sm,
  },
});

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
};
