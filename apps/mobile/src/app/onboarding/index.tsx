/**
 * Onboarding Screen
 * First-time user experience - welcome and setup wizard
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to AIVO',
    subtitle: 'Your AI-powered health and fitness companion',
    icon: 'fitness',
    color: '#007AFF',
  },
  {
    id: 'track',
    title: 'Track Everything',
    subtitle: 'Log meals, workouts, and health metrics with AI assistance',
    icon: 'analytics',
    color: '#34C759',
  },
  {
    id: 'coach',
    title: 'AI Coach',
    subtitle: 'Get personalized guidance and real-time workout feedback',
    icon: 'school',
    color: '#AF52DE',
  },
  {
    id: 'insights',
    title: 'Smart Insights',
    subtitle: 'Understand your patterns and optimize your wellness',
    icon: 'bulb',
    color: '#FF9500',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const isDark = colorScheme === 'dark';

  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    // TODO: Save onboarding completion flag to storage
    // For now, just navigate to login
    router.replace('/auth/login');
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Skip Button */}
      <View style={styles.skipContainer}>
        {currentStep < ONBOARDING_STEPS.length - 1 && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
              Skip
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: step.color + '20' },
          ]}
        >
          <Ionicons name={step.icon as any} size={80} color={step.color} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {step.title}
        </Text>

        {/* Subtitle */}
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {step.subtitle}
        </Text>
      </View>

      {/* Progress Dots */}
      <View style={styles.dotsContainer}>
        {ONBOARDING_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor:
                  index === currentStep ? step.color : colors.border,
                width: index === currentStep ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: step.color }]}
          onPress={handleNext}
        >
          <Text style={styles.primaryButtonText}>
            {currentStep === ONBOARDING_STEPS.length - 1
              ? 'Get Started'
              : 'Continue'}
          </Text>
          <Ionicons
            name={
              currentStep === ONBOARDING_STEPS.length - 1
                ? 'arrow-forward'
                : 'chevron-forward'
            }
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {currentStep < ONBOARDING_STEPS.length - 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setCurrentStep(currentStep - 1)}
            disabled={currentStep === 0}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={currentStep === 0 ? colors.border : colors.textPrimary}
            />
            <Text
              style={[
                styles.backButtonText,
                { color: currentStep === 0 ? colors.border : colors.textPrimary },
              ]}
            >
              Back
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 16,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 40,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
  },
});
