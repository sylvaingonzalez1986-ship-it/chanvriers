import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Modal, Image, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Check, ImagePlus, Camera, Sparkles, Package, Trash2, Plus, ChevronDown, ChevronUp, Leaf, ShoppingBag, Minus, RefreshCw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Pack, PackItem, usePacksStore, useProducerStore } from '@/lib/store';
import { COLORS } from '@/lib/colors';
import { PRODUCT_TYPE_LABELS, PRODUCT_TYPE_COLORS, ProducerProduct } from '@/lib/producers';
import { ASSET_IMAGES, ALL_ASSET_IDS, PACK_ASSET_IDS, getImageSource } from '@/lib/asset-images';
import { syncPackToSupabase, isSupabaseSyncConfigured } from '@/lib/supabase-sync';
import { processImageForSync, processMultipleImagesForSync } from '@/lib/image-upload';
import { ImageCropper } from './ImageCropper';

interface AddPackModalProps {
  visible: boolean;
  onClose: () => void;
  editingPack?: Pack | null;
}

interface FormData {
  name: string;
  description: string;
  price: string;
  originalPrice: string;
  image: string;
  items: PackItem[];
  tag: string;
  color: string;
  active: boolean;
}

const PRESET_COLORS = [
  { name: 'Vert', value: COLORS.accent.hemp },
  { name: 'Turquoise', value: COLORS.accent.teal },
  { name: 'Orange', value: COLORS.primary.orange },
  { name: 'Or', value: COLORS.primary.gold },
  { name: 'Bleu', value: COLORS.accent.sky },
  { name: 'Rouge', value: COLORS.accent.red },
];

const initialFormData: FormData = {
  name: '',
  description: '',
  price: '',
  originalPrice: '',
  image: '',
  items: [],
  tag: '',
  color: COLORS.accent.hemp,
  active: true,
};

