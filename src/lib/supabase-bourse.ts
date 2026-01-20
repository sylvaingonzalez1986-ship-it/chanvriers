/**
 * Supabase Bourse Client - Les Chanvriers Unis
 * Système de bourse produits pour les professionnels
 */

import { getSession } from './supabase-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Clé pour stocker les commandes localement
const LOCAL_ORDERS_KEY = '@bourse_local_orders';

// Headers avec authentification
const getAuthHeaders = () => {
  const session = getSession();
  const token = session?.access_token || SUPABASE_ANON_KEY;
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
};

// ==================== TYPES ====================

export type ProOrderType = 'buy_request';
export type ProOrderStatus = 'pending' | 'matched' | 'cancelled';

export interface ProOrder {
  id: string;
  product_id: string;
  pro_user_id: string;
  type: ProOrderType;
  quantity: number;
  unit_price: number; // Prix au moment de la commande
  status: ProOrderStatus;
  created_at: string;
  updated_at: string;
  // Relations (optionnel, pour les jointures)
  product?: SupabaseBourseProduct;
  profile?: {
    id: string;
    full_name: string | null;
    company_name: string | null;
    business_name: string | null;
  };
}

export interface SupabaseBourseProduct {
  id: string;
  producer_id: string;
  name: string;
  type: 'fleur' | 'huile' | 'resine' | 'infusion';
  base_price: number; // Prix de base HT
  stock_available: number;
  cbd_percent: number;
  thc_percent: number;
  weight: string;
  image: string;
  description: string;
  visible_for_pros: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  producer?: {
    id: string;
    name: string;
  };
}

export interface ProductMarketState {
  product_id: string;
  dynamic_price: number;
  min_price: number;
  max_price: number;
  base_price: number;
  total_pro_demand: number;
  stock_available: number;
  variation_percent: number;
  last_update_at: string;
  // Données produit jointes
  product?: SupabaseBourseProduct;
}

// ==================== STOCKAGE LOCAL DES COMMANDES ====================

// Cache mémoire des commandes locales
let localOrdersCache: ProOrder[] | null = null;

/**
 * Charge les commandes locales depuis AsyncStorage
 */
async function loadLocalOrders(): Promise<ProOrder[]> {
  if (localOrdersCache !== null) {
    return localOrdersCache;
  }

  try {
    const data = await AsyncStorage.getItem(LOCAL_ORDERS_KEY);
    const orders = data ? JSON.parse(data) as ProOrder[] : [];
    localOrdersCache = orders;
    return orders;
  } catch (error) {
    console.log('[Bourse] Error loading local orders:', error);
    localOrdersCache = [];
    return [];
  }
}

/**
 * Sauvegarde les commandes locales dans AsyncStorage
 */
async function saveLocalOrders(orders: ProOrder[]): Promise<void> {
  try {
    localOrdersCache = orders;
    await AsyncStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(orders));
  } catch (error) {
    console.log('[Bourse] Error saving local orders:', error);
  }
}

/**
 * Ajoute une commande locale
 */
async function addLocalOrder(order: ProOrder): Promise<void> {
  const orders = await loadLocalOrders();
  orders.unshift(order);
  await saveLocalOrders(orders);
}

/**
 * Met à jour le statut d'une commande locale
 */
async function updateLocalOrderStatus(orderId: string, status: ProOrderStatus): Promise<void> {
  const orders = await loadLocalOrders();
  const index = orders.findIndex(o => o.id === orderId);
  if (index !== -1) {
    orders[index].status = status;
    orders[index].updated_at = new Date().toISOString();
    await saveLocalOrders(orders);
  }
}

/**
 * Calcule la demande totale pour un produit à partir des commandes locales
 */
async function getLocalDemandForProduct(productId: string): Promise<number> {
  const orders = await loadLocalOrders();
  return orders
    .filter(o => o.product_id === productId && o.status === 'pending')
    .reduce((sum, o) => sum + o.quantity, 0);
}

// ==================== CALCUL DE PRIX DYNAMIQUE ====================

/**
 * Calcule le prix dynamique en fonction de l'offre et de la demande
 * Variation limitée à ±30% du prix de base
 */
