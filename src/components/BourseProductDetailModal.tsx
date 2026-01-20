/**
 * BourseProductDetailModal - Les Chanvriers Unis
 * Modal de détail produit avec formulaire de demande d'achat pro
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Text } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeIn,
  FadeOut,
  FadeInUp,
  FadeOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ProductMarketState } from '@/lib/supabase-bourse';
import { useBourseStore } from '@/lib/bourse-store';
import { COLORS } from '@/lib/colors';
import { PRODUCT_TYPE_LABELS, PRODUCT_TYPE_COLORS } from '@/lib/producers';
import {
  X,
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  ShoppingCart,
  Minus,
  Plus,
  Check,
  Info,
  Leaf,
  Scale,
  Droplets,
  WifiOff,
} from 'lucide-react-native';
import { useOfflineStatus } from '@/lib/network-context';

interface BourseProductDetailModalProps {
  visible: boolean;
  marketState: ProductMarketState | null;
  onClose: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BourseProductDetailModal({
  visible,
  marketState,
  onClose,
}: BourseProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const placeOrder = useBourseStore((s) => s.placeOrder);
  const { isOffline } = useOfflineStatus();

  // Debug log
  useEffect(() => {
    console.log('[BourseModal] visible:', visible, 'marketState:', marketState?.product?.name);
  }, [visible, marketState]);

  // Reset state quand le modal s'ouvre
  useEffect(() => {
    if (visible) {
      setQuantity(1);
      setOrderSuccess(false);
      setOrderError(null);
    }
  }, [visible]);

  const buttonScale = useSharedValue(1);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleQuantityChange = useCallback((delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleInputChange = useCallback((text: string) => {
    const num = parseInt(text, 10);
    if (!isNaN(num) && num >= 1) {
      setQuantity(num);
    } else if (text === '') {
      setQuantity(1);
    }
  }, []);

  const handleOrder = useCallback(async () => {
    if (!marketState || isOrdering) return;

    // Bloquer si offline
    if (isOffline) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setOrderError('Connexion internet requise pour passer une commande');
      return;
    }

    buttonScale.value = withSpring(0.95, { damping: 15 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setIsOrdering(true);
    setOrderError(null);

    try {
      await placeOrder(
        marketState.product_id,
        quantity,
        marketState.dynamic_price,
        marketState.product?.name
      );
      setOrderSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Fermer après 2 secondes
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur lors de la commande';
      setOrderError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsOrdering(false);
      buttonScale.value = withSpring(1);
    }
  }, [marketState, quantity, isOrdering, isOffline, placeOrder, onClose, buttonScale]);

  if (!marketState) return null;

  // Valeurs avec fallbacks pour éviter les erreurs
  const dynamic_price = marketState.dynamic_price ?? 0;
  const base_price = marketState.base_price ?? 0;
  const variation_percent = marketState.variation_percent ?? 0;
  const stock_available = marketState.stock_available ?? 0;
  const total_pro_demand = marketState.total_pro_demand ?? 0;
  const min_price = marketState.min_price ?? base_price * 0.7;
  const max_price = marketState.max_price ?? base_price * 1.3;
  const product = marketState.product;

  const isPositive = variation_percent > 1;
  const isNegative = variation_percent < -1;
  const isOutOfStock = stock_available <= 0;
  const isLowStock = stock_available > 0 && stock_available < 10;

  const totalAmount = dynamic_price * quantity;
  const productType = (product?.type as 'fleur' | 'huile' | 'resine' | 'infusion') || 'fleur';
  const productTypeColor = PRODUCT_TYPE_COLORS[productType] || COLORS.accent.hemp;

  // Image par défaut si l'image est locale ou invalide
  const productImage = product?.image && !product.image.startsWith('file://')
    ? product.image
    : 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' }}>
          {/* Zone de fond pour fermer - 4 zones autour du modal */}
          <TouchableWithoutFeedback onPress={onClose}>
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          </TouchableWithoutFeedback>

          {/* Contenu du modal */}
          <View
            style={{
              maxHeight: '85%',
              width: '92%',
              backgroundColor: '#162236',
              borderRadius: 24,
              overflow: 'hidden',
              borderWidth: 2,
              borderColor: productTypeColor,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-white/10">
              <View className="flex-row items-center flex-1">
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: productTypeColor,
                    marginRight: 8,
                  }}
                />
                <Text
                  className="font-bold flex-1"
                  style={{ color: COLORS.text.cream, fontSize: 18 }}
                  numberOfLines={1}
                >
                  {product?.name || 'Produit'}
                </Text>
              </View>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onClose();
                }}
                className="p-2 rounded-full"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <X size={20} color={COLORS.text.muted} />
              </Pressable>
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 16 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Image produit */}
              <View className="rounded-2xl overflow-hidden mb-4">
                <Image
                  source={{ uri: productImage }}
                  style={{ width: '100%', height: 180 }}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(22, 34, 54, 0.9)']}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 60,
                  }}
                />
                <View
                  className="absolute bottom-2 left-2 px-2 py-1 rounded-lg"
                  style={{ backgroundColor: productTypeColor }}
                >
                  <Text
                    className="font-bold"
                    style={{ color: '#FFFFFF', fontSize: 11 }}
                  >
                    {PRODUCT_TYPE_LABELS[productType] || 'Fleur'}
                  </Text>
                </View>
              </View>

              {/* Caractéristiques du produit */}
              <View
                className="rounded-xl p-4 mb-4"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <View className="flex-row items-center mb-3">
                  <Leaf size={16} color={COLORS.accent.hemp} />
                  <Text
                    className="ml-2 font-bold"
                    style={{ color: COLORS.text.cream, fontSize: 14 }}
                  >
                    {"Caractéristiques"}
                  </Text>
                </View>

                <View className="flex-row flex-wrap gap-3">
                  {/* CBD */}
                  <View
                    className="flex-row items-center px-3 py-2 rounded-lg"
                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}
                  >
                    <Droplets size={14} color="#22C55E" />
                    <Text
                      className="ml-2 font-bold"
                      style={{ color: '#22C55E', fontSize: 13 }}
                    >
                      {`CBD ${product?.cbd_percent ?? 15}%`}
                    </Text>
                  </View>

                  {/* THC */}
                  <View
                    className="flex-row items-center px-3 py-2 rounded-lg"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                  >
                    <Droplets size={14} color="#EF4444" />
                    <Text
                      className="ml-2 font-bold"
                      style={{ color: '#EF4444', fontSize: 13 }}
                    >
                      {`THC ${product?.thc_percent ?? 0.2}%`}
                    </Text>
                  </View>

                  {/* Poids */}
                  <View
                    className="flex-row items-center px-3 py-2 rounded-lg"
                    style={{ backgroundColor: 'rgba(212, 168, 83, 0.15)' }}
                  >
                    <Scale size={14} color={COLORS.primary.gold} />
                    <Text
                      className="ml-2 font-bold"
                      style={{ color: COLORS.primary.gold, fontSize: 13 }}
                    >
                      {product?.weight || '1g'}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                {product?.description && (
                  <Text
                    className="mt-3"
                    style={{ color: COLORS.text.lightGray, fontSize: 12, lineHeight: 18 }}
                  >
                    {product.description}
                  </Text>
                )}

                {/* Producteur */}
                {product?.producer?.name && (
                  <View className="flex-row items-center mt-3 pt-3 border-t border-white/10">
                    <Text style={{ color: COLORS.text.muted, fontSize: 12 }}>
                      {"Producteur : "}
                    </Text>
                    <Text
                      className="font-medium"
                      style={{ color: COLORS.text.cream, fontSize: 12 }}
                    >
                      {product.producer.name}
                    </Text>
                  </View>
                )}
              </View>

              {/* Prix et variation */}
              <View className="flex-row justify-between items-center mb-4">
                <View>
                  <Text
                    className="font-bold"
                    style={{ color: COLORS.text.cream, fontSize: 28 }}
                  >
                    {`${dynamic_price.toFixed(2)}€`}
                  </Text>
                  <Text style={{ color: COLORS.text.muted, fontSize: 12 }}>
                    {"Prix dynamique HT"}
                  </Text>
                </View>

                <View className="items-end">
                  <View
                    className="flex-row items-center px-3 py-2 rounded-xl"
                    style={{
                      backgroundColor: isPositive
                        ? 'rgba(34, 197, 94, 0.2)'
                        : isNegative
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(107, 114, 128, 0.2)',
                    }}
                  >
                    {isPositive ? (
                      <TrendingUp size={18} color="#22C55E" />
                    ) : isNegative ? (
                      <TrendingDown size={18} color="#EF4444" />
                    ) : (
                      <Package size={18} color={COLORS.text.muted} />
                    )}
                    <Text
                      className="ml-2 font-bold"
                      style={{
                        color: isPositive
                          ? '#22C55E'
                          : isNegative
                          ? '#EF4444'
                          : COLORS.text.muted,
                        fontSize: 18,
                      }}
                    >
                      {`${variation_percent > 0 ? '+' : ''}${variation_percent.toFixed(1)}%`}
                    </Text>
                  </View>
                  <Text
                    className="mt-1"
                    style={{ color: COLORS.text.muted, fontSize: 11 }}
                  >
                    {`vs. prix base ${base_price.toFixed(2)}€`}
                  </Text>
                </View>
              </View>

              {/* Infos marché */}
              <View
                className="rounded-xl p-4 mb-4"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <View className="flex-row items-center mb-3">
                  <Info size={16} color={COLORS.primary.gold} />
                  <Text
                    className="ml-2 font-bold"
                    style={{ color: COLORS.text.cream, fontSize: 14 }}
                  >
                    {"État du marché"}
                  </Text>
                </View>

                <View className="flex-row justify-between mb-2">
                  <Text style={{ color: COLORS.text.muted, fontSize: 13 }}>
                    {"Prix minimum"}
                  </Text>
                  <Text style={{ color: COLORS.text.lightGray, fontSize: 13 }}>
                    {`${min_price.toFixed(2)}€ (-30%)`}
                  </Text>
                </View>

                <View className="flex-row justify-between mb-2">
                  <Text style={{ color: COLORS.text.muted, fontSize: 13 }}>
                    {"Prix maximum"}
                  </Text>
                  <Text style={{ color: COLORS.text.lightGray, fontSize: 13 }}>
                    {`${max_price.toFixed(2)}€ (+30%)`}
                  </Text>
                </View>

                <View className="flex-row justify-between mb-2">
                  <Text style={{ color: COLORS.text.muted, fontSize: 13 }}>
                    {"Demande totale"}
                  </Text>
                  <Text style={{ color: COLORS.text.lightGray, fontSize: 13 }}>
                    {`${total_pro_demand} unités`}
                  </Text>
                </View>

                <View className="flex-row justify-between">
                  <Text style={{ color: COLORS.text.muted, fontSize: 13 }}>
                    {"Stock disponible"}
                  </Text>
                  <View className="flex-row items-center">
                    {(isLowStock || isOutOfStock) && (
                      <AlertTriangle
                        size={14}
                        color={isOutOfStock ? '#EF4444' : '#F59E0B'}
                        style={{ marginRight: 4 }}
                      />
                    )}
                    <Text
                      style={{
                        color: isOutOfStock
                          ? '#EF4444'
                          : isLowStock
                          ? '#F59E0B'
                          : COLORS.text.lightGray,
                        fontSize: 13,
                        fontWeight: isLowStock || isOutOfStock ? '700' : '400',
                      }}
                    >
                      {isOutOfStock ? 'Rupture' : `${stock_available} unités`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Formulaire de commande */}
              {!isOutOfStock && !orderSuccess && (
                <View
                  className="rounded-xl p-4 mb-4"
                  style={{ backgroundColor: 'rgba(212, 168, 83, 0.1)' }}
                >
                  <Text
                    className="font-bold mb-4"
                    style={{ color: COLORS.primary.gold, fontSize: 16 }}
                  >
                    {"Passer une demande d'achat"}
                  </Text>

                  {/* Sélecteur de quantité */}
                  <View className="flex-row items-center justify-between mb-4">
                    <Text style={{ color: COLORS.text.cream, fontSize: 14 }}>
                      {"Quantité"}
                    </Text>

                    <View className="flex-row items-center">
                      <Pressable
                        onPress={() => handleQuantityChange(-1)}
                        className="w-10 h-10 items-center justify-center rounded-xl"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <Minus size={18} color={COLORS.text.cream} />
                      </Pressable>

                      <TextInput
                        value={String(quantity)}
                        onChangeText={handleInputChange}
                        keyboardType="number-pad"
                        className="w-16 h-10 mx-2 rounded-xl text-center font-bold"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          color: COLORS.text.cream,
                          fontSize: 16,
                        }}
                      />

                      <Pressable
                        onPress={() => handleQuantityChange(1)}
                        className="w-10 h-10 items-center justify-center rounded-xl"
                        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                      >
                        <Plus size={18} color={COLORS.text.cream} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Total */}
                  <View className="flex-row items-center justify-between py-3 border-t border-white/10">
                    <Text
                      className="font-bold"
                      style={{ color: COLORS.text.cream, fontSize: 16 }}
                    >
                      {"Montant total HT"}
                    </Text>
                    <Text
                      className="font-bold"
                      style={{ color: COLORS.primary.gold, fontSize: 20 }}
                    >
                      {`${totalAmount.toFixed(2)}€`}
                    </Text>
                  </View>

                  {/* Erreur */}
                  {orderError && (
                    <View
                      className="flex-row items-center p-3 rounded-xl mb-4"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                    >
                      <AlertTriangle size={16} color="#EF4444" />
                      <Text
                        className="ml-2 flex-1"
                        style={{ color: '#EF4444', fontSize: 13 }}
                      >
                        {orderError}
                      </Text>
                    </View>
                  )}

                  {/* Indicateur offline */}
                  {isOffline && (
                    <View
                      className="flex-row items-center justify-center p-3 rounded-xl mb-3"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                    >
                      <WifiOff size={16} color="#EF4444" />
                      <Text
                        className="ml-2 font-medium"
                        style={{ color: '#EF4444', fontSize: 13 }}
                      >
                        {"Mode hors ligne - Commande impossible"}
                      </Text>
                    </View>
                  )}

                  {/* Bouton de commande */}
                  <AnimatedPressable
                    onPress={handleOrder}
                    disabled={isOrdering || isOffline}
                    style={[
                      animatedButtonStyle,
                      { opacity: isOrdering || isOffline ? 0.5 : 1 },
                    ]}
                  >
                    <LinearGradient
                      colors={isOffline ? ['#6B7280', '#4B5563'] : [COLORS.primary.gold, COLORS.primary.mutedGold]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="flex-row items-center justify-center py-4 rounded-xl"
                    >
                      {isOrdering ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : isOffline ? (
                        <>
                          <WifiOff size={20} color="#FFFFFF" />
                          <Text
                            className="ml-2 font-bold"
                            style={{ color: '#FFFFFF', fontSize: 16 }}
                          >
                            {"Hors ligne"}
                          </Text>
                        </>
                      ) : (
                        <>
                          <ShoppingCart size={20} color="#FFFFFF" />
                          <Text
                            className="ml-2 font-bold"
                            style={{ color: '#FFFFFF', fontSize: 16 }}
                          >
                            {"Valider la demande"}
                          </Text>
                        </>
                      )}
                    </LinearGradient>
                  </AnimatedPressable>

                  <Text
                    className="mt-3 text-center"
                    style={{ color: COLORS.text.muted, fontSize: 11 }}
                  >
                    {"Le prix affiché est le prix au moment de la demande. Il peut varier selon l'offre et la demande."}
                  </Text>
                </View>
              )}

              {/* Message de succès */}
              {orderSuccess && (
                <Animated.View
                  entering={FadeIn.duration(300)}
                  className="rounded-xl p-6 items-center mb-4"
                  style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
                >
                  <View
                    className="w-16 h-16 rounded-full items-center justify-center mb-4"
                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.3)' }}
                  >
                    <Check size={32} color="#22C55E" />
                  </View>
                  <Text
                    className="font-bold text-center mb-2"
                    style={{ color: '#22C55E', fontSize: 18 }}
                  >
                    {"Demande envoyée !"}
                  </Text>
                  <Text
                    className="text-center"
                    style={{ color: COLORS.text.lightGray, fontSize: 13 }}
                  >
                    {`Votre demande de ${quantity} unité(s) pour ${totalAmount.toFixed(2)}€ a été enregistrée.`}
                  </Text>
                </Animated.View>
              )}

              {/* Message rupture */}
              {isOutOfStock && !orderSuccess && (
                <View
                  className="rounded-xl p-4 items-center"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                >
                  <AlertTriangle size={32} color="#EF4444" />
                  <Text
                    className="font-bold mt-2"
                    style={{ color: '#EF4444', fontSize: 16 }}
                  >
                    {"Produit en rupture"}
                  </Text>
                  <Text
                    className="text-center mt-1"
                    style={{ color: COLORS.text.muted, fontSize: 13 }}
                  >
                    {"Ce produit n'est pas disponible pour le moment."}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
