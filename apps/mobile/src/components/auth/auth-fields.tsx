import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { Spacing } from '@/constants/theme';

import { AuthColors } from './auth-primitives';

/**
 * A labelled text input.
 *
 * The label is associated with the input for screen readers, and the error
 * is rendered next to the field rather than detached from it.
 */
export function AuthTextField({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={AuthColors.textSecondary}
        onFocus={(event) => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        style={[
          styles.input,
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          props.multiline ? styles.inputMultiline : null,
          props.style,
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A password input with a visibility toggle.
 */
export function AuthPasswordField({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordRow}>
        <TextInput
          {...props}
          accessibilityLabel={label}
          placeholderTextColor={AuthColors.textSecondary}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, styles.passwordInput, error ? styles.inputError : null, props.style]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          onPress={() => setVisible((current) => !current)}
          hitSlop={8}
          style={styles.toggle}>
          <Text style={styles.toggleText}>{visible ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The password requirements checklist.
 *
 * The requirements come from the backend policy, so the list can never
 * disagree with what the server enforces.
 */
export function AuthPasswordRequirements({
  requirements
}: {
  requirements: readonly { id: string; label: string; satisfied: boolean }[];
}) {
  return (
    <View style={styles.requirements}>
      {requirements.map((requirement) => (
        <View key={requirement.id} style={styles.requirementRow}>
          <Text
            style={[
              styles.requirementMark,
              { color: requirement.satisfied ? AuthColors.primary : AuthColors.textSecondary },
            ]}>
            {requirement.satisfied ? '✓' : '○'}
          </Text>
          <Text
            style={[
              styles.requirementLabel,
              { color: requirement.satisfied ? AuthColors.primary : AuthColors.textSecondary },
            ]}>
            {requirement.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.two,
  },
  label: {
    color: AuthColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AuthColors.hairlineStrong,
    backgroundColor: AuthColors.card,
    color: AuthColors.text,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  inputMultiline: {
    height: 96,
    paddingTop: Spacing.three,
    textAlignVertical: 'top',
  },
  inputFocused: {
    borderColor: AuthColors.primary,
  },
  inputError: {
    borderColor: AuthColors.danger,
  },
  passwordRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 72,
  },
  toggle: {
    position: 'absolute',
    right: Spacing.three,
    paddingVertical: Spacing.one,
  },
  toggleText: {
    color: AuthColors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  fieldError: {
    color: AuthColors.danger,
    fontSize: 13,
  },
  requirements: {
    gap: Spacing.one,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  requirementMark: {
    fontSize: 13,
    width: 16,
  },
  requirementLabel: {
    fontSize: 13,
  },
});
