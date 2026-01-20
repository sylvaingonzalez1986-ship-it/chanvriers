import React from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { Text } from '@/components/ui';
import { X, Package, Percent, Gift, Check, Sparkles } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { COLORS } from '@/lib/colors';
import { useCollectionStore, RARITY_CONFIG } from '@/lib/store';
import { CollectionItem, RARITY_CONFIG as RARITY_TYPES } from '@/lib/types';

interface InventoryModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDiscount: (item: CollectionItem | null) => void;
  onSelectProducts: (items: CollectionItem[]) => void;
  selectedDiscount: CollectionItem | null;
  selectedProducts: CollectionItem[];
  orderSubtotal: number;
}

export function InventoryModal({
  visible,
  onClose,
  onSelectDiscount,
  onSelectProducts,
  selectedDiscount,
  selectedProducts,
  orderSubtotal,
}: InventoryModalProps) {
  const collection = useCollectionStore((s) => s.collection);
  const availableItems = collection.filter((item) => !item.used);

  // Items with discount effect
  const discountItems = availableItems.filter((item) => item.lotType === 'discount');

  // Items that are products (physical items to add to order)
  const productItems = availableItems.filter((item) => item.lotType === 'product' || !item.lotType);

  const isProductSelected = (item: CollectionItem) => {
    return selectedProducts.some((p) => p.id === item.id);
  };

  const handleProductToggle = (item: CollectionItem) => {
    if (isProductSelected(item)) {
      onSelectProducts(selectedProducts.filter((p) => p.id !== item.id));
    } else {
      onSelectProducts([...selectedProducts, item]);
    }
  };

  const canApplyDiscount = (item: CollectionItem) => {
    if (item.minOrderAmount && orderSubtotal < item.minOrderAmount) {
      return false;
    }
    return true;
  };

  const formatDiscount = (item: CollectionItem) => {
    if (item.discountPercent) {
      return `-${item.discountPercent}%`;
    }
    if (item.discountAmount) {
      return `-${item.discountAmount}€`;
    }
    return '';
  };

  const getEffectDescription = (item: CollectionItem) => {
    if (item.lotType === 'discount') {
      if (item.discountPercent) {
        return `${item.discountPercent}% de réduction sur la commande`;
      }
      if (item.discountAmount) {
        return `${item.discountAmount}€ de réduction sur la commande`;
      }
    }
    return 'Produit ajouté gratuitement à la commande';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/80 justify-end">
        <Animated.View
          entering={FadeInDown.duration(300)}
          className="rounded-t-3xl max-h-[85%]"
          style={{ backgroundColor: COLORS.background.charcoal }}
        >
          {/* Header */}
          <View
            className="flex-row items-center justify-between px-5 py-4"
            style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.gold}30` }}
          >
            <View className="flex-row items-center">
              <Gift size={24} color={COLORS.primary.brightYellow} />
              <Text style={{ color: COLORS.text.cream }} className="text-xl font-bold ml-2">
                Inventaire
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: `${COLORS.text.muted}20` }}
            >
              <X size={20} color={COLORS.text.muted} />
            </Pressable>
          </View>

          <ScrollView className="px-5 py-4" showsVerticalScrollIndicator={false}>
            {availableItems.length === 0 ? (
              <View className="items-center py-12">
                <Gift size={48} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-center mt-4">
                  Votre inventaire est vide.{'\n'}Gagnez des lots au tirage !
                </Text>
              </View>
            ) : (
              <>
                {/* Discount items section */}
                {discountItems.length > 0 && (
                  <View className="mb-6">
                    <View className="flex-row items-center mb-3">
                      <Percent size={18} color={COLORS.accent.hemp} />
                      <Text style={{ color: COLORS.text.cream }} className="font-bold text-lg ml-2">
                        Réductions
                      </Text>
                      <Text style={{ color: COLORS.text.muted }} className="text-sm ml-2">
                        (1 max par commande)
                      </Text>
                    </View>

                    {discountItems.map((item) => {
                      const isSelected = selectedDiscount?.id === item.id;
                      const canApply = canApplyDiscount(item);
                      const rarityConfig = RARITY_CONFIG[item.product.rarity];

                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => {
                            if (canApply) {
                              onSelectDiscount(isSelected ? null : item);
                            }
                          }}
                          disabled={!canApply}
                          className="mb-3 rounded-2xl overflow-hidden"
                          style={{
                            backgroundColor: COLORS.background.nightSky,
                            borderWidth: 2,
                            borderColor: isSelected ? COLORS.accent.hemp : `${rarityConfig.color}50`,
                            opacity: canApply ? 1 : 0.5,
                          }}
                        >
                          <View className="flex-row p-3">
                            <Image
                              source={{ uri: item.product.image }}
                              className="w-16 h-16 rounded-xl"
                              resizeMode="cover"
                            />
                            <View className="flex-1 ml-3 justify-center">
                              <View className="flex-row items-center">
                                <View
                                  className="px-2 py-0.5 rounded-full mr-2"
                                  style={{ backgroundColor: `${rarityConfig.color}30` }}
                                >
                                  <Text
                                    className="text-xs font-bold"
                                    style={{ color: rarityConfig.color }}
                                  >
                                    {rarityConfig.label}
                                  </Text>
                                </View>
                                <Text
                                  className="font-bold text-lg"
                                  style={{ color: COLORS.accent.hemp }}
                                >
                                  {formatDiscount(item)}
                                </Text>
                              </View>
                              <Text style={{ color: COLORS.text.cream }} className="font-semibold">
                                {item.product.name}
                              </Text>
                              {/* Effect description */}
                              <View className="flex-row items-center mt-1">
                                <Sparkles size={12} color={COLORS.primary.brightYellow} />
                                <Text style={{ color: COLORS.primary.paleGold }} className="text-xs ml-1">
                                  {getEffectDescription(item)}
                                </Text>
                              </View>
                              {item.minOrderAmount && (
                                <Text style={{ color: COLORS.text.muted }} className="text-xs mt-0.5">
                                  Min. {item.minOrderAmount}€ de commande
                                  {!canApply && ' (non atteint)'}
                                </Text>
                              )}
                            </View>
                            {isSelected && (
                              <View
                                className="w-8 h-8 rounded-full items-center justify-center self-center"
                                style={{ backgroundColor: COLORS.accent.hemp }}
                              >
                                <Check size={18} color="white" />
                              </View>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* Product items section */}
                {productItems.length > 0 && (
                  <View className="mb-6">
                    <View className="flex-row items-center mb-3">
                      <Package size={18} color={COLORS.primary.brightYellow} />
                      <Text style={{ color: COLORS.text.cream }} className="font-bold text-lg ml-2">
                        Produits
                      </Text>
                      <Text style={{ color: COLORS.text.muted }} className="text-sm ml-2">
                        (cumulables)
                      </Text>
                    </View>

                    {productItems.map((item) => {
                      const isSelected = isProductSelected(item);
                      const rarityConfig = RARITY_CONFIG[item.product.rarity];

                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => handleProductToggle(item)}
                          className="mb-3 rounded-2xl overflow-hidden"
                          style={{
                            backgroundColor: COLORS.background.nightSky,
                            borderWidth: 2,
                            borderColor: isSelected ? COLORS.primary.brightYellow : `${rarityConfig.color}50`,
                          }}
                        >
                          <View className="flex-row p-3">
                            <Image
                              source={{ uri: item.product.image }}
                              className="w-16 h-16 rounded-xl"
                              resizeMode="cover"
                            />
                            <View className="flex-1 ml-3 justify-center">
                              <View className="flex-row items-center mb-1">
                                <View
                                  className="px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: `${rarityConfig.color}30` }}
                                >
                                  <Text
                                    className="text-xs font-bold"
                                    style={{ color: rarityConfig.color }}
                                  >
                                    {rarityConfig.label}
                                  </Text>
                                </View>
                              </View>
                              <Text style={{ color: COLORS.text.cream }} className="font-semibold">
                                {item.product.name}
                              </Text>
                              <Text style={{ color: COLORS.text.muted }} className="text-xs">
                                {item.product.producer}
                              </Text>
                              {/* Effect description */}
                              <View className="flex-row items-center mt-1">
                                <Sparkles size={12} color={COLORS.primary.brightYellow} />
                                <Text style={{ color: COLORS.primary.paleGold }} className="text-xs ml-1">
                                  {getEffectDescription(item)}
                                </Text>
                              </View>
                              <Text style={{ color: COLORS.primary.paleGold }} className="text-sm font-medium">
                                Valeur: {item.product.value}€
                              </Text>
                            </View>
                            {isSelected && (
                              <View
                                className="w-8 h-8 rounded-full items-center justify-center self-center"
                                style={{ backgroundColor: COLORS.primary.brightYellow }}
                              >
                                <Check size={18} color="white" />
                              </View>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {/* Summary of selected items */}
            {(selectedDiscount || selectedProducts.length > 0) && (
              <View
                className="rounded-2xl p-4 mb-4"
                style={{ backgroundColor: `${COLORS.primary.gold}15` }}
              >
                <Text style={{ color: COLORS.primary.paleGold }} className="font-bold mb-2">
                  Sélection actuelle
                </Text>
                {selectedDiscount && (
                  <View className="flex-row items-center">
                    <Percent size={14} color={COLORS.accent.hemp} />
                    <Text style={{ color: COLORS.text.cream }} className="text-sm ml-2">
                      {selectedDiscount.product.name} ({formatDiscount(selectedDiscount)})
                    </Text>
                  </View>
                )}
                {selectedProducts.map((item) => (
                  <View key={item.id} className="flex-row items-center mt-1">
                    <Package size={14} color={COLORS.primary.brightYellow} />
                    <Text style={{ color: COLORS.text.cream }} className="text-sm ml-2">
                      {item.product.name} ({item.product.value}€)
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>

          {/* Confirm button */}
          <View className="px-5 pb-8 pt-3" style={{ borderTopWidth: 1, borderTopColor: `${COLORS.primary.gold}30` }}>
            <Pressable
              onPress={onClose}
              className="rounded-2xl py-4 items-center"
              style={{ backgroundColor: COLORS.primary.gold }}
            >
              <Text style={{ color: COLORS.text.white }} className="font-bold text-base">
                Confirmer la sélection
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
