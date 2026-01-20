/**
 * Contexte global pour la gestion de l'état réseau et le mode offline
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { View } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clés AsyncStorage pour le cache
export const CACHE_KEYS = {
  PRODUCERS: 'cache_producers',
  PRODUCTS: 'cache_products',
  ORDERS: 'cache_orders',
  LAST_SYNC: 'cache_last_sync',
  PENDING_ORDERS: 'cache_pending_orders', // Commandes en attente d'envoi
} as const;

// Types
interface NetworkContextType {
  isOnline: boolean;
  isChecking: boolean;
  lastOnlineAt: number | null;
  // Actions
  checkConnection: () => Promise<boolean>;
  // Cache helpers
  getCachedData: <T>(key: string) => Promise<T | null>;
  setCachedData: <T>(key: string, data: T) => Promise<void>;
  clearCache: (key?: string) => Promise<void>;
  // Pending orders
  addPendingOrder: (order: PendingOrder) => Promise<void>;
  getPendingOrders: () => Promise<PendingOrder[]>;
  removePendingOrder: (orderId: string) => Promise<void>;
  syncPendingOrders: () => Promise<void>;
}

export interface PendingOrder {
  id: string;
  data: Record<string, unknown>;
  createdAt: number;
  retryCount: number;
}

const NetworkContext = createContext<NetworkContextType | null>(null);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(null);
  const syncInProgress = useRef(false);

  // Écouter les changements de connexion
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      console.log('[Network] État connexion:', online ? 'En ligne' : 'Hors ligne');

      if (online && !isOnline) {
        // On vient de retrouver la connexion
        setLastOnlineAt(Date.now());
        // Tenter de sync les commandes en attente
        syncPendingOrders();
      }

      setIsOnline(online);
    });

    // Vérification initiale
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected === true && state.isInternetReachable !== false);
    });

    return () => unsubscribe();
  }, [isOnline]);

  // Vérifier manuellement la connexion
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    try {
      const state = await NetInfo.fetch();
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);
      if (online) {
        setLastOnlineAt(Date.now());
      }
      return online;
    } catch {
      return false;
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Récupérer des données en cache
  const getCachedData = useCallback(async <T,>(key: string): Promise<T | null> => {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const parsed = JSON.parse(cached);
        console.log(`[Cache] Données récupérées pour ${key}:`, Array.isArray(parsed) ? `${parsed.length} items` : 'objet');
        return parsed as T;
      }
      return null;
    } catch (error) {
      console.warn(`[Cache] Erreur lecture ${key}:`, error);
      return null;
    }
  }, []);

  // Sauvegarder des données en cache
  const setCachedData = useCallback(async <T,>(key: string, data: T): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`[Cache] Données sauvegardées pour ${key}`);
    } catch (error) {
      console.warn(`[Cache] Erreur écriture ${key}:`, error);
    }
  }, []);

  // Vider le cache
  const clearCache = useCallback(async (key?: string): Promise<void> => {
    try {
      if (key) {
        await AsyncStorage.removeItem(key);
        console.log(`[Cache] Cache vidé pour ${key}`);
      } else {
        // Vider tout le cache
        const keys = Object.values(CACHE_KEYS);
        await AsyncStorage.multiRemove(keys);
        console.log('[Cache] Tout le cache vidé');
      }
    } catch (error) {
      console.warn('[Cache] Erreur vidage cache:', error);
    }
  }, []);

  // Ajouter une commande en attente
  const addPendingOrder = useCallback(async (order: PendingOrder): Promise<void> => {
    try {
      const pending = await getCachedData<PendingOrder[]>(CACHE_KEYS.PENDING_ORDERS) || [];
      pending.push(order);
      await setCachedData(CACHE_KEYS.PENDING_ORDERS, pending);
      console.log(`[PendingOrders] Commande ${order.id} ajoutée à la file d'attente`);
    } catch (error) {
      console.warn('[PendingOrders] Erreur ajout commande:', error);
    }
  }, [getCachedData, setCachedData]);

  // Récupérer les commandes en attente
  const getPendingOrders = useCallback(async (): Promise<PendingOrder[]> => {
    return (await getCachedData<PendingOrder[]>(CACHE_KEYS.PENDING_ORDERS)) || [];
  }, [getCachedData]);

  // Supprimer une commande en attente (après envoi réussi)
  const removePendingOrder = useCallback(async (orderId: string): Promise<void> => {
    try {
      const pending = await getPendingOrders();
      const updated = pending.filter((o) => o.id !== orderId);
      await setCachedData(CACHE_KEYS.PENDING_ORDERS, updated);
      console.log(`[PendingOrders] Commande ${orderId} retirée de la file`);
    } catch (error) {
      console.warn('[PendingOrders] Erreur suppression commande:', error);
    }
  }, [getPendingOrders, setCachedData]);

  // Synchroniser les commandes en attente
  const syncPendingOrders = useCallback(async (): Promise<void> => {
    if (syncInProgress.current) {
      console.log('[PendingOrders] Sync déjà en cours');
      return;
    }

    syncInProgress.current = true;
    try {
      const pending = await getPendingOrders();
      if (pending.length === 0) {
        console.log('[PendingOrders] Aucune commande en attente');
        return;
      }

      console.log(`[PendingOrders] ${pending.length} commande(s) en attente à synchroniser`);

      // Note: L'envoi réel sera géré par le composant qui utilise ce contexte
      // car il a accès aux fonctions Supabase spécifiques
    } catch (error) {
      console.warn('[PendingOrders] Erreur sync:', error);
    } finally {
      syncInProgress.current = false;
    }
  }, [getPendingOrders]);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isChecking,
        lastOnlineAt,
        checkConnection,
        getCachedData,
        setCachedData,
        clearCache,
        addPendingOrder,
        getPendingOrders,
        removePendingOrder,
        syncPendingOrders,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

// Hook pour vérifier si on peut faire des actions (online only)
export function useCanPerformAction() {
  const { isOnline } = useNetwork();
  return isOnline;
}

/**
 * Hook pour les actions d'écriture avec gestion offline
 * Retourne un wrapper qui désactive l'action si offline et affiche un feedback
 */
export function useWriteAction<T extends (...args: Parameters<T>) => ReturnType<T>>(
  action: T,
  options?: {
    offlineMessage?: string;
    showToast?: boolean;
  }
): {
  execute: T;
  isOffline: boolean;
  OfflineWrapper: React.FC<{ children: React.ReactNode; style?: object }>;
} {
  const { isOnline } = useNetwork();
  const isOffline = !isOnline;

  const execute = useCallback(
    ((...args: Parameters<T>) => {
      if (isOffline) {
        console.log('[Offline] Action bloquée:', options?.offlineMessage || 'Mode hors ligne');
        return undefined as ReturnType<T>;
      }
      return action(...args);
    }) as T,
    [action, isOffline, options?.offlineMessage]
  );

  // Composant wrapper pour ajouter un overlay grisé
  const OfflineWrapper: React.FC<{ children: React.ReactNode; style?: object }> = useCallback(
    ({ children, style }) => {
      if (!isOffline) {
        return <>{children}</>;
      }

      return (
        <View style={[{ opacity: 0.5 }, style]} pointerEvents="none">
          {children}
        </View>
      );
    },
    [isOffline]
  );

  return { execute, isOffline, OfflineWrapper };
}

/**
 * Hook simple pour récupérer l'état offline
 * Utilisé pour conditionner l'affichage des actions d'écriture
 */
export function useOfflineStatus() {
  const { isOnline, checkConnection } = useNetwork();
  return {
    isOffline: !isOnline,
    isOnline,
    checkConnection,
  };
}