export const AddPackModal = ({ visible, onClose, editingPack }: AddPackModalProps) => {
  const insets = useSafeAreaInsets();
  const addPack = usePacksStore((s) => s.addPack);
  const updatePack = usePacksStore((s) => s.updatePack);
  const producers = useProducerStore((s) => s.producers);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemValue, setNewItemValue] = useState('');
  const [newItemImages, setNewItemImages] = useState<string[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [expandedProducers, setExpandedProducers] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [imageSearch, setImageSearch] = useState('');
  const [imageCategory, setImageCategory] = useState<'all' | 'image' | 'background' | 'icon' | 'other'>('all');

  // Image cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState('');
  const [cropAspectRatio, setCropAspectRatio] = useState(16/9);
  const [cropTarget, setCropTarget] = useState<'pack' | 'item'>('pack');

  // State for inline quantity selection per product
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});

  // Get producers with products
  const producersWithProducts = producers.filter((p) => p.products && p.products.length > 0);

  // Filter images based on search and category
  const filteredAssetIds = ALL_ASSET_IDS.filter(assetId => {
    const matchesSearch = imageSearch === '' || assetId.toLowerCase().includes(imageSearch.toLowerCase());
    let matchesCategory = true;
    if (imageCategory === 'image') matchesCategory = assetId.startsWith('image-');
    else if (imageCategory === 'background') matchesCategory = assetId.startsWith('background-');
    else if (imageCategory === 'icon') matchesCategory = assetId.startsWith('icon-');
    else if (imageCategory === 'other') matchesCategory = !assetId.startsWith('image-') && !assetId.startsWith('background-') && !assetId.startsWith('icon-');
    return matchesSearch && matchesCategory;
  });

  // Populate form when editing
  useEffect(() => {
    if (visible && editingPack) {
      setFormData({
        name: editingPack.name,
        description: editingPack.description,
        price: editingPack.price.toString(),
        originalPrice: editingPack.originalPrice.toString(),
        image: editingPack.image,
        items: editingPack.items,
        tag: editingPack.tag || '',
        color: editingPack.color,
        active: editingPack.active,
      });
    } else if (visible) {
      setFormData(initialFormData);
    }
    // Reset quantities when modal opens
    setProductQuantities({});
  }, [visible, editingPack]);

  const updateForm = (key: keyof FormData, value: string | boolean | PackItem[]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleProducer = (producerId: string) => {
    setExpandedProducers((prev) =>
      prev.includes(producerId)
        ? prev.filter((id) => id !== producerId)
        : [...prev, producerId]
    );
  };

  const getProductQuantity = (productId: string) => {
    return productQuantities[productId] || 1;
  };

  const setProductQuantity = (productId: string, quantity: number) => {
    setProductQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(1, quantity),
    }));
  };

  const addProductToPackInline = (product: ProducerProduct, producerName: string) => {
    const quantity = getProductQuantity(product.id);
    const newItem: PackItem = {
      name: product.name,
      quantity: `${quantity}x ${product.weight}`,
      value: product.price * quantity,
      producerName: producerName,
    };
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
    // Reset this product's quantity
    setProductQuantities((prev) => {
      const updated = { ...prev };
      delete updated[product.id];
      return updated;
    });
    setShowProductPicker(false);
  };

  const addItem = () => {
    if (newItemName && newItemValue) {
      const newItem: PackItem = {
        name: newItemName,
        quantity: newItemQuantity || '1',
        value: parseFloat(newItemValue) || 0,
        images: newItemImages.length > 0 ? newItemImages : undefined,
      };
      setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
      setNewItemName('');
      setNewItemQuantity('');
      setNewItemValue('');
      setNewItemImages([]);
    }
  };

  const removeItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const pickItemImage = async () => {
    if (newItemImages.length >= 3) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      // Open cropper for item image (square)
      setImageToCrop(result.assets[0].uri);
      setCropAspectRatio(1);
      setCropTarget('item');
      setShowCropper(true);
    }
  };

  const takeItemPhoto = async () => {
    if (newItemImages.length >= 3) return;

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      // Open cropper for item image (square)
      setImageToCrop(result.assets[0].uri);
      setCropAspectRatio(1);
      setCropTarget('item');
      setShowCropper(true);
    }
  };

  const removeItemImage = (index: number) => {
    setNewItemImages((prev) => prev.filter((_, i) => i !== index));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      // Open cropper for pack image (16:9)
      setImageToCrop(result.assets[0].uri);
      setCropAspectRatio(16/9);
      setCropTarget('pack');
      setShowCropper(true);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      // Open cropper for pack image (16:9)
      setImageToCrop(result.assets[0].uri);
      setCropAspectRatio(16/9);
      setCropTarget('pack');
      setShowCropper(true);
    }
  };

  // Handle cropped image
  const handleCroppedImage = (croppedUri: string) => {
    if (cropTarget === 'pack') {
      updateForm('image', croppedUri);
    } else {
      setNewItemImages((prev) => [...prev, croppedUri]);
    }
    setShowCropper(false);
    setImageToCrop('');
  };

  const handleSave = async () => {
    setIsUploading(true);

    try {
      const defaultImage = 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400';

      // Upload pack image to Supabase Storage if it's a local file
      const uploadedImage = await processImageForSync(formData.image || defaultImage, 'packs');

      // Upload item images to Supabase Storage
      const processedItems = await Promise.all(
        formData.items.map(async (item) => ({
          ...item,
          images: item.images ? await processMultipleImagesForSync(item.images, 'packs') : undefined,
        }))
      );

      const packData: Pack = {
        id: editingPack?.id || `pack-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price) || 0,
        originalPrice: parseFloat(formData.originalPrice) || 0,
        image: uploadedImage,
        items: processedItems,
        tag: formData.tag || undefined,
        color: formData.color,
        active: formData.active,
      };

      if (editingPack) {
        updatePack(editingPack.id, packData);
      } else {
        addPack(packData);
      }

      // Sync to Supabase automatically
      if (isSupabaseSyncConfigured()) {
        try {
          await syncPackToSupabase(packData);
          console.log('[AddPackModal] Pack synced to Supabase');
        } catch (error) {
          console.error('[AddPackModal] Failed to sync to Supabase:', error);
        }
      }

      setFormData(initialFormData);
      onClose();
    } catch (error) {
      console.error('Error saving pack:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const canSave = formData.name && formData.price && formData.items.length > 0;

  const handleClose = () => {
    setFormData(initialFormData);
    setNewItemName('');
    setNewItemQuantity('');
    setNewItemValue('');
    setNewItemImages([]);
    setShowProductPicker(false);
    setExpandedProducers([]);
    setProductQuantities({});
    onClose();
  };

  const calculateTotalValue = () => {
    return formData.items.reduce((sum, item) => sum + item.value, 0);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View className="flex-1" style={{ backgroundColor: COLORS.background.nightSky, paddingTop: insets.top }}>
        {/* Product Picker Modal */}
        <Modal
          visible={showProductPicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowProductPicker(false)}
        >
          <View className="flex-1 bg-black/80">
            <Pressable className="h-20" onPress={() => setShowProductPicker(false)} />
            <View
              className="flex-1 rounded-t-3xl"
              style={{ backgroundColor: COLORS.background.nightSky }}
            >
              {/* Picker Header */}
              <View
                className="flex-row items-center justify-between px-5 py-4"
                style={{ borderBottomWidth: 2, borderBottomColor: `${COLORS.primary.gold}30` }}
              >
                <View className="flex-row items-center">
                  <ShoppingBag size={20} color={COLORS.accent.hemp} />
                  <Text style={{ color: COLORS.text.cream }} className="text-lg font-bold ml-2">
                    Sélectionner un produit
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowProductPicker(false)}
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: `${COLORS.text.muted}20` }}
                >
                  <X size={20} color={COLORS.text.lightGray} />
                </Pressable>
              </View>

              {/* Producers List */}
              <ScrollView
                className="flex-1 px-5 pt-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                {producersWithProducts.length === 0 ? (
                  <View className="items-center py-10">
                    <Package size={48} color={COLORS.text.muted} />
                    <Text style={{ color: COLORS.text.muted }} className="mt-4 text-center">
                      Aucun produit disponible.{'\n'}Ajoutez des produits aux producteurs d'abord{'\n'}via l'onglet "Produits".
                    </Text>
                    <Pressable
                      onPress={() => setShowProductPicker(false)}
                      className="mt-4 px-6 py-2 rounded-xl"
                      style={{ backgroundColor: COLORS.accent.teal }}
                    >
                      <Text style={{ color: COLORS.text.white }} className="font-semibold">
                        Fermer
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  producersWithProducts.map((producer) => (
                    <View key={producer.id} className="mb-4">
                      {/* Producer Header */}
                      <Pressable
                        onPress={() => toggleProducer(producer.id)}
                        className="flex-row items-center justify-between p-3 rounded-xl"
                        style={{
                          backgroundColor: COLORS.background.charcoal,
                          borderWidth: 1.5,
                          borderColor: expandedProducers.includes(producer.id)
                            ? `${COLORS.accent.hemp}50`
                            : `${COLORS.primary.gold}25`,
                        }}
                      >
                        <View className="flex-row items-center">
                          <View
                            className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                            style={{ backgroundColor: `${COLORS.accent.forest}20` }}
                          >
                            <Leaf size={20} color={COLORS.accent.hemp} />
                          </View>
                          <View>
                            <Text style={{ color: COLORS.text.cream }} className="font-bold">
                              {producer.name}
                            </Text>
                            <Text style={{ color: COLORS.text.muted }} className="text-sm">
                              {producer.products.length} produit{producer.products.length > 1 ? 's' : ''}
                            </Text>
                          </View>
                        </View>
                        {expandedProducers.includes(producer.id) ? (
                          <ChevronUp size={20} color={COLORS.text.muted} />
                        ) : (
                          <ChevronDown size={20} color={COLORS.text.muted} />
                        )}
                      </Pressable>

                      {/* Products */}
                      {expandedProducers.includes(producer.id) && (
                        <View className="mt-2">
                          {producer.products.map((product) => (
                            <View
                              key={product.id}
                              className="p-3 mb-2 rounded-xl"
                              style={{
                                backgroundColor: COLORS.background.charcoal,
                                borderWidth: 1,
                                borderColor: `${COLORS.primary.gold}15`,
                              }}
                            >
                              {/* Product Info Row */}
                              <View className="flex-row items-center">
                                <Image
                                  source={{ uri: product.image }}
                                  className="w-14 h-14 rounded-lg"
                                  resizeMode="cover"
                                />
                                <View className="flex-1 ml-3">
                                  <View
                                    className="self-start px-2 py-0.5 rounded-full mb-1"
                                    style={{ backgroundColor: `${PRODUCT_TYPE_COLORS[product.type]}20` }}
                                  >
                                    <Text
                                      className="text-xs font-bold"
                                      style={{ color: PRODUCT_TYPE_COLORS[product.type] }}
                                    >
                                      {PRODUCT_TYPE_LABELS[product.type]}
                                    </Text>
                                  </View>
                                  <Text style={{ color: COLORS.text.cream }} className="font-medium">
                                    {product.name}
                                  </Text>
                                  <Text style={{ color: COLORS.text.muted }} className="text-xs">
                                    {product.weight} • {product.price}€/unité
                                  </Text>
                                </View>
                              </View>

                              {/* Quantity Selector + Add Button */}
                              <View className="flex-row items-center justify-between mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: `${COLORS.primary.gold}15` }}>
                                {/* Quantity Controls */}
                                <View className="flex-row items-center">
                                  <Text style={{ color: COLORS.text.muted }} className="text-sm mr-3">Quantité:</Text>
                                  <Pressable
                                    onPress={() => setProductQuantity(product.id, getProductQuantity(product.id) - 1)}
                                    className="w-9 h-9 rounded-lg items-center justify-center"
                                    style={{ backgroundColor: `${COLORS.text.muted}30` }}
                                  >
                                    <Minus size={18} color={COLORS.text.lightGray} />
                                  </Pressable>
                                  <View className="mx-3 min-w-[30px] items-center">
                                    <Text style={{ color: COLORS.primary.brightYellow }} className="text-xl font-bold">
                                      {getProductQuantity(product.id)}
                                    </Text>
                                  </View>
                                  <Pressable
                                    onPress={() => setProductQuantity(product.id, getProductQuantity(product.id) + 1)}
                                    className="w-9 h-9 rounded-lg items-center justify-center"
                                    style={{ backgroundColor: `${COLORS.accent.teal}30` }}
                                  >
                                    <Plus size={18} color={COLORS.accent.teal} />
                                  </Pressable>
                                </View>

                                {/* Total + Add Button */}
                                <View className="flex-row items-center">
                                  <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold mr-3">
                                    {(product.price * getProductQuantity(product.id)).toFixed(2)}€
                                  </Text>
                                  <Pressable
                                    onPress={() => addProductToPackInline(product, producer.name)}
                                    className="px-4 py-2 rounded-lg flex-row items-center"
                                    style={{ backgroundColor: COLORS.accent.teal }}
                                  >
                                    <Plus size={16} color={COLORS.text.white} />
                                    <Text style={{ color: COLORS.text.white }} className="font-semibold ml-1">
                                      Ajouter
                                    </Text>
                                  </Pressable>
                                </View>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Asset Images Picker Modal */}
        <Modal
          visible={showAssetPicker}
          animationType="slide"
          transparent
          onRequestClose={() => {
            setShowAssetPicker(false);
            setImageSearch('');
            setImageCategory('all');
          }}
        >
          <View className="flex-1 bg-black/80">
            <Pressable className="h-20" onPress={() => {
              setShowAssetPicker(false);
              setImageSearch('');
              setImageCategory('all');
            }} />
            <View
              className="flex-1 rounded-t-3xl"
              style={{ backgroundColor: COLORS.background.nightSky }}
            >
              {/* Picker Header */}
              <View
                className="flex-row items-center justify-between px-5 py-4"
                style={{ borderBottomWidth: 2, borderBottomColor: `${COLORS.primary.gold}30` }}
              >
                <View className="flex-row items-center">
                  <ImagePlus size={20} color={COLORS.accent.teal} />
                  <Text style={{ color: COLORS.text.cream }} className="text-lg font-bold ml-2">
                    Images uploadées
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setShowAssetPicker(false);
                    setImageSearch('');
                    setImageCategory('all');
                  }}
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: `${COLORS.text.muted}20` }}
                >
                  <X size={20} color={COLORS.text.lightGray} />
                </Pressable>
              </View>

              {/* Search Bar */}
              <View className="px-4 pt-3 pb-2">
                <TextInput
                  value={imageSearch}
                  onChangeText={setImageSearch}
                  placeholder="Rechercher une image..."
                  placeholderTextColor={COLORS.text.muted}
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: COLORS.background.charcoal,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.gold}25`,
                    color: COLORS.text.cream,
                  }}
                />
              </View>

              {/* Category Filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-2" style={{ flexGrow: 0 }}>
                <View className="flex-row">
                  {[
                    { key: 'all', label: 'Toutes' },
                    { key: 'image', label: 'Images' },
                    { key: 'background', label: 'Fonds' },
                    { key: 'icon', label: 'Icônes' },
                    { key: 'other', label: 'Autres' },
                  ].map((cat) => (
                    <Pressable
                      key={cat.key}
                      onPress={() => setImageCategory(cat.key as typeof imageCategory)}
                      className="px-4 py-2 rounded-full mr-2"
                      style={{
                        backgroundColor: imageCategory === cat.key
                          ? COLORS.accent.teal
                          : COLORS.background.charcoal,
                      }}
                    >
                      <Text
                        style={{
                          color: imageCategory === cat.key ? COLORS.text.white : COLORS.text.cream,
                        }}
                        className="text-sm font-medium"
                      >
                        {cat.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text style={{ color: COLORS.text.muted }} className="text-xs text-center py-2">
                {filteredAssetIds.length} / {ALL_ASSET_IDS.length} images
              </Text>

              {/* Images Grid */}
              <ScrollView
                className="flex-1 px-4"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 40 }}
              >
                <View className="flex-row flex-wrap">
                  {filteredAssetIds.map((assetId) => (
                    <Pressable
                      key={assetId}
                      onPress={() => {
                        updateForm('image', `asset:${assetId}`);
                        setShowAssetPicker(false);
                        setImageSearch('');
                        setImageCategory('all');
                      }}
                      className="w-1/3 p-1"
                    >
                      <View
                        className="rounded-xl overflow-hidden"
                        style={{
                          borderWidth: formData.image === `asset:${assetId}` ? 3 : 1,
                          borderColor: formData.image === `asset:${assetId}`
                            ? COLORS.accent.teal
                            : `${COLORS.primary.gold}20`,
                        }}
                      >
                        <Image
                          source={ASSET_IMAGES[assetId]}
                          className="w-full aspect-square"
                          resizeMode="cover"
                        />
                        {formData.image === `asset:${assetId}` && (
                          <View
                            className="absolute top-1 right-1 w-6 h-6 rounded-full items-center justify-center"
                            style={{ backgroundColor: COLORS.accent.teal }}
                          >
                            <Check size={14} color={COLORS.text.white} />
                          </View>
                        )}
                      </View>
                      <Text
                        style={{ color: COLORS.text.muted }}
                        className="text-xs text-center mt-1"
                        numberOfLines={1}
                      >
                        {assetId}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {filteredAssetIds.length === 0 && (
                  <View className="py-8 items-center">
                    <Text style={{ color: COLORS.text.muted }} className="text-center">
                      Aucune image trouvée
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Header */}
        <LinearGradient colors={[`${COLORS.primary.orange}20`, 'transparent']}>
          <View
            className="flex-row items-center justify-between px-5 py-4"
            style={{ borderBottomWidth: 2, borderBottomColor: `${COLORS.primary.gold}30` }}
          >
            <View>
              <View className="flex-row items-center">
                <Package size={20} color={COLORS.primary.orange} />
                <Text style={{ color: COLORS.text.cream }} className="text-xl font-bold ml-2">
                  {editingPack ? 'Modifier le pack' : 'Nouveau pack'}
                </Text>
                <Sparkles size={16} color={COLORS.primary.brightYellow} style={{ marginLeft: 8 }} />
              </View>
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
            {/* Pack name */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                Nom du pack *
              </Text>
              <TextInput
                value={formData.name}
                onChangeText={(v) => updateForm('name', v)}
                placeholder="Ex: Pack Découverte"
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

            {/* Description */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                Description
              </Text>
              <TextInput
                value={formData.description}
                onChangeText={(v) => updateForm('description', v)}
                placeholder="Décrivez le pack..."
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

            {/* Price & Original Price */}
            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                  Prix du pack (€) *
                </Text>
                <TextInput
                  value={formData.price}
                  onChangeText={(v) => updateForm('price', v)}
                  placeholder="49"
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
                  Prix barré (€)
                </Text>
                <TextInput
                  value={formData.originalPrice}
                  onChangeText={(v) => updateForm('originalPrice', v)}
                  placeholder="65"
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

            {/* Tag */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                Badge (optionnel)
              </Text>
              <TextInput
                value={formData.tag}
                onChangeText={(v) => updateForm('tag', v)}
                placeholder="Ex: Populaire, Best-seller, Exclusif"
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

            {/* Color */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                Couleur du pack
              </Text>
              <View className="flex-row flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <Pressable
                    key={color.value}
                    onPress={() => updateForm('color', color.value)}
                    className="mr-2 mb-2 px-4 py-2 rounded-xl flex-row items-center"
                    style={{
                      backgroundColor: formData.color === color.value ? color.value : `${color.value}30`,
                      borderWidth: 2,
                      borderColor: color.value,
                    }}
                  >
                    <Text
                      style={{ color: formData.color === color.value ? COLORS.text.white : color.value }}
                      className="font-medium"
                    >
                      {color.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Items */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                Produits du pack * ({formData.items.length})
              </Text>

              {/* Existing items */}
              {formData.items.map((item, index) => (
                <View
                  key={index}
                  className="p-3 rounded-xl mb-2"
                  style={{ backgroundColor: COLORS.background.charcoal }}
                >
                  <View className="flex-row items-center justify-between">
                    {/* Image principale si disponible */}
                    {item.images && item.images.length > 0 && (
                      <Image
                        source={{ uri: item.images[0] }}
                        className="w-12 h-12 rounded-lg mr-3"
                        resizeMode="cover"
                      />
                    )}
                    <View className="flex-1">
                      <Text style={{ color: COLORS.text.cream }} className="font-medium">
                        {item.name}
                      </Text>
                      <Text style={{ color: COLORS.text.muted }} className="text-sm">
                        {item.quantity} • {item.value}€
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => removeItem(index)}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${COLORS.accent.red}20` }}
                    >
                      <Trash2 size={18} color={COLORS.accent.red} />
                    </Pressable>
                  </View>
                  {/* Miniatures des images supplémentaires */}
                  {item.images && item.images.length > 1 && (
                    <View className="flex-row mt-2">
                      {item.images.slice(1).map((img, imgIdx) => (
                        <Image
                          key={imgIdx}
                          source={{ uri: img }}
                          className="w-8 h-8 rounded mr-1"
                          resizeMode="cover"
                        />
                      ))}
                      <Text style={{ color: COLORS.text.muted }} className="text-xs self-center ml-1">
                        +{item.images.length - 1} image{item.images.length > 2 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>
              ))}

              {/* Add from producers button */}
              <Pressable
                onPress={() => {
                  console.log('Opening product picker, producers with products:', producersWithProducts.length);
                  setShowProductPicker(true);
                }}
                className="flex-row items-center justify-center py-3 rounded-xl mb-3"
                style={{
                  backgroundColor: `${COLORS.accent.teal}15`,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.accent.teal}40`,
                }}
              >
                <ShoppingBag size={18} color={COLORS.accent.teal} />
                <Text style={{ color: COLORS.accent.teal }} className="font-semibold ml-2">
                  Choisir depuis les producteurs ({producersWithProducts.length})
                </Text>
              </Pressable>

              {/* Add new item manually */}
              <View
                className="rounded-xl p-3"
                style={{
                  backgroundColor: `${COLORS.accent.hemp}10`,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.accent.hemp}30`,
                  borderStyle: 'dashed',
                }}
              >
                <Text style={{ color: COLORS.text.muted }} className="text-xs mb-2 text-center">
                  Ou ajouter manuellement
                </Text>
                <View className="flex-row mb-2">
                  <TextInput
                    value={newItemName}
                    onChangeText={setNewItemName}
                    placeholder="Nom du produit"
                    placeholderTextColor={COLORS.text.muted}
                    className="flex-1 rounded-lg px-3 py-2 mr-2"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      color: COLORS.text.cream,
                    }}
                  />
                </View>
                <View className="flex-row mb-2">
                  <TextInput
                    value={newItemQuantity}
                    onChangeText={setNewItemQuantity}
                    placeholder="Quantité (ex: 5g)"
                    placeholderTextColor={COLORS.text.muted}
                    className="flex-1 rounded-lg px-3 py-2 mr-2"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      color: COLORS.text.cream,
                    }}
                  />
                  <TextInput
                    value={newItemValue}
                    onChangeText={setNewItemValue}
                    placeholder="Valeur €"
                    placeholderTextColor={COLORS.text.muted}
                    keyboardType="decimal-pad"
                    className="w-24 rounded-lg px-3 py-2"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      color: COLORS.text.cream,
                    }}
                  />
                </View>

                {/* Images du produit (jusqu'à 3) */}
                <View className="mb-3">
                  <Text style={{ color: COLORS.text.muted }} className="text-xs mb-2">
                    Images ({newItemImages.length}/3)
                  </Text>

                  {/* Images prévisualisées */}
                  {newItemImages.length > 0 && (
                    <View className="flex-row mb-2">
                      {newItemImages.map((img, idx) => (
                        <View key={idx} className="relative mr-2">
                          <Image
                            source={{ uri: img }}
                            className="w-16 h-16 rounded-lg"
                            resizeMode="cover"
                          />
                          <Pressable
                            onPress={() => removeItemImage(idx)}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center"
                            style={{ backgroundColor: COLORS.accent.red }}
                          >
                            <X size={12} color={COLORS.text.white} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Boutons d'ajout d'images */}
                  {newItemImages.length < 3 && (
                    <View className="flex-row">
                      <Pressable
                        onPress={pickItemImage}
                        className="flex-1 py-2 rounded-lg mr-2 flex-row items-center justify-center"
                        style={{ backgroundColor: `${COLORS.primary.paleGold}20` }}
                      >
                        <ImagePlus size={16} color={COLORS.primary.paleGold} />
                        <Text style={{ color: COLORS.primary.paleGold }} className="text-xs ml-1">
                          Galerie
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={takeItemPhoto}
                        className="flex-1 py-2 rounded-lg flex-row items-center justify-center"
                        style={{ backgroundColor: `${COLORS.primary.paleGold}20` }}
                      >
                        <Camera size={16} color={COLORS.primary.paleGold} />
                        <Text style={{ color: COLORS.primary.paleGold }} className="text-xs ml-1">
                          Photo
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                <Pressable
                  onPress={addItem}
                  className="flex-row items-center justify-center py-2 rounded-lg"
                  style={{ backgroundColor: `${COLORS.accent.hemp}30` }}
                >
                  <Plus size={18} color={COLORS.accent.hemp} />
                  <Text style={{ color: COLORS.accent.hemp }} className="font-semibold ml-1">
                    Ajouter
                  </Text>
                </Pressable>
              </View>

              {/* Total value */}
              {formData.items.length > 0 && (
                <View className="flex-row justify-between mt-2 px-2">
                  <Text style={{ color: COLORS.text.muted }}>Valeur totale:</Text>
                  <Text style={{ color: COLORS.primary.paleGold }} className="font-bold">
                    {calculateTotalValue()}€
                  </Text>
                </View>
              )}
            </View>

            {/* Image Picker */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">
                Image du pack
              </Text>

              {/* Asset Images Picker Button */}
              <Pressable
                onPress={() => setShowAssetPicker(true)}
                className="py-4 rounded-xl mb-3 flex-row items-center justify-center"
                style={{
                  backgroundColor: `${COLORS.accent.teal}15`,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.accent.teal}40`,
                }}
              >
                <ImagePlus size={20} color={COLORS.accent.teal} />
                <Text style={{ color: COLORS.accent.teal }} className="ml-2 font-semibold">
                  Choisir une image uploadée ({ALL_ASSET_IDS.length} disponibles)
                </Text>
              </Pressable>

              {/* URL Input */}
              <View className="mb-3">
                <Text style={{ color: COLORS.text.muted }} className="text-xs mb-1">
                  Ou entrer une URL d'image
                </Text>
                <TextInput
                  value={formData.image.startsWith('asset:') ? '' : formData.image}
                  onChangeText={(v) => updateForm('image', v)}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor={COLORS.text.muted}
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: COLORS.background.charcoal,
                    borderWidth: 1.5,
                    borderColor: `${COLORS.primary.gold}25`,
                    color: COLORS.text.cream,
                  }}
                />
              </View>

              {formData.image ? (
                <View className="mb-3 relative">
                  <View
                    className="rounded-xl overflow-hidden"
                    style={{ borderWidth: 2, borderColor: `${COLORS.primary.gold}40` }}
                  >
                    <Image
                      source={getImageSource(formData.image)}
                      className="w-full h-40"
                      resizeMode="cover"
                    />
                  </View>
                  <Pressable
                    onPress={() => updateForm('image', '')}
                    className="absolute top-2 right-2 rounded-full p-2"
                    style={{ backgroundColor: COLORS.accent.red }}
                  >
                    <Trash2 size={16} color={COLORS.text.white} />
                  </Pressable>
                  {formData.image.startsWith('asset:') && (
                    <View
                      className="absolute bottom-2 left-2 px-2 py-1 rounded-full"
                      style={{ backgroundColor: COLORS.accent.teal }}
                    >
                      <Text style={{ color: COLORS.text.white }} className="text-xs font-bold">
                        Image partagée
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}

              <Text style={{ color: COLORS.text.muted }} className="text-xs mb-2 text-center">
                Ou sélectionner depuis l'appareil (local uniquement)
              </Text>

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
            </View>

            {/* Active toggle */}
            <Pressable
              onPress={() => updateForm('active', !formData.active)}
              className="flex-row items-center justify-between p-4 rounded-xl mb-4"
              style={{
                backgroundColor: formData.active ? `${COLORS.accent.hemp}20` : COLORS.background.charcoal,
                borderWidth: 1.5,
                borderColor: formData.active ? COLORS.accent.hemp : `${COLORS.primary.gold}25`,
              }}
            >
              <Text style={{ color: COLORS.text.cream }} className="font-medium">
                Pack actif (visible en boutique)
              </Text>
              <View
                className="w-12 h-7 rounded-full justify-center px-1"
                style={{ backgroundColor: formData.active ? COLORS.accent.hemp : COLORS.text.muted }}
              >
                <View
                  className="w-5 h-5 rounded-full"
                  style={{
                    backgroundColor: COLORS.text.white,
                    alignSelf: formData.active ? 'flex-end' : 'flex-start',
                  }}
                />
              </View>
            </Pressable>
          </View>
          <View className="h-32" />
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
              backgroundColor: canSave && !isUploading ? COLORS.primary.orange : `${COLORS.primary.orange}40`,
              shadowColor: canSave && !isUploading ? COLORS.primary.orange : 'transparent',
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
                  {editingPack ? 'Enregistrer' : 'Créer le pack'}
                </Text>
                <Sparkles size={16} color={COLORS.primary.brightYellow} style={{ marginLeft: 8 }} />
              </>
            )}
          </Pressable>
        </View>

        {/* Image Cropper Modal - inside main modal to fix z-index */}
        <ImageCropper
          visible={showCropper}
          imageUri={imageToCrop}
          aspectRatio={cropAspectRatio}
          onCrop={handleCroppedImage}
          onCancel={() => {
            setShowCropper(false);
            setImageToCrop('');
          }}
        />
      </View>
    </Modal>
  );
};
