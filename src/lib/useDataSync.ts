// Hook for automatic data synchronization from Supabase
// This loads producers, products, packs, and promo products for all users
// With offline-first support: loads from cache first, then syncs from server

import { useEffect, useRef, useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useProducerStore, usePacksStore, usePromoProductsStore, useLotsStore } from './store';
import {
  isSupabaseSyncConfigured,
  fetchAllProducersWithProducts,
  fetchAllPacksWithItems,
  fetchPromoProducts,
  fetchAllLotsWithItems,
} from './supabase-sync';
import { Producer } from './producers';
import { Pack, PromoProduct, Lot } from './store';

// Minimum time between syncs (5 minutes)
const MIN_SYNC_INTERVAL = 5 * 60 * 1000;

// Cache keys
const CACHE_KEYS = {
  PRODUCERS: 'cache_producers_v2',
  PACKS: 'cache_packs_v2',
  PROMO_PRODUCTS: 'cache_promo_products_v2',
  LOTS: 'cache_lots_v2',
  LAST_SYNC: 'cache_last_sync_v2',
} as const;

// Store last sync time
let lastSyncTime = 0;

// Sync status for UI feedback
export type SyncStatus = 'idle' | 'loading-cache' | 'syncing' | 'success' | 'error' | 'offline';

interface SyncState {
  status: SyncStatus;
  error: string | null;
  lastSyncAt: number | null;
  isUsingCache: boolean;
}

// Global sync state subscribers
type SyncStateListener = (state: SyncState) => void;
const syncStateListeners: Set<SyncStateListener> = new Set();
let currentSyncState: SyncState = {
  status: 'idle',
  error: null,
  lastSyncAt: null,
  isUsingCache: false,
};

function setSyncState(partial: Partial<SyncState>) {
  currentSyncState = { ...currentSyncState, ...partial };
  syncStateListeners.forEach((listener) => listener(currentSyncState));
}

// Hook to subscribe to sync state
export function useSyncState(): SyncState {
  const [state, setState] = useState<SyncState>(currentSyncState);

  useEffect(() => {
    const listener: SyncStateListener = (newState) => setState(newState);
    syncStateListeners.add(listener);
    return () => {
      syncStateListeners.delete(listener);
    };
  }, []);

  return state;
}

// Cache helpers
async function loadFromCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await AsyncStorage.getItem(key);
    if (cached) {
      const data = JSON.parse(cached) as T;
      console.log(`[Cache] Loaded ${key}:`, Array.isArray(data) ? `${(data as unknown[]).length} items` : 'data');
      return data;
    }
    return null;
  } catch (error) {
    console.warn(`[Cache] Error loading ${key}:`, error);
    return null;
  }
}

async function saveToCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
    console.log(`[Cache] Saved ${key}`);
  } catch (error) {
    console.warn(`[Cache] Error saving ${key}:`, error);
  }
}

// Load all cached data
async function loadAllFromCache(): Promise<{
  producers: Producer[];
  packs: Pack[];
  promoProducts: PromoProduct[];
  lots: Lot[];
}> {
  const [producers, packs, promoProducts, lots] = await Promise.all([
    loadFromCache<Producer[]>(CACHE_KEYS.PRODUCERS),
    loadFromCache<Pack[]>(CACHE_KEYS.PACKS),
    loadFromCache<PromoProduct[]>(CACHE_KEYS.PROMO_PRODUCTS),
    loadFromCache<Lot[]>(CACHE_KEYS.LOTS),
  ]);

  return {
    producers: producers || [],
    packs: packs || [],
    promoProducts: promoProducts || [],
    lots: lots || [],
  };
}

// Save all data to cache
async function saveAllToCache(data: {
  producers: Producer[];
  packs: Pack[];
  promoProducts: PromoProduct[];
  lots: Lot[];
}): Promise<void> {
  await Promise.all([
    saveToCache(CACHE_KEYS.PRODUCERS, data.producers),
    saveToCache(CACHE_KEYS.PACKS, data.packs),
    saveToCache(CACHE_KEYS.PROMO_PRODUCTS, data.promoProducts),
    saveToCache(CACHE_KEYS.LOTS, data.lots),
    saveToCache(CACHE_KEYS.LAST_SYNC, Date.now()),
  ]);
}

