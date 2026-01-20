/**
 * Bourse Store - Les Chanvriers Unis
 * Store Zustand pour la gestion de l'état de la bourse produits
 */

import { create } from 'zustand';
import {
  ProductMarketState,
  ProOrder,
  BourseStats,
  fetchBourseProducts,
  fetchProductMarketState,
  fetchMyProOrders,
  fetchAllProOrders,
  fetchBourseStats,
  createProOrder,
  updateProOrderStatus,
  cancelProOrder,
  ProOrderStatus,
} from './supabase-bourse';

interface BourseStore {
  // État
  marketStates: ProductMarketState[];
  myOrders: ProOrder[];
  allOrders: ProOrder[];
  stats: BourseStats | null;
  selectedProductId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions - Marché
  loadMarketData: () => Promise<void>;
  refreshMarketData: () => Promise<void>;
  selectProduct: (productId: string | null) => void;
  getMarketState: (productId: string) => ProductMarketState | undefined;

  // Actions - Ordres utilisateur
  loadMyOrders: () => Promise<void>;
  placeOrder: (productId: string, quantity: number, unitPrice: number, productName?: string) => Promise<ProOrder>;
  cancelMyOrder: (orderId: string) => Promise<void>;

  // Actions - Admin
  loadAllOrders: () => Promise<void>;
  loadStats: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: ProOrderStatus) => Promise<void>;

  // Utilitaires
  clearError: () => void;
  reset: () => void;
}

const initialState = {
  marketStates: [],
  myOrders: [],
  allOrders: [],
  stats: null,
  selectedProductId: null,
  isLoading: false,
  error: null,
};

export const useBourseStore = create<BourseStore>((set, get) => ({
  ...initialState,

  // ==================== MARCHÉ ====================

  loadMarketData: async () => {
    set({ isLoading: true, error: null });
    try {
      const marketStates = await fetchBourseProducts();
      set({ marketStates, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur chargement données';
      set({ error: message, isLoading: false });
      console.warn('[BourseStore] loadMarketData error:', error);
    }
  },

  refreshMarketData: async () => {
    // Rafraîchissement silencieux sans spinner
    try {
      const marketStates = await fetchBourseProducts();
      set({ marketStates });
    } catch (error) {
      console.warn('[BourseStore] refreshMarketData error:', error);
    }
  },

  selectProduct: (productId) => {
    set({ selectedProductId: productId });
  },

  getMarketState: (productId) => {
    return get().marketStates.find((ms) => ms.product_id === productId);
  },

  // ==================== ORDRES UTILISATEUR ====================

  loadMyOrders: async () => {
    try {
      const myOrders = await fetchMyProOrders();
      set({ myOrders });
    } catch (error) {
      console.warn('[BourseStore] loadMyOrders error:', error);
    }
  },

  placeOrder: async (productId, quantity, unitPrice, productName) => {
    set({ isLoading: true, error: null });
    try {
      const order = await createProOrder(productId, quantity, unitPrice, productName);

      // Mettre à jour les ordres localement
      const myOrders = get().myOrders;
      set({ myOrders: [order, ...myOrders], isLoading: false });

      // Rafraîchir les données du marché pour refléter la nouvelle demande
      get().refreshMarketData();

      return order;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur création ordre';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  cancelMyOrder: async (orderId) => {
    set({ isLoading: true, error: null });
    try {
      await cancelProOrder(orderId);

      // Mettre à jour localement
      const myOrders = get().myOrders.map((o) =>
        o.id === orderId ? { ...o, status: 'cancelled' as ProOrderStatus } : o
      );
      set({ myOrders, isLoading: false });

      // Rafraîchir les données du marché
      get().refreshMarketData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur annulation ordre';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // ==================== ADMIN ====================

  loadAllOrders: async () => {
    try {
      const allOrders = await fetchAllProOrders();
      set({ allOrders });
    } catch (error) {
      console.warn('[BourseStore] loadAllOrders error:', error);
    }
  },

  loadStats: async () => {
    try {
      const stats = await fetchBourseStats();
      set({ stats });
    } catch (error) {
      console.warn('[BourseStore] loadStats error:', error);
    }
  },

  updateOrderStatus: async (orderId, status) => {
    set({ isLoading: true, error: null });
    try {
      await updateProOrderStatus(orderId, status);

      // Mettre à jour localement
      const allOrders = get().allOrders.map((o) =>
        o.id === orderId ? { ...o, status } : o
      );
      set({ allOrders, isLoading: false });

      // Rafraîchir les données du marché
      get().refreshMarketData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur mise à jour ordre';
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  // ==================== UTILITAIRES ====================

  clearError: () => set({ error: null }),

  reset: () => set(initialState),
}));

// Sélecteurs utilitaires
export const selectMarketStates = (state: BourseStore) => state.marketStates;
export const selectMyOrders = (state: BourseStore) => state.myOrders;
export const selectAllOrders = (state: BourseStore) => state.allOrders;
export const selectBourseStats = (state: BourseStore) => state.stats;
export const selectIsLoading = (state: BourseStore) => state.isLoading;
export const selectBourseError = (state: BourseStore) => state.error;
export const selectSelectedProductId = (state: BourseStore) => state.selectedProductId;
