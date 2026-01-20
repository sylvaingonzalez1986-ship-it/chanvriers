/**
 * Order Queue Store - Les Chanvriers Unis
 * Système de file d'attente pour les commandes en échec réseau
 * Permet de sauvegarder localement et resync au retour du réseau
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Order, CustomerInfo } from './store';
import { syncOrderToSupabase, isSupabaseSyncConfigured } from './supabase-sync';
import NetInfo from '@react-native-community/netinfo';

// Structure d'une commande en attente
export interface PendingOrder {
  id: string;
  order: Order;
  createdAt: number;
  lastAttempt: number;
  attemptCount: number;
  error?: string;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
}

// État du store
interface OrderQueueState {
  pendingOrders: PendingOrder[];
  isSyncing: boolean;
  lastSyncAttempt: number | null;

  // Actions
  addPendingOrder: (order: Order) => void;
  removePendingOrder: (orderId: string) => void;
  updateOrderStatus: (orderId: string, status: PendingOrder['status'], error?: string) => void;
  syncPendingOrders: () => Promise<{ success: number; failed: number }>;
  clearSyncedOrders: () => void;
  getPendingCount: () => number;
  getFailedCount: () => number;
}

export const useOrderQueueStore = create<OrderQueueState>()(
  persist(
    (set, get) => ({
      pendingOrders: [],
      isSyncing: false,
      lastSyncAttempt: null,

      addPendingOrder: (order: Order) => {
        const pendingOrder: PendingOrder = {
          id: order.id,
          order,
          createdAt: Date.now(),
          lastAttempt: Date.now(),
          attemptCount: 0,
          status: 'pending',
        };

        set((state) => ({
          pendingOrders: [...state.pendingOrders, pendingOrder],
        }));

        console.log('[OrderQueue] Commande ajoutée à la file:', order.id);
      },

      removePendingOrder: (orderId: string) => {
        set((state) => ({
          pendingOrders: state.pendingOrders.filter((p) => p.id !== orderId),
        }));
      },

      updateOrderStatus: (orderId: string, status: PendingOrder['status'], error?: string) => {
        set((state) => ({
          pendingOrders: state.pendingOrders.map((p) =>
            p.id === orderId
              ? {
                  ...p,
                  status,
                  error,
                  lastAttempt: Date.now(),
                  attemptCount: p.attemptCount + 1,
                }
              : p
          ),
        }));
      },

      syncPendingOrders: async () => {
        const state = get();

        // Ne pas synchroniser si déjà en cours
        if (state.isSyncing) {
          console.log('[OrderQueue] Sync déjà en cours');
          return { success: 0, failed: 0 };
        }

        // Vérifier la connexion réseau
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          console.log('[OrderQueue] Pas de connexion réseau');
          return { success: 0, failed: 0 };
        }

        // Vérifier si Supabase est configuré
        if (!isSupabaseSyncConfigured()) {
          console.log('[OrderQueue] Supabase non configuré');
          return { success: 0, failed: 0 };
        }

        const pendingToSync = state.pendingOrders.filter(
          (p) => p.status === 'pending' || p.status === 'failed'
        );

        if (pendingToSync.length === 0) {
          console.log('[OrderQueue] Aucune commande en attente');
          return { success: 0, failed: 0 };
        }

        set({ isSyncing: true, lastSyncAttempt: Date.now() });
        console.log(`[OrderQueue] Synchronisation de ${pendingToSync.length} commande(s)...`);

        let success = 0;
        let failed = 0;

        for (const pending of pendingToSync) {
          try {
            // Marquer comme en cours de sync
            get().updateOrderStatus(pending.id, 'syncing');

            // Tenter la synchronisation
            await syncOrderToSupabase(pending.order);

            // Succès
            get().updateOrderStatus(pending.id, 'synced');
            success++;
            console.log(`[OrderQueue] Commande ${pending.id} synchronisée avec succès`);
          } catch (error) {
            // Échec
            const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
            get().updateOrderStatus(pending.id, 'failed', errorMessage);
            failed++;
            console.error(`[OrderQueue] Échec sync commande ${pending.id}:`, errorMessage);
          }
        }

        set({ isSyncing: false });
        console.log(`[OrderQueue] Sync terminée: ${success} réussie(s), ${failed} échouée(s)`);

        return { success, failed };
      },

      clearSyncedOrders: () => {
        set((state) => ({
          pendingOrders: state.pendingOrders.filter((p) => p.status !== 'synced'),
        }));
      },

      getPendingCount: () => {
        return get().pendingOrders.filter(
          (p) => p.status === 'pending' || p.status === 'failed'
        ).length;
      },

      getFailedCount: () => {
        return get().pendingOrders.filter((p) => p.status === 'failed').length;
      },
    }),
    {
      name: 'order-queue-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        pendingOrders: state.pendingOrders,
        lastSyncAttempt: state.lastSyncAttempt,
      }),
    }
  )
);

// Hook pour la resync automatique au retour du réseau
let unsubscribeNetInfo: (() => void) | null = null;

export function setupOrderQueueNetworkListener() {
  if (unsubscribeNetInfo) return; // Déjà configuré

  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable) {
      const pendingCount = useOrderQueueStore.getState().getPendingCount();
      if (pendingCount > 0) {
        console.log(`[OrderQueue] Réseau rétabli, ${pendingCount} commande(s) en attente`);
        // Petite attente pour laisser le réseau se stabiliser
        setTimeout(() => {
          useOrderQueueStore.getState().syncPendingOrders();
        }, 2000);
      }
    }
  });

  console.log('[OrderQueue] Network listener configuré');
}

export function cleanupOrderQueueNetworkListener() {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
}
