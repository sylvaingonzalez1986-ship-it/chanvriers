/**
 * Écran Régions - Liste des producteurs par région
 * Les Chanvriers Unis - Espace Professionnel
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, ScrollView, Pressable, Modal, Dimensions, Image, FlatList } from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  MapPin,
  Users,
  TrendingUp,
  X,
  Leaf,
  Sparkles,
  ShoppingBag,
  Star,
  Mountain,
  Thermometer,
  CloudRain,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/lib/colors';
import { useProducerStore, useProductReviewsStore } from '@/lib/store';
import { usePermissions } from '@/lib/useAuth';
import { Producer, PRODUCT_TYPE_COLORS } from '@/lib/producers';
import { getImageSource } from '@/lib/asset-images';
import {
  FranceRegion,
  FRANCE_REGIONS,
  RegionProducerCount,
  getRegionByName,
  getRegionFromDepartment,
} from '@/types/regions';
import { CultureTypeIcons } from '@/components/CultureTypeIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.715;
const CARD_HEIGHT = CARD_WIDTH * 1.35;
const CARD_SPACING = 16;

// Composant carte producteur - même style que dans map.tsx
function ProducerCardItem({
  producer,
  index,
  scrollX,
  onPress,
}: {
  producer: Producer;
  index: number;
  scrollX: Animated.SharedValue<number>;
  onPress: () => void;
}) {
  const reviews = useProductReviewsStore((s) => s.reviews);
  const producerReviews = reviews.filter((r) => r.producerId === producer.id);
  const averageRating =
    producerReviews.length > 0
      ? producerReviews.reduce((sum, r) => sum + r.rating, 0) / producerReviews.length
      : 0;

  const productTypes = [...new Set(producer.products?.map((p) => p.type) ?? [])];

  // Glow animation
  const glowOpacity = useSharedValue(0.4);

  React.useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 2000 }), withTiming(0.4, { duration: 2000 })),
      -1,
      true
    );
  }, [glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const inputRange = [
    (index - 1) * (CARD_WIDTH + CARD_SPACING),
    index * (CARD_WIDTH + CARD_SPACING),
    (index + 1) * (CARD_WIDTH + CARD_SPACING),
  ];

  const animatedCardStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollX.value, inputRange, [0.9, 1, 0.9], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP);
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: CARD_WIDTH,
        marginHorizontal: CARD_SPACING / 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Glow effect */}
      <Animated.View
        style={[
          glowStyle,
          {
            position: 'absolute',
            width: CARD_WIDTH + 12,
            height: CARD_HEIGHT + 12,
            borderRadius: 24,
            backgroundColor: COLORS.primary.gold,
            shadowColor: COLORS.primary.brightYellow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 25,
          },
        ]}
      />

      {/* Main Card */}
      <Animated.View
        style={[
          animatedCardStyle,
          {
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            borderRadius: 20,
            overflow: 'hidden',
            opacity: 0.65,
          },
        ]}
      >
        <LinearGradient
          colors={[`${COLORS.primary.gold}CC`, `${COLORS.primary.orange}CC`, `${COLORS.clouds.golden}CC`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, padding: 3 }}
        >
          <View
            className="flex-1 rounded-[17px] overflow-hidden"
            style={{ backgroundColor: `${COLORS.background.nightSky}DD` }}
          >
            {/* Card header with image */}
            <View className="h-[38%] relative">
              {producer.image ? (
                <Image source={getImageSource(producer.image)} className="w-full h-full" resizeMode="cover" />
              ) : (
                <View
                  className="w-full h-full items-center justify-center"
                  style={{ backgroundColor: `${COLORS.text.white}10` }}
                >
                  <Leaf size={32} color={COLORS.text.muted} />
                </View>
              )}
              <LinearGradient
                colors={['transparent', `${COLORS.background.nightSky}99`, COLORS.background.nightSky]}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 60,
                }}
              />
              <View className="absolute top-2 left-2">
                <Sparkles size={14} color={COLORS.primary.brightYellow} />
              </View>
              <View
                pointerEvents="none"
                className="absolute inset-0"
                style={{
                  borderWidth: 1.5,
                  borderColor: `${COLORS.primary.gold}50`,
                }}
              />
            </View>

            {/* Card content */}
            <View className="flex-1 px-3 pb-3 -mt-2 justify-between">
              <View>
                {/* Name banner */}
                <View
                  className="rounded-xl px-2 py-2 mb-2"
                  style={{
                    backgroundColor: `${COLORS.primary.gold}25`,
                    borderWidth: 1.5,
                    borderColor: `${COLORS.primary.gold}50`,
                  }}
                >
                  <View className="flex-row items-center justify-center">
                    <Sparkles size={12} color={COLORS.primary.brightYellow} />
                    <Text
                      className="text-sm font-bold text-center mx-1"
                      style={{ color: COLORS.primary.paleGold }}
                      numberOfLines={1}
                    >
                      {producer.name}
                    </Text>
                    <Sparkles size={12} color={COLORS.primary.brightYellow} />
                  </View>
                  {producerReviews.length > 0 && (
                    <View className="flex-row items-center justify-center mt-1">
                      <View className="flex-row">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={10}
                            color={star <= Math.round(averageRating) ? '#F59E0B' : '#4B5563'}
                            fill={star <= Math.round(averageRating) ? '#F59E0B' : 'transparent'}
                            style={{ marginRight: 1 }}
                          />
                        ))}
                      </View>
                      <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold text-xs ml-1">
                        {averageRating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Location */}
                <View className="flex-row items-center justify-center mb-2">
                  <View
                    className="flex-row items-center px-2 py-1 rounded-full"
                    style={{ backgroundColor: `${COLORS.accent.forest}25` }}
                  >
                    <MapPin size={10} color={COLORS.accent.hemp} />
                    <Text
                      className="text-xs ml-1 font-semibold"
                      style={{ color: COLORS.accent.hemp }}
                      numberOfLines={1}
                    >
                      {producer.city ?? 'Ville inconnue'}
                    </Text>
                  </View>
                </View>

                {/* Terroir characteristics */}
                <View className="flex-row justify-center gap-2 mb-2">
                  {/* Soil info */}
                  {producer.soil?.type && (
                    <View
                      className="flex-row items-center px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
                    >
                      <Mountain size={10} color={COLORS.accent.hemp} />
                      <Text className="text-[9px] font-semibold ml-1" style={{ color: COLORS.accent.hemp }} numberOfLines={1}>
                        {producer.soil.type.length > 12 ? producer.soil.type.slice(0, 12) + '...' : producer.soil.type}
                      </Text>
                    </View>
                  )}
                  {/* Climate info */}
                  {producer.climate?.type && (
                    <View
                      className="flex-row items-center px-2 py-1 rounded-full"
                      style={{ backgroundColor: `${COLORS.primary.paleGold}20` }}
                    >
                      <Thermometer size={10} color={COLORS.primary.paleGold} />
                      <Text
                        className="text-[9px] font-semibold ml-1"
                        style={{ color: COLORS.primary.paleGold }}
                        numberOfLines={1}
                      >
                        {producer.climate.type.length > 12 ? producer.climate.type.slice(0, 12) + '...' : producer.climate.type}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Climate details (temp & rainfall) */}
                {(producer.climate?.avgTemp || producer.climate?.rainfall) && (
                  <View className="flex-row justify-center items-center gap-2 mb-2">
                    {producer.climate?.avgTemp && (
                      <View className="flex-row items-center">
                        <Text className="text-[9px]" style={{ color: COLORS.text.muted }}>
                          {producer.climate.avgTemp}
                        </Text>
                      </View>
                    )}
                    {producer.climate?.avgTemp && producer.climate?.rainfall && (
                      <CloudRain size={8} color={COLORS.text.muted} />
                    )}
                    {producer.climate?.rainfall && (
                      <View className="flex-row items-center">
                        <Text className="text-[9px]" style={{ color: COLORS.text.muted }}>
                          {producer.climate.rainfall}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Culture types icons */}
                {(producer.cultureOutdoor || producer.cultureGreenhouse || producer.cultureIndoor) && (
                  <View className="flex-row justify-center mb-2">
                    <CultureTypeIcons
                      outdoor={producer.cultureOutdoor}
                      greenhouse={producer.cultureGreenhouse}
                      indoor={producer.cultureIndoor}
                      size={16}
                      animated={false}
                    />
                  </View>
                )}

                {/* Product count */}
                <View className="items-center mb-1">
                  <Text style={{ color: COLORS.accent.hemp }} className="text-xs font-bold">
                    {`${producer.products?.length ?? 0} produit${(producer.products?.length ?? 0) > 1 ? 's' : ''}`}
                  </Text>
                </View>

                {/* Product type badges */}
                <View className="flex-row flex-wrap justify-center gap-1">
                  {productTypes.length > 0
                    ? productTypes.slice(0, 2).map((type) => (
                        <View
                          key={type}
                          className="px-2 py-0.5 rounded-full flex-row items-center"
                          style={{
                            backgroundColor: `${PRODUCT_TYPE_COLORS[type] ?? '#4ade80'}30`,
                            borderWidth: 1,
                            borderColor: `${PRODUCT_TYPE_COLORS[type] ?? '#4ade80'}50`,
                          }}
                        >
                          <Text
                            className="text-[9px] font-bold capitalize"
                            style={{ color: PRODUCT_TYPE_COLORS[type] ?? '#4ade80' }}
                          >
                            {type}
                          </Text>
                        </View>
                      ))
                    : null}
                </View>
              </View>

              {/* Shop button */}
              <View
                className="rounded-xl py-2 flex-row items-center justify-center"
                style={{
                  backgroundColor: COLORS.accent.forest,
                }}
              >
                <ShoppingBag size={14} color={COLORS.text.white} />
                <Text className="font-bold ml-1.5 text-xs" style={{ color: COLORS.text.white }}>
                  {"Boutique"}
                </Text>
              </View>
            </View>

            {/* Card border */}
            <View
              pointerEvents="none"
              className="absolute inset-0 rounded-[17px]"
              style={{
                borderWidth: 1.5,
                borderColor: `${COLORS.primary.gold}40`,
              }}
            />
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

export default function RegionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPro, isAdmin } = usePermissions();
  const producers = useProducerStore((s) => s.producers);

  const [selectedRegion, setSelectedRegion] = useState<FranceRegion | null>(null);
  const [showCarousel, setShowCarousel] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const scrollX = useSharedValue(0);

  // Vérifier l'accès PRO
  const hasAccess = isPro || isAdmin;

  // Grouper les producteurs par région
  const producersByRegion = useMemo(() => {
    const grouped: Record<string, Producer[]> = {};

    FRANCE_REGIONS.forEach((region) => {
      grouped[region.id] = [];
    });

    producers.forEach((producer) => {
      let region: FranceRegion | undefined;

      if (producer.department) {
        region = getRegionFromDepartment(producer.department);
      }

      if (!region && producer.region) {
        region = getRegionByName(producer.region);
      }

      if (region) {
        grouped[region.id].push(producer);
      }
    });

    return grouped;
  }, [producers]);

  // Compter les producteurs par région
  const producerCounts: RegionProducerCount[] = useMemo(() => {
    return FRANCE_REGIONS.map((region) => ({
      regionId: region.id,
      count: producersByRegion[region.id]?.length || 0,
    }));
  }, [producersByRegion]);

  // Statistiques globales
  const stats = useMemo(() => {
    const totalProducers = producers.length;
    const regionsWithProducers = producerCounts.filter((pc) => pc.count > 0).length;
    const totalProducts = producers.reduce((sum, p) => sum + (p.products?.length || 0), 0);

    return { totalProducers, regionsWithProducers, totalProducts };
  }, [producers, producerCounts]);

  // Gérer le clic sur une région
  const handleRegionPress = useCallback((region: FranceRegion) => {
    setSelectedRegion(region);
    setCurrentIndex(0);
    scrollX.value = 0;
    setShowCarousel(true);
  }, [scrollX]);

  // Fermer le carrousel
  const handleCloseCarousel = useCallback(() => {
    setShowCarousel(false);
    setTimeout(() => setSelectedRegion(null), 300);
  }, []);

  // Naviguer vers la boutique d'un producteur
  const handleProducerPress = useCallback(
    (producer: Producer) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowCarousel(false);
      setSelectedRegion(null);
      router.push({
        pathname: '/(tabs)/shop',
        params: { producerId: producer.id },
      });
    },
    [router]
  );

  // Producteurs de la région sélectionnée
  const selectedProducers = useMemo(() => {
    if (!selectedRegion) return [];
    return producersByRegion[selectedRegion.id] || [];
  }, [selectedRegion, producersByRegion]);

  // Navigation carrousel
  const goToPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  }, [currentIndex]);

  const goToNext = useCallback(() => {
    if (currentIndex < selectedProducers.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    }
  }, [currentIndex, selectedProducers.length]);

  if (!hasAccess) {
    return (
      <View className="flex-1 items-center justify-center p-6" style={{ backgroundColor: COLORS.background.nightSky }}>
        <Text className="text-center" style={{ color: COLORS.text.muted, fontSize: 16 }}>
          {"Cette fonctionnalité est réservée aux professionnels."}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background.nightSky }}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={['#1e293b', COLORS.background.nightSky] as const}
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 16,
          paddingHorizontal: 20,
        }}
      >
        <Animated.View entering={FadeInDown.delay(100).duration(500)}>
          <Text className="font-bold" style={{ color: COLORS.text.cream, fontSize: 28 }}>
            {"Régions"}
          </Text>
          <Text style={{ color: COLORS.text.muted, fontSize: 14, marginTop: 4 }}>
            {"Explorez les producteurs par région"}
          </Text>
        </Animated.View>

        {/* Stats cards */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)} className="flex-row mt-4" style={{ gap: 12 }}>
          <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(74, 222, 128, 0.15)' }}>
            <View className="flex-row items-center">
              <Users size={16} color="#4ade80" />
              <Text className="ml-2 font-bold" style={{ color: '#4ade80', fontSize: 18 }}>
                {stats.totalProducers}
              </Text>
            </View>
            <Text style={{ color: COLORS.text.muted, fontSize: 11, marginTop: 2 }}>{"Producteurs"}</Text>
          </View>

          <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(212, 175, 55, 0.15)' }}>
            <View className="flex-row items-center">
              <MapPin size={16} color={COLORS.primary.gold} />
              <Text className="ml-2 font-bold" style={{ color: COLORS.primary.gold, fontSize: 18 }}>
                {stats.regionsWithProducers}
              </Text>
            </View>
            <Text style={{ color: COLORS.text.muted, fontSize: 11, marginTop: 2 }}>{"Régions actives"}</Text>
          </View>

          <View className="flex-1 rounded-xl p-3" style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)' }}>
            <View className="flex-row items-center">
              <TrendingUp size={16} color="#60a5fa" />
              <Text className="ml-2 font-bold" style={{ color: '#60a5fa', fontSize: 18 }}>
                {stats.totalProducts}
              </Text>
            </View>
            <Text style={{ color: COLORS.text.muted, fontSize: 11, marginTop: 2 }}>{"Produits"}</Text>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Contenu scrollable */}
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Liste des régions avec producteurs */}
        <Animated.View entering={FadeInDown.delay(300).duration(500)} className="px-4 mt-4">
          <Text className="font-bold mb-3" style={{ color: COLORS.text.cream, fontSize: 16 }}>
            {"Régions avec producteurs"}
          </Text>

          {producerCounts
            .filter((pc) => pc.count > 0)
            .sort((a, b) => b.count - a.count)
            .map((pc) => {
              const region = FRANCE_REGIONS.find((r) => r.id === pc.regionId);
              if (!region) return null;

              return (
                <Pressable
                  key={region.id}
                  onPress={() => handleRegionPress(region)}
                  className="flex-row items-center justify-between p-3 rounded-xl mb-2"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  <View className="flex-row items-center flex-1">
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: '#4ade80',
                        marginRight: 10,
                      }}
                    />
                    <Text style={{ color: COLORS.text.cream, fontSize: 14 }} numberOfLines={1}>
                      {region.name}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: COLORS.primary.gold,
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                    }}
                  >
                    <Text style={{ color: '#1a1d2e', fontSize: 12, fontWeight: 'bold' }}>{pc.count}</Text>
                  </View>
                </Pressable>
              );
            })}

          {producerCounts.filter((pc) => pc.count > 0).length === 0 && (
            <View className="items-center py-8">
              <Text style={{ color: COLORS.text.muted, fontSize: 14 }}>
                {"Aucun producteur enregistré pour le moment."}
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Modal Carrousel producteurs - même style que map.tsx */}
      <Modal visible={showCarousel} transparent animationType="none" onRequestClose={handleCloseCarousel}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={{ flex: 1, backgroundColor: `${COLORS.background.nightSky}F5` }}
        >
          {/* Header */}
          <LinearGradient
            colors={[`${COLORS.background.nightSky}`, `${COLORS.background.nightSky}99`, 'transparent']}
            style={{
              paddingTop: insets.top + 10,
              paddingHorizontal: 20,
              paddingBottom: 20,
            }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="font-bold" style={{ color: COLORS.text.cream, fontSize: 22 }}>
                  {selectedRegion?.name ?? 'Région'}
                </Text>
                <Text style={{ color: COLORS.text.muted, fontSize: 13, marginTop: 2 }}>
                  {`${selectedProducers.length} producteur${selectedProducers.length > 1 ? 's' : ''}`}
                </Text>
              </View>

              <Pressable
                onPress={handleCloseCarousel}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: `${COLORS.background.nightSky}E6`,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.primary.gold}60`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={22} color={COLORS.primary.gold} />
              </Pressable>
            </View>
          </LinearGradient>

          {/* Carrousel ou message vide */}
          {selectedProducers.length > 0 ? (
            <View className="flex-1 justify-center">
              <Animated.FlatList
                ref={flatListRef}
                data={selectedProducers}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_WIDTH + CARD_SPACING}
                decelerationRate="fast"
                contentContainerStyle={{
                  paddingHorizontal: (SCREEN_WIDTH - CARD_WIDTH) / 2 - CARD_SPACING / 2,
                }}
                onScroll={(event) => {
                  scrollX.value = event.nativeEvent.contentOffset.x;
                }}
                onMomentumScrollEnd={(event) => {
                  const newIndex = Math.round(event.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_SPACING));
                  setCurrentIndex(newIndex);
                }}
                scrollEventThrottle={16}
                renderItem={({ item, index }) => (
                  <ProducerCardItem
                    producer={item}
                    index={index}
                    scrollX={scrollX}
                    onPress={() => handleProducerPress(item)}
                  />
                )}
              />

              {/* Navigation arrows */}
              {selectedProducers.length > 1 && (
                <>
                  <Pressable
                    onPress={goToPrevious}
                    className="absolute left-3 w-10 h-10 rounded-full items-center justify-center active:scale-95"
                    style={{
                      backgroundColor: `${COLORS.background.nightSky}D0`,
                      borderWidth: 1.5,
                      borderColor: COLORS.primary.gold,
                      opacity: currentIndex === 0 ? 0.4 : 1,
                    }}
                    disabled={currentIndex === 0}
                  >
                    <ChevronLeft size={22} color={COLORS.primary.brightYellow} />
                  </Pressable>
                  <Pressable
                    onPress={goToNext}
                    className="absolute right-3 w-10 h-10 rounded-full items-center justify-center active:scale-95"
                    style={{
                      backgroundColor: `${COLORS.background.nightSky}D0`,
                      borderWidth: 1.5,
                      borderColor: COLORS.primary.gold,
                      opacity: currentIndex === selectedProducers.length - 1 ? 0.4 : 1,
                    }}
                    disabled={currentIndex === selectedProducers.length - 1}
                  >
                    <ChevronRight size={22} color={COLORS.primary.brightYellow} />
                  </Pressable>
                </>
              )}
            </View>
          ) : (
            <View className="flex-1 items-center justify-center">
              <Leaf size={64} color={COLORS.text.muted} />
              <Text
                style={{
                  color: COLORS.text.muted,
                  fontSize: 16,
                  marginTop: 16,
                  textAlign: 'center',
                }}
              >
                {"Aucun producteur dans cette région pour le moment."}
              </Text>
            </View>
          )}

          {/* Pagination dots */}
          {selectedProducers.length > 1 && (
            <View
              className="flex-row justify-center items-center pb-4"
              style={{ paddingBottom: insets.bottom + 16 }}
            >
              {selectedProducers.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: index === currentIndex ? 24 : 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: index === currentIndex ? COLORS.primary.gold : `${COLORS.primary.gold}40`,
                    marginHorizontal: 4,
                  }}
                />
              ))}
            </View>
          )}
        </Animated.View>
      </Modal>
    </View>
  );
}
