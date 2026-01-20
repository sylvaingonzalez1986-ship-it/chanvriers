import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Database, RefreshCw, Leaf, Tag } from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import {
  fetchAppData,
  isSupabaseConfigured,
  AppDataItem,
} from '@/lib/supabase';

export default function DonneesPartageesScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<AppDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError('Données non disponibles. La connexion Supabase n\'est pas configurée.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchAppData();
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Load on mount and auto-refresh every 5 seconds
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background.dark }}>
      <Stack.Screen
        options={{
          title: 'Produits',
          headerStyle: { backgroundColor: COLORS.background.charcoal },
          headerTintColor: COLORS.text.white,
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary.gold}
            colors={[COLORS.primary.gold]}
          />
        }
      >
        {/* Header */}
        <View className="flex-row items-center mb-6">
          <View
            className="w-12 h-12 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
          >
            <Database size={24} color={COLORS.accent.hemp} />
          </View>
          <View className="flex-1">
            <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
              Catalogue Produits
            </Text>
            <Text style={{ color: COLORS.text.muted }} className="text-sm">
              CBD & Tisanes disponibles
            </Text>
          </View>
          <Pressable
            onPress={loadData}
            disabled={loading}
            className="p-3 rounded-xl active:opacity-70"
            style={{ backgroundColor: `${COLORS.accent.sky}20` }}
          >
            {loading && !refreshing ? (
              <ActivityIndicator size="small" color={COLORS.accent.sky} />
            ) : (
              <RefreshCw size={20} color={COLORS.accent.sky} />
            )}
          </Pressable>
        </View>

        {/* Error State */}
        {error && (
          <View
            className="rounded-xl p-4 mb-4"
            style={{
              backgroundColor: `${COLORS.accent.red}15`,
              borderWidth: 1,
              borderColor: `${COLORS.accent.red}30`,
            }}
          >
            <Text style={{ color: COLORS.accent.red }} className="text-center">
              {error}
            </Text>
          </View>
        )}

        {/* Loading State */}
        {loading && data.length === 0 && !error && (
          <View className="py-12 items-center">
            <ActivityIndicator size="large" color={COLORS.primary.gold} />
            <Text style={{ color: COLORS.text.muted }} className="mt-3">
              Chargement des produits...
            </Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && !error && data.length === 0 && (
          <View
            className="rounded-2xl p-8 items-center"
            style={{
              backgroundColor: `${COLORS.text.white}05`,
              borderWidth: 1,
              borderColor: `${COLORS.text.white}10`,
            }}
          >
            <Leaf size={56} color={COLORS.text.muted} />
            <Text style={{ color: COLORS.text.muted }} className="text-center mt-4 text-lg">
              Aucun produit disponible
            </Text>
            <Text style={{ color: COLORS.text.muted }} className="text-center text-sm mt-2">
              Revenez plus tard pour découvrir notre catalogue
            </Text>
          </View>
        )}

        {/* Products List */}
        {data.map((item) => (
          <View
            key={item.id}
            className="rounded-2xl mb-4 overflow-hidden"
            style={{
              backgroundColor: `${COLORS.text.white}05`,
              borderWidth: 1,
              borderColor: `${COLORS.primary.paleGold}20`,
            }}
          >
            <View className="p-5">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-4">
                  <View className="flex-row items-center mb-2">
                    <Leaf size={18} color={COLORS.accent.hemp} />
                    <Text style={{ color: COLORS.text.white }} className="font-bold text-lg ml-2">
                      {item.nom}
                    </Text>
                  </View>
                  {item.description ? (
                    <Text style={{ color: COLORS.text.lightGray }} className="text-sm leading-5">
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <View
                  className="px-4 py-2 rounded-xl"
                  style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
                >
                  <Text style={{ color: COLORS.accent.hemp }} className="font-bold text-lg">
                    {item.valeur}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* Info Footer */}
        {data.length > 0 && (
          <View className="mt-4 items-center">
            <View className="flex-row items-center">
              <Tag size={14} color={COLORS.text.muted} />
              <Text style={{ color: COLORS.text.muted }} className="text-xs ml-1">
                {data.length} produit{data.length > 1 ? 's' : ''} disponible{data.length > 1 ? 's' : ''}
              </Text>
            </View>
            <Text style={{ color: COLORS.text.muted }} className="text-xs mt-1 opacity-60">
              Mise à jour automatique toutes les 5s
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
