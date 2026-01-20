import { create } from 'zustand';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase-auth';
import { isSupabaseConfigured, getSupabaseConfig } from './env-validation';

// Helper pour obtenir la config de manière sécurisée
const getConfig = () => {
  if (isSupabaseConfigured()) {
    return getSupabaseConfig();
  }
  // Fallback sur les imports existants pour compatibilité
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
};

export interface DirectSalesCartItem {
  id: string;
  product_id: string;
  producer_id: string;
  producer_name: string;
  product_name: string;
  price: number;
  quantity: number;
  image: string;
  created_at: string;
}

interface DirectSalesCartStore {
  items: DirectSalesCartItem[];
  loading: boolean;

  // Actions
  loadCart: (userId: string, accessToken: string) => Promise<void>;
  addItem: (userId: string, accessToken: string, item: Omit<DirectSalesCartItem, 'id' | 'created_at'>) => Promise<void>;
  removeItem: (userId: string, accessToken: string, id: string) => Promise<void>;
  updateQuantity: (userId: string, accessToken: string, id: string, quantity: number) => Promise<void>;
  clearCart: (userId: string, accessToken: string) => Promise<void>;
  createOrders: (userId: string, accessToken: string) => Promise<{ success: boolean; orderIds?: string[]; error?: string }>;

  // Computed
  getTotalByProducer: (producerId: string) => number;
  getProducerIds: () => string[];
  getItemsByProducer: (producerId: string) => DirectSalesCartItem[];
  getGrandTotal: () => number;
  getProducersWithInsufficientAmount: () => { producerId: string; producerName: string; amount: number }[];
  isMinimumMet: () => boolean;
}

