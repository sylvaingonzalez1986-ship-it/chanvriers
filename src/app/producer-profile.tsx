/**
 * Producer Profile Page - Permet aux producteurs de créer/modifier leur fiche
 * Cette fiche sera automatiquement ajoutée à la liste des producteurs
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  User,
  MapPin,
  FileText,
  Image as ImageIcon,
  Leaf,
  Thermometer,
  Droplets,
  Check,
  AlertCircle,
  Save,
  Building2,
  Mail,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Globe,
  Share2,
} from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { useAuth } from '@/lib/useAuth';
import { useProducerStore } from '@/lib/store';
import { Producer } from '@/lib/producers';
import { syncProducerToSupabase, isSupabaseSyncConfigured } from '@/lib/supabase-sync';
import { ProducerPhotoManager } from '@/components/ProducerPhotoManager';
import {
  CultureTypeIcons,
  OutdoorIcon,
  GreenhouseIcon,
  IndoorIcon,
  CULTURE_TYPE_LABELS,
} from '@/components/CultureTypeIcons';
import * as Haptics from 'expo-haptics';

export default function ProducerProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, isAuthenticated } = useAuth();
  const { producers, addProducer, updateProducer } = useProducerStore();

  // Find existing producer profile linked to this user
  // Check by profileId (Supabase link), or by id matching profile.id, or by name matching company_name
  const existingProducer = producers.find(
    (p) => p.profileId === profile?.id || p.id === profile?.id || p.name === profile?.company_name
  );

  // Debug log
  React.useEffect(() => {
    console.log('[ProducerProfile] Looking for producer with profile.id:', profile?.id);
    console.log('[ProducerProfile] Found producer:', existingProducer?.id, existingProducer?.name, 'profileId:', existingProducer?.profileId);
    console.log('[ProducerProfile] Total producers in store:', producers.length);
  }, [profile?.id, existingProducer, producers.length]);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [region, setRegion] = useState('');
  const [department, setDepartment] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [soilType, setSoilType] = useState('');
  const [soilPh, setSoilPh] = useState('');
  const [soilCharacteristics, setSoilCharacteristics] = useState('');
  const [climateType, setClimateType] = useState('');
  const [avgTemp, setAvgTemp] = useState('');
  const [rainfall, setRainfall] = useState('');

  // Culture types
  const [cultureOutdoor, setCultureOutdoor] = useState(false);
  const [cultureGreenhouse, setCultureGreenhouse] = useState(false);
  const [cultureIndoor, setCultureIndoor] = useState(false);

  // Social links
  const [instagramUrl, setInstagramUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load existing producer data
  useEffect(() => {
    if (existingProducer) {
      setName(existingProducer.name);
      setEmail(existingProducer.email || '');
      setRegion(existingProducer.region);
      setDepartment(existingProducer.department);
      setCity(existingProducer.city);
      setDescription(existingProducer.description);
      setImage(existingProducer.image);
      setLatitude(existingProducer.coordinates.latitude.toString());
      setLongitude(existingProducer.coordinates.longitude.toString());
      setSoilType(existingProducer.soil.type);
      setSoilPh(existingProducer.soil.ph);
      setSoilCharacteristics(existingProducer.soil.characteristics);
      setClimateType(existingProducer.climate.type);
      setAvgTemp(existingProducer.climate.avgTemp);
      setRainfall(existingProducer.climate.rainfall);
      setCultureOutdoor(existingProducer.cultureOutdoor ?? false);
      setCultureGreenhouse(existingProducer.cultureGreenhouse ?? false);
      setCultureIndoor(existingProducer.cultureIndoor ?? false);
      // Social links
      setInstagramUrl(existingProducer.socialLinks?.instagram ?? '');
      setFacebookUrl(existingProducer.socialLinks?.facebook ?? '');
      setTwitterUrl(existingProducer.socialLinks?.twitter ?? '');
      setTiktokUrl(existingProducer.socialLinks?.tiktok ?? '');
      setYoutubeUrl(existingProducer.socialLinks?.youtube ?? '');
      setWebsiteUrl(existingProducer.socialLinks?.website ?? '');
    } else if (profile) {
      // Pre-fill with profile data
      setName(profile.company_name || '');
      setEmail(profile.email || '');
      setCity(profile.city || '');
    }
  }, [existingProducer, profile]);

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Nom requis';
    if (!region.trim()) newErrors.region = 'Région requise';
    if (!department.trim()) newErrors.department = 'Département requis';
    if (!city.trim()) newErrors.city = 'Ville requise';
    if (!description.trim()) newErrors.description = 'Description requise';

    if (latitude && isNaN(parseFloat(latitude))) {
      newErrors.latitude = 'Latitude invalide';
    }
    if (longitude && isNaN(parseFloat(longitude))) {
      newErrors.longitude = 'Longitude invalide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) return;

    setIsSaving(true);

    try {
      const producerData: Producer = {
        id: existingProducer?.id || profile?.id || `producer-${Date.now()}`,
        name: name.trim(),
        profileId: profile?.id, // Lien vers le profil utilisateur pour retrouver la fiche
        email: email.trim() || undefined,
        region: region.trim(),
        department: department.trim(),
        city: city.trim(),
        image: image.trim() || 'https://images.unsplash.com/photo-1589244159943-460088ed5c92?w=800',
        description: description.trim(),
        coordinates: {
          latitude: parseFloat(latitude) || 48.8566,
          longitude: parseFloat(longitude) || 2.3522,
        },
        soil: {
          type: soilType.trim() || 'Non spécifié',
          ph: soilPh.trim() || 'Non spécifié',
          characteristics: soilCharacteristics.trim() || 'Non spécifié',
        },
        climate: {
          type: climateType.trim() || 'Non spécifié',
          avgTemp: avgTemp.trim() || 'Non spécifié',
          rainfall: rainfall.trim() || 'Non spécifié',
        },
        products: existingProducer?.products || [],
        cultureOutdoor,
        cultureGreenhouse,
        cultureIndoor,
        socialLinks: {
          instagram: instagramUrl.trim() || undefined,
          facebook: facebookUrl.trim() || undefined,
          twitter: twitterUrl.trim() || undefined,
          tiktok: tiktokUrl.trim() || undefined,
          youtube: youtubeUrl.trim() || undefined,
          website: websiteUrl.trim() || undefined,
        },
      };

      console.log('[ProducerProfile] Saving producer data:', producerData.id, producerData.name, 'profileId:', producerData.profileId);

      // Sync to Supabase FIRST (source of truth)
      if (isSupabaseSyncConfigured()) {
        try {
          console.log('[ProducerProfile] Syncing to Supabase...');
          await syncProducerToSupabase(producerData);
          console.log('[ProducerProfile] Successfully synced to Supabase');
        } catch (error) {
          console.error('[ProducerProfile] Error syncing to Supabase:', error);
          // Show error but continue to save locally
          Alert.alert(
            'Attention',
            'La synchronisation avec le serveur a échoué. Les données sont sauvegardées localement et seront synchronisées plus tard.',
            [{ text: 'OK' }]
          );
        }
      }

      // Then update local store
      if (existingProducer) {
        console.log('[ProducerProfile] Updating existing producer in local store');
        updateProducer(existingProducer.id, producerData);
      } else {
        console.log('[ProducerProfile] Adding new producer to local store');
        addProducer(producerData);
      }

      // Verify the data was saved
      setTimeout(() => {
        const { producers } = useProducerStore.getState();
        const savedProducer = producers.find((p) => p.id === producerData.id);
        if (savedProducer) {
          console.log('[ProducerProfile] Verified: Producer saved in store:', savedProducer.name);
        } else {
          console.error('[ProducerProfile] WARNING: Producer not found in store after save!');
        }
      }, 100);

      setSuccessMessage('Fiche producteur enregistrée !');
      setTimeout(() => {
        setSuccessMessage('');
        router.canGoBack() ? router.back() : router.replace('/(tabs)/ma-boutique');
      }, 1500);
    } catch (error) {
      console.error('[ProducerProfile] Error saving producer profile:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la fiche producteur');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if user is authenticated and is a producer
  if (!isAuthenticated) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.background.dark }}>
        <Text style={{ color: COLORS.text.white }} className="text-lg text-center px-6">
          Vous devez être connecté pour accéder à cette page.
        </Text>
        <Pressable
          onPress={() => router.push('/auth/login')}
          className="mt-4 px-6 py-3 rounded-xl"
          style={{ backgroundColor: COLORS.primary.gold }}
        >
          <Text style={{ color: '#fff' }} className="font-bold">Se connecter</Text>
        </Pressable>
      </View>
    );
  }

  if (profile?.role !== 'producer' && profile?.role !== 'admin') {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.background.dark }}>
        <AlertCircle size={48} color={COLORS.accent.red} />
        <Text style={{ color: COLORS.text.white }} className="text-lg text-center px-6 mt-4">
          Cette page est réservée aux producteurs.
        </Text>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')}
          className="mt-4 px-6 py-3 rounded-xl"
          style={{ backgroundColor: COLORS.primary.gold }}
        >
          <Text style={{ color: '#fff' }} className="font-bold">Retour</Text>
        </Pressable>
      </View>
    );
  }

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    icon: React.ReactNode,
    errorKey: string,
    options?: {
      multiline?: boolean;
      keyboardType?: 'default' | 'numeric' | 'decimal-pad';
    }
  ) => (
    <View className="mb-4">
      <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
        {label}
      </Text>
      <View
        className={`flex-row items-${options?.multiline ? 'start' : 'center'} rounded-xl overflow-hidden`}
        style={{
          backgroundColor: `${COLORS.text.white}05`,
          borderWidth: 1,
          borderColor: errors[errorKey] ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
        }}
      >
        <View className={`px-3 ${options?.multiline ? 'pt-3' : ''}`}>
          {icon}
        </View>
        <TextInput
          value={value}
          onChangeText={(text) => {
            onChangeText(text);
            if (errors[errorKey]) setErrors((e) => ({ ...e, [errorKey]: '' }));
          }}
          placeholder={placeholder}
          placeholderTextColor={COLORS.text.muted}
          multiline={options?.multiline}
          keyboardType={options?.keyboardType}
          className={`flex-1 py-3 pr-3 ${options?.multiline ? 'min-h-[100px]' : ''}`}
          style={{
            color: COLORS.text.white,
            textAlignVertical: options?.multiline ? 'top' : 'center',
          }}
        />
      </View>
      {errors[errorKey] && (
        <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
          {errors[errorKey]}
        </Text>
      )}
    </View>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background.dark, paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
      >
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/ma-boutique')}
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: `${COLORS.text.white}10` }}
        >
          <ArrowLeft size={20} color={COLORS.text.white} />
        </Pressable>
        <Text style={{ color: COLORS.text.white }} className="text-xl font-bold flex-1">
          Ma fiche producteur
        </Text>
      </View>

      {/* Success message */}
      {successMessage && (
        <View
          className="mx-4 mt-4 rounded-xl p-3 flex-row items-center"
          style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
        >
          <Check size={20} color={COLORS.accent.hemp} />
          <Text style={{ color: COLORS.accent.hemp }} className="ml-2 font-medium">
            {successMessage}
          </Text>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          <View className="py-4">
            {/* Section: Informations générales */}
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <Building2 size={20} color={COLORS.primary.gold} />
                <Text style={{ color: COLORS.primary.gold }} className="text-base font-bold ml-2">
                  Informations générales
                </Text>
              </View>

              {/* Photo du producteur */}
              <ProducerPhotoManager
                currentImage={image}
                producerId={existingProducer?.id || profile?.id || 'new-producer'}
                onImageUpdate={(newUrl) => setImage(newUrl)}
              />

              {renderInput(
                'Nom de l\'exploitation *',
                name,
                setName,
                'Ma Ferme CBD',
                <User size={18} color={COLORS.text.muted} />,
                'name'
              )}

              {renderInput(
                'Email de contact (pour commandes pros)',
                email,
                setEmail,
                'contact@maferme.fr',
                <Mail size={18} color={COLORS.text.muted} />,
                'email'
              )}

              {renderInput(
                'Description *',
                description,
                setDescription,
                'Décrivez votre exploitation, vos méthodes de culture...',
                <FileText size={18} color={COLORS.text.muted} />,
                'description',
                { multiline: true }
              )}
            </View>

            {/* Section: Localisation */}
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <MapPin size={20} color={COLORS.accent.teal} />
                <Text style={{ color: COLORS.accent.teal }} className="text-base font-bold ml-2">
                  Localisation
                </Text>
              </View>

              {renderInput(
                'Région *',
                region,
                setRegion,
                'Bretagne',
                <MapPin size={18} color={COLORS.text.muted} />,
                'region'
              )}

              {renderInput(
                'Département *',
                department,
                setDepartment,
                'Finistère',
                <MapPin size={18} color={COLORS.text.muted} />,
                'department'
              )}

              {renderInput(
                'Ville *',
                city,
                setCity,
                'Quimper',
                <MapPin size={18} color={COLORS.text.muted} />,
                'city'
              )}

              <View className="flex-row" style={{ gap: 12 }}>
                <View className="flex-1">
                  {renderInput(
                    'Latitude',
                    latitude,
                    setLatitude,
                    '48.0000',
                    <MapPin size={18} color={COLORS.text.muted} />,
                    'latitude',
                    { keyboardType: 'decimal-pad' }
                  )}
                </View>
                <View className="flex-1">
                  {renderInput(
                    'Longitude',
                    longitude,
                    setLongitude,
                    '-4.0000',
                    <MapPin size={18} color={COLORS.text.muted} />,
                    'longitude',
                    { keyboardType: 'decimal-pad' }
                  )}
                </View>
              </View>
            </View>

            {/* Section: Terroir - Sol */}
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <Leaf size={20} color={COLORS.accent.hemp} />
                <Text style={{ color: COLORS.accent.hemp }} className="text-base font-bold ml-2">
                  Caractéristiques du sol
                </Text>
              </View>

              {renderInput(
                'Type de sol',
                soilType,
                setSoilType,
                'Argilo-limoneux',
                <Leaf size={18} color={COLORS.text.muted} />,
                'soilType'
              )}

              {renderInput(
                'pH du sol',
                soilPh,
                setSoilPh,
                '6.5 - 7.0',
                <Leaf size={18} color={COLORS.text.muted} />,
                'soilPh'
              )}

              {renderInput(
                'Caractéristiques',
                soilCharacteristics,
                setSoilCharacteristics,
                'Sol riche en matière organique...',
                <Leaf size={18} color={COLORS.text.muted} />,
                'soilCharacteristics',
                { multiline: true }
              )}
            </View>

            {/* Section: Terroir - Climat */}
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <Thermometer size={20} color={COLORS.accent.sky} />
                <Text style={{ color: COLORS.accent.sky }} className="text-base font-bold ml-2">
                  Climat
                </Text>
              </View>

              {renderInput(
                'Type de climat',
                climateType,
                setClimateType,
                'Océanique tempéré',
                <Thermometer size={18} color={COLORS.text.muted} />,
                'climateType'
              )}

              {renderInput(
                'Température moyenne',
                avgTemp,
                setAvgTemp,
                '12°C',
                <Thermometer size={18} color={COLORS.text.muted} />,
                'avgTemp'
              )}

              {renderInput(
                'Pluviométrie',
                rainfall,
                setRainfall,
                '1200mm/an',
                <Droplets size={18} color={COLORS.text.muted} />,
                'rainfall'
              )}
            </View>

            {/* Section: Types de culture */}
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <Leaf size={20} color="#FFD700" />
                <Text style={{ color: '#FFD700' }} className="text-base font-bold ml-2">
                  Types de culture
                </Text>
              </View>

              {/* Preview des icônes sélectionnées */}
              {(cultureOutdoor || cultureGreenhouse || cultureIndoor) && (
                <View className="flex-row items-center justify-center mb-4 py-3 rounded-xl"
                  style={{ backgroundColor: `${COLORS.text.white}05` }}
                >
                  <CultureTypeIcons
                    outdoor={cultureOutdoor}
                    greenhouse={cultureGreenhouse}
                    indoor={cultureIndoor}
                    size={24}
                    animated={true}
                  />
                </View>
              )}

              {/* Checkbox Outdoor */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCultureOutdoor(!cultureOutdoor);
                }}
                className="flex-row items-center p-3 rounded-xl mb-3"
                style={{
                  backgroundColor: cultureOutdoor ? '#FFD70015' : `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: cultureOutdoor ? '#FFD700' : `${COLORS.primary.paleGold}20`,
                }}
              >
                <View
                  className="w-6 h-6 rounded-md items-center justify-center mr-3"
                  style={{
                    backgroundColor: cultureOutdoor ? '#FFD700' : 'transparent',
                    borderWidth: cultureOutdoor ? 0 : 2,
                    borderColor: `${COLORS.text.muted}50`,
                  }}
                >
                  {cultureOutdoor && <Check size={16} color="#1a1d2e" />}
                </View>
                <View className="mr-3">
                  <OutdoorIcon size={20} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: COLORS.text.white }} className="font-medium">
                    {CULTURE_TYPE_LABELS.outdoor}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs">
                    Culture en plein champ, sous le soleil naturel
                  </Text>
                </View>
              </Pressable>

              {/* Checkbox Greenhouse */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCultureGreenhouse(!cultureGreenhouse);
                }}
                className="flex-row items-center p-3 rounded-xl mb-3"
                style={{
                  backgroundColor: cultureGreenhouse ? '#10B98115' : `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: cultureGreenhouse ? '#10B981' : `${COLORS.primary.paleGold}20`,
                }}
              >
                <View
                  className="w-6 h-6 rounded-md items-center justify-center mr-3"
                  style={{
                    backgroundColor: cultureGreenhouse ? '#10B981' : 'transparent',
                    borderWidth: cultureGreenhouse ? 0 : 2,
                    borderColor: `${COLORS.text.muted}50`,
                  }}
                >
                  {cultureGreenhouse && <Check size={16} color="#1a1d2e" />}
                </View>
                <View className="mr-3">
                  <GreenhouseIcon size={20} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: COLORS.text.white }} className="font-medium">
                    {CULTURE_TYPE_LABELS.greenhouse}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs">
                    Culture sous serre, environnement contrôlé
                  </Text>
                </View>
              </Pressable>

              {/* Checkbox Indoor */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCultureIndoor(!cultureIndoor);
                }}
                className="flex-row items-center p-3 rounded-xl mb-3"
                style={{
                  backgroundColor: cultureIndoor ? '#3B82F615' : `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: cultureIndoor ? '#3B82F6' : `${COLORS.primary.paleGold}20`,
                }}
              >
                <View
                  className="w-6 h-6 rounded-md items-center justify-center mr-3"
                  style={{
                    backgroundColor: cultureIndoor ? '#3B82F6' : 'transparent',
                    borderWidth: cultureIndoor ? 0 : 2,
                    borderColor: `${COLORS.text.muted}50`,
                  }}
                >
                  {cultureIndoor && <Check size={16} color="#fff" />}
                </View>
                <View className="mr-3">
                  <IndoorIcon size={20} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: COLORS.text.white }} className="font-medium">
                    {CULTURE_TYPE_LABELS.indoor}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs">
                    Culture intérieure avec éclairage artificiel
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* Section: Réseaux sociaux */}
            <View className="mb-6">
              <View className="flex-row items-center mb-4">
                <Share2 size={20} color="#E1306C" />
                <Text style={{ color: '#E1306C' }} className="text-base font-bold ml-2">
                  Réseaux sociaux
                </Text>
              </View>

              <Text style={{ color: COLORS.text.muted }} className="text-xs mb-4">
                Ajoutez vos liens pour que les clients puissent vous suivre
              </Text>

              {/* Instagram */}
              <View className="mb-3">
                <View
                  className="flex-row items-center rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: instagramUrl ? '#E1306C50' : `${COLORS.primary.paleGold}20`,
                  }}
                >
                  <View className="px-3" style={{ backgroundColor: instagramUrl ? '#E1306C15' : 'transparent' }}>
                    <Instagram size={18} color={instagramUrl ? '#E1306C' : COLORS.text.muted} />
                  </View>
                  <TextInput
                    value={instagramUrl}
                    onChangeText={setInstagramUrl}
                    placeholder="https://instagram.com/votre-compte"
                    placeholderTextColor={COLORS.text.muted}
                    className="flex-1 py-3 pr-3"
                    style={{ color: COLORS.text.white }}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>

              {/* Facebook */}
              <View className="mb-3">
                <View
                  className="flex-row items-center rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: facebookUrl ? '#1877F250' : `${COLORS.primary.paleGold}20`,
                  }}
                >
                  <View className="px-3" style={{ backgroundColor: facebookUrl ? '#1877F215' : 'transparent' }}>
                    <Facebook size={18} color={facebookUrl ? '#1877F2' : COLORS.text.muted} />
                  </View>
                  <TextInput
                    value={facebookUrl}
                    onChangeText={setFacebookUrl}
                    placeholder="https://facebook.com/votre-page"
                    placeholderTextColor={COLORS.text.muted}
                    className="flex-1 py-3 pr-3"
                    style={{ color: COLORS.text.white }}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>

              {/* Twitter/X */}
              <View className="mb-3">
                <View
                  className="flex-row items-center rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: twitterUrl ? '#1DA1F250' : `${COLORS.primary.paleGold}20`,
                  }}
                >
                  <View className="px-3" style={{ backgroundColor: twitterUrl ? '#1DA1F215' : 'transparent' }}>
                    <Twitter size={18} color={twitterUrl ? '#1DA1F2' : COLORS.text.muted} />
                  </View>
                  <TextInput
                    value={twitterUrl}
                    onChangeText={setTwitterUrl}
                    placeholder="https://x.com/votre-compte"
                    placeholderTextColor={COLORS.text.muted}
                    className="flex-1 py-3 pr-3"
                    style={{ color: COLORS.text.white }}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>

              {/* TikTok */}
              <View className="mb-3">
                <View
                  className="flex-row items-center rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: tiktokUrl ? '#00000050' : `${COLORS.primary.paleGold}20`,
                  }}
                >
                  <View className="px-3" style={{ backgroundColor: tiktokUrl ? '#00000015' : 'transparent' }}>
                    <Text style={{ color: tiktokUrl ? '#FFFFFF' : COLORS.text.muted, fontSize: 14, fontWeight: 'bold' }}>TT</Text>
                  </View>
                  <TextInput
                    value={tiktokUrl}
                    onChangeText={setTiktokUrl}
                    placeholder="https://tiktok.com/@votre-compte"
                    placeholderTextColor={COLORS.text.muted}
                    className="flex-1 py-3 pr-3"
                    style={{ color: COLORS.text.white }}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>

              {/* YouTube */}
              <View className="mb-3">
                <View
                  className="flex-row items-center rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: youtubeUrl ? '#FF000050' : `${COLORS.primary.paleGold}20`,
                  }}
                >
                  <View className="px-3" style={{ backgroundColor: youtubeUrl ? '#FF000015' : 'transparent' }}>
                    <Youtube size={18} color={youtubeUrl ? '#FF0000' : COLORS.text.muted} />
                  </View>
                  <TextInput
                    value={youtubeUrl}
                    onChangeText={setYoutubeUrl}
                    placeholder="https://youtube.com/@votre-chaine"
                    placeholderTextColor={COLORS.text.muted}
                    className="flex-1 py-3 pr-3"
                    style={{ color: COLORS.text.white }}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>

              {/* Website */}
              <View className="mb-3">
                <View
                  className="flex-row items-center rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: websiteUrl ? `${COLORS.primary.gold}50` : `${COLORS.primary.paleGold}20`,
                  }}
                >
                  <View className="px-3" style={{ backgroundColor: websiteUrl ? `${COLORS.primary.gold}15` : 'transparent' }}>
                    <Globe size={18} color={websiteUrl ? COLORS.primary.gold : COLORS.text.muted} />
                  </View>
                  <TextInput
                    value={websiteUrl}
                    onChangeText={setWebsiteUrl}
                    placeholder="https://votre-site.com"
                    placeholderTextColor={COLORS.text.muted}
                    className="flex-1 py-3 pr-3"
                    style={{ color: COLORS.text.white }}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                </View>
              </View>
            </View>

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              className="rounded-xl py-4 flex-row items-center justify-center mb-8"
              style={{
                backgroundColor: COLORS.primary.gold,
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Save size={20} color="#fff" />
                  <Text style={{ color: '#fff' }} className="font-bold text-base ml-2">
                    {existingProducer ? 'Mettre à jour' : 'Créer ma fiche'}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
