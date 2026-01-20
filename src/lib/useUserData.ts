/**
 * useUserData Hook - Synchronisation des données utilisateur avec Supabase
 *
 * Ce hook gère la synchronisation bidirectionnelle entre les stores locaux
 * et les tables Supabase user_* pour que chaque utilisateur ait ses propres données.
 */

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import {
  useCollectionStore,
  useSubscriptionStore,
  useReferralStore,
} from './store';
import {
  isSupabaseSyncConfigured,
  fetchAllUserData,
  upsertUserSubscription,
  addToUserCollection,
  deleteCollectionItem,
  upsertUserReferral,
  fetchUserStats,
  incrementUserSpins as incrementSpinsSupabase,
  SupabaseUserCollectionItem,
} from './supabase-sync';
import { CollectionItem, CBDProduct } from './types';

/**
 * Hook pour synchroniser les données utilisateur avec Supabase
 * À utiliser dans le composant racine de l'app
 */
export function useUserDataSync() {
  const { isAuthenticated, user } = useAuth();
  const hasSyncedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Stores
  const setSubscription = useSubscriptionStore((s) => s.setSubscription);
  const addTickets = useSubscriptionStore((s) => s.addTickets);
  const subscriptionResetStore = useSubscriptionStore((s) => s.resetStore);

  const collectionResetStore = useCollectionStore((s) => s.resetStore);

  const referralResetStore = useReferralStore((s) => s.resetStore);

  // Sync depuis Supabase vers les stores locaux
  const syncFromSupabase = useCallback(async () => {
    if (!isSupabaseSyncConfigured() || !isAuthenticated || !user?.id) {
      return;
    }

    console.log('[UserData] Syncing from Supabase');

    try {
      const data = await fetchAllUserData();

      // Sync subscription
      if (data.subscription) {
        const tier = data.subscription.subscription_tier as 'none' | 'basic' | 'premium' | 'vip';
        useSubscriptionStore.setState({
          subscription: tier,
          tickets: data.subscription.tickets,
          lastTicketRefresh: data.subscription.last_ticket_refresh,
        });
      }

      // Sync collection
      if (data.collection.length > 0) {
        const collectionItems: CollectionItem[] = data.collection.map((item) => ({
          id: item.id,
          product: {
            id: item.product_id,
            name: item.product_name,
            description: '',
            producer: '',
            region: '',
            rarity: item.product_rarity as 'common' | 'rare' | 'epic' | 'legendary' | 'platinum',
            thcPercent: 0.2,
            cbdPercent: 10,
            image: item.product_image || '',
            value: item.product_value,
          },
          obtainedAt: new Date(item.obtained_at),
          used: item.used,
          lotId: item.lot_id || undefined,
          lotType: item.lot_type as 'product' | 'discount' | undefined,
          discountPercent: item.discount_percent || undefined,
          discountAmount: item.discount_amount || undefined,
          minOrderAmount: item.min_order_amount || undefined,
        }));

        useCollectionStore.setState({
          collection: collectionItems,
          totalSpins: data.stats?.total_spins || 0,
        });
      }

      // Sync referral
      if (data.referral) {
        useReferralStore.setState({
          myCode: data.referral.referral_code,
          points: data.referral.points,
        });
      }

      // Sync gifts
      if (data.giftsSent.length > 0 || data.giftsReceived.length > 0) {
        const giftsSent = data.giftsSent.map((g) => ({
          id: g.id,
          collectionItemId: g.collection_item_id || '',
          product: {
            id: g.product_id,
            name: g.product_name,
            description: '',
            producer: '',
            region: '',
            rarity: (g.product_rarity || 'common') as 'common' | 'rare' | 'epic' | 'legendary' | 'platinum',
            thcPercent: 0.2,
            cbdPercent: 10,
            image: '',
            value: 0,
          },
          senderCode: '',
          recipientCode: g.recipient_id,
          giftCode: g.gift_code,
          createdAt: new Date(g.created_at).getTime(),
          claimedAt: g.claimed_at ? new Date(g.claimed_at).getTime() : null,
          used: g.used,
        }));

        const giftsReceived = data.giftsReceived.map((g) => ({
          id: g.id,
          collectionItemId: g.collection_item_id || '',
          product: {
            id: g.product_id,
            name: g.product_name,
            description: '',
            producer: '',
            region: '',
            rarity: (g.product_rarity || 'common') as 'common' | 'rare' | 'epic' | 'legendary' | 'platinum',
            thcPercent: 0.2,
            cbdPercent: 10,
            image: '',
            value: 0,
          },
          senderCode: g.sender_id,
          recipientCode: user.id,
          giftCode: g.gift_code,
          createdAt: new Date(g.created_at).getTime(),
          claimedAt: g.claimed_at ? new Date(g.claimed_at).getTime() : null,
          used: g.used,
        }));

        useReferralStore.setState((state) => ({
          ...state,
          giftsSent,
          giftsReceived,
        }));
      }

      console.log('[UserData] Sync completed');
    } catch (error) {
      console.error('[UserData] Sync error:', error);
    }
  }, [isAuthenticated, user?.id]);

  // Effet pour synchroniser quand l'utilisateur change
  useEffect(() => {
    const currentUserId = user?.id || null;

    // Si l'utilisateur a changé
    if (currentUserId !== lastUserIdRef.current) {
      // Si déconnexion, reset les stores
      if (!currentUserId && lastUserIdRef.current) {
        console.log('[UserData] User logged out, resetting stores');
        subscriptionResetStore();
        collectionResetStore();
        referralResetStore();
        hasSyncedRef.current = false;
      }

      // Si connexion, sync depuis Supabase
      if (currentUserId && isAuthenticated) {
        console.log('[UserData] User changed, syncing from Supabase');
        hasSyncedRef.current = false;
        syncFromSupabase().then(() => {
          hasSyncedRef.current = true;
        });
      }

      lastUserIdRef.current = currentUserId;
    }
  }, [user?.id, isAuthenticated, syncFromSupabase, subscriptionResetStore, collectionResetStore, referralResetStore]);

  return {
    syncFromSupabase,
    isAuthenticated,
    userId: user?.id,
  };
}

