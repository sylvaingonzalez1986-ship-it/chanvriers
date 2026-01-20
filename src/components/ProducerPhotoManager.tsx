/**
 * ProducerPhotoManager - Composant de gestion de la photo du producteur
 * Permet de prendre une photo ou choisir depuis la galerie
 * Met à jour le store local ET synchronise avec Supabase pour une source de vérité unique
 */

import React, { useState } from 'react';
import { View, Pressable, Image, Modal, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/ui';
import { Camera, ImageIcon, User, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/lib/colors';
import { uploadImageToSupabase, isSupabaseStorageConfigured } from '@/lib/image-upload';
import { getImageSource } from '@/lib/asset-images';
import { useProducerStore } from '@/lib/store';
import { updateProducerInSupabase, isSupabaseSyncConfigured } from '@/lib/supabase-sync';

interface ProducerPhotoManagerProps {
  currentImage: string | undefined;
  producerId: string;
  onImageUpdate: (newImageUrl: string) => void;
  disabled?: boolean;
}

export function ProducerPhotoManager({
  currentImage,
  producerId,
  onImageUpdate,
  disabled = false,
}: ProducerPhotoManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Accès au store pour mettre à jour le producteur directement
  const updateProducer = useProducerStore((s) => s.updateProducer);

  // Request camera permissions
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission refusée',
        'L\'accès à la caméra est nécessaire pour prendre une photo.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Request media library permissions
  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission refusée',
        'L\'accès à la galerie est nécessaire pour choisir une photo.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Process and upload the selected image
  const processImage = async (uri: string) => {
    setIsUploading(true);
    setUploadProgress('Préparation de l\'image...');

    try {
      if (!isSupabaseStorageConfigured()) {
        Alert.alert(
          'Configuration requise',
          'Le stockage Supabase n\'est pas configuré. Veuillez contacter l\'administrateur.'
        );
        setIsUploading(false);
        return;
      }

      setUploadProgress('Envoi en cours...');

      // Upload image to Supabase Storage
      const uploadedUrl = await uploadImageToSupabase(uri, 'producers');

      if (uploadedUrl) {
        setUploadProgress('Synchronisation...');

        // 1. Mettre à jour le state local du formulaire
        onImageUpdate(uploadedUrl);

        // 2. Mettre à jour le store Zustand immédiatement (pour que les autres écrans voient la nouvelle image)
        if (producerId && producerId !== 'new-producer') {
          updateProducer(producerId, { image: uploadedUrl });
        }

        // 3. Synchroniser avec Supabase si configuré
        if (isSupabaseSyncConfigured() && producerId && producerId !== 'new-producer') {
          try {
            await updateProducerInSupabase(producerId, { image: uploadedUrl });
            console.log('[ProducerPhotoManager] Image synchronisée avec Supabase');
          } catch (syncError) {
            console.warn('[ProducerPhotoManager] Erreur sync Supabase (image sauvée localement):', syncError);
            // L'image est quand même sauvée localement, on continue
          }
        }

        setUploadProgress('Photo mise à jour !');

        setTimeout(() => {
          setShowModal(false);
          setIsUploading(false);
          setUploadProgress('');
        }, 800);
      } else {
        Alert.alert(
          'Erreur',
          'Impossible d\'envoyer la photo. Veuillez réessayer.'
        );
        setIsUploading(false);
        setUploadProgress('');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert(
        'Erreur',
        'Une erreur est survenue lors du traitement de la photo.'
      );
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  // Take a photo with camera
  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la caméra.');
    }
  };

  // Choose from gallery
  const handleChooseFromGallery = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la galerie.');
    }
  };

  // Check if we have a valid image (not a placeholder)
  const hasImage = currentImage &&
    currentImage.length > 0 &&
    !currentImage.includes('unsplash.com') &&
    !currentImage.includes('placeholder');

  return (
    <>
      {/* Photo Display & Edit Button */}
      <View className="items-center mb-6">
        <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-3 text-center">
          Photo du producteur
        </Text>

        <Pressable
          onPress={() => !disabled && setShowModal(true)}
          disabled={disabled}
          className="relative active:opacity-80"
        >
          {/* Photo Container */}
          <View
            className="w-32 h-32 rounded-2xl overflow-hidden items-center justify-center"
            style={{
              backgroundColor: `${COLORS.accent.hemp}15`,
              borderWidth: 2,
              borderColor: hasImage ? COLORS.accent.hemp : `${COLORS.primary.paleGold}30`,
              borderStyle: hasImage ? 'solid' : 'dashed',
            }}
          >
            {hasImage ? (
              <Image
                source={getImageSource(currentImage)}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View className="items-center">
                <User size={40} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-xs mt-2">
                  Ajouter
                </Text>
              </View>
            )}
          </View>

          {/* Edit Badge */}
          {!disabled && (
            <View
              className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full items-center justify-center"
              style={{
                backgroundColor: COLORS.primary.gold,
                borderWidth: 3,
                borderColor: COLORS.background.dark,
              }}
            >
              <Camera size={16} color="#fff" />
            </View>
          )}
        </Pressable>

        {!disabled && (
          <Pressable
            onPress={() => setShowModal(true)}
            className="mt-3 px-4 py-2 rounded-lg active:opacity-70"
            style={{ backgroundColor: `${COLORS.primary.gold}15` }}
          >
            <Text style={{ color: COLORS.primary.gold }} className="text-sm font-medium">
              {hasImage ? 'Modifier la photo' : 'Ajouter une photo'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Photo Selection Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => !isUploading && setShowModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/70 items-center justify-center px-6"
          onPress={() => !isUploading && setShowModal(false)}
        >
          <Pressable
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ backgroundColor: COLORS.background.charcoal }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View
              className="flex-row items-center justify-between p-4"
              style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.text.white}10` }}
            >
              <Text style={{ color: COLORS.text.cream }} className="text-lg font-bold">
                Photo du producteur
              </Text>
              {!isUploading && (
                <Pressable
                  onPress={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: `${COLORS.text.white}10` }}
                >
                  <X size={18} color={COLORS.text.muted} />
                </Pressable>
              )}
            </View>

            {/* Content */}
            <View className="p-4">
              {isUploading ? (
                <View className="items-center py-8">
                  <ActivityIndicator size="large" color={COLORS.primary.gold} />
                  <Text style={{ color: COLORS.text.lightGray }} className="mt-4 text-center">
                    {uploadProgress}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Current Photo Preview */}
                  {hasImage && (
                    <View className="items-center mb-4">
                      <Image
                        source={getImageSource(currentImage)}
                        style={{ width: 120, height: 120, borderRadius: 16 }}
                        resizeMode="cover"
                      />
                    </View>
                  )}

                  {/* Options */}
                  <View style={{ gap: 12 }}>
                    {/* Take Photo */}
                    <Pressable
                      onPress={handleTakePhoto}
                      className="flex-row items-center p-4 rounded-xl active:opacity-70"
                      style={{
                        backgroundColor: `${COLORS.accent.teal}15`,
                        borderWidth: 1,
                        borderColor: `${COLORS.accent.teal}30`,
                      }}
                    >
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{ backgroundColor: `${COLORS.accent.teal}20` }}
                      >
                        <Camera size={24} color={COLORS.accent.teal} />
                      </View>
                      <View className="ml-4 flex-1">
                        <Text style={{ color: COLORS.text.cream }} className="font-semibold">
                          Prendre une photo
                        </Text>
                        <Text style={{ color: COLORS.text.muted }} className="text-sm">
                          Utiliser la caméra
                        </Text>
                      </View>
                    </Pressable>

                    {/* Choose from Gallery */}
                    <Pressable
                      onPress={handleChooseFromGallery}
                      className="flex-row items-center p-4 rounded-xl active:opacity-70"
                      style={{
                        backgroundColor: `${COLORS.accent.hemp}15`,
                        borderWidth: 1,
                        borderColor: `${COLORS.accent.hemp}30`,
                      }}
                    >
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center"
                        style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
                      >
                        <ImageIcon size={24} color={COLORS.accent.hemp} />
                      </View>
                      <View className="ml-4 flex-1">
                        <Text style={{ color: COLORS.text.cream }} className="font-semibold">
                          Choisir depuis la galerie
                        </Text>
                        <Text style={{ color: COLORS.text.muted }} className="text-sm">
                          Sélectionner une image existante
                        </Text>
                      </View>
                    </Pressable>
                  </View>

                  {/* Cancel Button */}
                  <Pressable
                    onPress={() => setShowModal(false)}
                    className="mt-4 py-3 rounded-xl items-center active:opacity-70"
                    style={{
                      backgroundColor: `${COLORS.text.white}05`,
                      borderWidth: 1,
                      borderColor: `${COLORS.text.white}10`,
                    }}
                  >
                    <Text style={{ color: COLORS.text.muted }} className="font-medium">
                      Annuler
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
