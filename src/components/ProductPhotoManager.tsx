/**
 * ProductPhotoManager - Composant pour gérer les photos des produits
 * Permet aux producteurs d'ajouter des photos via caméra ou galerie
 */

import React, { useState } from 'react';
import { View, Modal, Pressable, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, ImagePlus, X, Trash2, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '@/lib/colors';
import { uploadProductImage, deleteProductImage, isProductImagesConfigured } from '@/lib/supabase-product-images';
import { ProducerProduct } from '@/lib/producers';

interface ProductPhotoManagerProps {
  visible: boolean;
  onClose: () => void;
  product: ProducerProduct;
  producerId: string;
  onImagesUpdated: (images: string[]) => void;
}

export const ProductPhotoManager = ({
  visible,
  onClose,
  product,
  producerId,
  onImagesUpdated,
}: ProductPhotoManagerProps) => {
  const insets = useSafeAreaInsets();
  const [images, setImages] = useState<string[]>(product.images || [product.image].filter(Boolean));
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // Request camera permission
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Veuillez autoriser l\'accès à la caméra pour prendre des photos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Request media library permission
  const requestMediaLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Veuillez autoriser l\'accès à la galerie pour sélectionner des photos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Take photo with camera
  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('[ProductPhotoManager] Camera error:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la caméra');
    }
  };

  // Pick from gallery
  const pickFromGallery = async () => {
    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 3 - images.length, // Max 3 images total
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        for (const asset of result.assets) {
          await uploadImage(asset.uri);
        }
      }
    } catch (error) {
      console.error('[ProductPhotoManager] Gallery error:', error);
      Alert.alert('Erreur', 'Impossible d\'ouvrir la galerie');
    }
  };

  // Upload image to Supabase
  const uploadImage = async (uri: string) => {
    if (images.length >= 3) {
      Alert.alert('Limite atteinte', 'Vous ne pouvez pas ajouter plus de 3 photos par produit.');
      return;
    }

    if (!isProductImagesConfigured()) {
      // Fallback: use local URI if Supabase not configured
      console.log('[ProductPhotoManager] Supabase not configured, using local URI');
      setImages(prev => [...prev, uri]);
      return;
    }

    setIsUploading(true);
    setUploadProgress('Upload en cours...');

    try {
      const publicUrl = await uploadProductImage(uri, producerId, product.id);
      setImages(prev => [...prev, publicUrl]);
      setUploadProgress('Photo ajoutée !');
    } catch (error: any) {
      console.error('[ProductPhotoManager] Upload error:', error);
      // Fallback to local URI on error
      setImages(prev => [...prev, uri]);
      setUploadProgress('Photo ajoutée localement');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(''), 2000);
    }
  };

  // Remove image
  const removeImage = async (index: number) => {
    Alert.alert(
      'Supprimer la photo',
      'Voulez-vous vraiment supprimer cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const imageUrl = images[index];

            // Try to delete from Supabase if it's a Supabase URL
            if (imageUrl.includes('supabase') && isProductImagesConfigured()) {
              try {
                await deleteProductImage(imageUrl);
              } catch (error) {
                console.error('[ProductPhotoManager] Delete error:', error);
              }
            }

            setImages(prev => prev.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  // Save changes
  const handleSave = () => {
    onImagesUpdated(images);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1" style={{ backgroundColor: COLORS.background.nightSky }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-4 py-3 border-b"
          style={{
            paddingTop: insets.top + 8,
            borderBottomColor: `${COLORS.primary.gold}20`,
          }}
        >
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color={COLORS.text.muted} />
          </Pressable>
          <Text style={{ color: COLORS.text.cream }} className="text-lg font-bold">
            Photos du produit
          </Text>
          <Pressable
            onPress={handleSave}
            className="px-4 py-2 rounded-xl"
            style={{ backgroundColor: COLORS.accent.forest }}
          >
            <Text style={{ color: COLORS.text.white }} className="font-semibold">
              Enregistrer
            </Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Product info */}
          <View className="mb-4">
            <Text style={{ color: COLORS.text.cream }} className="text-xl font-bold">
              {product.name}
            </Text>
            <Text style={{ color: COLORS.text.muted }} className="text-sm">
              {images.length}/3 photos
            </Text>
          </View>

          {/* Current images */}
          <View className="flex-row flex-wrap mb-6">
            {images.map((uri, index) => (
              <View
                key={index}
                className="mr-3 mb-3 rounded-xl overflow-hidden"
                style={{
                  width: 100,
                  height: 100,
                  borderWidth: 2,
                  borderColor: `${COLORS.primary.gold}30`,
                }}
              >
                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
                <Pressable
                  onPress={() => removeImage(index)}
                  className="absolute top-1 right-1 p-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }}
                >
                  <Trash2 size={14} color="#fff" />
                </Pressable>
                {index === 0 && (
                  <View
                    className="absolute bottom-0 left-0 right-0 py-1"
                    style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                  >
                    <Text className="text-white text-xs text-center">Principale</Text>
                  </View>
                )}
              </View>
            ))}

            {/* Add photo placeholder */}
            {images.length < 3 && (
              <View
                className="items-center justify-center rounded-xl"
                style={{
                  width: 100,
                  height: 100,
                  borderWidth: 2,
                  borderColor: `${COLORS.primary.gold}30`,
                  borderStyle: 'dashed',
                  backgroundColor: `${COLORS.background.charcoal}50`,
                }}
              >
                <ImagePlus size={24} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-xs mt-1">
                  Ajouter
                </Text>
              </View>
            )}
          </View>

          {/* Upload progress */}
          {(isUploading || uploadProgress) && (
            <View
              className="flex-row items-center justify-center py-3 px-4 rounded-xl mb-4"
              style={{ backgroundColor: `${COLORS.accent.teal}20` }}
            >
              {isUploading && <ActivityIndicator size="small" color={COLORS.accent.teal} />}
              {uploadProgress && (
                <>
                  {!isUploading && <Check size={18} color={COLORS.accent.hemp} />}
                  <Text style={{ color: COLORS.accent.teal }} className="ml-2 font-medium">
                    {uploadProgress}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Action buttons */}
          <View className="gap-3">
            <Pressable
              onPress={takePhoto}
              disabled={isUploading || images.length >= 3}
              className="flex-row items-center justify-center py-4 rounded-xl active:opacity-80"
              style={{
                backgroundColor: images.length >= 3 ? `${COLORS.text.muted}30` : COLORS.primary.gold,
                opacity: isUploading ? 0.5 : 1,
              }}
            >
              <Camera size={22} color={images.length >= 3 ? COLORS.text.muted : COLORS.text.dark} />
              <Text
                style={{ color: images.length >= 3 ? COLORS.text.muted : COLORS.text.dark }}
                className="font-bold text-base ml-2"
              >
                Prendre une photo
              </Text>
            </Pressable>

            <Pressable
              onPress={pickFromGallery}
              disabled={isUploading || images.length >= 3}
              className="flex-row items-center justify-center py-4 rounded-xl active:opacity-80"
              style={{
                backgroundColor: images.length >= 3 ? `${COLORS.text.muted}30` : `${COLORS.accent.teal}20`,
                borderWidth: 2,
                borderColor: images.length >= 3 ? `${COLORS.text.muted}30` : COLORS.accent.teal,
                opacity: isUploading ? 0.5 : 1,
              }}
            >
              <ImagePlus size={22} color={images.length >= 3 ? COLORS.text.muted : COLORS.accent.teal} />
              <Text
                style={{ color: images.length >= 3 ? COLORS.text.muted : COLORS.accent.teal }}
                className="font-bold text-base ml-2"
              >
                Choisir depuis la galerie
              </Text>
            </Pressable>
          </View>

          {/* Help text */}
          <View className="mt-6 p-4 rounded-xl" style={{ backgroundColor: `${COLORS.background.charcoal}50` }}>
            <Text style={{ color: COLORS.text.muted }} className="text-sm text-center">
              Ajoutez jusqu'à 3 photos par produit.{'\n'}
              La première photo sera utilisée comme image principale.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};