export function calculateDynamicPrice(
  basePrice: number,
  stockAvailable: number,
  totalDemand: number
): { dynamicPrice: number; variationPercent: number } {
  const minPrice = basePrice * 0.7;
  const maxPrice = basePrice * 1.3;

  // Si stock = 0, prix max (quasi-rupture)
  if (stockAvailable <= 0) {
    return {
      dynamicPrice: maxPrice,
      variationPercent: 30,
    };
  }

  // Ratio de tension: demande / stock
  const demandRatio = totalDemand / stockAvailable;

  // Transformation du ratio en variation de prix
  // demandRatio <= 0.2 → proche de min_price (-30%)
  // demandRatio ≈ 1 → proche de base_price (0%)
  // demandRatio >= 2 → proche de max_price (+30%)

  let variationPercent: number;

  if (demandRatio <= 0.2) {
    // Faible demande → prix bas
    variationPercent = -30 + (demandRatio / 0.2) * 15; // -30% à -15%
  } else if (demandRatio <= 1) {
    // Demande normale → prix proche du base
    variationPercent = -15 + ((demandRatio - 0.2) / 0.8) * 15; // -15% à 0%
  } else if (demandRatio <= 2) {
    // Demande élevée → prix en hausse
    variationPercent = ((demandRatio - 1) / 1) * 15; // 0% à +15%
  } else {
    // Très forte demande → prix max
    variationPercent = 15 + Math.min((demandRatio - 2) / 2, 1) * 15; // +15% à +30%
  }

  // Clamper la variation entre -30 et +30
  variationPercent = Math.max(-30, Math.min(30, variationPercent));

  const dynamicPrice = basePrice * (1 + variationPercent / 100);

  return {
    dynamicPrice: Math.max(minPrice, Math.min(maxPrice, dynamicPrice)),
    variationPercent: Math.round(variationPercent * 10) / 10,
  };
}

// ==================== FONCTIONS BOURSE ====================

/**
 * Récupère tous les produits cotés en bourse avec leur état de marché
 */
