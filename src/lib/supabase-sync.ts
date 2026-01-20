// Supabase sync client for producers and products
// This syncs admin-configured data to all users

import { Producer, ProducerProduct } from './producers';
import { getValidSession } from './supabase-auth';
import { fetchWithRetry, NetworkError, ERROR_MESSAGES } from './fetch-with-retry';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Configuration du retry pour les requêtes Supabase
const RETRY_CONFIG = {
  timeout: 10000, // 10 secondes
  maxRetries: 3,
  backoffMs: 1000,
};

const getHeaders = () => ({
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
});

// Headers authentifiés avec le token JWT de l'utilisateur pour les requêtes sécurisées (orders)
const getAuthenticatedHeaders = async () => {
  const session = await getValidSession();
  const token = session?.access_token || SUPABASE_ANON_KEY;
  console.log('[Orders] Auth status:', {
    hasToken: !!session?.access_token,
    usingAnon: !session?.access_token
  });
  return {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  };
};

// Helper pour les requêtes Supabase avec retry
async function supabaseFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetchWithRetry(url, {
    ...options,
    ...RETRY_CONFIG,
    onRetry: (attempt, error) => {
      console.log(`[Supabase] Tentative ${attempt}/3 après erreur:`, error.message);
    },
  });
}

// Helper pour les requêtes Supabase avec retry (retourne null en cas d'échec)
async function supabaseFetchOrNull(url: string, options: RequestInit = {}): Promise<Response | null> {
  try {
    return await supabaseFetch(url, options);
  } catch (error) {
    if (error instanceof NetworkError) {
      console.warn(`[Supabase] Échec après ${error.attempts} tentatives:`, error.message);
    } else {
      console.warn('[Supabase] Erreur inattendue:', String(error));
    }
    return null;
  }
}

export function isSupabaseSyncConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

// ==================== PRODUCERS ====================

export interface SupabaseProducer {
  id: string;
  name: string;
  email: string | null;
  region: string;
  department: string;
  city: string;
  image: string;
  description: string;
  latitude: number;
  longitude: number;
  map_position_x: number | null;
  map_position_y: number | null;
  soil_type: string;
  soil_ph: string;
  soil_characteristics: string;
  climate_type: string;
  climate_avg_temp: string;
  climate_rainfall: string;
  culture_outdoor: boolean | null;
  culture_greenhouse: boolean | null;
  culture_indoor: boolean | null;
  vente_directe_ferme?: boolean | null;
  adresse_retrait?: string | null;
  horaires_retrait?: string | null;
  instructions_retrait?: string | null;
  profile_id?: string | null;
  profile?: {
    company_name: string | null;
    business_name: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

// Convert Supabase producer to app Producer format
function supabaseToProducer(sp: SupabaseProducer, products: ProducerProduct[]): Producer {
  return {
    id: sp.id,
    name: sp.name,
    companyName: sp.profile?.company_name ?? undefined,
    businessName: sp.profile?.business_name ?? undefined,
    profileId: sp.profile_id ?? undefined, // Lien vers le profil utilisateur
    email: sp.email ?? undefined,
    region: sp.region,
    department: sp.department,
    city: sp.city,
    image: sp.image,
    description: sp.description,
    coordinates: {
      latitude: sp.latitude,
      longitude: sp.longitude,
    },
    mapPosition: sp.map_position_x !== null && sp.map_position_y !== null
      ? { x: sp.map_position_x, y: sp.map_position_y }
      : undefined,
    soil: {
      type: sp.soil_type,
      ph: sp.soil_ph,
      characteristics: sp.soil_characteristics,
    },
    climate: {
      type: sp.climate_type,
      avgTemp: sp.climate_avg_temp,
      rainfall: sp.climate_rainfall,
    },
    products,
    cultureOutdoor: sp.culture_outdoor ?? undefined,
    cultureGreenhouse: sp.culture_greenhouse ?? undefined,
    cultureIndoor: sp.culture_indoor ?? undefined,
  };
}

// Convert app Producer to Supabase format
function producerToSupabase(p: Producer): Omit<SupabaseProducer, 'created_at' | 'updated_at'> {
  return {
    id: p.id,
    name: p.name,
    email: p.email ?? null,
    region: p.region,
    department: p.department,
    city: p.city,
    image: p.image,
    description: p.description,
    latitude: p.coordinates.latitude,
    longitude: p.coordinates.longitude,
    map_position_x: p.mapPosition?.x ?? null,
    map_position_y: p.mapPosition?.y ?? null,
    soil_type: p.soil.type,
    soil_ph: p.soil.ph,
    soil_characteristics: p.soil.characteristics,
    climate_type: p.climate.type,
    climate_avg_temp: p.climate.avgTemp,
    climate_rainfall: p.climate.rainfall,
    culture_outdoor: p.cultureOutdoor ?? null,
    culture_greenhouse: p.cultureGreenhouse ?? null,
    culture_indoor: p.cultureIndoor ?? null,
    profile_id: p.profileId ?? p.id, // Use profileId if set, fallback to id
  };
}

// Fetch all producers from Supabase
export async function fetchProducers(): Promise<SupabaseProducer[]> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  // Joindre avec profiles pour récupérer company_name et business_name
  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/producers?select=*,profile:profiles(company_name,business_name)&order=name.asc`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur récupération producteurs: ${error}`);
  }

  const producers = await response.json();

  // Debug: log producer images and profile_id
  console.log('[Producers] Fetched producers:', producers.map((p: SupabaseProducer) => ({
    id: p.id,
    name: p.name,
    profile_id: p.profile_id || 'NULL',
    image: p.image ? 'SET' : 'NULL',
  })));

  return producers;
}

// Add producer to Supabase - WITH AUTHENTICATION
export async function addProducerToSupabase(producer: Producer): Promise<SupabaseProducer> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  try {
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/producers`, {
      method: 'POST',
      headers,
      body: JSON.stringify(producerToSupabase(producer)),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn('[Producers] Erreur ajout:', error);
      throw new Error(`Erreur ajout producteur: ${error}`);
    }

    const data = await response.json();
    console.log('[Producers] Producteur ajouté avec succès');
    return Array.isArray(data) ? data[0] : data;
  } catch (error) {
    console.warn('[Producers] Erreur:', error);
    throw error;
  }
}

// Update producer in Supabase - WITH AUTHENTICATION
export async function updateProducerInSupabase(id: string, producer: Partial<Producer>): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const updates: Record<string, unknown> = {};
  if (producer.name !== undefined) updates.name = producer.name;
  if (producer.email !== undefined) updates.email = producer.email;
  if (producer.region !== undefined) updates.region = producer.region;
  if (producer.department !== undefined) updates.department = producer.department;
  if (producer.city !== undefined) updates.city = producer.city;
  if (producer.image !== undefined) updates.image = producer.image;
  if (producer.description !== undefined) updates.description = producer.description;
  if (producer.coordinates !== undefined) {
    updates.latitude = producer.coordinates.latitude;
    updates.longitude = producer.coordinates.longitude;
  }
  if (producer.soil !== undefined) {
    updates.soil_type = producer.soil.type;
    updates.soil_ph = producer.soil.ph;
    updates.soil_characteristics = producer.soil.characteristics;
  }
  if (producer.climate !== undefined) {
    updates.climate_type = producer.climate.type;
    updates.climate_avg_temp = producer.climate.avgTemp;
    updates.climate_rainfall = producer.climate.rainfall;
  }
  // Culture types
  if (producer.cultureOutdoor !== undefined) updates.culture_outdoor = producer.cultureOutdoor;
  if (producer.cultureGreenhouse !== undefined) updates.culture_greenhouse = producer.cultureGreenhouse;
  if (producer.cultureIndoor !== undefined) updates.culture_indoor = producer.cultureIndoor;

  // Ensure profile_id is always set to link producer to user
  if (producer.profileId !== undefined) updates.profile_id = producer.profileId;

  updates.updated_at = new Date().toISOString();

  try {
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/producers?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn('[Producers] Erreur mise à jour:', error);
      throw new Error(`Erreur mise à jour producteur: ${error}`);
    }
    console.log('[Producers] Producteur mis à jour');
  } catch (error) {
    console.warn('[Producers] Erreur:', error);
    throw error;
  }
}

// Delete producer from Supabase - WITH AUTHENTICATION
export async function deleteProducerFromSupabase(id: string): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  try {
    const headers = await getAuthenticatedHeaders();

    // First delete all products of this producer
    await supabaseFetch(`${SUPABASE_URL}/rest/v1/products?producer_id=eq.${id}`, {
      method: 'DELETE',
      headers,
    });

    // Then delete the producer
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/producers?id=eq.${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn('[Producers] Erreur suppression:', error);
      throw new Error(`Erreur suppression producteur: ${error}`);
    }
    console.log('[Producers] Producteur supprimé');
  } catch (error) {
    console.warn('[Producers] Erreur:', error);
    throw error;
  }
}

// ==================== PRODUCTS ====================

export interface SupabaseProduct {
  id: string;
  producer_id: string;
  name: string;
  type: string;
  cbd_percent: number;
  thc_percent: number;
  price_public: number; // Prix public (client)
  price_pro: number | null; // Prix professionnel
  weight: string;
  image: string;
  images: string[] | null;
  description: string;
  tva_rate: number;
  stock: number | null;
  is_on_promo: boolean;
  promo_percent: number | null;
  visible_for_clients: boolean;
  visible_for_pros: boolean;
  status: 'draft' | 'published' | 'archived';
  lab_analysis_url: string | null;
  created_at: string;
  updated_at: string;
}

// Convert Supabase product to app ProducerProduct format
function supabaseToProduct(sp: SupabaseProduct): ProducerProduct {
  return {
    id: sp.id,
    name: sp.name,
    type: sp.type as ProducerProduct['type'],
    cbdPercent: sp.cbd_percent,
    thcPercent: sp.thc_percent,
    price: sp.price_public,
    pricePro: sp.price_pro ?? undefined,
    weight: sp.weight,
    image: sp.image,
    images: sp.images || undefined,
    description: sp.description,
    tvaRate: sp.tva_rate,
    stock: sp.stock ?? undefined,
    isOnPromo: sp.is_on_promo,
    promoPercent: sp.promo_percent ?? undefined,
    visibleForClients: sp.visible_for_clients,
    visibleForPros: sp.visible_for_pros,
    status: sp.status,
    labAnalysisUrl: sp.lab_analysis_url ?? undefined,
  };
}

// Convert app ProducerProduct to Supabase format
function productToSupabase(p: ProducerProduct, producerId: string): Omit<SupabaseProduct, 'created_at' | 'updated_at'> {
  return {
    id: p.id,
    producer_id: producerId,
    name: p.name,
    type: p.type,
    cbd_percent: p.cbdPercent,
    thc_percent: p.thcPercent,
    price_public: p.price,
    price_pro: p.pricePro ?? null,
    weight: p.weight,
    image: p.image,
    images: p.images || null,
    description: p.description,
    tva_rate: p.tvaRate ?? 20,
    stock: p.stock ?? null,
    is_on_promo: p.isOnPromo ?? false,
    promo_percent: p.promoPercent ?? null,
    visible_for_clients: p.visibleForClients ?? true,
    visible_for_pros: p.visibleForPros ?? true,
    status: p.status ?? 'published',
    lab_analysis_url: p.labAnalysisUrl ?? null,
  };
}

// Fetch all products from Supabase
export async function fetchProducts(): Promise<SupabaseProduct[]> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/products?select=*&order=name.asc`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur récupération produits: ${error}`);
  }

  return response.json();
}

// Add product to Supabase - WITH AUTHENTICATION
export async function addProductToSupabase(product: ProducerProduct, producerId: string): Promise<SupabaseProduct> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  try {
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/products`, {
      method: 'POST',
      headers,
      body: JSON.stringify(productToSupabase(product, producerId)),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn('[Products] Erreur ajout:', error);
      throw new Error(`Erreur ajout produit: ${error}`);
    }

    const data = await response.json();
    console.log('[Products] Produit ajouté');
    return Array.isArray(data) ? data[0] : data;
  } catch (error) {
    console.warn('[Products] Erreur:', error);
    throw error;
  }
}

