/**
 * CacheStatusBanner - Les Chanvriers Unis
 * Bannière affichant l'état du cache/sync des données catalogue
 * S'affiche quand la sync échoue et qu'on affiche les données en cache
 */

import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui';
import { WifiOff, RefreshCw, Database, CheckCircle, AlertTriangle } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/lib/colors';
import { useSyncState, forceDataSync, type SyncStatus } from '@/lib/useDataSync';

interface CacheStatusBannerProps {
  /** Style personnalisé pour le conteneur */
  style?: object;
  /** Afficher uniquement en cas d'erreur (masquer les autres états) */
  showOnlyOnError?: boolean;
  /** Callback après un refresh réussi */
  onRefreshSuccess?: () => void;
}

export function CacheStatusBanner({
  style,
  showOnlyOnError = false,
  onRefreshSuccess,
}: CacheStatusBannerProps) {
  const { status, error, lastSyncAt, isUsingCache } = useSyncState();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  // Fonction de refresh manuel
  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRefreshing(true);

    try {
      const result = await forceDataSync();
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onRefreshSuccess?.();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  // Déterminer si on doit afficher la bannière
  const shouldShow = (() => {
    if (showOnlyOnError) {
      return status === 'error' || (isUsingCache && status !== 'syncing');
    }
    // Afficher pour error, syncing, ou si on utilise le cache
    return status === 'error' || status === 'syncing' || isUsingCache;
  })();

  if (!shouldShow) return null;

  // Configuration de l'affichage selon l'état
  const getDisplayConfig = () => {
    if (status === 'error') {
      return {
        icon: WifiOff,
        iconColor: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
        textColor: '#EF4444',
        message: error || 'Impossible de charger les produits. Affichage des données en cache.',
        showRefresh: true,
        buttonBg: 'rgba(239, 68, 68, 0.2)',
      };
    }

    if (status === 'syncing') {
      return {
        icon: RefreshCw,
        iconColor: COLORS.accent.teal,
        bgColor: 'rgba(20, 184, 166, 0.15)',
        borderColor: 'rgba(20, 184, 166, 0.3)',
        textColor: COLORS.accent.teal,
        message: 'Synchronisation des données...',
        showRefresh: false,
        buttonBg: 'rgba(20, 184, 166, 0.2)',
      };
    }

    if (isUsingCache) {
      return {
        icon: Database,
        iconColor: COLORS.primary.gold,
        bgColor: 'rgba(217, 176, 91, 0.15)',
        borderColor: 'rgba(217, 176, 91, 0.3)',
        textColor: COLORS.primary.gold,
        message: 'Affichage des données en cache.',
        showRefresh: true,
        buttonBg: 'rgba(217, 176, 91, 0.2)',
      };
    }

    return null;
  };

  const config = getDisplayConfig();
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      style={[
        {
          backgroundColor: config.bgColor,
          borderWidth: 1,
          borderColor: config.borderColor,
          borderRadius: 12,
          padding: 12,
          marginHorizontal: 16,
          marginVertical: 8,
        },
        style,
      ]}
    >
      <View className="flex-row items-start">
        {status === 'syncing' ? (
          <ActivityIndicator size="small" color={config.iconColor} />
        ) : (
          <IconComponent size={18} color={config.iconColor} />
        )}

        <View className="flex-1 ml-3">
          <Text
            style={{ color: config.textColor }}
            className="text-sm font-medium leading-5"
          >
            {config.message}
          </Text>

          {/* Bouton Rafraîchir */}
          {config.showRefresh && (
            <Pressable
              onPress={handleRefresh}
              disabled={isRefreshing}
              className="flex-row items-center self-start px-3 py-2 rounded-lg mt-2"
              style={{
                backgroundColor: config.buttonBg,
                opacity: isRefreshing ? 0.6 : 1,
              }}
            >
              {isRefreshing ? (
                <ActivityIndicator size="small" color={config.iconColor} />
              ) : (
                <RefreshCw size={14} color={config.iconColor} />
              )}
              <Text
                style={{ color: config.textColor }}
                className="text-sm font-medium ml-1.5"
              >
                {isRefreshing ? 'Actualisation...' : 'Rafraîchir'}
              </Text>
            </Pressable>
          )}

          {/* Dernière sync */}
          {lastSyncAt && status !== 'syncing' && (
            <Text
              style={{ color: COLORS.text.muted }}
              className="text-xs mt-2"
            >
              Dernière sync : {formatLastSync(lastSyncAt)}
            </Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Variante compacte pour les listes avec pull-to-refresh
 */
interface CompactCacheStatusProps {
  style?: object;
}

export function CompactCacheStatus({ style }: CompactCacheStatusProps) {
  const { status, isUsingCache } = useSyncState();

  // N'afficher que si erreur ou utilisant le cache
  if (status !== 'error' && !isUsingCache) return null;

  return (
    <View
      className="flex-row items-center justify-center py-2 px-4"
      style={[
        {
          backgroundColor: status === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(217, 176, 91, 0.1)',
        },
        style,
      ]}
    >
      {status === 'error' ? (
        <AlertTriangle size={14} color="#EF4444" />
      ) : (
        <Database size={14} color={COLORS.primary.gold} />
      )}
      <Text
        className="text-xs ml-2"
        style={{ color: status === 'error' ? '#EF4444' : COLORS.primary.gold }}
      >
        {status === 'error' ? 'Mode hors ligne' : 'Données en cache'}
      </Text>
    </View>
  );
}

// Helper pour formater la date de dernière sync
function formatLastSync(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${days}j`;
}
