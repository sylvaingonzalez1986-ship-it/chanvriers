/**
 * BourseAdminView - Les Chanvriers Unis
 * Vue administrateur pour la gestion des ordres de la bourse
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ProOrder, ProOrderStatus, BourseStats } from '@/lib/supabase-bourse';
import { useBourseStore } from '@/lib/bourse-store';
import { COLORS } from '@/lib/colors';
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Users,
  ShoppingCart,
  Filter,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react-native';

interface BourseAdminViewProps {
  orders: ProOrder[];
  stats: BourseStats | null;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

type FilterStatus = 'all' | ProOrderStatus;

const STATUS_CONFIG: Record<
  ProOrderStatus,
  { label: string; color: string; icon: typeof Clock; bgColor: string }
> = {
  pending: {
    label: 'En attente',
    color: '#F59E0B',
    icon: Clock,
    bgColor: 'rgba(245, 158, 11, 0.2)',
  },
  matched: {
    label: 'Validé',
    color: '#22C55E',
    icon: CheckCircle,
    bgColor: 'rgba(34, 197, 94, 0.2)',
  },
  cancelled: {
    label: 'Annulé',
    color: '#EF4444',
    icon: XCircle,
    bgColor: 'rgba(239, 68, 68, 0.2)',
  },
};

export function BourseAdminView({
  orders,
  stats,
  isRefreshing = false,
  onRefresh,
}: BourseAdminViewProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);

  const updateOrderStatus = useBourseStore((s) => s.updateOrderStatus);
  const isLoading = useBourseStore((s) => s.isLoading);

  // Filtrer les ordres
  const filteredOrders = useMemo(() => {
    if (filterStatus === 'all') return orders;
    return orders.filter((o) => o.status === filterStatus);
  }, [orders, filterStatus]);

  const handleStatusChange = useCallback(
    async (orderId: string, newStatus: ProOrderStatus) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      try {
        await updateOrderStatus(orderId, newStatus);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [updateOrderStatus]
  );

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
          />
        ) : undefined
      }
    >
      {/* Statistiques */}
      {stats && (
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          className="mx-4 mt-4"
        >
          <Text
            className="font-bold mb-3"
            style={{ color: COLORS.text.cream, fontSize: 16 }}
          >
            Tableau de bord
          </Text>

          {/* Stats cards */}
          <View className="flex-row flex-wrap gap-2">
            <View
              className="flex-1 min-w-[45%] p-4 rounded-xl"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}
            >
              <View className="flex-row items-center mb-2">
                <Clock size={18} color="#F59E0B" />
                <Text
                  className="ml-2"
                  style={{ color: COLORS.text.muted, fontSize: 12 }}
                >
                  En attente
                </Text>
              </View>
              <Text
                className="font-bold"
                style={{ color: '#F59E0B', fontSize: 24 }}
              >
                {stats.pendingOrders}
              </Text>
            </View>

            <View
              className="flex-1 min-w-[45%] p-4 rounded-xl"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}
            >
              <View className="flex-row items-center mb-2">
                <CheckCircle size={18} color="#22C55E" />
                <Text
                  className="ml-2"
                  style={{ color: COLORS.text.muted, fontSize: 12 }}
                >
                  Validés
                </Text>
              </View>
              <Text
                className="font-bold"
                style={{ color: '#22C55E', fontSize: 24 }}
              >
                {stats.matchedOrders}
              </Text>
            </View>

            <View
              className="flex-1 min-w-[45%] p-4 rounded-xl"
              style={{ backgroundColor: 'rgba(107, 114, 128, 0.15)' }}
            >
              <View className="flex-row items-center mb-2">
                <ShoppingCart size={18} color={COLORS.text.muted} />
                <Text
                  className="ml-2"
                  style={{ color: COLORS.text.muted, fontSize: 12 }}
                >
                  Total ordres
                </Text>
              </View>
              <Text
                className="font-bold"
                style={{ color: COLORS.text.cream, fontSize: 24 }}
              >
                {stats.totalOrders}
              </Text>
            </View>

            <View
              className="flex-1 min-w-[45%] p-4 rounded-xl"
              style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
            >
              <View className="flex-row items-center mb-2">
                <XCircle size={18} color="#EF4444" />
                <Text
                  className="ml-2"
                  style={{ color: COLORS.text.muted, fontSize: 12 }}
                >
                  Annulés
                </Text>
              </View>
              <Text
                className="font-bold"
                style={{ color: '#EF4444', fontSize: 24 }}
              >
                {stats.cancelledOrders}
              </Text>
            </View>
          </View>

          {/* Top produits */}
          {stats.topDemandProducts.length > 0 && (
            <View className="mt-4">
              <Text
                className="font-bold mb-2"
                style={{ color: COLORS.text.cream, fontSize: 14 }}
              >
                Top produits demandés
              </Text>
              {stats.topDemandProducts.slice(0, 3).map((p, index) => (
                <View
                  key={p.productId}
                  className="flex-row items-center justify-between py-2 border-b border-white/5"
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-6 h-6 rounded-full items-center justify-center mr-2"
                      style={{
                        backgroundColor:
                          index === 0
                            ? COLORS.primary.gold
                            : index === 1
                            ? '#C0C0C0'
                            : '#CD7F32',
                      }}
                    >
                      <Text
                        className="font-bold"
                        style={{ color: '#FFFFFF', fontSize: 11 }}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <Text
                      style={{ color: COLORS.text.lightGray, fontSize: 13 }}
                      numberOfLines={1}
                    >
                      {p.productName}
                    </Text>
                  </View>
                  <Text
                    className="font-bold"
                    style={{ color: COLORS.primary.gold, fontSize: 13 }}
                  >
                    {p.totalDemand} demandes
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Top variations */}
          {stats.topVariationProducts.length > 0 && (
            <View className="mt-4">
              <Text
                className="font-bold mb-2"
                style={{ color: COLORS.text.cream, fontSize: 14 }}
              >
                Plus fortes variations
              </Text>
              {stats.topVariationProducts.slice(0, 3).map((p) => (
                <View
                  key={p.productId}
                  className="flex-row items-center justify-between py-2 border-b border-white/5"
                >
                  <Text
                    style={{ color: COLORS.text.lightGray, fontSize: 13 }}
                    numberOfLines={1}
                  >
                    {p.productName}
                  </Text>
                  <View className="flex-row items-center">
                    {p.variationPercent > 0 ? (
                      <TrendingUp size={14} color="#22C55E" />
                    ) : (
                      <TrendingDown size={14} color="#EF4444" />
                    )}
                    <Text
                      className="ml-1 font-bold"
                      style={{
                        color: p.variationPercent > 0 ? '#22C55E' : '#EF4444',
                        fontSize: 13,
                      }}
                    >
                      {p.variationPercent > 0 ? '+' : ''}
                      {p.variationPercent.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      )}

      {/* Filtres */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(500)}
        className="mx-4 mt-6"
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFilters(!showFilters);
          }}
          className="flex-row items-center justify-between p-3 rounded-xl"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        >
          <View className="flex-row items-center">
            <Filter size={18} color={COLORS.primary.gold} />
            <Text
              className="ml-2 font-medium"
              style={{ color: COLORS.text.cream, fontSize: 14 }}
            >
              Filtrer par statut
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text style={{ color: COLORS.text.muted, fontSize: 13 }}>
              {filterStatus === 'all'
                ? 'Tous'
                : STATUS_CONFIG[filterStatus].label}
            </Text>
            <ChevronDown
              size={18}
              color={COLORS.text.muted}
              style={{
                marginLeft: 4,
                transform: [{ rotate: showFilters ? '180deg' : '0deg' }],
              }}
            />
          </View>
        </Pressable>

        {showFilters && (
          <Animated.View
            entering={FadeIn.duration(200)}
            className="flex-row flex-wrap gap-2 mt-2"
          >
            <Pressable
              onPress={() => {
                setFilterStatus('all');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              className="px-3 py-2 rounded-lg"
              style={{
                backgroundColor:
                  filterStatus === 'all'
                    ? COLORS.primary.gold
                    : 'rgba(255, 255, 255, 0.1)',
              }}
            >
              <Text
                style={{
                  color: filterStatus === 'all' ? '#FFFFFF' : COLORS.text.muted,
                  fontSize: 12,
                }}
              >
                Tous
              </Text>
            </Pressable>

            {(Object.keys(STATUS_CONFIG) as ProOrderStatus[]).map((status) => {
              const config = STATUS_CONFIG[status];
              const Icon = config.icon;
              return (
                <Pressable
                  key={status}
                  onPress={() => {
                    setFilterStatus(status);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className="flex-row items-center px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor:
                      filterStatus === status
                        ? config.color
                        : 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Icon
                    size={14}
                    color={filterStatus === status ? '#FFFFFF' : config.color}
                  />
                  <Text
                    className="ml-1"
                    style={{
                      color:
                        filterStatus === status ? '#FFFFFF' : COLORS.text.muted,
                      fontSize: 12,
                    }}
                  >
                    {config.label}
                  </Text>
                </Pressable>
              );
            })}
          </Animated.View>
        )}
      </Animated.View>

      {/* Liste des ordres */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(500)}
        className="mx-4 mt-4"
      >
        <Text
          className="font-bold mb-3"
          style={{ color: COLORS.text.cream, fontSize: 16 }}
        >
          Ordres ({filteredOrders.length})
        </Text>

        {filteredOrders.length === 0 ? (
          <View
            className="p-8 items-center rounded-xl"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
          >
            <Package size={48} color={COLORS.text.muted} />
            <Text
              className="mt-4 text-center"
              style={{ color: COLORS.text.muted, fontSize: 14 }}
            >
              Aucun ordre trouvé
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {filteredOrders.map((order, index) => {
              const statusConfig = STATUS_CONFIG[order.status];
              const StatusIcon = statusConfig.icon;
              const totalAmount = order.quantity * order.unit_price;

              return (
                <Animated.View
                  key={order.id}
                  entering={FadeInDown.delay(index * 50).duration(300)}
                  layout={Layout.springify()}
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                >
                  {/* Header de l'ordre */}
                  <View className="flex-row items-center justify-between p-3 border-b border-white/5">
                    <View className="flex-row items-center flex-1">
                      {order.product?.image && (
                        <View
                          className="w-10 h-10 rounded-lg overflow-hidden mr-3"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          <Animated.Image
                            source={{ uri: order.product.image }}
                            style={{ width: 40, height: 40 }}
                            resizeMode="cover"
                          />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text
                          className="font-bold"
                          style={{ color: COLORS.text.cream, fontSize: 14 }}
                          numberOfLines={1}
                        >
                          {order.product?.name || 'Produit'}
                        </Text>
                        <Text
                          style={{ color: COLORS.text.muted, fontSize: 11 }}
                        >
                          {formatDate(order.created_at)}
                        </Text>
                      </View>
                    </View>

                    <View
                      className="flex-row items-center px-2 py-1 rounded-lg"
                      style={{ backgroundColor: statusConfig.bgColor }}
                    >
                      <StatusIcon size={12} color={statusConfig.color} />
                      <Text
                        className="ml-1 font-medium"
                        style={{ color: statusConfig.color, fontSize: 11 }}
                      >
                        {statusConfig.label}
                      </Text>
                    </View>
                  </View>

                  {/* Détails */}
                  <View className="p-3">
                    <View className="flex-row justify-between mb-2">
                      <Text style={{ color: COLORS.text.muted, fontSize: 12 }}>
                        Pro
                      </Text>
                      <Text
                        style={{ color: COLORS.text.lightGray, fontSize: 12 }}
                      >
                        {order.profile?.company_name ||
                          order.profile?.business_name ||
                          order.profile?.full_name ||
                          'Utilisateur'}
                      </Text>
                    </View>

                    <View className="flex-row justify-between mb-2">
                      <Text style={{ color: COLORS.text.muted, fontSize: 12 }}>
                        Quantité
                      </Text>
                      <Text
                        className="font-medium"
                        style={{ color: COLORS.text.lightGray, fontSize: 12 }}
                      >
                        {order.quantity} unités
                      </Text>
                    </View>

                    <View className="flex-row justify-between mb-2">
                      <Text style={{ color: COLORS.text.muted, fontSize: 12 }}>
                        Prix unitaire
                      </Text>
                      <Text
                        style={{ color: COLORS.text.lightGray, fontSize: 12 }}
                      >
                        {order.unit_price.toFixed(2)}€
                      </Text>
                    </View>

                    <View className="flex-row justify-between pt-2 border-t border-white/5">
                      <Text
                        className="font-bold"
                        style={{ color: COLORS.text.cream, fontSize: 13 }}
                      >
                        Total HT
                      </Text>
                      <Text
                        className="font-bold"
                        style={{ color: COLORS.primary.gold, fontSize: 13 }}
                      >
                        {totalAmount.toFixed(2)}€
                      </Text>
                    </View>
                  </View>

                  {/* Actions (seulement pour pending) */}
                  {order.status === 'pending' && (
                    <View className="flex-row gap-2 p-3 border-t border-white/5">
                      <Pressable
                        onPress={() => handleStatusChange(order.id, 'matched')}
                        disabled={isLoading}
                        className="flex-1 flex-row items-center justify-center py-2 rounded-lg"
                        style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
                      >
                        <CheckCircle size={16} color="#22C55E" />
                        <Text
                          className="ml-2 font-medium"
                          style={{ color: '#22C55E', fontSize: 13 }}
                        >
                          Valider
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() =>
                          handleStatusChange(order.id, 'cancelled')
                        }
                        disabled={isLoading}
                        className="flex-1 flex-row items-center justify-center py-2 rounded-lg"
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}
                      >
                        <XCircle size={16} color="#EF4444" />
                        <Text
                          className="ml-2 font-medium"
                          style={{ color: '#EF4444', fontSize: 13 }}
                        >
                          Annuler
                        </Text>
                      </Pressable>
                    </View>
                  )}
                </Animated.View>
              );
            })}
          </View>
        )}
      </Animated.View>
    </ScrollView>
  );
}