// Update product in Supabase - WITH AUTHENTICATION
export async function updateProductInSupabase(id: string, product: Partial<ProducerProduct>): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const updates: Record<string, unknown> = {};
  if (product.name !== undefined) updates.name = product.name;
  if (product.type !== undefined) updates.type = product.type;
  if (product.cbdPercent !== undefined) updates.cbd_percent = product.cbdPercent;
  if (product.thcPercent !== undefined) updates.thc_percent = product.thcPercent;
  if (product.price !== undefined) updates.price_public = product.price;
  if (product.pricePro !== undefined) updates.price_pro = product.pricePro;
  if (product.weight !== undefined) updates.weight = product.weight;
  if (product.image !== undefined) updates.image = product.image;
  if (product.images !== undefined) updates.images = product.images;
  if (product.description !== undefined) updates.description = product.description;
  if (product.tvaRate !== undefined) updates.tva_rate = product.tvaRate;
  if (product.stock !== undefined) updates.stock = product.stock;
  if (product.isOnPromo !== undefined) updates.is_on_promo = product.isOnPromo;
  if (product.promoPercent !== undefined) updates.promo_percent = product.promoPercent;
  if (product.labAnalysisUrl !== undefined) updates.lab_analysis_url = product.labAnalysisUrl;
  updates.updated_at = new Date().toISOString();

  try {
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn('[Products] Erreur mise à jour:', error);
      throw new Error(`Erreur mise à jour produit: ${error}`);
    }
    console.log('[Products] Produit mis à jour');
  } catch (error) {
    console.warn('[Products] Erreur:', error);
    throw error;
  }
}

// Delete product from Supabase - WITH AUTHENTICATION
export async function deleteProductFromSupabase(id: string): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  try {
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn('[Products] Erreur suppression:', error);
      throw new Error(`Erreur suppression produit: ${error}`);
    }
    console.log('[Products] Produit supprimé');
  } catch (error) {
    console.warn('[Products] Erreur:', error);
    throw error;
  }
}

// ==================== FULL SYNC ====================

// Fetch all data and return as Producer array
export async function fetchAllProducersWithProducts(): Promise<Producer[]> {
  if (!isSupabaseSyncConfigured()) {
    return [];
  }

  try {
    const [supabaseProducers, supabaseProducts] = await Promise.all([
      fetchProducers(),
      fetchProducts(),
    ]);

    // Group products by producer_id
    const productsByProducer = new Map<string, ProducerProduct[]>();
    for (const sp of supabaseProducts) {
      const products = productsByProducer.get(sp.producer_id) || [];
      products.push(supabaseToProduct(sp));
      productsByProducer.set(sp.producer_id, products);
    }

    // Convert to Producer array
    return supabaseProducers.map((sp) =>
      supabaseToProducer(sp, productsByProducer.get(sp.id) || [])
    );
  } catch (error) {
    console.warn('Error fetching from Supabase:', error);
    return [];
  }
}

// Sync a producer and all its products to Supabase
export async function syncProducerToSupabase(producer: Producer): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  // Check if producer already exists
  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/producers?id=eq.${producer.id}&select=id`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const existing = await response.json();

  if (existing && existing.length > 0) {
    // Update existing producer
    await updateProducerInSupabase(producer.id, producer);
  } else {
    // Add new producer
    await addProducerToSupabase(producer);
  }

  // Sync products
  for (const product of producer.products) {
    await syncProductToSupabase(product, producer.id);
  }
}

// Sync a single product to Supabase
export async function syncProductToSupabase(product: ProducerProduct, producerId: string): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  // Check if product already exists
  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${product.id}&select=id`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const existing = await response.json();

  if (existing && existing.length > 0) {
    // Update existing product
    await updateProductInSupabase(product.id, product);
  } else {
    // Add new product
    await addProductToSupabase(product, producerId);
  }
}

// ==================== LOTS (TIRAGE) ====================

import { Lot, LotItem, Rarity } from './store';

export interface SupabaseLot {
  id: string;
  name: string;
  description: string;
  rarity: string;
  image: string;
  value: number;
  active: boolean;
  lot_type: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  min_order_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseLotItem {
  id: string;
  lot_id: string;
  product_id: string;
  producer_id: string;
  product_name: string;
  producer_name: string;
  quantity: number;
  created_at: string;
}

export interface SupabaseUserLot {
  id: string;
  user_id?: string;
  user_code: string;
  lot_id: string;
  lot_name: string;
  lot_description: string | null;
  lot_rarity: string | null;
  lot_image: string | null;
  lot_type: string;
  lot_value: number | null;
  discount_percent: number | null;
  discount_amount: number | null;
  min_order_amount: number | null;
  won_at: string;
  used: boolean;
  used_at: string | null;
  gifted_to: string | null;
  gifted_at: string | null;
  gift_code: string | null;
  created_at: string;
}

// Convert Supabase lot to app Lot format
function supabaseToLot(sl: SupabaseLot, items: LotItem[]): Lot {
  return {
    id: sl.id,
    name: sl.name,
    description: sl.description,
    rarity: sl.rarity as Rarity,
    image: sl.image,
    items,
    value: sl.value,
    active: sl.active,
    lotType: sl.lot_type as 'product' | 'discount' | undefined,
    discountPercent: sl.discount_percent ?? undefined,
    discountAmount: sl.discount_amount ?? undefined,
    minOrderAmount: sl.min_order_amount ?? undefined,
  };
}

// Convert app Lot to Supabase format
function lotToSupabase(lot: Lot): Omit<SupabaseLot, 'created_at' | 'updated_at'> {
  return {
    id: lot.id,
    name: lot.name,
    description: lot.description,
    rarity: lot.rarity,
    image: lot.image,
    value: lot.value,
    active: lot.active,
    lot_type: lot.lotType ?? null,
    discount_percent: lot.discountPercent ?? null,
    discount_amount: lot.discountAmount ?? null,
    min_order_amount: lot.minOrderAmount ?? null,
  };
}

// Convert LotItem to Supabase format
function lotItemToSupabase(item: LotItem, lotId: string): Omit<SupabaseLotItem, 'id' | 'created_at'> {
  return {
    lot_id: lotId,
    product_id: item.productId,
    producer_id: item.producerId,
    product_name: item.productName,
    producer_name: item.producerName,
    quantity: item.quantity,
  };
}

// Convert Supabase lot item to app format
function supabaseToLotItem(sli: SupabaseLotItem): LotItem {
  return {
    productId: sli.product_id,
    producerId: sli.producer_id,
    productName: sli.product_name,
    producerName: sli.producer_name,
    quantity: sli.quantity,
  };
}

// Fetch all lots from Supabase
export async function fetchLots(): Promise<SupabaseLot[]> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/lots?select=*&order=name.asc`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur récupération lots: ${error}`);
  }

  return response.json();
}

// Fetch lot items from Supabase
export async function fetchLotItems(): Promise<SupabaseLotItem[]> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/lot_items?select=*`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur récupération lot items: ${error}`);
  }

  return response.json();
}

// Add lot to Supabase
export async function addLotToSupabase(lot: Lot): Promise<SupabaseLot> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/lots`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(lotToSupabase(lot)),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur ajout lot: ${error}`);
  }

  const data = await response.json();
  const savedLot = Array.isArray(data) ? data[0] : data;

  // Add lot items
  for (const item of lot.items) {
    await addLotItemToSupabase(item, lot.id);
  }

  return savedLot;
}

// Add lot item to Supabase
export async function addLotItemToSupabase(item: LotItem, lotId: string): Promise<SupabaseLotItem> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/lot_items`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(lotItemToSupabase(item, lotId)),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur ajout lot item: ${error}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

// Update lot in Supabase
export async function updateLotInSupabase(id: string, lot: Partial<Lot>): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const updates: Record<string, unknown> = {};
  if (lot.name !== undefined) updates.name = lot.name;
  if (lot.description !== undefined) updates.description = lot.description;
  if (lot.rarity !== undefined) updates.rarity = lot.rarity;
  if (lot.image !== undefined) updates.image = lot.image;
  if (lot.value !== undefined) updates.value = lot.value;
  if (lot.active !== undefined) updates.active = lot.active;
  if (lot.lotType !== undefined) updates.lot_type = lot.lotType;
  if (lot.discountPercent !== undefined) updates.discount_percent = lot.discountPercent;
  if (lot.discountAmount !== undefined) updates.discount_amount = lot.discountAmount;
  if (lot.minOrderAmount !== undefined) updates.min_order_amount = lot.minOrderAmount;
  updates.updated_at = new Date().toISOString();

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/lots?id=eq.${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur mise à jour lot: ${error}`);
  }
}

// Delete lot from Supabase
export async function deleteLotFromSupabase(id: string): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  // First delete all lot items
  await supabaseFetch(`${SUPABASE_URL}/rest/v1/lot_items?lot_id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  // Then delete the lot
  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/lots?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur suppression lot: ${error}`);
  }
}

