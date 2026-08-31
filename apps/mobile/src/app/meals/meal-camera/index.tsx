/**
 * AIVO Mobile - Meal Camera Screen
 * Capture and analyze meals using AI
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/ui';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';

import {
  Card,
  Button,
  ProgressRing,
  Badge,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CaptureState = 'idle' | 'capturing' | 'uploading' | 'processing' | 'review' | 'error';

export default function MealCameraScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [state, setState] = useState<CaptureState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Request camera permissions
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please enable camera access to take photos of your meals.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Request gallery permissions
  const requestGalleryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Gallery Permission Required',
        'Please enable gallery access to select photos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Take photo
  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    setState('capturing');

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.75,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      processImage();
    } else {
      setState('idle');
    }
  };

  // Pick from gallery
  const pickFromGallery = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;

    setState('capturing');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.75,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      processImage();
    } else {
      setState('idle');
    }
  };

  // Simulate image processing
  const processImage = async () => {
    setState('uploading');
    
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 100));
      setProgress(i);
    }

    setState('processing');
    
    // Simulate processing stages
    const stages = [
      'Analyzing image...',
      'Detecting foods...',
      'Matching food catalog...',
      'Calculating nutrition...',
    ];

    for (const stage of stages) {
      await new Promise(r => setTimeout(r, 800));
    }

    // Move to review
    setState('review');
  };

  // Retake photo
  const handleRetake = () => {
    setImageUri(null);
    setState('idle');
    setProgress(0);
  };

  // Confirm meal
  const handleConfirm = () => {
    Alert.alert(
      'Meal Added',
      'Your meal has been logged successfully.',
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  // Close screen
  const handleClose = () => {
    if (state === 'review' || state === 'processing') {
      Alert.alert(
        'Discard Meal?',
        'Your analyzed meal will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const renderIdleState = () => (
    <View style={styles.idleContainer}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + '20' }]}>
        <Ionicons name="camera" size={64} color={colors.primary} />
      </View>
      
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Capture Your Meal
      </Text>
      
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Take a photo or select from gallery to analyze your meal's nutrition
      </Text>

      <View style={styles.actions}>
        <Button
          title="Take Photo"
          onPress={takePhoto}
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<Ionicons name="camera" size={20} color={colors.primaryForeground} />}
        />

        <Button
          title="Choose from Gallery"
          onPress={pickFromGallery}
          variant="secondary"
          size="lg"
          fullWidth
          leftIcon={<Ionicons name="images" size={20} color={colors.textPrimary} />}
          style={styles.galleryButton}
        />
      </View>

      <View style={[styles.tipCard, { backgroundColor: colors.surface }]}>
        <Ionicons name="bulb" size={20} color={colors.accent} />
        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
          For best results, ensure good lighting and include the entire plate in the frame.
        </Text>
      </View>
    </View>
  );

  const renderUploadingState = () => (
    <View style={styles.processingContainer}>
      <ProgressRing
        progress={progress}
        size={120}
        strokeWidth={10}
        color={colors.primary}
        showPercent
      />
      <Text style={[styles.processingTitle, { color: colors.textPrimary }]}>
        Uploading image...
      </Text>
      <Text style={[styles.processingSubtitle, { color: colors.textSecondary }]}>
        {progress}% complete
      </Text>
    </View>
  );

  const renderProcessingState = () => (
    <View style={styles.processingContainer}>
      <View style={styles.processingAnimation}>
        <Ionicons name="sparkles" size={64} color={colors.ai} />
      </View>
      <Text style={[styles.processingTitle, { color: colors.textPrimary }]}>
        Analyzing your meal
      </Text>
      <Text style={[styles.processingSubtitle, { color: colors.textSecondary }]}>
        AI is identifying foods and calculating nutrition
      </Text>
    </View>
  );

  const renderReviewState = () => (
    <View style={styles.reviewContainer}>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
      )}

      <Card variant="elevated" padding="lg" style={styles.resultsCard}>
        <View style={styles.resultsHeader}>
          <Text style={[styles.resultsTitle, { color: colors.textPrimary }]}>
            Detected Foods
          </Text>
          <Badge label="85% confidence" variant="success" size="sm" />
        </View>

        <View style={styles.detectedFoods}>
          <View style={styles.foodItem}>
            <View style={[styles.foodIcon, { backgroundColor: colors.nutrition + '20' }]}>
              <Ionicons name="restaurant" size={16} color={colors.nutrition} />
            </View>
            <View style={styles.foodInfo}>
              <Text style={[styles.foodName, { color: colors.textPrimary }]}>
                Grilled Chicken Breast
              </Text>
              <Text style={[styles.foodPortion, { color: colors.textMuted }]}>
                150g serving
              </Text>
            </View>
            <Text style={[styles.foodCalories, { color: colors.nutrition }]}>
              165 cal
            </Text>
          </View>

          <View style={styles.foodItem}>
            <View style={[styles.foodIcon, { backgroundColor: colors.info + '20' }]}>
              <Ionicons name="leaf" size={16} color={colors.info} />
            </View>
            <View style={styles.foodInfo}>
              <Text style={[styles.foodName, { color: colors.textPrimary }]}>
                Brown Rice
              </Text>
              <Text style={[styles.foodPortion, { color: colors.textMuted }]}>
                1 cup
              </Text>
            </View>
            <Text style={[styles.foodCalories, { color: colors.info }]}>
              218 cal
            </Text>
          </View>

          <View style={styles.foodItem}>
            <View style={[styles.foodIcon, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="nutrition" size={16} color={colors.success} />
            </View>
            <View style={styles.foodInfo}>
              <Text style={[styles.foodName, { color: colors.textPrimary }]}>
                Mixed Vegetables
              </Text>
              <Text style={[styles.foodPortion, { color: colors.textMuted }]}>
                1 cup
              </Text>
            </View>
            <Text style={[styles.foodCalories, { color: colors.success }]}>
              65 cal
            </Text>
          </View>
        </View>

        <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
          <Text style={[styles.totalLabel, { color: colors.textPrimary }]}>
            Total
          </Text>
          <View style={styles.totalValues}>
            <Text style={[styles.totalCalories, { color: colors.primary }]}>
              448 cal
            </Text>
            <Text style={[styles.totalMacros, { color: colors.textMuted }]}>
              P: 42g  C: 45g  F: 12g
            </Text>
          </View>
        </View>
      </Card>

      <View style={styles.reviewActions}>
        <Button
          title="Retake"
          onPress={handleRetake}
          variant="secondary"
          size="lg"
          leftIcon={<Ionicons name="refresh" size={20} color={colors.textPrimary} />}
          style={styles.retakeButton}
        />
        <Button
          title="Confirm Meal"
          onPress={handleConfirm}
          variant="primary"
          size="lg"
          leftIcon={<Ionicons name="checkmark" size={20} color={colors.primaryForeground} />}
          style={styles.confirmButton}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          {state === 'review' ? 'Review Meal' : 'AI Meal Analysis'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {state === 'idle' && renderIdleState()}
        {state === 'capturing' && (
          <View style={styles.processingContainer}>
            <Text style={[styles.processingTitle, { color: colors.textPrimary }]}>
              Opening camera...
            </Text>
          </View>
        )}
        {state === 'uploading' && renderUploadingState()}
        {state === 'processing' && renderProcessingState()}
        {state === 'review' && renderReviewState()}
        {state === 'error' && (
          <View style={styles.processingContainer}>
            <Ionicons name="alert-circle" size={64} color={colors.danger} />
            <Text style={[styles.processingTitle, { color: colors.textPrimary }]}>
              Analysis Failed
            </Text>
            <Button
              title="Try Again"
              onPress={handleRetake}
              variant="primary"
              size="lg"
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacingNamed.lg,
    paddingVertical: spacingNamed.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  headerRight: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacingNamed['2xl'],
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingNamed['2xl'],
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacingNamed.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacingNamed['2xl'],
  },
  actions: {
    width: '100%',
    gap: spacingNamed.md,
  },
  galleryButton: {
    marginTop: spacingNamed.sm,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacingNamed.md,
    borderRadius: 12,
    marginTop: spacingNamed['2xl'],
    gap: spacingNamed.sm,
  },
  tipText: {
    flex: 1,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacingNamed['2xl'],
  },
  processingAnimation: {
    marginBottom: spacingNamed.xl,
  },
  processingTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    marginBottom: spacingNamed.sm,
  },
  processingSubtitle: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  reviewContainer: {
    flex: 1,
  },
  previewImage: {
    width: '100%',
    height: 250,
  },
  resultsCard: {
    marginHorizontal: spacingNamed.lg,
    marginTop: -spacingNamed['2xl'],
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingNamed.lg,
  },
  resultsTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  detectedFoods: {
    gap: spacingNamed.md,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  foodPortion: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  foodCalories: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacingNamed.lg,
    paddingTop: spacingNamed.lg,
    borderTopWidth: 1,
  },
  totalLabel: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  totalValues: {
    alignItems: 'flex-end',
  },
  totalCalories: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  totalMacros: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  reviewActions: {
    flexDirection: 'row',
    paddingHorizontal: spacingNamed.lg,
    paddingVertical: spacingNamed.lg,
    gap: spacingNamed.md,
  },
  retakeButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 2,
  },
});

export {};
