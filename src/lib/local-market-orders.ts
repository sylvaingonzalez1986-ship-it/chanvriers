/**
 * Local Market Orders - Les Chanvriers Unis
 * Gestion des commandes directes auprès des producteurs locaux
 * Système séparé du panier boutique en ligne
 */

import { create } from 'zustand';
import { SUPABASE_URL, SUPABASE_ANON_KEY, getValidSession } from '@/lib/supabase-auth';

// Types pour les commandes Marché Local
export interface LocalMarketOrder {
  id: string;
  created_at: string;
  updated_at: string;

  // Client
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;

  // Producteur
  producer_id: string;
  producer_name: string;
  producer_email: string;
  producer_phone: string | null;
  producer_location: string | null;

  // Produit
  product_id: string;
  product_name: string;
  product_description: string | null;
  quantity: number;
  unit_price: number;
  total_amount: number;

  // Statut
  status: 'pending' | 'confirmed' | 'ready' | 'completed' | 'cancelled';

  // Code de retrait
  pickup_code: string;

  // Coordonnées du retrait
  pickup_date: string | null;
  pickup_location: string | null;
  pickup_instructions: string | null;

  // Notes
  customer_notes: string | null;
  producer_notes: string | null;

  // Paiement
  is_paid: boolean;
  payment_method: string | null;
  completed_at: string | null;
}

export interface CreateLocalOrderParams {
  // Infos client
  customer_name: string;
  customer_email: string;
  customer_phone?: string;

  // Infos producteur
  producer_id: string;
  producer_name: string;
  producer_email: string;
  producer_phone?: string;
  producer_location?: string;

  // Infos produit
  product_id: string;
  product_name: string;
  product_description?: string;
  quantity: number;
  unit_price: number;

  // Infos retrait
  pickup_location?: string;
  pickup_instructions?: string;

  // Notes
  customer_notes?: string;
}

interface LocalMarketOrdersStore {
  orders: LocalMarketOrder[];
  loading: boolean;
  error: string | null;

  // Actions
  loadOrders: (userId: string, accessToken: string) => Promise<void>;
  loadOrdersForProducer: (producerId: string, accessToken: string) => Promise<LocalMarketOrder[]>;
  createOrder: (
    userId: string,
    accessToken: string,
    params: CreateLocalOrderParams
  ) => Promise<{ success: boolean; order?: LocalMarketOrder; pickupCode?: string; error?: string }>;
  getOrderByPickupCode: (
    accessToken: string,
    pickupCode: string
  ) => Promise<LocalMarketOrder | null>;
  cancelOrder: (
    userId: string,
    accessToken: string,
    orderId: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateOrderStatus: (
    accessToken: string,
    orderId: string,
    status: LocalMarketOrder['status'],
    producerNotes?: string
  ) => Promise<{ success: boolean; error?: string }>;
}

// Fonction pour générer un code de retrait côté client (backup si le trigger ne fonctionne pas)
function generatePickupCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store Zustand pour les commandes Marché Local
export const useLocalMarketOrders = create<LocalMarketOrdersStore>((set, get) => ({
  orders: [],
  loading: false,
  error: null,

  // Charger les commandes de l'utilisateur
  loadOrders: async (userId: string, accessToken: string) => {
    if (!userId || !accessToken) {
      console.log('[LocalMarketOrders] Missing userId or accessToken');
      set({ orders: [], loading: false });
      return;
    }

    set({ loading: true, error: null });

    try {
      // Construire l'URL avec les paramètres de requête
      const url = `${SUPABASE_URL}/rest/v1/local_market_orders?customer_id=eq.${userId}&order=created_at.desc&select=*`;

      console.log('[LocalMarketOrders] Fetching orders for user:', userId);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
          'Prefer': 'return=representation',
        },
      });

      const responseText = await response.text();
      console.log('[LocalMarketOrders] Response status:', response.status);

      if (!response.ok) {
        console.log('[LocalMarketOrders] Error loading orders - Status:', response.status);
        console.log('[LocalMarketOrders] Error response body:', responseText);

        // Gérer les erreurs spécifiques
        if (response.status === 401) {
          set({ orders: [], loading: false, error: 'Session expirée, veuillez vous reconnecter' });
        } else if (response.status === 404 || response.status === 400) {
          // Table n'existe peut-être pas encore ou erreur de requête - pas une erreur critique pour l'utilisateur
          console.log('[LocalMarketOrders] Table may not exist or bad request - treating as empty');
          set({ orders: [], loading: false, error: null });
        } else if (response.status === 403) {
          // Erreur RLS - l'utilisateur n'a pas les permissions
          console.log('[LocalMarketOrders] RLS policy denied access');
          set({ orders: [], loading: false, error: null });
        } else {
          set({ orders: [], loading: false, error: `Erreur ${response.status}` });
        }
        return;
      }

      // Parser la réponse JSON
      let data: LocalMarketOrder[] = [];
      try {
        data = responseText ? JSON.parse(responseText) : [];
      } catch (parseError) {
        console.log('[LocalMarketOrders] JSON parse error:', parseError);
        set({ orders: [], loading: false, error: 'Erreur de format des données' });
        return;
      }

      console.log('[LocalMarketOrders] Loaded', data.length, 'orders');
      set({ orders: data, loading: false, error: null });
    } catch (error) {
      console.log('[LocalMarketOrders] Network error:', error);
      set({ orders: [], loading: false, error: 'Erreur de connexion au serveur' });
    }
  },

