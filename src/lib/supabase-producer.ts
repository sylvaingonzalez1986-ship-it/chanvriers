/**
 * Supabase Producer API - CRUD pour les produits d'un producteur
 * Ces fonctions utilisent le token d'authentification de l'utilisateur connecté
 * Les RLS policies protègent l'accès aux données
 */

import { getSession, getValidSession } from './supabase-auth';
import { getSupabaseConfig } from './env-validation';

// Utilise getSupabaseConfig() pour une validation centralisée
const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabaseConfig();

// Types
export interface ProducerProductDB {
  id: string;
  producer_id: string;
  name: string;
  type: string;
  cbd_percent: number | null;
  thc_percent: number | null;
  price_public: number;
  price_pro: number | null;
  weight: string | null;
  image: string | null;
  images: string[] | null;
  description: string | null;
  tva_rate: number;
  stock: number | null;
  is_on_promo: boolean;
  promo_percent: number | null;
  visible_for_clients: boolean;
  visible_for_pros: boolean;
  status: 'draft' | 'published' | 'archived';
  lab_analysis_url: string | null; // URL de l'analyse de laboratoire
  disponible_vente_directe: boolean; // Disponible en vente directe à la ferme
  created_at: string;
  updated_at: string;
}

export interface ProducerDB {
  id: string;
  name: string;
  profile_id: string | null;
  region: string | null;
  department: string | null;
  city: string | null;
  image: string | null;
  description: string | null;
  siret: string | null;
  tva_number: string | null;
  culture_outdoor: boolean | null;
  culture_greenhouse: boolean | null;
  culture_indoor: boolean | null;
}

// Types pour insert/update (sans les champs auto-générés)
export type ProductInsert = Omit<ProducerProductDB, 'id' | 'created_at' | 'updated_at'>;
export type ProductUpdate = Partial<Omit<ProducerProductDB, 'id' | 'producer_id' | 'created_at' | 'updated_at'>>;

// Helper pour obtenir les headers authentifiés (synchrone, pour les appels rapides)
const getAuthHeaders = (accessToken?: string) => {
  const session = getSession();
  const token = accessToken || session?.access_token || SUPABASE_ANON_KEY;
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
};

// Helper asynchrone qui rafraîchit le token si nécessaire
const getValidAuthHeaders = async () => {
  const session = await getValidSession();
  const token = session?.access_token || SUPABASE_ANON_KEY;
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
};

/**
 * Récupère le producteur lié au profil de l'utilisateur connecté
 */
export async function fetchMyProducer(): Promise<ProducerDB | null> {
  const session = await getValidSession();
  if (!session?.user?.id) {
    console.log('fetchMyProducer: No authenticated user');
    return null;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/producers?profile_id=eq.${session.user.id}&select=*`,
      {
        method: 'GET',
        headers: getAuthHeaders(session.access_token),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.warn('fetchMyProducer error:', error);
      return null;
    }

    const data = await response.json();
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.warn('fetchMyProducer error:', error);
    return null;
  }
}

/**
 * Récupère tous les produits d'un producteur
 */
export async function fetchProducerProducts(producerId: string): Promise<ProducerProductDB[]> {
  try {
    const headers = await getValidAuthHeaders();
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?producer_id=eq.${producerId}&select=*&order=created_at.desc`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.warn('fetchProducerProducts error:', error);
      return [];
    }

    return response.json();
  } catch (error) {
    console.warn('fetchProducerProducts error:', error);
    return [];
  }
}

/**
 * Crée un nouveau produit
 */
export async function createProduct(product: ProductInsert): Promise<ProducerProductDB | null> {
  try {
    const headers = await getValidAuthHeaders();
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...product,
          id: `product-${Date.now()}`,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.warn('createProduct error:', error);
      return null;
    }

    const data = await response.json();
    return Array.isArray(data) ? data[0] : data;
  } catch (error) {
    console.warn('createProduct error:', error);
    return null;
  }
}

/**
 * Met à jour un produit existant
 * Vérifie que le produit appartient bien au producteur connecté
 */