// Fetch all lots with their items
export async function fetchAllLotsWithItems(): Promise<Lot[]> {
  if (!isSupabaseSyncConfigured()) {
    return [];
  }

  try {
    const [supabaseLots, supabaseLotItems] = await Promise.all([
      fetchLots(),
      fetchLotItems(),
    ]);

    // Group items by lot_id
    const itemsByLot = new Map<string, LotItem[]>();
    for (const sli of supabaseLotItems) {
      const items = itemsByLot.get(sli.lot_id) || [];
      items.push(supabaseToLotItem(sli));
      itemsByLot.set(sli.lot_id, items);
    }

    // Convert to Lot array
    return supabaseLots.map((sl) =>
      supabaseToLot(sl, itemsByLot.get(sl.id) || [])
    );
  } catch (error) {
    console.warn('Error fetching lots from Supabase:', error);
    return [];
  }
}

// Sync a lot to Supabase
export async function syncLotToSupabase(lot: Lot): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  // Check if lot already exists
  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/lots?id=eq.${lot.id}&select=id`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const existing = await response.json();

  if (existing && existing.length > 0) {
    // Update existing lot
    await updateLotInSupabase(lot.id, lot);

    // Delete old items and re-add
    await supabaseFetch(`${SUPABASE_URL}/rest/v1/lot_items?lot_id=eq.${lot.id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    for (const item of lot.items) {
      await addLotItemToSupabase(item, lot.id);
    }
  } else {
    // Add new lot
    await addLotToSupabase(lot);
  }
}

// ==================== USER LOTS (LOTS GAGNÉS PAR UTILISATEUR) ====================

export interface UserWonLot {
  id: string;
  userCode: string;
  lotId: string;
  lotName: string;
  lotDescription: string | null;
  lotRarity: Rarity;
  lotImage: string | null;
  lotType: 'product' | 'discount';
  lotValue: number | null;
  discountPercent: number | null;
  discountAmount: number | null;
  minOrderAmount: number | null;
  wonAt: string;
  used: boolean;
  usedAt: string | null;
  giftedTo: string | null;
  giftedAt: string | null;
  giftCode: string | null;
}

// Convert Supabase user lot to app format
function supabaseToUserLot(sul: SupabaseUserLot): UserWonLot {
  return {
    id: sul.id,
    userCode: sul.user_code,
    lotId: sul.lot_id,
    lotName: sul.lot_name,
    lotDescription: sul.lot_description,
    lotRarity: sul.lot_rarity as Rarity,
    lotImage: sul.lot_image,
    lotType: sul.lot_type as 'product' | 'discount',
    lotValue: sul.lot_value,
    discountPercent: sul.discount_percent,
    discountAmount: sul.discount_amount,
    minOrderAmount: sul.min_order_amount,
    wonAt: sul.won_at,
    used: sul.used,
    usedAt: sul.used_at,
    giftedTo: sul.gifted_to,
    giftedAt: sul.gifted_at,
    giftCode: sul.gift_code,
  };
}

// Record a won lot for a user - NEW VERSION WITH user_id
export async function recordUserWonLot(
  userCode: string,
  lot: Lot,
  lotType: 'product' | 'discount'
): Promise<UserWonLot | null> {
  if (!isSupabaseSyncConfigured()) {
    console.log('[recordUserWonLot] Supabase not configured');
    return null;
  }

  const id = `user-lot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const giftCode = `GIFT-${generateGiftCode()}`;

  console.log('[recordUserWonLot] Recording lot');

  try {
    const session = await getValidSession();
    const userId = session?.user?.id;

    // Si l'utilisateur est authentifié, utiliser user_id et lier le code
    if (userId) {
      // Lier le user_code à l'user_id (si pas déjà fait)
      await linkUserCode(userCode);

      const headers = await getAuthenticatedHeaders();
      const data = {
        id,
        user_id: userId,
        user_code: userCode,
        lot_id: lot.id,
        lot_name: lot.name,
        lot_description: lot.description || null,
        lot_rarity: lot.rarity,
        lot_image: lot.image || null,
        lot_type: lotType,
        lot_value: lot.value,
        discount_percent: lot.discountPercent ?? null,
        discount_amount: lot.discountAmount ?? null,
        min_order_amount: lot.minOrderAmount ?? null,
        won_at: new Date().toISOString(),
        used: false,
        used_at: null,
        gifted_to: null,
        gifted_at: null,
        gift_code: giftCode,
      };

      const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_lots`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        console.warn('[recordUserWonLot] Error recording won lot:', error);
        return null;
      }

      const result = await response.json();
      console.log('[recordUserWonLot] Success! Lot recorded for authenticated user');
      return supabaseToUserLot(Array.isArray(result) ? result[0] : result);
    } else {
      // User non authentifié - garder l'ancienne approche avec user_code
      console.log('[recordUserWonLot] User not authenticated, using local code');

      const data = {
        id,
        user_code: userCode,
        lot_id: lot.id,
        lot_name: lot.name,
        lot_description: lot.description || null,
        lot_rarity: lot.rarity,
        lot_image: lot.image || null,
        lot_type: lotType,
        lot_value: lot.value,
        discount_percent: lot.discountPercent ?? null,
        discount_amount: lot.discountAmount ?? null,
        min_order_amount: lot.minOrderAmount ?? null,
        won_at: new Date().toISOString(),
        used: false,
        used_at: null,
        gifted_to: null,
        gifted_at: null,
        gift_code: giftCode,
      };

      const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_lots`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        console.warn('[recordUserWonLot] Error recording won lot:', error);
        return null;
      }

      const result = await response.json();
      console.log('[recordUserWonLot] Success! Lot recorded');
      return supabaseToUserLot(Array.isArray(result) ? result[0] : result);
    }
  } catch (error) {
    console.warn('[recordUserWonLot] Error:', error);
    return null;
  }
}

// Generate a unique gift code
function generateGiftCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Fetch user's won lots - WITH AUTHENTICATION
export async function fetchUserWonLots(userCode: string): Promise<UserWonLot[]> {
  if (!isSupabaseSyncConfigured()) {
    return [];
  }

  try {
    const session = await getValidSession();

    // Si authentifié, utiliser user_id + headers authentifiés
    if (session?.user?.id) {
      const headers = await getAuthenticatedHeaders();
      const response = await supabaseFetch(
        `${SUPABASE_URL}/rest/v1/user_lots?user_id=eq.${session.user.id}&order=won_at.desc`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        console.log('[fetchUserWonLots] Error fetching lots by user_id:', response.status);
        return [];
      }

      const data: SupabaseUserLot[] = await response.json();
      return data.map(supabaseToUserLot);
    } else {
      // Non authentifié - utiliser user_code avec headers publics
      const response = await supabaseFetch(
        `${SUPABASE_URL}/rest/v1/user_lots?user_code=eq.${userCode}&order=won_at.desc`,
        {
          method: 'GET',
          headers: getHeaders(),
        }
      );

      if (!response.ok) {
        return [];
      }

      const data: SupabaseUserLot[] = await response.json();
      return data.map(supabaseToUserLot);
    }
  } catch (error) {
    console.warn('Error fetching user lots:', error);
    return [];
  }
}

// Mark a lot as used - WITH AUTHENTICATION
export async function markUserLotAsUsed(lotId: string): Promise<boolean> {
  if (!isSupabaseSyncConfigured()) {
    return false;
  }

  try {
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_lots?id=eq.${lotId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        used: true,
        used_at: new Date().toISOString(),
      }),
    });

    return response.ok;
  } catch (error) {
    console.warn('Error marking lot as used:', error);
    return false;
  }
}

// Gift a lot to another user - WITH AUTHENTICATION
export async function giftLotToUser(lotId: string, recipientCode: string): Promise<boolean> {
  if (!isSupabaseSyncConfigured()) {
    return false;
  }

  try {
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_lots?id=eq.${lotId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        gifted_to: recipientCode,
        gifted_at: new Date().toISOString(),
      }),
    });

    return response.ok;
  } catch (error) {
    console.warn('Error gifting lot:', error);
    return false;
  }
}

// Claim validation result type
export interface ClaimGiftResult {
  success: boolean;
  lot: UserWonLot | null;
  error?: 'not_found' | 'already_used' | 'already_claimed' | 'own_code' | 'invalid_format' | 'network_error';
  errorMessage?: string;
}

// Claim a gifted lot using gift code
export async function claimGiftedLot(giftCode: string, recipientCode: string): Promise<UserWonLot | null> {
  const result = await claimGiftedLotWithDetails(giftCode, recipientCode);
  return result.lot;
}

// Claim a gifted lot with detailed error information
export async function claimGiftedLotWithDetails(giftCode: string, recipientCode: string): Promise<ClaimGiftResult> {
  if (!isSupabaseSyncConfigured()) {
    console.log('[claimGiftedLot] Supabase not configured');
    return { success: false, lot: null, error: 'network_error', errorMessage: 'Supabase non configuré' };
  }

  // Validate gift code format (should be GIFT-XXXXXXXX)
  const normalizedCode = giftCode.trim().toUpperCase();
  if (!normalizedCode.startsWith('GIFT-') || normalizedCode.length < 10) {
    console.log('[claimGiftedLot] Invalid code format:', normalizedCode);
    return {
      success: false,
      lot: null,
      error: 'invalid_format',
      errorMessage: 'Format de code invalide. Le code doit commencer par GIFT-'
    };
  }

  console.log('[claimGiftedLot] Searching for gift code:', normalizedCode, 'recipient:', recipientCode);

  try {
    // Find the lot with this gift code - search ALL lots with this code first
    const findResponse = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_lots?gift_code=eq.${normalizedCode}&select=*`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!findResponse.ok) {
      const errorText = await findResponse.text();
      console.log('[claimGiftedLot] Find request failed:', findResponse.status, errorText);
      return { success: false, lot: null, error: 'network_error', errorMessage: 'Erreur réseau lors de la recherche' };
    }

    const lots: SupabaseUserLot[] = await findResponse.json();
    console.log('[claimGiftedLot] Found lots with code:', lots.length, JSON.stringify(lots, null, 2));

    if (lots.length === 0) {
      console.log('[claimGiftedLot] Code introuvable:', normalizedCode);
      return {
        success: false,
        lot: null,
        error: 'not_found',
        errorMessage: 'Code introuvable. Vérifiez que le code est correct.'
      };
    }

    const lotToClaim = lots[0];
    console.log('[claimGiftedLot] Lot to claim:', lotToClaim.id, 'owner:', lotToClaim.user_code, 'gifted_to:', lotToClaim.gifted_to, 'used:', lotToClaim.used);

    // Check if the user is trying to claim their own code
    if (lotToClaim.user_code === recipientCode) {
      console.log('[claimGiftedLot] User trying to claim own code - user_code:', lotToClaim.user_code, 'recipient:', recipientCode);
      return {
        success: false,
        lot: null,
        error: 'own_code',
        errorMessage: 'Vous ne pouvez pas utiliser votre propre code cadeau.'
      };
    }

    // Check if already used
    if (lotToClaim.used) {
      console.log('[claimGiftedLot] Code already used');
      return {
        success: false,
        lot: null,
        error: 'already_used',
        errorMessage: 'Ce code a déjà été utilisé.'
      };
    }

    // Check if already claimed by someone else (but not by the current recipient)
    if (lotToClaim.gifted_to && lotToClaim.gifted_to !== recipientCode && lotToClaim.gifted_to !== lotToClaim.user_code) {
      console.log('[claimGiftedLot] Code already claimed by:', lotToClaim.gifted_to);
      return {
        success: false,
        lot: null,
        error: 'already_claimed',
        errorMessage: 'Ce code a déjà été réclamé par quelqu\'un d\'autre.'
      };
    }

    console.log('[claimGiftedLot] Updating lot ownership to:', recipientCode);

    // Update the lot to transfer ownership - use Prefer header to get the updated row back
    const updateResponse = await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_lots?id=eq.${lotToClaim.id}`, {
      method: 'PATCH',
      headers: {
        ...getHeaders(),
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_code: recipientCode,
        gifted_to: recipientCode,
        gifted_at: new Date().toISOString(),
      }),
    });

    const responseText = await updateResponse.text();
    console.log('[claimGiftedLot] Update response status:', updateResponse.status, 'body:', responseText);

    if (!updateResponse.ok) {
      console.log('[claimGiftedLot] Update failed:', updateResponse.status, responseText);
      return { success: false, lot: null, error: 'network_error', errorMessage: 'Erreur lors de la réclamation du cadeau' };
    }

    // Parse the response to verify the update worked
    let updatedLots: SupabaseUserLot[] = [];
    try {
      updatedLots = responseText ? JSON.parse(responseText) : [];
    } catch (parseError) {
      console.log('[claimGiftedLot] Could not parse response, verifying with fetch');
    }

    // Verify the update by fetching the lot again
    const verifyResponse = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_lots?id=eq.${lotToClaim.id}&select=*`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (verifyResponse.ok) {
      const verifiedLots: SupabaseUserLot[] = await verifyResponse.json();
      if (verifiedLots.length > 0) {
        const verifiedLot = verifiedLots[0];
        console.log('[claimGiftedLot] Verified lot after update:', verifiedLot.user_code, verifiedLot.gifted_to);

        // Check if the update actually happened
        if (verifiedLot.user_code !== recipientCode) {
          console.log('[claimGiftedLot] Update did NOT persist! Expected:', recipientCode, 'Got:', verifiedLot.user_code);
          return {
            success: false,
            lot: null,
            error: 'network_error',
            errorMessage: 'La mise à jour n\'a pas été enregistrée. Réessayez.'
          };
        }

        const claimedLot = supabaseToUserLot(verifiedLot);
        console.log('[claimGiftedLot] Successfully claimed and verified lot:', lotToClaim.id);
        return { success: true, lot: claimedLot };
      }
    }

    // Fallback: trust the PATCH response if verification failed
    console.log('[claimGiftedLot] Verification fetch failed, trusting PATCH response');
    const claimedLot = supabaseToUserLot({ ...lotToClaim, user_code: recipientCode, gifted_to: recipientCode });
    return { success: true, lot: claimedLot };

  } catch (error) {
    console.log('[claimGiftedLot] Exception:', error);
    return {
      success: false,
      lot: null,
      error: 'network_error',
      errorMessage: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
}

// Fetch lots gifted to a user (pending claim)
export async function fetchGiftedLotsForUser(userCode: string): Promise<UserWonLot[]> {
  if (!isSupabaseSyncConfigured()) {
    return [];
  }

  try {
    const response = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_lots?gifted_to=eq.${userCode}&order=gifted_at.desc`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      return [];
    }

    const data: SupabaseUserLot[] = await response.json();
    return data.map(supabaseToUserLot);
  } catch (error) {
    console.warn('Error fetching gifted lots:', error);
    return [];
  }
}

// Find a user's won lot by collection item ID and get its gift code
export async function getGiftCodeForCollectionItem(userCode: string, lotId: string): Promise<string | null> {
  if (!isSupabaseSyncConfigured()) {
    console.log('[getGiftCodeForCollectionItem] Supabase not configured');
    return null;
  }

  try {
    // Find the lot in user_lots that matches this lot_id for this user
    const response = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_lots?user_code=eq.${userCode}&lot_id=eq.${lotId}&used=eq.false&gifted_to=is.null&select=gift_code`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      console.log('[getGiftCodeForCollectionItem] Request failed');
      return null;
    }

    const data = await response.json();
    console.log('[getGiftCodeForCollectionItem] Found:', data);
    if (data && data.length > 0) {
      return data[0].gift_code;
    }
    return null;
  } catch (error) {
    console.warn('[getGiftCodeForCollectionItem] Error:', error);
    return null;
  }
}

