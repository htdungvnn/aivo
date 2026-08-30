/**
 * Mobile Progress Component
 * AIVO Design System - Mobile Implementation
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ProgressVariant = 'default' | 'success' | 'warning' | 'error' | 'accent';
type ProgressSize = 'sm' | 'default' | 'lg';

interface ProgressProps {
  value: number;
  max?: number;
  variant?: ProgressVariant;
  size?: ProgressSize;
  style?: ViewStyle;
  showLabel?: boolean;
  label?: string;
}

const sizeMap = {
  sm: 4,
  default: 8,
  lg: 12,
};

export function Progress({
  value,
  max = 100,
  variant = 'default',
  size = 'default',
  style,
}: ProgressProps) {
  const theme = useTheme();
  const colors = Colors[theme.dark ? 'dark' : 'light'];
  
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const height = sizeMap[size];

  const getProgressColor = () => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      case 'accent':
        return colors.accent;
      default:
        return colors.primary;
    }
  };

  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor: colors.muted },
        style,
      ]}
    >
      <View
        style={[
          styles.progress,
          {
            width: `${percentage}%`,
            backgroundColor: getProgressColor(),
          },
        ]}
      />
    </View>
  );
}

interface ProgressBarProps extends ProgressProps {
  label?: string;
  sublabel?: string;
}

export function ProgressBar({
  value,
  max = 100,
  variant = 'default',
  size = 'default',
  label,
  sublabel,
  style,
}: ProgressBarProps) {
  const theme = useTheme();
  const colors = Colors[theme.dark ? 'dark' : 'light'];
  
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const height = sizeMap[size];

  const getProgressColor = () => {
    switch (variant) {
      case 'success':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.error;
      case 'accent':
        return colors.accent;
      default:
        return colors.primary;
    }
  };

  return (
    <View style={[styles.barContainer, style]}>
      {(label || sublabel) && (
        <View style={styles.barHeader}>
          {label && (
            <View style={styles.barLabel}>
              <View style={[styles.barLabelDot, { backgroundColor: getProgressColor() }]} />
              <View>
                <View style={styles.barValueText}>
                  <View>
                    <View>
                      <React.Text
                        style={[
                          styles.labelText,
                          { color: colors.foreground }
                        ]}
                      >
                        {label}
                      </React.Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
          {sublabel && (
            <View>
              <React.Text style={[styles.sublabelText, { color: colors.mutedForeground }]}>
                {sublabel}
              </React.Text>
            </View>
          )}
        </View>
      )}
      <View
        style={[
          styles.barTrack,
          { height, backgroundColor: colors.muted },
        ]}
      >
        <View
          style={[
            styles.barProgress,
            {
              width: `${percentage}%`,
              backgroundColor: getProgressColor(),
            },
          ]}
        />
      </View>
    </View>
  );
}

// Simple text component workaround
const React = { Text: require('react-native').Text };

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  barContainer: {
    width: '100%',
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  barLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabelDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  barValueText: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sublabelText: {
    fontSize: 12,
  },
  barTrack: {
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  barProgress: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});

export default Progress;