export async function updateProduct(
  productId: string,
  updates: ProductUpdate
): Promise<ProducerProductDB | null> {
  try {
    // Récupérer le producteur de l'utilisateur connecté
    const myProducer = await fetchMyProducer();
    if (!myProducer) {
      console.warn('updateProduct: User is not linked to any producer');
      return null;
    }

    // Récupérer le produit pour vérifier sa propriété
    const headers = await getValidAuthHeaders();
    const getResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}&select=producer_id`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!getResponse.ok) {
      console.warn('updateProduct: Error fetching product:', await getResponse.text());
      return null;
    }

    const products = await getResponse.json();
    if (!products || products.length === 0) {
      console.warn('[updateProduct] Product not found:', productId);
      return null;
    }

    // Vérifier que le produit appartient au producteur connecté
    if (products[0].producer_id !== myProducer.id) {
      console.warn('[updateProduct] Unauthorized: Product belongs to different producer');
      return null;
    }

    // Le produit appartient au bon producteur, effectuer la mise à jour
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.warn('updateProduct error:', error);
      return null;
    }

    const data = await response.json();
    return Array.isArray(data) ? data[0] : data;
  } catch (error) {
    console.warn('updateProduct error:', error);
    return null;
  }
}

/**
 * Supprime un produit
 * Vérifie que le produit appartient bien au producteur connecté
 */
export async function deleteProduct(productId: string): Promise<boolean> {
  try {
    // Récupérer le producteur de l'utilisateur connecté
    const myProducer = await fetchMyProducer();
    if (!myProducer) {
      console.warn('deleteProduct: User is not linked to any producer');
      return false;
    }

    // Récupérer le produit pour vérifier sa propriété
    const headers = await getValidAuthHeaders();
    const getResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}&select=producer_id`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!getResponse.ok) {
      console.warn('deleteProduct: Error fetching product:', await getResponse.text());
      return false;
    }

    const products = await getResponse.json();
    if (!products || products.length === 0) {
      console.warn('[deleteProduct] Product not found:', productId);
      return false;
    }

    // Vérifier que le produit appartient au producteur connecté
    if (products[0].producer_id !== myProducer.id) {
      console.warn('[deleteProduct] Unauthorized: Product belongs to different producer');
      return false;
    }

    // Le produit appartient au bon producteur, effectuer la suppression
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`,
      {
        method: 'DELETE',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.warn('deleteProduct error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('deleteProduct error:', error);
    return false;
  }
}

/**
 * Met à jour les infos du producteur
 * Vérifie que le producteur appartient bien à l'utilisateur connecté
 */
export async function updateMyProducer(
  producerId: string,
  updates: Partial<ProducerDB>
): Promise<ProducerDB | null> {
  try {
    // Récupérer le producteur de l'utilisateur connecté
    const myProducer = await fetchMyProducer();
    if (!myProducer) {
      console.warn('[updateMyProducer] User is not linked to any producer');
      return null;
    }

    // Vérifier que le producteur à modifier appartient à l'utilisateur connecté
    if (myProducer.id !== producerId) {
      console.warn('[updateMyProducer] Unauthorized: Producer does not belong to user');
      return null;
    }

    // Le producteur appartient au bon utilisateur, effectuer la mise à jour
    const headers = await getValidAuthHeaders();
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/producers?id=eq.${producerId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.warn('[updateMyProducer] Error:', error);
      return null;
    }

    const data = await response.json();
    return Array.isArray(data) ? data[0] : data;
  } catch (error) {
    console.warn('[updateMyProducer] Error:', error);
    return null;
  }
}

/**
 * Décrémente le stock d'un produit dans Supabase
 * Utilisé après une vente pour mettre à jour le stock en base de données
 */
export async function decrementProductStockInSupabase(
  productId: string,
  quantity: number
): Promise<boolean> {
  try {
    const headers = await getValidAuthHeaders();
    // D'abord récupérer le stock actuel
    const getResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}&select=id,stock`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!getResponse.ok) {
      console.warn('[decrementProductStockInSupabase] Error fetching product:', await getResponse.text());
      return false;
    }

    const products = await getResponse.json();
    if (!products || products.length === 0) {
      console.log('[decrementProductStockInSupabase] Product not found:', productId);
      return false;
    }

    const currentStock = products[0].stock;

    // Si le stock est null (illimité), on ne fait rien
    if (currentStock === null) {
      console.log('[decrementProductStockInSupabase] Stock is unlimited for product:', productId);
      return true;
    }

    const newStock = Math.max(0, currentStock - quantity);

    // Mettre à jour le stock
    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${productId}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ stock: newStock }),
      }
    );

    if (!updateResponse.ok) {
      console.warn('[decrementProductStockInSupabase] Error updating stock:', await updateResponse.text());
      return false;
    }

    console.log(`[decrementProductStockInSupabase] Stock updated: ${productId}, ${currentStock} -> ${newStock}`);
    return true;
  } catch (error) {
    console.warn('[decrementProductStockInSupabase] Error:', error);
    return false;
  }
}
