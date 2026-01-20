import React from 'react';
import { View, Image, Pressable, Dimensions } from 'react-native';
import { Text } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  FadeIn,
  FadeOut,
  runOnJS,
} from 'react-native-reanimated';
import { X, MapPin, Leaf, Award } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { CBDProduct, RARITY_CONFIG } from '@/lib/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProductRevealProps {
  product: CBDProduct;
  onClose: () => void;
  visible: boolean;
}

export function ProductReveal({ product, onClose, visible }: ProductRevealProps) {
  const rarityConfig = RARITY_CONFIG[product.rarity];
  const cardScale = useSharedValue(0.3);
  const cardOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const glowScale = useSharedValue(0);

  React.useEffect(() => {
    if (visible) {
      // Reveal animation sequence
      cardScale.value = withSequence(
        withTiming(1.1, { duration: 400, easing: Easing.out(Easing.back(1.5)) }),
        withSpring(1, { damping: 15 })
      );
      cardOpacity.value = withTiming(1, { duration: 300 });
      glowScale.value = withSequence(
        withDelay(200, withTiming(1.5, { duration: 600 })),
        withTiming(1, { duration: 400 })
      );
      contentOpacity.value = withDelay(500, withTiming(1, { duration: 300 }));

      // Haptic based on rarity
      if (product.rarity === 'legendary') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (product.rarity === 'epic') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } else {
      cardScale.value = 0.3;
      cardOpacity.value = 0;
      contentOpacity.value = 0;
      glowScale.value = 0;
    }
  }, [visible, product.rarity]);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowScale.value > 0 ? 0.6 : 0,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 z-50"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Glow effect */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: SCREEN_WIDTH * 0.9,
            height: SCREEN_WIDTH * 0.9,
            borderRadius: SCREEN_WIDTH * 0.45,
            backgroundColor: rarityConfig.color,
          },
          glowAnimatedStyle,
        ]}
      />

      {/* Card */}
      <Animated.View style={cardAnimatedStyle}>
        <LinearGradient
          colors={['#1F2F24', '#141F18', '#0A0F0D']}
          style={{
            width: SCREEN_WIDTH * 0.85,
            borderRadius: 24,
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: rarityConfig.color,
          }}
        >
          {/* Rarity banner */}
          <View
            style={{
              backgroundColor: rarityConfig.bgColor,
              paddingVertical: 12,
              alignItems: 'center',
              borderBottomWidth: 1,
              borderBottomColor: rarityConfig.borderColor,
            }}
          >
            <View className="flex-row items-center">
              <Award size={20} color={rarityConfig.color} />
              <Text
                style={{ color: rarityConfig.color }}
                className="text-lg font-bold ml-2 uppercase tracking-wider"
              >
                {rarityConfig.label}
              </Text>
            </View>
          </View>

          {/* Product image */}
          <View className="p-4">
            <Image
              source={{ uri: product.image }}
              style={{
                width: '100%',
                height: 200,
                borderRadius: 16,
              }}
              resizeMode="cover"
            />
          </View>

          {/* Content */}
          <Animated.View style={contentAnimatedStyle} className="px-5 pb-6">
            <Text className="text-white text-2xl font-bold mb-2">
              {product.name}
            </Text>

            <View className="flex-row items-center mb-3">
              <MapPin size={14} color="#9CA3AF" />
              <Text className="text-gray-400 text-sm ml-1">
                {product.producer} • {product.region}
              </Text>
            </View>

            <Text className="text-gray-300 text-base mb-4 leading-6">
              {product.description}
            </Text>

            {/* Stats */}
            <View className="flex-row justify-between mb-4">
              <View className="flex-row items-center bg-green-900/30 px-3 py-2 rounded-lg">
                <Leaf size={16} color="#22C55E" />
                <Text className="text-green-400 font-semibold ml-2">
                  CBD {product.cbdPercent}%
                </Text>
              </View>
              <View className="flex-row items-center bg-gray-800 px-3 py-2 rounded-lg">
                <Text className="text-gray-400 font-medium">
                  THC {'<'}{product.thcPercent}%
                </Text>
              </View>
              <View
                style={{ backgroundColor: rarityConfig.bgColor }}
                className="px-3 py-2 rounded-lg"
              >
                <Text style={{ color: rarityConfig.color }} className="font-bold">
                  {product.value}€
                </Text>
              </View>
            </View>

            {/* Close button */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              className="bg-accent py-4 rounded-xl items-center active:opacity-80"
            >
              <Text className="text-dark font-bold text-lg">Ajouter à ma collection</Text>
            </Pressable>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* Close X button */}
      <Pressable
        onPress={onClose}
        className="absolute top-16 right-6 w-10 h-10 bg-white/10 rounded-full items-center justify-center"
      >
        <X size={24} color="white" />
      </Pressable>
    </Animated.View>
  );
}
