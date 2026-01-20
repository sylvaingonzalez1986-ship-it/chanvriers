import React, { useState } from 'react';
import { View, ScrollView, Pressable, Modal, Image, Switch, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, ChevronDown, ImagePlus, Camera, Sparkles, Leaf, Trash2, Plus, Package, Percent, Video as VideoIcon, MapPin, Store, Truck } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { ProducerProduct, PRODUCT_TYPE_LABELS, DeliveryType, DELIVERY_TYPE_LABELS } from '@/lib/producers';
import { useProducerStore, usePromoProductsStore } from '@/lib/store';
import { COLORS } from '@/lib/colors';
import { processImageForSync, processMultipleImagesForSync, isSupabaseStorageConfigured } from '@/lib/image-upload';
import { ImageCropper } from './ImageCropper';

const MAX_IMAGES = 3;

interface AddProductModalProps {
  visible: boolean;
  producerId: string;
  producerName: string;
  onClose: () => void;
  editingProduct?: ProducerProduct | null;
}

const PRODUCT_TYPES: ProducerProduct['type'][] = ['fleur', 'huile', 'resine', 'infusion'];

interface FormData {
  name: string;
  type: ProducerProduct['type'];
  cbdPercent: string;
  thcPercent: string;
  price: string;
  weight: string;
  images: string[];
  videoUrl: string;
  description: string;
  tvaRate: string;
  stock: string;
  isOnPromo: boolean;
  promoPercent: string;
  disponibleVenteDirecte: boolean;
  villeRetrait: string;
  adresseRetrait: string;
  horairesRetrait: string;
  instructionsRetrait: string;
  // Delivery options
  deliveryType: DeliveryType | '';
  deliveryFlatPrice: string;
  deliveryMinOrderAmount: string;
}

const initialFormData: FormData = {
  name: '',
  type: 'fleur',
  cbdPercent: '',
  thcPercent: '0.2',
  price: '',
  weight: '1g',
  images: [],
  videoUrl: '',
  description: '',
  tvaRate: '20',
  stock: '',
  isOnPromo: false,
  promoPercent: '',
  disponibleVenteDirecte: false,
  villeRetrait: '',
  adresseRetrait: '',
  horairesRetrait: '',
  instructionsRetrait: '',
  // Delivery options
  deliveryType: '',
  deliveryFlatPrice: '',
  deliveryMinOrderAmount: '',
};