// Mark a user lot as gifted (shared with someone)
export async function markLotAsGifted(userCode: string, lotId: string): Promise<boolean> {
  if (!isSupabaseSyncConfigured()) {
    return false;
  }

  try {
    // Find the lot first
    const findResponse = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_lots?user_code=eq.${userCode}&lot_id=eq.${lotId}&used=eq.false&gifted_to=is.null&select=id`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!findResponse.ok) {
      return false;
    }

    const lots = await findResponse.json();
    if (lots.length === 0) {
      return false;
    }

    // We don't actually need to update anything - the gift_code is already there
    // The lot will be claimed when someone uses the code
    return true;
  } catch (error) {
    console.warn('[markLotAsGifted] Error:', error);
    return false;
  }
}

// ==================== PACKS ====================

import { Pack, PackItem } from './store';

export interface SupabasePack {
  id: string;
  name: string;
  description: string;
  price: number;
  original_price: number;
  image: string;
  tag: string | null;
  color: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupabasePackItem {
  id: string;
  pack_id: string;
  name: string;
  quantity: string;
  value: number;
  images: string[] | null;
  producer_name: string | null;
  created_at: string;
}

// Convert Supabase pack to app Pack format
function supabaseToPack(sp: SupabasePack, items: PackItem[]): Pack {
  return {
    id: sp.id,
    name: sp.name,
    description: sp.description,
    price: sp.price,
    originalPrice: sp.original_price,
    image: sp.image,
    items,
    tag: sp.tag ?? undefined,
    color: sp.color,
    active: sp.active,
  };
}

// Convert app Pack to Supabase format
function packToSupabase(pack: Pack): Omit<SupabasePack, 'created_at' | 'updated_at'> {
  return {
    id: pack.id,
    name: pack.name,
    description: pack.description,
    price: pack.price,
    original_price: pack.originalPrice,
    image: pack.image,
    tag: pack.tag ?? null,
    color: pack.color,
    active: pack.active,
  };
}

// Convert PackItem to Supabase format
function packItemToSupabase(item: PackItem, packId: string): Omit<SupabasePackItem, 'id' | 'created_at'> {
  return {
    pack_id: packId,
    name: item.name,
    quantity: item.quantity,
    value: item.value,
    images: item.images ?? null,
    producer_name: item.producerName ?? null,
  };
}

// Convert Supabase pack item to app format
function supabaseToPackItem(spi: SupabasePackItem): PackItem {
  return {
    name: spi.name,
    quantity: spi.quantity,
    value: spi.value,
    images: spi.images ?? undefined,
    producerName: spi.producer_name ?? undefined,
  };
}

// Fetch all packs from Supabase
export async function fetchPacks(): Promise<SupabasePack[]> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/packs?select=*&order=name.asc`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur récupération packs: ${error}`);
  }

  return response.json();
}

// Fetch pack items from Supabase
export async function fetchPackItems(): Promise<SupabasePackItem[]> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/pack_items?select=*`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur récupération pack items: ${error}`);
  }

  return response.json();
}

// Fetch all packs with their items
export async function fetchAllPacksWithItems(): Promise<Pack[]> {
  if (!isSupabaseSyncConfigured()) {
    return [];
  }

  try {
    const [supabasePacks, supabasePackItems] = await Promise.all([
      fetchPacks(),
      fetchPackItems(),
    ]);

    // Group items by pack_id
    const itemsByPack = new Map<string, PackItem[]>();
    for (const spi of supabasePackItems) {
      const items = itemsByPack.get(spi.pack_id) || [];
      items.push(supabaseToPackItem(spi));
      itemsByPack.set(spi.pack_id, items);
    }

    // Convert to Pack array
    return supabasePacks.map((sp) =>
      supabaseToPack(sp, itemsByPack.get(sp.id) || [])
    );
  } catch (error) {
    console.warn('Error fetching packs from Supabase:', error);
    return [];
  }
}

// Add pack to Supabase
export async function addPackToSupabase(pack: Pack): Promise<SupabasePack> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/packs`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(packToSupabase(pack)),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur ajout pack: ${error}`);
  }

  const data = await response.json();
  const savedPack = Array.isArray(data) ? data[0] : data;

  // Add pack items
  for (const item of pack.items) {
    await addPackItemToSupabase(item, pack.id);
  }

  return savedPack;
}

// Add pack item to Supabase
export async function addPackItemToSupabase(item: PackItem, packId: string): Promise<SupabasePackItem> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/pack_items`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(packItemToSupabase(item, packId)),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur ajout pack item: ${error}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

// Update pack in Supabase
export async function updatePackInSupabase(id: string, pack: Partial<Pack>): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const updates: Record<string, unknown> = {};
  if (pack.name !== undefined) updates.name = pack.name;
  if (pack.description !== undefined) updates.description = pack.description;
  if (pack.price !== undefined) updates.price = pack.price;
  if (pack.originalPrice !== undefined) updates.original_price = pack.originalPrice;
  if (pack.image !== undefined) updates.image = pack.image;
  if (pack.tag !== undefined) updates.tag = pack.tag;
  if (pack.color !== undefined) updates.color = pack.color;
  if (pack.active !== undefined) updates.active = pack.active;
  updates.updated_at = new Date().toISOString();

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/packs?id=eq.${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur mise à jour pack: ${error}`);
  }
}

// Delete pack from Supabase
export async function deletePackFromSupabase(id: string): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  // First delete all pack items
  await supabaseFetch(`${SUPABASE_URL}/rest/v1/pack_items?pack_id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  // Then delete the pack
  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/packs?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur suppression pack: ${error}`);
  }
}

// Sync a pack to Supabase
export async function syncPackToSupabase(pack: Pack): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  // Check if pack already exists
  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/packs?id=eq.${pack.id}&select=id`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const existing = await response.json();

  if (existing && existing.length > 0) {
    // Update existing pack
    await updatePackInSupabase(pack.id, pack);

    // Delete old items and re-add
    await supabaseFetch(`${SUPABASE_URL}/rest/v1/pack_items?pack_id=eq.${pack.id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });

    for (const item of pack.items) {
      await addPackItemToSupabase(item, pack.id);
    }
  } else {
    // Add new pack
    await addPackToSupabase(pack);
  }
}

// ==================== PROMO PRODUCTS ====================

import { PromoProduct } from './store';

export interface SupabasePromoProduct {
  id: string;
  product_id: string;
  producer_id: string;
  product_name: string;
  producer_name: string;
  original_price: number;
  promo_price: number;
  discount_percent: number;
  image: string;
  valid_until: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Convert Supabase promo product to app PromoProduct format
function supabaseToPromoProduct(sp: SupabasePromoProduct): PromoProduct {
  return {
    id: sp.id,
    productId: sp.product_id,
    producerId: sp.producer_id,
    productName: sp.product_name,
    producerName: sp.producer_name,
    originalPrice: sp.original_price,
    promoPrice: sp.promo_price,
    discountPercent: sp.discount_percent,
    image: sp.image,
    validUntil: sp.valid_until,
    active: sp.active,
  };
}

// Convert app PromoProduct to Supabase format
function promoProductToSupabase(promo: PromoProduct): Omit<SupabasePromoProduct, 'created_at' | 'updated_at'> {
  return {
    id: promo.id,
    product_id: promo.productId,
    producer_id: promo.producerId,
    product_name: promo.productName,
    producer_name: promo.producerName,
    original_price: promo.originalPrice,
    promo_price: promo.promoPrice,
    discount_percent: promo.discountPercent,
    image: promo.image,
    valid_until: promo.validUntil,
    active: promo.active,
  };
}

// Fetch all promo products from Supabase
export async function fetchPromoProducts(): Promise<PromoProduct[]> {
  if (!isSupabaseSyncConfigured()) {
    return [];
  }

  try {
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/promo_products?select=*&order=product_name.asc`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erreur récupération promo products: ${error}`);
    }

    const data: SupabasePromoProduct[] = await response.json();
    return data.map(supabaseToPromoProduct);
  } catch (error) {
    console.warn('Error fetching promo products from Supabase:', error);
    return [];
  }
}

// Add promo product to Supabase
export async function addPromoProductToSupabase(promo: PromoProduct): Promise<SupabasePromoProduct> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/promo_products`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(promoProductToSupabase(promo)),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur ajout promo product: ${error}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

// Update promo product in Supabase
export async function updatePromoProductInSupabase(id: string, promo: Partial<PromoProduct>): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const updates: Record<string, unknown> = {};
  if (promo.productId !== undefined) updates.product_id = promo.productId;
  if (promo.producerId !== undefined) updates.producer_id = promo.producerId;
  if (promo.productName !== undefined) updates.product_name = promo.productName;
  if (promo.producerName !== undefined) updates.producer_name = promo.producerName;
  if (promo.originalPrice !== undefined) updates.original_price = promo.originalPrice;
  if (promo.promoPrice !== undefined) updates.promo_price = promo.promoPrice;
  if (promo.discountPercent !== undefined) updates.discount_percent = promo.discountPercent;
  if (promo.image !== undefined) updates.image = promo.image;
  if (promo.validUntil !== undefined) updates.valid_until = promo.validUntil;
  if (promo.active !== undefined) updates.active = promo.active;
  updates.updated_at = new Date().toISOString();

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/promo_products?id=eq.${id}`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur mise à jour promo product: ${error}`);
  }
}

// Delete promo product from Supabase
export async function deletePromoProductFromSupabase(id: string): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/promo_products?id=eq.${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur suppression promo product: ${error}`);
  }
}

// Sync a promo product to Supabase
export async function syncPromoProductToSupabase(promo: PromoProduct): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  // Check if promo product already exists
  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/promo_products?id=eq.${promo.id}&select=id`, {
    method: 'GET',
    headers: getHeaders(),
  });

  const existing = await response.json();

  if (existing && existing.length > 0) {
    // Update existing promo product
    await updatePromoProductInSupabase(promo.id, promo);
  } else {
    // Add new promo product
    await addPromoProductToSupabase(promo);
  }
}

// Sync all promo products to Supabase
export async function syncAllPromoProductsToSupabase(promoProducts: PromoProduct[]): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  for (const promo of promoProducts) {
    await syncPromoProductToSupabase(promo);
  }
}