export async function fetchBourseProducts(): Promise<ProductMarketState[]> {
  try {
    // Charger les commandes locales d'abord
    const localOrders = await loadLocalOrders();
    console.log('[fetchBourseProducts] Local orders count:', localOrders.length);

    // Récupérer les produits visibles pour les pros (ou tous les produits si visible_for_pros n'existe pas)
    let productsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/products?visible_for_pros=eq.true&select=*,producer:producers(id,name)`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    // Si la colonne visible_for_pros n'existe pas, essayer sans filtre
    if (!productsResponse.ok) {
      productsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/products?select=*,producer:producers(id,name)`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );
    }

    if (!productsResponse.ok) {
      const error = await productsResponse.text();
      console.warn('[fetchBourseProducts] Erreur produits:', error);
      // Retourner des données de démo si pas de produits
      return getDemoMarketStates();
    }

    const products: SupabaseBourseProduct[] = await productsResponse.json();

    // Si aucun produit, retourner les données de démo
    if (products.length === 0) {
      return getDemoMarketStates();
    }

    // Pour chaque produit, calculer l'état du marché
    const marketStates: ProductMarketState[] = await Promise.all(
      products.map(async (product) => {
        // Calculer la demande à partir des commandes locales d'abord
        let totalDemand = localOrders
          .filter(o => o.product_id === product.id && o.status === 'pending')
          .reduce((sum, o) => sum + o.quantity, 0);

        // Essayer aussi de récupérer les demandes depuis Supabase
        try {
          const demandsResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/pro_orders?product_id=eq.${product.id}&status=eq.pending&select=quantity`,
            {
              method: 'GET',
              headers: getAuthHeaders(),
            }
          );

          if (demandsResponse.ok) {
            const demands: { quantity: number }[] = await demandsResponse.json();
            const supabaseDemand = demands.reduce((sum, d) => sum + d.quantity, 0);
            // Ajouter la demande Supabase (éviter les doublons n'est pas crucial ici)
            totalDemand += supabaseDemand;
          }
        } catch {
          // Table pro_orders n'existe pas encore, utiliser seulement les commandes locales
        }

        // Utiliser price_pro ou price_public comme base_price si base_price n'existe pas
        // Pour la bourse PRO, on utilise pricePro (prix pro) s'il existe, sinon price (prix public)
        const productAny = product as unknown as {
          price_pro?: number;
          pricePro?: number;
          price_public?: number;
          price?: number;
        };
        const basePrice = product.base_price ||
          productAny.price_pro ||
          productAny.pricePro ||
          productAny.price_public ||
          productAny.price || 10;

        console.log('[fetchBourseProducts] Product:', product.name, 'basePrice:', basePrice, 'demand:', totalDemand);
        // Utiliser stock comme stock_available si stock_available n'existe pas
        const stockAvailable = product.stock_available ?? (product as unknown as { stock?: number }).stock ?? 100;

        const { dynamicPrice, variationPercent } = calculateDynamicPrice(
          basePrice,
          stockAvailable,
          totalDemand
        );

        return {
          product_id: product.id,
          dynamic_price: dynamicPrice,
          min_price: basePrice * 0.7,
          max_price: basePrice * 1.3,
          base_price: basePrice,
          total_pro_demand: totalDemand,
          stock_available: stockAvailable,
          variation_percent: variationPercent,
          last_update_at: new Date().toISOString(),
          product,
        };
      })
    );

    return marketStates;
  } catch (error) {
    console.warn('[fetchBourseProducts] Erreur:', error);
    // En cas d'erreur, retourner les données de démo
    return getDemoMarketStates();
  }
}

/**
 * Données de démonstration pour la bourse
 * Utilise les commandes locales pour calculer les prix dynamiques
 */
async function getDemoMarketStates(): Promise<ProductMarketState[]> {
  const demoProducts = [
    { id: 'demo-1', name: 'Amnesia CBD', type: 'fleur' as const, basePrice: 8.50, stock: 150 },
    { id: 'demo-2', name: 'Huile CBD 10%', type: 'huile' as const, basePrice: 35.00, stock: 50 },
    { id: 'demo-3', name: 'Résine Marocaine', type: 'resine' as const, basePrice: 12.00, stock: 30 },
    { id: 'demo-4', name: 'Infusion Relaxante', type: 'infusion' as const, basePrice: 6.00, stock: 200 },
    { id: 'demo-5', name: 'OG Kush CBD', type: 'fleur' as const, basePrice: 9.00, stock: 80 },
    { id: 'demo-6', name: 'Huile CBD 20%', type: 'huile' as const, basePrice: 55.00, stock: 25 },
    { id: 'demo-7', name: 'Critical Mass', type: 'fleur' as const, basePrice: 7.50, stock: 5 },
    { id: 'demo-8', name: 'Gelato CBD', type: 'fleur' as const, basePrice: 10.00, stock: 100 },
    { id: 'demo-9', name: 'Diesel Strawberry', type: 'fleur' as const, basePrice: 11.00, stock: 60 },
  ];

  // Charger les commandes locales pour calculer la demande
  const localOrders = await loadLocalOrders();
  console.log('[Bourse] Local orders loaded:', localOrders.length);

  return demoProducts.map((p) => {
    // Calculer la demande à partir des commandes locales en attente
    const localDemand = localOrders
      .filter(o => o.product_id === p.id && o.status === 'pending')
      .reduce((sum, o) => sum + o.quantity, 0);

    const { dynamicPrice, variationPercent } = calculateDynamicPrice(
      p.basePrice,
      p.stock,
      localDemand
    );

    return {
      product_id: p.id,
      dynamic_price: dynamicPrice,
      min_price: p.basePrice * 0.7,
      max_price: p.basePrice * 1.3,
      base_price: p.basePrice,
      total_pro_demand: localDemand,
      stock_available: p.stock,
      variation_percent: variationPercent,
      last_update_at: new Date().toISOString(),
      product: {
        id: p.id,
        producer_id: 'demo-producer',
        name: p.name,
        type: p.type,
        base_price: p.basePrice,
        stock_available: p.stock,
        cbd_percent: 15,
        thc_percent: 0.2,
        weight: '1g',
        image: `https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400`,
        description: `Produit de démonstration - ${p.name}`,
        visible_for_pros: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        producer: { id: 'demo-producer', name: 'Producteur Démo' },
      },
    };
  });
}

/**
 * Récupère l'état du marché pour un produit spécifique
 */
export async function fetchProductMarketState(productId: string): Promise<ProductMarketState | null> {
  try {
    const productResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}&select=*,producer:producers(id,name)`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!productResponse.ok) {
      throw new Error('Produit non trouvé');
    }

    const products: SupabaseBourseProduct[] = await productResponse.json();
    if (products.length === 0) return null;

    const product = products[0];

    // Récupérer les demandes en cours
    const demandsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/pro_orders?product_id=eq.${productId}&status=eq.pending&select=quantity`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    let totalDemand = 0;
    if (demandsResponse.ok) {
      const demands: { quantity: number }[] = await demandsResponse.json();
      totalDemand = demands.reduce((sum, d) => sum + d.quantity, 0);
    }

    const basePrice = product.base_price || 0;
    const stockAvailable = product.stock_available || 0;

    const { dynamicPrice, variationPercent } = calculateDynamicPrice(
      basePrice,
      stockAvailable,
      totalDemand
    );

    return {
      product_id: product.id,
      dynamic_price: dynamicPrice,
      min_price: basePrice * 0.7,
      max_price: basePrice * 1.3,
      base_price: basePrice,
      total_pro_demand: totalDemand,
      stock_available: stockAvailable,
      variation_percent: variationPercent,
      last_update_at: new Date().toISOString(),
      product,
    };
  } catch (error) {
    console.warn('[fetchProductMarketState] Erreur:', error);
    throw error;
  }
}

// ==================== ORDRES PRO ====================

/**
 * Crée une demande d'achat pro
 * Utilise Supabase si disponible, sinon stockage local
 */
export async function createProOrder(
  productId: string,
  quantity: number,
  unitPrice: number,
  productName?: string
): Promise<ProOrder> {
  const session = getSession();
  if (!session) {
    throw new Error('Non authentifié');
  }

  const now = new Date().toISOString();
  const orderId = `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const orderData: ProOrder = {
    id: orderId,
    product_id: productId,
    pro_user_id: session.user.id,
    type: 'buy_request' as ProOrderType,
    quantity,
    unit_price: unitPrice,
    status: 'pending' as ProOrderStatus,
    created_at: now,
    updated_at: now,
    // Ajouter les infos produit pour l'affichage
    product: {
      id: productId,
      producer_id: 'demo-producer',
      name: productName || 'Produit',
      type: 'fleur',
      base_price: unitPrice,
      stock_available: 100,
      cbd_percent: 15,
      thc_percent: 0.2,
      weight: '1g',
      image: 'https://images.unsplash.com/photo-1603909223429-69bb7101f420?w=400',
      description: '',
      visible_for_pros: true,
      created_at: now,
      updated_at: now,
    },
  };

  // Essayer Supabase d'abord
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/pro_orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        product_id: productId,
        pro_user_id: session.user.id,
        type: 'buy_request',
        quantity,
        unit_price: unitPrice,
        status: 'pending',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const supabaseOrder = Array.isArray(data) ? data[0] : data;
      // Sauvegarder aussi localement pour synchronisation
      await addLocalOrder({ ...orderData, id: supabaseOrder.id });
      return supabaseOrder;
    }
  } catch (error) {
    console.log('[createProOrder] Supabase non disponible, utilisation du stockage local');
  }

  // Fallback: stockage local
  await addLocalOrder(orderData);
  console.log('[createProOrder] Commande créée localement:', orderId);
  return orderData;
}