/**
 * Hook pour ajouter un item à la collection avec sync Supabase
 */
export function useAddToCollection() {
  const { isAuthenticated } = useAuth();
  const addToCollectionLocal = useCollectionStore((s) => s.addToCollection);

  return useCallback(
    async (product: CBDProduct, lotInfo?: {
      lotId: string;
      lotType: 'product' | 'discount';
      discountPercent?: number;
      discountAmount?: number;
      minOrderAmount?: number;
    }) => {
      // Ajouter localement d'abord
      addToCollectionLocal(product, lotInfo);

      // Sync avec Supabase si authentifié
      if (isAuthenticated && isSupabaseSyncConfigured()) {
        await addToUserCollection({
          productId: product.id,
          productName: product.name,
          productRarity: product.rarity,
          productValue: product.value,
          productImage: product.image,
          lotId: lotInfo?.lotId,
          lotType: lotInfo?.lotType,
          discountPercent: lotInfo?.discountPercent,
          discountAmount: lotInfo?.discountAmount,
          minOrderAmount: lotInfo?.minOrderAmount,
        });
      }
    },
    [isAuthenticated, addToCollectionLocal]
  );
}

/**
 * Hook pour mettre à jour les tickets avec sync Supabase
 */
export function useUpdateTickets() {
  const { isAuthenticated } = useAuth();
  const subscription = useSubscriptionStore((s) => s.subscription);
  const tickets = useSubscriptionStore((s) => s.tickets);
  const lastTicketRefresh = useSubscriptionStore((s) => s.lastTicketRefresh);
  const addTickets = useSubscriptionStore((s) => s.addTickets);

  const syncTickets = useCallback(async () => {
    if (isAuthenticated && isSupabaseSyncConfigured()) {
      await upsertUserSubscription(subscription, tickets, lastTicketRefresh);
    }
  }, [isAuthenticated, subscription, tickets, lastTicketRefresh]);

  const addTicketsWithSync = useCallback(
    async (amount: number) => {
      addTickets(amount);
      if (isAuthenticated && isSupabaseSyncConfigured()) {
        await upsertUserSubscription(subscription, tickets + amount, lastTicketRefresh);
      }
    },
    [isAuthenticated, subscription, tickets, lastTicketRefresh, addTickets]
  );

  return {
    syncTickets,
    addTicketsWithSync,
  };
}

/**
 * Hook pour mettre à jour les points de parrainage avec sync Supabase
 */
export function useUpdateReferralPoints() {
  const { isAuthenticated } = useAuth();
  const myCode = useReferralStore((s) => s.myCode);
  const points = useReferralStore((s) => s.points);
  const addPointsLocal = useReferralStore((s) => s.addPoints);

  const addPointsWithSync = useCallback(
    async (amount: number) => {
      addPointsLocal(amount);
      if (isAuthenticated && isSupabaseSyncConfigured()) {
        await upsertUserReferral(myCode, points + amount);
      }
    },
    [isAuthenticated, myCode, points, addPointsLocal]
  );

  return {
    addPointsWithSync,
  };
}

/**
 * Hook pour incrémenter les spins avec sync Supabase
 */
export function useIncrementSpins() {
  const { isAuthenticated } = useAuth();
  const incrementSpinsLocal = useCollectionStore((s) => s.incrementSpins);

  return useCallback(async () => {
    incrementSpinsLocal();
    if (isAuthenticated && isSupabaseSyncConfigured()) {
      await incrementSpinsSupabase();
    }
  }, [isAuthenticated, incrementSpinsLocal]);
}
