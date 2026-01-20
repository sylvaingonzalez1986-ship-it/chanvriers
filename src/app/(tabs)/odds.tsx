import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrendingUp, Info, Award, Percent } from 'lucide-react-native';
import { RARITY_CONFIG, Rarity } from '@/lib/types';
import { CBD_PRODUCTS } from '@/lib/products';

export default function OddsScreen() {
  const insets = useSafeAreaInsets();

  // Get product count per rarity
  const productCounts = CBD_PRODUCTS.reduce(
    (acc, product) => {
      acc[product.rarity] = (acc[product.rarity] || 0) + 1;
      return acc;
    },
    {} as Record<Rarity, number>
  );

  // Calculate average value per rarity
  const avgValues = (Object.keys(RARITY_CONFIG) as Rarity[]).reduce(
    (acc, rarity) => {
      const products = CBD_PRODUCTS.filter((p) => p.rarity === rarity);
      const sum = products.reduce((s, p) => s + p.value, 0);
      acc[rarity] = products.length > 0 ? Math.round(sum / products.length) : 0;
      return acc;
    },
    {} as Record<Rarity, number>
  );

  return (
    <View className="flex-1 bg-dark">
      <LinearGradient
        colors={['#0A0F0D', '#0F1A12', '#0A0F0D']}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-4">
          <View className="flex-row items-center">
            <TrendingUp size={28} color="#D4AF37" />
            <Text className="text-white text-2xl font-bold ml-2">Probabilités</Text>
          </View>
          <Text className="text-gray-400 text-base mt-2">
            Chances d'obtenir chaque rareté
          </Text>
        </View>

        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Rarity cards */}
          {(Object.keys(RARITY_CONFIG) as Rarity[]).map((rarity) => {
            const config = RARITY_CONFIG[rarity];
            const percentage = config.probability * 100;

            return (
              <View
                key={rarity}
                style={{
                  backgroundColor: config.bgColor,
                  borderWidth: 1,
                  borderColor: config.borderColor,
                }}
                className="rounded-2xl p-4 mb-4"
              >
                {/* Header */}
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Award size={24} color={config.color} />
                    <Text
                      style={{ color: config.color }}
                      className="text-xl font-bold ml-2"
                    >
                      {config.label}
                    </Text>
                  </View>
                  <View
                    style={{ backgroundColor: config.color }}
                    className="px-3 py-1 rounded-full"
                  >
                    <Text className="text-dark font-bold text-base">
                      {percentage}%
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View className="h-3 bg-dark/50 rounded-full overflow-hidden mb-3">
                  <View
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: config.color,
                      height: '100%',
                      borderRadius: 999,
                    }}
                  />
                </View>

                {/* Stats */}
                <View className="flex-row justify-between">
                  <View className="flex-row items-center">
                    <Percent size={14} color="#9CA3AF" />
                    <Text className="text-gray-400 text-sm ml-1">
                      1 sur {Math.round(1 / config.probability)} tirages
                    </Text>
                  </View>
                  <View>
                    <Text className="text-gray-400 text-sm">
                      {productCounts[rarity] || 0} produits • ~{avgValues[rarity]}€
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Info box */}
          <View className="bg-darkCard rounded-2xl p-4 border border-secondary/20 mt-2">
            <View className="flex-row items-center mb-2">
              <Info size={18} color="#9CA3AF" />
              <Text className="text-gray-300 font-semibold ml-2">
                Comment ça marche ?
              </Text>
            </View>
            <Text className="text-gray-400 text-sm leading-5">
              Chaque tirage utilise un générateur aléatoire pour déterminer la rareté
              du produit que vous recevrez. Plus la rareté est élevée, plus le produit
              est exclusif et précieux.
            </Text>
            <Text className="text-gray-400 text-sm leading-5 mt-2">
              Tous nos produits proviennent de producteurs français certifiés et
              respectent la réglementation en vigueur (THC {'<'}0.3%).
            </Text>
          </View>

          {/* Expected value */}
          <View className="bg-accent/10 rounded-2xl p-4 border border-accent/30 mt-4">
            <Text className="text-accent font-semibold mb-2">
              Valeur moyenne attendue
            </Text>
            <Text className="text-white text-3xl font-bold">
              ~{Math.round(
                Object.entries(RARITY_CONFIG).reduce((sum, [rarity, config]) => {
                  return sum + config.probability * (avgValues[rarity as Rarity] || 0);
                }, 0)
              )}€
            </Text>
            <Text className="text-gray-400 text-sm mt-1">
              par tirage de 25€
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
