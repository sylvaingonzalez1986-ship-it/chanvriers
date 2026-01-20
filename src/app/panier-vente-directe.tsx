import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Trash2, Minus, Plus, ShoppingCart, AlertCircle, CheckCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS } from '@/lib/colors';
import { useDirectSalesCart, type DirectSalesCartItem } from '@/lib/direct-sales-cart';
import { useAuth } from '@/lib/useAuth';

export default function PanierVenteDirecte() {
  const insets = useSafeAreaInsets();
  const { session, user } = useAuth();
  const cart = useDirectSalesCart((s) => s);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (session?.user.id && session?.access_token) {
      cart.loadCart(session.user.id, session.access_token).then(() => setLoading(false));
    }
  }, [session?.user.id]);

  const handleValidateOrder = async () => {
    if (!session?.user.id || !session?.access_token) return;

    setValidating(true);
    try {
      const result = await cart.createOrders(session.user.id, session.access_token);

      if (result.success) {
        // Navigate to confirmation screen with order IDs
        router.push({
          pathname: '/commande-confirmation',
          params: {
            orderIds: result.orderIds?.join(',') || '',
          },
        });
      } else {
        console.error('Order creation failed:', result.error);
        // You could show an error toast here
      }
    } catch (error) {
      console.error('Error validating order:', error);
    } finally {
      setValidating(false);
    }
  };

  if (!session?.user.id) {
    return (
      <LinearGradient
        colors={[COLORS.background.nightSky, COLORS.background.mediumBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-1 items-center justify-center"
      >
        <Text style={{ color: COLORS.text.cream }} className="text-center">
          Veuillez vous connecter pour voir votre panier
        </Text>
      </LinearGradient>
    );
  }

  const producerIds = cart.getProducerIds();
  const grandTotal = cart.getGrandTotal();
  const isMinimumMet = cart.isMinimumMet();
  const insufficientProducers = cart.getProducersWithInsufficientAmount();

  if (loading) {
    return (
      <LinearGradient
        colors={[COLORS.background.nightSky, COLORS.background.mediumBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="flex-1 items-center justify-center"
      >
        <ActivityIndicator size="large" color={COLORS.primary.gold} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[COLORS.background.nightSky, COLORS.background.mediumBlue]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="flex-1"
    >
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={{ paddingTop: insets.top + 16 }} className="px-4 mb-6 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="p-2 rounded-lg mr-3"
            style={{ backgroundColor: `${COLORS.text.white}10` }}
          >
            <ArrowLeft size={24} color={COLORS.text.cream} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-3xl font-bold" style={{ color: COLORS.text.cream }}>
              Mon panier
            </Text>
            <Text className="text-sm" style={{ color: COLORS.text.lightGray }}>
              Vente directe à la ferme
            </Text>
          </View>
        </View>

        {/* Panier vide */}
        {producerIds.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4 py-12">
            <ShoppingCart size={48} color={COLORS.text.muted} strokeWidth={1.5} />
            <Text className="text-center mt-4" style={{ color: COLORS.text.lightGray }}>
              Votre panier est vide
            </Text>
            <Text className="text-center text-sm mt-2" style={{ color: COLORS.text.muted }}>
              Commencez vos achats depuis le Marché local
            </Text>
          </View>
        ) : (
          <View className="px-4">
            {/* Alerte minimum insuffisant */}
            {insufficientProducers.length > 0 && (
              <View
                className="p-4 rounded-xl mb-4 flex-row"
                style={{ backgroundColor: `${COLORS.accent.red}20`, borderLeftWidth: 4, borderLeftColor: COLORS.accent.red }}
              >
                <AlertCircle size={20} color={COLORS.accent.red} className="mt-0.5 mr-3" />
                <View className="flex-1">
                  <Text className="font-bold" style={{ color: COLORS.accent.red }}>
                    Minimum 20€ non atteint
                  </Text>
                  {insufficientProducers.map((producer) => {
                    const needed = 20 - producer.amount;
                    return (
                      <Text key={producer.producerId} className="text-sm mt-1" style={{ color: COLORS.accent.red }}>
                        {producer.producerName}: Ajoutez {needed.toFixed(2)}€
                      </Text>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Producteurs et articles */}
            {producerIds.map((producerId) => {
              const items = cart.getItemsByProducer(producerId);
              const producerTotal = cart.getTotalByProducer(producerId);
              const producerName = items[0]?.producer_name || 'Unknown';
              const isMinimumMetForProducer = producerTotal >= 20;

              return (
                <View
                  key={producerId}
                  className="mb-6 p-4 rounded-2xl"
                  style={{ backgroundColor: `${COLORS.text.white}08` }}
                >
                  {/* En-tête producteur */}
                  <View className="mb-4 pb-4 border-b" style={{ borderBottomColor: `${COLORS.accent.hemp}30` }}>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-lg font-bold" style={{ color: COLORS.text.cream }}>
                        {producerName}
                      </Text>
                      <View
                        className="px-3 py-1 rounded-full flex-row items-center"
                        style={{
                          backgroundColor: isMinimumMetForProducer ? `${COLORS.accent.hemp}30` : `${COLORS.accent.red}30`,
                        }}
                      >
                        {isMinimumMetForProducer ? (
                          <>
                            <CheckCircle size={14} color={COLORS.accent.hemp} />
                            <Text className="text-xs font-bold ml-1" style={{ color: COLORS.accent.hemp }}>
                              ✓ OK
                            </Text>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={14} color={COLORS.accent.red} />
                            <Text className="text-xs font-bold ml-1" style={{ color: COLORS.accent.red }}>
                              Minimum
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Articles */}
                  {items.map((item) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      onQuantityChange={(quantity) => {
                        if (session?.user.id && session?.access_token) {
                          cart.updateQuantity(session.user.id, session.access_token, item.id, quantity);
                        }
                      }}
                      onRemove={() => {
                        if (session?.user.id && session?.access_token) {
                          cart.removeItem(session.user.id, session.access_token, item.id);
                        }
                      }}
                    />
                  ))}

                  {/* Total producteur */}
                  <View className="mt-4 pt-4 border-t" style={{ borderTopColor: `${COLORS.accent.hemp}30` }}>
                    <View className="flex-row justify-between items-center">
                      <Text style={{ color: COLORS.text.lightGray }}>Total:</Text>
                      <Text className="text-xl font-bold" style={{ color: COLORS.primary.gold }}>
                        {producerTotal.toFixed(2)}€
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Footer avec total et bouton */}
      {producerIds.length > 0 && (
        <View
          className="px-4 py-4 border-t"
          style={{
            backgroundColor: COLORS.background.charcoal,
            borderTopColor: COLORS.primary.gold,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text style={{ color: COLORS.text.lightGray }}>Grand Total:</Text>
              <Text className="text-2xl font-bold" style={{ color: COLORS.primary.gold }}>
                {grandTotal.toFixed(2)}€
              </Text>
            </View>
          </View>

          <Pressable
            disabled={!isMinimumMet || validating}
            onPress={handleValidateOrder}
            className="py-4 rounded-xl flex-row items-center justify-center"
            style={{
              backgroundColor: isMinimumMet && !validating ? COLORS.accent.hemp : COLORS.text.muted,
              opacity: isMinimumMet && !validating ? 1 : 0.5,
            }}
          >
            {validating ? (
              <ActivityIndicator size="small" color={COLORS.text.white} />
            ) : (
              <>
                <ShoppingCart size={20} color={COLORS.text.white} />
                <Text className="ml-2 font-bold text-lg" style={{ color: COLORS.text.white }}>
                  Valider la commande
                </Text>
              </>
            )}
          </Pressable>

          {!isMinimumMet && (
            <Text className="text-center text-sm mt-3" style={{ color: COLORS.accent.red }}>
              Complétez vos commandes pour atteindre 20€ par producteur
            </Text>
          )}
        </View>
      )}
    </LinearGradient>
  );
}

interface CartItemRowProps {
  item: DirectSalesCartItem;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
}

function CartItemRow({ item, onQuantityChange, onRemove }: CartItemRowProps) {
  const subtotal = item.price * item.quantity;

  return (
    <View className="flex-row items-center mb-4 pb-4 border-b" style={{ borderBottomColor: `${COLORS.text.white}10` }}>
      {/* Image */}
      {item.image && (
        <Image
          source={{ uri: item.image }}
          className="w-16 h-16 rounded-lg mr-3 bg-gray-800"
        />
      )}

      {/* Info */}
      <View className="flex-1">
        <Text className="font-semibold" style={{ color: COLORS.text.cream }}>
          {item.product_name}
        </Text>
        <Text className="text-sm mt-1" style={{ color: COLORS.text.lightGray }}>
          {item.price.toFixed(2)}€ x {item.quantity} = {subtotal.toFixed(2)}€
        </Text>
      </View>

      {/* Quantité */}
      <View className="flex-row items-center mr-3">
        <Pressable
          onPress={() => onQuantityChange(item.quantity - 1)}
          className="p-1.5"
          style={{ backgroundColor: `${COLORS.text.white}10`, borderRadius: 6 }}
        >
          <Minus size={16} color={COLORS.text.cream} />
        </Pressable>

        <Text className="mx-2 font-bold w-6 text-center" style={{ color: COLORS.text.cream }}>
          {item.quantity}
        </Text>

        <Pressable
          onPress={() => onQuantityChange(item.quantity + 1)}
          className="p-1.5"
          style={{ backgroundColor: `${COLORS.text.white}10`, borderRadius: 6 }}
        >
          <Plus size={16} color={COLORS.text.cream} />
        </Pressable>
      </View>

      {/* Supprimer */}
      <Pressable
        onPress={onRemove}
        className="p-2"
        style={{ backgroundColor: `${COLORS.accent.red}20`, borderRadius: 8 }}
      >
        <Trash2 size={16} color={COLORS.accent.red} />
      </Pressable>
    </View>
  );
}
