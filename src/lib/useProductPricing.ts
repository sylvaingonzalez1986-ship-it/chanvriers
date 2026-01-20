/**
 * useProductPricing - Hook pour gérer les prix selon le rôle utilisateur
 *
 * - Client/Anonyme: price_public + visible_for_clients
 * - Pro: price_pro + visible_for_pros
 * - Producer/Admin: tous les prix
 */

import { useMemo } from 'react';
import { useUserIdentity, usePermissions } from './useAuth';

export type PricingMode = 'public' | 'pro' | 'all';

/**
 * Hook pour déterminer le mode de tarification actuel
 */
export function usePricingMode(): PricingMode {
  const { authMode } = useUserIdentity();
  const { isPro, isProducer, isAdmin } = usePermissions();

  return useMemo(() => {
    if (isAdmin || isProducer) return 'all';
    if (isPro) return 'pro';
    return 'public';
  }, [isAdmin, isProducer, isPro]);
}

/**
 * Hook pour obtenir le prix approprié d'un produit selon le rôle
 */
export function useProductPrice(product: {
  price?: number;
  price_public?: number;
  price_pro?: number | null;
}): number {
  const pricingMode = usePricingMode();

  return useMemo(() => {
    // Compatibilité avec l'ancien système (price) et le nouveau (price_public/price_pro)
    const publicPrice = product.price_public ?? product.price ?? 0;
    const proPrice = product.price_pro ?? publicPrice;

    switch (pricingMode) {
      case 'pro':
        return proPrice;
      case 'all':
        return publicPrice; // Admin/Producer voit le prix public par défaut
      default:
        return publicPrice;
    }
  }, [product, pricingMode]);
}

/**
 * Helper function pour obtenir le prix (utilisable hors hooks)
 */
export function getProductPrice(
  product: {
    price?: number;
    price_public?: number;
    price_pro?: number | null;
  },
  pricingMode: PricingMode
): number {
  const publicPrice = product.price_public ?? product.price ?? 0;
  const proPrice = product.price_pro ?? publicPrice;

  switch (pricingMode) {
    case 'pro':
      return proPrice;
    case 'all':
      return publicPrice;
    default:
      return publicPrice;
  }
}

/**
 * Helper function pour obtenir les deux prix (pour affichage comparatif)
 */
export function getProductPrices(product: {
  price?: number;
  price_public?: number;
  price_pro?: number | null;
}): { publicPrice: number; proPrice: number; hasProPrice: boolean } {
  const publicPrice = product.price_public ?? product.price ?? 0;
  const proPrice = product.price_pro ?? publicPrice;

  return {
    publicPrice,
    proPrice,
    hasProPrice: product.price_pro !== null && product.price_pro !== undefined,
  };
}

/**
 * Hook pour filtrer les produits visibles selon le rôle
 */
export function useVisibleProducts<T extends {
  visible_for_clients?: boolean;
  visible_for_pros?: boolean;
  status?: string;
}>(products: T[]): T[] {
  const pricingMode = usePricingMode();

  return useMemo(() => {
    return products.filter((product) => {
      // Admin/Producer voit tout
      if (pricingMode === 'all') return true;

      // Vérifier le statut (published par défaut)
      const isPublished = product.status === 'published' || product.status === undefined;
      if (!isPublished) return false;

      // Pro voit les produits visibles pour les pros
      if (pricingMode === 'pro') {
        return product.visible_for_pros === true;
      }

      // Client/Anonyme voit les produits visibles pour les clients
      return product.visible_for_clients !== false; // true par défaut
    });
  }, [products, pricingMode]);
}

/**
 * Hook pour vérifier si un produit est visible pour l'utilisateur actuel
 */
export function useIsProductVisible(product: {
  visible_for_clients?: boolean;
  visible_for_pros?: boolean;
  status?: string;
}): boolean {
  const pricingMode = usePricingMode();

  return useMemo(() => {
    if (pricingMode === 'all') return true;

    const isPublished = product.status === 'published' || product.status === undefined;
    if (!isPublished) return false;

    if (pricingMode === 'pro') {
      return product.visible_for_pros === true;
    }

    return product.visible_for_clients !== false;
  }, [product, pricingMode]);
}

/**
 * Hook qui retourne toutes les infos de pricing pour un contexte
 */
export function usePricingContext() {
  const pricingMode = usePricingMode();
  const { isPro, isProducer, isAdmin, isAuthenticated } = usePermissions();
  const { role } = useUserIdentity();

  return {
    pricingMode,
    isPro,
    isProducer,
    isAdmin,
    isAuthenticated,
    role,
    showProPrices: pricingMode === 'pro' || pricingMode === 'all',
    showAllProducts: pricingMode === 'all',
    priceLabel: pricingMode === 'pro' ? 'Prix Pro' : 'Prix',
  };
}
