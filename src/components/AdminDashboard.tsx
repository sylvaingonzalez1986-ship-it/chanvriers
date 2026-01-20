import React, { useState, useEffect } from 'react';
import { View, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui';
import {
  TrendingUp,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  Eye,
  ChevronDown,
  ChevronUp,
  Truck,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Store,
  Award,
  RefreshCw,
} from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { useOrdersStore, useProducerStore, Order } from '@/lib/store';
import { fetchUsers, UserProfile, USER_ROLE_LABELS, USER_ROLE_COLORS, UserRole } from '@/lib/supabase-users';
import { fetchOrders, isSupabaseSyncConfigured } from '@/lib/supabase-sync';

interface AdminDashboardProps {
  onNavigateToUsers?: () => void;
}

export const AdminDashboard = ({ onNavigateToUsers }: AdminDashboardProps) => {
  const [periodFilter, setPeriodFilter] = useState<'day' | 'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showProductDetails, setShowProductDetails] = useState(false);
  const [showProducerDetails, setShowProducerDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userCounts, setUserCounts] = useState<Record<UserRole, number>>({
    client: 0,
    pro: 0,
    producer: 0,
    admin: 0,
  });

  // Orders and producers from stores
  const allOrders = useOrdersStore((s) => s.orders);
  const setOrders = useOrdersStore((s) => s.setOrders);
  const producers = useProducerStore((s) => s.producers);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch users
      const { users: fetchedUsers } = await fetchUsers();
      setUsers(fetchedUsers);

      // Calculate user counts
      const counts: Record<UserRole, number> = { client: 0, pro: 0, producer: 0, admin: 0 };
      fetchedUsers.forEach((user) => {
        if (user.role in counts) {
          counts[user.role]++;
        }
      });
      setUserCounts(counts);

      // Fetch orders from Supabase
      if (isSupabaseSyncConfigured()) {
        const supabaseOrders = await fetchOrders();
        if (supabaseOrders.length > 0) {
          setOrders(supabaseOrders);
        }
      }
    } catch (error) {
      console.error('[AdminDashboard] Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Filter orders by period
  const getFilteredOrders = () => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    return allOrders.filter((order) => {
      if (periodFilter === 'all') return true;
      if (periodFilter === 'day') return order.createdAt >= startOfDay;
      if (periodFilter === 'week') return order.createdAt >= startOfWeek;
      if (periodFilter === 'month') return order.createdAt >= startOfMonth;
      if (periodFilter === 'quarter') return order.createdAt >= startOfQuarter;
      if (periodFilter === 'year') return order.createdAt >= startOfYear;
      return true;
    });
  };

  // Calculate financials from shipped orders only
  const calculateFinancials = () => {
    const filteredOrders = getFilteredOrders();
    const shippedOrders = filteredOrders.filter((o) => o.status === 'shipped');

    let totalTTC = 0;
    let totalTVA = 0;

    shippedOrders.forEach((order) => {
      totalTTC += order.total;
      order.items.forEach((item) => {
        const tvaRate = item.tvaRate ?? 20;
        const tva = item.totalPrice - item.totalPrice / (1 + tvaRate / 100);
        totalTVA += tva;
      });
    });

    const totalHT = totalTTC - totalTVA;

    return {
      totalHT,
      totalTVA,
      totalTTC,
      shippedCount: shippedOrders.length,
      totalOrders: filteredOrders.length,
      pendingCount: filteredOrders.filter((o) => o.status === 'pending').length,
      paidCount: filteredOrders.filter((o) => o.status === 'paid').length,
    };
  };

  // Get most added products (from order items)
  const getMostAddedProducts = () => {
    const productCounts: Record<string, { name: string; count: number; revenue: number }> = {};

    allOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productCounts[item.productId]) {
          productCounts[item.productId] = { name: item.productName, count: 0, revenue: 0 };
        }
        productCounts[item.productId].count += item.quantity;
        productCounts[item.productId].revenue += item.totalPrice;
      });
    });

    return Object.entries(productCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // Get producers with most orders
  const getTopProducers = () => {
    const producerStats: Record<string, { name: string; orderCount: number; revenue: number; productCount: number }> = {};

    // Initialize with all producers
    producers.forEach((producer) => {
      producerStats[producer.id] = {
        name: producer.name,
        orderCount: 0,
        revenue: 0,
        productCount: producer.products?.length || 0,
      };
    });

    // Count from orders
    allOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (producerStats[item.producerId]) {
          producerStats[item.producerId].orderCount += 1;
          producerStats[item.producerId].revenue += item.totalPrice;
        }
      });
    });

    return Object.entries(producerStats)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const financials = calculateFinancials();
  const topProducts = getMostAddedProducts();
  const topProducers = getTopProducers();
  const totalUsers = Object.values(userCounts).reduce((sum, count) => sum + count, 0);

  if (isLoading) {
    return (
      <View className="py-8 items-center">
        <ActivityIndicator size="large" color={COLORS.primary.gold} />
        <Text style={{ color: COLORS.text.muted }} className="mt-3">
          Chargement du dashboard...
        </Text>
      </View>
    );
  }

  return (
    <View>
      {/* Header with Refresh */}
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <BarChart3 size={24} color={COLORS.primary.gold} />
          <Text style={{ color: COLORS.text.cream }} className="text-xl font-bold ml-2">
            Dashboard Admin
          </Text>
        </View>
        <Pressable
          onPress={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-xl active:opacity-70"
          style={{ backgroundColor: `${COLORS.primary.gold}20` }}
        >
          <RefreshCw
            size={20}
            color={COLORS.primary.gold}
            style={{ transform: [{ rotate: isRefreshing ? '360deg' : '0deg' }] }}
          />
        </Pressable>
      </View>

      {/* Period Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4" style={{ flexGrow: 0 }}>
        <View className="flex-row" style={{ gap: 6 }}>
          {[
            { key: 'day' as const, label: 'Jour' },
            { key: 'week' as const, label: 'Semaine' },
            { key: 'month' as const, label: 'Mois' },
            { key: 'quarter' as const, label: 'Trimestre' },
            { key: 'year' as const, label: 'Année' },
            { key: 'all' as const, label: 'Total' },
          ].map((period) => (
            <Pressable
              key={period.key}
              onPress={() => setPeriodFilter(period.key)}
              className="px-4 py-2 rounded-lg"
              style={{
                backgroundColor:
                  periodFilter === period.key ? COLORS.primary.gold : `${COLORS.primary.gold}15`,
                borderWidth: 1,
                borderColor:
                  periodFilter === period.key ? COLORS.primary.gold : `${COLORS.primary.gold}30`,
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{
                  color: periodFilter === period.key ? COLORS.background.nightSky : COLORS.primary.gold,
                }}
              >
                {period.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Financial Summary - Shipped Orders Only */}
      <View
        className="rounded-2xl p-4 mb-4"
        style={{
          backgroundColor: `${COLORS.accent.hemp}15`,
          borderWidth: 1,
          borderColor: `${COLORS.accent.hemp}30`,
        }}
      >
        <View className="flex-row items-center mb-3">
          <DollarSign size={20} color={COLORS.accent.hemp} />
          <Text style={{ color: COLORS.accent.hemp }} className="font-bold ml-2">
            Chiffre d'affaires (commandes expédiées)
          </Text>
        </View>

        <View className="flex-row mb-3" style={{ gap: 8 }}>
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: `${COLORS.text.white}05` }}
          >
            <Text style={{ color: COLORS.accent.hemp }} className="text-2xl font-bold">
              {financials.totalTTC.toFixed(2)}€
            </Text>
            <Text style={{ color: COLORS.text.muted }} className="text-xs">
              CA TTC
            </Text>
          </View>
          <View
            className="flex-1 rounded-xl p-3 items-center"
            style={{ backgroundColor: `${COLORS.text.white}05` }}
          >
            <Text style={{ color: COLORS.primary.paleGold }} className="text-2xl font-bold">
              {financials.totalHT.toFixed(2)}€
            </Text>
            <Text style={{ color: COLORS.text.muted }} className="text-xs">
              CA HT
            </Text>
          </View>
        </View>

        <View
          className="rounded-xl p-3 flex-row items-center justify-between"
          style={{ backgroundColor: 'rgba(199, 91, 91, 0.15)', borderWidth: 1, borderColor: 'rgba(199, 91, 91, 0.3)' }}
        >
          <View className="flex-row items-center">
            <AlertCircle size={16} color="#C75B5B" />
            <Text style={{ color: '#C75B5B' }} className="font-medium ml-2">
              TVA à reverser
            </Text>
          </View>
          <Text style={{ color: '#C75B5B' }} className="text-xl font-bold">
            {financials.totalTVA.toFixed(2)}€
          </Text>
        </View>
      </View>

      {/* Orders Stats */}
      <View className="flex-row mb-4" style={{ gap: 8 }}>
        <View
          className="flex-1 rounded-xl p-3 items-center"
          style={{ backgroundColor: `${COLORS.accent.teal}15`, borderWidth: 1, borderColor: `${COLORS.accent.teal}30` }}
        >
          <Truck size={20} color={COLORS.accent.teal} />
          <Text style={{ color: COLORS.accent.teal }} className="text-xl font-bold mt-1">
            {financials.shippedCount}
          </Text>
          <Text style={{ color: COLORS.text.muted }} className="text-xs text-center">
            Expédiées
          </Text>
        </View>
        <View
          className="flex-1 rounded-xl p-3 items-center"
          style={{ backgroundColor: `${COLORS.primary.orange}15`, borderWidth: 1, borderColor: `${COLORS.primary.orange}30` }}
        >
          <Clock size={20} color={COLORS.primary.orange} />
          <Text style={{ color: COLORS.primary.orange }} className="text-xl font-bold mt-1">
            {financials.pendingCount}
          </Text>
          <Text style={{ color: COLORS.text.muted }} className="text-xs text-center">
            En attente
          </Text>
        </View>
        <View
          className="flex-1 rounded-xl p-3 items-center"
          style={{ backgroundColor: `${COLORS.accent.sky}15`, borderWidth: 1, borderColor: `${COLORS.accent.sky}30` }}
        >
          <CheckCircle size={20} color={COLORS.accent.sky} />
          <Text style={{ color: COLORS.accent.sky }} className="text-xl font-bold mt-1">
            {financials.paidCount}
          </Text>
          <Text style={{ color: COLORS.text.muted }} className="text-xs text-center">
            Payées
          </Text>
        </View>
        <View
          className="flex-1 rounded-xl p-3 items-center"
          style={{ backgroundColor: `${COLORS.text.white}05`, borderWidth: 1, borderColor: `${COLORS.text.white}10` }}
        >
          <ShoppingCart size={20} color={COLORS.text.lightGray} />
          <Text style={{ color: COLORS.text.lightGray }} className="text-xl font-bold mt-1">
            {financials.totalOrders}
          </Text>
          <Text style={{ color: COLORS.text.muted }} className="text-xs text-center">
            Total
          </Text>
        </View>
      </View>

      {/* Users Section */}
      <Pressable
        onPress={() => setShowUserDetails(!showUserDetails)}
        className="rounded-2xl p-4 mb-4"
        style={{
          backgroundColor: `${COLORS.accent.sky}15`,
          borderWidth: 1,
          borderColor: `${COLORS.accent.sky}30`,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Users size={20} color={COLORS.accent.sky} />
            <Text style={{ color: COLORS.accent.sky }} className="font-bold ml-2">
              Utilisateurs
            </Text>
          </View>
          <View className="flex-row items-center">
            <View
              className="px-3 py-1 rounded-full mr-2"
              style={{ backgroundColor: COLORS.accent.sky }}
            >
              <Text style={{ color: COLORS.text.white }} className="font-bold">
                {totalUsers}
              </Text>
            </View>
            {showUserDetails ? (
              <ChevronUp size={20} color={COLORS.accent.sky} />
            ) : (
              <ChevronDown size={20} color={COLORS.accent.sky} />
            )}
          </View>
        </View>

        {showUserDetails && (
          <View className="mt-4">
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {(Object.keys(userCounts) as UserRole[]).map((role) => (
                <View
                  key={role}
                  className="rounded-xl p-3 items-center"
                  style={{
                    backgroundColor: `${USER_ROLE_COLORS[role]}15`,
                    borderWidth: 1,
                    borderColor: `${USER_ROLE_COLORS[role]}30`,
                    minWidth: '45%',
                    flex: 1,
                  }}
                >
                  <Text style={{ color: USER_ROLE_COLORS[role] }} className="text-2xl font-bold">
                    {userCounts[role]}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs">
                    {USER_ROLE_LABELS[role]}s
                  </Text>
                </View>
              ))}
            </View>

            {/* Recent Users */}
            <Text style={{ color: COLORS.text.muted }} className="text-sm font-medium mt-4 mb-2">
              Derniers inscrits
            </Text>
            {users.slice(0, 3).map((user) => (
              <View
                key={user.id}
                className="flex-row items-center p-2 rounded-lg mb-1"
                style={{ backgroundColor: `${COLORS.text.white}05` }}
              >
                <View
                  className="w-8 h-8 rounded-full items-center justify-center mr-2"
                  style={{ backgroundColor: `${USER_ROLE_COLORS[user.role]}30` }}
                >
                  <Users size={14} color={USER_ROLE_COLORS[user.role]} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: COLORS.text.cream }} className="text-sm" numberOfLines={1}>
                    {user.full_name || user.email || 'Utilisateur'}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs">
                    {USER_ROLE_LABELS[user.role]}
                  </Text>
                </View>
              </View>
            ))}

            {onNavigateToUsers && (
              <Pressable
                onPress={onNavigateToUsers}
                className="mt-3 py-2 rounded-xl items-center active:opacity-70"
                style={{ backgroundColor: `${COLORS.accent.sky}20` }}
              >
                <Text style={{ color: COLORS.accent.sky }} className="font-medium">
                  Voir tous les utilisateurs
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </Pressable>

      {/* Top Products Section */}
      <Pressable
        onPress={() => setShowProductDetails(!showProductDetails)}
        className="rounded-2xl p-4 mb-4"
        style={{
          backgroundColor: `${COLORS.primary.orange}15`,
          borderWidth: 1,
          borderColor: `${COLORS.primary.orange}30`,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Package size={20} color={COLORS.primary.orange} />
            <Text style={{ color: COLORS.primary.orange }} className="font-bold ml-2">
              Produits les plus vendus
            </Text>
          </View>
          {showProductDetails ? (
            <ChevronUp size={20} color={COLORS.primary.orange} />
          ) : (
            <ChevronDown size={20} color={COLORS.primary.orange} />
          )}
        </View>

        {showProductDetails && (
          <View className="mt-4">
            {topProducts.length === 0 ? (
              <Text style={{ color: COLORS.text.muted }} className="text-center py-4">
                Aucune vente pour le moment
              </Text>
            ) : (
              topProducts.map((product, index) => (
                <View
                  key={product.id}
                  className="flex-row items-center p-3 rounded-xl mb-2"
                  style={{ backgroundColor: `${COLORS.text.white}05` }}
                >
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center mr-3"
                    style={{
                      backgroundColor:
                        index === 0
                          ? `${COLORS.primary.gold}30`
                          : index === 1
                          ? `${COLORS.text.lightGray}30`
                          : `${COLORS.primary.orange}20`,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          index === 0
                            ? COLORS.primary.gold
                            : index === 1
                            ? COLORS.text.lightGray
                            : COLORS.primary.orange,
                      }}
                      className="font-bold"
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: COLORS.text.cream }} className="font-medium" numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={{ color: COLORS.text.muted }} className="text-xs">
                      {product.count} vendus
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.accent.hemp }} className="font-bold">
                    {product.revenue.toFixed(0)}€
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </Pressable>

      {/* Top Producers Section */}
      <Pressable
        onPress={() => setShowProducerDetails(!showProducerDetails)}
        className="rounded-2xl p-4 mb-4"
        style={{
          backgroundColor: `${COLORS.accent.hemp}15`,
          borderWidth: 1,
          borderColor: `${COLORS.accent.hemp}30`,
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <Store size={20} color={COLORS.accent.hemp} />
            <Text style={{ color: COLORS.accent.hemp }} className="font-bold ml-2">
              Top Producteurs
            </Text>
          </View>
          <View className="flex-row items-center">
            <View
              className="px-3 py-1 rounded-full mr-2"
              style={{ backgroundColor: COLORS.accent.hemp }}
            >
              <Text style={{ color: COLORS.text.white }} className="font-bold">
                {producers.length}
              </Text>
            </View>
            {showProducerDetails ? (
              <ChevronUp size={20} color={COLORS.accent.hemp} />
            ) : (
              <ChevronDown size={20} color={COLORS.accent.hemp} />
            )}
          </View>
        </View>

        {showProducerDetails && (
          <View className="mt-4">
            {topProducers.length === 0 ? (
              <Text style={{ color: COLORS.text.muted }} className="text-center py-4">
                Aucun producteur
              </Text>
            ) : (
              topProducers.map((producer, index) => (
                <View
                  key={producer.id}
                  className="flex-row items-center p-3 rounded-xl mb-2"
                  style={{ backgroundColor: `${COLORS.text.white}05` }}
                >
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center mr-3"
                    style={{
                      backgroundColor:
                        index === 0
                          ? `${COLORS.primary.gold}30`
                          : index === 1
                          ? `${COLORS.text.lightGray}30`
                          : `${COLORS.accent.hemp}20`,
                    }}
                  >
                    {index < 3 ? (
                      <Award
                        size={16}
                        color={
                          index === 0
                            ? COLORS.primary.gold
                            : index === 1
                            ? COLORS.text.lightGray
                            : '#CD7F32'
                        }
                      />
                    ) : (
                      <Text style={{ color: COLORS.accent.hemp }} className="font-bold text-sm">
                        {index + 1}
                      </Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: COLORS.text.cream }} className="font-medium" numberOfLines={1}>
                      {producer.name}
                    </Text>
                    <Text style={{ color: COLORS.text.muted }} className="text-xs">
                      {producer.productCount} produits • {producer.orderCount} commandes
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.accent.hemp }} className="font-bold">
                    {producer.revenue.toFixed(0)}€
                  </Text>
                </View>
              ))
            )}
          </View>
        )}
      </Pressable>

      {/* Quick Stats */}
      <View
        className="rounded-2xl p-4"
        style={{
          backgroundColor: `${COLORS.text.white}05`,
          borderWidth: 1,
          borderColor: `${COLORS.text.white}10`,
        }}
      >
        <Text style={{ color: COLORS.text.muted }} className="text-sm font-medium mb-3">
          Statistiques rapides
        </Text>
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          <View className="flex-1 min-w-[45%]">
            <Text style={{ color: COLORS.text.muted }} className="text-xs">
              Panier moyen
            </Text>
            <Text style={{ color: COLORS.primary.brightYellow }} className="text-lg font-bold">
              {financials.shippedCount > 0
                ? (financials.totalTTC / financials.shippedCount).toFixed(2)
                : '0.00'}
              €
            </Text>
          </View>
          <View className="flex-1 min-w-[45%]">
            <Text style={{ color: COLORS.text.muted }} className="text-xs">
              Taux conversion
            </Text>
            <Text style={{ color: COLORS.accent.teal }} className="text-lg font-bold">
              {financials.totalOrders > 0
                ? ((financials.shippedCount / financials.totalOrders) * 100).toFixed(1)
                : '0'}
              %
            </Text>
          </View>
          <View className="flex-1 min-w-[45%]">
            <Text style={{ color: COLORS.text.muted }} className="text-xs">
              Produits/commande
            </Text>
            <Text style={{ color: COLORS.primary.orange }} className="text-lg font-bold">
              {financials.shippedCount > 0
                ? (
                    allOrders
                      .filter((o) => o.status === 'shipped')
                      .reduce((sum, o) => sum + o.items.length, 0) / financials.shippedCount
                  ).toFixed(1)
                : '0'}
            </Text>
          </View>
          <View className="flex-1 min-w-[45%]">
            <Text style={{ color: COLORS.text.muted }} className="text-xs">
              Total produits
            </Text>
            <Text style={{ color: COLORS.accent.sky }} className="text-lg font-bold">
              {producers.reduce((sum, p) => sum + (p.products?.length || 0), 0)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
