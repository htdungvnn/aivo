/**
 * Pose Overlay Component
 * Renders skeleton and corrections on camera view
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, G } from 'react-native-svg';
import type { CorrectionResult } from '@aivo/fitness-types/correction';
import { LANDMARK_INDICES } from '../../lib/coach/pose-processing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface PoseOverlayProps {
  landmarks: number[][];
  corrections: CorrectionResult[];
  visible: boolean;
}

// Landmark connections for drawing skeleton
const CONNECTIONS = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7], // Left eye to ear
  [0, 4], [4, 5], [5, 6], [6, 8], // Right eye to ear
  [9, 10], // Mouth
  
  // Upper body
  [11, 12], // Shoulders
  [11, 13], [13, 15], // Left arm
  [12, 14], [14, 16], // Right arm
  [15, 17], [15, 19], [15, 21], // Left wrist
  [16, 18], [16, 20], [16, 22], // Right wrist
  
  // Torso
  [11, 23], // Left shoulder to hip
  [12, 24], // Right shoulder to hip
  [23, 24], // Hips
  
  // Lower body
  [23, 25], [25, 27], [27, 29], [27, 31], // Left leg
  [24, 26], [26, 28], [28, 30], [28, 32], // Right leg
];

// Color mapping for corrections
const CORRECTION_COLORS: Record<string, string> = {
  KNEE_COLLAPSE_INWARD: '#F59E0B',
  SQUAT_NOT_DEEP_ENOUGH: '#3B82F6',
  FORWARD_LEAN_TOO_MUCH: '#EF4444',
  ROUNDED_LOWER_BACK: '#DC2626',
  ELBOWS_FLARE_OUT: '#F59E0B',
  HIP_SAGGING: '#EF4444',
};

export function PoseOverlay({ landmarks, corrections, visible }: PoseOverlayProps) {
  // Convert normalized coordinates to screen coordinates
  const screenPoints = useMemo(() => {
    return landmarks.map((lm) => ({
      x: lm[0] * SCREEN_WIDTH,
      y: lm[1] * SCREEN_HEIGHT,
      visibility: lm[3] || 0,
    }));
  }, [landmarks]);

  // Get correction-affected joints
  const correctionJoints = useMemo(() => {
    const joints = new Set<number>();
    
    for (const correction of corrections) {
      switch (correction.code) {
        case 'KNEE_COLLAPSE_INWARD':
        case 'SQUAT_NOT_DEEP_ENOUGH':
          joints.add(25); // Left knee
          joints.add(26); // Right knee
          break;
        case 'FORWARD_LEAN_TOO_MUCH':
        case 'ROUNDED_LOWER_BACK':
          joints.add(11); // Left shoulder
          joints.add(12); // Right shoulder
          joints.add(23); // Left hip
          joints.add(24); // Right hip
          break;
        case 'ELBOWS_FLARE_OUT':
          joints.add(13); // Left elbow
          joints.add(14); // Right elbow
          break;
        case 'HIP_SAGGING':
          joints.add(23); // Left hip
          joints.add(24); // Right hip
          break;
      }
    }
    
    return joints;
  }, [corrections]);

  if (!visible || landmarks.length === 0) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
        {/* Draw connections */}
        <G>
          {CONNECTIONS.map(([start, end], index) => {
            const startPoint = screenPoints[start];
            const endPoint = screenPoints[end];
            
            if (!startPoint || !endPoint) return null;
            if (startPoint.visibility < 0.5 || endPoint.visibility < 0.5) return null;
            
            const isAffected =
              correctionJoints.has(start) || correctionJoints.has(end);
            
            return (
              <Line
                key={`line-${index}`}
                x1={startPoint.x}
                y1={startPoint.y}
                x2={endPoint.x}
                y2={endPoint.y}
                stroke={isAffected ? '#EF4444' : '#22C55E'}
                strokeWidth={isAffected ? 4 : 2}
                strokeLinecap="round"
              />
            );
          })}
        </G>
        
        {/* Draw landmarks */}
        <G>
          {screenPoints.map((point, index) => {
            if (point.visibility < 0.5) return null;
            
            const isKeyJoint = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26].includes(index);
            const isAffected = correctionJoints.has(index);
            const isHead = index <= 10;
            
            let color = '#22C55E';
            if (isAffected) {
              color = '#EF4444';
            } else if (isHead) {
              color = '#A855F7';
            }
            
            return (
              <Circle
                key={`point-${index}`}
                cx={point.x}
                cy={point.y}
                r={isKeyJoint ? 8 : isHead ? 10 : 5}
                fill={color}
                stroke="#fff"
                strokeWidth={2}
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
  },
});
