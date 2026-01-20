/**
 * BourseProductBubble - Les Chanvriers Unis
 * Composant de bulle animée représentant un produit sur la bourse
 */

import React, { useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ProductMarketState } from '@/lib/supabase-bourse';
import { COLORS } from '@/lib/colors';
import { TrendingUp, TrendingDown, AlertTriangle, Package } from 'lucide-react-native';

interface BourseProductBubbleProps {
  marketState: ProductMarketState;
  onPress: (productId: string) => void;
  minSize?: number;
  maxSize?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BourseProductBubble({
  marketState,
  onPress,
  minSize = 80,
  maxSize = 160,
}: BourseProductBubbleProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const {
    product_id,
    dynamic_price,
    base_price,
    min_price,
    max_price,
    variation_percent,
    stock_available,
    total_pro_demand,
    product,
  } = marketState;

  // Calculer la taille de la bulle en fonction du prix dynamique
  const priceRatio = max_price > min_price
    ? (dynamic_price - min_price) / (max_price - min_price)
    : 0.5;
  const bubbleSize = minSize + priceRatio * (maxSize - minSize);

  // Déterminer la couleur en fonction de la variation
  const isPositive = variation_percent > 1;
  const isNegative = variation_percent < -1;
  const isNeutral = !isPositive && !isNegative;
  const isLowStock = stock_available > 0 && stock_available < 10;
  const isOutOfStock = stock_available <= 0;

  // Couleurs de gradient
  const gradientColors = isOutOfStock
    ? ['#4A4A4A', '#2D2D2D', '#1A1A1A'] as const
    : isPositive
    ? ['#22C55E', '#16A34A', '#15803D'] as const
    : isNegative
    ? ['#EF4444', '#DC2626', '#B91C1C'] as const
    : ['#6B7280', '#4B5563', '#374151'] as const;

  // Couleur de la bordure lumineuse
  const glowColor = isOutOfStock
    ? 'rgba(75, 85, 99, 0.5)'
    : isPositive
    ? 'rgba(34, 197, 94, 0.6)'
    : isNegative
    ? 'rgba(239, 68, 68, 0.6)'
    : 'rgba(107, 114, 128, 0.5)';

  // Nom abrégé du produit
  const productName = product?.name || 'Produit';
  const shortName = productName.length > 12
    ? productName.substring(0, 10) + '...'
    : productName;

  // Initiales du produit
  const initials = productName
    .split(' ')
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
    pressed.value = withTiming(1, { duration: 100 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [scale, pressed]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    pressed.value = withTiming(0, { duration: 200 });
  }, [scale, pressed]);

  const handlePress = useCallback(() => {
    console.log('[BourseProductBubble] Pressed:', product_id, product?.name);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress(product_id);
  }, [onPress, product_id, product?.name]);

  const animatedStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(
      pressed.value,
      [0, 1],
      [0.4, 0.7],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale: scale.value }],
      shadowOpacity,
    };
  });

  const pulseStyle = useAnimatedStyle(() => {
    // Pulse léger pour les produits avec forte variation
    const pulseIntensity = Math.abs(variation_percent) > 15 ? 1 : 0;
    const pulseScale = interpolate(
      pressed.value,
      [0, 1],
      [1, 1.02],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale: pulseScale }],
      opacity: 0.3 + pulseIntensity * 0.2,
    };
  });

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[
        animatedStyle,
        {
          width: bubbleSize,
          height: bubbleSize,
          margin: 8,
          shadowColor: glowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 12,
          elevation: 8,
        },
      ]}
    >
      {/* Cercle de glow externe - non interactif */}
      <Animated.View
        pointerEvents="none"
        style={[
          pulseStyle,
          {
            position: 'absolute',
            width: bubbleSize + 12,
            height: bubbleSize + 12,
            borderRadius: (bubbleSize + 12) / 2,
            top: -6,
            left: -6,
            backgroundColor: glowColor,
          },
        ]}
      />

      {/* Bulle principale */}
      <View
        pointerEvents="none"
        style={{
          width: bubbleSize,
          height: bubbleSize,
          borderRadius: bubbleSize / 2,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: isOutOfStock
            ? 'rgba(75, 85, 99, 0.8)'
            : isPositive
            ? 'rgba(34, 197, 94, 0.8)'
            : isNegative
            ? 'rgba(239, 68, 68, 0.8)'
            : 'rgba(156, 163, 175, 0.6)',
        }}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 8,
          }}
        >
          {/* Badge stock faible ou rupture */}
          {(isLowStock || isOutOfStock) && (
            <View
              style={{
                position: 'absolute',
                top: 4,
                right: 4,
                backgroundColor: isOutOfStock
                  ? 'rgba(220, 38, 38, 0.9)'
                  : 'rgba(245, 158, 11, 0.9)',
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <AlertTriangle size={10} color="#FFFFFF" />
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: '700',
                  color: '#FFFFFF',
                }}
              >
                {isOutOfStock ? 'Rupture' : 'Faible'}
              </Text>
            </View>
          )}

          {/* Initiales ou nom court */}
          {bubbleSize >= 100 ? (
            <Text
              style={{
                fontSize: Math.max(10, bubbleSize / 10),
                fontWeight: '700',
                color: '#FFFFFF',
                textAlign: 'center',
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
              numberOfLines={2}
            >
              {shortName}
            </Text>
          ) : (
            <Text
              style={{
                fontSize: Math.max(14, bubbleSize / 4),
                fontWeight: '800',
                color: '#FFFFFF',
                textShadowColor: 'rgba(0, 0, 0, 0.3)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {initials}
            </Text>
          )}

          {/* Prix dynamique */}
          <Text
            style={{
              fontSize: Math.max(12, bubbleSize / 7),
              fontWeight: '800',
              color: '#FFFFFF',
              marginTop: 2,
              textShadowColor: 'rgba(0, 0, 0, 0.4)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {dynamic_price.toFixed(2)}€
          </Text>

          {/* Variation en % */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 2,
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 10,
            }}
          >
            {isPositive ? (
              <TrendingUp size={10} color="#FFFFFF" strokeWidth={2.5} />
            ) : isNegative ? (
              <TrendingDown size={10} color="#FFFFFF" strokeWidth={2.5} />
            ) : (
              <Package size={10} color="#FFFFFF" strokeWidth={2} />
            )}
            <Text
              style={{
                fontSize: Math.max(9, bubbleSize / 12),
                fontWeight: '700',
                color: '#FFFFFF',
                marginLeft: 2,
              }}
            >
              {variation_percent > 0 ? '+' : ''}
              {variation_percent.toFixed(1)}%
            </Text>
          </View>

          {/* Stock disponible (grandes bulles uniquement) */}
          {bubbleSize >= 120 && !isOutOfStock && (
            <Text
              style={{
                fontSize: 9,
                color: 'rgba(255, 255, 255, 0.7)',
                marginTop: 4,
              }}
            >
              Stock: {stock_available}
            </Text>
          )}
        </LinearGradient>
      </View>
    </AnimatedPressable>
  );
}
