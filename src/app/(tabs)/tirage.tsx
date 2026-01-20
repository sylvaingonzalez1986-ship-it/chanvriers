import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Pressable, Image, Dimensions, Alert } from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, Ticket, Volume2, VolumeX } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Preload the machine image at module level for instant display
const machineImage = require('../../../assets/image-1767822177.png');
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, withRepeat, Easing } from 'react-native-reanimated';
import { ProductReveal } from '@/components/ProductReveal';
import { drawRandomProduct } from '@/lib/products';
import { useCollectionStore, useLotsStore, useSubscriptionStore, useSoundStore, useSupabaseSyncStore, useReferralStore, Lot } from '@/lib/store';
import { CBDProduct } from '@/lib/types';
import { isSupabaseSyncConfigured, fetchAllLotsWithItems, recordUserWonLot } from '@/lib/supabase-sync';
import { usePermissions } from '@/lib/useAuth';

const SPIN_PRICE = 25;
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper to convert Lot to CBDProduct for display
function lotToCBDProduct(lot: Lot): CBDProduct {
  return {
    id: lot.id,
    name: lot.name,
    description: lot.description || `Lot contenant ${lot.items.length} produit(s)`,
    producer: lot.items.length > 0 ? lot.items[0].producerName : 'Les Chanvriers Unis',
    region: 'France',
    rarity: lot.rarity,
    thcPercent: 0.2,
    cbdPercent: 10,
    image: lot.image || 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400',
    value: lot.value,
  };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [isSpinning, setIsSpinning] = useState(false);
  const [revealedProduct, setRevealedProduct] = useState<CBDProduct | null>(null);
  const [revealedLot, setRevealedLot] = useState<Lot | null>(null);
  const [showReveal, setShowReveal] = useState(false);

  const totalSpins = useCollectionStore((s) => s.totalSpins);
  const addToCollection = useCollectionStore((s) => s.addToCollection);
  const incrementSpins = useCollectionStore((s) => s.incrementSpins);

  // Subscription and tickets
  const tickets = useSubscriptionStore((s) => s.tickets);
  const consumeTicket = useSubscriptionStore((s) => s.useTicket);
  const refreshTickets = useSubscriptionStore((s) => s.refreshTickets);

  // Sound settings
  const isMuted = useSoundStore((s) => s.isMuted);
  const toggleMute = useSoundStore((s) => s.toggleMute);

  // Admin and sync status
  const { isAdmin } = usePermissions();
  const syncedLots = useSupabaseSyncStore((s) => s.syncedLots);
  const setSyncedLots = useSupabaseSyncStore((s) => s.setSyncedLots);

  // User referral code for tracking won lots
  const myCode = useReferralStore((s) => s.myCode);
  const generateMyCode = useReferralStore((s) => s.generateMyCode);

  // Refresh tickets on mount (check if new month)
  useEffect(() => {
    refreshTickets();
  }, [refreshTickets]);

  // Load lots from Supabase for non-admin users
  useEffect(() => {
    const loadLotsFromSupabase = async () => {
      if (!isAdmin && isSupabaseSyncConfigured()) {
        try {
          const lots = await fetchAllLotsWithItems();
          if (lots.length > 0) {
            setSyncedLots(lots);
          }
        } catch (error) {
          console.error('Error loading lots from Supabase:', error);
        }
      }
    };
    loadLotsFromSupabase();
  }, [isAdmin, setSyncedLots]);

  // Use lots from the store - admin uses local, others use synced
  const localLots = useLotsStore((s) => s.lots);
  const drawRandomLot = useLotsStore((s) => s.drawRandomLot);

  // Get active lots based on admin status
  const getActiveLots = useCallback((): Lot[] => {
    if (isAdmin) {
      return localLots.filter((lot) => lot.active);
    }
    return syncedLots.filter((lot) => lot.active);
  }, [isAdmin, localLots, syncedLots]);

  // Draw a random lot from synced or local data
  const drawLot = useCallback((): Lot | null => {
    if (isAdmin) {
      return drawRandomLot();
    }

    const activeLots = getActiveLots();
    if (activeLots.length === 0) return null;

    // Calculate total probability
    const RARITY_CONFIG = {
      common: { probability: 97.87 },
      rare: { probability: 1.33 },
      epic: { probability: 0.5 },
      platinum: { probability: 0.2 },
      legendary: { probability: 0.1 },
    };

    const random = Math.random() * 100;
    let cumulative = 0;
    let selectedRarity = 'common';

    for (const [rarity, config] of Object.entries(RARITY_CONFIG)) {
      cumulative += config.probability;
      if (random <= cumulative) {
        selectedRarity = rarity;
        break;
      }
    }

    const lotsOfRarity = activeLots.filter((lot) => lot.rarity === selectedRarity);
    const eligibleLots = lotsOfRarity.length > 0 ? lotsOfRarity : activeLots;
    const randomIndex = Math.floor(Math.random() * eligibleLots.length);
    return eligibleLots[randomIndex] ?? null;
  }, [isAdmin, drawRandomLot, getActiveLots]);

  const leverRotation = useSharedValue(0);
  const machineShake = useSharedValue(0);

  const animatedLeverStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${leverRotation.value}deg` },
    ],
  }));

  const animatedMachineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: machineShake.value },
    ],
  }));

  const handleOpenBox = useCallback(() => {
    if (isSpinning) return;

    // Check if user has tickets
    if (tickets <= 0) {
      Alert.alert(
        'Pas de ticket',
        'Vous n\'avez plus de tickets. Abonnez-vous pour recevoir des tickets chaque mois!',
        [{ text: 'OK' }]
      );
      return;
    }

    // Use a ticket
    const success = consumeTicket();
    if (!success) return;

    // Lever pull animation
    leverRotation.value = withSequence(
      withTiming(25, { duration: 200, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 400, easing: Easing.bounce })
    );

    // Machine shake animation
    machineShake.value = withSequence(
      withTiming(0, { duration: 300 }),
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 50 }),
          withTiming(3, { duration: 50 })
        ),
        10,
        true
      ),
      withTiming(0, { duration: 100 })
    );

    setIsSpinning(true);

    // Simulate spin duration
    setTimeout(async () => {
      // Try to draw from lots first, fall back to default products
      const drawnLot = drawLot();
      let product: CBDProduct;

      if (drawnLot) {
        product = lotToCBDProduct(drawnLot);
        setRevealedLot(drawnLot);

        // Record the won lot in Supabase for ALL users (including admin) so gift codes work
        if (isSupabaseSyncConfigured()) {
          const userCode = myCode || generateMyCode();
          const lotType = drawnLot.lotType ?? 'product';
          // Fire and forget - don't block the UI
          recordUserWonLot(userCode, drawnLot, lotType).then((savedLot) => {
            if (savedLot) {
              console.log('[Tirage] Lot saved to Supabase with gift code:', savedLot.giftCode);
            }
          }).catch((err) => {
            console.log('[Tirage] Could not save to Supabase:', err?.message);
          });
        }
      } else {
        // Fallback to default products if no lots are active
        product = drawRandomProduct();
        setRevealedLot(null);
      }

      setRevealedProduct(product);
      setIsSpinning(false);
      setShowReveal(true);
      incrementSpins();
    }, 1500);
  }, [isSpinning, incrementSpins, leverRotation, machineShake, drawLot, tickets, consumeTicket, isAdmin, myCode, generateMyCode]);

  const handleCloseReveal = useCallback(() => {
    if (revealedProduct) {
      // Pass lot info to addToCollection if available
      const lotInfo = revealedLot ? {
        lotId: revealedLot.id,
        lotType: revealedLot.lotType ?? 'product' as const,
        discountPercent: revealedLot.discountPercent,
        discountAmount: revealedLot.discountAmount,
        minOrderAmount: revealedLot.minOrderAmount,
      } : undefined;
      addToCollection(revealedProduct, lotInfo);
    }
    setShowReveal(false);
    setRevealedProduct(null);
    setRevealedLot(null);
  }, [revealedProduct, revealedLot, addToCollection]);

  const machineSize = SCREEN_WIDTH * 0.85;

  return (
    <View className="flex-1">
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460', '#1a1a2e']}
        locations={[0, 0.3, 0.7, 1]}
        style={{ flex: 1 }}
      >
        {/* Header - compact */}
        <View className="px-5 pt-3 pb-2" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center justify-end">
            <View className="flex-row items-center gap-2">
              {/* Tickets display */}
              <View className="px-3 py-1.5 rounded-full flex-row items-center" style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.4)' }}>
                <Ticket size={14} color="#FBBF24" />
                <Text style={{ color: '#FBBF24' }} className="text-xs font-bold ml-1">
                  {tickets}
                </Text>
              </View>
              <View className="px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <Text style={{ color: 'rgba(255, 255, 255, 0.8)' }} className="text-xs font-medium">
                  {totalSpins} tirages
                </Text>
              </View>
              {/* Sound toggle */}
              <Pressable
                onPress={toggleMute}
                className="w-9 h-9 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                {isMuted ? (
                  <VolumeX size={18} color="rgba(255, 255, 255, 0.6)" />
                ) : (
                  <Volume2 size={18} color="#FBBF24" />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* Slot Machine - centered */}
        <View className="flex-1 items-center justify-center">
          <Animated.View style={animatedMachineStyle}>
            <View style={{ width: machineSize, height: machineSize * 1.3, position: 'relative' }}>
              {/* Machine Image */}
              <Image
                source={machineImage}
                fadeDuration={0}
                style={{
                  width: '100%',
                  height: '100%',
                  resizeMode: 'contain',
                }}
              />

              {/* Lever touchable area - positioned on the right arm */}
              <Pressable
                onPress={handleOpenBox}
                disabled={isSpinning || tickets <= 0}
                style={{
                  position: 'absolute',
                  right: 0,
                  top: machineSize * 0.45,
                  width: machineSize * 0.22,
                  height: machineSize * 0.35,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Animated.View
                  style={[
                    {
                      width: '100%',
                      height: '100%',
                      backgroundColor: 'rgba(255,0,0,0.0)',
                    },
                    animatedLeverStyle,
                  ]}
                />
              </Pressable>
            </View>
          </Animated.View>
        </View>

        {/* Bottom section - fixed at bottom */}
        <View className="px-4 pb-2">
          {/* Rarities info */}
          <View className="rounded-xl p-3 mb-3" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' }}>
            <View className="flex-row items-center mb-2">
              <Sparkles size={14} color="#FBBF24" />
              <Text style={{ color: 'rgba(255, 255, 255, 0.9)' }} className="font-semibold text-sm ml-2">Raretés disponibles</Text>
            </View>
            <View className="flex-row justify-between">
              <View className="items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-gray-400 mb-0.5" />
                <Text style={{ color: 'rgba(255, 255, 255, 0.7)' }} className="text-xs font-medium">Commun</Text>
              </View>
              <View className="items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mb-0.5" />
                <Text style={{ color: '#60A5FA' }} className="text-xs font-medium">Rare</Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.5)' }} className="text-[10px]">1/75</Text>
              </View>
              <View className="items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-purple-500 mb-0.5" />
                <Text style={{ color: '#A78BFA' }} className="text-xs font-medium">Épique</Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.5)' }} className="text-[10px]">1/200</Text>
              </View>
              <View className="items-center">
                <View className="w-2.5 h-2.5 rounded-full mb-0.5" style={{ backgroundColor: '#E5E4E2' }} />
                <Text style={{ color: '#E5E4E2' }} className="text-xs font-medium">Platine</Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.5)' }} className="text-[10px]">1/500</Text>
              </View>
              <View className="items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-amber-500 mb-0.5" />
                <Text style={{ color: '#FBBF24' }} className="text-xs font-medium">Légendaire</Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.5)' }} className="text-[10px]">1/1000</Text>
              </View>
            </View>
          </View>

          {/* Play button */}
          <Pressable
            onPress={handleOpenBox}
            disabled={isSpinning || tickets <= 0}
            className="w-full"
          >
            <LinearGradient
              colors={isSpinning ? ['#4B5563', '#374151'] : tickets <= 0 ? ['#6B7280', '#4B5563'] : ['#FBBF24', '#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                paddingVertical: 16,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ticket size={20} color="white" />
              <Text className="text-white font-bold text-lg ml-2">
                {isSpinning ? 'Tirage en cours...' : tickets <= 0 ? 'Pas de ticket (0)' : `Jouer (${tickets} ticket${tickets > 1 ? 's' : ''})`}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Product reveal modal */}
        {revealedProduct && (
          <ProductReveal
            product={revealedProduct}
            onClose={handleCloseReveal}
            visible={showReveal}
          />
        )}
      </LinearGradient>
    </View>
  );
}