// Sync all packs to Supabase
export async function syncAllPacksToSupabase(packs: Pack[]): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  for (const pack of packs) {
    await syncPackToSupabase(pack);
  }
}

// ==================== ORDERS ====================

export interface SupabaseOrderItem {
  product_id: string;
  product_name: string;
  product_type: string;
  producer_id: string;
  producer_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  tva_rate: number | null;
}

export interface SupabaseOrder {
  id: string;
  user_id?: string | null;
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  customer_city: string;
  customer_postal_code: string;
  items: SupabaseOrderItem[];
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: string;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Order type - PRO ou client classique
  is_pro_order: boolean;
  // Payment validation fields
  payment_validated: boolean;
  payment_validated_at: string | null;
  payment_validated_by: string | null;
  tickets_distributed: boolean;
  tickets_earned: number;
}

// Import types from store
import { Order, OrderItem, OrderStatus, CustomerInfo } from './store';

// Convert Supabase order to app Order format
function supabaseToOrder(so: SupabaseOrder): Order & { user_id?: string | null } {
  return {
    id: so.id,
    user_id: so.user_id, // DEBUG: copie user_id pour vérification RLS
    customerInfo: {
      firstName: so.customer_first_name,
      lastName: so.customer_last_name,
      email: so.customer_email,
      phone: so.customer_phone,
      address: so.customer_address,
      city: so.customer_city,
      postalCode: so.customer_postal_code,
    },
    items: so.items.map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      productType: item.product_type,
      producerId: item.producer_id,
      producerName: item.producer_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      tvaRate: item.tva_rate ?? undefined,
    })),
    subtotal: so.subtotal,
    shippingFee: so.shipping_fee,
    total: so.total,
    status: so.status as OrderStatus,
    trackingNumber: so.tracking_number ?? undefined,
    notes: so.notes ?? undefined,
    createdAt: new Date(so.created_at).getTime(),
    updatedAt: new Date(so.updated_at).getTime(),
    // Order type
    isProOrder: so.is_pro_order ?? false,
    // Payment validation fields
    paymentValidated: so.payment_validated ?? false,
    paymentValidatedAt: so.payment_validated_at ? new Date(so.payment_validated_at).getTime() : undefined,
    paymentValidatedBy: so.payment_validated_by ?? undefined,
    ticketsDistributed: so.tickets_distributed ?? false,
    ticketsEarned: so.tickets_earned ?? 0,
  };
}

// Convert app Order to Supabase format
function orderToSupabase(order: Order): Omit<SupabaseOrder, 'created_at' | 'updated_at'> {
  return {
    id: order.id,
    customer_first_name: order.customerInfo.firstName,
    customer_last_name: order.customerInfo.lastName,
    customer_email: order.customerInfo.email,
    customer_phone: order.customerInfo.phone,
    customer_address: order.customerInfo.address,
    customer_city: order.customerInfo.city,
    customer_postal_code: order.customerInfo.postalCode,
    items: order.items.map((item) => ({
      product_id: item.productId,
      product_name: item.productName,
      product_type: item.productType,
      producer_id: item.producerId,
      producer_name: item.producerName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      tva_rate: item.tvaRate ?? null,
    })),
    subtotal: order.subtotal,
    shipping_fee: order.shippingFee,
    total: order.total,
    status: order.status,
    tracking_number: order.trackingNumber ?? null,
    notes: order.notes ?? null,
    // Order type
    is_pro_order: order.isProOrder ?? false,
    // Payment validation fields
    payment_validated: order.paymentValidated ?? false,
    payment_validated_at: order.paymentValidatedAt ? new Date(order.paymentValidatedAt).toISOString() : null,
    payment_validated_by: order.paymentValidatedBy ?? null,
    tickets_distributed: order.ticketsDistributed ?? false,
    tickets_earned: order.ticketsEarned ?? 0,
  };
}

// Fetch all orders from Supabase (utilise RLS - clients voient leurs commandes, admins voient tout)
/**
 * Fetch orders - optionally filtered by producer_id for security
 * When producerId is provided, only returns orders containing products from that producer
 * IMPORTANT: Requires user authentication - returns empty array if not authenticated
 */
