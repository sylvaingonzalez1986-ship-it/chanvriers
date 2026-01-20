/**
 * PendingOrdersBanner - Les Chanvriers Unis
 * Bannière affichant les commandes en attente de synchronisation
 * Avec bouton pour forcer la resynchronisation
 */

import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui';
import { CloudOff, RefreshCw, CheckCircle, AlertTriangle, Clock } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/lib/colors';
import { useOrderQueueStore } from '@/lib/order-queue-store';

interface PendingOrdersBannerProps {
  style?: object;
  onSyncComplete?: (result: { success: number; failed: number }) => void;
}

export function PendingOrdersBanner({ style, onSyncComplete }: PendingOrdersBannerProps) {
  const pendingOrders = useOrderQueueStore((s) => s.pendingOrders);
  const isSyncing = useOrderQueueStore((s) => s.isSyncing);
  const syncPendingOrders = useOrderQueueStore((s) => s.syncPendingOrders);
  const clearSyncedOrders = useOrderQueueStore((s) => s.clearSyncedOrders);

  const pendingCount = pendingOrders.filter(
    (p) => p.status === 'pending' || p.status === 'failed'
  ).length;
  const failedCount = pendingOrders.filter((p) => p.status === 'failed').length;
  const syncedCount = pendingOrders.filter((p) => p.status === 'synced').length;

  // Ne rien afficher si aucune commande en attente ou synchronisée récemment
  if (pendingCount === 0 && syncedCount === 0) return null;

  const handleSync = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await syncPendingOrders();

    if (result.success > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (result.failed > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    onSyncComplete?.(result);

    // Nettoyer les commandes synchronisées après un délai
    if (result.success > 0) {
      setTimeout(() => {
        clearSyncedOrders();
      }, 5000);
    }
  };

  // Configuration selon l'état
  const getConfig = () => {
    if (isSyncing) {
      return {
        icon: RefreshCw,
        iconColor: COLORS.accent.teal,
        bgColor: 'rgba(20, 184, 166, 0.15)',
        borderColor: 'rgba(20, 184, 166, 0.3)',
        textColor: COLORS.accent.teal,
        message: 'Synchronisation des commandes en cours...',
        showButton: false,
      };
    }

    if (syncedCount > 0 && pendingCount === 0) {
      return {
        icon: CheckCircle,
        iconColor: COLORS.accent.hemp,
        bgColor: 'rgba(90, 158, 90, 0.15)',
        borderColor: 'rgba(90, 158, 90, 0.3)',
        textColor: COLORS.accent.hemp,
        message: `${syncedCount} commande${syncedCount > 1 ? 's' : ''} synchronisée${syncedCount > 1 ? 's' : ''} avec succès !`,
        showButton: false,
      };
    }

    if (failedCount > 0) {
      return {
        icon: AlertTriangle,
        iconColor: '#EF4444',
        bgColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
        textColor: '#EF4444',
        message: `${failedCount} commande${failedCount > 1 ? 's' : ''} n'ont pas pu être envoyée${failedCount > 1 ? 's' : ''}. Elles seront envoyées dès que possible.`,
        showButton: true,
        buttonText: 'Réessayer',
      };
    }

    return {
      icon: Clock,
      iconColor: COLORS.primary.gold,
      bgColor: 'rgba(217, 176, 91, 0.15)',
      borderColor: 'rgba(217, 176, 91, 0.3)',
      textColor: COLORS.primary.gold,
      message: `${pendingCount} commande${pendingCount > 1 ? 's' : ''} en attente de synchronisation.`,
      showButton: true,
      buttonText: 'Synchroniser',
    };
  };

  const config = getConfig();
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
        {isSyncing ? (
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

          {/* Bouton de synchronisation */}
          {config.showButton && (
            <Pressable
              onPress={handleSync}
              disabled={isSyncing}
              className="flex-row items-center self-start px-3 py-2 rounded-lg mt-2"
              style={{
                backgroundColor: `${config.iconColor}20`,
                opacity: isSyncing ? 0.6 : 1,
              }}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color={config.iconColor} />
              ) : (
                <RefreshCw size={14} color={config.iconColor} />
              )}
              <Text
                style={{ color: config.textColor }}
                className="text-sm font-medium ml-1.5"
              >
                {config.buttonText}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Variante compacte pour afficher dans les headers
 */
export function CompactPendingOrdersIndicator({ style }: { style?: object }) {
  const pendingCount = useOrderQueueStore((s) => s.getPendingCount());
  const isSyncing = useOrderQueueStore((s) => s.isSyncing);

  if (pendingCount === 0) return null;

  return (
    <View
      className="flex-row items-center px-3 py-1.5 rounded-full"
      style={[
        {
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
        },
        style,
      ]}
    >
      {isSyncing ? (
        <ActivityIndicator size="small" color="#EF4444" />
      ) : (
        <CloudOff size={14} color="#EF4444" />
      )}
      <Text className="text-xs font-medium ml-1.5" style={{ color: '#EF4444' }}>
        {pendingCount} en attente
      </Text>
    </View>
  );
}
