import React, { useState } from 'react';
import { View, ScrollView, Pressable, Modal, Dimensions, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Check, ChevronDown, ImagePlus, Camera, Images, RefreshCw } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { FranceMap } from './FranceMap';
import { Producer } from '@/lib/producers';
import { useProducerStore, useOptionsStore } from '@/lib/store';
import { COLORS } from '@/lib/colors';
import { ASSET_IMAGES, ALL_ASSET_IDS, getImageSource, IMAGE_ASSET_IDS, BACKGROUND_ASSET_IDS, ICON_ASSET_IDS } from '@/lib/asset-images';
import { syncProducerToSupabase, isSupabaseSyncConfigured } from '@/lib/supabase-sync';
import { processImageForSync } from '@/lib/image-upload';
import { ImageCropper } from './ImageCropper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH - 80;
// L'image est carrée (1:1), donc la hauteur = largeur
const MAP_HEIGHT = MAP_WIDTH;

interface AddProducerModalProps {
  visible: boolean;
  onClose: () => void;
  editingProducer?: Producer | null;
}

interface FormData {
  name: string;
  region: string;
  department: string;
  city: string;
  description: string;
  image: string;
  mapPosition: { x: number; y: number };
  soilType: string;
  soilPh: string;
  soilCharacteristics: string;
  climateType: string;
  avgTemp: string;
  rainfall: string;
}

const initialFormData: FormData = {
  name: '',
  region: '',
  department: '',
  city: '',
  description: '',
  image: '',
  mapPosition: { x: 50, y: 50 },
  soilType: '',
  soilPh: '',
  soilCharacteristics: '',
  climateType: '',
  avgTemp: '',
  rainfall: '',
};