/**
 * Récupère les ordres de l'utilisateur connecté
 * Utilise Supabase si disponible, sinon stockage local
 */
export async function fetchMyProOrders(): Promise<ProOrder[]> {
  const session = getSession();
  if (!session) {
    return [];
  }

  // Essayer Supabase d'abord
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/pro_orders?pro_user_id=eq.${session.user.id}&select=*,product:products(id,name,type,image,base_price)&order=created_at.desc`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (response.ok) {
      const supabaseOrders = await response.json();
      if (supabaseOrders.length > 0) {
        return supabaseOrders;
      }
    }
  } catch (error) {
    console.log('[fetchMyProOrders] Supabase non disponible');
  }

  // Fallback: stockage local
  const localOrders = await loadLocalOrders();
  const myOrders = localOrders.filter(o => o.pro_user_id === session.user.id);
  console.log('[fetchMyProOrders] Commandes locales:', myOrders.length);
  return myOrders;
}

/**
 * Récupère tous les ordres (admin uniquement)
 * Utilise Supabase si disponible, sinon stockage local
 */
export async function fetchAllProOrders(): Promise<ProOrder[]> {
  // Essayer Supabase d'abord
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/pro_orders?select=*,product:products(id,name,type,image,base_price),profile:profiles(id,full_name,company_name,business_name)&order=created_at.desc`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (response.ok) {
      const supabaseOrders = await response.json();
      if (supabaseOrders.length > 0) {
        return supabaseOrders;
      }
    }
  } catch (error) {
    console.log('[fetchAllProOrders] Supabase non disponible');
  }

  // Fallback: stockage local
  const localOrders = await loadLocalOrders();
  console.log('[fetchAllProOrders] Commandes locales:', localOrders.length);
  return localOrders;
}

