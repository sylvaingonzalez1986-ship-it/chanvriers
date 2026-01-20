import React from 'react';
import { View, Pressable, Image, Dimensions } from 'react-native';
import { Text } from '@/components/ui';
import { MapPin, X, Leaf, ShoppingBag, Sparkles, Star, ChevronLeft, ChevronRight, Instagram, Facebook, Twitter, Youtube, Globe } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Producer, PRODUCT_TYPE_COLORS, getProducerDisplayName } from '@/lib/producers';
import { COLORS } from '@/lib/colors';
import { useProductReviewsStore } from '@/lib/store';
import { getImageSource } from '@/lib/asset-images';
import { CultureTypeIcons } from '@/components/CultureTypeIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 50;
const CARD_HEIGHT = CARD_WIDTH * 1.35;

interface PokemonCardProps {
  producer: Producer;
  visible: boolean;
  onClose: () => void;
  onViewDetails?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  currentIndex?: number;
  totalCount?: number;
}

export const PokemonCard = ({
  producer,
  visible,
  onClose,
  onPrevious,
  onNext,
  currentIndex = 0,
  totalCount = 0,
}: PokemonCardProps) => {
  const router = useRouter();

  // Get reviews for this producer (average of all product reviews)
  const reviews = useProductReviewsStore((s) => s.reviews);
  const producerReviews = reviews.filter((r) => r.producerId === producer.id);
  const averageRating = producerReviews.length > 0
    ? producerReviews.reduce((sum, r) => sum + r.rating, 0) / producerReviews.length
    : 0;

  // Glow animation - magical pulsing effect
  const glowOpacity = useSharedValue(0.4);
  const starRotation = useSharedValue(0);

  React.useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 })
      ),
      -1,
      true
    );
    starRotation.value = withRepeat(
      withTiming(360, { duration: 8000 }),
      -1,
      false
    );
  }, [glowOpacity, starRotation]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  if (!visible) return null;

  // Get unique product types for badges
  const productTypes = [...new Set(producer.products.map((p) => p.type))];

  // Check if producer has any social links
  const hasSocialLinks = producer.socialLinks && (
    producer.socialLinks.instagram ||
    producer.socialLinks.facebook ||
    producer.socialLinks.twitter ||
    producer.socialLinks.tiktok ||
    producer.socialLinks.youtube ||
    producer.socialLinks.website
  );

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(15, 26, 46, 0.95)' }}
    >
      {/* Backdrop press to close */}
      <Pressable className="absolute inset-0" onPress={onClose} />

      {/* Navigation arrows */}
      {onPrevious && (
        <Pressable
          onPress={onPrevious}
          className="absolute left-2 z-20 w-12 h-12 rounded-full items-center justify-center active:scale-95"
          style={{
            backgroundColor: `${COLORS.background.nightSky}E0`,
            borderWidth: 2,
            borderColor: COLORS.primary.gold,
            shadowColor: COLORS.primary.gold,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
          }}
        >
          <ChevronLeft size={28} color={COLORS.primary.brightYellow} />
        </Pressable>
      )}
      {onNext && (
        <Pressable
          onPress={onNext}
          className="absolute right-2 z-20 w-12 h-12 rounded-full items-center justify-center active:scale-95"
          style={{
            backgroundColor: `${COLORS.background.nightSky}E0`,
            borderWidth: 2,
            borderColor: COLORS.primary.gold,
            shadowColor: COLORS.primary.gold,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
          }}
        >
          <ChevronRight size={28} color={COLORS.primary.brightYellow} />
        </Pressable>
      )}

      {/* Counter indicator */}
      {totalCount > 1 && (
        <View
          className="absolute bottom-8 px-4 py-2 rounded-full"
          style={{
            backgroundColor: `${COLORS.background.nightSky}E0`,
            borderWidth: 1.5,
            borderColor: `${COLORS.primary.gold}50`,
          }}
        >
          <Text style={{ color: COLORS.primary.paleGold }} className="font-bold text-sm">
            {currentIndex + 1} / {totalCount}
          </Text>
        </View>
      )}

      {/* Magical glow effect behind card */}
      <Animated.View
        style={[
          glowStyle,
          {
            position: 'absolute',
            width: CARD_WIDTH + 30,
            height: CARD_HEIGHT + 30,
            borderRadius: 32,
            backgroundColor: COLORS.primary.gold,
            shadowColor: COLORS.primary.brightYellow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 40,
          },
        ]}
      />

      {/* Secondary glow - green accent */}
      <Animated.View
        style={[
          glowStyle,
          {
            position: 'absolute',
            width: CARD_WIDTH + 20,
            height: CARD_HEIGHT + 20,
            borderRadius: 30,
            backgroundColor: COLORS.accent.forest,
            shadowColor: COLORS.accent.hemp,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 30,
            opacity: 0.3,
          },
        ]}
      />

      {/* Decorative floating stars */}
      <Animated.View style={[starStyle, { position: 'absolute', top: '15%', left: '10%' }]}>
        <Star size={16} color={COLORS.primary.brightYellow} fill={COLORS.primary.brightYellow} />
      </Animated.View>
      <Animated.View style={[starStyle, { position: 'absolute', top: '20%', right: '15%' }]}>
        <Sparkles size={14} color={COLORS.clouds.golden} />
      </Animated.View>

      {/* Main Card */}
      <Animated.View
        entering={ZoomIn.springify().damping(14)}
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          borderRadius: 28,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[COLORS.primary.gold, COLORS.primary.orange, COLORS.clouds.golden]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, padding: 4 }}
        >
          {/* Inner card with night sky background */}
          <View
            className="flex-1 rounded-[24px] overflow-hidden"
            style={{ backgroundColor: COLORS.background.nightSky }}
          >
            {/* Close button */}
            <Pressable
              onPress={onClose}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full items-center justify-center"
              style={{
                backgroundColor: `${COLORS.background.nightSky}90`,
                borderWidth: 1.5,
                borderColor: `${COLORS.primary.gold}50`,
              }}
            >
              <X size={18} color={COLORS.primary.paleGold} />
            </Pressable>

            {/* Card header with image */}
            <View className="h-[42%] relative">
              {producer.image ? (
                <Image
                  source={getImageSource(producer.image)}
                  className="w-full h-full"
                  resizeMode="cover"
                  onError={(e) => {
                    console.log('[PokemonCard] Image load error for producer:', producer.name, {
                      image: producer.image,
                      imageSource: getImageSource(producer.image),
                      error: e.nativeEvent.error
                    });
                  }}
                  onLoad={() => {
                    console.log('[PokemonCard] Image loaded successfully for:', producer.name);
                  }}
                />
              ) : (
                <View className="w-full h-full items-center justify-center" style={{ backgroundColor: `${COLORS.text.white}10` }}>
                  <Leaf size={48} color={COLORS.text.muted} />
                </View>
              )}
              {/* Gradient overlay with magical effect */}
              <LinearGradient
                colors={['transparent', `${COLORS.background.nightSky}99`, COLORS.background.nightSky]}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 100,
                }}
              />

              {/* Sparkle decorations on image */}
              <View className="absolute top-4 left-4">
                <Sparkles size={20} color={COLORS.primary.brightYellow} />
              </View>

              {/* Golden border effect */}
              <View
                pointerEvents="none"
                className="absolute inset-0"
                style={{
                  borderWidth: 2,
                  borderColor: `${COLORS.primary.gold}50`,
                }}
              />
            </View>

            {/* Card content */}
            <View className="flex-1 px-5 pb-4 -mt-4 justify-between">
              {/* Top content section */}
              <View>
                {/* Name banner with magical style */}
                <View
                  className="rounded-2xl px-4 py-3 mb-3"
                  style={{
                    backgroundColor: `${COLORS.primary.gold}25`,
                    borderWidth: 2,
                    borderColor: `${COLORS.primary.gold}50`,
                    shadowColor: COLORS.primary.gold,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                  }}
                >
                  <View className="flex-row items-center justify-center">
                    <Sparkles size={16} color={COLORS.primary.brightYellow} />
                    <Text
                      className="text-xl font-bold text-center mx-2"
                      style={{ color: COLORS.primary.paleGold }}
                    >
                      {getProducerDisplayName(producer)}
                    </Text>
                    <Sparkles size={16} color={COLORS.primary.brightYellow} />
                  </View>
                  {/* Average Rating */}
                  {producerReviews.length > 0 && (
                    <View className="flex-row items-center justify-center mt-2">
                      <View className="flex-row">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={16}
                            color={star <= Math.round(averageRating) ? '#F59E0B' : '#4B5563'}
                            fill={star <= Math.round(averageRating) ? '#F59E0B' : 'transparent'}
                            style={{ marginRight: 2 }}
                          />
                        ))}
                      </View>
                      <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold ml-2">
                        {averageRating.toFixed(1)}
                      </Text>
                      <Text style={{ color: COLORS.text.muted }} className="text-xs ml-1">
                        ({producerReviews.length})
                      </Text>
                    </View>
                  )}
                </View>

                {/* Location with fancy styling */}
                <View className="flex-row items-center justify-center mb-3">
                  <View
                    className="flex-row items-center px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: 'rgba(147, 112, 219, 0.2)' }}
                  >
                    <MapPin size={14} color="#9370DB" />
                    <Text
                      className="text-sm ml-1.5 font-semibold"
                      style={{ color: '#9370DB' }}
                    >
                      {producer.city}, {producer.region}
                    </Text>
                  </View>
                </View>

                {/* Attributs du terroir - empilés verticalement */}
                <View className="mb-3">
                  {/* Département */}
                  <View
                    className="flex-row items-center px-3 py-2 rounded-xl mb-2"
                    style={{
                      backgroundColor: `${COLORS.characteristics.departement}15`,
                      borderWidth: 1,
                      borderColor: `${COLORS.characteristics.departement}30`,
                    }}
                  >
                    <View
                      className="w-6 h-6 rounded-md items-center justify-center mr-2"
                      style={{ backgroundColor: COLORS.characteristics.departement }}
                    >
                      <MapPin size={12} color="#FFFFFF" />
                    </View>
                    <Text style={{ color: COLORS.characteristics.departement }} className="text-xs font-bold uppercase">Département</Text>
                    <Text style={{ color: COLORS.characteristics.departement }} className="text-sm font-bold ml-auto">{producer.department || '-'}</Text>
                  </View>

                  {/* Terre */}
                  <View
                    className="flex-row items-center px-3 py-2 rounded-xl mb-2"
                    style={{
                      backgroundColor: `${COLORS.characteristics.terre}15`,
                      borderWidth: 1,
                      borderColor: `${COLORS.characteristics.terre}30`,
                    }}
                  >
                    <View
                      className="w-6 h-6 rounded-md items-center justify-center mr-2"
                      style={{ backgroundColor: COLORS.characteristics.terre }}
                    >
                      <Leaf size={12} color="#FFFFFF" />
                    </View>
                    <Text style={{ color: COLORS.characteristics.terre }} className="text-xs font-bold uppercase">Terre</Text>
                    <Text style={{ color: COLORS.characteristics.terre }} className="text-sm font-bold ml-auto">{producer.soil.type || '-'}</Text>
                  </View>

                  {/* Climat */}
                  <View
                    className="flex-row items-center px-3 py-2 rounded-xl"
                    style={{
                      backgroundColor: `${COLORS.characteristics.climat}15`,
                      borderWidth: 1,
                      borderColor: `${COLORS.characteristics.climat}30`,
                    }}
                  >
                    <View
                      className="w-6 h-6 rounded-md items-center justify-center mr-2"
                      style={{ backgroundColor: COLORS.characteristics.climat }}
                    >
                      <Sparkles size={12} color="#FFFFFF" />
                    </View>
                    <Text style={{ color: COLORS.characteristics.climat }} className="text-xs font-bold uppercase">Climat</Text>
                    <Text style={{ color: COLORS.characteristics.climat }} className="text-sm font-bold ml-auto">{producer.climate.type || '-'}</Text>
                  </View>
                </View>

                {/* Culture type icons (Outdoor/Greenhouse/Indoor) */}
                <View className="flex-row items-center justify-center mb-3">
                  <CultureTypeIcons
                    outdoor={producer.cultureOutdoor === true}
                    greenhouse={producer.cultureGreenhouse === true}
                    indoor={producer.cultureIndoor === true}
                    size={18}
                    animated={true}
                  />
                  {/* Si aucune culture n'est définie, afficher un placeholder */}
                  {!producer.cultureOutdoor && !producer.cultureGreenhouse && !producer.cultureIndoor && (
                    <Text style={{ color: COLORS.text.muted, fontSize: 11 }}>
                      Culture non définie
                    </Text>
                  )}
                </View>

                {/* Product type badges - colorful pills */}
                <View className="flex-row flex-wrap justify-center gap-2">
                  {productTypes.length > 0 ? (
                    productTypes.slice(0, 3).map((type) => (
                      <View
                        key={type}
                        className="px-3 py-1.5 rounded-full flex-row items-center"
                        style={{
                          backgroundColor: `${PRODUCT_TYPE_COLORS[type]}30`,
                          borderWidth: 1.5,
                          borderColor: `${PRODUCT_TYPE_COLORS[type]}50`,
                        }}
                      >
                        <Leaf size={12} color={PRODUCT_TYPE_COLORS[type]} />
                        <Text
                          className="text-xs font-bold ml-1.5 capitalize"
                          style={{ color: PRODUCT_TYPE_COLORS[type] }}
                        >
                          {type}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={{ color: COLORS.text.muted }} className="text-xs">Aucun produit</Text>
                  )}
                </View>
              </View>

              {/* Bottom section - always at bottom */}
              <View>
                {/* Social links */}
                {hasSocialLinks ? (
                  <View className="flex-row items-center justify-center gap-3 mb-3">
                    {producer.socialLinks?.instagram ? (
                      <Pressable
                        onPress={() => Linking.openURL(producer.socialLinks!.instagram!)}
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{ backgroundColor: '#E1306C25', borderWidth: 1, borderColor: '#E1306C50' }}
                      >
                        <Instagram size={18} color="#E1306C" />
                      </Pressable>
                    ) : null}
                    {producer.socialLinks?.facebook ? (
                      <Pressable
                        onPress={() => Linking.openURL(producer.socialLinks!.facebook!)}
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{ backgroundColor: '#1877F225', borderWidth: 1, borderColor: '#1877F250' }}
                      >
                        <Facebook size={18} color="#1877F2" />
                      </Pressable>
                    ) : null}
                    {producer.socialLinks?.twitter ? (
                      <Pressable
                        onPress={() => Linking.openURL(producer.socialLinks!.twitter!)}
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{ backgroundColor: '#1DA1F225', borderWidth: 1, borderColor: '#1DA1F250' }}
                      >
                        <Twitter size={18} color="#1DA1F2" />
                      </Pressable>
                    ) : null}
                    {producer.socialLinks?.tiktok ? (
                      <Pressable
                        onPress={() => Linking.openURL(producer.socialLinks!.tiktok!)}
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{ backgroundColor: '#FFFFFF15', borderWidth: 1, borderColor: '#FFFFFF30' }}
                      >
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>TT</Text>
                      </Pressable>
                    ) : null}
                    {producer.socialLinks?.youtube ? (
                      <Pressable
                        onPress={() => Linking.openURL(producer.socialLinks!.youtube!)}
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{ backgroundColor: '#FF000025', borderWidth: 1, borderColor: '#FF000050' }}
                      >
                        <Youtube size={18} color="#FF0000" />
                      </Pressable>
                    ) : null}
                    {producer.socialLinks?.website ? (
                      <Pressable
                        onPress={() => Linking.openURL(producer.socialLinks!.website!)}
                        className="w-9 h-9 rounded-full items-center justify-center"
                        style={{ backgroundColor: `${COLORS.primary.gold}25`, borderWidth: 1, borderColor: `${COLORS.primary.gold}50` }}
                      >
                        <Globe size={18} color={COLORS.primary.gold} />
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}

                {/* View shop button - Magical style */}
                <Pressable
                  onPress={() => {
                    onClose();
                    router.push({ pathname: '/(tabs)/shop', params: { producerId: producer.id } });
                  }}
                  className="rounded-2xl py-3.5 flex-row items-center justify-center active:opacity-80"
                  style={{
                    backgroundColor: COLORS.accent.forest,
                    shadowColor: COLORS.accent.hemp,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                  }}
                >
                  <ShoppingBag size={18} color={COLORS.text.white} />
                  <Text
                    className="font-bold ml-2"
                    style={{ color: COLORS.text.white }}
                  >
                    Voir la boutique
                  </Text>
                  <Sparkles size={14} color={COLORS.primary.brightYellow} style={{ marginLeft: 8 }} />
                </Pressable>
              </View>
            </View>

            {/* Card border shine effect - double border */}
            <View
              pointerEvents="none"
              className="absolute inset-0 rounded-[24px]"
              style={{
                borderWidth: 2,
                borderColor: `${COLORS.primary.gold}40`,
              }}
            />
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
};
