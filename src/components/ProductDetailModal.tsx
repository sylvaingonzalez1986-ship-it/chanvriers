import React from 'react';
import {
  View,
  Modal,
  Pressable,
  Image,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin } from 'lucide-react-native';
import { CollectionItem, RARITY_CONFIG } from '@/lib/types';
import { RarityBadge } from './RarityBadge';

interface ProductDetailModalProps {
  item: CollectionItem | null;
  visible: boolean;
  onClose: () => void;
}

export function ProductDetailModal({ item, visible, onClose }: ProductDetailModalProps) {
  const insets = useSafeAreaInsets();

  if (!item) return null;

  const { product } = item;
  const rarityConfig = RARITY_CONFIG[product.rarity];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
        <Pressable className="flex-1" onPress={onClose} />

        <View
          className="bg-[#0F1A12] rounded-t-3xl"
          style={{ maxHeight: '90%', paddingBottom: insets.bottom + 16 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4 border-b border-white/10">
            <Text className="text-white text-xl font-bold">Détail du produit</Text>
            <Pressable onPress={onClose} className="p-2">
              <X size={24} color="#fff" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Product Image */}
            <Image
              source={{ uri: product.image }}
              style={{ width: '100%', height: 200 }}
              resizeMode="cover"
            />

            {/* Product Info */}
            <View className="px-5 py-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-white text-2xl font-bold">{product.name}</Text>
                  <Text className="text-gray-400 text-sm mt-1">{product.producer}</Text>
                </View>
                <RarityBadge rarity={product.rarity} />
              </View>

              <View className="flex-row items-center mt-3">
                <MapPin size={14} color="#9CA3AF" />
                <Text className="text-gray-400 text-sm ml-1">{product.region}</Text>
              </View>

              <Text className="text-gray-300 text-base mt-3 leading-6">
                {product.description}
              </Text>

              {/* Stats */}
              <View className="flex-row mt-4">
                <View className="flex-1 bg-white/5 rounded-xl p-3 border border-white/10">
                  <Text className="text-gray-400 text-xs">Valeur</Text>
                  <Text style={{ color: rarityConfig.color }} className="text-lg font-bold">
                    {product.value}€
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