/**
 * Met à jour le statut d'un ordre (admin uniquement)
 * Utilise Supabase si disponible, sinon stockage local
 */
export async function updateProOrderStatus(
  orderId: string,
  status: ProOrderStatus
): Promise<void> {
  // Essayer Supabase d'abord
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/pro_orders?id=eq.${orderId}`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (response.ok) {
      // Mettre aussi à jour localement
      await updateLocalOrderStatus(orderId, status);
      return;
    }
  } catch (error) {
    console.log('[updateProOrderStatus] Supabase non disponible');
  }

  // Fallback: stockage local
  await updateLocalOrderStatus(orderId, status);
  console.log('[updateProOrderStatus] Statut mis à jour localement:', orderId, status);
}

/**
 * Annule un ordre (utilisateur propriétaire ou admin)
 */
export async function cancelProOrder(orderId: string): Promise<void> {
  return updateProOrderStatus(orderId, 'cancelled');
}

// ==================== STATISTIQUES ADMIN ====================

export interface BourseStats {
  totalOrders: number;
  pendingOrders: number;
  matchedOrders: number;
  cancelledOrders: number;
  topDemandProducts: Array<{
    productId: string;
    productName: string;
    totalDemand: number;
  }>;
  topVariationProducts: Array<{
    productId: string;
    productName: string;
    variationPercent: number;
  }>;
}

/**
 * Récupère les statistiques de la bourse (admin)
 */
export async function fetchBourseStats(): Promise<BourseStats> {
  // Récupérer tous les ordres (peut être vide si table n'existe pas)
  let orders: ProOrder[] = [];
  try {
    const ordersResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/pro_orders?select=*`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (ordersResponse.ok) {
      orders = await ordersResponse.json();
    }
  } catch {
    // Table n'existe pas encore
  }

  // Récupérer l'état du marché
  const marketStates = await fetchBourseProducts();

  // Calculer les stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const matchedOrders = orders.filter(o => o.status === 'matched').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

  // Top produits par demande
  const topDemandProducts = marketStates
    .filter(ms => ms.total_pro_demand > 0)
    .sort((a, b) => b.total_pro_demand - a.total_pro_demand)
    .slice(0, 5)
    .map(ms => ({
      productId: ms.product_id,
      productName: ms.product?.name || 'Inconnu',
      totalDemand: ms.total_pro_demand,
    }));

  // Top produits par variation de prix (absolue)
  const topVariationProducts = marketStates
    .filter(ms => ms.variation_percent !== 0)
    .sort((a, b) => Math.abs(b.variation_percent) - Math.abs(a.variation_percent))
    .slice(0, 5)
    .map(ms => ({
      productId: ms.product_id,
      productName: ms.product?.name || 'Inconnu',
      variationPercent: ms.variation_percent,
    }));

  return {
    totalOrders,
    pendingOrders,
    matchedOrders,
    cancelledOrders,
    topDemandProducts,
    topVariationProducts,
  };
}