export const AddProductModal = ({ visible, producerId, producerName, onClose, editingProduct }: AddProductModalProps) => {
  const insets = useSafeAreaInsets();
  const addProductToProducer = useProducerStore((s) => s.addProductToProducer);
  const updateProductInProducer = useProducerStore((s) => s.updateProductInProducer);
  const promoProducts = usePromoProductsStore((s) => s.promoProducts);
  const addPromoProduct = usePromoProductsStore((s) => s.addPromoProduct);
  const updatePromoProduct = usePromoProductsStore((s) => s.updatePromoProduct);
  const removePromoProduct = usePromoProductsStore((s) => s.removePromoProduct);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [showTypeOptions, setShowTypeOptions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Image cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState('');

  // Populate form when editing
  React.useEffect(() => {
    if (visible && editingProduct) {
      setFormData({
        name: editingProduct.name,
        type: editingProduct.type,
        cbdPercent: editingProduct.cbdPercent.toString(),
        thcPercent: editingProduct.thcPercent.toString(),
        price: editingProduct.price.toString(),
        weight: editingProduct.weight,
        images: editingProduct.images ?? (editingProduct.image ? [editingProduct.image] : []),
        videoUrl: editingProduct.videoUrl ?? '',
        description: editingProduct.description,
        tvaRate: (editingProduct.tvaRate ?? 20).toString(),
        stock: editingProduct.stock?.toString() ?? '',
        isOnPromo: editingProduct.isOnPromo ?? false,
        promoPercent: editingProduct.promoPercent?.toString() ?? '',
        disponibleVenteDirecte: editingProduct.disponible_vente_directe ?? false,
        villeRetrait: editingProduct.ville_retrait ?? '',
        adresseRetrait: editingProduct.adresse_retrait ?? '',
        horairesRetrait: editingProduct.horaires_retrait ?? '',
        instructionsRetrait: editingProduct.instructions_retrait ?? '',
        // Delivery options
        deliveryType: editingProduct.delivery_type ?? '',
        deliveryFlatPrice: editingProduct.delivery_flat_price?.toString() ?? '',
        deliveryMinOrderAmount: editingProduct.delivery_min_order_amount?.toString() ?? '',
      });
    } else if (visible) {
      setFormData(initialFormData);
    }
  }, [visible, editingProduct]);

  const updateForm = (key: keyof FormData, value: string | string[] | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const addImage = (uri: string) => {
    if (formData.images.length < MAX_IMAGES) {
      setFormData((prev) => ({ ...prev, images: [...prev.images, uri] }));
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const pickImage = async () => {
    if (formData.images.length >= MAX_IMAGES) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      // Open cropper for product image (square)
      setImageToCrop(result.assets[0].uri);
      setShowCropper(true);
    }
  };

  const takePhoto = async () => {
    if (formData.images.length >= MAX_IMAGES) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      // Open cropper for product image (square)
      setImageToCrop(result.assets[0].uri);
      setShowCropper(true);
    }
  };

  // Handle cropped image
  const handleCroppedImage = (croppedUri: string) => {
    addImage(croppedUri);
    setShowCropper(false);
    setImageToCrop('');
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 60, // Max 60 secondes
    });

    if (!result.canceled && result.assets[0]) {
      updateForm('videoUrl', result.assets[0].uri);
    }
  };

  const removeVideo = () => {
    updateForm('videoUrl', '');
  };

  const handleSave = async () => {
    console.log('=== handleSave called ===');
    console.log('formData:', JSON.stringify({ name: formData.name, price: formData.price, type: formData.type }));
    console.log('producerId:', producerId);
    console.log('canSave:', canSave);

    if (!canSave) {
      console.log('Cannot save - missing name or price');
      return;
    }

    setIsUploading(true);

    try {
      const defaultImage = 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=200';

      // Upload images to Supabase Storage if configured
      let productImages: string[];
      if (formData.images.length > 0) {
        productImages = await processMultipleImagesForSync(formData.images, 'products');
      } else {
        productImages = [defaultImage];
      }

      // Upload video if present
      let videoUrl = formData.videoUrl || undefined;
      if (videoUrl && videoUrl.startsWith('file://')) {
        const uploadedVideo = await processImageForSync(videoUrl, 'products');
        videoUrl = uploadedVideo !== defaultImage ? uploadedVideo : undefined;
      }

      const stockValue = formData.stock.trim() ? parseInt(formData.stock, 10) : undefined;
      const promoPercentValue = formData.promoPercent.trim() ? parseFloat(formData.promoPercent) : undefined;

      // Parse delivery options
      const deliveryType = formData.deliveryType || undefined;
      const deliveryFlatPrice = formData.deliveryFlatPrice.trim() ? parseFloat(formData.deliveryFlatPrice) : undefined;
      const deliveryMinOrderAmount = formData.deliveryMinOrderAmount.trim() ? parseFloat(formData.deliveryMinOrderAmount) : undefined;

      // Log delivery options for debugging
      console.log('[AddProductModal] Delivery options:', {
        delivery_type: deliveryType,
        delivery_flat_price: deliveryFlatPrice,
        delivery_min_order_amount: deliveryMinOrderAmount,
      });

      const productData: ProducerProduct = {
        id: editingProduct?.id || `product-${Date.now()}`,
        name: formData.name,
        type: formData.type,
        cbdPercent: parseFloat(formData.cbdPercent) || 0,
        thcPercent: parseFloat(formData.thcPercent) || 0,
        price: parseFloat(formData.price) || 0,
        weight: formData.weight || '1g',
        image: productImages[0], // Image principale pour rétrocompatibilité
        images: productImages,
        videoUrl: videoUrl,
        description: formData.description,
        tvaRate: parseFloat(formData.tvaRate) || 20,
        stock: stockValue,
        isOnPromo: formData.isOnPromo,
        promoPercent: formData.isOnPromo ? promoPercentValue : undefined,
        disponible_vente_directe: formData.disponibleVenteDirecte,
        ville_retrait: formData.villeRetrait.trim() || undefined,
        adresse_retrait: formData.adresseRetrait.trim() || undefined,
        horaires_retrait: formData.horairesRetrait.trim() || undefined,
        instructions_retrait: formData.instructionsRetrait.trim() || undefined,
        // Delivery options
        delivery_type: deliveryType,
        delivery_flat_price: deliveryType === 'flat' ? deliveryFlatPrice : undefined,
        delivery_min_order_amount: deliveryType === 'min_order' ? deliveryMinOrderAmount : undefined,
      };

      // Debug log pour vérifier la sauvegarde
      console.log('AddProductModal - Saving product with images:', productImages);

      console.log('=== Saving product to store ===');
      console.log('productData:', JSON.stringify(productData));

      if (editingProduct) {
        // Update existing product using the new function that handles both custom and sample producers
        console.log('Updating existing product...');
        updateProductInProducer(producerId, productData);
      } else {
        console.log('Adding new product to producer:', producerId);
        addProductToProducer(producerId, productData);
      }
      console.log('Product saved successfully!');

      // Synchronize with promo products store
      const existingPromoProduct = promoProducts.find(
        (p) => p.productId === productData.id && p.producerId === producerId
      );

      if (formData.isOnPromo && promoPercentValue && promoPercentValue > 0) {
        // Product is on promo - add or update in promo store
        const originalPrice = parseFloat(formData.price) || 0;
        const promoPrice = originalPrice * (1 - promoPercentValue / 100);

        if (existingPromoProduct) {
          // Update existing promo product
          updatePromoProduct(existingPromoProduct.id, {
            productName: formData.name,
            producerName: producerName,
            originalPrice,
            promoPrice,
            discountPercent: promoPercentValue,
            image: productImages[0],
            active: true,
          });
        } else {
          // Add new promo product
          addPromoProduct({
            productId: productData.id,
            producerId: producerId,
            productName: formData.name,
            producerName: producerName,
            originalPrice,
            promoPrice,
            discountPercent: promoPercentValue,
            image: productImages[0],
            validUntil: '',
            active: true,
          });
        }
      } else if (existingPromoProduct) {
        // Product is no longer on promo - remove from promo store
        removePromoProduct(existingPromoProduct.id);
      }

      setFormData(initialFormData);
      onClose();
    } catch (error) {
      console.error('Error saving product:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const canSave = formData.name && formData.price;

  const handleClose = () => {
    setFormData(initialFormData);
    onClose();
  };

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View className="flex-1" style={{ backgroundColor: COLORS.background.nightSky, paddingTop: insets.top }}>
        {/* Header */}
        <LinearGradient
          colors={[`${COLORS.primary.gold}20`, 'transparent']}
        >
          <View
            className="flex-row items-center justify-between px-5 py-4"
            style={{ borderBottomWidth: 2, borderBottomColor: `${COLORS.primary.gold}30` }}
          >
            <View>
              <View className="flex-row items-center">
                <Leaf size={20} color={COLORS.accent.hemp} />
                <Text style={{ color: COLORS.text.cream }} className="text-xl font-bold ml-2">
                  {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
                </Text>
                <Sparkles size={16} color={COLORS.primary.brightYellow} style={{ marginLeft: 8 }} />
              </View>
              <Text style={{ color: COLORS.text.muted }} className="text-sm">{producerName}</Text>
            </View>
            <Pressable
              onPress={handleClose}
              className="p-2 rounded-xl"
              style={{ backgroundColor: `${COLORS.text.muted}20` }}
            >
              <X size={22} color={COLORS.text.lightGray} />
            </Pressable>
          </View>
        </LinearGradient>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View className="py-4">
            {/* Product name */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                Nom de la variété *
              </Text>
              <TextInput
                value={formData.name}
                onChangeText={(v) => updateForm('name', v)}
                placeholder="Ex: Lavande Haze"
                placeholderTextColor={COLORS.text.muted}
                className="rounded-xl px-4 py-3.5"
                style={{
                  backgroundColor: COLORS.background.charcoal,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.primary.gold}25`,
                  color: COLORS.text.cream,
                }}
              />
            </View>

            {/* Product type */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                Type de produit *
              </Text>
              <Pressable
                onPress={() => setShowTypeOptions(!showTypeOptions)}
                className="rounded-xl px-4 py-3.5 flex-row items-center justify-between"
                style={{
                  backgroundColor: COLORS.background.charcoal,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.primary.gold}25`,
                }}
              >
                <Text style={{ color: COLORS.text.cream }} className="font-medium">
                  {PRODUCT_TYPE_LABELS[formData.type]}
                </Text>
                <ChevronDown size={20} color={COLORS.primary.paleGold} />
              </Pressable>
              {showTypeOptions && (
                <View
                  className="rounded-xl mt-2 overflow-hidden"
                  style={{
                    backgroundColor: COLORS.background.charcoal,
                    borderWidth: 1.5,
                    borderColor: `${COLORS.primary.gold}30`,
                  }}
                >
                  {PRODUCT_TYPES.map((type, index) => (
                    <Pressable
                      key={type}
                      onPress={() => {
                        updateForm('type', type);
                        setShowTypeOptions(false);
                      }}
                      className="px-4 py-3"
                      style={{
                        borderBottomWidth: index < PRODUCT_TYPES.length - 1 ? 1 : 0,
                        borderBottomColor: `${COLORS.primary.gold}15`,
                        backgroundColor: formData.type === type ? `${COLORS.primary.gold}15` : 'transparent',
                      }}
                    >
                      <Text style={{ color: formData.type === type ? COLORS.primary.paleGold : COLORS.text.cream }}>
                        {PRODUCT_TYPE_LABELS[type]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                Description
              </Text>
              <TextInput
                value={formData.description}
                onChangeText={(v) => updateForm('description', v)}
                placeholder="Décrivez le produit, ses arômes, effets..."
                placeholderTextColor={COLORS.text.muted}
                multiline
                className="rounded-xl px-4 py-3 min-h-[80px]"
                style={{
                  backgroundColor: COLORS.background.charcoal,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.primary.gold}25`,
                  color: COLORS.text.cream,
                  textAlignVertical: 'top',
                }}
              />
            </View>

            {/* Price & Weight */}
            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                  Prix TTC (€) *
                </Text>
                <TextInput
                  value={formData.price}
                  onChangeText={(v) => updateForm('price', v)}
                  placeholder="8"
                  placeholderTextColor={COLORS.text.muted}
                  keyboardType="decimal-pad"
                  className="rounded-xl px-4 py-3.5"
                  style={{
                    backgroundColor: COLORS.background.charcoal,
                    borderWidth: 1.5,
                    borderColor: `${COLORS.primary.gold}25`,
                    color: COLORS.text.cream,
                  }}
                />
              </View>
              <View className="flex-1 ml-2">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                  Poids/Volume
                </Text>
                <TextInput
                  value={formData.weight}
                  onChangeText={(v) => updateForm('weight', v)}
                  placeholder="1g"
                  placeholderTextColor={COLORS.text.muted}
                  className="rounded-xl px-4 py-3.5"
                  style={{
                    backgroundColor: COLORS.background.charcoal,
                    borderWidth: 1.5,
                    borderColor: `${COLORS.primary.gold}25`,
                    color: COLORS.text.cream,
                  }}
                />
              </View>
            </View>

            {/* TVA Rate */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                Taux de TVA (%)
              </Text>
              <View className="flex-row">
                {['5.5', '10', '20'].map((rate) => (
                  <Pressable
                    key={rate}
                    onPress={() => updateForm('tvaRate', rate)}
                    className="flex-1 py-3 rounded-xl mr-2 items-center"
                    style={{
                      backgroundColor: formData.tvaRate === rate ? COLORS.primary.gold : COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: formData.tvaRate === rate ? COLORS.primary.gold : `${COLORS.primary.gold}25`,
                    }}
                  >
                    <Text
                      style={{ color: formData.tvaRate === rate ? COLORS.text.white : COLORS.text.cream }}
                      className="font-medium"
                    >
                      {rate}%
                    </Text>
                  </Pressable>
                ))}
                <TextInput
                  value={formData.tvaRate}
                  onChangeText={(v) => updateForm('tvaRate', v)}
                  placeholder="20"
                  placeholderTextColor={COLORS.text.muted}
                  keyboardType="decimal-pad"
                  className="flex-1 rounded-xl px-4 py-3 text-center"
                  style={{
                    backgroundColor: COLORS.background.charcoal,
                    borderWidth: 1.5,
                    borderColor: `${COLORS.primary.gold}25`,
                    color: COLORS.text.cream,
                  }}
                />
              </View>
            </View>

            {/* Stock / Inventaire */}
            <View className="mb-4">
              <View className="flex-row items-center mb-2">
                <Package size={16} color={COLORS.primary.brightYellow} />
                <Text style={{ color: COLORS.primary.brightYellow }} className="text-sm font-bold ml-2">
                  Stock disponible
                </Text>
              </View>
              <TextInput
                value={formData.stock}
                onChangeText={(v) => updateForm('stock', v)}
                placeholder="Laisser vide = illimité"
                placeholderTextColor={COLORS.text.muted}
                keyboardType="number-pad"
                className="rounded-xl px-4 py-3.5"
                style={{
                  backgroundColor: COLORS.background.charcoal,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.primary.brightYellow}30`,
                  color: COLORS.text.cream,
                }}
              />
              <Text style={{ color: COLORS.text.muted }} className="text-xs mt-1">
                Le stock sera automatiquement décrémenté à chaque vente
              </Text>
            </View>

            {/* Vente directe */}
            <View
              className="mb-4 p-4 rounded-xl"
              style={{
                backgroundColor: formData.disponibleVenteDirecte ? `${COLORS.accent.teal}15` : `${COLORS.text.white}05`,
                borderWidth: 1.5,
                borderColor: formData.disponibleVenteDirecte ? `${COLORS.accent.teal}50` : `${COLORS.primary.gold}25`,
              }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Store size={16} color={formData.disponibleVenteDirecte ? COLORS.accent.teal : COLORS.text.muted} />
                  <Text
                    style={{ color: formData.disponibleVenteDirecte ? COLORS.accent.teal : COLORS.text.lightGray }}
                    className="text-sm font-bold ml-2"
                  >
                    Disponible à la ferme
                  </Text>
                </View>
                <Switch
                  value={formData.disponibleVenteDirecte}
                  onValueChange={(v) => {
                    console.log('[AddProductModal] Vente directe toggle:', v);
                    updateForm('disponibleVenteDirecte', v);
                  }}
                  trackColor={{ false: COLORS.text.muted, true: `${COLORS.accent.teal}80` }}
                  thumbColor={formData.disponibleVenteDirecte ? COLORS.accent.teal : COLORS.text.lightGray}
                />
              </View>
              {formData.disponibleVenteDirecte && (
                <View className="mt-4">
                  {/* Ville de retrait */}
                  <View className="flex-row items-center mb-2">
                    <MapPin size={14} color={COLORS.accent.teal} />
                    <Text style={{ color: COLORS.accent.teal }} className="text-sm font-bold ml-2">
                      Ville de retrait *
                    </Text>
                  </View>
                  <TextInput
                    value={formData.villeRetrait}
                    onChangeText={(v) => updateForm('villeRetrait', v)}
                    placeholder="Ex: Rennes, Nantes..."
                    placeholderTextColor={COLORS.text.muted}
                    className="rounded-xl px-4 py-3.5 mb-3"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: `${COLORS.accent.teal}50`,
                      color: COLORS.text.cream,
                    }}
                  />

                  {/* Adresse de retrait */}
                  <Text style={{ color: COLORS.accent.teal }} className="text-sm font-bold mb-2">
                    Adresse de retrait
                  </Text>
                  <TextInput
                    value={formData.adresseRetrait}
                    onChangeText={(v) => updateForm('adresseRetrait', v)}
                    placeholder="Ex: 12 rue de la Ferme, 35000 Rennes"
                    placeholderTextColor={COLORS.text.muted}
                    className="rounded-xl px-4 py-3.5 mb-3"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: `${COLORS.accent.teal}30`,
                      color: COLORS.text.cream,
                    }}
                  />

                  {/* Horaires de retrait */}
                  <Text style={{ color: COLORS.accent.teal }} className="text-sm font-bold mb-2">
                    Horaires de retrait
                  </Text>
                  <TextInput
                    value={formData.horairesRetrait}
                    onChangeText={(v) => updateForm('horairesRetrait', v)}
                    placeholder="Ex: Lun-Ven 9h-18h, Sam 10h-16h"
                    placeholderTextColor={COLORS.text.muted}
                    className="rounded-xl px-4 py-3.5 mb-3"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: `${COLORS.accent.teal}30`,
                      color: COLORS.text.cream,
                    }}
                  />

                  {/* Instructions de retrait */}
                  <Text style={{ color: COLORS.accent.teal }} className="text-sm font-bold mb-2">
                    Instructions spéciales
                  </Text>
                  <TextInput
                    value={formData.instructionsRetrait}
                    onChangeText={(v) => updateForm('instructionsRetrait', v)}
                    placeholder="Ex: Sonner à l'interphone, prévoir un sac..."
                    placeholderTextColor={COLORS.text.muted}
                    multiline
                    className="rounded-xl px-4 py-3 min-h-[60px]"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: `${COLORS.accent.teal}30`,
                      color: COLORS.text.cream,
                      textAlignVertical: 'top',
                    }}
                  />
                  <Text style={{ color: COLORS.text.muted }} className="text-xs mt-1">
                    Ces informations seront affichées aux clients lors de la commande
                  </Text>
                </View>
              )}
            </View>

            {/* Promo */}
            <View
              className="mb-4 p-4 rounded-xl"
              style={{
                backgroundColor: formData.isOnPromo ? '#EF444415' : `${COLORS.text.white}05`,
                borderWidth: 1.5,
                borderColor: formData.isOnPromo ? '#EF444450' : `${COLORS.primary.gold}25`,
              }}
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Percent size={16} color={formData.isOnPromo ? '#EF4444' : COLORS.text.muted} />
                  <Text
                    style={{ color: formData.isOnPromo ? '#EF4444' : COLORS.text.lightGray }}
                    className="text-sm font-bold ml-2"
                  >
                    En promotion
                  </Text>
                </View>
                <Switch
                  value={formData.isOnPromo}
                  onValueChange={(v) => updateForm('isOnPromo', v)}
                  trackColor={{ false: COLORS.text.muted, true: '#EF444480' }}
                  thumbColor={formData.isOnPromo ? '#EF4444' : COLORS.text.lightGray}
                />
              </View>
              {formData.isOnPromo && (
                <View>
                  <Text style={{ color: '#EF4444' }} className="text-sm font-bold mb-2">
                    Réduction (%)
                  </Text>
                  <TextInput
                    value={formData.promoPercent}
                    onChangeText={(v) => updateForm('promoPercent', v)}
                    placeholder="Ex: 20 pour -20%"
                    placeholderTextColor={COLORS.text.muted}
                    keyboardType="number-pad"
                    className="rounded-xl px-4 py-3.5"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: '#EF444450',
                      color: COLORS.text.cream,
                    }}
                  />
                  {formData.promoPercent && parseFloat(formData.price) > 0 && (
                    <View className="mt-2 flex-row items-center">
                      <Text style={{ color: COLORS.text.muted }} className="text-xs">
                        Prix promo:{' '}
                      </Text>
                      <Text style={{ color: '#EF4444' }} className="text-xs font-bold">
                        {(parseFloat(formData.price) * (1 - parseFloat(formData.promoPercent) / 100)).toFixed(2)}€
                      </Text>
                      <Text style={{ color: COLORS.text.muted, textDecorationLine: 'line-through' }} className="text-xs ml-2">
                        {parseFloat(formData.price).toFixed(2)}€
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Delivery Options */}
            <View
              className="mb-4 p-4 rounded-xl"
              style={{
                backgroundColor: formData.deliveryType ? `${COLORS.accent.sky}15` : `${COLORS.text.white}05`,
                borderWidth: 1.5,
                borderColor: formData.deliveryType ? `${COLORS.accent.sky}50` : `${COLORS.primary.gold}25`,
              }}
            >
              <View className="flex-row items-center mb-3">
                <Truck size={16} color={formData.deliveryType ? COLORS.accent.sky : COLORS.text.muted} />
                <Text
                  style={{ color: formData.deliveryType ? COLORS.accent.sky : COLORS.text.lightGray }}
                  className="text-sm font-bold ml-2"
                >
                  Options de livraison
                </Text>
              </View>

              {/* Delivery type selector */}
              <View className="mb-3">
                <Pressable
                  onPress={() => updateForm('deliveryType', formData.deliveryType === 'flat' ? '' : 'flat')}
                  className="flex-row items-center p-3 rounded-xl mb-2"
                  style={{
                    backgroundColor: formData.deliveryType === 'flat' ? `${COLORS.accent.sky}20` : COLORS.background.charcoal,
                    borderWidth: 1.5,
                    borderColor: formData.deliveryType === 'flat' ? COLORS.accent.sky : `${COLORS.primary.gold}25`,
                  }}
                >
                  <View
                    className="w-5 h-5 rounded-full items-center justify-center mr-3"
                    style={{
                      borderWidth: 2,
                      borderColor: formData.deliveryType === 'flat' ? COLORS.accent.sky : COLORS.text.muted,
                      backgroundColor: formData.deliveryType === 'flat' ? COLORS.accent.sky : 'transparent',
                    }}
                  >
                    {formData.deliveryType === 'flat' && <Check size={12} color={COLORS.text.white} />}
                  </View>
                  <Text style={{ color: formData.deliveryType === 'flat' ? COLORS.accent.sky : COLORS.text.cream }}>
                    {DELIVERY_TYPE_LABELS.flat}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => updateForm('deliveryType', formData.deliveryType === 'min_order' ? '' : 'min_order')}
                  className="flex-row items-center p-3 rounded-xl"
                  style={{
                    backgroundColor: formData.deliveryType === 'min_order' ? `${COLORS.accent.sky}20` : COLORS.background.charcoal,
                    borderWidth: 1.5,
                    borderColor: formData.deliveryType === 'min_order' ? COLORS.accent.sky : `${COLORS.primary.gold}25`,
                  }}
                >
                  <View
                    className="w-5 h-5 rounded-full items-center justify-center mr-3"
                    style={{
                      borderWidth: 2,
                      borderColor: formData.deliveryType === 'min_order' ? COLORS.accent.sky : COLORS.text.muted,
                      backgroundColor: formData.deliveryType === 'min_order' ? COLORS.accent.sky : 'transparent',
                    }}
                  >
                    {formData.deliveryType === 'min_order' && <Check size={12} color={COLORS.text.white} />}
                  </View>
                  <Text style={{ color: formData.deliveryType === 'min_order' ? COLORS.accent.sky : COLORS.text.cream }}>
                    {DELIVERY_TYPE_LABELS.min_order}
                  </Text>
                </Pressable>
              </View>

              {/* Flat delivery price input */}
              {formData.deliveryType === 'flat' && (
                <View>
                  <Text style={{ color: COLORS.accent.sky }} className="text-sm font-bold mb-2">
                    Prix de la livraison (€) *
                  </Text>
                  <TextInput
                    value={formData.deliveryFlatPrice}
                    onChangeText={(v) => updateForm('deliveryFlatPrice', v)}
                    placeholder="Ex: 5.90"
                    placeholderTextColor={COLORS.text.muted}
                    keyboardType="decimal-pad"
                    className="rounded-xl px-4 py-3.5"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: `${COLORS.accent.sky}50`,
                      color: COLORS.text.cream,
                    }}
                  />
                </View>
              )}

              {/* Minimum order amount input */}
              {formData.deliveryType === 'min_order' && (
                <View>
                  <Text style={{ color: COLORS.accent.sky }} className="text-sm font-bold mb-2">
                    Montant minimum de commande (€) *
                  </Text>
                  <TextInput
                    value={formData.deliveryMinOrderAmount}
                    onChangeText={(v) => updateForm('deliveryMinOrderAmount', v)}
                    placeholder="Ex: 50"
                    placeholderTextColor={COLORS.text.muted}
                    keyboardType="decimal-pad"
                    className="rounded-xl px-4 py-3.5"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: `${COLORS.accent.sky}50`,
                      color: COLORS.text.cream,
                    }}
                  />
                  <Text style={{ color: COLORS.text.muted }} className="text-xs mt-1">
                    La livraison sera disponible uniquement pour les commandes supérieures à ce montant
                  </Text>
                </View>
              )}

              {!formData.deliveryType && (
                <Text style={{ color: COLORS.text.muted }} className="text-xs">
                  Sélectionnez une option de livraison pour ce produit
                </Text>
              )}
            </View>

            {/* CBD & THC */}
            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text style={{ color: COLORS.accent.hemp }} className="text-sm font-bold mb-2">
                  CBD %
                </Text>
                <TextInput
                  value={formData.cbdPercent}
                  onChangeText={(v) => updateForm('cbdPercent', v)}
                  placeholder="18.5"
                  placeholderTextColor={COLORS.text.muted}
                  keyboardType="decimal-pad"
                  className="rounded-xl px-4 py-3.5"
                  style={{
                    backgroundColor: COLORS.background.charcoal,
                    borderWidth: 1.5,
                    borderColor: `${COLORS.accent.hemp}30`,
                    color: COLORS.text.cream,
                  }}
                />
              </View>
              <View className="flex-1 ml-2">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                  THC %
                </Text>
                <TextInput
                  value={formData.thcPercent}
                  onChangeText={(v) => updateForm('thcPercent', v)}
                  placeholder="0.2"
                  placeholderTextColor={COLORS.text.muted}
                  keyboardType="decimal-pad"
                  className="rounded-xl px-4 py-3.5"
                  style={{
                    backgroundColor: COLORS.background.charcoal,
                    borderWidth: 1.5,
                    borderColor: `${COLORS.primary.gold}25`,
                    color: COLORS.text.cream,
                  }}
                />
              </View>
            </View>

            {/* Image Picker */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                Photos du produit ({formData.images.length}/{MAX_IMAGES})
              </Text>

              {/* Display existing images */}
              {formData.images.length > 0 && (
                <View className="flex-row flex-wrap mb-3">
                  {formData.images.map((uri, index) => (
                    <View key={index} className="mr-2 mb-2">
                      <View
                        className="rounded-xl overflow-hidden"
                        style={{ borderWidth: 2, borderColor: `${COLORS.primary.gold}40` }}
                      >
                        <Image
                          source={{ uri }}
                          className="w-24 h-24"
                          resizeMode="cover"
                        />
                      </View>
                      <Pressable
                        onPress={() => removeImage(index)}
                        className="absolute -top-2 -right-2 rounded-full p-1"
                        style={{ backgroundColor: COLORS.accent.red }}
                      >
                        <Trash2 size={14} color={COLORS.text.white} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              {/* Add image buttons */}
              {formData.images.length < MAX_IMAGES && (
                <View className="flex-row">
                  <Pressable
                    onPress={pickImage}
                    className="flex-1 py-4 rounded-xl mr-2 flex-row items-center justify-center"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: `${COLORS.primary.gold}25`,
                    }}
                  >
                    <ImagePlus size={20} color={COLORS.primary.paleGold} />
                    <Text style={{ color: COLORS.primary.paleGold }} className="ml-2 font-medium">
                      Galerie
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={takePhoto}
                    className="flex-1 py-4 rounded-xl flex-row items-center justify-center"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: `${COLORS.primary.gold}25`,
                    }}
                  >
                    <Camera size={20} color={COLORS.primary.paleGold} />
                    <Text style={{ color: COLORS.primary.paleGold }} className="ml-2 font-medium">
                      Photo
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            {/* Video Picker */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                Vidéo du produit (optionnel)
              </Text>

              {formData.videoUrl ? (
                <View className="flex-row items-center">
                  <View
                    className="flex-1 py-4 px-4 rounded-xl flex-row items-center"
                    style={{
                      backgroundColor: `${COLORS.accent.teal}15`,
                      borderWidth: 1.5,
                      borderColor: `${COLORS.accent.teal}40`,
                    }}
                  >
                    <VideoIcon size={20} color={COLORS.accent.teal} />
                    <Text style={{ color: COLORS.accent.teal }} className="ml-2 font-medium flex-1" numberOfLines={1}>
                      Vidéo ajoutée
                    </Text>
                  </View>
                  <Pressable
                    onPress={removeVideo}
                    className="ml-2 p-3 rounded-xl"
                    style={{ backgroundColor: COLORS.accent.red }}
                  >
                    <Trash2 size={18} color={COLORS.text.white} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={pickVideo}
                  className="py-4 rounded-xl flex-row items-center justify-center"
                  style={{
                    backgroundColor: COLORS.background.charcoal,
                    borderWidth: 1.5,
                    borderColor: `${COLORS.accent.teal}30`,
                  }}
                >
                  <VideoIcon size={20} color={COLORS.accent.teal} />
                  <Text style={{ color: COLORS.accent.teal }} className="ml-2 font-medium">
                    Ajouter une vidéo
                  </Text>
                </Pressable>
              )}
              <Text style={{ color: COLORS.text.muted }} className="text-xs mt-1">
                Max 60 secondes - depuis votre bibliothèque
              </Text>
            </View>
          </View>
          <View className="h-40" />
        </ScrollView>

        {/* Save button */}
        <View
          className="absolute bottom-0 left-0 right-0 px-5 pt-4"
          style={{
            backgroundColor: COLORS.background.nightSky,
            borderTopWidth: 2,
            borderTopColor: `${COLORS.primary.gold}20`,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <Pressable
            onPress={handleSave}
            disabled={!canSave || isUploading}
            className="py-4 rounded-xl flex-row items-center justify-center"
            style={{
              backgroundColor: canSave && !isUploading ? COLORS.accent.forest : `${COLORS.accent.forest}40`,
              shadowColor: canSave && !isUploading ? COLORS.accent.hemp : 'transparent',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
            }}
          >
            {isUploading ? (
              <>
                <ActivityIndicator size="small" color={COLORS.text.white} />
                <Text style={{ color: COLORS.text.white }} className="text-center font-bold ml-2">
                  Upload en cours...
                </Text>
              </>
            ) : (
              <>
                <Check size={20} color={COLORS.text.white} />
                <Text style={{ color: COLORS.text.white }} className="text-center font-bold ml-2">
                  {editingProduct ? 'Enregistrer' : 'Ajouter le produit'}
                </Text>
                <Sparkles size={16} color={COLORS.primary.brightYellow} style={{ marginLeft: 8 }} />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>

    {/* Image Cropper Modal */}
    <ImageCropper
      visible={showCropper}
      imageUri={imageToCrop}
      aspectRatio={1}
      onCrop={handleCroppedImage}
      onCancel={() => {
        setShowCropper(false);
        setImageToCrop('');
      }}
    />
    </>
  );
};
