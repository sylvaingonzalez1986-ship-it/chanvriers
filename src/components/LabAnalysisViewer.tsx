/**
 * LabAnalysisViewer - Composant de visualisation pour les analyses de laboratoire
 * Affiche un bouton pour voir l'analyse et un modal pour visualiser le document
 */

import React, { useState } from 'react';
import {
  View,
  Pressable,
  Modal,
  Image,
  Alert,
  Linking,
  Dimensions,
} from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Sharing from 'expo-sharing';
import {
  FileText,
  X,
  Share2,
  ZoomIn,
  ZoomOut,
  ExternalLink,
} from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LabAnalysisViewerProps {
  url: string;
  compact?: boolean;
}

export function LabAnalysisViewer({ url, compact = false }: LabAnalysisViewerProps) {
  const insets = useSafeAreaInsets();
  const [showViewer, setShowViewer] = useState(false);

  // Zoom pour la visualisation d'image
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  // Déterminer si c'est un PDF ou une image
  const isPdf = url?.toLowerCase().endsWith('.pdf') || url?.includes('application/pdf');

  // Ouvrir le visualiseur
  const openViewer = () => {
    // Reset zoom
    scale.value = 1;
    savedScale.value = 1;
    setShowViewer(true);
  };

  // Partager le document
  const shareDocument = async () => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(url);
      } else {
        Alert.alert('Partage', 'Le partage n\'est pas disponible sur cet appareil');
      }
    } catch (error) {
      console.error('[LabAnalysisViewer] Error sharing:', error);
      Alert.alert('Erreur', 'Impossible de partager le document');
    }
  };

  // Ouvrir dans une app externe (pour les PDF)
  // Note: Les fichiers locaux (file://) ne peuvent pas être ouverts via Linking
  // On utilise donc toujours le partage pour les fichiers locaux
  const openExternal = async () => {
    // Pour les fichiers locaux, utiliser directement le partage
    if (url.startsWith('file://') || url.startsWith('/')) {
      await shareDocument();
      return;
    }

    // Pour les URLs HTTP, essayer d'ouvrir dans le navigateur
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        await shareDocument();
      }
    } catch (error) {
      console.log('[LabAnalysisViewer] Cannot open URL, using share:', error);
      await shareDocument();
    }
  };

  // Geste de pinch pour zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 0.5) {
        scale.value = withSpring(0.5);
        savedScale.value = 0.5;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
      }
    });

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Zoom buttons
  const zoomIn = () => {
    const newScale = Math.min(scale.value * 1.5, 4);
    scale.value = withSpring(newScale);
    savedScale.value = newScale;
  };

  const zoomOut = () => {
    const newScale = Math.max(scale.value / 1.5, 0.5);
    scale.value = withSpring(newScale);
    savedScale.value = newScale;
  };

  return (
    <>
      {/* Bouton pour voir l'analyse */}
      <Pressable
        onPress={openViewer}
        className={compact ? "flex-row items-center px-2 py-1 rounded-full" : "flex-row items-center px-3 py-1.5 rounded-lg"}
        style={{
          backgroundColor: `${COLORS.accent.teal}20`,
          borderWidth: 1,
          borderColor: `${COLORS.accent.teal}40`,
        }}
      >
        <FileText size={compact ? 12 : 14} color={COLORS.accent.teal} />
        <Text
          style={{ color: COLORS.accent.teal }}
          className={compact ? "text-xs font-medium ml-1" : "text-xs font-semibold ml-1.5"}
        >
          {compact ? "Analyse" : "Voir l'analyse labo"}
        </Text>
      </Pressable>

      {/* Modal de visualisation */}
      <Modal
        visible={showViewer}
        animationType="fade"
        transparent
        onRequestClose={() => setShowViewer(false)}
      >
        <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}>
          {/* Header */}
          <View
            className="flex-row items-center justify-between px-4"
            style={{ paddingTop: insets.top + 8, paddingBottom: 12 }}
          >
            <Text style={{ color: COLORS.text.cream }} className="text-lg font-bold">
              Analyse de laboratoire
            </Text>
            <Pressable
              onPress={() => setShowViewer(false)}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <X size={22} color="#fff" />
            </Pressable>
          </View>

          {/* Contenu */}
          {isPdf ? (
            // Affichage PDF
            <View className="flex-1 items-center justify-center px-6">
              <View
                className="w-32 h-40 rounded-2xl items-center justify-center mb-6"
                style={{ backgroundColor: `${COLORS.accent.teal}20` }}
              >
                <FileText size={64} color={COLORS.accent.teal} />
              </View>
              <Text style={{ color: COLORS.text.cream }} className="text-xl font-bold text-center mb-2">
                Document PDF
              </Text>
              <Text style={{ color: COLORS.text.muted }} className="text-center mb-8">
                Ouvrez dans une application externe pour visualiser le PDF
              </Text>
              <View className="flex-row gap-4">
                <Pressable
                  onPress={openExternal}
                  className="flex-row items-center px-6 py-3 rounded-xl"
                  style={{ backgroundColor: COLORS.accent.teal }}
                >
                  <ExternalLink size={18} color="#fff" />
                  <Text style={{ color: '#fff' }} className="font-bold ml-2">
                    Ouvrir
                  </Text>
                </Pressable>
                <Pressable
                  onPress={shareDocument}
                  className="flex-row items-center px-6 py-3 rounded-xl"
                  style={{
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderColor: COLORS.accent.teal,
                  }}
                >
                  <Share2 size={18} color={COLORS.accent.teal} />
                  <Text style={{ color: COLORS.accent.teal }} className="font-bold ml-2">
                    Partager
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            // Affichage Image avec zoom
            <View className="flex-1">
              <GestureDetector gesture={pinchGesture}>
                <View className="flex-1 items-center justify-center">
                  <Animated.Image
                    source={{ uri: url }}
                    style={[
                      {
                        width: SCREEN_WIDTH - 32,
                        height: SCREEN_HEIGHT * 0.6,
                      },
                      animatedImageStyle,
                    ]}
                    resizeMode="contain"
                  />
                </View>
              </GestureDetector>

              {/* Controles de zoom */}
              <View
                className="flex-row items-center justify-center gap-4 pb-4"
                style={{ paddingBottom: insets.bottom + 16 }}
              >
                <Pressable
                  onPress={zoomOut}
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <ZoomOut size={22} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={shareDocument}
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: COLORS.accent.teal }}
                >
                  <Share2 size={22} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={zoomIn}
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                  <ZoomIn size={22} color="#fff" />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}