const InputField = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
}) => (
  <View className="mb-4">
    <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.text.muted}
      multiline={multiline}
      className={`rounded-xl px-4 py-3 ${multiline ? 'min-h-[80px]' : ''}`}
      style={{
        backgroundColor: `${COLORS.text.white}05`,
        borderWidth: 1,
        borderColor: `${COLORS.primary.paleGold}20`,
        color: COLORS.text.white,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
    />
  </View>
);

const SelectField = ({
  label,
  value,
  options,
  onSelect,
  placeholder,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder: string;
}) => {
  const [showOptions, setShowOptions] = useState(false);

  return (
    <View className="mb-4">
      <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">{label}</Text>
      <Pressable
        onPress={() => setShowOptions(!showOptions)}
        className="rounded-xl px-4 py-3 flex-row items-center justify-between"
        style={{
          backgroundColor: `${COLORS.text.white}05`,
          borderWidth: 1,
          borderColor: `${COLORS.primary.paleGold}20`,
        }}
      >
        <Text style={{ color: value ? COLORS.text.white : COLORS.text.muted }}>
          {value || placeholder}
        </Text>
        <ChevronDown size={20} color={COLORS.text.muted} />
      </Pressable>
      {showOptions && (
        <View
          className="rounded-xl mt-2 max-h-40"
          style={{
            backgroundColor: COLORS.background.charcoal,
            borderWidth: 1,
            borderColor: `${COLORS.primary.paleGold}20`,
          }}
        >
          <ScrollView nestedScrollEnabled>
            {options.map((option) => (
              <Pressable
                key={option}
                onPress={() => {
                  onSelect(option);
                  setShowOptions(false);
                }}
                className="px-4 py-3 active:opacity-70"
                style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.text.white}05` }}
              >
                <Text style={{ color: COLORS.text.white }}>{option}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const MapPositionPicker = ({
  coordinates,
  onSelect,
}: {
  coordinates: { x: number; y: number };
  onSelect: (coords: { x: number; y: number }) => void;
}) => {
  const handlePress = (event: { nativeEvent: { locationX: number; locationY: number } }) => {
    const { locationX, locationY } = event.nativeEvent;
    const x = Math.round((locationX / MAP_WIDTH) * 100);
    const y = Math.round((locationY / MAP_HEIGHT) * 100);
    onSelect({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  return (
    <View className="mb-4">
      <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
        Position sur la carte (appuyez pour placer)
      </Text>
      <View className="items-center">
        <Pressable onPress={handlePress}>
          <View style={{ width: MAP_WIDTH, height: MAP_HEIGHT, position: 'relative' }}>
            <FranceMap width={MAP_WIDTH} height={MAP_HEIGHT} />
            <View
              style={{
                position: 'absolute',
                left: (coordinates.x / 100) * MAP_WIDTH - 15,
                top: (coordinates.y / 100) * MAP_HEIGHT - 30,
              }}
            >
              <View className="rounded-full p-1.5" style={{ backgroundColor: COLORS.primary.brightYellow }}>
                <MapPin size={18} color={COLORS.background.dark} fill={COLORS.background.dark} />
              </View>
              <View
                className="w-0 h-0 self-center"
                style={{
                  borderLeftWidth: 6,
                  borderRightWidth: 6,
                  borderTopWidth: 6,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: COLORS.primary.brightYellow,
                  marginTop: -2,
                }}
              />
            </View>
          </View>
        </Pressable>
        <Text style={{ color: COLORS.text.muted }} className="text-xs mt-2">
          Position: {coordinates.x}%, {coordinates.y}%
        </Text>
      </View>
    </View>
  );
};

export const AddProducerModal = ({ visible, onClose, editingProducer }: AddProducerModalProps) => {
  const insets = useSafeAreaInsets();
  const addProducer = useProducerStore((s) => s.addProducer);
  const updateProducer = useProducerStore((s) => s.updateProducer);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [step, setStep] = useState(1);
  const [showAssetPicker, setShowAssetPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageSearch, setImageSearch] = useState('');
  const [imageCategory, setImageCategory] = useState<'all' | 'image' | 'background' | 'icon' | 'other'>('all');

  // Image cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState('');

  const regions = useOptionsStore((s) => s.regions);
  const soilTypes = useOptionsStore((s) => s.soilTypes);
  const climateTypes = useOptionsStore((s) => s.climateTypes);

  // Filter images based on search and category
  const filteredAssetIds = ALL_ASSET_IDS.filter(assetId => {
    // Search filter
    const matchesSearch = imageSearch === '' || assetId.toLowerCase().includes(imageSearch.toLowerCase());

    // Category filter
    let matchesCategory = true;
    if (imageCategory === 'image') matchesCategory = assetId.startsWith('image-');
    else if (imageCategory === 'background') matchesCategory = assetId.startsWith('background-');
    else if (imageCategory === 'icon') matchesCategory = assetId.startsWith('icon-');
    else if (imageCategory === 'other') matchesCategory = !assetId.startsWith('image-') && !assetId.startsWith('background-') && !assetId.startsWith('icon-');

    return matchesSearch && matchesCategory;
  });

  // Populate form when editing
  React.useEffect(() => {
    if (visible && editingProducer) {
      setFormData({
        name: editingProducer.name,
        region: editingProducer.region,
        department: editingProducer.department,
        city: editingProducer.city,
        description: editingProducer.description,
        image: editingProducer.image,
        mapPosition: editingProducer.mapPosition ?? { x: 50, y: 50 },
        soilType: editingProducer.soil.type,
        soilPh: editingProducer.soil.ph,
        soilCharacteristics: editingProducer.soil.characteristics,
        climateType: editingProducer.climate.type,
        avgTemp: editingProducer.climate.avgTemp,
        rainfall: editingProducer.climate.rainfall,
      });
      setStep(1);
    } else if (visible) {
      setFormData(initialFormData);
      setStep(1);
    }
  }, [visible, editingProducer]);

  const updateForm = (key: keyof FormData, value: string | { x: number; y: number }) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsUploading(true);

    try {
      const defaultImage = 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400';

      // Upload image to Supabase Storage if it's a local file
      const uploadedImage = await processImageForSync(formData.image || defaultImage, 'producers');

      const producerData: Producer = {
        id: editingProducer?.id || `producer-${Date.now()}`,
        name: formData.name,
        region: formData.region,
        department: formData.department,
        city: formData.city || formData.department,
        description: formData.description,
        image: uploadedImage,
        coordinates: editingProducer?.coordinates || {
          latitude: 46.603354,
          longitude: 1.888334,
        },
        mapPosition: formData.mapPosition,
        soil: {
          type: formData.soilType,
          ph: formData.soilPh,
          characteristics: formData.soilCharacteristics,
        },
        climate: {
          type: formData.climateType,
          avgTemp: formData.avgTemp,
          rainfall: formData.rainfall,
        },
        products: editingProducer?.products || [],
      };

      if (editingProducer) {
        updateProducer(editingProducer.id, producerData);
      } else {
        addProducer(producerData);
      }

      // Sync to Supabase automatically
      if (isSupabaseSyncConfigured()) {
        try {
          await syncProducerToSupabase(producerData);
          console.log('[AddProducerModal] Producer synced to Supabase');
        } catch (error) {
          console.error('[AddProducerModal] Failed to sync to Supabase:', error);
        }
      }

      setFormData(initialFormData);
      setStep(1);
      onClose();
    } catch (error) {
      console.error('Error saving producer:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const canProceedStep1 = formData.name && formData.region && formData.department;
  const canProceedStep2 = formData.soilType && formData.climateType;
  const canSave = canProceedStep1 && canProceedStep2;

  const handleClose = () => {
    setFormData(initialFormData);
    setStep(1);
    onClose();
  };

  if (!visible) return null;

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.background.dark, paddingTop: insets.top }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5 py-4"
          style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
        >
          <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
            {editingProducer ? 'Modifier le producteur' : 'Nouveau producteur'} ({step}/3)
          </Text>
          <Pressable onPress={handleClose} className="p-2">
            <X size={24} color={COLORS.text.white} />
          </Pressable>
        </View>

        {/* Step indicators */}
        <View className="flex-row px-5 py-3">
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              className="flex-1 h-1 rounded-full mx-1"
              style={{ backgroundColor: s <= step ? COLORS.primary.gold : `${COLORS.text.white}20` }}
            />
          ))}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            className="flex-1 px-5"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 1 && (
              <View className="py-4">
                <Text style={{ color: COLORS.primary.paleGold }} className="text-lg font-semibold mb-4">
                  Informations générales
                </Text>
                <InputField
                  label="Nom du producteur *"
                  value={formData.name}
                  onChangeText={(v) => updateForm('name', v)}
                  placeholder="Ex: Ferme du Soleil"
                />
                <SelectField
                  label="Région *"
                  value={formData.region}
                  options={regions}
                  onSelect={(v) => updateForm('region', v)}
                  placeholder="Sélectionnez une région"
                />
                <InputField
                  label="Département *"
                  value={formData.department}
                  onChangeText={(v) => updateForm('department', v)}
                  placeholder="Ex: Vaucluse"
                />
                <InputField
                  label="Ville"
                  value={formData.city}
                  onChangeText={(v) => updateForm('city', v)}
                  placeholder="Ex: Avignon"
                />
                <InputField
                  label="Description"
                  value={formData.description}
                  onChangeText={(v) => updateForm('description', v)}
                  placeholder="Décrivez l'exploitation..."
                  multiline
                />

                {/* Image Picker */}
                <View className="mb-4">
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                    Photo du producteur
                  </Text>

                  {/* Asset Images Picker Button */}
                  <Pressable
                    onPress={() => setShowAssetPicker(true)}
                    className="rounded-xl py-4 mb-3 flex-row items-center justify-center"
                    style={{
                      backgroundColor: `${COLORS.accent.hemp}20`,
                      borderWidth: 1,
                      borderColor: `${COLORS.accent.hemp}40`,
                    }}
                  >
                    <Images size={20} color={COLORS.accent.hemp} />
                    <Text style={{ color: COLORS.accent.hemp }} className="ml-2 font-semibold">
                      Choisir une image (recommandé)
                    </Text>
                  </Pressable>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs mb-3 text-center">
                    Ces images seront visibles par tous les utilisateurs
                  </Text>

                  {/* Asset Picker Modal */}
                  <Modal
                    visible={showAssetPicker}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => {
                      setShowAssetPicker(false);
                      setImageSearch('');
                      setImageCategory('all');
                    }}
                  >
                    <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                      <View
                        className="rounded-t-3xl p-5"
                        style={{ backgroundColor: COLORS.background.dark, maxHeight: '85%' }}
                      >
                        <View className="flex-row items-center justify-between mb-2">
                          <Text style={{ color: COLORS.text.white }} className="text-lg font-bold">
                            Choisir une image
                          </Text>
                          <Pressable onPress={() => {
                            setShowAssetPicker(false);
                            setImageSearch('');
                            setImageCategory('all');
                          }} className="p-2">
                            <X size={24} color={COLORS.text.white} />
                          </Pressable>
                        </View>

                        {/* Search Bar */}
                        <View className="mb-3">
                          <TextInput
                            value={imageSearch}
                            onChangeText={setImageSearch}
                            placeholder="Rechercher une image..."
                            placeholderTextColor={COLORS.text.muted}
                            className="rounded-xl px-4 py-3"
                            style={{
                              backgroundColor: `${COLORS.text.white}10`,
                              borderWidth: 1,
                              borderColor: `${COLORS.primary.paleGold}20`,
                              color: COLORS.text.white,
                            }}
                          />
                        </View>

                        {/* Category Filter */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" style={{ flexGrow: 0 }}>
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
                                    ? COLORS.primary.gold
                                    : `${COLORS.text.white}10`,
                                }}
                              >
                                <Text
                                  style={{
                                    color: imageCategory === cat.key ? COLORS.background.dark : COLORS.text.white,
                                  }}
                                  className="text-sm font-medium"
                                >
                                  {cat.label}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </ScrollView>

                        {/* Results count */}
                        <View className="mb-2 py-2 rounded-xl" style={{ backgroundColor: `${COLORS.accent.sky}15` }}>
                          <Text style={{ color: COLORS.accent.sky }} className="text-xs text-center">
                            {filteredAssetIds.length} / {ALL_ASSET_IDS.length} images
                          </Text>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                          <View className="flex-row flex-wrap justify-between">
                            {filteredAssetIds.map((assetId) => (
                              <Pressable
                                key={assetId}
                                onPress={() => {
                                  updateForm('image', `asset:${assetId}`);
                                  setShowAssetPicker(false);
                                  setImageSearch('');
                                  setImageCategory('all');
                                }}
                                className="mb-3 rounded-xl overflow-hidden"
                                style={{
                                  width: '48%',
                                  borderWidth: formData.image === `asset:${assetId}` ? 3 : 0,
                                  borderColor: COLORS.primary.brightYellow,
                                }}
                              >
                                <Image
                                  source={ASSET_IMAGES[assetId]}
                                  style={{ width: '100%', height: 100 }}
                                  resizeMode="cover"
                                />
                                <View className="p-2" style={{ backgroundColor: `${COLORS.text.white}10` }}>
                                  <Text style={{ color: COLORS.text.white }} className="text-xs text-center" numberOfLines={1}>
                                    {assetId}
                                  </Text>
                                </View>
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
                          <View className="h-10" />
                        </ScrollView>
                      </View>
                    </View>
                  </Modal>

                  {/* Show selected image */}
                  {formData.image ? (
                    <View className="items-center">
                      <Image
                        source={getImageSource(formData.image)}
                        className="w-full h-48 rounded-xl"
                        resizeMode="cover"
                      />
                      <Pressable
                        onPress={() => updateForm('image', '')}
                        className="mt-2 px-4 py-2 rounded-lg"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                      >
                        <Text style={{ color: '#EF4444' }} className="text-sm">Supprimer la photo</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <>
                      {/* URL Input for online images */}
                      <View className="mb-3">
                        <TextInput
                          value={formData.image.startsWith('http') ? formData.image : ''}
                          onChangeText={(url) => updateForm('image', url)}
                          placeholder="Ou collez une URL (https://...)"
                          placeholderTextColor={COLORS.text.muted}
                          className="rounded-xl px-4 py-3"
                          style={{
                            backgroundColor: `${COLORS.text.white}05`,
                            borderWidth: 1,
                            borderColor: `${COLORS.primary.paleGold}20`,
                            color: COLORS.text.white,
                          }}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="url"
                        />
                      </View>

                      <View className="flex-row">
                        <Pressable
                          onPress={async () => {
                            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                            if (status !== 'granted') {
                              return;
                            }
                            const result = await ImagePicker.launchImageLibraryAsync({
                              mediaTypes: ['images'],
                              allowsEditing: false,
                              quality: 0.9,
                            });
                            if (!result.canceled && result.assets[0]) {
                              // Open cropper
                              setImageToCrop(result.assets[0].uri);
                              setShowCropper(true);
                            }
                          }}
                          className="flex-1 py-3 rounded-xl mr-2 flex-row items-center justify-center"
                          style={{
                            backgroundColor: `${COLORS.text.white}05`,
                            borderWidth: 1,
                            borderColor: `${COLORS.primary.paleGold}20`,
                          }}
                        >
                          <ImagePlus size={18} color={COLORS.text.muted} />
                          <Text style={{ color: COLORS.text.muted }} className="ml-2 text-sm">
                            Galerie
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={async () => {
                            const { status } = await ImagePicker.requestCameraPermissionsAsync();
                            if (status !== 'granted') {
                              return;
                            }
                            const result = await ImagePicker.launchCameraAsync({
                              mediaTypes: ['images'],
                              allowsEditing: false,
                              quality: 0.9,
                            });
                            if (!result.canceled && result.assets[0]) {
                              // Open cropper
                              setImageToCrop(result.assets[0].uri);
                              setShowCropper(true);
                            }
                          }}
                          className="flex-1 py-3 rounded-xl flex-row items-center justify-center"
                          style={{
                            backgroundColor: `${COLORS.text.white}05`,
                            borderWidth: 1,
                            borderColor: `${COLORS.primary.paleGold}20`,
                          }}
                        >
                          <Camera size={18} color={COLORS.text.muted} />
                          <Text style={{ color: COLORS.text.muted }} className="ml-2 text-sm">
                            Photo
                          </Text>
                        </Pressable>
                      </View>
                      <Text style={{ color: COLORS.text.muted }} className="text-xs mt-2 text-center">
                        Note: Galerie/Photo = usage local uniquement
                      </Text>
                    </>
                  )}
                </View>
              </View>
            )}

            {step === 2 && (
              <View className="py-4">
                <Text style={{ color: COLORS.primary.paleGold }} className="text-lg font-semibold mb-4">
                  Terroir & Climat
                </Text>
                <SelectField
                  label="Type de sol *"
                  value={formData.soilType}
                  options={soilTypes}
                  onSelect={(v) => updateForm('soilType', v)}
                  placeholder="Sélectionnez un type de sol"
                />
                <InputField
                  label="pH du sol"
                  value={formData.soilPh}
                  onChangeText={(v) => updateForm('soilPh', v)}
                  placeholder="Ex: 6.5 - 7.2"
                />
                <InputField
                  label="Caractéristiques du sol"
                  value={formData.soilCharacteristics}
                  onChangeText={(v) => updateForm('soilCharacteristics', v)}
                  placeholder="Décrivez les caractéristiques..."
                  multiline
                />
                <SelectField
                  label="Type de climat *"
                  value={formData.climateType}
                  options={climateTypes}
                  onSelect={(v) => updateForm('climateType', v)}
                  placeholder="Sélectionnez un climat"
                />
                <InputField
                  label="Température moyenne"
                  value={formData.avgTemp}
                  onChangeText={(v) => updateForm('avgTemp', v)}
                  placeholder="Ex: 12°C annuel"
                />
                <InputField
                  label="Précipitations"
                  value={formData.rainfall}
                  onChangeText={(v) => updateForm('rainfall', v)}
                  placeholder="Ex: 750mm/an"
                />
              </View>
            )}

            {step === 3 && (
              <View className="py-4">
                <Text style={{ color: COLORS.primary.paleGold }} className="text-lg font-semibold mb-4">
                  Position sur la carte
                </Text>
                <MapPositionPicker
                  coordinates={formData.mapPosition}
                  onSelect={(coords) => updateForm('mapPosition', coords)}
                />
                <View
                  className="rounded-xl p-4 mt-4"
                  style={{
                    backgroundColor: `${COLORS.primary.gold}15`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.gold}30`,
                  }}
                >
                  <Text style={{ color: COLORS.text.white }} className="font-semibold mb-2">Récapitulatif</Text>
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm">
                    <Text style={{ color: COLORS.primary.paleGold }}>Nom:</Text> {formData.name}
                  </Text>
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm">
                    <Text style={{ color: COLORS.primary.paleGold }}>Région:</Text> {formData.region}
                  </Text>
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm">
                    <Text style={{ color: COLORS.primary.paleGold }}>Sol:</Text> {formData.soilType}
                  </Text>
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm">
                    <Text style={{ color: COLORS.primary.paleGold }}>Climat:</Text> {formData.climateType}
                  </Text>
                </View>
              </View>
            )}

            <View className="h-8" />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Navigation buttons */}
        <View
          className="flex-row px-5 py-4"
          style={{
            borderTopWidth: 1,
            borderTopColor: `${COLORS.primary.paleGold}15`,
            paddingBottom: insets.bottom + 16,
          }}
        >
          {step > 1 && (
            <Pressable
              onPress={() => setStep(step - 1)}
              className="flex-1 py-4 rounded-xl mr-2"
              style={{ backgroundColor: `${COLORS.text.white}10` }}
            >
              <Text style={{ color: COLORS.text.white }} className="text-center font-semibold">Précédent</Text>
            </Pressable>
          )}
          {step < 3 ? (
            <Pressable
              onPress={() => setStep(step + 1)}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="flex-1 py-4 rounded-xl"
              style={{
                backgroundColor: (step === 1 ? canProceedStep1 : canProceedStep2)
                  ? COLORS.primary.gold
                  : `${COLORS.primary.gold}30`,
              }}
            >
              <Text style={{ color: COLORS.text.white }} className="text-center font-semibold">Suivant</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSave}
              disabled={!canSave || isUploading}
              className="flex-1 py-4 rounded-xl flex-row items-center justify-center"
              style={{
                backgroundColor: canSave && !isUploading ? COLORS.primary.gold : `${COLORS.primary.gold}30`,
              }}
            >
              {isUploading ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.text.white} />
                  <Text style={{ color: COLORS.text.white }} className="text-center font-semibold ml-2">
                    Upload en cours...
                  </Text>
                </>
              ) : (
                <>
                  <Check size={20} color={COLORS.text.white} />
                  <Text style={{ color: COLORS.text.white }} className="text-center font-semibold ml-2">
                    {editingProducer ? 'Enregistrer' : 'Créer le producteur'}
                  </Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </View>
    </Modal>

    {/* Image Cropper Modal */}
    <ImageCropper
      visible={showCropper}
      imageUri={imageToCrop}
      aspectRatio={16/9}
      onCrop={(croppedUri) => {
        updateForm('image', croppedUri);
        setShowCropper(false);
        setImageToCrop('');
      }}
      onCancel={() => {
        setShowCropper(false);
        setImageToCrop('');
      }}
    />
    </>
  );
};