export const useDirectSalesCart = create<DirectSalesCartStore>((set, get) => ({
  items: [],
  loading: false,

  // Charger le panier depuis Supabase
  loadCart: async (userId: string, accessToken: string) => {
    try {
      set({ loading: true });

      if (!userId) {
        set({ items: [], loading: false });
        return;
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/panier_vente_directe?user_id=eq.${userId}&order=created_at.desc`,
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Enrichir les données avec les infos produit et producteur
        const enrichedItems: DirectSalesCartItem[] = await Promise.all(
          data.map(async (item: any) => {
            // Récupérer les infos du produit
            const productResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/products?id=eq.${item.product_id}&select=name,price_public,image`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  apikey: SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );
            const product = await productResponse.json();

            // Récupérer les infos du producteur
            const producerResponse = await fetch(
              `${SUPABASE_URL}/rest/v1/producers?id=eq.${item.producer_id}&select=name`,
              {
                headers: {
                  'Content-Type': 'application/json',
                  apikey: SUPABASE_ANON_KEY,
                  Authorization: `Bearer ${accessToken}`,
                },
              }
            );
            const producer = await producerResponse.json();

            return {
              id: item.id,
              product_id: item.product_id,
              producer_id: item.producer_id,
              producer_name: producer[0]?.name || 'Unknown',
              product_name: product[0]?.name || 'Unknown',
              price: product[0]?.price_public || 0,
              quantity: item.quantity,
              image: product[0]?.image || '',
              created_at: item.created_at,
            };
          })
        );

        set({ items: enrichedItems });
      }
    } catch (error) {
      console.log('[DirectSalesCart] Error loading cart:', error);
    } finally {
      set({ loading: false });
    }
  },

  // Ajouter un item au panier
  addItem: async (userId: string, accessToken: string, item) => {
    try {
      if (!userId) return;

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/panier_vente_directe`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            user_id: userId,
            product_id: item.product_id,
            producer_id: item.producer_id,
            quantity: item.quantity,
          }),
        }
      );

      if (response.ok) {
        // Recharger le panier
        await get().loadCart(userId, accessToken);
      }
    } catch (error) {
      console.log('[DirectSalesCart] Error adding item:', error);
    }
  },

  // Supprimer un item
  removeItem: async (userId: string, accessToken: string, id: string) => {
    try {
      if (!userId) return;

      await fetch(
        `${SUPABASE_URL}/rest/v1/panier_vente_directe?id=eq.${id}`,
        {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      set({ items: get().items.filter((item) => item.id !== id) });
    } catch (error) {
      console.log('[DirectSalesCart] Error removing item:', error);
    }
  },

  // Modifier la quantité
  updateQuantity: async (userId: string, accessToken: string, id: string, quantity: number) => {
    try {
      if (quantity <= 0) {
        await get().removeItem(userId, accessToken, id);
        return;
      }

      if (!userId) return;

      await fetch(
        `${SUPABASE_URL}/rest/v1/panier_vente_directe?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ quantity }),
        }
      );

      set({
        items: get().items.map((item) =>
          item.id === id ? { ...item, quantity } : item
        ),
      });
    } catch (error) {
      console.log('[DirectSalesCart] Error updating quantity:', error);
    }
  },

  // Vider le panier
  clearCart: async (userId: string, accessToken: string) => {
    try {
      if (!userId) return;

      await fetch(
        `${SUPABASE_URL}/rest/v1/panier_vente_directe?user_id=eq.${userId}`,
        {
          method: 'DELETE',
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      set({ items: [] });
    } catch (error) {
      console.log('[DirectSalesCart] Error clearing cart:', error);
    }
  },

  // Créer les commandes pour chaque producteur
  createOrders: async (userId: string, accessToken: string) => {
    try {
      if (!userId) {
        return { success: false, error: 'User not authenticated' };
      }

      const producerIds = get().getProducerIds();

      if (producerIds.length === 0) {
        return { success: false, error: 'Cart is empty' };
      }

      // Vérifier que le minimum est atteint
      if (!get().isMinimumMet()) {
        return { success: false, error: 'Minimum amount not met for some producers' };
      }

      const orderIds: string[] = [];

      // Créer une commande par producteur
      for (const producerId of producerIds) {
        const items = get().getItemsByProducer(producerId);
        const total = get().getTotalByProducer(producerId);

        if (items.length === 0 || total < 20) continue;

        try {
          // Récupérer les infos du producteur (adresse retrait, horaires, etc.)
          const producerResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/producers?id=eq.${producerId}&select=name,adresse_retrait,horaires_retrait,instructions_retrait`,
            {
              headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken}`,
              },
            }
          );

          const producerData = await producerResponse.json();
          const producer = producerData[0] || {};

          // Créer la commande
          console.log('[DirectSalesCart] Creating order for producer:', producerId, 'total:', total);
          const commandeResponse = await fetch(
            `${SUPABASE_URL}/rest/v1/commandes_vente_directe`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: SUPABASE_ANON_KEY,
                Authorization: `Bearer ${accessToken}`,
                Prefer: 'return=representation',
              },
              body: JSON.stringify({
                user_id: userId,
                producer_id: producerId,
                total,
                statut: 'en_attente',
                adresse_retrait: producer.adresse_retrait || '',
                horaires_retrait: producer.horaires_retrait || '',
                instructions_retrait: producer.instructions_retrait || null,
              }),
            }
          );

          if (!commandeResponse.ok) {
            const errorText = await commandeResponse.text();
            console.log('[DirectSalesCart] Error creating order:', commandeResponse.status, errorText);
            continue;
          }

          const commandeData = await commandeResponse.json();
          console.log('[DirectSalesCart] Order created:', commandeData);
          const commande = Array.isArray(commandeData) ? commandeData[0] : commandeData;

          if (!commande?.id) {
            console.log('[DirectSalesCart] No order ID returned');
            continue;
          }

          orderIds.push(commande.id);

          // Créer les lignes de commande en parallèle
          await Promise.all(
            items.map((item) =>
              fetch(
                `${SUPABASE_URL}/rest/v1/lignes_commande_vente_directe`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${accessToken}`,
                  },
                  body: JSON.stringify({
                    commande_id: commande.id,
                    product_id: item.product_id,
                    quantite: item.quantity,
                    prix_unitaire: item.price,
                    sous_total: item.price * item.quantity,
                  }),
                }
              )
            )
          );

          // Appeler la fonction d'envoi d'email
          await fetch(
            `${SUPABASE_URL}/functions/v1/send-order-email`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                commandeId: commande.id,
                producerId,
                userId,
              }),
            }
          );
        } catch (error) {
          console.log('[DirectSalesCart] Error creating order for producer:', producerId, error);
        }
      }

      // Vider le panier après succès
      if (orderIds.length > 0) {
        await get().clearCart(userId, accessToken);
      }

      return {
        success: orderIds.length > 0,
        orderIds: orderIds.length > 0 ? orderIds : undefined,
        error: orderIds.length === 0 ? 'Failed to create any orders' : undefined,
      };
    } catch (error) {
      console.log('[DirectSalesCart] Error in createOrders:', error);
      return { success: false, error: 'An error occurred while creating orders' };
    }
  },

  // Calculer le total par producteur
  getTotalByProducer: (producerId: string) => {
    return get()
      .items.filter((item) => item.producer_id === producerId)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  // Récupérer les IDs des producteurs
  getProducerIds: () => {
    return [...new Set(get().items.map((item) => item.producer_id))];
  },

  // Récupérer les items par producteur
  getItemsByProducer: (producerId: string) => {
    return get().items.filter((item) => item.producer_id === producerId);
  },

  // Calculer le grand total
  getGrandTotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },

  // Récupérer les producteurs avec montant insuffisant
  getProducersWithInsufficientAmount: () => {
    const result: { producerId: string; producerName: string; amount: number }[] = [];
    const producerIds = get().getProducerIds();

    producerIds.forEach((producerId) => {
      const items = get().getItemsByProducer(producerId);
      const amount = get().getTotalByProducer(producerId);

      if (amount < 20) {
        result.push({
          producerId,
          producerName: items[0]?.producer_name || 'Unknown',
          amount,
        });
      }
    });

    return result;
  },

  // Vérifier si le minimum est atteint pour tous les producteurs
  isMinimumMet: () => {
    const producerIds = get().getProducerIds();
    if (producerIds.length === 0) return false;

    return producerIds.every((producerId) => {
      const total = get().getTotalByProducer(producerId);
      return total >= 20;
    });
  },
}));
