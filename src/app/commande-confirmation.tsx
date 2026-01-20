import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, ArrowRight, MapPin, Clock } from 'lucide-react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { COLORS } from '@/lib/colors';
import { useAuth } from '@/lib/useAuth';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase-auth';

interface OrderData {
  id: string;
  producer_id: string;
  total: number;
  statut: string;
  adresse_retrait: string;
  horaires_retrait: string;
  instructions_retrait: string | null;
}

interface ProducerData {
  id: string;
  name: string;
}

export default function CommandeConfirmation() {
  const insets = useSafeAreaInsets();
  const { orderIds: orderIdsParam } = useLocalSearchParams();
  const { session } = useAuth();
  const [orders, setOrders] = useState<(OrderData & { producer_name: string })[]>([]);
  const [loading, setLoading] = useState(true);

  const orderIds = typeof orderIdsParam === 'string' ? orderIdsParam.split(',') : [];

  useEffect(() => {
    const loadOrders = async () => {
      if (!session?.access_token || orderIds.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const ordersData: (OrderData & { producer_name: string })[] = [];

        for (const orderId of orderIds) {
          // Fetch order details
          const orderResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/commandes_vente_directe?id=eq.${orderId}`,
            {
              headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );

          if (!orderResponse.ok) continue;

          const [orderData] = await orderResponse.json();
          if (!orderData) continue;

          // Fetch producer info
          const producerResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/producers?id=eq.${orderData.producer_id}&select=id,name`,
            {
              headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );

          let producerName = 'Unknown Producer';
          if (producerResponse.ok) {
            const [producer] = await producerResponse.json();
            producerName = producer?.name || 'Unknown Producer';
          }

          ordersData.push({
            ...orderData,
            producer_name: producerName,
          });
        }

        setOrders(ordersData);
      } catch (error) {
        console.error('Error loading orders:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [session?.access_token, orderIds.length]);

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

  const grandTotal = orders.reduce((sum, order) => sum + order.total, 0);

  return (
    <LinearGradient
      colors={[COLORS.background.nightSky, COLORS.background.mediumBlue]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="flex-1"
    >
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header Success */}
        <View style={{ paddingTop: insets.top + 40 }} className="px-4 items-center mb-8">
          <View className="mb-4">
            <CheckCircle size={64} color={COLORS.accent.hemp} strokeWidth={1.5} />
          </View>
          <Text className="text-3xl font-bold text-center" style={{ color: COLORS.text.cream }}>
            Commande validée!
          </Text>
          <Text className="text-base mt-2 text-center" style={{ color: COLORS.text.lightGray }}>
            Vos commandes ont été créées avec succès
          </Text>
        </View>

        {/* Orders List */}
        <View className="px-4">
          {orders.map((order) => (
            <View
              key={order.id}
              className="mb-4 p-4 rounded-2xl"
              style={{ backgroundColor: `${COLORS.text.white}08` }}
            >
              {/* Producer Header */}
              <View className="mb-4 pb-4 border-b" style={{ borderBottomColor: `${COLORS.accent.hemp}30` }}>
                <Text className="text-lg font-bold" style={{ color: COLORS.text.cream }}>
                  {order.producer_name}
                </Text>
                <Text className="text-sm mt-1" style={{ color: COLORS.text.lightGray }}>
                  Commande #{order.id.slice(0, 8).toUpperCase()}
                </Text>
              </View>

              {/* Total */}
              <View className="mb-4 pb-4 border-b" style={{ borderBottomColor: `${COLORS.accent.hemp}30` }}>
                <View className="flex-row justify-between items-center">
                  <Text style={{ color: COLORS.text.lightGray }}>Total:</Text>
                  <Text className="text-xl font-bold" style={{ color: COLORS.primary.gold }}>
                    {order.total.toFixed(2)}€
                  </Text>
                </View>
              </View>

              {/* Pickup Info */}
              <View className="space-y-3">
                {/* Address */}
                <View className="flex-row">
                  <MapPin size={18} color={COLORS.accent.hemp} className="mr-3 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-xs" style={{ color: COLORS.text.muted }}>
                      Adresse de retrait
                    </Text>
                    <Text className="text-sm mt-1" style={{ color: COLORS.text.cream }}>
                      {order.adresse_retrait}
                    </Text>
                  </View>
                </View>

                {/* Hours */}
                <View className="flex-row">
                  <Clock size={18} color={COLORS.accent.hemp} className="mr-3 mt-0.5" />
                  <View className="flex-1">
                    <Text className="text-xs" style={{ color: COLORS.text.muted }}>
                      Horaires d'ouverture
                    </Text>
                    <Text className="text-sm mt-1" style={{ color: COLORS.text.cream }}>
                      {order.horaires_retrait}
                    </Text>
                  </View>
                </View>

                {/* Instructions if any */}
                {order.instructions_retrait && (
                  <View className="flex-row mt-2">
                    <View className="flex-1">
                      <Text className="text-xs" style={{ color: COLORS.text.muted }}>
                        Instructions spéciales
                      </Text>
                      <Text className="text-sm mt-1" style={{ color: COLORS.text.cream }}>
                        {order.instructions_retrait}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Status Badge */}
              <View className="mt-4 pt-4 border-t" style={{ borderTopColor: `${COLORS.accent.hemp}30` }}>
                <View
                  className="px-3 py-2 rounded-lg flex-row items-center justify-between"
                  style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
                >
                  <Text className="text-xs font-bold" style={{ color: COLORS.accent.hemp }}>
                    Statut: En attente
                  </Text>
                  <Text className="text-xs" style={{ color: COLORS.accent.hemp }}>
                    Confirmation du producteur
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Grand Total */}
        {orders.length > 1 && (
          <View className="mx-4 mt-6 p-4 rounded-2xl" style={{ backgroundColor: `${COLORS.primary.gold}15` }}>
            <View className="flex-row justify-between items-center">
              <Text className="font-bold" style={{ color: COLORS.text.lightGray }}>
                Grand Total:
              </Text>
              <Text className="text-2xl font-bold" style={{ color: COLORS.primary.gold }}>
                {grandTotal.toFixed(2)}€
              </Text>
            </View>
          </View>
        )}

        {/* Info Box */}
        <View className="mx-4 mt-6 p-4 rounded-2xl" style={{ backgroundColor: `${COLORS.accent.hemp}15` }}>
          <Text className="font-bold mb-2" style={{ color: COLORS.accent.hemp }}>
            Prochaine étape
          </Text>
          <Text className="text-sm" style={{ color: COLORS.text.lightGray }}>
            Les producteurs recevront votre commande et vous confirmeront la disponibilité des produits. Un email de confirmation vous a été envoyé.
          </Text>
        </View>
      </ScrollView>

      {/* Footer Buttons */}
      <View
        className="px-4 py-4 border-t gap-3"
        style={{
          backgroundColor: COLORS.background.charcoal,
          borderTopColor: COLORS.primary.gold,
          paddingBottom: insets.bottom + 16,
        }}
      >
        <Pressable
          onPress={() => router.push('/(tabs)/marche-local')}
          className="py-4 rounded-xl flex-row items-center justify-center"
          style={{ backgroundColor: COLORS.accent.hemp }}
        >
          <Text className="font-bold text-lg" style={{ color: COLORS.text.white }}>
            Continuer les achats
          </Text>
          <ArrowRight size={18} color={COLORS.text.white} className="ml-2" />
        </Pressable>

        <Pressable
          onPress={() => router.push('/(tabs)/profile')}
          className="py-4 rounded-xl flex-row items-center justify-center"
          style={{ backgroundColor: `${COLORS.text.white}10` }}
        >
          <Text className="font-bold text-lg" style={{ color: COLORS.text.cream }}>
            Voir mes commandes
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}
