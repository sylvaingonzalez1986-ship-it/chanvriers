import React, { useState, useEffect, useCallback } from 'react';
import { View, Pressable, ScrollView, Image, Modal, Alert, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { User, Package, Award, Settings, ChevronRight, Leaf, Camera, Lock, LogOut, X, Ticket, Check, Grid3X3, ChevronDown, ChevronUp, Mail, Phone, MapPin, Home, ShoppingBag, Clock, Truck, CreditCard, XCircle, Copy, ExternalLink, Gift, RefreshCw, Shield, Building2, FileText, UserCircle, Users, BarChart3 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useCollectionStore,
  useSubscriptionStore,
  useCustomerInfoStore,
  useOrdersStore,
  ORDER_STATUS_CONFIG,
  OrderStatus,
  useReferralStore,
  useProducerStore,
} from '@/lib/store';
import { claimGiftedLotWithDetails, isSupabaseSyncConfigured, fetchOrders, fetchOrdersForProducer } from '@/lib/supabase-sync';
import { fetchMyProducer, ProducerDB } from '@/lib/supabase-producer';
import { RARITY_CONFIG, Rarity } from '@/lib/types';
import { ImageCropper } from '@/components/ImageCropper';
import { useAuth, useUserIdentity, usePermissions } from '@/lib/useAuth';
import { COLORS } from '@/lib/colors';
import { USER_ROLE_LABELS, USER_ROLE_COLORS, USER_CATEGORY_LABELS, UserRole } from '@/lib/supabase-users';
import { ClientProfileForm } from '@/components/ClientProfileForm';
import { ProducerProfileForm } from '@/components/ProducerProfileForm';
import { ProProfileForm } from '@/components/ProProfileForm';
import { UserProfile } from '@/lib/supabase-auth';
import { AdminDashboard } from '@/components/AdminDashboard';
import { AdminProducerOrders } from '@/components/AdminProducerOrders';
import { Toast, useToast } from '@/components/Toast';

const PROFILE_IMAGE_KEY = 'user-profile-image';

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  value?: string;
  onPress?: () => void;
}

