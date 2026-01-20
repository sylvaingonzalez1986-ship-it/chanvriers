/**
 * Bourse Produits - Les Chanvriers Unis
 * Écran principal de la bourse réservé aux professionnels
 */

import React, { useEffect, useCallback, useState } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { BourseBubbleGrid } from '@/components/BourseBubbleGrid';
import { BourseProductDetailModal } from '@/components/BourseProductDetailModal';
import { BourseAdminView } from '@/components/BourseAdminView';
import { useBourseStore } from '@/lib/bourse-store';
import { usePermissions, useAuth } from '@/lib/useAuth';
import { COLORS } from '@/lib/colors';
import {
  TrendingUp,
  Lock,
  LayoutGrid,
  Shield,
  RefreshCw,
  History,
} from 'lucide-react-native';

type ViewMode = 'market' | 'admin' | 'myOrders';

export default function BourseScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('market');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  // Auth & Permissions
  const { profile } = useAuth();
  const { isPro, isAdmin } = usePermissions();

  // Vérifier l'accès
  const hasAccess = isPro || isAdmin;

  // Store Bourse
  const marketStates = useBourseStore((s) => s.marketStates);
  const myOrders = useBourseStore((s) => s.myOrders);
  const allOrders = useBourseStore((s) => s.allOrders);
  const stats = useBourseStore((s) => s.stats);
  const isLoading = useBourseStore((s) => s.isLoading);
  const error = useBourseStore((s) => s.error);

  const loadMarketData = useBourseStore((s) => s.loadMarketData);
  const refreshMarketData = useBourseStore((s) => s.refreshMarketData);
  const loadMyOrders = useBourseStore((s) => s.loadMyOrders);
  const loadAllOrders = useBourseStore((s) => s.loadAllOrders);
  const loadStats = useBourseStore((s) => s.loadStats);
  const clearError = useBourseStore((s) => s.clearError);

  // Charger les données initiales
  useEffect(() => {
    if (hasAccess) {
      loadMarketData();
      loadMyOrders();
      if (isAdmin) {
        loadAllOrders();
        loadStats();
      }
    }
  }, [hasAccess, isAdmin]);

  // Sélectionner un produit pour voir les détails
  const handleProductPress = useCallback((productId: string) => {
    console.log('[Bourse] Product pressed:', productId);
    console.log('[Bourse] Market states count:', marketStates.length);
    const found = marketStates.find((ms) => ms.product_id === productId);
    console.log('[Bourse] Found market state:', found?.product?.name);
    setSelectedProductId(productId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [marketStates]);

  // Fermer le modal
  const handleCloseModal = useCallback(() => {
    setSelectedProductId(null);
  }, []);

  // Rafraîchir les données
  const handleRefresh = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    clearError();

    if (viewMode === 'market') {
      await loadMarketData();
    } else if (viewMode === 'myOrders') {
      await loadMyOrders();
    } else if (viewMode === 'admin' && isAdmin) {
      await Promise.all([loadAllOrders(), loadStats(), refreshMarketData()]);
    }
  }, [viewMode, isAdmin]);

  // Changer de vue
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Obtenir le market state pour le produit sélectionné
  const selectedMarketState = selectedProductId
    ? marketStates.find((ms) => ms.product_id === selectedProductId) || null
    : null;

  // Écran d'accès refusé
  if (!hasAccess) {
    return (
      <LinearGradient
        colors={COLORS.gradients.nightSky}
        style={{ flex: 1 }}
      >
        <SafeAreaView className="flex-1" edges={['top']}>
          <Animated.View
            entering={FadeIn.duration(500)}
            className="flex-1 items-center justify-center px-8"
          >
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
            >
              <Lock size={48} color="#EF4444" />
            </View>

            <Text
              className="font-bold text-center mb-3"
              style={{ color: COLORS.text.cream, fontSize: 22 }}
            >
              Accès réservé aux professionnels
            </Text>

            <Text
              className="text-center mb-8"
              style={{ color: COLORS.text.muted, fontSize: 14 }}
            >
              La Bourse Produits est accessible uniquement aux utilisateurs avec
              un compte professionnel approuvé.
            </Text>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.back();
              }}
            >
              <LinearGradient
                colors={[COLORS.primary.gold, COLORS.primary.mutedGold]}
                className="px-8 py-3 rounded-xl"
              >
                <Text className="font-bold" style={{ color: '#FFFFFF' }}>
                  Retour
                </Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.gradients.nightSky} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(500)}
          className="px-4 pt-4 pb-2"
        >
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-3"
                style={{ backgroundColor: 'rgba(212, 168, 83, 0.2)' }}
              >
                <TrendingUp size={22} color={COLORS.primary.gold} />
              </View>
              <View>
                <Text
                  className="font-bold"
                  style={{ color: COLORS.text.cream, fontSize: 20 }}
                >
                  Bourse Produits
                </Text>
                <Text style={{ color: COLORS.text.muted, fontSize: 12 }}>
                  Espace professionnel
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleRefresh}
              disabled={isLoading}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary.gold} />
              ) : (
                <RefreshCw size={18} color={COLORS.text.muted} />
              )}
            </Pressable>
          </View>

          {/* Onglets de navigation */}
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => handleViewModeChange('market')}
              className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
              style={{
                backgroundColor:
                  viewMode === 'market'
                    ? COLORS.primary.gold
                    : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <LayoutGrid
                size={16}
                color={viewMode === 'market' ? '#FFFFFF' : COLORS.text.muted}
              />
              <Text
                className="ml-2 font-medium"
                style={{
                  color:
                    viewMode === 'market' ? '#FFFFFF' : COLORS.text.muted,
                  fontSize: 13,
                }}
              >
                Marché
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleViewModeChange('myOrders')}
              className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
              style={{
                backgroundColor:
                  viewMode === 'myOrders'
                    ? COLORS.primary.gold
                    : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <History
                size={16}
                color={viewMode === 'myOrders' ? '#FFFFFF' : COLORS.text.muted}
              />
              <Text
                className="ml-2 font-medium"
                style={{
                  color:
                    viewMode === 'myOrders' ? '#FFFFFF' : COLORS.text.muted,
                  fontSize: 13,
                }}
              >
                Mes ordres
              </Text>
            </Pressable>

            {isAdmin && (
              <Pressable
                onPress={() => handleViewModeChange('admin')}
                className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                style={{
                  backgroundColor:
                    viewMode === 'admin'
                      ? COLORS.accent.teal
                      : 'rgba(255, 255, 255, 0.1)',
                }}
              >
                <Shield
                  size={16}
                  color={viewMode === 'admin' ? '#FFFFFF' : COLORS.text.muted}
                />
                <Text
                  className="ml-2 font-medium"
                  style={{
                    color:
                      viewMode === 'admin' ? '#FFFFFF' : COLORS.text.muted,
                    fontSize: 13,
                  }}
                >
                  Admin
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>

        {/* Erreur */}
        {error && (
          <Animated.View
            entering={FadeIn.duration(300)}
            className="mx-4 mb-2 p-3 rounded-xl"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
          >
            <Text style={{ color: '#EF4444', fontSize: 13 }}>{error}</Text>
          </Animated.View>
        )}

        {/* Contenu */}
        {isLoading && marketStates.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={COLORS.primary.gold} />
            <Text
              className="mt-4"
              style={{ color: COLORS.text.muted, fontSize: 14 }}
            >
              Chargement des données...
            </Text>
          </View>
        ) : viewMode === 'market' ? (
          <BourseBubbleGrid
            marketStates={marketStates}
            onProductPress={handleProductPress}
            isRefreshing={isLoading}
            onRefresh={handleRefresh}
          />
        ) : viewMode === 'myOrders' ? (
          <MyOrdersView orders={myOrders} isRefreshing={isLoading} onRefresh={handleRefresh} />
        ) : (
          <BourseAdminView
            orders={allOrders}
            stats={stats}
            isRefreshing={isLoading}
            onRefresh={handleRefresh}
          />
        )}

        {/* Modal de détail produit */}
        <BourseProductDetailModal
          visible={selectedProductId !== null}
          marketState={selectedMarketState}
          onClose={handleCloseModal}
        />
      </SafeAreaView>
    </LinearGradient>
  );
}

// ==================== Composant Mes Ordres ====================

interface MyOrdersViewProps {
  orders: import('@/lib/supabase-bourse').ProOrder[];
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

function MyOrdersView({ orders, isRefreshing = false, onRefresh }: MyOrdersViewProps) {
  const cancelMyOrder = useBourseStore((s) => s.cancelMyOrder);
  const isLoading = useBourseStore((s) => s.isLoading);

  const handleCancel = useCallback(async (orderId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await cancelMyOrder(orderId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [cancelMyOrder]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'En attente', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.2)' };
      case 'matched':
        return { label: 'Validé', color: '#22C55E', bgColor: 'rgba(34, 197, 94, 0.2)' };
      case 'cancelled':
        return { label: 'Annulé', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.2)' };
      default:
        return { label: status, color: COLORS.text.muted, bgColor: 'rgba(107, 114, 128, 0.2)' };
    }
  };

  return (
    <Animated.ScrollView
      entering={FadeIn.duration(300)}
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <View>
            {isRefreshing && (
              <ActivityIndicator
                size="small"
                color={COLORS.primary.gold}
                style={{ marginVertical: 10 }}
              />
            )}
          </View>
        ) : undefined
      }
    >
      <Text
        className="font-bold mb-4"
        style={{ color: COLORS.text.cream, fontSize: 16 }}
      >
        Mes demandes ({orders.length})
      </Text>

      {orders.length === 0 ? (
        <View
          className="p-8 items-center rounded-xl"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          <History size={48} color={COLORS.text.muted} />
          <Text
            className="mt-4 text-center"
            style={{ color: COLORS.text.muted, fontSize: 14 }}
          >
            Vous n'avez pas encore passé de demande.
          </Text>
          <Text
            className="mt-1 text-center"
            style={{ color: COLORS.text.muted, fontSize: 12 }}
          >
            Parcourez le marché et cliquez sur une bulle pour passer une demande.
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {orders.map((order, index) => {
            const statusConfig = getStatusConfig(order.status);
            const totalAmount = order.quantity * order.unit_price;

            return (
              <Animated.View
                key={order.id}
                entering={FadeInDown.delay(index * 50).duration(300)}
                className="rounded-xl overflow-hidden"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
              >
                <View className="flex-row items-center justify-between p-3 border-b border-white/5">
                  <View className="flex-row items-center flex-1">
                    {order.product?.image && (
                      <Animated.Image
                        source={{ uri: order.product.image }}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          marginRight: 12,
                        }}
                        resizeMode="cover"
                      />
                    )}
                    <View className="flex-1">
                      <Text
                        className="font-bold"
                        style={{ color: COLORS.text.cream, fontSize: 14 }}
                        numberOfLines={1}
                      >
                        {order.product?.name || 'Produit'}
                      </Text>
                      <Text style={{ color: COLORS.text.muted, fontSize: 11 }}>
                        {formatDate(order.created_at)}
                      </Text>
                    </View>
                  </View>

                  <View
                    className="px-2 py-1 rounded-lg"
                    style={{ backgroundColor: statusConfig.bgColor }}
                  >
                    <Text
                      className="font-medium"
                      style={{ color: statusConfig.color, fontSize: 11 }}
                    >
                      {statusConfig.label}
                    </Text>
                  </View>
                </View>

                <View className="p-3">
                  <View className="flex-row justify-between mb-1">
                    <Text style={{ color: COLORS.text.muted, fontSize: 12 }}>
                      {order.quantity} × {order.unit_price.toFixed(2)}€
                    </Text>
                    <Text
                      className="font-bold"
                      style={{ color: COLORS.primary.gold, fontSize: 14 }}
                    >
                      {totalAmount.toFixed(2)}€
                    </Text>
                  </View>

                  {order.status === 'pending' && (
                    <Pressable
                      onPress={() => handleCancel(order.id)}
                      disabled={isLoading}
                      className="mt-2 py-2 rounded-lg items-center"
                      style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                    >
                      <Text
                        className="font-medium"
                        style={{ color: '#EF4444', fontSize: 13 }}
                      >
                        Annuler la demande
                      </Text>
                    </Pressable>
                  )}
                </View>
              </Animated.View>
            );
          })}
        </View>
      )}
    </Animated.ScrollView>
  );
}