export function useDataSync() {
  const syncInProgress = useRef(false);
  const cacheLoaded = useRef(false);

  useEffect(() => {
    async function syncData() {
      // Prevent concurrent syncs
      if (syncInProgress.current) {
        console.log('[DataSync] Sync already in progress');
        return;
      }

      syncInProgress.current = true;

      // Step 1: Load from cache first (offline-first)
      if (!cacheLoaded.current) {
        setSyncState({ status: 'loading-cache', isUsingCache: true });
        console.log('[DataSync] Loading from cache first...');

        const cachedData = await loadAllFromCache();
        const hasCache =
          cachedData.producers.length > 0 ||
          cachedData.packs.length > 0 ||
          cachedData.promoProducts.length > 0 ||
          cachedData.lots.length > 0;

        if (hasCache) {
          console.log('[DataSync] Found cached data, loading into stores...');

          if (cachedData.producers.length > 0) {
            useProducerStore.setState({ producers: cachedData.producers });
          }
          if (cachedData.packs.length > 0) {
            usePacksStore.setState({ packs: cachedData.packs });
          }
          if (cachedData.promoProducts.length > 0) {
            usePromoProductsStore.setState({ promoProducts: cachedData.promoProducts });
          }
          if (cachedData.lots.length > 0) {
            useLotsStore.setState({ lots: cachedData.lots });
          }

          // Get last sync time from cache
          const cachedLastSync = await loadFromCache<number>(CACHE_KEYS.LAST_SYNC);
          if (cachedLastSync) {
            lastSyncTime = cachedLastSync;
            setSyncState({ lastSyncAt: cachedLastSync });
          }
        }

        cacheLoaded.current = true;
      }

      // Step 2: Try to sync from server
      if (!isSupabaseSyncConfigured()) {
        console.log('[DataSync] Supabase not configured, using cache only');
        setSyncState({ status: 'idle', isUsingCache: true });
        syncInProgress.current = false;
        return;
      }

      // Check if we've synced recently
      const now = Date.now();
      if (now - lastSyncTime < MIN_SYNC_INTERVAL) {
        console.log('[DataSync] Skipping sync, last sync was recent');
        setSyncState({ status: 'idle' });
        syncInProgress.current = false;
        return;
      }

      setSyncState({ status: 'syncing', error: null });
      console.log('[DataSync] Syncing from Supabase...');

      try {
        // Fetch all data in parallel with error handling per request
        // Using Promise.allSettled to avoid crash if one request fails
        const results = await Promise.allSettled([
          fetchAllProducersWithProducts(),
          fetchAllPacksWithItems(),
          fetchPromoProducts(),
          fetchAllLotsWithItems(),
        ]);

        // Extract results, using empty arrays for failed requests
        const producers = results[0].status === 'fulfilled' ? results[0].value : [];
        const packs = results[1].status === 'fulfilled' ? results[1].value : [];
        const promoProducts = results[2].status === 'fulfilled' ? results[2].value : [];
        const lots = results[3].status === 'fulfilled' ? results[3].value : [];

        // Log any failed requests
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            const names = ['producers', 'packs', 'promoProducts', 'lots'];
            console.warn(`[DataSync] Failed to fetch ${names[index]}:`, result.reason?.message || result.reason);
          }
        });

        console.log(
          `[DataSync] Fetched ${producers.length} producers, ${packs.length} packs, ${promoProducts.length} promo products, ${lots.length} lots`
        );

        // Update local stores with fetched data
        if (producers.length > 0) {
          const producerStore = useProducerStore.getState();
          const localProducers = producerStore.producers;
          const syncedIds = new Set(producers.map((p) => p.id));
          const localOnlyProducers = localProducers.filter((p) => !syncedIds.has(p.id));
          useProducerStore.setState({
            producers: [...producers, ...localOnlyProducers],
          });
        }

        if (packs.length > 0) {
          const packsStore = usePacksStore.getState();
          const localPacks = packsStore.packs;
          const syncedPackIds = new Set(packs.map((p) => p.id));
          const localOnlyPacks = localPacks.filter((p) => !syncedPackIds.has(p.id));
          usePacksStore.setState({
            packs: [...packs, ...localOnlyPacks],
          });
        }

        if (promoProducts.length > 0) {
          const promoStore = usePromoProductsStore.getState();
          const localPromos = promoStore.promoProducts;
          const syncedPromoIds = new Set(promoProducts.map((p) => p.id));
          const localOnlyPromos = localPromos.filter((p) => !syncedPromoIds.has(p.id));
          usePromoProductsStore.setState({
            promoProducts: [...promoProducts, ...localOnlyPromos],
          });
        }

        if (lots.length > 0) {
          const lotsStore = useLotsStore.getState();
          const localLots = lotsStore.lots;
          const syncedLotIds = new Set(lots.map((l) => l.id));
          const localOnlyLots = localLots.filter((l) => !syncedLotIds.has(l.id));
          useLotsStore.setState({
            lots: [...lots, ...localOnlyLots],
          });
        }

        // Save to cache for offline use
        await saveAllToCache({ producers, packs, promoProducts, lots });

        // Check if we had any failures
        const failedRequests = results
          .map((r, i) => ({ result: r, name: ['producers', 'packs', 'promoProducts', 'lots'][i] }))
          .filter((r) => r.result.status === 'rejected')
          .map((r) => r.name);
        const hasPartialFailure = failedRequests.length > 0;
        const hasAnyData = producers.length > 0 || packs.length > 0 || promoProducts.length > 0 || lots.length > 0;

        lastSyncTime = now;
        setSyncState({
          status: hasPartialFailure && !hasAnyData ? 'error' : 'success',
          error: hasPartialFailure ? `Sync partiel: ${failedRequests.join(', ')} non chargés` : null,
          lastSyncAt: now,
          isUsingCache: hasPartialFailure,
        });
        console.log('[DataSync] Sync completed' + (hasPartialFailure ? ` with partial failures (${failedRequests.join(', ')})` : ' successfully'));

        // Reset status after a short delay
        setTimeout(() => {
          setSyncState({ status: 'idle' });
        }, 2000);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erreur de synchronisation';
        console.warn('[DataSync] Error syncing data:', error);

        // Keep using cached data
        setSyncState({
          status: 'error',
          error: 'Impossible de charger les produits. Affichage des données en cache.',
          isUsingCache: true,
        });
      } finally {
        syncInProgress.current = false;
      }
    }

    // Sync on mount
    syncData();

    // Set up periodic sync every 5 minutes
    const intervalId = setInterval(syncData, MIN_SYNC_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, []);
}

