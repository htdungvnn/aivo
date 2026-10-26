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
 * A one-time password input.
 *
 * The code is numeric and short, so the field uses a numeric keyboard and a
 * generous letter spacing. It is masked by default — the code is a secret,
 * even though it is short-lived.
 */
export function AuthOtpField({
  label,
  error,
  length,
  ...props
}: TextInputProps & { label: string; error?: string; length: number }) {
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
          keyboardType="number-pad"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={length}
          textContentType="oneTimeCode"
          style={[
            styles.input,
            styles.otpInput,
            error ? styles.inputError : null,
            props.style
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide code' : 'Show code'}
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
  otpInput: {
    paddingRight: 72,
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 8,
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
});