  // Créer une nouvelle commande
  createOrder: async (userId, accessToken, params) => {
    if (!userId || !accessToken) {
      return { success: false, error: 'Utilisateur non connecté' };
    }

    try {
      const pickupCode = generatePickupCode();
      const totalAmount = params.quantity * params.unit_price;

      const orderData = {
        customer_id: userId,
        customer_name: params.customer_name,
        customer_email: params.customer_email,
        customer_phone: params.customer_phone || null,
        producer_id: params.producer_id,
        producer_name: params.producer_name,
        producer_email: params.producer_email,
        producer_phone: params.producer_phone || null,
        producer_location: params.producer_location || null,
        product_id: params.product_id,
        product_name: params.product_name,
        product_description: params.product_description || null,
        quantity: params.quantity,
        unit_price: params.unit_price,
        total_amount: totalAmount,
        status: 'pending',
        pickup_code: pickupCode,
        pickup_location: params.pickup_location || null,
        pickup_instructions: params.pickup_instructions || null,
        customer_notes: params.customer_notes || null,
      };

      console.log('[LocalMarketOrders] Creating order:', orderData);

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/local_market_orders`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            Prefer: 'return=representation',
          },
          body: JSON.stringify(orderData),
        }
      );

      const responseText = await response.text();
      console.log('[LocalMarketOrders] Create order response status:', response.status);
      console.log('[LocalMarketOrders] Create order response body:', responseText);

      if (!response.ok) {
        console.log('[LocalMarketOrders] Error creating order - Status:', response.status);

        // Parser l'erreur pour un message plus clair
        let errorMessage = 'Erreur lors de la création de la commande';
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
          console.log('[LocalMarketOrders] Parsed error:', errorData);
        } catch (e) {
          // Réponse non-JSON
        }

        return { success: false, error: errorMessage };
      }

      let createdOrder;
      try {
        const data = JSON.parse(responseText);
        createdOrder = Array.isArray(data) ? data[0] : data;
      } catch (parseError) {
        console.log('[LocalMarketOrders] Error parsing created order:', parseError);
        return { success: false, error: 'Erreur de format de réponse' };
      }
      console.log('[LocalMarketOrders] Order created:', createdOrder);

      // Mettre à jour la liste locale des commandes
      set((state) => ({
        orders: [createdOrder, ...state.orders],
      }));

      // Envoyer l'email au producteur
      try {
        await sendLocalMarketOrderEmail(accessToken, createdOrder, params);
      } catch (emailError) {
        console.log('[LocalMarketOrders] Email sending failed:', emailError);
        // Ne pas faire échouer la commande si l'email échoue
      }

      return {
        success: true,
        order: createdOrder,
        pickupCode: createdOrder.pickup_code || pickupCode,
      };
    } catch (error) {
      console.log('[LocalMarketOrders] Error creating order:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },

  // Récupérer une commande par code de retrait
  getOrderByPickupCode: async (accessToken, pickupCode) => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/local_market_orders?pickup_code=eq.${pickupCode}`,
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.log('[LocalMarketOrders] Error fetching by pickup code:', error);
      return null;
    }
  },

