/**
 * AIVO Mobile - Button Components
 * Primary, Secondary, Icon, and Ghost button variants
 */

import React, { forwardRef } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Colors, spacingNamed, borderRadius, fontSize, fontWeight, TouchTarget, Shadows } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Button variants
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'ai';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

interface ButtonProps extends ButtonBaseProps, Omit<React.ComponentProps<typeof TouchableOpacity>, 'children'> {
  title?: string;
}

interface IconButtonProps extends Omit<React.ComponentProps<typeof TouchableOpacity>, 'children'> {
  icon: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel: string;
}

const sizeStyles: Record<ButtonSize, { height: number; paddingH: number; fontSize: number }> = {
  sm: { height: 36, paddingH: 12, fontSize: fontSize.sm },
  md: { height: 48, paddingH: 16, fontSize: fontSize.base },
  lg: { height: 56, paddingH: 20, fontSize: fontSize.lg },
};

const iconSizeStyles: Record<ButtonSize, { size: number; iconSize: number }> = {
  sm: { size: 36, iconSize: 18 },
  md: { size: 44, iconSize: 22 },
  lg: { size: 56, iconSize: 28 },
};

function getVariantStyles(variant: ButtonVariant, colors: typeof Colors.dark, isDark: boolean) {
  const base: { container: ViewStyle; text: TextStyle } = {
    container: {},
    text: { fontWeight: fontWeight.semibold },
  };

  switch (variant) {
    case 'primary':
      return {
        container: {
          backgroundColor: colors.primary,
          ...Shadows.sm,
        },
        text: {
          color: colors.primaryForeground,
        },
      };
    case 'secondary':
      return {
        container: {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        text: {
          color: colors.textPrimary,
        },
      };
    case 'outline':
      return {
        container: {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: colors.primary,
        },
        text: {
          color: colors.primary,
        },
      };
    case 'ghost':
      return {
        container: {
          backgroundColor: 'transparent',
        },
        text: {
          color: colors.primary,
        },
      };
    case 'danger':
      return {
        container: {
          backgroundColor: colors.danger,
          ...Shadows.sm,
        },
        text: {
          color: colors.dangerForeground,
        },
      };
    case 'ai':
      return {
        container: {
          backgroundColor: colors.ai,
          ...Shadows.sm,
        },
        text: {
          color: colors.aiForeground,
        },
      };
    default:
      return base;
  }
}

export const Button = forwardRef<TouchableOpacity, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      title,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const colorScheme = useColorScheme();
    const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
    const isDark = colorScheme === 'dark';

    const variantStyles = getVariantStyles(variant, colors, isDark);
    const sizeStyle = sizeStyles[size];

    const isDisabled = disabled || loading;

    return (
      <TouchableOpacity
        ref={ref}
        activeOpacity={0.7}
        disabled={isDisabled}
        style={[
          styles.button,
          {
            height: sizeStyle.height,
            paddingHorizontal: sizeStyle.paddingH,
          },
          variantStyles.container,
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
          style,
        ]}
        {...props}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variantStyles.text.color}
          />
        ) : (
          <>
            {leftIcon && <>{leftIcon}</>}
            {title && (
              <Text
                style={[
                  styles.buttonText,
                  { fontSize: sizeStyle.fontSize },
                  variantStyles.text,
                ]}
              >
                {title}
              </Text>
            )}
            {children}
            {rightIcon && <>{rightIcon}</>}
          </>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled = false,
  accessibilityLabel,
  style,
  ...props
}: IconButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const isDark = colorScheme === 'dark';

  const sizeStyle = iconSizeStyles[size];
  const variantStyles = getVariantStyles(variant, colors, isDark);

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={[
        styles.iconButton,
        {
          width: sizeStyle.size,
          height: sizeStyle.size,
        },
        variantStyles.container,
        isDisabled && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variantStyles.text.color} />
      ) : (
        icon
      )}
    </TouchableOpacity>
  );
}

// Text button variant
export function TextButton({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const textColor = {
    primary: colors.primary,
    secondary: colors.textSecondary,
    danger: colors.danger,
  }[variant];

  const fontSizes = {
    sm: fontSize.sm,
    md: fontSize.base,
    lg: fontSize.lg,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.textButton, style]}
    >
      <Text
        style={[
          styles.textButtonText,
          { color: textColor, fontSize: fontSizes[size] },
          disabled && { opacity: 0.5 },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.buttons,
    gap: spacingNamed.sm,
    minWidth: TouchTarget.minimum,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    textAlign: 'center',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.controls,
    minWidth: TouchTarget.minimum,
    minHeight: TouchTarget.minimum,
  },
  textButton: {
    padding: spacingNamed.sm,
    minHeight: TouchTarget.minimum,
    justifyContent: 'center',
  },
  textButtonText: {
    fontWeight: fontWeight.medium,
  },
});

export default Button;
