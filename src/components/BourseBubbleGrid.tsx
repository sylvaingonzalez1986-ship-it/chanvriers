/**
 * BourseBubbleGrid - Les Chanvriers Unis
 * Grille de bulles animée pour afficher les produits de la bourse
 */

import React, { useMemo } from 'react';
import { View, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { Text } from '@/components/ui';
import Animated, {
  FadeInUp,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';
import { BourseProductBubble } from './BourseProductBubble';
import { ProductMarketState } from '@/lib/supabase-bourse';
import { COLORS } from '@/lib/colors';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react-native';

interface BourseBubbleGridProps {
  marketStates: ProductMarketState[];
  onProductPress: (productId: string) => void;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MIN_BUBBLE_SIZE = 80;
const MAX_BUBBLE_SIZE = 150;

export function BourseBubbleGrid({
  marketStates,
  onProductPress,
  isRefreshing = false,
  onRefresh,
}: BourseBubbleGridProps) {
  // Statistiques rapides
  const stats = useMemo(() => {
    const positive = marketStates.filter((ms) => ms.variation_percent > 1).length;
    const negative = marketStates.filter((ms) => ms.variation_percent < -1).length;
    const neutral = marketStates.length - positive - negative;
    const avgVariation =
      marketStates.length > 0
        ? marketStates.reduce((sum, ms) => sum + ms.variation_percent, 0) /
          marketStates.length
        : 0;

    return { positive, negative, neutral, avgVariation };
  }, [marketStates]);

  // Trier les produits par variation absolue (les plus actifs en premier)
  const sortedMarketStates = useMemo(() => {
    return [...marketStates].sort(
      (a, b) => Math.abs(b.variation_percent) - Math.abs(a.variation_percent)
    );
  }, [marketStates]);

  if (marketStates.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <Activity size={48} color={COLORS.text.muted} />
        <Text
          className="text-center mt-4"
          style={{ color: COLORS.text.muted, fontSize: 16 }}
        >
          Aucun produit disponible sur la bourse pour le moment.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary.gold}
            colors={[COLORS.primary.gold]}
          />
        ) : undefined
      }
    >
      {/* Résumé du marché */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        className="flex-row justify-around px-4 py-4 mx-4 mt-4 rounded-2xl"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <View className="items-center">
          <View className="flex-row items-center">
            <TrendingUp size={16} color="#22C55E" />
            <Text
              className="ml-1 font-bold"
              style={{ color: '#22C55E', fontSize: 18 }}
            >
              {stats.positive}
            </Text>
          </View>
          <Text style={{ color: COLORS.text.muted, fontSize: 11 }}>
            En hausse
          </Text>
        </View>

        <View className="items-center">
          <View className="flex-row items-center">
            <TrendingDown size={16} color="#EF4444" />
            <Text
              className="ml-1 font-bold"
              style={{ color: '#EF4444', fontSize: 18 }}
            >
              {stats.negative}
            </Text>
          </View>
          <Text style={{ color: COLORS.text.muted, fontSize: 11 }}>
            En baisse
          </Text>
        </View>

        <View className="items-center">
          <View className="flex-row items-center">
            <Activity size={16} color={COLORS.primary.gold} />
            <Text
              className="ml-1 font-bold"
              style={{
                color:
                  stats.avgVariation > 0
                    ? '#22C55E'
                    : stats.avgVariation < 0
                    ? '#EF4444'
                    : COLORS.text.muted,
                fontSize: 18,
              }}
            >
              {stats.avgVariation > 0 ? '+' : ''}
              {stats.avgVariation.toFixed(1)}%
            </Text>
          </View>
          <Text style={{ color: COLORS.text.muted, fontSize: 11 }}>
            Variation moy.
          </Text>
        </View>
      </Animated.View>

      {/* Titre de la section */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(500)}
        className="px-4 mt-6 mb-2"
      >
        <Text
          className="font-bold"
          style={{ color: COLORS.text.cream, fontSize: 16 }}
        >
          Produits cotés
        </Text>
        <Text style={{ color: COLORS.text.muted, fontSize: 12 }}>
          Appuyez sur une bulle pour plus de détails
        </Text>
      </Animated.View>

      {/* Grille de bulles */}
      <Animated.View
        layout={Layout.springify()}
        className="flex-row flex-wrap justify-center px-2 py-4"
        pointerEvents="box-none"
      >
        {sortedMarketStates.map((marketState, index) => (
          <Animated.View
            key={marketState.product_id}
            entering={FadeInUp.delay(100 + index * 50)
              .duration(400)
              .springify()}
            layout={Layout.springify()}
            pointerEvents="box-none"
          >
            <BourseProductBubble
              marketState={marketState}
              onPress={onProductPress}
              minSize={MIN_BUBBLE_SIZE}
              maxSize={MAX_BUBBLE_SIZE}
            />
          </Animated.View>
        ))}
      </Animated.View>

      {/* Légende */}
      <Animated.View
        entering={FadeInUp.delay(300).duration(500)}
        className="px-4 mt-4 mb-6"
      >
        <Text
          className="font-medium mb-3"
          style={{ color: COLORS.text.muted, fontSize: 12 }}
        >
          Légende
        </Text>

        <View className="flex-row flex-wrap gap-4">
          <View className="flex-row items-center">
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#22C55E',
                marginRight: 6,
              }}
            />
            <Text style={{ color: COLORS.text.lightGray, fontSize: 11 }}>
              Prix en hausse
            </Text>
          </View>

          <View className="flex-row items-center">
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#EF4444',
                marginRight: 6,
              }}
            />
            <Text style={{ color: COLORS.text.lightGray, fontSize: 11 }}>
              Prix en baisse
            </Text>
          </View>

          <View className="flex-row items-center">
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#6B7280',
                marginRight: 6,
              }}
            />
            <Text style={{ color: COLORS.text.lightGray, fontSize: 11 }}>
              Prix stable
            </Text>
          </View>
        </View>

        <Text
          className="mt-3"
          style={{ color: COLORS.text.muted, fontSize: 10 }}
        >
          La taille de la bulle reflète le prix dynamique. Plus la bulle est
          grande, plus le prix est élevé (proche de +30%).
        </Text>
      </Animated.View>
    </ScrollView>
  );
}
