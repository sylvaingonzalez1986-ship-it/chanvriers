/**
 * LabAnalysisUploader - Composant pour uploader les analyses de laboratoire
 * Permet d'uploader un PDF ou de scanner un document avec la caméra
 * Inclut un visualiseur pour les documents uploadés
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Pressable,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Dimensions,
  Linking,
} from 'react-native';
import { Text } from '@/components/ui';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import {
  FileText,
  Camera,
  Upload,
  X,
  Trash2,
  Eye,
  ScanLine,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  ExternalLink,
} from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LabAnalysisUploaderProps {
  value?: string | null; // URL du document existant
  onUpload: (uri: string, fileName: string, mimeType: string) => void;
  onRemove: () => void;
  uploading?: boolean;
}

export function LabAnalysisUploader({
  value,
  onUpload,
  onRemove,
  uploading = false,
}: LabAnalysisUploaderProps) {
  const insets = useSafeAreaInsets();
  const [showCamera, setShowCamera] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);

  // Zoom pour la visualisation d'image
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  // Sélectionner un PDF depuis le téléphone
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const file = result.assets[0];
        onUpload(file.uri, file.name, file.mimeType || 'application/pdf');
      }
    } catch (error) {
      console.error('[LabAnalysis] Error picking document:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner le document');
    }
  };

  // Scanner un document avec la caméra
  const openScanner = async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser l\'accès à la caméra pour scanner des documents'
        );
        return;
      }
    }
    setShowCamera(true);
  };

  // Prendre une photo du document
  const captureDocument = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
      });

      if (photo?.uri) {
        const fileName = `analyse_labo_${Date.now()}.jpg`;
        onUpload(photo.uri, fileName, 'image/jpeg');
        setShowCamera(false);
      }
    } catch (error) {
      console.error('[LabAnalysis] Error capturing:', error);
      Alert.alert('Erreur', 'Impossible de capturer l\'image');
    } finally {
      setCapturing(false);
    }
  };

  // Sélectionner une image depuis la galerie
  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `analyse_labo_${Date.now()}.jpg`;
        onUpload(asset.uri, fileName, asset.mimeType || 'image/jpeg');
      }
    } catch (error) {
      console.error('[LabAnalysis] Error picking image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  // Ouvrir le visualiseur
  const openViewer = () => {
    if (!value) return;

    // Reset zoom
    scale.value = 1;
    savedScale.value = 1;
    setShowViewer(true);
  };

  // Partager le document
  const shareDocument = async () => {
    if (!value) return;

    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(value);
      } else {
        Alert.alert('Partage', 'Le partage n\'est pas disponible sur cet appareil');
      }
    } catch (error) {
      console.error('[LabAnalysis] Error sharing:', error);
      Alert.alert('Erreur', 'Impossible de partager le document');
    }
  };

  // Ouvrir dans une app externe (pour les PDF)
  // Note: Les fichiers locaux (file://) ne peuvent pas être ouverts via Linking
  // On utilise donc toujours le partage pour les fichiers locaux
  const openExternal = async () => {
    if (!value) return;

    // Pour les fichiers locaux, utiliser directement le partage
    if (value.startsWith('file://') || value.startsWith('/')) {
      await shareDocument();
      return;
    }

    // Pour les URLs HTTP, essayer d'ouvrir dans le navigateur
    try {
      const canOpen = await Linking.canOpenURL(value);
      if (canOpen) {
        await Linking.openURL(value);
      } else {
        await shareDocument();
      }
    } catch (error) {
      console.log('[LabAnalysis] Cannot open URL, using share:', error);
      await shareDocument();
    }
  };

  // Déterminer si c'est un PDF ou une image
  const isPdf = value?.toLowerCase().endsWith('.pdf') || value?.includes('application/pdf');
  const hasDocument = !!value;

  // Geste de pinch pour zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      // Limiter le zoom entre 0.5 et 4
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

  // Zoom in/out buttons
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

  const resetZoom = () => {
    scale.value = withSpring(1);
    savedScale.value = 1;
  };

  return (
    <View className="mb-4">
      <Text style={{ color: COLORS.text.lightGray }} className="font-medium mb-2">
        Analyse de laboratoire
      </Text>

      {/* Document existant */}
      {hasDocument && (
        <View
          className="flex-row items-center p-3 rounded-xl mb-3"
          style={{
            backgroundColor: `${COLORS.accent.teal}15`,
            borderWidth: 1,
            borderColor: `${COLORS.accent.teal}40`,
          }}
        >
          <View
            className="w-12 h-12 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: `${COLORS.accent.teal}25` }}
          >
            <FileText size={24} color={COLORS.accent.teal} />
          </View>
          <View className="flex-1">
            <Text style={{ color: COLORS.text.cream }} className="font-medium">
              {isPdf ? 'Document PDF' : 'Image du document'}
            </Text>
            <Text style={{ color: COLORS.accent.teal }} className="text-xs">
              Analyse uploadée
            </Text>
          </View>
          <View className="flex-row">
            <Pressable
              onPress={openViewer}
              className="p-2 rounded-lg mr-2"
              style={{ backgroundColor: `${COLORS.accent.sky}20` }}
            >
              <Eye size={18} color={COLORS.accent.sky} />
            </Pressable>
            <Pressable
              onPress={onRemove}
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${COLORS.accent.red}20` }}
            >
              <Trash2 size={18} color={COLORS.accent.red} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Indicateur de chargement */}
      {uploading && (
        <View
          className="flex-row items-center justify-center p-4 rounded-xl mb-3"
          style={{ backgroundColor: `${COLORS.primary.gold}15` }}
        >
          <ActivityIndicator color={COLORS.primary.gold} />
          <Text style={{ color: COLORS.primary.gold }} className="ml-3">
            Upload en cours...
          </Text>
        </View>
      )}

      {/* Boutons d'action */}
      {!uploading && (
        <View className="flex-row gap-2">
          {/* Scanner avec caméra */}
          <Pressable
            onPress={openScanner}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
            style={{
              backgroundColor: COLORS.primary.gold,
            }}
          >
            <ScanLine size={18} color={COLORS.text.dark} />
            <Text style={{ color: COLORS.text.dark }} className="font-bold ml-2">
              Scanner
            </Text>
          </Pressable>

          {/* Sélectionner un PDF */}
          <Pressable
            onPress={pickDocument}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
            style={{
              backgroundColor: `${COLORS.accent.teal}20`,
              borderWidth: 2,
              borderColor: COLORS.accent.teal,
            }}
          >
            <Upload size={18} color={COLORS.accent.teal} />
            <Text style={{ color: COLORS.accent.teal }} className="font-bold ml-2">
              PDF
            </Text>
          </Pressable>

          {/* Sélectionner depuis galerie */}
          <Pressable
            onPress={pickFromGallery}
            className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
            style={{
              backgroundColor: `${COLORS.accent.sky}20`,
              borderWidth: 2,
              borderColor: COLORS.accent.sky,
            }}
          >
            <FileText size={18} color={COLORS.accent.sky} />
            <Text style={{ color: COLORS.accent.sky }} className="font-bold ml-2">
              Image
            </Text>
          </Pressable>
        </View>
      )}

      {/* Info */}
      <Text style={{ color: COLORS.text.muted }} className="text-xs mt-2">
        Formats acceptés: PDF, JPG, PNG. Scannez ou uploadez l'analyse de votre produit.
      </Text>

      {/* Modal Visualiseur de document */}
      <Modal
        visible={showViewer}
        animationType="fade"
        onRequestClose={() => setShowViewer(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {/* Header */}
          <View
            className="flex-row items-center justify-between px-4"
            style={{
              paddingTop: insets.top + 10,
              paddingBottom: 15,
              backgroundColor: 'rgba(0,0,0,0.8)',
            }}
          >
            <Pressable
              onPress={() => setShowViewer(false)}
              className="p-3 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <X size={24} color="#fff" />
            </Pressable>

            <Text style={{ color: '#fff' }} className="text-lg font-bold">
              {isPdf ? 'Document PDF' : 'Analyse'}
            </Text>

            <Pressable
              onPress={shareDocument}
              className="p-3 rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
            >
              <Share2 size={24} color="#fff" />
            </Pressable>
          </View>

          {/* Contenu */}
          {isPdf ? (
            // Pour les PDF, afficher un message et proposer d'ouvrir dans une app externe
            <View className="flex-1 items-center justify-center px-6">
              <View
                className="w-32 h-32 rounded-3xl items-center justify-center mb-6"
                style={{ backgroundColor: `${COLORS.accent.teal}20` }}
              >
                <FileText size={64} color={COLORS.accent.teal} />
              </View>

              <Text style={{ color: COLORS.text.cream }} className="text-xl font-bold text-center mb-2">
                Document PDF
              </Text>
              <Text style={{ color: COLORS.text.muted }} className="text-center mb-8">
                Les fichiers PDF ne peuvent pas être affichés directement dans l'application.
                Utilisez une des options ci-dessous pour visualiser le document.
              </Text>

              {/* Boutons d'action pour PDF */}
              <View className="w-full gap-3">
                <Pressable
                  onPress={openExternal}
                  className="flex-row items-center justify-center py-4 rounded-xl"
                  style={{ backgroundColor: COLORS.accent.teal }}
                >
                  <ExternalLink size={20} color="#fff" />
                  <Text style={{ color: '#fff' }} className="font-bold ml-3">
                    Ouvrir dans une autre app
                  </Text>
                </Pressable>

                <Pressable
                  onPress={shareDocument}
                  className="flex-row items-center justify-center py-4 rounded-xl"
                  style={{
                    backgroundColor: `${COLORS.accent.sky}20`,
                    borderWidth: 2,
                    borderColor: COLORS.accent.sky,
                  }}
                >
                  <Share2 size={20} color={COLORS.accent.sky} />
                  <Text style={{ color: COLORS.accent.sky }} className="font-bold ml-3">
                    Partager le document
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            // Pour les images, afficher avec zoom
            <View className="flex-1">
              <GestureDetector gesture={pinchGesture}>
                <ScrollView
                  contentContainerStyle={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  maximumZoomScale={4}
                  minimumZoomScale={0.5}
                  showsVerticalScrollIndicator={false}
                  showsHorizontalScrollIndicator={false}
                >
                  <Animated.Image
                    source={{ uri: value || '' }}
                    style={[
                      {
                        width: SCREEN_WIDTH,
                        height: SCREEN_HEIGHT * 0.7,
                      },
                      animatedImageStyle,
                    ]}
                    resizeMode="contain"
                  />
                </ScrollView>
              </GestureDetector>

              {/* Contrôles de zoom */}
              <View
                className="absolute bottom-0 left-0 right-0 flex-row items-center justify-center gap-4 py-4"
                style={{
                  paddingBottom: insets.bottom + 20,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                }}
              >
                <Pressable
                  onPress={zoomOut}
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <ZoomOut size={24} color="#fff" />
                </Pressable>

                <Pressable
                  onPress={resetZoom}
                  className="px-4 py-2 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Text style={{ color: '#fff' }} className="font-medium">
                    100%
                  </Text>
                </Pressable>

                <Pressable
                  onPress={zoomIn}
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <ZoomIn size={24} color="#fff" />
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Modal Caméra pour scanner */}
      <Modal
        visible={showCamera}
        animationType="slide"
        onRequestClose={() => setShowCamera(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing="back"
          >
            {/* Overlay guide */}
            <View style={{ flex: 1 }}>
              {/* Header */}
              <View
                className="flex-row items-center justify-between px-4"
                style={{
                  paddingTop: insets.top + 10,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }}
              >
                <Pressable
                  onPress={() => setShowCamera(false)}
                  className="p-3 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <X size={24} color="#fff" />
                </Pressable>
                <Text style={{ color: '#fff' }} className="text-lg font-bold">
                  Scanner le document
                </Text>
                <View style={{ width: 48 }} />
              </View>

              {/* Zone centrale avec cadre */}
              <View className="flex-1 items-center justify-center">
                <View
                  style={{
                    width: '85%',
                    aspectRatio: 0.7,
                    borderWidth: 3,
                    borderColor: COLORS.primary.gold,
                    borderRadius: 12,
                  }}
                >
                  {/* Coins décoratifs */}
                  <View
                    style={{
                      position: 'absolute',
                      top: -3,
                      left: -3,
                      width: 30,
                      height: 30,
                      borderTopWidth: 6,
                      borderLeftWidth: 6,
                      borderColor: COLORS.primary.brightYellow,
                      borderTopLeftRadius: 12,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      top: -3,
                      right: -3,
                      width: 30,
                      height: 30,
                      borderTopWidth: 6,
                      borderRightWidth: 6,
                      borderColor: COLORS.primary.brightYellow,
                      borderTopRightRadius: 12,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -3,
                      left: -3,
                      width: 30,
                      height: 30,
                      borderBottomWidth: 6,
                      borderLeftWidth: 6,
                      borderColor: COLORS.primary.brightYellow,
                      borderBottomLeftRadius: 12,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -3,
                      right: -3,
                      width: 30,
                      height: 30,
                      borderBottomWidth: 6,
                      borderRightWidth: 6,
                      borderColor: COLORS.primary.brightYellow,
                      borderBottomRightRadius: 12,
                    }}
                  />
                </View>
                <Text
                  style={{ color: '#fff' }}
                  className="text-center mt-4 px-8"
                >
                  Placez le document dans le cadre
                </Text>
              </View>

              {/* Bouton capture */}
              <View
                className="items-center pb-10"
                style={{
                  paddingBottom: insets.bottom + 30,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }}
              >
                <Pressable
                  onPress={captureDocument}
                  disabled={capturing}
                  className="w-20 h-20 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: capturing ? COLORS.text.muted : COLORS.primary.gold,
                    borderWidth: 4,
                    borderColor: '#fff',
                  }}
                >
                  {capturing ? (
                    <ActivityIndicator color={COLORS.text.dark} />
                  ) : (
                    <Camera size={32} color={COLORS.text.dark} />
                  )}
                </Pressable>
                <Text style={{ color: '#fff' }} className="mt-3 text-sm">
                  Appuyez pour capturer
                </Text>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    </View>
  );
}