  // Annuler une commande
  cancelOrder: async (userId, accessToken, orderId) => {
    if (!userId || !accessToken) {
      return { success: false, error: 'Utilisateur non connecté' };
    }

    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/local_market_orders?id=eq.${orderId}&customer_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ status: 'cancelled' }),
        }
      );

      if (!response.ok) {
        return { success: false, error: 'Erreur lors de l\'annulation' };
      }

      // Mettre à jour la liste locale
      set((state) => ({
        orders: state.orders.map((order) =>
          order.id === orderId ? { ...order, status: 'cancelled' as const } : order
        ),
      }));

      return { success: true };
    } catch (error) {
      console.log('[LocalMarketOrders] Error cancelling order:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },

  // Charger les commandes pour un producteur
  loadOrdersForProducer: async (producerId: string, accessToken: string) => {
    if (!producerId) {
      console.log('[LocalMarketOrders] Missing producerId');
      return [];
    }

    try {
      // Utiliser getValidSession pour s'assurer d'avoir un token valide
      const session = await getValidSession();
      const validToken = session?.access_token || accessToken;

      if (!validToken) {
        console.log('[LocalMarketOrders] No valid access token');
        return [];
      }

      const url = `${SUPABASE_URL}/rest/v1/local_market_orders?producer_id=eq.${producerId}&order=created_at.desc&select=*`;
      console.log('[LocalMarketOrders] Fetching orders for producer:', producerId);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${validToken}`,
        },
      });

      const responseText = await response.text();
      console.log('[LocalMarketOrders] Producer orders response status:', response.status);
      console.log('[LocalMarketOrders] Producer orders response:', responseText);

      if (!response.ok) {
        console.log('[LocalMarketOrders] Error loading producer orders:', response.status, responseText);
        return [];
      }

      const data = responseText ? JSON.parse(responseText) : [];
      console.log('[LocalMarketOrders] Loaded', data.length, 'orders for producer');
      return data as LocalMarketOrder[];
    } catch (error) {
      console.log('[LocalMarketOrders] Error loading producer orders:', error);
      return [];
    }
  },

  // Mettre à jour le statut d'une commande (pour producteur)
  updateOrderStatus: async (accessToken: string, orderId: string, status: LocalMarketOrder['status'], producerNotes?: string) => {
    if (!accessToken || !orderId) {
      return { success: false, error: 'Paramètres manquants' };
    }

    try {
      const updateData: Record<string, unknown> = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (producerNotes !== undefined) {
        updateData.producer_notes = producerNotes;
      }

      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/local_market_orders?id=eq.${orderId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[LocalMarketOrders] Error updating order status:', response.status, errorText);
        return { success: false, error: 'Erreur lors de la mise à jour' };
      }

      console.log('[LocalMarketOrders] Order status updated to:', status);
      return { success: true };
    } catch (error) {
      console.log('[LocalMarketOrders] Error updating order status:', error);
      return { success: false, error: 'Erreur de connexion' };
    }
  },
}));

// Fonction pour envoyer l'email au producteur via Edge Function
async function sendLocalMarketOrderEmail(
  accessToken: string,
  order: LocalMarketOrder,
  params: CreateLocalOrderParams
): Promise<void> {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/send-local-market-order-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          orderId: order.id,
          producerEmail: params.producer_email,
          producerName: params.producer_name,
          customerName: params.customer_name,
          customerEmail: params.customer_email,
          customerPhone: params.customer_phone,
          productName: params.product_name,
          quantity: params.quantity,
          unitPrice: params.unit_price,
          totalAmount: order.total_amount,
          pickupCode: order.pickup_code,
          pickupLocation: params.pickup_location,
          pickupInstructions: params.pickup_instructions,
          customerNotes: params.customer_notes,
        }),
      }
    );

    if (!response.ok) {
      console.log('[LocalMarketOrders] Email function error:', response.status);
    }
  } catch (error) {
    console.log('[LocalMarketOrders] Email function error:', error);
  }
}

// Helper pour afficher le statut en français
export function getStatusLabel(status: LocalMarketOrder['status']): string {
  const labels: Record<LocalMarketOrder['status'], string> = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    ready: 'Prête',
    completed: 'Terminée',
    cancelled: 'Annulée',
  };
  return labels[status] || status;
}

// Helper pour obtenir la couleur du statut
export function getStatusColor(status: LocalMarketOrder['status']): string {
  const colors: Record<LocalMarketOrder['status'], string> = {
    pending: '#F59E0B',     // Jaune/Orange
    confirmed: '#3B82F6',   // Bleu
    ready: '#10B981',       // Vert
    completed: '#6B7280',   // Gris
    cancelled: '#EF4444',   // Rouge
  };
  return colors[status] || '#6B7280';
}
