import React from 'react';
import { View, Image, Pressable } from 'react-native';
import { Text } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { CollectionItem, RARITY_CONFIG } from '@/lib/types';
import { useReviewsStore } from '@/lib/store';
import { RarityBadge } from './RarityBadge';

interface CollectionCardProps {
  item: CollectionItem;
  onPress?: () => void;
}

export function CollectionCard({ item, onPress }: CollectionCardProps) {
  const { product } = item;
  const rarityConfig = RARITY_CONFIG[product.rarity];
  const reviews = useReviewsStore((s) => s.reviews);
  const review = reviews[item.id];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable onPress={handlePress} className="active:opacity-90 active:scale-98">
      <LinearGradient
        colors={['#1F2F24', '#141F18']}
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: rarityConfig.borderColor,
          overflow: 'hidden',
        }}
      >
        {/* Image */}
        <Image
          source={{ uri: product.image }}
          style={{
            width: '100%',
            height: 120,
          }}
          resizeMode="cover"
        />

        {/* Rarity overlay */}
        <View className="absolute top-2 right-2">
          <RarityBadge rarity={product.rarity} size="sm" />
        </View>

        {/* Content */}
        <View className="p-3">
          <Text className="text-white font-semibold text-base" numberOfLines={1}>
            {product.name}
          </Text>

          <View className="flex-row items-center mt-1">
            <MapPin size={10} color="#9CA3AF" />
            <Text className="text-gray-500 text-xs ml-1" numberOfLines={1}>
              {product.region}
            </Text>
          </View>

          {/* Star Rating */}
          {review ? (
            <View className="flex-row items-center mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={12}
                  color={star <= review.rating ? '#F59E0B' : '#374151'}
                  fill={star <= review.rating ? '#F59E0B' : 'transparent'}
                />
              ))}
            </View>
          ) : (
            <View className="flex-row items-center mt-2">
              <Text className="text-gray-500 text-xs">Pas encore noté</Text>
            </View>
          )}

          <View className="flex-row justify-between items-center mt-2">
            <Text className="text-green-400 text-xs font-medium">
              CBD {product.cbdPercent}%
            </Text>
            <Text style={{ color: rarityConfig.color }} className="font-bold text-sm">
              {product.value}€
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}