export async function fetchOrders(producerId?: string): Promise<Order[]> {
  if (!isSupabaseSyncConfigured()) {
    return [];
  }

  try {
    // Check authentication BEFORE making request
    const session = await getValidSession();
    if (!session?.access_token) {
      console.log('[fetchOrders] User not authenticated - skipping fetch');
      return [];
    }

    const headers = await getAuthenticatedHeaders();

    let url = `${SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc`;

    // If producerId is provided, filter orders that contain this producer's products
    // This is done server-side for security - producers only see relevant orders
    if (producerId) {
      // Filter orders where items array contains at least one item with this producer_id
      // Using Supabase's JSON containment operator
      // IMPORTANT: JSON keys in DB are snake_case (producer_id), not camelCase
      url += `&items=cs.[{"producer_id":"${producerId}"}]`;
    }

    const response = await supabaseFetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      // 403 = RLS policy denied access (user doesn't have permission or token expired)
      if (response.status === 403) {
        console.log('[fetchOrders] Access denied (403) - user may not have permission or session expired');
        return [];
      }
      // Erreur de table manquante (42P01) - la table n'existe pas dans Supabase
      if (errorText.includes('42P01') || errorText.includes('does not exist') || errorText.includes('relation')) {
        console.log('[fetchOrders] Table manquante dans Supabase - fonctionnalité non disponible');
        return [];
      }
      // 404 générique
      if (response.status === 404) {
        console.log('[fetchOrders] Ressource non trouvée (404)');
        return [];
      }
      console.log('[fetchOrders] Erreur ignorée:', response.status);
      return [];
    }

    const data: SupabaseOrder[] = await response.json();
    return data.map(supabaseToOrder);
  } catch (error) {
    console.warn('[fetchOrders] Error fetching orders:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

/**
 * Fetch orders for a specific producer - server-side filtered
 * Only returns orders containing products from the authenticated producer
 */
export async function fetchOrdersForProducer(producerId: string): Promise<Order[]> {
  if (!producerId) {
    console.warn('[fetchOrdersForProducer] Producer ID is required');
    return [];
  }
  return fetchOrders(producerId);
}

// Add order to Supabase (inclut user_id pour RLS)
export async function addOrderToSupabase(order: Order): Promise<SupabaseOrder | null> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const session = await getValidSession();
  const headers = await getAuthenticatedHeaders();
  const orderData = orderToSupabase(order);

  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...orderData,
      user_id: session?.user?.id || null,
      created_at: new Date(order.createdAt).toISOString(),
      updated_at: new Date(order.updatedAt).toISOString(),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Vérifier si c'est une erreur de permissions RLS (42501)
    if (errorText.includes('42501') || errorText.includes('permission denied')) {
      console.warn('[addOrderToSupabase] Erreur permissions RLS - La migration SQL doit être exécutée dans Supabase');
      console.warn('[addOrderToSupabase] Exécutez: database/migrations/fix_orders_rls_policies.sql');
      // Throw une erreur plus explicite
      throw new Error('Erreur de permissions Supabase. Exécutez la migration fix_orders_rls_policies.sql');
    }
    // Vérifier si c'est une erreur de table manquante (audit_log_entries, etc.)
    if (errorText.includes('42P01') || errorText.includes('does not exist')) {
      console.warn('[addOrderToSupabase] Table manquante dans Supabase:', errorText);
      // On considère que la commande est enregistrée localement et on ne bloque pas
      console.warn('[addOrderToSupabase] La commande sera conservée localement uniquement');
      return null;
    }
    throw new Error(`Erreur ajout commande: ${errorText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

// Update order in Supabase (utilise RLS - client ne peut modifier que ses commandes)
export async function updateOrderInSupabase(id: string, updates: Partial<Order>): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const supabaseUpdates: Record<string, unknown> = {};

  if (updates.customerInfo) {
    supabaseUpdates.customer_first_name = updates.customerInfo.firstName;
    supabaseUpdates.customer_last_name = updates.customerInfo.lastName;
    supabaseUpdates.customer_email = updates.customerInfo.email;
    supabaseUpdates.customer_phone = updates.customerInfo.phone;
    supabaseUpdates.customer_address = updates.customerInfo.address;
    supabaseUpdates.customer_city = updates.customerInfo.city;
    supabaseUpdates.customer_postal_code = updates.customerInfo.postalCode;
  }
  if (updates.items !== undefined) {
    supabaseUpdates.items = updates.items.map((item) => ({
      product_id: item.productId,
      product_name: item.productName,
      product_type: item.productType,
      producer_id: item.producerId,
      producer_name: item.producerName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      tva_rate: item.tvaRate ?? null,
    }));
  }
  if (updates.subtotal !== undefined) supabaseUpdates.subtotal = updates.subtotal;
  if (updates.shippingFee !== undefined) supabaseUpdates.shipping_fee = updates.shippingFee;
  if (updates.total !== undefined) supabaseUpdates.total = updates.total;
  if (updates.status !== undefined) supabaseUpdates.status = updates.status;
  if (updates.trackingNumber !== undefined) supabaseUpdates.tracking_number = updates.trackingNumber;
  if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;
  supabaseUpdates.updated_at = new Date().toISOString();

  const headers = await getAuthenticatedHeaders();
  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(supabaseUpdates),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur mise à jour commande: ${error}`);
  }
}

// Delete order from Supabase (utilise RLS - seuls les admins peuvent supprimer)
export async function deleteOrderFromSupabase(id: string): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  const headers = await getAuthenticatedHeaders();
  const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Erreur suppression commande: ${error}`);
  }
}

// Sync order to Supabase (add or update)
export async function syncOrderToSupabase(order: Order): Promise<void> {
  if (!isSupabaseSyncConfigured()) {
    throw new Error('Supabase non configuré');
  }

  try {
    // Check if order already exists
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${order.id}&select=id`, {
      method: 'GET',
      headers,
    });

    // Si la requête échoue avec une erreur de permission, on continue avec l'ajout
    if (!response.ok) {
      const errorText = await response.text();
      if (errorText.includes('42501') || errorText.includes('permission denied') || errorText.includes('42P01')) {
        console.warn('[syncOrderToSupabase] Erreur permissions RLS sur la vérification');
        // On essaie quand même d'ajouter la commande
        await addOrderToSupabase(order);
        return;
      }
      // Autre erreur - on tente quand même l'ajout
      console.warn('[syncOrderToSupabase] Erreur vérification:', errorText);
      await addOrderToSupabase(order);
      return;
    }

    const existing = await response.json();

    if (existing && existing.length > 0) {
      // Update existing order
      await updateOrderInSupabase(order.id, order);
    } else {
      // Add new order
      await addOrderToSupabase(order);
    }
  } catch (error) {
    // Propager l'erreur pour que le système de file d'attente puisse la gérer
    throw error;
  }
}

// ==================== PRODUCER CHAT ====================

export interface SupabaseChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  createdAt: number;
}

// Convert Supabase message to app format
function supabaseToChatMessage(msg: SupabaseChatMessage): ChatMessage {
  return {
    id: msg.id,
    senderId: msg.sender_id,
    senderName: msg.sender_name,
    senderAvatar: undefined,
    content: msg.message,
    createdAt: new Date(msg.created_at).getTime(),
  };
}

// Envoyer un message
export async function sendChatMessage(
  senderId: string,
  senderName: string,
  _senderAvatar: string | null,
  content: string
): Promise<ChatMessage | null> {
  if (!isSupabaseSyncConfigured()) {
    console.log('[Chat] Supabase non configuré');
    return null;
  }

  try {
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/chat_messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender_id: senderId,
        sender_name: senderName,
        producer_name: senderName, // Requis par la table
        message: content,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.warn('[Chat] Erreur envoi message:', error);
      return null;
    }

    const data = await response.json();
    if (data && data.length > 0) {
      return supabaseToChatMessage(data[0]);
    }
    return null;
  } catch (error) {
    console.warn('[Chat] Erreur envoi message:', error);
    return null;
  }
}

// Récupérer les messages (50 derniers)
export async function fetchChatMessages(limit: number = 50): Promise<ChatMessage[]> {
  if (!isSupabaseSyncConfigured()) {
    console.log('[Chat] Supabase non configuré');
    return [];
  }

  try {
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/chat_messages?order=created_at.desc&limit=${limit}`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.warn('[Chat] Erreur fetch messages:', error);
      return [];
    }

    const data: SupabaseChatMessage[] = await response.json();
    // Inverser pour avoir les plus anciens en premier
    return data.map(supabaseToChatMessage).reverse();
  } catch (error) {
    console.warn('[Chat] Erreur fetch messages:', error);
    return [];
  }
}

// ==================== WEBSOCKET CHAT AVEC RECONNEXION ====================

// WebSocket connection for realtime
let realtimeSocket: WebSocket | null = null;
let realtimeCallback: ((message: ChatMessage) => void) | null = null;
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

// Reconnection state
let reconnectAttempts = 0;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let isManuallyDisconnected = false;
const MAX_RECONNECT_ATTEMPTS = 10;
const INITIAL_RECONNECT_DELAY = 1000; // 1 seconde

// Connection state listeners
export type ChatConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';
type ConnectionStateListener = (status: ChatConnectionStatus, message?: string) => void;
const connectionStateListeners: Set<ConnectionStateListener> = new Set();

let currentConnectionStatus: ChatConnectionStatus = 'disconnected';

function setConnectionStatus(status: ChatConnectionStatus, message?: string) {
  currentConnectionStatus = status;
  connectionStateListeners.forEach((listener) => listener(status, message));
}

// Subscribe to connection state changes
export function onChatConnectionStateChange(listener: ConnectionStateListener): () => void {
  connectionStateListeners.add(listener);
  // Immediately notify of current state
  listener(currentConnectionStatus);
  return () => {
    connectionStateListeners.delete(listener);
  };
}

// Get current connection status
export function getChatConnectionStatus(): ChatConnectionStatus {
  return currentConnectionStatus;
}

// Message queue for offline messages
let pendingMessages: Array<{
  senderId: string;
  senderName: string;
  content: string;
  timestamp: number;
}> = [];

// Queue a message to send when reconnected
export function queueChatMessage(senderId: string, senderName: string, content: string): void {
  pendingMessages.push({
    senderId,
    senderName,
    content,
    timestamp: Date.now(),
  });
  console.log('[Chat] Message mis en file d\'attente:', content.substring(0, 30));
}

// Send all pending messages
async function sendPendingMessages(): Promise<void> {
  if (pendingMessages.length === 0) return;

  console.log(`[Chat] Envoi de ${pendingMessages.length} message(s) en attente...`);
  const messagesToSend = [...pendingMessages];
  pendingMessages = [];

  for (const msg of messagesToSend) {
    // Don't send messages older than 5 minutes
    if (Date.now() - msg.timestamp > 5 * 60 * 1000) {
      console.log('[Chat] Message trop ancien, ignoré');
      continue;
    }
    await sendChatMessage(msg.senderId, msg.senderName, null, msg.content);
  }
}

// Calculate reconnect delay with exponential backoff
function getReconnectDelay(): number {
  const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
  const jitter = Math.random() * 1000;
  return Math.min(delay + jitter, 30000); // Max 30 secondes
}

// Connect to WebSocket with reconnection logic
function connectWebSocket(): void {
  if (!isSupabaseSyncConfigured() || isManuallyDisconnected) {
    return;
  }

  // Fermer la connexion existante si elle existe
  if (realtimeSocket) {
    realtimeSocket.close();
    realtimeSocket = null;
  }

  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  setConnectionStatus(reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

  // Construire l'URL WebSocket
  const wsUrl = SUPABASE_URL.replace('https://', 'wss://').replace('http://', 'ws://');
  const realtimeUrl = `${wsUrl}/realtime/v1/websocket?apikey=${SUPABASE_ANON_KEY}&vsn=1.0.0`;

  try {
    realtimeSocket = new WebSocket(realtimeUrl);

    realtimeSocket.onopen = () => {
      console.log('[Chat] WebSocket connecté');
      reconnectAttempts = 0; // Reset on successful connection
      setConnectionStatus('connected', reconnectAttempts > 0 ? 'Chat reconnecté' : undefined);

      // Envoyer le message de connexion
      const joinMessage = {
        topic: 'realtime:public:chat_messages',
        event: 'phx_join',
        payload: {
          config: {
            broadcast: { self: false },
            presence: { key: '' },
            postgres_changes: [
              {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
              },
            ],
          },
        },
        ref: '1',
      };

      realtimeSocket?.send(JSON.stringify(joinMessage));

      // Heartbeat pour maintenir la connexion
      heartbeatInterval = setInterval(() => {
        if (realtimeSocket?.readyState === WebSocket.OPEN) {
          realtimeSocket.send(JSON.stringify({
            topic: 'phoenix',
            event: 'heartbeat',
            payload: {},
            ref: Date.now().toString(),
          }));
        }
      }, 30000);

      // Send any pending messages
      sendPendingMessages();
    };

    realtimeSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Gérer les messages INSERT (nouveaux messages)
        if (data.event === 'postgres_changes' && data.payload?.data?.record) {
          const record = data.payload.data.record as SupabaseChatMessage;
          const message = supabaseToChatMessage(record);
          console.log('[Chat] Nouveau message reçu:', message.senderName);
          realtimeCallback?.(message);
        }
      } catch (error) {
        // Ignorer les erreurs de parsing pour les messages système
      }
    };

    realtimeSocket.onerror = (error) => {
      console.warn('[Chat] WebSocket erreur:', error);
      setConnectionStatus('error', 'Erreur de connexion au chat');
    };

    realtimeSocket.onclose = (event) => {
      console.log('[Chat] WebSocket déconnecté, code:', event.code);

      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      // Don't reconnect if manually disconnected
      if (isManuallyDisconnected) {
        setConnectionStatus('disconnected');
        return;
      }

      // Try to reconnect
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = getReconnectDelay();
        console.log(`[Chat] Tentative de reconnexion dans ${Math.round(delay / 1000)}s (tentative ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

        setConnectionStatus('reconnecting', 'Connexion au chat perdue. Reconnexion en cours...');

        reconnectTimeout = setTimeout(() => {
          reconnectAttempts++;
          connectWebSocket();
        }, delay);
      } else {
        console.warn('[Chat] Nombre maximum de tentatives de reconnexion atteint');
        setConnectionStatus('error', 'Impossible de se reconnecter au chat. Réessayez plus tard.');
      }
    };
  } catch (error) {
    console.warn('[Chat] Erreur création WebSocket:', error);
    setConnectionStatus('error', 'Erreur de création de connexion');
  }
}

