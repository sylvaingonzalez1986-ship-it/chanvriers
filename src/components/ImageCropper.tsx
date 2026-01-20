import React, { useState, useCallback, useEffect } from 'react';
import { View, Modal, Image, Pressable, Dimensions, StyleSheet } from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { X, Check, RotateCcw, ZoomIn, ZoomOut, Move } from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import * as ImageManipulator from 'expo-image-manipulator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageCropperProps {
  visible: boolean;
  imageUri: string;
  aspectRatio: number; // width/height (e.g., 1 for square, 16/9 for landscape)
  onCrop: (croppedUri: string) => void;
  onCancel: () => void;
}

export const ImageCropper = ({
  visible,
  imageUri,
  aspectRatio,
  onCrop,
  onCancel,
}: ImageCropperProps) => {
  const insets = useSafeAreaInsets();
  const [imageSize, setImageSize] = useState({ width: 1, height: 1 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Crop frame dimensions
  const CROP_WIDTH = SCREEN_WIDTH - 48;
  const CROP_HEIGHT = CROP_WIDTH / aspectRatio;

  // Maximum height for crop area
  const MAX_CROP_HEIGHT = SCREEN_HEIGHT * 0.5;
  const finalCropHeight = Math.min(CROP_HEIGHT, MAX_CROP_HEIGHT);
  const finalCropWidth = finalCropHeight * aspectRatio;

  // Animated values for pan and zoom
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Calculate image display size
  const getImageDisplaySize = () => {
    const imageAspect = imageSize.width / imageSize.height;

    // Start with image filling the crop frame (cover mode)
    if (imageAspect > finalCropWidth / finalCropHeight) {
      // Image is wider - height matches crop, width overflows
      return {
        width: finalCropHeight * imageAspect,
        height: finalCropHeight,
      };
    } else {
      // Image is taller - width matches crop, height overflows
      return {
        width: finalCropWidth,
        height: finalCropWidth / imageAspect,
      };
    }
  };

  const displaySize = getImageDisplaySize();

  // Load image dimensions
  useEffect(() => {
    if (visible && imageUri) {
      setImageLoaded(false);
      Image.getSize(
        imageUri,
        (width, height) => {
          setImageSize({ width, height });
          setImageLoaded(true);
          // Reset transforms
          scale.value = 1;
          savedScale.value = 1;
          translateX.value = 0;
          translateY.value = 0;
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
        },
        (error) => {
          console.log('Error getting image size:', error);
          // Set default size
          setImageSize({ width: 1, height: 1 });
          setImageLoaded(true);
        }
      );
    }
  }, [visible, imageUri]);

  // Reset transformations
  const resetTransform = () => {
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  // Zoom in/out buttons
  const zoomIn = () => {
    const newScale = Math.min(scale.value + 0.3, 4);
    scale.value = withSpring(newScale);
    savedScale.value = newScale;
  };

  const zoomOut = () => {
    const newScale = Math.max(scale.value - 0.3, 0.5);
    scale.value = withSpring(newScale);
    savedScale.value = newScale;
  };

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(0.5, Math.min(4, savedScale.value * event.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Pan gesture for moving
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  // Animated style for the image
  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Crop the image using expo-image-manipulator
  const handleCrop = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      // Calculate the crop region in original image coordinates
      const currentScale = savedScale.value;
      const currentTranslateX = savedTranslateX.value;
      const currentTranslateY = savedTranslateY.value;

      // The display image size at scale 1
      const baseDisplayWidth = displaySize.width;
      const baseDisplayHeight = displaySize.height;

      // Scaled display size
      const scaledWidth = baseDisplayWidth * currentScale;
      const scaledHeight = baseDisplayHeight * currentScale;

      // Center position of the image in the crop frame
      const imageCenterX = finalCropWidth / 2 + currentTranslateX;
      const imageCenterY = finalCropHeight / 2 + currentTranslateY;

      // Top-left of the visible crop area in scaled image coordinates
      const cropLeftInDisplay = finalCropWidth / 2 - imageCenterX + (scaledWidth / 2);
      const cropTopInDisplay = finalCropHeight / 2 - imageCenterY + (scaledHeight / 2);

      // Convert to original image coordinates
      const scaleToOriginal = imageSize.width / scaledWidth;

      const originX = Math.max(0, cropLeftInDisplay * scaleToOriginal);
      const originY = Math.max(0, cropTopInDisplay * scaleToOriginal);
      const cropWidth = Math.min(
        (finalCropWidth * scaleToOriginal),
        imageSize.width - originX
      );
      const cropHeight = Math.min(
        (finalCropHeight * scaleToOriginal),
        imageSize.height - originY
      );

      // Ensure valid crop dimensions
      const validCrop = {
        originX: Math.round(Math.max(0, originX)),
        originY: Math.round(Math.max(0, originY)),
        width: Math.round(Math.max(1, cropWidth)),
        height: Math.round(Math.max(1, cropHeight)),
      };

      console.log('Crop params:', validCrop, 'Image size:', imageSize);

      // Apply the crop
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: validCrop }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      onCrop(result.uri);
    } catch (error) {
      console.log('Error cropping image:', error);
      // If crop fails, return original image
      onCrop(imageUri);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} statusBarTranslucent={true}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onCancel} style={styles.headerButton}>
              <X size={24} color={COLORS.text.cream} />
            </Pressable>
            <Text style={styles.headerTitle}>Recadrer l'image</Text>
            <Pressable
              onPress={handleCrop}
              style={[styles.headerButton, styles.confirmButton]}
              disabled={isProcessing}
            >
              <Check size={24} color={COLORS.text.white} />
            </Pressable>
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Move size={16} color={COLORS.text.muted} />
            <Text style={styles.instructionText}>
              Glissez pour déplacer, pincez pour zoomer
            </Text>
          </View>

          {/* Crop Area */}
          <View style={styles.cropContainer}>
            {/* Crop frame with image */}
            <View
              style={[
                styles.cropFrame,
                {
                  width: finalCropWidth,
                  height: finalCropHeight,
                },
              ]}
            >
              {imageLoaded && (
                <GestureDetector gesture={composedGesture}>
                  <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
                    <Image
                      source={{ uri: imageUri }}
                      style={{
                        width: displaySize.width,
                        height: displaySize.height,
                      }}
                      resizeMode="cover"
                    />
                  </Animated.View>
                </GestureDetector>
              )}

              {/* Corner indicators */}
              <View style={[styles.corner, styles.cornerTL]} pointerEvents="none" />
              <View style={[styles.corner, styles.cornerTR]} pointerEvents="none" />
              <View style={[styles.corner, styles.cornerBL]} pointerEvents="none" />
              <View style={[styles.corner, styles.cornerBR]} pointerEvents="none" />

              {/* Grid lines */}
              <View style={[styles.gridLine, styles.gridLineH1]} pointerEvents="none" />
              <View style={[styles.gridLine, styles.gridLineH2]} pointerEvents="none" />
              <View style={[styles.gridLine, styles.gridLineV1]} pointerEvents="none" />
              <View style={[styles.gridLine, styles.gridLineV2]} pointerEvents="none" />
            </View>
          </View>

          {/* Controls */}
          <View style={[styles.controls, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.controlsRow}>
              <Pressable onPress={zoomOut} style={styles.controlButton}>
                <ZoomOut size={24} color={COLORS.text.cream} />
              </Pressable>
              <Pressable onPress={resetTransform} style={styles.controlButton}>
                <RotateCcw size={24} color={COLORS.text.cream} />
              </Pressable>
              <Pressable onPress={zoomIn} style={styles.controlButton}>
                <ZoomIn size={24} color={COLORS.text.cream} />
              </Pressable>
            </View>

            {/* Aspect ratio indicator */}
            <Text style={styles.aspectText}>
              {aspectRatio === 1 ? 'Carré (1:1)' :
               Math.abs(aspectRatio - 16/9) < 0.01 ? 'Paysage (16:9)' :
               Math.abs(aspectRatio - 4/3) < 0.01 ? 'Photo (4:3)' :
               `Ratio ${aspectRatio.toFixed(2)}:1`}
            </Text>

            {isProcessing && (
              <Text style={styles.processingText}>Recadrage en cours...</Text>
            )}
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary.gold}30`,
  },
  headerButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: `${COLORS.text.muted}20`,
  },
  confirmButton: {
    backgroundColor: COLORS.accent.hemp,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.cream,
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  instructionText: {
    fontSize: 14,
    color: COLORS.text.muted,
  },
  cropContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  cropFrame: {
    borderWidth: 2,
    borderColor: COLORS.text.white,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.background.charcoal,
  },
  imageContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: COLORS.primary.gold,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  gridLineH1: {
    left: 0,
    right: 0,
    top: '33.33%',
    height: 1,
  },
  gridLineH2: {
    left: 0,
    right: 0,
    top: '66.66%',
    height: 1,
  },
  gridLineV1: {
    top: 0,
    bottom: 0,
    left: '33.33%',
    width: 1,
  },
  gridLineV2: {
    top: 0,
    bottom: 0,
    left: '66.66%',
    width: 1,
  },
  controls: {
    paddingHorizontal: 24,
    paddingTop: 20,
    backgroundColor: '#0a0a0f',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.background.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: `${COLORS.primary.gold}30`,
  },
  aspectText: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14,
    color: COLORS.text.muted,
  },
  processingText: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
    color: COLORS.primary.gold,
  },
});