const MenuItem = ({ icon, label, value, onPress }: MenuItemProps) => (
  <Pressable
    onPress={onPress}
    className="flex-row items-center py-4 px-4 bg-white/5 rounded-xl mb-2 active:opacity-70"
  >
    <View className="w-10 h-10 rounded-full bg-teal-600/20 items-center justify-center">
      {icon}
    </View>
    <Text className="text-white flex-1 ml-3 text-base font-medium">{label}</Text>
    {value && <Text className="text-gray-400 mr-2">{value}</Text>}
    <ChevronRight size={20} color="#6B7280" />
  </Pressable>
);

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showInfoForm, setShowInfoForm] = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showDirectSalesOrders, setShowDirectSalesOrders] = useState(false); // Commandes vente directe (ferme)
  const [showProducerProfile, setShowProducerProfile] = useState(false); // Fiche producteur
  const [copiedTrackingId, setCopiedTrackingId] = useState<string | null>(null);

  // Toast pour les feedbacks
  const { toast, showToast, hideToast } = useToast();

  // Image cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState('');

  const collection = useCollectionStore((s) => s.collection);
  const totalSpins = useCollectionStore((s) => s.totalSpins);
  const addToCollection = useCollectionStore((s) => s.addToCollection);

  // Referral
  const referralPoints = useReferralStore((s) => s.points);
  const giftsSent = useReferralStore((s) => s.giftsSent);
  const giftsReceived = useReferralStore((s) => s.giftsReceived);
  const myCode = useReferralStore((s) => s.myCode);
  const generateMyCode = useReferralStore((s) => s.generateMyCode);
  const addPoints = useReferralStore((s) => s.addPoints);

  // Pro financial summary period filter
  const [proPeriodFilter, setProPeriodFilter] = useState<'day' | 'quarter' | 'year' | 'all'>('all');

  // Gift code input state
  const [giftCodeInput, setGiftCodeInput] = useState('');
  const [giftCodeError, setGiftCodeError] = useState(false);
  const [giftCodeSuccess, setGiftCodeSuccess] = useState(false);

  // Customer Info
  const customerInfo = useCustomerInfoStore((s) => s.customerInfo);
  const setCustomerInfo = useCustomerInfoStore((s) => s.setCustomerInfo);
  const isProfileComplete = useCustomerInfoStore((s) => s.isProfileComplete);

  // Supabase Auth
  const { isAuthenticated, user, profile, signOut, isSigningOut, isLoading: isLoadingAuth, updateProfile, isUpdatingProfile } = useAuth();
  const { authMode, userCode: supabaseUserCode, role, fullName: authFullName, email: authEmail } = useUserIdentity();
  const { isPro, isProducer, isAdmin: isAuthAdmin } = usePermissions();
  const [showAuthSection, setShowAuthSection] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  // Check if user is a client (can access gamification features)
  const isClient = !isAuthenticated || role === 'client' || role === 'admin';
  const isProUser = isPro || isProducer;

  // Get producers to find the one linked to current user (for producer role)
  const producers = useProducerStore((s) => s.producers);

  // Producer linked to current user - fetched from Supabase for reliability
  const [myProducer, setMyProducer] = useState<ProducerDB | null>(null);

  // Check if producer profile is incomplete (missing key fields for farm sales)
  const isProducerProfileIncomplete = isProducer && profile && (
    !profile.company_name ||
    !profile.siret ||
    !profile.phone ||
    !(profile as any).city
  );

  // Auto-open producer profile form if incomplete
  useEffect(() => {
    if (isProducerProfileIncomplete && !showProducerProfile) {
      setShowProducerProfile(true);
    }
  }, [isProducerProfileIncomplete]);

  // Fetch producer from Supabase when user is authenticated as producer
  useEffect(() => {
    const loadMyProducer = async () => {
      if (isProducer && isAuthenticated) {
        console.log('[Profile] Loading producer from Supabase...');
        const producer = await fetchMyProducer();
        console.log('[Profile] My producer:', producer?.id, producer?.name);
        setMyProducer(producer);
      } else {
        setMyProducer(null);
      }
    };
    loadMyProducer();
  }, [isProducer, isAuthenticated]);

  // Fallback: find producer in local store by email (for display in stats)
  const linkedProducerFromStore = isProducer && authEmail
    ? producers.find((p) => p.email?.toLowerCase() === authEmail.toLowerCase())
    : null;

  // Orders - different logic for producers vs clients/pros
  const allOrders = useOrdersStore((s) => s.orders);
  const setOrders = useOrdersStore((s) => s.setOrders);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // RLS gère déjà le filtrage côté serveur - on affiche toutes les commandes reçues
  // Pour les producteurs: filtrer par leurs produits ET uniquement les commandes PRO
  // Pour les clients/pros: RLS renvoie déjà uniquement leurs commandes
  const myOrders = isProducer && myProducer
    ? allOrders.filter((order) =>
        order.items.some((item) => item.producerId === myProducer.id) &&
        order.isProOrder === true // Producteurs ne voient QUE les commandes PRO
      )
    : allOrders; // RLS filtre déjà par user_id

  // État pour savoir si c'est un refresh manuel ou auto
  const [isManualRefresh, setIsManualRefresh] = useState(false);

  // Fonction de synchronisation des commandes - CORRIGÉE pour éviter les closures stales
  // On passe explicitement le producerId pour éviter les problèmes de timing
  const syncOrdersFromSupabase = useCallback(async (manual: boolean, producerIdToUse: string | null) => {
    if (!isSupabaseSyncConfigured()) {
      console.log('[Profile] Supabase not configured, skipping sync');
      return;
    }

    // PROTECTION CRITIQUE: Pour les producteurs, on DOIT avoir un producerId
    // Sinon on ne fait RIEN pour éviter d'écraser les commandes existantes
    if (isProducer) {
      if (!producerIdToUse) {
        console.log('[Profile] SKIP SYNC: Producer mode but no producerId provided - protecting existing orders');
        return;
      }
      console.log('[Profile] Producer sync with ID:', producerIdToUse);
    }

    setOrdersLoading(true);
    if (manual) {
      setIsManualRefresh(true);
    }

    try {
      let supabaseOrders: typeof allOrders = [];

      if (isProducer && producerIdToUse) {
        // Producteur: récupérer les commandes contenant ses produits
        console.log('[Profile] Fetching orders for producer:', producerIdToUse);
        supabaseOrders = await fetchOrdersForProducer(producerIdToUse);
        console.log('[Profile] Producer orders received:', supabaseOrders.length);
      } else if (!isProducer) {
        // Client/Pro: récupérer ses propres commandes (RLS filtre par user_id)
        console.log('[Profile] Fetching orders for client/pro user');
        supabaseOrders = await fetchOrders();
        console.log('[Profile] Client orders received:', supabaseOrders.length);
      }

      // PROTECTION: Ne jamais écraser avec un tableau vide pour les producteurs
      // sauf si c'est vraiment le résultat de la requête avec un producerId valide
      if (isProducer && supabaseOrders.length === 0 && !producerIdToUse) {
        console.log('[Profile] PROTECTION: Refusing to set empty orders for producer without ID');
        return;
      }

      // Trier et mettre à jour le store
      const sortedOrders = [...supabaseOrders].sort((a, b) => b.createdAt - a.createdAt);
      console.log('[Profile] Setting orders in store:', sortedOrders.length, 'orders');
      setOrders(sortedOrders);

      // Feedback uniquement pour refresh manuel
      if (manual) {
        showToast(`${supabaseOrders.length} commande${supabaseOrders.length > 1 ? 's' : ''} mise${supabaseOrders.length > 1 ? 's' : ''} à jour`, 'success');
      }
    } catch (error) {
      console.error('[Profile] Error syncing orders:', error);
      if (manual) {
        showToast('Erreur lors de l\'actualisation des commandes', 'error');
      }
    } finally {
      setOrdersLoading(false);
      setIsManualRefresh(false);
    }
  }, [isProducer, setOrders, showToast]); // Note: myProducer n'est PAS dans les dépendances car on le passe en paramètre

  // Fonction de refresh manuelle - passe explicitement l'ID du producteur actuel
  const handleManualRefresh = useCallback(() => {
    const currentProducerId = myProducer?.id ?? null;
    console.log('[Profile] Manual refresh triggered, producerId:', currentProducerId);
    syncOrdersFromSupabase(true, currentProducerId);
  }, [syncOrdersFromSupabase, myProducer]);

  // Sync orders from Supabase when:
  // 1. showOrders devient true ET
  // 2. Pour les producteurs: myProducer est chargé
  useEffect(() => {
    // Condition 1: La section commandes doit être ouverte
    if (!showOrders) {
      console.log('[Profile] Orders section closed, no sync needed');
      return;
    }

    if (!isSupabaseSyncConfigured()) {
      console.log('[Profile] Supabase not configured');
      return;
    }

    // Condition 2: Pour les producteurs, attendre que myProducer soit chargé
    if (isProducer && !myProducer) {
      console.log('[Profile] Producer mode: waiting for myProducer to load...');
      return; // Le useEffect se re-déclenchera quand myProducer sera chargé
    }

    // Maintenant on peut sync - on passe explicitement l'ID pour éviter les closures stales
    const producerIdToUse = isProducer ? myProducer?.id ?? null : null;
    console.log('[Profile] Starting sync, isProducer:', isProducer, 'producerId:', producerIdToUse);

    syncOrdersFromSupabase(false, producerIdToUse);

    // Auto-refresh every 30 seconds when orders section is open
    const interval = setInterval(() => {
      // Important: relire myProducer?.id à chaque tick pour avoir la valeur actuelle
      const currentProducerId = isProducer ? myProducer?.id ?? null : null;
      syncOrdersFromSupabase(false, currentProducerId);
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [showOrders, isProducer, myProducer, syncOrdersFromSupabase]);

  // Subscription
  const tickets = useSubscriptionStore((s) => s.tickets);
  const subscription = useSubscriptionStore((s) => s.subscription);
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);

  // Load saved profile image on mount
  useEffect(() => {
    const loadProfileImage = async () => {
      try {
        const savedImage = await AsyncStorage.getItem(PROFILE_IMAGE_KEY);
        if (savedImage) {
          setProfileImage(savedImage);
        }
      } catch (error) {
        console.log('Error loading profile image:', error);
      }
    };
    loadProfileImage();
  }, []);

  // Handle picking image from library
  const handlePickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Permission status:', status);

      if (status !== 'granted') {
        console.log('Permission to access media library was denied');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      console.log('Image picker result:', JSON.stringify(result, null, 2));

      if (!result.canceled && result.assets && result.assets[0]) {
        // Open cropper for profile image (square)
        setImageToCrop(result.assets[0].uri);
        setShowCropper(true);
      }
    } catch (error) {
      console.log('Error picking image:', error);
    }
  };

  // Handle cropped profile image
  const handleCroppedProfileImage = async (croppedUri: string) => {
    setProfileImage(croppedUri);
    setShowCropper(false);
    setImageToCrop('');

    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem(PROFILE_IMAGE_KEY, croppedUri);
      console.log('Image saved to AsyncStorage');
    } catch (error) {
      console.log('Error saving image:', error);
    }
  };

  // Generate user code on mount if not exists
  useEffect(() => {
    if (!myCode) {
      generateMyCode();
    }
  }, [myCode, generateMyCode]);

  // Handle claiming a gift code via Supabase
  const handleClaimGiftCode = async () => {
    console.log('[Profile] handleClaimGiftCode called, input:', giftCodeInput);
    if (!giftCodeInput.trim()) {
      console.log('[Profile] Empty input, returning');
      return;
    }

    // Ensure user has a code
    const userCode = myCode || generateMyCode();
    console.log('[Profile] User code:', userCode);

    // Check if Supabase is configured
    if (!isSupabaseSyncConfigured()) {
      console.log('[Profile] Supabase not configured');
      setGiftCodeError(true);
      setGiftCodeSuccess(false);
      setTimeout(() => setGiftCodeError(false), 3000);
      return;
    }

    console.log('[Profile] Attempting to claim gift code:', giftCodeInput.trim().toUpperCase());
    try {
      const result = await claimGiftedLotWithDetails(giftCodeInput.trim().toUpperCase(), userCode);
      console.log('[Profile] Claim result:', JSON.stringify(result, null, 2));

      if (result.success && result.lot) {
        console.log('[Profile] Gift claimed successfully, adding to collection');

        // Create the product object for collection
        const product = {
          id: result.lot.lotId,
          name: result.lot.lotName,
          description: result.lot.lotDescription || 'Lot gagné',
          producer: 'Cadeau',
          region: 'France',
          rarity: (result.lot.lotRarity || 'common') as 'common' | 'rare' | 'epic' | 'legendary' | 'platinum',
          thcPercent: 0.2,
          cbdPercent: 10,
          image: result.lot.lotImage || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
          value: result.lot.lotValue ?? 0,
        };

        // Create lotInfo with all necessary metadata
        const lotInfo = {
          lotId: result.lot.lotId,
          lotType: (result.lot.lotType || 'product') as 'product' | 'discount',
          discountPercent: result.lot.discountPercent ?? undefined,
          discountAmount: result.lot.discountAmount ?? undefined,
          minOrderAmount: result.lot.minOrderAmount ?? undefined,
        };

        console.log('[Profile] Adding to collection:', product.name, lotInfo);

        // Add to collection
        addToCollection(product, lotInfo);

        setGiftCodeSuccess(true);
        setGiftCodeError(false);
        setGiftCodeInput('');
        // Award points for claiming
        addPoints(5);
        // Reset success message after 3 seconds
        setTimeout(() => setGiftCodeSuccess(false), 3000);
      } else {
        console.log('[Profile] Claim failed:', result.error, result.errorMessage);
        setGiftCodeError(true);
        setGiftCodeSuccess(false);
        // Reset error message after 3 seconds
        setTimeout(() => setGiftCodeError(false), 3000);
      }
    } catch (error) {
      console.log('[Profile] Error claiming gift:', error);
      setGiftCodeError(true);
      setGiftCodeSuccess(false);
      setTimeout(() => setGiftCodeError(false), 3000);
    }
  };

  // Calculate stats
  const totalProducts = collection.length;
  const legendaryCount = collection.filter((item) => item.product.rarity === 'legendary').length;
  const platinumCount = collection.filter((item) => item.product.rarity === 'platinum').length;
  const epicCount = collection.filter((item) => item.product.rarity === 'epic').length;
  const totalValue = collection.reduce((sum, item) => sum + item.product.value, 0);

  // Filter orders by period for Pro financial summary
  const getFilteredOrdersForPro = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    return myOrders.filter((order) => {
      if (proPeriodFilter === 'all') return true;
      if (proPeriodFilter === 'day') return order.createdAt >= startOfDay;
      if (proPeriodFilter === 'quarter') return order.createdAt >= startOfQuarter;
      if (proPeriodFilter === 'year') return order.createdAt >= startOfYear;
      return true;
    });
  };

  // Calculate HT and TVA totals for Pro/Producer
  const calculateProFinancials = () => {
    const filteredOrders = getFilteredOrdersForPro();

    let totalTTC = 0;
    let totalTVA = 0;

    filteredOrders.forEach((order) => {
      // Pour les producteurs: ne compter que leurs propres produits
      if (isProducer && myProducer) {
        order.items.forEach((item) => {
          if (item.producerId === myProducer.id) {
            totalTTC += item.totalPrice;
            const tvaRate = item.tvaRate ?? 20;
            const tva = item.totalPrice - (item.totalPrice / (1 + tvaRate / 100));
            totalTVA += tva;
          }
        });
      } else {
        // Pour les pros: compter le total de la commande
        totalTTC += order.total;
        order.items.forEach((item) => {
          const tvaRate = item.tvaRate ?? 20;
          const tva = item.totalPrice - (item.totalPrice / (1 + tvaRate / 100));
          totalTVA += tva;
        });
      }
    });

    const totalHT = totalTTC - totalTVA;
    return { totalHT, totalTVA, totalTTC, orderCount: filteredOrders.length };
  };

  const proFinancials = calculateProFinancials();

  return (
    <View className="flex-1 bg-[#0A0F0D]" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-4 pb-6">
          <Text className="text-white text-2xl font-bold">Profil</Text>
        </View>

        {/* Profile Card */}
        <View className="mx-6 bg-gradient-to-br rounded-3xl overflow-hidden mb-6">
          <View className="bg-teal-900/40 p-6 border border-teal-800/50 rounded-3xl">
            <View className="flex-row items-center">
              <Pressable onPress={handlePickImage} className="active:opacity-80">
                <View className="w-20 h-20 rounded-full bg-teal-600 items-center justify-center border-2 border-teal-400 overflow-hidden">
                  {profileImage ? (
                    <Image
                      source={{ uri: profileImage }}
                      style={{ width: 80, height: 80 }}
                      resizeMode="cover"
                    />
                  ) : (
                    <User size={40} color="#fff" />
                  )}
                </View>
                {/* Camera badge */}
                <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-teal-500 items-center justify-center border-2 border-[#0A0F0D]">
                  <Camera size={14} color="#fff" />
                </View>
              </Pressable>
              <View className="ml-4 flex-1">
                <Text className="text-white text-xl font-bold">
                  {customerInfo.firstName && customerInfo.lastName
                    ? `${customerInfo.firstName} ${customerInfo.lastName}`
                    : 'Collectionneur'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Auth Section */}
        <View className="mx-6 mb-6">
          <Pressable
            onPress={() => setShowAuthSection(!showAuthSection)}
            className={`flex-row items-center justify-between p-4 rounded-xl border ${
              isAuthenticated
                ? 'bg-emerald-900/30 border-emerald-700/50'
                : 'bg-gray-900/30 border-gray-700/50'
            } active:opacity-70`}
          >
            <View className="flex-row items-center flex-1">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  isAuthenticated ? 'bg-emerald-600/30' : 'bg-gray-600/30'
                }`}
              >
                <Shield size={20} color={isAuthenticated ? '#10B981' : '#6B7280'} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-white font-semibold">Mes Informations</Text>
                <Text className={`text-sm ${isAuthenticated ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {isAuthenticated
                    ? `Connecté en tant que ${role === 'admin' ? 'Admin' : role === 'pro' ? 'Pro' : role === 'producer' ? 'Producteur' : 'Client'}`
                    : 'Non connecté'}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center">
              {isAuthenticated && (
                <View
                  className="mr-2 px-2 py-1 rounded-full"
                  style={{ backgroundColor: USER_ROLE_COLORS[role as UserRole] }}
                >
                  <Text className="text-white text-xs font-bold">
                    {USER_ROLE_LABELS[role as UserRole]}
                  </Text>
                </View>
              )}
              {showAuthSection ? (
                <ChevronUp size={20} color="#6B7280" />
              ) : (
                <ChevronDown size={20} color="#6B7280" />
              )}
            </View>
          </Pressable>

          {/* Auth Details (collapsible) */}
          {showAuthSection && (
            <View className="mt-3 bg-white/5 rounded-xl p-4 border border-white/10">
              {isAuthenticated ? (
                <>
                  {/* User Info */}
                  <View className="mb-4">
                    <View className="flex-row items-center mb-3">
                      <UserCircle size={18} color="#10B981" />
                      <Text className="text-emerald-400 text-sm ml-2 font-medium">
                        Informations du compte
                      </Text>
                    </View>

                    <View className="bg-white/5 rounded-lg p-3 mb-2">
                      <Text className="text-gray-400 text-xs mb-1">Email</Text>
                      <Text className="text-white">{authEmail || user?.email || 'Non renseigné'}</Text>
                    </View>

                    <View className="bg-white/5 rounded-lg p-3 mb-2">
                      <Text className="text-gray-400 text-xs mb-1">Nom complet</Text>
                      <Text className="text-white">{authFullName || profile?.full_name || 'Non renseigné'}</Text>
                    </View>

                    <View className="flex-row">
                      <View className="flex-1 bg-white/5 rounded-lg p-3 mr-2">
                        <Text className="text-gray-400 text-xs mb-1">Rôle</Text>
                        <Text style={{ color: USER_ROLE_COLORS[role as UserRole] }} className="font-medium">
                          {USER_ROLE_LABELS[role as UserRole]}
                        </Text>
                      </View>
                      {profile?.category && (
                        <View className="flex-1 bg-white/5 rounded-lg p-3 ml-2">
                          <Text className="text-gray-400 text-xs mb-1">Catégorie</Text>
                          <Text className="text-white">
                            {USER_CATEGORY_LABELS[profile.category] || profile.category}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* SIRET/TVA for Pro/Producer */}
                  {(isPro || isProducer) && (
                    <View className="mb-4">
                      <View className="flex-row items-center mb-3">
                        <Building2 size={18} color={COLORS.accent.teal} />
                        <Text style={{ color: COLORS.accent.teal }} className="text-sm ml-2 font-medium">
                          Informations professionnelles
                        </Text>
                      </View>

                      <View className="bg-white/5 rounded-lg p-3 mb-2">
                        <Text className="text-gray-400 text-xs mb-1">SIRET</Text>
                        <Text className={profile?.siret ? 'text-white' : 'text-amber-400'}>
                          {profile?.siret || 'Non renseigné - requis'}
                        </Text>
                      </View>

                      <View className="bg-white/5 rounded-lg p-3">
                        <Text className="text-gray-400 text-xs mb-1">Numéro TVA (optionnel)</Text>
                        <Text className={profile?.tva_number ? 'text-white' : 'text-gray-500'}>
                          {profile?.tva_number || 'Non renseigné'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Edit Profile Button */}
                  <Pressable
                    onPress={() => router.push('/edit-profile')}
                    className="bg-emerald-600/20 rounded-xl py-3 flex-row items-center justify-center mb-3 active:opacity-70"
                    style={{ borderWidth: 1, borderColor: '#10B98140' }}
                  >
                    <FileText size={18} color="#10B981" />
                    <Text className="text-emerald-400 font-medium ml-2">
                      Modifier mon profil
                    </Text>
                  </Pressable>

                  {/* Logout Button */}
                  <Pressable
                    onPress={() => signOut()}
                    disabled={isSigningOut}
                    className="bg-red-600/20 rounded-xl py-3 flex-row items-center justify-center active:opacity-70"
                    style={{ borderWidth: 1, borderColor: '#EF444440' }}
                  >
                    {isSigningOut ? (
                      <ActivityIndicator size="small" color="#EF4444" />
                    ) : (
                      <>
                        <LogOut size={18} color="#EF4444" />
                        <Text className="text-red-400 font-medium ml-2">
                          Se déconnecter
                        </Text>
                      </>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  {/* Not Authenticated - Login/Signup Options */}
                  <View className="mb-4">
                    <Text className="text-gray-400 text-sm text-center mb-4">
                      Créez un compte pour accéder aux fonctionnalités professionnelles et synchroniser vos données.
                    </Text>

                    <Pressable
                      onPress={() => router.push('/auth/signup')}
                      className="rounded-xl py-4 flex-row items-center justify-center mb-3 active:opacity-80"
                      style={{ backgroundColor: COLORS.primary.gold }}
                    >
                      <User size={20} color="#fff" />
                      <Text className="text-white font-bold ml-2">
                        Créer un compte
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => router.push('/auth/login')}
                      className="rounded-xl py-4 flex-row items-center justify-center active:opacity-70"
                      style={{
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderColor: COLORS.primary.paleGold,
                      }}
                    >
                      <Lock size={20} color={COLORS.primary.paleGold} />
                      <Text style={{ color: COLORS.primary.paleGold }} className="font-bold ml-2">
                        Se connecter
                      </Text>
                    </Pressable>
                  </View>

                  {/* Local Code Info */}
                  <View className="bg-white/5 rounded-lg p-3">
                    <Text className="text-gray-400 text-xs mb-1">Code local (actuel)</Text>
                    <Text className="text-white font-mono">{myCode || 'Génération...'}</Text>
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* Admin Dashboard Section */}
        {isAuthAdmin && (
          <View className="mx-6 mb-6">
            <Pressable
              onPress={() => setShowAdminDashboard(!showAdminDashboard)}
              className="flex-row items-center justify-between p-4 rounded-xl border bg-amber-900/30 border-amber-700/50 active:opacity-70"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center bg-amber-600/30">
                  <BarChart3 size={20} color={COLORS.primary.gold} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-white font-semibold">Dashboard de contrôle</Text>
                  <Text className="text-sm text-amber-400">
                    CA, TVA, Utilisateurs, Statistiques
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center">
                {showAdminDashboard ? (
                  <ChevronUp size={20} color={COLORS.primary.gold} />
                ) : (
                  <ChevronDown size={20} color={COLORS.primary.gold} />
                )}
              </View>
            </Pressable>

            {showAdminDashboard && (
              <View className="mt-3 bg-white/5 rounded-xl p-4 border border-white/10">
                <AdminDashboard
                  onNavigateToUsers={() => {
                    router.push('/(tabs)/admin');
                  }}
                />
              </View>
            )}
          </View>
        )}


        {/* Customer Info Section (for non-authenticated users) */}
        {!isAuthenticated && (
          <View className="mx-6 mb-6">
            <Pressable
              onPress={() => setShowInfoForm(!showInfoForm)}
              className={`flex-row items-center justify-between p-4 rounded-xl border ${
                isProfileComplete()
                  ? 'bg-teal-900/30 border-teal-700/50'
                  : 'bg-amber-900/30 border-amber-700/50'
              } active:opacity-70`}
            >
              <View className="flex-row items-center flex-1">
                <View
                  className={`w-10 h-10 rounded-full items-center justify-center ${
                    isProfileComplete() ? 'bg-teal-600/30' : 'bg-amber-600/30'
                  }`}
                >
                  <User size={20} color={isProfileComplete() ? '#0D9488' : '#F59E0B'} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-white font-semibold">Mes informations</Text>
                  <Text className={`text-sm ${isProfileComplete() ? 'text-teal-400' : 'text-amber-400'}`}>
                    {isProfileComplete() ? 'Profil complet' : 'À compléter pour commander'}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center">
                {isProfileComplete() && (
                  <View className="mr-2 w-6 h-6 rounded-full bg-teal-500 items-center justify-center">
                    <Check size={14} color="white" />
                  </View>
                )}
                {showInfoForm ? (
                  <ChevronUp size={20} color="#6B7280" />
                ) : (
                  <ChevronDown size={20} color="#6B7280" />
                )}
              </View>
            </Pressable>

            {/* Info Form (collapsible) - for non-authenticated users */}
            {showInfoForm && (
              <View className="mt-3 bg-white/5 rounded-xl p-4 border border-white/10">
                {/* First Name & Last Name */}
                <View className="flex-row mb-3">
                  <View className="flex-1 mr-2">
                    <Text className="text-gray-400 text-xs mb-1">Prénom *</Text>
                    <TextInput
                      value={customerInfo.firstName}
                      onChangeText={(text) => setCustomerInfo({ firstName: text })}
                      placeholder="Jean"
                      placeholderTextColor="#6B7280"
                      className="bg-white/10 rounded-lg px-3 py-3 text-white border border-white/20"
                    />
                  </View>
                  <View className="flex-1 ml-2">
                    <Text className="text-gray-400 text-xs mb-1">Nom *</Text>
                    <TextInput
                      value={customerInfo.lastName}
                      onChangeText={(text) => setCustomerInfo({ lastName: text })}
                      placeholder="Dupont"
                      placeholderTextColor="#6B7280"
                      className="bg-white/10 rounded-lg px-3 py-3 text-white border border-white/20"
                    />
                  </View>
                </View>

                {/* Email */}
                <View className="mb-3">
                  <Text className="text-gray-400 text-xs mb-1">Email *</Text>
                  <View className="flex-row items-center bg-white/10 rounded-lg border border-white/20">
                    <View className="pl-3">
                      <Mail size={18} color="#6B7280" />
                    </View>
                    <TextInput
                      value={customerInfo.email}
                      onChangeText={(text) => setCustomerInfo({ email: text })}
                      placeholder="jean.dupont@email.com"
                      placeholderTextColor="#6B7280"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      className="flex-1 px-3 py-3 text-white"
                    />
                  </View>
                </View>

                {/* Phone */}
                <View className="mb-3">
                  <Text className="text-gray-400 text-xs mb-1">Téléphone *</Text>
                  <View className="flex-row items-center bg-white/10 rounded-lg border border-white/20">
                    <View className="pl-3">
                      <Phone size={18} color="#6B7280" />
                    </View>
                    <TextInput
                      value={customerInfo.phone}
                      onChangeText={(text) => setCustomerInfo({ phone: text })}
                      placeholder="06 12 34 56 78"
                      placeholderTextColor="#6B7280"
                      keyboardType="phone-pad"
                      className="flex-1 px-3 py-3 text-white"
                    />
                  </View>
                </View>

                {/* Address */}
                <View className="mb-3">
                  <Text className="text-gray-400 text-xs mb-1">Adresse *</Text>
                  <View className="flex-row items-center bg-white/10 rounded-lg border border-white/20">
                    <View className="pl-3">
                      <Home size={18} color="#6B7280" />
                    </View>
                    <TextInput
                      value={customerInfo.address}
                      onChangeText={(text) => setCustomerInfo({ address: text })}
                      placeholder="123 Rue de la Paix"
                      placeholderTextColor="#6B7280"
                      className="flex-1 px-3 py-3 text-white"
                    />
                  </View>
                </View>

                {/* City & Postal Code */}
                <View className="flex-row">
                  <View className="flex-1 mr-2">
                    <Text className="text-gray-400 text-xs mb-1">Ville *</Text>
                    <View className="flex-row items-center bg-white/10 rounded-lg border border-white/20">
                      <View className="pl-3">
                        <MapPin size={18} color="#6B7280" />
                      </View>
                      <TextInput
                        value={customerInfo.city}
                        onChangeText={(text) => setCustomerInfo({ city: text })}
                        placeholder="Paris"
                        placeholderTextColor="#6B7280"
                        className="flex-1 px-3 py-3 text-white"
                      />
                    </View>
                  </View>
                  <View className="flex-1 ml-2">
                    <Text className="text-gray-400 text-xs mb-1">Code postal *</Text>
                    <TextInput
                      value={customerInfo.postalCode}
                      onChangeText={(text) => setCustomerInfo({ postalCode: text })}
                      placeholder="75001"
                      placeholderTextColor="#6B7280"
                      keyboardType="number-pad"
                      className="bg-white/10 rounded-lg px-3 py-3 text-white border border-white/20"
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        )}

        {/* My Orders Section */}
        <View className="mx-6 mb-6">
          <Pressable
            onPress={() => setShowOrders(!showOrders)}
            className={`flex-row items-center justify-between p-4 rounded-xl border ${
              isProducer ? 'bg-emerald-900/30 border-emerald-700/50' : 'bg-blue-900/30 border-blue-700/50'
            } active:opacity-70`}
          >
            <View className="flex-row items-center flex-1">
              <View className={`w-10 h-10 rounded-full items-center justify-center ${
                isProducer ? 'bg-emerald-600/30' : 'bg-blue-600/30'
              }`}>
                <ShoppingBag size={20} color={isProducer ? '#10B981' : '#3B82F6'} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-white font-semibold">
                  {isProducer ? 'Commandes PRO reçues' : 'Mes commandes'}
                </Text>
                <Text className={`text-sm ${isProducer ? 'text-emerald-400' : 'text-blue-400'}`}>
                  {myOrders.length === 0
                    ? 'Aucune commande PRO'
                    : `${myOrders.length} commande${myOrders.length > 1 ? 's' : ''} PRO`}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center">
              {ordersLoading && (
                <ActivityIndicator size="small" color={isProducer ? '#10B981' : '#3B82F6'} style={{ marginRight: 8 }} />
              )}
              {myOrders.length > 0 && (
                <View className={`mr-2 px-2 py-1 rounded-full ${isProducer ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                  <Text className="text-white text-xs font-bold">{myOrders.length}</Text>
                </View>
              )}
              {showOrders ? (
                <ChevronUp size={20} color="#6B7280" />
              ) : (
                <ChevronDown size={20} color="#6B7280" />
              )}
            </View>
          </Pressable>

          {/* Orders List (collapsible) */}
          {showOrders && (
            <View className="mt-3">
              {/* Bouton de refresh manuel */}
              <Pressable
                onPress={handleManualRefresh}
                disabled={ordersLoading}
                className="flex-row items-center justify-center py-2 px-4 rounded-xl mb-3 active:opacity-70"
                style={{
                  backgroundColor: isProducer ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  borderWidth: 1,
                  borderColor: isProducer ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)',
                  opacity: ordersLoading ? 0.6 : 1,
                }}
              >
                {ordersLoading ? (
                  <ActivityIndicator size="small" color={isProducer ? '#10B981' : '#3B82F6'} />
                ) : (
                  <RefreshCw size={16} color={isProducer ? '#10B981' : '#3B82F6'} />
                )}
                <Text
                  className="font-medium ml-2 text-sm"
                  style={{ color: isProducer ? '#10B981' : '#3B82F6' }}
                >
                  {ordersLoading ? 'Actualisation...' : 'Actualiser les commandes'}
                </Text>
              </Pressable>

              {/* Pro/Producer Financial Summary */}
              {isProUser && isAuthenticated && myOrders.length > 0 && (
                <View
                  className={`rounded-xl p-4 mb-4 border ${
                    isProducer
                      ? 'bg-emerald-900/30 border-emerald-700/50'
                      : 'bg-indigo-900/30 border-indigo-700/50'
                  }`}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <FileText size={18} color={isProducer ? '#10B981' : '#818CF8'} />
                      <Text className="text-white font-semibold ml-2">
                        {isProducer ? "Chiffre d'affaires" : 'Récapitulatif financier'}
                      </Text>
                    </View>
                  </View>

                  {/* Period Filter Buttons */}
                  <View className="flex-row mb-4" style={{ gap: 6 }}>
                    {[
                      { key: 'day' as const, label: 'Jour' },
                      { key: 'quarter' as const, label: 'Trimestre' },
                      { key: 'year' as const, label: 'Année' },
                      { key: 'all' as const, label: 'Total' },
                    ].map((period) => (
                      <Pressable
                        key={period.key}
                        onPress={() => setProPeriodFilter(period.key)}
                        className="flex-1 py-2 rounded-lg items-center"
                        style={{
                          backgroundColor: proPeriodFilter === period.key
                            ? (isProducer ? '#10B981' : '#818CF8')
                            : (isProducer ? 'rgba(16, 185, 129, 0.15)' : 'rgba(129, 140, 248, 0.15)'),
                          borderWidth: 1,
                          borderColor: proPeriodFilter === period.key
                            ? (isProducer ? '#10B981' : '#818CF8')
                            : (isProducer ? 'rgba(16, 185, 129, 0.3)' : 'rgba(129, 140, 248, 0.3)'),
                        }}
                      >
                        <Text
                          className="text-xs font-medium"
                          style={{
                            color: proPeriodFilter === period.key
                              ? '#fff'
                              : (isProducer ? '#10B981' : '#818CF8')
                          }}
                        >
                          {period.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Financial Summary */}
                  <View className="bg-white/5 rounded-lg p-3 mb-3">
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-gray-400 text-sm">
                        {isProducer ? 'Commandes reçues' : 'Commandes'}
                      </Text>
                      <Text className="text-white font-medium">{proFinancials.orderCount}</Text>
                    </View>
                    <View className="flex-row justify-between items-center mb-2">
                      <Text className="text-gray-400 text-sm">
                        {isProducer ? 'CA HT' : 'Total HT'}
                      </Text>
                      <Text
                        className="font-bold text-lg"
                        style={{ color: isProducer ? '#10B981' : '#A5B4FC' }}
                      >
                        {proFinancials.totalHT.toFixed(2)}€
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center pb-2 border-b border-white/10">
                      <Text className="text-gray-400 text-sm">
                        {isProducer ? 'TVA collectée' : 'TVA'}
                      </Text>
                      <Text className="text-amber-400 font-medium">{proFinancials.totalTVA.toFixed(2)}€</Text>
                    </View>
                    <View className="flex-row justify-between items-center pt-2">
                      <Text className="text-gray-400 text-sm">
                        {isProducer ? 'CA TTC' : 'Total TTC'}
                      </Text>
                      <Text className="text-white font-bold">{proFinancials.totalTTC.toFixed(2)}€</Text>
                    </View>
                  </View>

                  <Text className="text-gray-500 text-xs text-center">
                    {proPeriodFilter === 'day' && "Aujourd'hui"}
                    {proPeriodFilter === 'quarter' && 'Ce trimestre'}
                    {proPeriodFilter === 'year' && 'Cette année'}
                    {proPeriodFilter === 'all' && 'Depuis la création du compte'}
                  </Text>
                </View>
              )}

              {myOrders.length === 0 ? (
                <View className="bg-white/5 rounded-xl p-6 items-center border border-white/10">
                  <ShoppingBag size={40} color="#6B7280" />
                  <Text className="text-gray-400 text-center mt-3">
                    {isProducer
                      ? "Vous n'avez pas encore reçu de commande"
                      : "Vous n'avez pas encore passé de commande"}
                  </Text>
                </View>
              ) : (
                myOrders
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((order) => {
                    const statusConfig = ORDER_STATUS_CONFIG[order.status];
                    const orderDate = new Date(order.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    // Status icon based on order status
                    const StatusIcon = () => {
                      switch (order.status) {
                        case 'pending':
                          return <Clock size={16} color={statusConfig.color} />;
                        case 'payment_sent':
                          return <Mail size={16} color={statusConfig.color} />;
                        case 'paid':
                          return <CreditCard size={16} color={statusConfig.color} />;
                        case 'shipped':
                          return <Truck size={16} color={statusConfig.color} />;
                        case 'cancelled':
                          return <XCircle size={16} color={statusConfig.color} />;
                        default:
                          return <Clock size={16} color={statusConfig.color} />;
                      }
                    };

                    return (
                      <View
                        key={order.id}
                        className="bg-white/5 rounded-xl p-4 mb-3 border"
                        style={{ borderColor: `${statusConfig.color}40` }}
                      >
                        {/* Order Header */}
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-row items-center">
                            <StatusIcon />
                            <Text
                              className="font-medium text-sm ml-2"
                              style={{ color: statusConfig.color }}
                            >
                              {statusConfig.label}
                            </Text>
                          </View>
                          <Text className="text-gray-500 text-xs">{orderDate}</Text>
                        </View>

                        {/* Progress Bar */}
                        <View className="mb-3">
                          <View className="flex-row items-center justify-between mb-2">
                            {(['pending', 'payment_sent', 'paid', 'shipped'] as OrderStatus[]).map(
                              (status, index) => {
                                const config = ORDER_STATUS_CONFIG[status];
                                const currentStep = ORDER_STATUS_CONFIG[order.status].step;
                                const stepNumber = config.step;
                                const isCompleted = currentStep >= stepNumber && order.status !== 'cancelled';
                                const isCurrent = order.status === status;

                                return (
                                  <View key={status} className="items-center flex-1">
                                    <View
                                      className="w-6 h-6 rounded-full items-center justify-center"
                                      style={{
                                        backgroundColor: isCompleted ? config.color : '#374151',
                                        borderWidth: isCurrent ? 2 : 0,
                                        borderColor: '#fff',
                                      }}
                                    >
                                      {isCompleted && <Check size={12} color="#fff" />}
                                    </View>
                                    {index < 3 && (
                                      <View
                                        className="absolute top-3 h-0.5"
                                        style={{
                                          left: '60%',
                                          right: '-40%',
                                          backgroundColor: currentStep > stepNumber ? ORDER_STATUS_CONFIG[(['pending', 'payment_sent', 'paid', 'shipped'] as OrderStatus[])[index + 1]].color : '#374151',
                                        }}
                                      />
                                    )}
                                  </View>
                                );
                              }
                            )}
                          </View>
                          <View className="flex-row justify-between px-1">
                            <Text className="text-gray-500 text-[10px] text-center flex-1">Attente</Text>
                            <Text className="text-gray-500 text-[10px] text-center flex-1">Paiement</Text>
                            <Text className="text-gray-500 text-[10px] text-center flex-1">Préparation</Text>
                            <Text className="text-gray-500 text-[10px] text-center flex-1">Envoyée</Text>
                          </View>
                        </View>

                        {/* Status Description */}
                        <Text className="text-gray-400 text-xs mb-3">
                          {statusConfig.description}
                        </Text>

                        {/* Tracking Number (if shipped) */}
                        {order.status === 'shipped' && order.trackingNumber && (
                          <View
                            className="rounded-lg p-3 mb-3"
                            style={{ backgroundColor: `${ORDER_STATUS_CONFIG.shipped.color}20` }}
                          >
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row items-center">
                                <Truck size={16} color={ORDER_STATUS_CONFIG.shipped.color} />
                                <Text
                                  className="ml-2 font-medium"
                                  style={{ color: ORDER_STATUS_CONFIG.shipped.color }}
                                >
                                  Numéro de suivi
                                </Text>
                              </View>
                              <Pressable
                                onPress={async () => {
                                  await Clipboard.setStringAsync(order.trackingNumber || '');
                                  setCopiedTrackingId(order.id);
                                  setTimeout(() => setCopiedTrackingId(null), 2000);
                                }}
                                className="flex-row items-center px-3 py-1.5 rounded-lg active:opacity-70"
                                style={{
                                  backgroundColor: copiedTrackingId === order.id
                                    ? ORDER_STATUS_CONFIG.shipped.color
                                    : `${ORDER_STATUS_CONFIG.shipped.color}30`,
                                }}
                              >
                                {copiedTrackingId === order.id ? (
                                  <>
                                    <Check size={14} color="#fff" />
                                    <Text className="text-white text-xs font-medium ml-1">Copié</Text>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={14} color={ORDER_STATUS_CONFIG.shipped.color} />
                                    <Text
                                      className="text-xs font-medium ml-1"
                                      style={{ color: ORDER_STATUS_CONFIG.shipped.color }}
                                    >
                                      Copier
                                    </Text>
                                  </>
                                )}
                              </Pressable>
                            </View>

                            {/* Lien Mondial Relay */}
                            <Pressable
                              onPress={() => Linking.openURL('https://www.mondialrelay.fr/suivi-de-colis')}
                              className="flex-row items-center mt-2 active:opacity-70"
                            >
                              <ExternalLink size={14} color="#60A5FA" />
                              <Text className="text-blue-400 text-sm ml-1.5 underline">
                                Suivre mon colis sur Mondial Relay
                              </Text>
                            </Pressable>

                            <Text className="text-white font-bold mt-2" selectable>{order.trackingNumber}</Text>
                          </View>
                        )}

                        {/* Order Items Summary */}
                        <View className="border-t border-white/10 pt-3">
                          <Text className="text-gray-400 text-xs mb-2">
                            {order.items.length} article{order.items.length > 1 ? 's' : ''}
                          </Text>
                          {order.items.slice(0, 2).map((item, idx) => (
                            <Text key={idx} className="text-white text-sm" numberOfLines={1}>
                              {item.quantity}x {item.productName}
                            </Text>
                          ))}
                          {order.items.length > 2 && (
                            <Text className="text-gray-500 text-xs">
                              +{order.items.length - 2} autre{order.items.length - 2 > 1 ? 's' : ''}
                            </Text>
                          )}
                        </View>

                        {/* Order Total */}
                        <View className="mt-3 pt-3 border-t border-white/10">
                          {/* TVA due à l'État */}
                          <View
                            className="flex-row items-center justify-between py-2 px-3 rounded-lg mb-2"
                            style={{ backgroundColor: 'rgba(199, 91, 91, 0.15)', borderWidth: 1, borderColor: 'rgba(199, 91, 91, 0.4)' }}
                          >
                            <Text style={{ color: '#C75B5B' }} className="text-sm font-semibold">TVA due à l'État</Text>
                            <Text style={{ color: '#C75B5B' }} className="font-bold">
                              {order.items.reduce((sum, item) => {
                                const tvaRate = item.tvaRate ?? 20;
                                const tva = item.totalPrice - (item.totalPrice / (1 + tvaRate / 100));
                                return sum + tva;
                              }, 0).toFixed(2)}€
                            </Text>
                          </View>
                          <View className="flex-row items-center justify-between">
                            <Text className="text-gray-400">Total</Text>
                            <Text className="text-amber-400 font-bold text-lg">
                              {order.total.toFixed(2)}€
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
              )}
            </View>
          )}
        </View>

        {/* Local Market Orders Section - FOR CLIENTS */}
        {!isProducer && isAuthenticated && (
          <View className="mx-6 mb-6">
            <Pressable
              onPress={() => router.push('/mes-commandes-marche-local')}
              className="flex-row items-center justify-between p-4 rounded-xl border bg-orange-900/30 border-orange-700/50 active:opacity-70"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center bg-orange-600/30">
                  <MapPin size={20} color="#F97316" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-white font-semibold">
                    Marché Local
                  </Text>
                  <Text className="text-orange-400 text-sm">
                    Commandes directes producteurs
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color="#F97316" />
            </Pressable>
          </View>
        )}

        {/* Direct Sales Orders Section - PRODUCERS ONLY */}
        {isProducer && isAuthenticated && (
          <View className="mx-6 mb-6">
            <Pressable
              onPress={() => setShowDirectSalesOrders(!showDirectSalesOrders)}
              className="flex-row items-center justify-between p-4 rounded-xl border bg-amber-900/30 border-amber-700/50 active:opacity-70"
            >
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 rounded-full items-center justify-center bg-amber-600/30">
                  <Home size={20} color="#F59E0B" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-white font-semibold">
                    Vente directe (Ferme)
                  </Text>
                  <Text className="text-sm text-amber-400">
                    Commandes à retirer sur place
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center">
                {showDirectSalesOrders ? (
                  <ChevronUp size={20} color="#6B7280" />
                ) : (
                  <ChevronDown size={20} color="#6B7280" />
                )}
              </View>
            </Pressable>

            {/* Direct Sales Orders List (collapsible) */}
            {showDirectSalesOrders && (
              <View className="mt-3 bg-amber-900/20 rounded-xl p-4 border border-amber-700/30">
                <AdminProducerOrders />
              </View>
            )}
          </View>
        )}

        {/* Pro Section - ONLY FOR PRO/PRODUCERS */}
        {isProUser && isAuthenticated && (
          <View className="mx-6 mb-6">
            {isProducer ? (
              <>
                {/* PRODUCER SECTION - Redesigned with community focus */}

                {/* Header avec message communautaire */}
                <View className="bg-emerald-900/40 rounded-2xl p-4 mb-4 border border-emerald-700/50">
                  <View className="flex-row items-center mb-3">
                    <View className="w-12 h-12 rounded-full bg-emerald-600/30 items-center justify-center">
                      <Leaf size={24} color="#10B981" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-white font-bold text-lg">Espace Producteur</Text>
                      <Text className="text-emerald-400 text-sm">Membre des Chanvriers Unis</Text>
                    </View>
                  </View>
                  <Text className="text-gray-300 text-sm leading-5">
                    Bienvenue dans votre espace dédié. Ensemble, développons la filière chanvre française.
                  </Text>
                </View>

                {/* Stats rapides */}
                <View className="flex-row mb-4" style={{ gap: 8 }}>
                  <View className="flex-1 bg-white/5 rounded-xl p-3 items-center border border-white/10">
                    <Package size={20} color="#818CF8" />
                    <Text className="text-indigo-400 text-xl font-bold mt-1">
                      {linkedProducerFromStore ? linkedProducerFromStore.products?.length || 0 : 0}
                    </Text>
                    <Text className="text-gray-400 text-xs">Produits</Text>
                  </View>
                  <View className="flex-1 bg-white/5 rounded-xl p-3 items-center border border-white/10">
                    <ShoppingBag size={20} color="#F59E0B" />
                    <Text className="text-amber-400 text-xl font-bold mt-1">{myOrders.length}</Text>
                    <Text className="text-gray-400 text-xs">Commandes</Text>
                  </View>
                  <View className="flex-1 bg-white/5 rounded-xl p-3 items-center border border-white/10">
                    <Users size={20} color="#10B981" />
                    <Text className="text-emerald-400 text-xl font-bold mt-1">{producers.length}</Text>
                    <Text className="text-gray-400 text-xs">Producteurs</Text>
                  </View>
                </View>

                {/* Actions principales */}
                <View className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <Text className="text-white font-semibold mb-3">Accès rapide</Text>

                  {/* Ma Fiche Producteur - EN PREMIER car c'est la plus importante */}
                  <Pressable
                    onPress={() => setShowProducerProfile(!showProducerProfile)}
                    className="flex-row items-center p-3 rounded-xl mb-2 active:opacity-70"
                    style={{
                      backgroundColor: isProducerProfileIncomplete ? 'rgba(239, 68, 68, 0.2)' : 'rgba(13, 148, 136, 0.2)',
                      borderWidth: 1,
                      borderColor: isProducerProfileIncomplete ? 'rgba(239, 68, 68, 0.3)' : '#0D948830'
                    }}
                  >
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: isProducerProfileIncomplete ? 'rgba(239, 68, 68, 0.3)' : 'rgba(13, 148, 136, 0.3)' }}
                    >
                      <UserCircle size={20} color={isProducerProfileIncomplete ? '#EF4444' : '#0D9488'} />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-white font-medium">Ma fiche producteur</Text>
                      <Text className="text-xs" style={{ color: isProducerProfileIncomplete ? '#FCA5A5' : '#9CA3AF' }}>
                        {isProducerProfileIncomplete
                          ? 'À compléter pour activer la vente directe'
                          : 'Mes informations et vente directe'
                        }
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      {isProducerProfileIncomplete && (
                        <View className="bg-red-500 rounded-full w-6 h-6 items-center justify-center mr-2">
                          <Text className="text-white text-xs font-bold">!</Text>
                        </View>
                      )}
                      {showProducerProfile ? (
                        <ChevronUp size={20} color={isProducerProfileIncomplete ? '#EF4444' : '#0D9488'} />
                      ) : (
                        <ChevronDown size={20} color={isProducerProfileIncomplete ? '#EF4444' : '#0D9488'} />
                      )}
                    </View>
                  </Pressable>

                  {/* Formulaire fiche producteur (collapsible) */}
                  {showProducerProfile && (
                    <View className="mb-3 bg-teal-900/20 rounded-xl p-4 border border-teal-700/30">
                      <ProducerProfileForm
                        profile={profile ?? null}
                        email={authEmail}
                        onSave={async (data) => {
                          await updateProfile(data);
                          showToast('Fiche producteur mise à jour', 'success');
                        }}
                        isSaving={isUpdatingProfile}
                      />
                    </View>
                  )}

                  {/* Ma Boutique */}
                  <Pressable
                    onPress={() => router.push('/(tabs)/ma-boutique')}
                    className="flex-row items-center p-3 bg-indigo-600/20 rounded-xl mb-2 active:opacity-70"
                    style={{ borderWidth: 1, borderColor: '#818CF830' }}
                  >
                    <View className="w-10 h-10 rounded-full bg-indigo-600/30 items-center justify-center">
                      <ShoppingBag size={20} color="#818CF8" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-white font-medium">Ma Boutique</Text>
                      <Text className="text-gray-400 text-xs">Gérer mes produits et mon catalogue</Text>
                    </View>
                    <ChevronRight size={20} color="#818CF8" />
                  </Pressable>

                  {/* Mes Commandes (lien vers la section commandes) */}
                  <Pressable
                    onPress={() => setShowOrders(!showOrders)}
                    className="flex-row items-center p-3 bg-amber-600/20 rounded-xl active:opacity-70"
                    style={{ borderWidth: 1, borderColor: '#F59E0B30' }}
                  >
                    <View className="w-10 h-10 rounded-full bg-amber-600/30 items-center justify-center">
                      <Package size={20} color="#F59E0B" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-white font-medium">Commandes reçues</Text>
                      <Text className="text-gray-400 text-xs">
                        {myOrders.filter(o => o.status === 'pending').length > 0
                          ? `${myOrders.filter(o => o.status === 'pending').length} en attente`
                          : 'Voir toutes les commandes'
                        }
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      {myOrders.filter(o => o.status === 'pending').length > 0 && (
                        <View className="bg-amber-500 rounded-full w-6 h-6 items-center justify-center mr-2">
                          <Text className="text-white text-xs font-bold">
                            {myOrders.filter(o => o.status === 'pending').length}
                          </Text>
                        </View>
                      )}
                      <ChevronRight size={20} color="#F59E0B" />
                    </View>
                  </Pressable>
                </View>

                {/* Message communautaire */}
                <View className="mt-4 bg-gradient-to-r from-emerald-900/30 to-indigo-900/30 rounded-xl p-4 border border-emerald-700/30">
                  <View className="flex-row items-center">
                    <Leaf size={16} color="#10B981" />
                    <Text className="text-emerald-400 text-sm font-medium ml-2">Ensemble pour le chanvre français</Text>
                  </View>
                  <Text className="text-gray-400 text-xs mt-2">
                    Merci de faire partie de l'aventure des Chanvriers Unis. Votre engagement contribue au développement de la filière.
                  </Text>
                </View>
              </>
            ) : (
              /* PRO SECTION - Original design */
              <View className="bg-indigo-900/30 rounded-2xl p-4 border border-indigo-700/50">
                <View className="flex-row items-center mb-4">
                  <Building2 size={24} color="#818CF8" />
                  <Text className="text-white font-bold text-lg ml-2">Espace Professionnel</Text>
                </View>

                <View className="bg-white/5 rounded-xl p-4 mb-4">
                  <Text className="text-indigo-300 font-semibold mb-3">Avantages professionnels</Text>
                  <View className="flex-row items-center mb-2">
                    <Check size={16} color="#818CF8" />
                    <Text className="text-gray-300 text-sm ml-2">Accès aux tarifs professionnels</Text>
                  </View>
                  <View className="flex-row items-center mb-2">
                    <Check size={16} color="#818CF8" />
                    <Text className="text-gray-300 text-sm ml-2">Commandes en gros volumes</Text>
                  </View>
                  <View className="flex-row items-center mb-2">
                    <Check size={16} color="#818CF8" />
                    <Text className="text-gray-300 text-sm ml-2">Factures conformes pour la comptabilité</Text>
                  </View>
                  <View className="flex-row items-center">
                    <Check size={16} color="#818CF8" />
                    <Text className="text-gray-300 text-sm ml-2">Support dédié</Text>
                  </View>
                </View>

                <View className="flex-row" style={{ gap: 12 }}>
                  <View className="flex-1 bg-white/5 rounded-xl p-3 items-center">
                    <Text className="text-indigo-400 text-2xl font-bold">{myOrders.length}</Text>
                    <Text className="text-gray-400 text-xs">Commandes</Text>
                  </View>
                  <View className="flex-1 bg-white/5 rounded-xl p-3 items-center">
                    <Text className="text-indigo-400 text-2xl font-bold">
                      {myOrders.reduce((sum, order) => sum + order.total, 0).toFixed(0)}€
                    </Text>
                    <Text className="text-gray-400 text-xs">Total dépensé</Text>
                  </View>
                </View>

                <Text className="text-gray-500 text-xs mt-3 text-center">
                  Le système de récompenses professionnelles arrive bientôt
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Referral Card - ONLY FOR CLIENTS */}
        {isClient && (
        <View className="mx-6 bg-amber-900/30 rounded-2xl p-4 mb-6 border border-amber-700/50">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Gift size={24} color="#D4AF37" />
              <Text className="text-white font-semibold ml-2">Parrainage</Text>
            </View>
            <View className="bg-amber-600/30 px-3 py-1 rounded-full">
              <Text className="text-amber-400 font-bold">{referralPoints} pts</Text>
            </View>
          </View>
          <View className="flex-row mt-3" style={{ gap: 12 }}>
            <View className="flex-1 bg-white/5 rounded-xl p-3 items-center">
              <Text className="text-amber-400 text-2xl font-bold">{giftsSent.length}</Text>
              <Text className="text-gray-400 text-xs">Cadeaux envoyés</Text>
            </View>
            <View className="flex-1 bg-white/5 rounded-xl p-3 items-center">
              <Text className="text-amber-400 text-2xl font-bold">{giftsReceived.length}</Text>
              <Text className="text-gray-400 text-xs">Cadeaux reçus</Text>
            </View>
            <View className="flex-1 bg-white/5 rounded-xl p-3 items-center">
              <Text className="text-amber-400 text-2xl font-bold">{giftsSent.filter(g => g.used).length}</Text>
              <Text className="text-gray-400 text-xs">Utilisés</Text>
            </View>
          </View>
          <Text className="text-gray-500 text-xs mt-2 text-center">
            Gagnez 10 pts quand un ami utilise votre cadeau
          </Text>

          {/* Gift Code Input Section */}
          <View className="mt-4 pt-4 border-t border-amber-700/30">
            <Text className="text-gray-400 text-sm mb-2">Entrer un code cadeau</Text>
            <View className="flex-row" style={{ gap: 8 }}>
              <TextInput
                className="flex-1 bg-white/10 rounded-xl px-4 py-3 text-white"
                placeholder="Ex: GIFT-XXXX-XXXX"
                placeholderTextColor="#6B7280"
                value={giftCodeInput}
                onChangeText={(text) => {
                  console.log('[Profile] TextInput changed:', text);
                  setGiftCodeInput(text);
                }}
                autoCapitalize="characters"
              />
              <Pressable
                onPress={handleClaimGiftCode}
                className="bg-amber-600 rounded-xl px-6 items-center justify-center active:opacity-70"
                style={{ minWidth: 60 }}
              >
                <Check size={24} color="#FFFFFF" />
              </Pressable>
            </View>
            {giftCodeError && (
              <Text className="text-red-400 text-xs mt-2">
                Code invalide ou déjà utilisé
              </Text>
            )}
            {giftCodeSuccess && (
              <Text className="text-green-400 text-xs mt-2">
                Cadeau réclamé avec succès !
              </Text>
            )}
          </View>
        </View>
        )}

        {/* Ma Collection Section - ONLY FOR CLIENTS */}
        {isClient && (
        <View className="mx-6 mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Grid3X3 size={20} color="#D4AF37" />
              <Text className="text-white text-lg font-bold ml-2">Ma Collection</Text>
            </View>
            <Pressable
              onPress={() => router.push('/(tabs)/collection')}
              className="flex-row items-center active:opacity-70"
            >
              <Text className="text-teal-400 text-sm font-medium mr-1">Voir tout</Text>
              <ChevronRight size={16} color="#0D9488" />
            </Pressable>
          </View>

          {/* Rarity breakdown mini cards */}
          <View className="flex-row" style={{ gap: 8 }}>
            {(Object.keys(RARITY_CONFIG) as Rarity[]).map((rarity) => {
              const count = collection.filter((item) => item.product.rarity === rarity).length;
              const config = RARITY_CONFIG[rarity];
              return (
                <View
                  key={rarity}
                  style={{
                    flex: 1,
                    backgroundColor: config.bgColor,
                    borderWidth: 1,
                    borderColor: config.borderColor,
                    borderRadius: 12,
                    padding: 12,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: config.color, fontSize: 20, fontWeight: 'bold' }}>
                    {count}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1">{config.label}</Text>
                </View>
              );
            })}
          </View>

          {/* View Collection Button */}
          <Pressable
            onPress={() => router.push('/(tabs)/collection')}
            className="mt-4 bg-amber-900/40 border border-amber-700/50 rounded-xl p-4 flex-row items-center justify-between active:opacity-70"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-amber-600/30 items-center justify-center">
                <Package size={20} color="#D4AF37" />
              </View>
              <View className="ml-3">
                <Text className="text-white font-semibold">{totalProducts} produits</Text>
                <Text className="text-gray-400 text-sm">dans votre collection</Text>
              </View>
            </View>
            <ChevronRight size={20} color="#D4AF37" />
          </Pressable>
        </View>
        )}

        {/* Tickets Section - ONLY FOR CLIENTS */}
        {isClient && (
        <View className="mx-6 mb-6">
          <Text className="text-white text-lg font-bold mb-3">Mes Tickets</Text>

          {/* Current Tickets */}
          <View className="bg-amber-900/30 rounded-2xl p-4 border border-amber-700/50">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-amber-600/30 items-center justify-center">
                  <Ticket size={24} color="#F59E0B" />
                </View>
                <View className="ml-3">
                  <Text className="text-white font-semibold">Tickets disponibles</Text>
                  <Text className="text-gray-400 text-sm">1 ticket par 20€ d'achat</Text>
                </View>
              </View>
              <View className="bg-amber-500 px-4 py-2 rounded-xl">
                <Text className="text-white text-2xl font-bold">{tickets}</Text>
              </View>
            </View>
          </View>
        </View>
        )}

        {/* Menu Items */}
        <View className="mx-6 mb-8">
          <MenuItem
            icon={<Settings size={20} color="#0D9488" />}
            label="Paramètres"
            onPress={() => router.push('/(tabs)/settings')}
          />
        </View>
      </ScrollView>

      {/* Image Cropper Modal */}
      <ImageCropper
        visible={showCropper}
        imageUri={imageToCrop}
        aspectRatio={1}
        onCrop={handleCroppedProfileImage}
        onCancel={() => {
          setShowCropper(false);
          setImageToCrop('');
        }}
      />

      {/* Toast pour les notifications */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
        position="top"
      />
    </View>
  );
}