// S'abonner aux nouveaux messages en temps réel
export function subscribeToMessages(callback: (message: ChatMessage) => void): () => void {
  if (!isSupabaseSyncConfigured()) {
    console.log('[Chat] Supabase non configuré pour Realtime');
    return () => {};
  }

  // Stocker le callback
  realtimeCallback = callback;
  isManuallyDisconnected = false;
  reconnectAttempts = 0;

  // Connect
  connectWebSocket();

  // Retourner une fonction de cleanup
  return () => {
    console.log('[Chat] Fermeture subscription');
    isManuallyDisconnected = true;

    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }

    if (realtimeSocket) {
      realtimeSocket.close();
      realtimeSocket = null;
    }

    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }

    realtimeCallback = null;
    setConnectionStatus('disconnected');
  };
}

// Force reconnect (e.g., when app comes to foreground)
export function forceReconnectChat(): void {
  if (isManuallyDisconnected) return;

  console.log('[Chat] Force reconnect demandé');
  reconnectAttempts = 0;

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }

  connectWebSocket();
}

// Supprimer un message (admin uniquement)
export async function deleteChatMessage(messageId: string): Promise<boolean> {
  if (!isSupabaseSyncConfigured()) {
    console.log('[Chat] Supabase non configuré');
    return false;
  }

  try {
    const response = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/chat_messages?id=eq.${messageId}`,
      {
        method: 'DELETE',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.warn('[Chat] Erreur suppression message:', error);
      return false;
    }

    console.log('[Chat] Message supprimé:', messageId);
    return true;
  } catch (error) {
    console.warn('[Chat] Erreur suppression message:', error);
    return false;
  }
}

// Compter les producteurs en ligne (présence simulée basée sur l'activité récente)
export async function getOnlineProducersCount(): Promise<number> {
  if (!isSupabaseSyncConfigured()) {
    return 1;
  }

  try {
    // Compter les producteurs qui ont envoyé un message dans les 5 dernières minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const response = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/chat_messages?created_at=gte.${fiveMinutesAgo}&select=sender_id`,
      {
        method: 'GET',
        headers: getHeaders(),
      }
    );

    if (!response.ok) {
      return 1;
    }

    const data = await response.json();
    // Compter les sender_id uniques
    const uniqueSenders = new Set(data.map((m: { sender_id: string }) => m.sender_id));
    return Math.max(1, uniqueSenders.size);
  } catch (error) {
    console.warn('[Chat] Erreur count online:', error);
    return 1;
  }
}

// ==================== USER DATA SYNC ====================
// Synchronisation des données utilisateur (collection, tickets, parrainage)

// Types pour les données utilisateur Supabase
export interface SupabaseUserSubscription {
  id: string;
  user_id: string;
  subscription_tier: string;
  tickets: number;
  last_ticket_refresh: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseUserCollectionItem {
  id: string;
  user_id: string;
  product_id: string;
  product_name: string;
  product_rarity: string;
  product_value: number;
  product_image: string | null;
  lot_id: string | null;
  lot_type: string | null;
  discount_percent: number | null;
  discount_amount: number | null;
  min_order_amount: number | null;
  used: boolean;
  obtained_at: string;
  created_at: string;
}

export interface SupabaseUserReferral {
  id: string;
  user_id: string;
  referral_code: string;
  points: number;
  created_at: string;
  updated_at: string;
}

export interface SupabaseUserGift {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  gift_code: string;
  collection_item_id: string | null;
  product_id: string;
  product_name: string;
  product_rarity: string | null;
  claimed_at: string | null;
  used: boolean;
  created_at: string;
}

export interface SupabaseUserStats {
  id: string;
  user_id: string;
  total_spins: number;
  created_at: string;
  updated_at: string;
}

// ==================== SUBSCRIPTIONS ====================

export async function fetchUserSubscription(): Promise<SupabaseUserSubscription | null> {
  if (!isSupabaseSyncConfigured()) return null;

  try {
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_subscriptions?select=*`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.warn('[UserSync] Erreur fetch subscription:', error);
    return null;
  }
}

export async function upsertUserSubscription(
  tier: string,
  tickets: number,
  lastRefresh: string | null
): Promise<void> {
  if (!isSupabaseSyncConfigured()) return;

  try {
    const session = await getValidSession();
    if (!session?.user?.id) return;

    const headers = await getAuthenticatedHeaders();

    // Essayer d'abord une mise à jour
    const updateResponse = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_subscriptions?user_id=eq.${session.user.id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          subscription_tier: tier,
          tickets,
          last_ticket_refresh: lastRefresh,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    // Si aucune ligne mise à jour, insérer
    if (updateResponse.ok) {
      const result = await updateResponse.json();
      if (result.length === 0) {
        await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_subscriptions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            user_id: session.user.id,
            subscription_tier: tier,
            tickets,
            last_ticket_refresh: lastRefresh,
          }),
        });
      }
    }
  } catch (error) {
    console.warn('[UserSync] Erreur upsert subscription:', error);
  }
}

// ==================== COLLECTION ====================

export async function fetchUserCollection(): Promise<SupabaseUserCollectionItem[]> {
  if (!isSupabaseSyncConfigured()) return [];

  try {
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_collection?select=*&order=obtained_at.desc`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) return [];

    return await response.json();
  } catch (error) {
    console.warn('[UserSync] Erreur fetch collection:', error);
    return [];
  }
}

export async function addToUserCollection(item: {
  productId: string;
  productName: string;
  productRarity: string;
  productValue: number;
  productImage?: string;
  lotId?: string;
  lotType?: string;
  discountPercent?: number;
  discountAmount?: number;
  minOrderAmount?: number;
}): Promise<string | null> {
  if (!isSupabaseSyncConfigured()) return null;

  try {
    const session = await getValidSession();
    if (!session?.user?.id) return null;

    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_collection`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: session.user.id,
        product_id: item.productId,
        product_name: item.productName,
        product_rarity: item.productRarity,
        product_value: item.productValue,
        product_image: item.productImage || null,
        lot_id: item.lotId || null,
        lot_type: item.lotType || null,
        discount_percent: item.discountPercent || null,
        discount_amount: item.discountAmount || null,
        min_order_amount: item.minOrderAmount || null,
        used: false,
        obtained_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.warn('[UserSync] Erreur add collection:', await response.text());
      return null;
    }

    const result = await response.json();
    return result[0]?.id || null;
  } catch (error) {
    console.warn('[UserSync] Erreur add collection:', error);
    return null;
  }
}

export async function markCollectionItemUsed(itemId: string): Promise<void> {
  if (!isSupabaseSyncConfigured()) return;

  try {
    const headers = await getAuthenticatedHeaders();
    await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_collection?id=eq.${itemId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ used: true }),
    });
  } catch (error) {
    console.warn('[UserSync] Erreur mark used:', error);
  }
}

export async function deleteCollectionItem(itemId: string): Promise<void> {
  if (!isSupabaseSyncConfigured()) return;

  try {
    const headers = await getAuthenticatedHeaders();
    await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_collection?id=eq.${itemId}`, {
      method: 'DELETE',
      headers,
    });
  } catch (error) {
    console.warn('[UserSync] Erreur delete collection:', error);
  }
}

// ==================== REFERRALS ====================

