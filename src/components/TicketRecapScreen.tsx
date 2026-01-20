/**
 * TicketRecapScreen - Les Chanvriers Unis
 * Écran récapitulatif de commande - les tickets sont déjà distribués directement
 */

import React, { useEffect } from 'react';
import { View, Modal, Pressable, ScrollView, Dimensions } from 'react-native';
import { Text } from '@/components/ui';
import { useRouter } from 'expo-router';
import {
  X,
  ShoppingBag,
  Ticket,
  ArrowRight,
  Package,
  CheckCircle,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/lib/colors';
import { CustomerInfo } from '@/lib/store';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OrderRecapData {
  orderId: string;
  customerInfo: CustomerInfo;
  items: Array<{
    productId: string;
    productName: string;
    productType: string;
    producerId: string;
    producerName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  shippingFee: number;
  total: number;
  ticketsEarned: number;
}

interface TicketRecapScreenProps {
  visible: boolean;
  orderData: OrderRecapData | null;
  onClose: () => void;
}

export function TicketRecapScreen({
  visible,
  orderData,
  onClose,
}: TicketRecapScreenProps) {
  const router = useRouter();

  // Log render state
  useEffect(() => {
    if (visible && orderData) {
      console.log('[TicketRecapScreen] Visible with orderData:', orderData.ticketsEarned, 'tickets');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [visible, orderData]);

  const handleGoToTirage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onClose();
    router.push('/(tabs)/tirage');
  };

  // Ne rien afficher si pas visible ou pas de données
  if (!visible || !orderData) {
    return null;
  }

  // Grouper les items par producteur
  const itemsByProducer = orderData.items.reduce((acc, item) => {
    if (!acc[item.producerId]) {
      acc[item.producerId] = {
        producerName: item.producerName,
        items: [],
      };
    }
    acc[item.producerId].items.push(item);
    return acc;
  }, {} as Record<string, { producerName: string; items: typeof orderData.items }>);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
        <View
          style={{
            backgroundColor: COLORS.background.charcoal,
            borderRadius: 24,
            borderWidth: 2,
            borderColor: COLORS.primary.gold,
            width: '100%',
            maxWidth: 400,
            maxHeight: SCREEN_HEIGHT * 0.85,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <LinearGradient
            colors={[`${COLORS.primary.gold}30`, 'transparent']}
            style={{
              paddingHorizontal: 20,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottomWidth: 1,
              borderBottomColor: `${COLORS.primary.gold}30`,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ShoppingBag size={24} color={COLORS.primary.gold} />
              <Text
                style={{ color: COLORS.text.cream, fontSize: 20, fontWeight: 'bold', marginLeft: 12 }}
              >
                Commande envoyée !
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${COLORS.text.muted}20`,
              }}
            >
              <X size={20} color={COLORS.text.muted} />
            </Pressable>
          </LinearGradient>

          {/* Contenu scrollable */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Tickets gagnés - en premier, bien visible */}
            {orderData.ticketsEarned > 0 && (
              <View
                style={{
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 20,
                  backgroundColor: `${COLORS.primary.brightYellow}15`,
                  borderWidth: 2,
                  borderColor: `${COLORS.primary.brightYellow}40`,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                  <CheckCircle size={24} color={COLORS.accent.hemp} style={{ marginRight: 8 }} />
                  <Ticket size={32} color={COLORS.primary.brightYellow} />
                  <Text
                    style={{ color: COLORS.primary.brightYellow, fontWeight: 'bold', fontSize: 28, marginLeft: 10 }}
                  >
                    +{orderData.ticketsEarned}
                  </Text>
                </View>
                <Text
                  style={{ color: COLORS.text.cream, textAlign: 'center', fontSize: 16, fontWeight: '600' }}
                >
                  {orderData.ticketsEarned > 1 ? 'Tickets ajoutés !' : 'Ticket ajouté !'}
                </Text>
                <Text
                  style={{ color: COLORS.text.lightGray, textAlign: 'center', fontSize: 13, marginTop: 4 }}
                >
                  Vos tickets ont été crédités automatiquement
                </Text>
              </View>
            )}

            {/* Titre section commande */}
            <Text
              style={{ color: COLORS.text.muted, fontSize: 12, fontWeight: '600', marginBottom: 12 }}
            >
              RÉCAPITULATIF DE VOTRE COMMANDE
            </Text>

            {/* Liste des produits par producteur */}
            {Object.entries(itemsByProducer).map(([producerId, { producerName, items }]) => (
              <View
                key={producerId}
                style={{
                  marginBottom: 16,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: `${COLORS.background.nightSky}80`,
                }}
              >
                {/* Header producteur */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: `${COLORS.accent.forest}20`,
                  }}
                >
                  <Package size={14} color={COLORS.accent.hemp} />
                  <Text
                    style={{ color: COLORS.accent.hemp, fontWeight: '600', fontSize: 13, marginLeft: 8 }}
                  >
                    {producerName}
                  </Text>
                </View>

                {/* Items du producteur */}
                {items.map((item, index) => (
                  <View
                    key={`${item.productId}-${index}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderTopWidth: index > 0 ? 1 : 0,
                      borderTopColor: `${COLORS.text.muted}15`,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ color: COLORS.text.cream, fontWeight: '500', fontSize: 14 }}
                        numberOfLines={1}
                      >
                        {item.productName}
                      </Text>
                      <Text style={{ color: COLORS.text.muted, fontSize: 12 }}>
                        {item.quantity} x {item.unitPrice.toFixed(2)}€
                      </Text>
                    </View>
                    <Text
                      style={{ color: COLORS.text.lightGray, fontWeight: '600', fontSize: 14 }}
                    >
                      {item.totalPrice.toFixed(2)}€
                    </Text>
                  </View>
                ))}
              </View>
            ))}

            {/* Totaux */}
            <View
              style={{
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                backgroundColor: `${COLORS.primary.gold}10`,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: COLORS.text.muted, fontSize: 14 }}>Sous-total</Text>
                <Text style={{ color: COLORS.text.lightGray, fontSize: 14 }}>
                  {orderData.subtotal.toFixed(2)}€
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: COLORS.text.muted, fontSize: 14 }}>Livraison</Text>
                <Text
                  style={{
                    color: orderData.shippingFee === 0 ? COLORS.accent.hemp : COLORS.text.lightGray,
                    fontSize: 14,
                  }}
                >
                  {orderData.shippingFee === 0 ? 'OFFERT' : `${orderData.shippingFee.toFixed(2)}€`}
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: `${COLORS.primary.gold}30`,
                }}
              >
                <Text style={{ color: COLORS.text.cream, fontWeight: 'bold', fontSize: 16 }}>
                  Total TTC
                </Text>
                <Text style={{ color: COLORS.primary.brightYellow, fontWeight: 'bold', fontSize: 20 }}>
                  {orderData.total.toFixed(2)}€
                </Text>
              </View>
            </View>

            {/* Info email */}
            <View
              style={{
                borderRadius: 12,
                padding: 12,
                backgroundColor: `${COLORS.text.muted}10`,
              }}
            >
              <Text
                style={{ color: COLORS.text.muted, textAlign: 'center', fontSize: 13 }}
              >
                Un lien de paiement sera envoyé à {orderData.customerInfo.email}
              </Text>
            </View>
          </ScrollView>

          {/* Bouton - fixe en bas */}
          <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 }}>
            <Pressable
              onPress={handleGoToTirage}
              style={{
                borderRadius: 12,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                backgroundColor: COLORS.accent.forest,
              }}
            >
              <Ticket size={20} color={COLORS.text.white} style={{ marginRight: 8 }} />
              <Text
                style={{
                  color: COLORS.text.white,
                  fontWeight: 'bold',
                  fontSize: 18,
                  marginRight: 8,
                }}
              >
                Accéder au tirage
              </Text>
              <ArrowRight size={22} color={COLORS.text.white} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