// Function to force a sync (e.g., after pull-to-refresh)
export async function forceDataSync(): Promise<{
  success: boolean;
  error?: string;
  isUsingCache: boolean;
}> {
  if (!isSupabaseSyncConfigured()) {
    console.log('[DataSync] Supabase not configured');
    return { success: false, error: 'Configuration manquante', isUsingCache: true };
  }

  setSyncState({ status: 'syncing', error: null });
  console.log('[DataSync] Force sync initiated...');

  try {
    // Fetch all data in parallel with error handling per request
    const results = await Promise.allSettled([
      fetchAllProducersWithProducts(),
      fetchAllPacksWithItems(),
      fetchPromoProducts(),
      fetchAllLotsWithItems(),
    ]);

    // Extract results, using empty arrays for failed requests
    const producers = results[0].status === 'fulfilled' ? results[0].value : [];
    const packs = results[1].status === 'fulfilled' ? results[1].value : [];
    const promoProducts = results[2].status === 'fulfilled' ? results[2].value : [];
    const lots = results[3].status === 'fulfilled' ? results[3].value : [];

    // Log any failed requests
    const failedRequests: string[] = [];
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const names = ['producers', 'packs', 'promoProducts', 'lots'];
        console.warn(`[DataSync] Force sync failed for ${names[index]}:`, result.reason?.message || result.reason);
        failedRequests.push(names[index]);
      }
    });

    console.log(
      `[DataSync] Force sync: ${producers.length} producers, ${packs.length} packs, ${promoProducts.length} promo products, ${lots.length} lots`
    );

    // Update stores - for force sync, we replace data entirely from Supabase
    if (producers.length > 0) {
      useProducerStore.setState({ producers });
    }

    if (packs.length > 0) {
      usePacksStore.setState({ packs });
    }

    if (promoProducts.length > 0) {
      usePromoProductsStore.setState({ promoProducts });
    }

    if (lots.length > 0) {
      useLotsStore.setState({ lots });
    }

    // Save to cache
    await saveAllToCache({ producers, packs, promoProducts, lots });

    lastSyncTime = Date.now();

    // Determine if we had partial failures
    const hasPartialFailure = failedRequests.length > 0;
    const hasAnyData = producers.length > 0 || packs.length > 0 || promoProducts.length > 0 || lots.length > 0;

    setSyncState({
      status: hasPartialFailure ? 'error' : 'success',
      error: hasPartialFailure ? `Certaines données n'ont pas pu être chargées (${failedRequests.join(', ')})` : null,
      lastSyncAt: lastSyncTime,
      isUsingCache: hasPartialFailure,
    });

    console.log('[DataSync] Force sync completed' + (hasPartialFailure ? ' with partial failures' : ''));

    setTimeout(() => {
      setSyncState({ status: 'idle' });
    }, 2000);

    return { success: !hasPartialFailure || hasAnyData, isUsingCache: hasPartialFailure };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Erreur de synchronisation';
    console.warn('[DataSync] Force sync error:', error);

    setSyncState({
      status: 'error',
      error: 'Impossible de charger les produits. Affichage des données en cache.',
      isUsingCache: true,
    });

    return {
      success: false,
      error: 'Impossible de charger les produits. Affichage des données en cache.',
      isUsingCache: true,
    };
  }
}

// Clear all cached data
export async function clearDataCache(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(CACHE_KEYS.PRODUCERS),
      AsyncStorage.removeItem(CACHE_KEYS.PACKS),
      AsyncStorage.removeItem(CACHE_KEYS.PROMO_PRODUCTS),
      AsyncStorage.removeItem(CACHE_KEYS.LOTS),
      AsyncStorage.removeItem(CACHE_KEYS.LAST_SYNC),
    ]);
    console.log('[Cache] All data cache cleared');
  } catch (error) {
    console.warn('[Cache] Error clearing cache:', error);
  }
}