export async function fetchUserReferral(): Promise<SupabaseUserReferral | null> {
  if (!isSupabaseSyncConfigured()) return null;

  try {
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_referrals?select=*`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.warn('[UserSync] Erreur fetch referral:', error);
    return null;
  }
}

export async function upsertUserReferral(code: string, points: number): Promise<void> {
  if (!isSupabaseSyncConfigured()) return;

  try {
    const session = await getValidSession();
    if (!session?.user?.id) return;

    const headers = await getAuthenticatedHeaders();

    // Essayer mise à jour
    const updateResponse = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_referrals?user_id=eq.${session.user.id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          points,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      if (result.length === 0) {
        await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_referrals`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            user_id: session.user.id,
            referral_code: code,
            points,
          }),
        });
      }
    }
  } catch (error) {
    console.warn('[UserSync] Erreur upsert referral:', error);
  }
}

export async function addReferralPoints(pointsToAdd: number): Promise<number> {
  if (!isSupabaseSyncConfigured()) return 0;

  try {
    const current = await fetchUserReferral();
    const newPoints = (current?.points || 0) + pointsToAdd;
    await upsertUserReferral(current?.referral_code || '', newPoints);
    return newPoints;
  } catch (error) {
    console.warn('[UserSync] Erreur add points:', error);
    return 0;
  }
}

// ==================== GIFTS ====================

export async function fetchUserGiftsSent(): Promise<SupabaseUserGift[]> {
  if (!isSupabaseSyncConfigured()) return [];

  try {
    const session = await getValidSession();
    if (!session?.user?.id) return [];

    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_gifts?sender_id=eq.${session.user.id}&select=*&order=created_at.desc`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.warn('[UserSync] Erreur fetch gifts sent:', error);
    return [];
  }
}

export async function fetchUserGiftsReceived(): Promise<SupabaseUserGift[]> {
  if (!isSupabaseSyncConfigured()) return [];

  try {
    const session = await getValidSession();
    if (!session?.user?.id) return [];

    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_gifts?recipient_id=eq.${session.user.id}&select=*&order=created_at.desc`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.warn('[UserSync] Erreur fetch gifts received:', error);
    return [];
  }
}

export async function createGift(gift: {
  giftCode: string;
  collectionItemId?: string;
  productId: string;
  productName: string;
  productRarity?: string;
}): Promise<string | null> {
  if (!isSupabaseSyncConfigured()) return null;

  try {
    const session = await getValidSession();
    if (!session?.user?.id) return null;

    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_gifts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        sender_id: session.user.id,
        gift_code: gift.giftCode,
        collection_item_id: gift.collectionItemId || null,
        product_id: gift.productId,
        product_name: gift.productName,
        product_rarity: gift.productRarity || null,
        used: false,
      }),
    });

    if (!response.ok) return null;

    const result = await response.json();
    return result[0]?.id || null;
  } catch (error) {
    console.warn('[UserSync] Erreur create gift:', error);
    return null;
  }
}

export async function claimGiftByCode(giftCode: string): Promise<SupabaseUserGift | null> {
  if (!isSupabaseSyncConfigured()) return null;

  try {
    const session = await getValidSession();
    if (!session?.user?.id) return null;

    const headers = await getAuthenticatedHeaders();

    // Chercher le cadeau non réclamé
    const searchResponse = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_gifts?gift_code=eq.${giftCode}&recipient_id=is.null&select=*`,
      {
        method: 'GET',
        headers: getHeaders(), // Utiliser headers publics pour chercher
      }
    );

    if (!searchResponse.ok) return null;

    const gifts = await searchResponse.json();
    if (gifts.length === 0) return null;

    const gift = gifts[0];

    // Réclamer le cadeau
    const claimResponse = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_gifts?id=eq.${gift.id}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          recipient_id: session.user.id,
          claimed_at: new Date().toISOString(),
        }),
      }
    );

    if (!claimResponse.ok) return null;

    return { ...gift, recipient_id: session.user.id, claimed_at: new Date().toISOString() };
  } catch (error) {
    console.warn('[UserSync] Erreur claim gift:', error);
    return null;
  }
}

// ==================== STATS ====================

export async function fetchUserStats(): Promise<SupabaseUserStats | null> {
  if (!isSupabaseSyncConfigured()) return null;

  try {
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_stats?select=*`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data[0] || null;
  } catch (error) {
    console.warn('[UserSync] Erreur fetch stats:', error);
    return null;
  }
}

export async function incrementUserSpins(): Promise<number> {
  if (!isSupabaseSyncConfigured()) return 0;

  try {
    const session = await getValidSession();
    if (!session?.user?.id) return 0;

    const current = await fetchUserStats();
    const newSpins = (current?.total_spins || 0) + 1;

    const headers = await getAuthenticatedHeaders();

    if (current) {
      await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_stats?user_id=eq.${session.user.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          total_spins: newSpins,
          updated_at: new Date().toISOString(),
        }),
      });
    } else {
      await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_stats`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          user_id: session.user.id,
          total_spins: newSpins,
        }),
      });
    }

    return newSpins;
  } catch (error) {
    console.warn('[UserSync] Erreur increment spins:', error);
    return 0;
  }
}

// ==================== SYNC ALL USER DATA ====================

export interface UserSyncData {
  subscription: SupabaseUserSubscription | null;
  collection: SupabaseUserCollectionItem[];
  referral: SupabaseUserReferral | null;
  giftsSent: SupabaseUserGift[];
  giftsReceived: SupabaseUserGift[];
  stats: SupabaseUserStats | null;
}

export async function fetchAllUserData(): Promise<UserSyncData> {
  const [subscription, collection, referral, giftsSent, giftsReceived, stats] = await Promise.all([
    fetchUserSubscription(),
    fetchUserCollection(),
    fetchUserReferral(),
    fetchUserGiftsSent(),
    fetchUserGiftsReceived(),
    fetchUserStats(),
  ]);

  return {
    subscription,
    collection,
    referral,
    giftsSent,
    giftsReceived,
    stats,
  };
}

// ==================== USER_CODE MAPPING ====================

/**
 * Lier un user_code local à l'user_id authentifié
 * Appelé quand un utilisateur se connecte
 */
export async function linkUserCode(userCode: string): Promise<boolean> {
  if (!isSupabaseSyncConfigured()) return false;

  try {
    const session = await getValidSession();
    if (!session?.user?.id) return false;

    const headers = await getAuthenticatedHeaders();

    // Essayer d'insérer le mapping
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_code_mapping`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_code: userCode,
        user_id: session.user.id,
      }),
    });

    if (!response.ok) {
      // Si le code est déjà mappé, c'est ok
      const text = await response.text();
      if (text.includes('duplicate')) {
        console.log('[UserSync] User code already mapped');
        return true;
      }
      console.warn('[UserSync] Erreur link code:', text);
      return false;
    }

    console.log('[UserSync] User code linked successfully');
    return true;
  } catch (error) {
    console.warn('[UserSync] Erreur link code:', error);
    return false;
  }
}

/**
 * Récupérer le user_code mappé pour l'utilisateur actuel
 */
export async function getUserCodeMapping(): Promise<string | null> {
  if (!isSupabaseSyncConfigured()) return null;

  try {
    const session = await getValidSession();
    if (!session?.user?.id) return null;

    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_code_mapping?user_id=eq.${session.user.id}&select=user_code`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    return data[0]?.user_code || null;
  } catch (error) {
    console.warn('[UserSync] Erreur get code mapping:', error);
    return null;
  }
}

// ==================== USER_LOTS ====================

/**
 * Récupérer tous les lots de l'utilisateur
 */
export async function fetchUserLots(): Promise<SupabaseUserLot[]> {
  if (!isSupabaseSyncConfigured()) return [];

  try {
    const session = await getValidSession();
    if (!session?.user?.id) return [];

    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_lots?user_id=eq.${session.user.id}&select=*&order=won_at.desc`,
      {
        method: 'GET',
        headers,
      }
    );

    if (!response.ok) return [];

    return await response.json();
  } catch (error) {
    console.warn('[UserSync] Erreur fetch user lots:', error);
    return [];
  }
}

/**
 * Ajouter un lot à l'utilisateur
 */
export async function addUserLot(lot: {
  lotId: string;
  lotName: string;
  lotDescription?: string;
  lotRarity?: string;
  lotImage?: string;
  lotValue?: number;
  lotType?: string;
  discountPercent?: number;
  discountAmount?: number;
  minOrderAmount?: number;
}): Promise<string | null> {
  if (!isSupabaseSyncConfigured()) return null;

  try {
    const session = await getValidSession();
    if (!session?.user?.id) return null;

    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_lots`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: session.user.id,
        lot_id: lot.lotId,
        lot_name: lot.lotName,
        lot_description: lot.lotDescription || null,
        lot_rarity: lot.lotRarity || null,
        lot_image: lot.lotImage || null,
        lot_value: lot.lotValue || 0,
        lot_type: lot.lotType || 'product',
        discount_percent: lot.discountPercent || null,
        discount_amount: lot.discountAmount || null,
        min_order_amount: lot.minOrderAmount || null,
        won_at: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      console.warn('[UserSync] Erreur add lot:', await response.text());
      return null;
    }

    const result = await response.json();
    return result[0]?.id || null;
  } catch (error) {
    console.warn('[UserSync] Erreur add lot:', error);
    return null;
  }
}

/**
 * Marquer un lot comme utilisé
 */
export async function markLotAsUsed(lotId: string): Promise<void> {
  if (!isSupabaseSyncConfigured()) return;

  try {
    const headers = await getAuthenticatedHeaders();
    await supabaseFetch(`${SUPABASE_URL}/rest/v1/user_lots?id=eq.${lotId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        used: true,
        used_at: new Date().toISOString(),
      }),
    });
  } catch (error) {
    console.warn('[UserSync] Erreur mark lot used:', error);
  }
}

/**
 * Migrer les lots depuis user_code local vers user_id
 * À appeler quand un utilisateur se connecte
 */
export async function migrateLotsForUser(userCode: string): Promise<number> {
  if (!isSupabaseSyncConfigured()) return 0;

  try {
    const session = await getValidSession();
    if (!session?.user?.id) return 0;

    // D'abord, lier le user_code
    await linkUserCode(userCode);

    // Ensuite, mettre à jour tous les lots avec ce user_code
    const headers = await getAuthenticatedHeaders();
    const response = await supabaseFetch(
      `${SUPABASE_URL}/rest/v1/user_lots?user_code=eq.${userCode}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          user_id: session.user.id,
        }),
      }
    );

    if (!response.ok) {
      console.warn('[UserSync] Erreur migrate lots:', await response.text());
      return 0;
    }

    const result = await response.json();
    console.log('[UserSync] Migrated lots:', result.length);
    return result.length;
  } catch (error) {
    console.warn('[UserSync] Erreur migrate lots:', error);
    return 0;
  }
}
