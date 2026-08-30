/**
 * Meal Capture Screen
 * Camera and gallery integration for meal photos
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/icons';

import {
  NutritionApiClient,
  NutritionApiError,
  getNutritionClient,
} from '@/lib/nutrition';

type CaptureMode = 'camera' | 'gallery' | 'idle';

export default function MealCaptureScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<CaptureMode>('idle');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>('lunch');
  
  const nutritionClient = getNutritionClient();
  
  /**
   * Request camera permissions
   */
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Please grant camera access to take meal photos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    return true;
  }, []);
  
  /**
   * Request gallery permissions
   */
  const requestGalleryPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Gallery Permission Required',
        'Please grant gallery access to select meal photos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    
    return true;
  }, []);
  
  /**
   * Take photo with camera
   */
  const takePhoto = useCallback(async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;
    
    setMode('camera');
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
      });
      
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setMode('idle');
    }
  }, [requestCameraPermission]);
  
  /**
   * Pick image from gallery
   */
  const pickFromGallery = useCallback(async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;
    
    setMode('gallery');
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
      });
      
      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setMode('idle');
    }
  }, [requestGalleryPermission]);
  
  /**
   * Analyze the selected image
   */
  const analyzeMeal = useCallback(async () => {
    if (!selectedImage) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Create analysis
      const { analysisId } = await nutritionClient.createAnalysis(mealType);
      
      // Upload image
      await nutritionClient.uploadAnalysisImage(
        analysisId,
        selectedImage.uri,
        (progress) => setUploadProgress(progress * 50)
      );
      
      setUploadProgress(50);
      
      // Navigate to analysis screen
      router.push(`/analysis/${analysisId}` as any);
    } catch (error) {
      if (error instanceof NutritionApiError) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Error', 'Failed to analyze meal. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  }, [selectedImage, mealType, nutritionClient, router]);
  
  /**
   * Clear selected image
   */
  const clearSelection = useCallback(() => {
    setSelectedImage(null);
    setUploadProgress(0);
  }, []);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add Meal</Text>
      
      {/* Meal Type Selector */}
      <View style={styles.mealTypeContainer}>
        <Text style={styles.label}>Meal Type</Text>
        <View style={styles.mealTypeButtons}>
          {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.mealTypeButton,
                mealType === type && styles.mealTypeButtonActive,
              ]}
              onPress={() => setMealType(type)}
            >
              <Text
                style={[
                  styles.mealTypeButtonText,
                  mealType === type && styles.mealTypeButtonTextActive,
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      {/* Image Preview */}
      {selectedImage ? (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: selectedImage.uri }}
            style={styles.preview}
            resizeMode="cover"
          />
          
          {/* Upload Progress */}
          {uploading && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.progressText}>
                {uploadProgress < 50 ? 'Uploading...' : 'Analyzing...'}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${uploadProgress}%` }]}
                />
              </View>
            </View>
          )}
          
          {/* Actions */}
          {!uploading && (
            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearSelection}
              >
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                <Text style={styles.clearButtonText}>Remove</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.analyzeButton}
                onPress={analyzeMeal}
              >
                <Ionicons name="scan-outline" size={24} color="#FFFFFF" />
                <Text style={styles.analyzeButtonText}>Analyze</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <>
          {/* Capture Options */}
          <View style={styles.captureContainer}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={takePhoto}
              disabled={mode === 'camera'}
            >
              <Ionicons name="camera" size={48} color="#007AFF" />
              <Text style={styles.captureButtonText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.captureButton}
              onPress={pickFromGallery}
              disabled={mode === 'gallery'}
            >
              <Ionicons name="images" size={48} color="#007AFF" />
              <Text style={styles.captureButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
          
          {/* Help Text */}
          <Text style={styles.helpText}>
            Take a clear photo of your meal for best results.
            Include the entire plate or bowl in the frame.
          </Text>
        </>
      )}
      
      {/* Loading Indicator */}
      {mode !== 'idle' && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#000000',
  },
  mealTypeContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333333',
  },
  mealTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mealTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  mealTypeButtonActive: {
    backgroundColor: '#007AFF',
  },
  mealTypeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  mealTypeButtonTextActive: {
    color: '#FFFFFF',
  },
  captureContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 40,
  },
  captureButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 160,
    height: 160,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    gap: 12,
  },
  captureButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  helpText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 40,
  },
  previewContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F2F2F7',
  },
  preview: {
    flex: 1,
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    gap: 12,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  progressBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  previewActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 59, 48, 0.2)',
    gap: 8,
  },
  clearButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  analyzeButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    gap: 8,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
