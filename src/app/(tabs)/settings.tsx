import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Switch,
  Image,
} from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  Bell,
  Trash2,
  Info,
  Check,
  Sparkles,
  Settings,
  ChevronDown,
  ChevronUp,
  Edit3,
  Leaf,
  Store,
  Package,
  FileText,
  Scale,
  Shield,
  Building2,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { COLORS } from '@/lib/colors';
import { useCollectionStore, useCartStore, useProducerStore, useCustomerInfoStore } from '@/lib/store';
import { useAuth, usePermissions } from '@/lib/useAuth';
import { AddProducerModal } from '@/components/AddProducerModal';
import { RGPDSection } from '@/components/RGPDSection';
import { Producer, SAMPLE_PRODUCERS } from '@/lib/producers';
import { getImageSource } from '@/lib/asset-images';

const USER_COORDINATES_KEY = 'user-coordinates';

interface UserCoordinates {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
}

const initialCoordinates: UserCoordinates = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  postalCode: '',
  city: '',
};

const hasCoordinates = (coords: UserCoordinates): boolean => {
  return !!(coords.firstName && coords.lastName && coords.email);
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [coordinates, setCoordinates] = useState<UserCoordinates>(initialCoordinates);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [saved, setSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  // Producer modal state
  const [showProducerModal, setShowProducerModal] = useState(false);
  const [myProducer, setMyProducer] = useState<Producer | null>(null);
  const [legalExpanded, setLegalExpanded] = useState(false);

  const clearCollection = useCollectionStore((s) => s.clearCollection);
  const clearCart = useCartStore((s) => s.clearCart);

  // Customer Info Store (for non-authenticated users)
  const customerInfo = useCustomerInfoStore((s) => s.customerInfo);

  // Auth and permissions
  const { profile, isAuthenticated } = useAuth();
  const { isProducer } = usePermissions();
  const customProducers = useProducerStore((s) => s.producers);

  // Animation values
  const formHeight = useSharedValue(1);
  const rotation = useSharedValue(0);

  // Load and sync coordinates from profile or customerInfo
  useEffect(() => {
    const loadCoordinates = async () => {
      try {
        // Priority 1: Load from Supabase profile if authenticated
        if (isAuthenticated && profile) {
          const syncedCoordinates: UserCoordinates = {
            firstName: profile.first_name || '',
            lastName: profile.last_name || '',
            email: profile.email || '',
            phone: profile.phone || '',
            address: profile.address || '',
            postalCode: profile.postal_code || '',
            city: profile.city || '',
          };
          setCoordinates(syncedCoordinates);

          // Save to AsyncStorage for consistency
          await AsyncStorage.setItem(USER_COORDINATES_KEY, JSON.stringify(syncedCoordinates));

          if (hasCoordinates(syncedCoordinates)) {
            setIsExpanded(false);
            formHeight.value = 0;
            rotation.value = 180;
          }
        }
        // Priority 2: Load from customerInfo store (for non-authenticated users)
        else if (customerInfo.firstName || customerInfo.email) {
          const syncedCoordinates: UserCoordinates = {
            firstName: customerInfo.firstName,
            lastName: customerInfo.lastName,
            email: customerInfo.email,
            phone: customerInfo.phone,
            address: customerInfo.address,
            postalCode: customerInfo.postalCode,
            city: customerInfo.city,
          };
          setCoordinates(syncedCoordinates);

          // Save to AsyncStorage for consistency
          await AsyncStorage.setItem(USER_COORDINATES_KEY, JSON.stringify(syncedCoordinates));

          if (hasCoordinates(syncedCoordinates)) {
            setIsExpanded(false);
            formHeight.value = 0;
            rotation.value = 180;
          }
        }
        // Priority 3: Load from AsyncStorage (fallback)
        else {
          const savedData = await AsyncStorage.getItem(USER_COORDINATES_KEY);
          if (savedData) {
            const parsed = JSON.parse(savedData);
            setCoordinates(parsed);
            if (hasCoordinates(parsed)) {
              setIsExpanded(false);
              formHeight.value = 0;
              rotation.value = 180;
            }
          }
        }
        setHasLoadedData(true);
      } catch (error) {
        console.log('Error loading coordinates:', error);
        setHasLoadedData(true);
      }
    };
    loadCoordinates();
  }, [isAuthenticated, profile, customerInfo]);

  // Find producer associated with this user (by email or name)
  useEffect(() => {
    if (isProducer && profile) {
      // Try to find a producer that matches the user's profile
      const userEmail = profile.email?.toLowerCase();
      const userName = profile.full_name?.toLowerCase();
      const companyName = profile.company_name?.toLowerCase();

      // First check in custom producers
      let foundProducer = customProducers.find((p) => {
        const producerName = p.name.toLowerCase();
        return (
          (companyName && producerName.includes(companyName)) ||
          (userName && producerName.includes(userName))
        );
      });

      // If not found in custom, check in sample producers
      if (!foundProducer) {
        foundProducer = SAMPLE_PRODUCERS.find((p) => {
          const producerName = p.name.toLowerCase();
          return (
            (companyName && producerName.includes(companyName)) ||
            (userName && producerName.includes(userName))
          );
        });
      }

      // If still not found, get the first custom producer (or create one later)
      if (!foundProducer && customProducers.length > 0) {
        // The user might have created a producer already
        foundProducer = customProducers[0];
      }

      setMyProducer(foundProducer || null);
    }
  }, [isProducer, profile, customProducers]);

  const updateField = (field: keyof UserCoordinates, value: string) => {
    setCoordinates((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem(USER_COORDINATES_KEY, JSON.stringify(coordinates));
      setSaved(true);

      // Replier le formulaire après sauvegarde
      setTimeout(() => {
        setSaved(false);
        setIsExpanded(false);
        formHeight.value = withTiming(0, { duration: 400 });
        rotation.value = withSpring(180);
      }, 1000);
    } catch (error) {
      console.log('Error saving coordinates:', error);
    }
  };

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    formHeight.value = withTiming(newExpanded ? 1 : 0, { duration: 400 });
    rotation.value = withSpring(newExpanded ? 0 : 180);
  };

  const handleClearData = () => {
    clearCollection();
    clearCart();
  };

  const isFormValid = coordinates.firstName && coordinates.lastName && coordinates.email;
  const coordinatesSaved = hasCoordinates(coordinates) && !isExpanded;

  const formAnimatedStyle = useAnimatedStyle(() => ({
    height: formHeight.value === 0 ? 0 : 'auto',
    opacity: formHeight.value,
    overflow: 'hidden' as const,
  }));

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!hasLoadedData) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.background.nightSky }}>
        <Text style={{ color: COLORS.text.muted }}>Chargement...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background.nightSky }}>
      {/* Header */}
      <LinearGradient
        colors={[`${COLORS.primary.gold}15`, 'transparent']}
        style={{ paddingTop: insets.top }}
      >
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="flex-row items-center px-5 py-4"
          style={{ borderBottomWidth: 2, borderBottomColor: `${COLORS.primary.gold}30` }}
        >
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')}
            className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
            style={{
              backgroundColor: `${COLORS.primary.gold}20`,
              borderWidth: 1.5,
              borderColor: `${COLORS.primary.gold}40`,
            }}
          >
            <ArrowLeft size={22} color={COLORS.primary.paleGold} />
          </Pressable>
          <View className="flex-row items-center flex-1">
            <Settings size={22} color={COLORS.accent.teal} />
            <Text style={{ color: COLORS.text.cream }} className="text-2xl font-bold ml-2">
              Paramètres
            </Text>
            <Sparkles size={18} color={COLORS.primary.brightYellow} style={{ marginLeft: 8 }} />
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="py-4">
          {/* Coordinates Section */}
          <View className="mb-6">
            {/* Header with toggle */}
            <Pressable
              onPress={coordinatesSaved ? toggleExpanded : undefined}
              className="flex-row items-center justify-between mb-4"
            >
              <View className="flex-row items-center">
                <User size={20} color={COLORS.primary.paleGold} />
                <Text style={{ color: COLORS.primary.paleGold }} className="text-lg font-bold ml-2">
                  Mes coordonnées
                </Text>
              </View>
              {coordinatesSaved && (
                <Animated.View style={chevronAnimatedStyle}>
                  <ChevronDown size={22} color={COLORS.primary.paleGold} />
                </Animated.View>
              )}
            </Pressable>

            {/* Collapsed summary view */}
            {coordinatesSaved && (
              <Pressable
                onPress={toggleExpanded}
                className="p-4 rounded-xl mb-3"
                style={{
                  backgroundColor: COLORS.background.charcoal,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.accent.forest}40`,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text style={{ color: COLORS.text.cream }} className="font-bold text-base">
                      {coordinates.firstName} {coordinates.lastName}
                    </Text>
                    <Text style={{ color: COLORS.text.muted }} className="text-sm mt-1">
                      {coordinates.email}
                    </Text>
                    {coordinates.phone && (
                      <Text style={{ color: COLORS.text.muted }} className="text-sm">
                        {coordinates.phone}
                      </Text>
                    )}
                    {(coordinates.address || coordinates.city) && (
                      <Text style={{ color: COLORS.text.muted }} className="text-sm mt-1">
                        {coordinates.address}{coordinates.address && coordinates.city ? ', ' : ''}{coordinates.postalCode} {coordinates.city}
                      </Text>
                    )}
                  </View>
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: `${COLORS.primary.gold}20` }}
                  >
                    <Edit3 size={18} color={COLORS.primary.paleGold} />
                  </View>
                </View>
                <View className="flex-row items-center mt-3">
                  <Check size={14} color={COLORS.accent.hemp} />
                  <Text style={{ color: COLORS.accent.hemp }} className="text-xs font-medium ml-1">
                    Coordonnées enregistrées
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Expandable form */}
            <Animated.View style={formAnimatedStyle}>
              <Text style={{ color: COLORS.text.muted }} className="text-sm mb-4">
                Ces informations seront utilisées pour l'envoi des liens de paiement et la livraison.
              </Text>

              {/* Name row */}
              <View className="flex-row mb-3">
                <View className="flex-1 mr-2">
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-1.5">
                    Prénom *
                  </Text>
                  <TextInput
                    value={coordinates.firstName}
                    onChangeText={(v) => updateField('firstName', v)}
                    placeholder="Jean"
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
                <View className="flex-1 ml-2">
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-1.5">
                    Nom *
                  </Text>
                  <TextInput
                    value={coordinates.lastName}
                    onChangeText={(v) => updateField('lastName', v)}
                    placeholder="Dupont"
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
              </View>

              {/* Email */}
              <View className="mb-3">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-1.5">
                  Email *
                </Text>
                <View className="flex-row items-center">
                  <View
                    className="w-11 h-11 rounded-l-xl items-center justify-center"
                    style={{ backgroundColor: COLORS.background.charcoal, borderWidth: 1.5, borderRightWidth: 0, borderColor: `${COLORS.primary.gold}25` }}
                  >
                    <Mail size={18} color={COLORS.text.muted} />
                  </View>
                  <TextInput
                    value={coordinates.email}
                    onChangeText={(v) => updateField('email', v)}
                    placeholder="jean.dupont@email.com"
                    placeholderTextColor={COLORS.text.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    className="flex-1 rounded-r-xl px-4 py-3"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderLeftWidth: 0,
                      borderColor: `${COLORS.primary.gold}25`,
                      color: COLORS.text.cream,
                    }}
                  />
                </View>
              </View>

              {/* Phone */}
              <View className="mb-3">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-1.5">
                  Téléphone
                </Text>
                <View className="flex-row items-center">
                  <View
                    className="w-11 h-11 rounded-l-xl items-center justify-center"
                    style={{ backgroundColor: COLORS.background.charcoal, borderWidth: 1.5, borderRightWidth: 0, borderColor: `${COLORS.primary.gold}25` }}
                  >
                    <Phone size={18} color={COLORS.text.muted} />
                  </View>
                  <TextInput
                    value={coordinates.phone}
                    onChangeText={(v) => updateField('phone', v)}
                    placeholder="06 12 34 56 78"
                    placeholderTextColor={COLORS.text.muted}
                    keyboardType="phone-pad"
                    className="flex-1 rounded-r-xl px-4 py-3"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderLeftWidth: 0,
                      borderColor: `${COLORS.primary.gold}25`,
                      color: COLORS.text.cream,
                    }}
                  />
                </View>
              </View>

              {/* Address */}
              <View className="mb-3">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-1.5">
                  Adresse
                </Text>
                <View className="flex-row items-center">
                  <View
                    className="w-11 h-11 rounded-l-xl items-center justify-center"
                    style={{ backgroundColor: COLORS.background.charcoal, borderWidth: 1.5, borderRightWidth: 0, borderColor: `${COLORS.primary.gold}25` }}
                  >
                    <Home size={18} color={COLORS.text.muted} />
                  </View>
                  <TextInput
                    value={coordinates.address}
                    onChangeText={(v) => updateField('address', v)}
                    placeholder="123 rue de la Paix"
                    placeholderTextColor={COLORS.text.muted}
                    className="flex-1 rounded-r-xl px-4 py-3"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderLeftWidth: 0,
                      borderColor: `${COLORS.primary.gold}25`,
                      color: COLORS.text.cream,
                    }}
                  />
                </View>
              </View>

              {/* Postal code & City */}
              <View className="flex-row mb-4">
                <View className="w-28 mr-2">
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-1.5">
                    Code postal
                  </Text>
                  <TextInput
                    value={coordinates.postalCode}
                    onChangeText={(v) => updateField('postalCode', v)}
                    placeholder="75001"
                    placeholderTextColor={COLORS.text.muted}
                    keyboardType="number-pad"
                    className="rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: `${COLORS.primary.gold}25`,
                      color: COLORS.text.cream,
                    }}
                  />
                </View>
                <View className="flex-1 ml-2">
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-1.5">
                    Ville
                  </Text>
                  <View className="flex-row items-center">
                    <View
                      className="w-11 h-11 rounded-l-xl items-center justify-center"
                      style={{ backgroundColor: COLORS.background.charcoal, borderWidth: 1.5, borderRightWidth: 0, borderColor: `${COLORS.primary.gold}25` }}
                    >
                      <MapPin size={18} color={COLORS.text.muted} />
                    </View>
                    <TextInput
                      value={coordinates.city}
                      onChangeText={(v) => updateField('city', v)}
                      placeholder="Paris"
                      placeholderTextColor={COLORS.text.muted}
                      className="flex-1 rounded-r-xl px-4 py-3"
                      style={{
                        backgroundColor: COLORS.background.charcoal,
                        borderWidth: 1.5,
                        borderLeftWidth: 0,
                        borderColor: `${COLORS.primary.gold}25`,
                        color: COLORS.text.cream,
                      }}
                    />
                  </View>
                </View>
              </View>

              {/* Save button */}
              <Pressable
                onPress={handleSave}
                disabled={!isFormValid}
                className="py-3.5 rounded-xl flex-row items-center justify-center"
                style={{
                  backgroundColor: isFormValid ? COLORS.accent.forest : `${COLORS.accent.forest}40`,
                  shadowColor: isFormValid ? COLORS.accent.hemp : 'transparent',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                }}
              >
                {saved ? (
                  <>
                    <Check size={20} color={COLORS.text.white} />
                    <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                      Enregistré !
                    </Text>
                  </>
                ) : (
                  <>
                    <Check size={20} color={COLORS.text.white} />
                    <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                      Enregistrer mes coordonnées
                    </Text>
                  </>
                )}
              </Pressable>
            </Animated.View>
          </View>

          {/* Producer Section - Only shown for producers */}
          {isProducer && (
            <>
              {/* Divider */}
              <View
                className="h-px mb-6"
                style={{ backgroundColor: `${COLORS.primary.gold}20` }}
              />

              <View className="mb-6">
                <View className="flex-row items-center mb-4">
                  <Leaf size={20} color={COLORS.accent.hemp} />
                  <Text style={{ color: COLORS.accent.hemp }} className="text-lg font-bold ml-2">
                    Ma fiche producteur
                  </Text>
                </View>

                {myProducer ? (
                  <Pressable
                    onPress={() => setShowProducerModal(true)}
                    className="p-4 rounded-xl"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: `${COLORS.accent.hemp}40`,
                    }}
                  >
                    <View className="flex-row">
                      {/* Producer Image */}
                      {myProducer.image ? (
                        <Image
                          source={getImageSource(myProducer.image)}
                          className="w-20 h-20 rounded-xl"
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          className="w-20 h-20 rounded-xl items-center justify-center"
                          style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
                        >
                          <Store size={32} color={COLORS.accent.hemp} />
                        </View>
                      )}

                      <View className="flex-1 ml-4">
                        <Text style={{ color: COLORS.text.cream }} className="font-bold text-base">
                          {myProducer.name}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <MapPin size={12} color={COLORS.text.muted} />
                          <Text style={{ color: COLORS.text.muted }} className="text-sm ml-1">
                            {myProducer.department}, {myProducer.region}
                          </Text>
                        </View>
                        <View className="flex-row items-center mt-1">
                          <Package size={12} color={COLORS.primary.brightYellow} />
                          <Text style={{ color: COLORS.primary.brightYellow }} className="text-sm ml-1">
                            {myProducer.products.length} produit{myProducer.products.length !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>

                      <View
                        className="w-10 h-10 rounded-xl items-center justify-center self-center"
                        style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
                      >
                        <Edit3 size={18} color={COLORS.accent.hemp} />
                      </View>
                    </View>

                    <View
                      className="flex-row items-center mt-3 pt-3"
                      style={{ borderTopWidth: 1, borderTopColor: `${COLORS.text.white}10` }}
                    >
                      <Text style={{ color: COLORS.accent.hemp }} className="text-xs font-medium">
                        Appuyez pour modifier votre fiche
                      </Text>
                    </View>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => setShowProducerModal(true)}
                    className="p-6 rounded-xl items-center"
                    style={{
                      backgroundColor: `${COLORS.accent.hemp}10`,
                      borderWidth: 1.5,
                      borderColor: `${COLORS.accent.hemp}30`,
                      borderStyle: 'dashed',
                    }}
                  >
                    <View
                      className="w-16 h-16 rounded-full items-center justify-center mb-3"
                      style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
                    >
                      <Store size={32} color={COLORS.accent.hemp} />
                    </View>
                    <Text style={{ color: COLORS.text.cream }} className="font-bold text-center mb-1">
                      Créer ma fiche producteur
                    </Text>
                    <Text style={{ color: COLORS.text.muted }} className="text-sm text-center">
                      Présentez votre exploitation et vos produits aux clients
                    </Text>
                  </Pressable>
                )}
              </View>
            </>
          )}

          {/* Divider */}
          <View
            className="h-px mb-6"
            style={{ backgroundColor: `${COLORS.primary.gold}20` }}
          />

          {/* Notifications */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <Bell size={20} color={COLORS.primary.paleGold} />
              <Text style={{ color: COLORS.primary.paleGold }} className="text-lg font-bold ml-2">
                Notifications
              </Text>
            </View>

            <View
              className="flex-row items-center justify-between p-4 rounded-xl"
              style={{
                backgroundColor: COLORS.background.charcoal,
                borderWidth: 1.5,
                borderColor: `${COLORS.primary.gold}20`,
              }}
            >
              <View className="flex-1">
                <Text style={{ color: COLORS.text.cream }} className="font-medium">
                  Activer les notifications
                </Text>
                <Text style={{ color: COLORS.text.muted }} className="text-sm mt-1">
                  Recevez les alertes de nouveaux produits
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: COLORS.text.muted, true: COLORS.accent.forest }}
                thumbColor={COLORS.text.white}
              />
            </View>
          </View>

          {/* Divider */}
          <View
            className="h-px mb-6"
            style={{ backgroundColor: `${COLORS.primary.gold}20` }}
          />

          {/* About */}
          <View className="mb-6">
            <View className="flex-row items-center mb-4">
              <Info size={20} color={COLORS.primary.paleGold} />
              <Text style={{ color: COLORS.primary.paleGold }} className="text-lg font-bold ml-2">
                À propos
              </Text>
            </View>

            <View
              className="p-4 rounded-xl"
              style={{
                backgroundColor: COLORS.background.charcoal,
                borderWidth: 1.5,
                borderColor: `${COLORS.primary.gold}20`,
              }}
            >
              <Text style={{ color: COLORS.text.cream }} className="font-bold text-lg mb-1">
                Les Chanvriers Unis
              </Text>
              <Text style={{ color: COLORS.text.muted }} className="text-sm">
                Version 1.0.0
              </Text>
              <Text style={{ color: COLORS.text.muted }} className="text-sm mt-3">
                Application de découverte et commande de produits CBD auprès de producteurs français.
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View
            className="h-px mb-6"
            style={{ backgroundColor: `${COLORS.primary.gold}20` }}
          />

          {/* Mentions Légales */}
          <View className="mb-6">
            <Pressable
              onPress={() => setLegalExpanded(!legalExpanded)}
              className="flex-row items-center justify-between mb-4"
            >
              <View className="flex-row items-center">
                <Scale size={20} color={COLORS.primary.paleGold} />
                <Text style={{ color: COLORS.primary.paleGold }} className="text-lg font-bold ml-2">
                  Mentions légales
                </Text>
              </View>
              <ChevronDown
                size={22}
                color={COLORS.primary.paleGold}
                style={{ transform: [{ rotate: legalExpanded ? '180deg' : '0deg' }] }}
              />
            </Pressable>

            {legalExpanded && (
              <View
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: COLORS.background.charcoal,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.primary.gold}20`,
                }}
              >
                {/* Éditeur */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Building2 size={16} color={COLORS.accent.teal} />
                    <Text style={{ color: COLORS.accent.teal }} className="font-bold ml-2">
                      Éditeur de l'application
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.text.cream }} className="font-semibold">
                    SASU Les Champs Bretons
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm mt-1">
                    60 rue François 1er{'\n'}
                    75008 Paris, France
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm mt-2">
                    SIRET : 942 368 994 00011{'\n'}
                    Capital social : 1 000 €
                  </Text>
                </View>

                {/* Directeur de publication */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <User size={16} color={COLORS.accent.teal} />
                    <Text style={{ color: COLORS.accent.teal }} className="font-bold ml-2">
                      Directeur de la publication
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.text.cream }}>
                    Sylvain Gonzalez, Président
                  </Text>
                </View>

                {/* Hébergement */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Shield size={16} color={COLORS.accent.teal} />
                    <Text style={{ color: COLORS.accent.teal }} className="font-bold ml-2">
                      Hébergement
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm">
                    Application mobile distribuée via l'App Store (Apple Inc.) et Google Play Store (Google LLC).
                  </Text>
                </View>

                {/* Propriété intellectuelle */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <FileText size={16} color={COLORS.accent.teal} />
                    <Text style={{ color: COLORS.accent.teal }} className="font-bold ml-2">
                      Propriété intellectuelle
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm">
                    L'ensemble du contenu de cette application (textes, images, logos, graphismes, icônes, sons, logiciels) est la propriété exclusive de la SASU Les Champs Bretons ou de ses partenaires et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm mt-2">
                    Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments de l'application, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de la SASU Les Champs Bretons.
                  </Text>
                </View>

                {/* Protection des données - RGPD */}
                <View className="mb-5">
                  <View className="flex-row items-center mb-2">
                    <Shield size={16} color={COLORS.accent.hemp} />
                    <Text style={{ color: COLORS.accent.hemp }} className="font-bold ml-2">
                      Protection des données personnelles (RGPD)
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm">
                    Conformément au Règlement Général sur la Protection des Données (RGPD) 2016/679 et à la loi Informatique et Libertés du 6 janvier 1978 modifiée, vous disposez des droits suivants concernant vos données personnelles :
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm mt-2">
                    • Droit d'accès à vos données{'\n'}
                    • Droit de rectification{'\n'}
                    • Droit à l'effacement (droit à l'oubli){'\n'}
                    • Droit à la limitation du traitement{'\n'}
                    • Droit à la portabilité des données{'\n'}
                    • Droit d'opposition
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm mt-2">
                    Pour exercer ces droits, vous pouvez nous contacter à l'adresse du siège social ou par email. Vous disposez également du droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés).
                  </Text>
                </View>

                {/* Données collectées */}
                <View className="mb-5">
                  <Text style={{ color: COLORS.text.lightGray }} className="font-semibold mb-2">
                    Données collectées
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm">
                    Les données personnelles collectées sont : nom, prénom, adresse email, numéro de téléphone, adresse postale. Ces données sont nécessaires pour le traitement des commandes et la livraison des produits.
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm mt-2">
                    Responsable du traitement : SASU Les Champs Bretons{'\n'}
                    Durée de conservation : 3 ans à compter de la dernière commande{'\n'}
                    Finalité : Gestion des commandes et relation client
                  </Text>
                </View>

                {/* Cookies */}
                <View className="mb-5">
                  <Text style={{ color: COLORS.text.lightGray }} className="font-semibold mb-2">
                    Cookies et traceurs
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm">
                    L'application peut utiliser des cookies techniques nécessaires à son fonctionnement. Aucun cookie publicitaire ou de traçage n'est utilisé sans votre consentement préalable.
                  </Text>
                </View>

                {/* Droit applicable */}
                <View className="mb-5">
                  <Text style={{ color: COLORS.text.lightGray }} className="font-semibold mb-2">
                    Droit applicable et juridiction
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm">
                    Les présentes mentions légales sont soumises au droit français. En cas de litige, et après tentative de recherche d'une solution amiable, les tribunaux français seront seuls compétents.
                  </Text>
                </View>

                {/* Médiation */}
                <View className="mb-5">
                  <Text style={{ color: COLORS.text.lightGray }} className="font-semibold mb-2">
                    Médiation de la consommation
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm">
                    Conformément aux articles L.616-1 et R.616-1 du Code de la consommation, en cas de litige non résolu, vous pouvez recourir gratuitement au service de médiation de la consommation. Le médiateur peut être joint via le site : www.mediation-conso.fr
                  </Text>
                </View>

                {/* Réglementation CBD */}
                <View>
                  <View className="flex-row items-center mb-2">
                    <Leaf size={16} color={COLORS.accent.hemp} />
                    <Text style={{ color: COLORS.accent.hemp }} className="font-bold ml-2">
                      Réglementation des produits CBD
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm">
                    Les produits proposés sont conformes à la réglementation française et européenne en vigueur. Ils contiennent moins de 0,3% de THC conformément à l'arrêté du 30 décembre 2021.
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm mt-2">
                    Ces produits sont destinés aux personnes majeures (18 ans et plus). Ils ne sont pas des médicaments et ne peuvent se substituer à un traitement médical. Consultez votre médecin en cas de doute.
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm mt-2">
                    Déconseillé aux femmes enceintes ou allaitantes.
                  </Text>
                </View>

                {/* Date de mise à jour */}
                <View
                  className="mt-5 pt-4"
                  style={{ borderTopWidth: 1, borderTopColor: `${COLORS.text.white}10` }}
                >
                  <Text style={{ color: COLORS.text.muted }} className="text-xs text-center">
                    Dernière mise à jour : Janvier 2025
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Divider */}
          <View
            className="h-px mb-6"
            style={{ backgroundColor: `${COLORS.primary.gold}20` }}
          />

          {/* RGPD Section - Export & Delete Account */}
          {isAuthenticated && (
            <>
              <RGPDSection
                onAccountDeleted={() => {
                  // Redirect to home after account deletion
                  router.replace('/');
                }}
              />

              {/* Divider */}
              <View
                className="h-px mb-6"
                style={{ backgroundColor: `${COLORS.primary.gold}20` }}
              />
            </>
          )}

          {/* Danger Zone */}
          <View className="mb-8">
            <View className="flex-row items-center mb-4">
              <Trash2 size={20} color={COLORS.accent.red} />
              <Text style={{ color: COLORS.accent.red }} className="text-lg font-bold ml-2">
                Zone de danger
              </Text>
            </View>

            <Pressable
              onPress={handleClearData}
              className="py-3.5 rounded-xl flex-row items-center justify-center"
              style={{
                backgroundColor: `${COLORS.accent.red}20`,
                borderWidth: 1.5,
                borderColor: `${COLORS.accent.red}40`,
              }}
            >
              <Trash2 size={18} color={COLORS.accent.red} />
              <Text style={{ color: COLORS.accent.red }} className="font-bold ml-2">
                Réinitialiser mes données
              </Text>
            </Pressable>
            <Text style={{ color: COLORS.text.muted }} className="text-xs text-center mt-2">
              Cette action supprimera votre collection et votre panier.
            </Text>
          </View>
        </View>

        <View className="h-24" />
      </ScrollView>

      {/* Producer Modal */}
      <AddProducerModal
        visible={showProducerModal}
        onClose={() => setShowProducerModal(false)}
        editingProducer={myProducer}
      />
    </View>
  );
}
