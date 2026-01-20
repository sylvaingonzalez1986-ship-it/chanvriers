import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CollectionItem, CBDProduct } from './types';
import { ProducerProduct, Producer, SAMPLE_PRODUCERS } from './producers';

// Sound settings store
interface SoundStore {
  isMuted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
}

export const useSoundStore = create<SoundStore>()(
  persist(
    (set, get) => ({
      isMuted: false,
      toggleMute: () => set({ isMuted: !get().isMuted }),
      setMuted: (muted: boolean) => set({ isMuted: muted }),
    }),
    {
      name: 'cbd-sound-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Subscription types
export type SubscriptionTier = 'none' | 'basic' | 'premium' | 'vip';

export const SUBSCRIPTION_CONFIG: Record<SubscriptionTier, {
  name: string;
  price: number;
  ticketsPerMonth: number;
  color: string;
}> = {
  none: {
    name: 'Aucun',
    price: 0,
    ticketsPerMonth: 0,
    color: '#6B7280',
  },
  basic: {
    name: 'Basic',
    price: 30,
    ticketsPerMonth: 1,
    color: '#3B82F6',
  },
  premium: {
    name: 'Premium',
    price: 60,
    ticketsPerMonth: 2,
    color: '#8B5CF6',
  },
  vip: {
    name: 'VIP',
    price: 90,
    ticketsPerMonth: 3,
    color: '#F59E0B',
  },
};

interface SubscriptionStore {
  subscription: SubscriptionTier;
  tickets: number;
  lastTicketRefresh: string | null; // ISO date string
  setSubscription: (tier: SubscriptionTier) => void;
  useTicket: () => boolean;
  addTickets: (amount: number) => void;
  refreshTickets: () => void;
  resetStore: () => void; // Reset pour changement d'utilisateur
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      subscription: 'none',
      tickets: 0,
      lastTicketRefresh: null,

      setSubscription: (tier: SubscriptionTier) => {
        const config = SUBSCRIPTION_CONFIG[tier];
        set({
          subscription: tier,
          tickets: config.ticketsPerMonth,
          lastTicketRefresh: new Date().toISOString(),
        });
      },

      useTicket: () => {
        const state = get();
        if (state.tickets <= 0) return false;
        set({ tickets: state.tickets - 1 });
        return true;
      },

      addTickets: (amount: number) =>
        set((state) => ({
          tickets: state.tickets + amount,
        })),

      refreshTickets: () => {
        const state = get();
        if (state.subscription === 'none') return;

        const now = new Date();
        const lastRefresh = state.lastTicketRefresh ? new Date(state.lastTicketRefresh) : null;

        // Check if a month has passed since last refresh
        if (!lastRefresh ||
            now.getMonth() !== lastRefresh.getMonth() ||
            now.getFullYear() !== lastRefresh.getFullYear()) {
          const config = SUBSCRIPTION_CONFIG[state.subscription];
          set({
            tickets: config.ticketsPerMonth,
            lastTicketRefresh: now.toISOString(),
          });
        }
      },

      resetStore: () => {
        set({
          subscription: 'none',
          tickets: 0,
          lastTicketRefresh: null,
        });
      },
    }),
    {
      name: 'cbd-subscription-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Cart item type
export interface CartItem {
  product: ProducerProduct;
  producerId: string;
  producerName: string;
  quantity: number;
  promoDiscount?: number; // Pourcentage de réduction promo (ex: 20 pour -20%)
}

interface CollectionStore {
  collection: CollectionItem[];
  totalSpins: number;
  addToCollection: (product: CBDProduct, lotInfo?: {
    lotId: string;
    lotType: 'product' | 'discount';
    discountPercent?: number;
    discountAmount?: number;
    minOrderAmount?: number;
  }) => void;
  useCollectionItem: (itemId: string) => void;
  getAvailableItems: () => CollectionItem[];
  getAvailableDiscounts: () => CollectionItem[];
  getAvailableProducts: () => CollectionItem[];
  incrementSpins: () => void;
  clearCollection: () => void;
  resetStore: () => void; // Reset pour changement d'utilisateur
}

interface CartStore {
  items: CartItem[];
  addToCart: (product: ProducerProduct, producerId: string, producerName: string, promoDiscount?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

interface ProducerStore {
  producers: Producer[];
  addProducer: (producer: Producer) => void;
  updateProducer: (id: string, producer: Partial<Producer>) => void;
  removeProducer: (id: string) => void;
  addProductToProducer: (producerId: string, product: ProducerProduct) => void;
  updateProductInProducer: (producerId: string, product: ProducerProduct) => void;
  removeProductFromProducer: (producerId: string, productId: string) => void;
  decrementProductStock: (producerId: string, productId: string, quantity: number) => boolean;
}

export const useCollectionStore = create<CollectionStore>()(
  persist(
    (set, get) => ({
      collection: [],
      totalSpins: 0,
      addToCollection: (product: CBDProduct, lotInfo?: {
        lotId: string;
        lotType: 'product' | 'discount';
        discountPercent?: number;
        discountAmount?: number;
        minOrderAmount?: number;
      }) => {
        console.log('[CollectionStore] addToCollection called with product:', product?.name, 'lotInfo:', lotInfo);
        console.log('[CollectionStore] Current collection size:', get().collection.length);

        const newItem = {
          id: `${product.id}-${Date.now()}`,
          product,
          obtainedAt: new Date(),
          used: false,
          lotId: lotInfo?.lotId,
          lotType: lotInfo?.lotType,
          discountPercent: lotInfo?.discountPercent,
          discountAmount: lotInfo?.discountAmount,
          minOrderAmount: lotInfo?.minOrderAmount,
        };

        console.log('[CollectionStore] Creating new item:', newItem.id);

        // Get the current collection before update
        const currentCollection = get().collection;
        const newCollection = [newItem, ...currentCollection];

        console.log('[CollectionStore] New collection size will be:', newCollection.length);

        // Update the store
        set({ collection: newCollection });

        // Verify persistence by reading back from AsyncStorage after a delay
        setTimeout(async () => {
          try {
            const stored = await AsyncStorage.getItem('cbd-collection-storage');
            if (stored) {
              const parsed = JSON.parse(stored);
              console.log('[CollectionStore] AsyncStorage content after set:', JSON.stringify(parsed).substring(0, 200));
              console.log('[CollectionStore] AsyncStorage collection size:', parsed?.state?.collection?.length ?? 'undefined');
            } else {
              console.log('[CollectionStore] AsyncStorage is empty after set!');
            }
          } catch (err) {
            console.error('[CollectionStore] Failed to read AsyncStorage:', err);
          }
        }, 300);

        // Verify the item was added
        setTimeout(() => {
          const currentCollectionAfterSet = get().collection;
          console.log('[CollectionStore] After set, collection size:', currentCollectionAfterSet.length);
          console.log('[CollectionStore] First item in collection:', currentCollectionAfterSet[0]?.id);
        }, 100);
      },
      useCollectionItem: (itemId: string) =>
        set((state) => ({
          collection: state.collection.filter((item) => item.id !== itemId),
        })),
      getAvailableItems: () => {
        return get().collection.filter((item) => !item.used);
      },
      getAvailableDiscounts: () => {
        return get().collection.filter((item) => !item.used && item.lotType === 'discount');
      },
      getAvailableProducts: () => {
        return get().collection.filter((item) => !item.used && item.lotType !== 'discount');
      },
      incrementSpins: () =>
        set((state) => ({
          totalSpins: state.totalSpins + 1,
        })),
      clearCollection: () =>
        set({
          collection: [],
          totalSpins: 0,
        }),
      resetStore: () =>
        set({
          collection: [],
          totalSpins: 0,
        }),
    }),
    {
      name: 'cbd-collection-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        console.log('[CollectionStore] Rehydrated from AsyncStorage, collection size:', state?.collection?.length ?? 0);
      },
    }
  )
);

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      addToCart: (product: ProducerProduct, producerId: string, producerName: string, promoDiscount?: number) =>
        set((state) => {
          // Pour les produits promo, on crée une entrée séparée avec un ID unique
          const itemKey = promoDiscount ? `${product.id}-promo-${promoDiscount}` : product.id;
          const existingItem = state.items.find((item) => {
            const existingKey = item.promoDiscount ? `${item.product.id}-promo-${item.promoDiscount}` : item.product.id;
            return existingKey === itemKey;
          });

          if (existingItem) {
            return {
              items: state.items.map((item) => {
                const existingKey = item.promoDiscount ? `${item.product.id}-promo-${item.promoDiscount}` : item.product.id;
                return existingKey === itemKey
                  ? { ...item, quantity: item.quantity + 1 }
                  : item;
              }),
            };
          }
          return {
            items: [...state.items, { product, producerId, producerName, quantity: 1, promoDiscount }],
          };
        }),
      removeFromCart: (productId: string) =>
        set((state) => ({
          items: state.items.filter((item) => item.product.id !== productId),
        })),
      updateQuantity: (productId: string, quantity: number) =>
        set((state) => ({
          items: quantity <= 0
            ? state.items.filter((item) => item.product.id !== productId)
            : state.items.map((item) =>
                item.product.id === productId ? { ...item, quantity } : item
              ),
        })),
      clearCart: () => set({ items: [] }),
      getTotal: () => {
        const state = get();
        return state.items.reduce((sum, item) => {
          const price = item.promoDiscount
            ? item.product.price * (1 - item.promoDiscount / 100)
            : item.product.price;
          return sum + price * item.quantity;
        }, 0);
      },
      getItemCount: () => {
        const state = get();
        return state.items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'cbd-cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export const useProducerStore = create<ProducerStore>()(
  persist(
    (set) => ({
      producers: [],
      addProducer: (producer: Producer) =>
        set((state) => ({
          producers: [...state.producers, producer],
        })),
      updateProducer: (id: string, updates: Partial<Producer>) =>
        set((state) => ({
          producers: state.producers.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      removeProducer: (id: string) =>
        set((state) => ({
          producers: state.producers.filter((p) => p.id !== id),
        })),
      addProductToProducer: (producerId: string, product: ProducerProduct) =>
        set((state) => {
          // Check if producer exists in custom producers
          const existingProducer = state.producers.find((p) => p.id === producerId);
          if (existingProducer) {
            // Add to existing custom producer
            return {
              producers: state.producers.map((p) =>
                p.id === producerId
                  ? { ...p, products: [...p.products, product] }
                  : p
              ),
            };
          }

          // Check if it's a sample producer - if so, clone it to custom producers
          const sampleProducer = SAMPLE_PRODUCERS.find((p) => p.id === producerId);
          if (sampleProducer) {
            const clonedProducer = {
              ...sampleProducer,
              products: [...sampleProducer.products, product],
            };
            return {
              producers: [...state.producers, clonedProducer],
            };
          }

          return state;
        }),
      updateProductInProducer: (producerId: string, product: ProducerProduct) =>
        set((state) => {
          // Check if producer exists in custom producers
          const existingProducer = state.producers.find((p) => p.id === producerId);

          if (existingProducer) {
            // Check if product exists in this custom producer
            const productExistsInCustom = existingProducer.products.some((p) => p.id === product.id);

            if (productExistsInCustom) {
              // Update existing product in custom producer
              return {
                producers: state.producers.map((p) =>
                  p.id === producerId
                    ? { ...p, products: p.products.map((prod) => prod.id === product.id ? product : prod) }
                    : p
                ),
              };
            }

            // Product doesn't exist in custom producer - check if it's a sample product
            const sampleProducer = SAMPLE_PRODUCERS.find((sp) => sp.id === producerId);
            const isSampleProduct = sampleProducer?.products.some((sp) => sp.id === product.id);

            if (isSampleProduct && sampleProducer) {
              // Need to merge sample products into custom producer
              // Start with all sample products (updating the modified one)
              const sampleProductsUpdated = sampleProducer.products.map((sp) =>
                sp.id === product.id ? product : sp
              );

              // Get custom-only products (products added by user, not in sample)
              const customOnlyProducts = existingProducer.products.filter(
                (cp) => !sampleProducer.products.some((sp) => sp.id === cp.id)
              );

              // Combine: sample products + custom-only products
              return {
                producers: state.producers.map((p) =>
                  p.id === producerId
                    ? { ...p, products: [...sampleProductsUpdated, ...customOnlyProducts] }
                    : p
                ),
              };
            }

            // Not a sample product, just add it
            return {
              producers: state.producers.map((p) =>
                p.id === producerId
                  ? { ...p, products: [...p.products, product] }
                  : p
              ),
            };
          }

          // Producer doesn't exist in custom - check if it's a sample producer
          const sampleProducer = SAMPLE_PRODUCERS.find((p) => p.id === producerId);
          if (sampleProducer) {
            // Clone the sample producer with ALL products, but update the modified one
            const clonedProducer: Producer = {
              ...sampleProducer,
              products: sampleProducer.products.map((prod) =>
                prod.id === product.id ? product : prod
              ),
            };
            return {
              producers: [...state.producers, clonedProducer],
            };
          }

          return state;
        }),
      removeProductFromProducer: (producerId: string, productId: string) =>
        set((state) => ({
          producers: state.producers.map((p) =>
            p.id === producerId
              ? { ...p, products: p.products.filter((prod) => prod.id !== productId) }
              : p
          ),
        })),
      decrementProductStock: (producerId: string, productId: string, quantity: number) => {
        let success = false;
        set((state) => {
          const producer = state.producers.find((p) => p.id === producerId);
          if (!producer) return state;

          const product = producer.products.find((p) => p.id === productId);
          if (!product || product.stock === undefined) return state;
          if (product.stock < quantity) return state;

          success = true;
          return {
            producers: state.producers.map((p) =>
              p.id === producerId
                ? {
                    ...p,
                    products: p.products.map((prod) =>
                      prod.id === productId
                        ? { ...prod, stock: (prod.stock ?? 0) - quantity }
                        : prod
                    ),
                  }
                : p
            ),
          };
        });
        return success;
      },
    }),
    {
      name: 'cbd-producers-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Default options
const DEFAULT_REGIONS = [
  'Auvergne-Rhône-Alpes',
  'Bourgogne-Franche-Comté',
  'Bretagne',
  'Centre-Val de Loire',
  'Corse',
  'Grand Est',
  'Hauts-de-France',
  'Île-de-France',
  'Normandie',
  'Nouvelle-Aquitaine',
  'Occitanie',
  'Pays de la Loire',
  'Provence-Alpes-Côte d\'Azur',
];

const DEFAULT_SOIL_TYPES = [
  'Sol sableux (>70% sable)',
  'Sol sablo-limoneux (40-60% sable, 20-40% limon)',
  'Sol sablo-argileux (40-60% sable, 20-40% argile)',
  'Sol limoneux (>40% limon)',
  'Limon sableux (équilibré sable/limon)',
  'Limon argileux (>40% limon + argile)',
  'Sol argilo-limoneux (30-50% limon, 20-40% argile)',
  'Sol argileux (>40% argile)',
  'Argile limono-sableuse (26% sable, 35% limon, 39% argile)',
  'Sol équilibré/franc (30-40% sable, 30-40% limon, 20-30% argile)',
];

const DEFAULT_CLIMATE_TYPES = [
  'Océanique',
  'Océanique dégradé',
  'Semi-continental',
  'Continental',
  'Méditerranéen',
  'Montagnard',
  'Montagnard tempéré',
];

const DEFAULT_PRODUCT_TYPES = [
  { id: 'fleur', label: 'Fleur', color: '#7d8c5c' },
  { id: 'huile', label: 'Huile', color: '#f1cf6e' },
  { id: 'resine', label: 'Résine', color: '#8b6914' },
  { id: 'infusion', label: 'Infusion', color: '#5a7247' },
];

// Soil type with detailed composition (based on texture triangle)
export interface SoilTypeOption {
  id: string;
  name: string;
  description: string;
  sable: number; // % sand
  limon: number; // % silt
  argile: number; // % clay
}

const DEFAULT_SOIL_TYPE_OPTIONS: SoilTypeOption[] = [
  {
    id: 'sol-sableux',
    name: 'Sol sableux',
    description: 'Sol très drainant, faible rétention d\'eau',
    sable: 75,
    limon: 15,
    argile: 10,
  },
  {
    id: 'sol-sablo-limoneux',
    name: 'Sol sablo-limoneux',
    description: 'Bon drainage avec rétention d\'eau modérée',
    sable: 50,
    limon: 35,
    argile: 15,
  },
  {
    id: 'sol-sablo-argileux',
    name: 'Sol sablo-argileux',
    description: 'Texture grossière avec bonne structure',
    sable: 50,
    limon: 15,
    argile: 35,
  },
  {
    id: 'sol-limoneux',
    name: 'Sol limoneux',
    description: 'Sol fertile, bonne rétention d\'eau et nutriments',
    sable: 25,
    limon: 55,
    argile: 20,
  },
  {
    id: 'limon-sableux',
    name: 'Limon sableux',
    description: 'Équilibre entre drainage et rétention',
    sable: 40,
    limon: 45,
    argile: 15,
  },
  {
    id: 'limon-argileux',
    name: 'Limon argileux',
    description: 'Sol riche, bonne capacité de rétention',
    sable: 15,
    limon: 50,
    argile: 35,
  },
  {
    id: 'sol-argilo-limoneux',
    name: 'Sol argilo-limoneux',
    description: 'Sol lourd mais fertile',
    sable: 25,
    limon: 40,
    argile: 35,
  },
  {
    id: 'sol-argileux',
    name: 'Sol argileux',
    description: 'Sol lourd, excellente rétention d\'eau et nutriments',
    sable: 15,
    limon: 30,
    argile: 55,
  },
  {
    id: 'argile-limono-sableuse',
    name: 'Argile limono-sableuse',
    description: 'Sol équilibré à tendance argileuse',
    sable: 26,
    limon: 35,
    argile: 39,
  },
  {
    id: 'sol-equilibre',
    name: 'Sol équilibré (franc)',
    description: 'Sol idéal pour la plupart des cultures',
    sable: 35,
    limon: 35,
    argile: 30,
  },
];

export interface ProductTypeOption {
  id: string;
  label: string;
  color: string;
}

interface OptionsStore {
  regions: string[];
  soilTypes: string[];
  soilTypeOptions: SoilTypeOption[]; // New: detailed soil types with composition
  climateTypes: string[];
  productTypes: ProductTypeOption[];
  // Regions
  addRegion: (region: string) => void;
  removeRegion: (region: string) => void;
  updateRegion: (oldRegion: string, newRegion: string) => void;
  // Soil types (legacy string-based)
  addSoilType: (soilType: string) => void;
  removeSoilType: (soilType: string) => void;
  updateSoilType: (oldType: string, newType: string) => void;
  // Soil type options (new: with composition)
  addSoilTypeOption: (soilType: SoilTypeOption) => void;
  removeSoilTypeOption: (id: string) => void;
  updateSoilTypeOption: (id: string, updates: Partial<SoilTypeOption>) => void;
  resetSoilTypeOptions: () => void;
  // Climate types
  addClimateType: (climateType: string) => void;
  removeClimateType: (climateType: string) => void;
  updateClimateType: (oldType: string, newType: string) => void;
  // Product types
  addProductType: (productType: ProductTypeOption) => void;
  removeProductType: (id: string) => void;
  updateProductType: (id: string, updates: Partial<ProductTypeOption>) => void;
  // Reset
  resetToDefaults: () => void;
}

export const useOptionsStore = create<OptionsStore>()(
  persist(
    (set) => ({
      regions: DEFAULT_REGIONS,
      soilTypes: DEFAULT_SOIL_TYPES,
      soilTypeOptions: DEFAULT_SOIL_TYPE_OPTIONS,
      climateTypes: DEFAULT_CLIMATE_TYPES,
      productTypes: DEFAULT_PRODUCT_TYPES,

      // Regions
      addRegion: (region: string) =>
        set((state) => ({
          regions: [...state.regions, region].sort(),
        })),
      removeRegion: (region: string) =>
        set((state) => ({
          regions: state.regions.filter((r) => r !== region),
        })),
      updateRegion: (oldRegion: string, newRegion: string) =>
        set((state) => ({
          regions: state.regions.map((r) => (r === oldRegion ? newRegion : r)).sort(),
        })),

      // Soil types (legacy)
      addSoilType: (soilType: string) =>
        set((state) => ({
          soilTypes: [...state.soilTypes, soilType].sort(),
        })),
      removeSoilType: (soilType: string) =>
        set((state) => ({
          soilTypes: state.soilTypes.filter((s) => s !== soilType),
        })),
      updateSoilType: (oldType: string, newType: string) =>
        set((state) => ({
          soilTypes: state.soilTypes.map((s) => (s === oldType ? newType : s)).sort(),
        })),

      // Soil type options (with composition)
      addSoilTypeOption: (soilType: SoilTypeOption) =>
        set((state) => ({
          soilTypeOptions: [...state.soilTypeOptions, soilType],
        })),
      removeSoilTypeOption: (id: string) =>
        set((state) => ({
          soilTypeOptions: state.soilTypeOptions.filter((s) => s.id !== id),
        })),
      updateSoilTypeOption: (id: string, updates: Partial<SoilTypeOption>) =>
        set((state) => ({
          soilTypeOptions: state.soilTypeOptions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),
      resetSoilTypeOptions: () =>
        set({
          soilTypeOptions: DEFAULT_SOIL_TYPE_OPTIONS,
        }),

      // Climate types
      addClimateType: (climateType: string) =>
        set((state) => ({
          climateTypes: [...state.climateTypes, climateType].sort(),
        })),
      removeClimateType: (climateType: string) =>
        set((state) => ({
          climateTypes: state.climateTypes.filter((c) => c !== climateType),
        })),
      updateClimateType: (oldType: string, newType: string) =>
        set((state) => ({
          climateTypes: state.climateTypes.map((c) => (c === oldType ? newType : c)).sort(),
        })),

      // Product types
      addProductType: (productType: ProductTypeOption) =>
        set((state) => ({
          productTypes: [...state.productTypes, productType],
        })),
      removeProductType: (id: string) =>
        set((state) => ({
          productTypes: state.productTypes.filter((p) => p.id !== id),
        })),
      updateProductType: (id: string, updates: Partial<ProductTypeOption>) =>
        set((state) => ({
          productTypes: state.productTypes.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      // Reset
      resetToDefaults: () =>
        set({
          regions: DEFAULT_REGIONS,
          soilTypes: DEFAULT_SOIL_TYPES,
          soilTypeOptions: DEFAULT_SOIL_TYPE_OPTIONS,
          climateTypes: DEFAULT_CLIMATE_TYPES,
          productTypes: DEFAULT_PRODUCT_TYPES,
        }),
    }),
    {
      name: 'cbd-options-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Rarity types for mystery box
export type Rarity = 'common' | 'rare' | 'epic' | 'platinum' | 'legendary';

export const RARITY_CONFIG: Record<Rarity, { label: string; color: string; probability: number; odds: string }> = {
  common: { label: 'Commun', color: '#9CA3AF', probability: 97.87, odds: '~1/1' },
  rare: { label: 'Rare', color: '#3B82F6', probability: 1.33, odds: '1/75' },
  epic: { label: 'Épique', color: '#8B5CF6', probability: 0.5, odds: '1/200' },
  platinum: { label: 'Platinum', color: '#E5E4E2', probability: 0.2, odds: '1/500' },
  legendary: { label: 'Légendaire', color: '#F59E0B', probability: 0.1, odds: '1/1000' },
};

// Lot item - a product in a lot
export interface LotItem {
  productId: string;
  producerId: string;
  productName: string;
  producerName: string;
  quantity: number;
}

// Lot - a mystery box prize
export interface Lot {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  image: string;
  items: LotItem[];
  value: number; // Total value in euros
  active: boolean;
  // Type of lot: product (physical items) or discount (reduction on order)
  lotType?: 'product' | 'discount';
  // Discount fields (only for discount type)
  discountPercent?: number;
  discountAmount?: number;
  minOrderAmount?: number;
}

interface LotsStore {
  lots: Lot[];
  addLot: (lot: Lot) => void;
  updateLot: (id: string, updates: Partial<Lot>) => void;
  removeLot: (id: string) => void;
  clearAllLots: () => void;
  toggleLotActive: (id: string) => void;
  addItemToLot: (lotId: string, item: LotItem) => void;
  removeItemFromLot: (lotId: string, productId: string) => void;
  updateItemQuantity: (lotId: string, productId: string, quantity: number) => void;
  getLotsByRarity: (rarity: Rarity) => Lot[];
  getActiveLots: () => Lot[];
  drawRandomLot: () => Lot | null;
}

export const useLotsStore = create<LotsStore>()(
  persist(
    (set, get) => ({
      lots: [],

      addLot: (lot: Lot) =>
        set((state) => ({
          lots: [...state.lots, lot],
        })),

      updateLot: (id: string, updates: Partial<Lot>) =>
        set((state) => ({
          lots: state.lots.map((lot) =>
            lot.id === id ? { ...lot, ...updates } : lot
          ),
        })),

      removeLot: (id: string) =>
        set((state) => ({
          lots: state.lots.filter((lot) => lot.id !== id),
        })),

      clearAllLots: () =>
        set({ lots: [] }),

      toggleLotActive: (id: string) =>
        set((state) => ({
          lots: state.lots.map((lot) =>
            lot.id === id ? { ...lot, active: !lot.active } : lot
          ),
        })),

      addItemToLot: (lotId: string, item: LotItem) =>
        set((state) => ({
          lots: state.lots.map((lot) =>
            lot.id === lotId
              ? { ...lot, items: [...lot.items, item] }
              : lot
          ),
        })),

      removeItemFromLot: (lotId: string, productId: string) =>
        set((state) => ({
          lots: state.lots.map((lot) =>
            lot.id === lotId
              ? { ...lot, items: lot.items.filter((i) => i.productId !== productId) }
              : lot
          ),
        })),

      updateItemQuantity: (lotId: string, productId: string, quantity: number) =>
        set((state) => ({
          lots: state.lots.map((lot) =>
            lot.id === lotId
              ? {
                  ...lot,
                  items: lot.items.map((i) =>
                    i.productId === productId ? { ...i, quantity } : i
                  ),
                }
              : lot
          ),
        })),

      getLotsByRarity: (rarity: Rarity) => {
        return get().lots.filter((lot) => lot.rarity === rarity && lot.active);
      },

      getActiveLots: () => {
        return get().lots.filter((lot) => lot.active);
      },

      drawRandomLot: () => {
        const activeLots = get().lots.filter((lot) => lot.active);
        if (activeLots.length === 0) return null;

        // Calculate total probability
        const random = Math.random() * 100;
        let cumulative = 0;

        // Determine rarity based on probability
        let selectedRarity: Rarity = 'common';
        for (const [rarity, config] of Object.entries(RARITY_CONFIG)) {
          cumulative += config.probability;
          if (random <= cumulative) {
            selectedRarity = rarity as Rarity;
            break;
          }
        }

        // Get lots of selected rarity
        const lotsOfRarity = activeLots.filter((lot) => lot.rarity === selectedRarity);

        // If no lots of that rarity, fall back to any active lot
        const eligibleLots = lotsOfRarity.length > 0 ? lotsOfRarity : activeLots;

        // Random selection from eligible lots
        const randomIndex = Math.floor(Math.random() * eligibleLots.length);
        return eligibleLots[randomIndex] ?? null;
      },
    }),
    {
      name: 'cbd-lots-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Product reviews store
export interface ProductReview {
  collectionItemId: string;
  rating: number; // 1-5 stars
  review: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ReviewsStore {
  reviews: Record<string, ProductReview>; // keyed by collectionItemId
  setReview: (collectionItemId: string, rating: number, review: string) => void;
  getReview: (collectionItemId: string) => ProductReview | undefined;
  deleteReview: (collectionItemId: string) => void;
}

export const useReviewsStore = create<ReviewsStore>()(
  persist(
    (set, get) => ({
      reviews: {},

      setReview: (collectionItemId: string, rating: number, review: string) =>
        set((state) => {
          const existing = state.reviews[collectionItemId];
          const now = new Date();
          return {
            reviews: {
              ...state.reviews,
              [collectionItemId]: {
                collectionItemId,
                rating,
                review,
                createdAt: existing?.createdAt ?? now,
                updatedAt: now,
              },
            },
          };
        }),

      getReview: (collectionItemId: string) => {
        return get().reviews[collectionItemId];
      },

      deleteReview: (collectionItemId: string) =>
        set((state) => {
          const { [collectionItemId]: _, ...rest } = state.reviews;
          return { reviews: rest };
        }),
    }),
    {
      name: 'cbd-reviews-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Product reviews store (reviews per product, not per producer)
export interface ProductReviewItem {
  id: string;
  productId: string;
  producerId: string;
  rating: number; // 1-5 stars
  comment: string;
  userName: string;
  createdAt: number;
}

interface ProductReviewsStore {
  reviews: ProductReviewItem[];
  addReview: (productId: string, producerId: string, rating: number, comment: string, userName?: string) => void;
  getReviewsForProduct: (productId: string) => ProductReviewItem[];
  getAverageRatingForProduct: (productId: string) => number;
  getReviewsForProducer: (producerId: string) => ProductReviewItem[];
  getAverageRatingForProducer: (producerId: string) => number;
  deleteReview: (reviewId: string) => void;
}

export const useProductReviewsStore = create<ProductReviewsStore>()(
  persist(
    (set, get) => ({
      reviews: [],

      addReview: (productId: string, producerId: string, rating: number, comment: string, userName?: string) =>
        set((state) => ({
          reviews: [
            ...state.reviews,
            {
              id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              productId,
              producerId,
              rating,
              comment,
              userName: userName || 'Anonyme',
              createdAt: Date.now(),
            },
          ],
        })),

      getReviewsForProduct: (productId: string) => {
        return get().reviews.filter((r) => r.productId === productId);
      },

      getAverageRatingForProduct: (productId: string) => {
        const productReviews = get().reviews.filter((r) => r.productId === productId);
        if (productReviews.length === 0) return 0;
        const total = productReviews.reduce((sum, r) => sum + r.rating, 0);
        return total / productReviews.length;
      },

      getReviewsForProducer: (producerId: string) => {
        return get().reviews.filter((r) => r.producerId === producerId);
      },

      getAverageRatingForProducer: (producerId: string) => {
        const producerReviews = get().reviews.filter((r) => r.producerId === producerId);
        if (producerReviews.length === 0) return 0;
        const total = producerReviews.reduce((sum, r) => sum + r.rating, 0);
        return total / producerReviews.length;
      },

      deleteReview: (reviewId: string) =>
        set((state) => ({
          reviews: state.reviews.filter((r) => r.id !== reviewId),
        })),
    }),
    {
      name: 'cbd-product-reviews-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Legacy Producer reviews store - kept for backward compatibility
export interface ProducerReview {
  id: string;
  producerId: string;
  rating: number; // 1-5 stars
  comment: string;
  userName: string;
  createdAt: number;
}

interface ProducerReviewsStore {
  reviews: ProducerReview[];
  addReview: (producerId: string, rating: number, comment: string, userName?: string) => void;
  getReviewsForProducer: (producerId: string) => ProducerReview[];
  getAverageRating: (producerId: string) => number;
  deleteReview: (reviewId: string) => void;
}

export const useProducerReviewsStore = create<ProducerReviewsStore>()(
  persist(
    (set, get) => ({
      reviews: [],

      addReview: (producerId: string, rating: number, comment: string, userName?: string) =>
        set((state) => ({
          reviews: [
            ...state.reviews,
            {
              id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              producerId,
              rating,
              comment,
              userName: userName || 'Anonyme',
              createdAt: Date.now(),
            },
          ],
        })),

      getReviewsForProducer: (producerId: string) => {
        return get().reviews.filter((r) => r.producerId === producerId);
      },

      getAverageRating: (producerId: string) => {
        const producerReviews = get().reviews.filter((r) => r.producerId === producerId);
        if (producerReviews.length === 0) return 0;
        const total = producerReviews.reduce((sum, r) => sum + r.rating, 0);
        return total / producerReviews.length;
      },

      deleteReview: (reviewId: string) =>
        set((state) => ({
          reviews: state.reviews.filter((r) => r.id !== reviewId),
        })),
    }),
    {
      name: 'cbd-producer-reviews-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Farming Game Store
export type CropType = 'outdoor' | 'greenhouse' | 'indoor';
export type PlotState = 'empty' | 'planted' | 'growing' | 'ready';

export interface FarmPlot {
  id: string;
  state: PlotState;
  cropType: CropType | null;
  plantedAt: number | null;
  growthDuration: number; // in milliseconds
  unlocked: boolean;
  waterLevel: number; // 0-100%
  lastWaterUpdate: number | null; // timestamp
  // Light system
  lightOn: boolean;
  lightChangedAt: number | null; // timestamp when light was last toggled
  lightPenalty: number; // accumulated quality penalty %
  // Pruning system (taille)
  pruneCount: number; // 0-3 prunings done
  pruneBonus: number; // accumulated yield bonus/malus from pruning (can be negative)
  // Watering tracking for yield calculation
  wateringScore: number; // 0-100, tracks how well watered (100 = perfect)
  totalWaterings: number; // count of times watered
  timesWaterCritical: number; // count of times water went below 30%
}

// Harvest result interface for displaying to user
export interface HarvestResult {
  grams: number;
  xpGained: number;
  waterMultiplier: number;
  lightMultiplier: number;
  pruneBonus: number;
  baseGrams: number;
  quality: 'parfait' | 'bon' | 'moyen' | 'faible';
}

export interface CropLevel {
  level: number; // 1-5
  experience: number;
  experienceToNextLevel: number;
}

export interface FarmingGameState {
  coins: number;
  plots: FarmPlot[];
  cropLevels: Record<CropType, CropLevel>;
  harvestedCrops: Record<CropType, number>;
  totalHarvests: number;
}

// Time scale configurations
// Normal mode: 1 heure virtuelle = 1 jour réel
// Admin mode: 1 mois réel = 1 minute virtuelle (accelerated for testing)
// Admin acceleration factor: 30 days * 24 hours * 60 = 43200x faster
export const ADMIN_TIME_SCALE = 43200; // 1 month = 1 minute

// Normal growth times (in ms)
const NORMAL_GROWTH_OUTDOOR = 648000000; // 180 heures (6 mois)
const NORMAL_GROWTH_GREENHOUSE = 648000000; // 180 heures (6 mois)
const NORMAL_GROWTH_INDOOR = 324000000; // 90 heures (3 mois)

// Admin growth times (in ms) - 6 mois = 6 min, 3 mois = 3 min
const ADMIN_GROWTH_OUTDOOR = 6 * 60 * 1000; // 6 minutes
const ADMIN_GROWTH_GREENHOUSE = 6 * 60 * 1000; // 6 minutes
const ADMIN_GROWTH_INDOOR = 3 * 60 * 1000; // 3 minutes

// Function to get growth time based on admin mode
export const getGrowthTime = (cropType: CropType, isAdmin: boolean): number => {
  if (isAdmin) {
    switch (cropType) {
      case 'outdoor': return ADMIN_GROWTH_OUTDOOR;
      case 'greenhouse': return ADMIN_GROWTH_GREENHOUSE;
      case 'indoor': return ADMIN_GROWTH_INDOOR;
    }
  }
  switch (cropType) {
    case 'outdoor': return NORMAL_GROWTH_OUTDOOR;
    case 'greenhouse': return NORMAL_GROWTH_GREENHOUSE;
    case 'indoor': return NORMAL_GROWTH_INDOOR;
  }
};

// Light cycle times
export const NORMAL_LIGHT_CYCLE_MS = 12 * 60 * 60 * 1000; // 12 heures
export const ADMIN_LIGHT_CYCLE_MS = 12 * 1000; // 12 seconds for admin

// Water decay rates
export const NORMAL_WATER_DECAY_RATE = 50 / (2 * 60 * 60 * 1000); // 50% per 2 hours
export const ADMIN_WATER_DECAY_RATE = 50 / (2 * 60 * 1000); // 50% per 2 minutes for admin

export const CROP_CONFIG: Record<CropType, {
  name: string;
  icon: string;
  growthTime: number;
  baseReward: number;
  baseXp: number;
  color: string;
  description: string;
  cost: number;
}> = {
  outdoor: {
    name: 'Outdoor',
    icon: '☀️',
    growthTime: 648000000, // 180 heures (6 mois réels = 180 jours, 1h virtuelle = 1 jour réel)
    baseReward: 10,
    baseXp: 10,
    color: '#5A9E5A',
    description: 'Culture en plein air - 6 mois',
    cost: 5,
  },
  greenhouse: {
    name: 'Greenhouse',
    icon: '🏡',
    growthTime: 648000000, // 180 heures (6 mois réels = 180 jours, 1h virtuelle = 1 jour réel)
    baseReward: 25,
    baseXp: 15,
    color: '#4A9B9B',
    description: 'Culture sous serre - 6 mois',
    cost: 15,
  },
  indoor: {
    name: 'Indoor',
    icon: '💡',
    growthTime: 324000000, // 90 heures (3 mois réels = 90 jours, 1h virtuelle = 1 jour réel)
    baseReward: 50,
    baseXp: 25,
    color: '#8B5CF6',
    description: 'Culture en intérieur - 3 mois',
    cost: 30,
  },
};

// Reward multiplier per level (1-5)
export const LEVEL_MULTIPLIERS = [1, 1.5, 2, 2.5, 3];

// XP required to reach next level for each crop
const calculateCropXpToNextLevel = (level: number): number => {
  if (level >= 5) return 0; // Max level
  return Math.floor(50 * Math.pow(1.8, level - 1));
};

// Get reward for a crop at a specific level
export const getCropReward = (cropType: CropType, level: number): number => {
  const baseReward = CROP_CONFIG[cropType].baseReward;
  const multiplier = LEVEL_MULTIPLIERS[Math.min(level - 1, 4)] ?? 1;
  return Math.floor(baseReward * multiplier);
};

const createInitialCropLevels = (): Record<CropType, CropLevel> => ({
  outdoor: { level: 1, experience: 0, experienceToNextLevel: 50 },
  greenhouse: { level: 1, experience: 0, experienceToNextLevel: 50 },
  indoor: { level: 1, experience: 0, experienceToNextLevel: 50 },
});

const createInitialPlots = (): FarmPlot[] => {
  const plots: FarmPlot[] = [];
  for (let i = 0; i < 12; i++) {
    plots.push({
      id: `plot-${i}`,
      state: 'empty',
      cropType: null,
      plantedAt: null,
      growthDuration: 0,
      unlocked: i < 4, // First 4 plots unlocked by default
      waterLevel: 100,
      lastWaterUpdate: null,
      lightOn: true,
      lightChangedAt: null,
      lightPenalty: 0,
      pruneCount: 0,
      pruneBonus: 0,
      wateringScore: 100,
      totalWaterings: 0,
      timesWaterCritical: 0,
    });
  }
  return plots;
};

interface FarmingStore extends FarmingGameState {
  plantCrop: (plotId: string, cropType: CropType, isAdmin?: boolean) => void;
  harvestCrop: (plotId: string) => HarvestResult | null;
  unlockPlot: (plotId: string) => boolean;
  addCoins: (amount: number) => void;
  updatePlotGrowth: (plotId: string) => void;
  getPlotUnlockCost: (plotIndex: number) => number;
  waterPlot: (plotId: string) => void;
  updateWaterLevels: () => void;
  getWaterPenalty: (plotId: string) => number;
  toggleLight: (plotId: string) => void;
  getLightPenalty: (plotId: string) => number;
  prunePlot: (plotId: string) => { success: boolean; bonus: number } | null;
  calculateHarvestResult: (plotId: string) => HarvestResult | null;
  resetFarm: () => void;
}

// Pruning configuration
// Prune 1: 70% success = +15%, fail = -10%
// Prune 2: 50% success = +25% total, fail = -15%
// Prune 3: 30% success = +45% total, fail = -20%
export const PRUNE_CONFIG = [
  { successRate: 0.70, successBonus: 15, failPenalty: -10 },
  { successRate: 0.50, successBonus: 25, failPenalty: -15 },
  { successRate: 0.30, successBonus: 45, failPenalty: -20 },
];

// Water decreases 50% every 2 hours = 50/7200000 per ms (used internally, farming.tsx uses the exported rates)
const WATER_DECAY_RATE = 50 / (2 * 60 * 60 * 1000); // 50% per 2 hours
// Below 0% water, lose 10% yield per hour (1h virtuelle = 1 jour réel)
const YIELD_PENALTY_RATE = 10 / (60 * 60 * 1000); // 10% per hour
// Light cycle: uses NORMAL_LIGHT_CYCLE_MS or ADMIN_LIGHT_CYCLE_MS from above
// Keeping LIGHT_CYCLE_MIN_MS for backwards compatibility
export const LIGHT_CYCLE_MIN_MS = NORMAL_LIGHT_CYCLE_MS;
// Penalty: 5% quality loss per hour virtuelle of violation
const LIGHT_PENALTY_RATE = 5 / (60 * 60 * 1000); // 5% per hour

export const useFarmingStore = create<FarmingStore>()(
  persist(
    (set, get) => ({
      coins: 50,
      plots: createInitialPlots(),
      cropLevels: createInitialCropLevels(),
      harvestedCrops: {
        outdoor: 0,
        greenhouse: 0,
        indoor: 0,
      },
      totalHarvests: 0,

      plantCrop: (plotId: string, cropType: CropType, isAdmin?: boolean) =>
        set((state) => {
          const cropConfig = CROP_CONFIG[cropType];

          // Check if player has enough coins
          if (state.coins < cropConfig.cost) return state;

          const plot = state.plots.find((p) => p.id === plotId);
          if (!plot || plot.state !== 'empty' || !plot.unlocked) return state;

          // Use admin or normal growth time
          const growthDuration = getGrowthTime(cropType, isAdmin ?? false);

          return {
            coins: state.coins - cropConfig.cost,
            plots: state.plots.map((p) =>
              p.id === plotId
                ? {
                    ...p,
                    state: 'planted' as PlotState,
                    cropType,
                    plantedAt: Date.now(),
                    growthDuration,
                    waterLevel: 100,
                    lastWaterUpdate: Date.now(),
                    lightOn: true,
                    lightChangedAt: Date.now(),
                    lightPenalty: 0,
                    pruneCount: 0,
                    pruneBonus: 0,
                    wateringScore: 100,
                    totalWaterings: 0,
                    timesWaterCritical: 0,
                  }
                : p
            ),
          };
        }),

      harvestCrop: (plotId: string): HarvestResult | null => {
        const state = get();
        const plot = state.plots.find((p) => p.id === plotId);
        if (!plot || plot.state !== 'ready' || !plot.cropType) return null;

        const cropType = plot.cropType;
        const cropConfig = CROP_CONFIG[cropType];
        const currentCropLevel = state.cropLevels[cropType];

        // Base grams based on crop type and level
        const baseGrams = cropConfig.baseReward * LEVEL_MULTIPLIERS[Math.min(currentCropLevel.level - 1, 4)];

        // Calculate water multiplier based on watering score
        // Perfect (score >= 90): x2, Good (score >= 70): x1.5, Medium (score >= 50): x1.2, Poor: x1
        let waterMultiplier = 1;
        let waterQuality: 'parfait' | 'bon' | 'moyen' | 'faible' = 'faible';
        if (plot.wateringScore >= 90) {
          waterMultiplier = 2;
          waterQuality = 'parfait';
        } else if (plot.wateringScore >= 70) {
          waterMultiplier = 1.5;
          waterQuality = 'bon';
        } else if (plot.wateringScore >= 50) {
          waterMultiplier = 1.2;
          waterQuality = 'moyen';
        }

        // Calculate light multiplier (only for indoor)
        // No penalty = x1.5, with penalty = reduced based on penalty amount
        let lightMultiplier = 1;
        if (cropType === 'indoor') {
          if (plot.lightPenalty === 0) {
            lightMultiplier = 1.5;
          } else {
            // Reduce multiplier based on penalty (max 50% penalty = x0.75)
            lightMultiplier = Math.max(0.75, 1.5 - (plot.lightPenalty / 100));
          }
        } else {
          // Non-indoor crops get a flat 1.2 bonus for natural light
          lightMultiplier = 1.2;
        }

        // Prune bonus (can be negative)
        const pruneBonus = plot.pruneBonus;
        const pruneBonusMultiplier = 1 + (pruneBonus / 100);

        // Calculate final grams
        const finalGrams = Math.round(baseGrams * waterMultiplier * lightMultiplier * pruneBonusMultiplier);

        // Calculate XP (proportional to grams harvested)
        const xpGained = Math.round(cropConfig.baseXp * (finalGrams / baseGrams));

        // Update state
        const newXp = currentCropLevel.experience + xpGained;
        let newLevel = currentCropLevel.level;
        let remainingXp = newXp;
        let xpToNext = currentCropLevel.experienceToNextLevel;

        // Level up if enough XP (max level 5)
        while (newLevel < 5 && remainingXp >= xpToNext) {
          remainingXp -= xpToNext;
          newLevel++;
          xpToNext = calculateCropXpToNextLevel(newLevel);
        }

        // If at max level, no more XP needed
        if (newLevel >= 5) {
          remainingXp = 0;
          xpToNext = 0;
        }

        // Convert grams to coins (1 gram = 1 coin)
        const coinsEarned = finalGrams;

        set((state) => ({
          plots: state.plots.map((p) =>
            p.id === plotId
              ? {
                  ...p,
                  state: 'empty' as PlotState,
                  cropType: null,
                  plantedAt: null,
                  growthDuration: 0,
                  waterLevel: 100,
                  lastWaterUpdate: null,
                  lightPenalty: 0,
                  pruneCount: 0,
                  pruneBonus: 0,
                  wateringScore: 100,
                  totalWaterings: 0,
                  timesWaterCritical: 0,
                }
              : p
          ),
          coins: state.coins + coinsEarned,
          cropLevels: {
            ...state.cropLevels,
            [cropType]: {
              level: newLevel,
              experience: remainingXp,
              experienceToNextLevel: xpToNext,
            },
          },
          harvestedCrops: {
            ...state.harvestedCrops,
            [cropType]: state.harvestedCrops[cropType] + 1,
          },
          totalHarvests: state.totalHarvests + 1,
        }));

        return {
          grams: finalGrams,
          xpGained,
          waterMultiplier,
          lightMultiplier,
          pruneBonus,
          baseGrams: Math.round(baseGrams),
          quality: waterQuality,
        };
      },

      unlockPlot: (plotId: string) => {
        const state = get();
        const plotIndex = state.plots.findIndex((p) => p.id === plotId);
        const cost = get().getPlotUnlockCost(plotIndex);

        if (state.coins < cost) return false;

        set((state) => ({
          coins: state.coins - cost,
          plots: state.plots.map((plot) =>
            plot.id === plotId ? { ...plot, unlocked: true } : plot
          ),
        }));
        return true;
      },

      addCoins: (amount: number) =>
        set((state) => ({
          coins: state.coins + amount,
        })),

      updatePlotGrowth: (plotId: string) =>
        set((state) => {
          const plot = state.plots.find((p) => p.id === plotId);
          if (!plot || !plot.plantedAt || plot.state === 'ready' || plot.state === 'empty') {
            return state;
          }

          const elapsed = Date.now() - plot.plantedAt;
          const isReady = elapsed >= plot.growthDuration;

          if (isReady) {
            return {
              plots: state.plots.map((p) =>
                p.id === plotId ? { ...p, state: 'ready' as PlotState } : p
              ),
            };
          }

          // Update to growing state if not already
          if (plot.state === 'planted' && elapsed > 0) {
            return {
              plots: state.plots.map((p) =>
                p.id === plotId ? { ...p, state: 'growing' as PlotState } : p
              ),
            };
          }

          return state;
        }),

      getPlotUnlockCost: (plotIndex: number) => {
        // Exponential cost for unlocking plots
        return Math.floor(50 * Math.pow(1.8, plotIndex - 4));
      },

      waterPlot: (plotId: string) =>
        set((state) => ({
          plots: state.plots.map((p) => {
            if (p.id !== plotId) return p;

            // Calculate watering score penalty if water was low
            let newWateringScore = p.wateringScore;
            if (p.waterLevel < 30) {
              // Penalty for letting water go critical
              newWateringScore = Math.max(0, p.wateringScore - 5);
            } else if (p.waterLevel < 50) {
              // Small penalty for letting water get low
              newWateringScore = Math.max(0, p.wateringScore - 2);
            }

            return {
              ...p,
              waterLevel: 100,
              lastWaterUpdate: Date.now(),
              wateringScore: newWateringScore,
              totalWaterings: p.totalWaterings + 1,
              timesWaterCritical: p.waterLevel < 30 ? p.timesWaterCritical + 1 : p.timesWaterCritical,
            };
          }),
        })),

      updateWaterLevels: () =>
        set((state) => {
          const now = Date.now();
          return {
            plots: state.plots.map((p) => {
              // Only update water for planted/growing plots
              if (p.state === 'empty' || p.state === 'ready' || !p.lastWaterUpdate) {
                return p;
              }

              const elapsed = now - p.lastWaterUpdate;
              const waterLost = elapsed * WATER_DECAY_RATE;
              const newWaterLevel = Math.max(0, p.waterLevel - waterLost);

              return {
                ...p,
                waterLevel: newWaterLevel,
                lastWaterUpdate: now,
              };
            }),
          };
        }),

      getWaterPenalty: (plotId: string) => {
        const state = get();
        const plot = state.plots.find((p) => p.id === plotId);
        if (!plot || plot.waterLevel > 0) return 0;

        // Calculate how long water has been at 0%
        // For simplicity, we return a penalty based on current state
        // Max penalty is 50% (5 hours at 0% water)
        const timeSinceZero = plot.lastWaterUpdate ? Date.now() - plot.lastWaterUpdate : 0;
        const penalty = Math.min(50, timeSinceZero * YIELD_PENALTY_RATE);
        return Math.floor(penalty);
      },

      toggleLight: (plotId: string) =>
        set((state) => {
          const plot = state.plots.find((p) => p.id === plotId);
          if (!plot || plot.state === 'empty' || plot.state === 'ready') return state;

          const now = Date.now();
          let newPenalty = plot.lightPenalty;

          // Check if minimum time has passed since last toggle
          if (plot.lightChangedAt) {
            const elapsed = now - plot.lightChangedAt;
            if (elapsed < LIGHT_CYCLE_MIN_MS) {
              // Add penalty for early toggle: 5% per 5 seconds of remaining time
              const remainingMs = LIGHT_CYCLE_MIN_MS - elapsed;
              const penaltyToAdd = (remainingMs / 1000) * (LIGHT_PENALTY_RATE * 1000);
              newPenalty = Math.min(100, plot.lightPenalty + penaltyToAdd);
            }
          }

          return {
            plots: state.plots.map((p) =>
              p.id === plotId
                ? {
                    ...p,
                    lightOn: !p.lightOn,
                    lightChangedAt: now,
                    lightPenalty: newPenalty,
                  }
                : p
            ),
          };
        }),

      getLightPenalty: (plotId: string) => {
        const state = get();
        const plot = state.plots.find((p) => p.id === plotId);
        if (!plot) return 0;
        return Math.floor(plot.lightPenalty);
      },

      prunePlot: (plotId: string) => {
        const state = get();
        const plot = state.plots.find((p) => p.id === plotId);

        // Can only prune during growth phase and max 3 times
        // Check both 'planted' and 'growing' states as both represent active growth
        if (!plot || (plot.state !== 'growing' && plot.state !== 'planted') || plot.pruneCount >= 3) return null;

        // Check if in croissance phase (33-66% progress)
        if (plot.plantedAt && plot.growthDuration) {
          const elapsed = Date.now() - plot.plantedAt;
          const progress = elapsed / plot.growthDuration;
          if (progress < 0.33 || progress >= 0.66) return null; // Not in croissance phase
        }

        const pruneIndex = plot.pruneCount;
        const config = PRUNE_CONFIG[pruneIndex];
        const roll = Math.random();
        const success = roll < config.successRate;
        const bonus = success ? config.successBonus : config.failPenalty;

        set((state) => ({
          plots: state.plots.map((p) =>
            p.id === plotId
              ? {
                  ...p,
                  pruneCount: p.pruneCount + 1,
                  pruneBonus: success ? config.successBonus : p.pruneBonus + config.failPenalty,
                }
              : p
          ),
        }));

        return { success, bonus };
      },

      calculateHarvestResult: (plotId: string): HarvestResult | null => {
        const state = get();
        const plot = state.plots.find((p) => p.id === plotId);
        if (!plot || plot.state !== 'ready' || !plot.cropType) return null;

        const cropType = plot.cropType;
        const cropConfig = CROP_CONFIG[cropType];
        const currentCropLevel = state.cropLevels[cropType];

        // Base grams based on crop type and level
        const baseGrams = cropConfig.baseReward * LEVEL_MULTIPLIERS[Math.min(currentCropLevel.level - 1, 4)];

        // Calculate water multiplier
        let waterMultiplier = 1;
        let waterQuality: 'parfait' | 'bon' | 'moyen' | 'faible' = 'faible';
        if (plot.wateringScore >= 90) {
          waterMultiplier = 2;
          waterQuality = 'parfait';
        } else if (plot.wateringScore >= 70) {
          waterMultiplier = 1.5;
          waterQuality = 'bon';
        } else if (plot.wateringScore >= 50) {
          waterMultiplier = 1.2;
          waterQuality = 'moyen';
        }

        // Calculate light multiplier
        let lightMultiplier = 1;
        if (cropType === 'indoor') {
          lightMultiplier = plot.lightPenalty === 0 ? 1.5 : Math.max(0.75, 1.5 - (plot.lightPenalty / 100));
        } else {
          lightMultiplier = 1.2;
        }

        const pruneBonusMultiplier = 1 + (plot.pruneBonus / 100);
        const finalGrams = Math.round(baseGrams * waterMultiplier * lightMultiplier * pruneBonusMultiplier);
        const xpGained = Math.round(cropConfig.baseXp * (finalGrams / baseGrams));

        return {
          grams: finalGrams,
          xpGained,
          waterMultiplier,
          lightMultiplier,
          pruneBonus: plot.pruneBonus,
          baseGrams: Math.round(baseGrams),
          quality: waterQuality,
        };
      },

      resetFarm: () =>
        set({
          coins: 50,
          plots: createInitialPlots(),
          cropLevels: createInitialCropLevels(),
          harvestedCrops: {
            outdoor: 0,
            greenhouse: 0,
            indoor: 0,
          },
          totalHarvests: 0,
        }),
    }),
    {
      name: 'cbd-farming-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Customer Info Store - for order validation
export interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

interface CustomerInfoStore {
  customerInfo: CustomerInfo;
  setCustomerInfo: (info: Partial<CustomerInfo>) => void;
  clearCustomerInfo: () => void;
  isProfileComplete: () => boolean;
  getMissingFields: () => string[];
}

const initialCustomerInfo: CustomerInfo = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  postalCode: '',
};

export const useCustomerInfoStore = create<CustomerInfoStore>()(
  persist(
    (set, get) => ({
      customerInfo: initialCustomerInfo,

      setCustomerInfo: (info: Partial<CustomerInfo>) =>
        set((state) => ({
          customerInfo: { ...state.customerInfo, ...info },
        })),

      clearCustomerInfo: () =>
        set({ customerInfo: initialCustomerInfo }),

      isProfileComplete: () => {
        const info = get().customerInfo;
        return !!(
          info.firstName.trim() &&
          info.lastName.trim() &&
          info.email.trim() &&
          info.phone.trim() &&
          info.address.trim() &&
          info.city.trim() &&
          info.postalCode.trim()
        );
      },

      getMissingFields: () => {
        const info = get().customerInfo;
        const missingFields: string[] = [];

        const fieldLabels: Record<keyof CustomerInfo, string> = {
          firstName: 'Prénom',
          lastName: 'Nom',
          email: 'Email',
          phone: 'Téléphone',
          address: 'Adresse',
          city: 'Ville',
          postalCode: 'Code postal',
        };

        (Object.keys(fieldLabels) as Array<keyof CustomerInfo>).forEach((key) => {
          if (!info[key]?.trim()) {
            missingFields.push(fieldLabels[key]);
          }
        });

        return missingFields;
      },
    }),
    {
      name: 'cbd-customer-info-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Orders Store - for admin order management
// 1: pending (En attente) - Rouge
// 2: payment_sent (Lien de paiement envoyé) - Orange
// 3: paid (Paiement reçu, préparation) - Jaune
// 4: shipped (Commande envoyée en locker) - Vert
// 5: cancelled (Annulée) - Gris
export type OrderStatus = 'pending' | 'payment_sent' | 'paid' | 'shipped' | 'cancelled';

export const ORDER_STATUS_CONFIG: Record<OrderStatus, {
  label: string;
  color: string;
  step: number;
  description: string;
}> = {
  pending: {
    label: 'En attente',
    color: '#EF4444',
    step: 1,
    description: 'Commande reçue, en attente de traitement'
  },
  payment_sent: {
    label: 'Lien de paiement envoyé',
    color: '#F97316',
    step: 2,
    description: 'Le lien de paiement a été envoyé par email'
  },
  paid: {
    label: 'Paiement reçu',
    color: '#EAB308',
    step: 3,
    description: 'Paiement confirmé, commande en préparation'
  },
  shipped: {
    label: 'Commande expédiée',
    color: '#22C55E',
    step: 4,
    description: 'Commande expédiée avec Mondial Relay'
  },
  cancelled: {
    label: 'Annulée',
    color: '#6B7280',
    step: 0,
    description: 'Commande annulée'
  },
};

export interface OrderItem {
  productId: string;
  productName: string;
  productType: string;
  producerId: string;
  producerName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  tvaRate?: number; // Taux de TVA en % (défaut: 20)
}

export interface Order {
  id: string;
  customerInfo: CustomerInfo;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  trackingNumber?: string;
  createdAt: number;
  updatedAt: number;
  notes?: string;
  // Order type - permet de distinguer les commandes PRO des commandes classiques
  isProOrder?: boolean;
  // Payment validation fields (optionnels - système simplifié)
  paymentValidated?: boolean;
  paymentValidatedAt?: number;
  paymentValidatedBy?: string;
  ticketsDistributed?: boolean;
  ticketsEarned?: number;
}

interface OrdersStore {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Omit<Order, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => string;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderNotes: (orderId: string, notes: string) => void;
  updateOrderTrackingNumber: (orderId: string, trackingNumber: string) => void;
  deleteOrder: (orderId: string) => void;
  getOrderById: (orderId: string) => Order | undefined;
  getOrdersByStatus: (status: OrderStatus) => Order[];
  getOrdersByCustomerEmail: (email: string) => Order[];
  // Payment validation
  validatePayment: (orderId: string, validatedBy?: string) => { success: boolean; ticketsDistributed: number };
  markTicketsDistributed: (orderId: string) => void;
}

export const useOrdersStore = create<OrdersStore>()(
  persist(
    (set, get) => ({
      orders: [],

      setOrders: (orders) => set({ orders }),

      addOrder: (orderData) => {
        const orderId = `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = Date.now();
        const newOrder: Order = {
          ...orderData,
          id: orderId,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          orders: [newOrder, ...state.orders],
        }));
        return orderId;
      },

      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? { ...order, status, updatedAt: Date.now() }
              : order
          ),
        })),

      updateOrderNotes: (orderId, notes) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? { ...order, notes, updatedAt: Date.now() }
              : order
          ),
        })),

      updateOrderTrackingNumber: (orderId, trackingNumber) =>
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? { ...order, trackingNumber, updatedAt: Date.now() }
              : order
          ),
        })),

      deleteOrder: (orderId) =>
        set((state) => ({
          orders: state.orders.filter((order) => order.id !== orderId),
        })),

      getOrderById: (orderId) => {
        return get().orders.find((order) => order.id === orderId);
      },

      getOrdersByStatus: (status) => {
        return get().orders.filter((order) => order.status === status);
      },

      getOrdersByCustomerEmail: (email) => {
        return get().orders.filter((order) =>
          order.customerInfo.email.toLowerCase() === email.toLowerCase()
        );
      },

      // Validate payment and mark order as paid
      validatePayment: (orderId, validatedBy) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) {
          return { success: false, ticketsDistributed: 0 };
        }

        // Already validated
        if (order.paymentValidated) {
          return { success: false, ticketsDistributed: 0 };
        }

        const now = Date.now();
        set((state) => ({
          orders: state.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  paymentValidated: true,
                  paymentValidatedAt: now,
                  paymentValidatedBy: validatedBy,
                  status: 'paid' as OrderStatus,
                  updatedAt: now,
                }
              : o
          ),
        }));

        return { success: true, ticketsDistributed: order.ticketsEarned ?? 0 };
      },

      // Mark tickets as distributed (after notification sent)
      markTicketsDistributed: (orderId) => {
        set((state) => ({
          orders: state.orders.map((order) =>
            order.id === orderId
              ? { ...order, ticketsDistributed: true, updatedAt: Date.now() }
              : order
          ),
        }));
      },
    }),
    {
      name: 'cbd-orders-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Packs Store - for pack management
export interface PackItem {
  name: string;
  quantity: string;
  value: number;
  images?: string[]; // Jusqu'à 3 images
  producerName?: string; // Nom du producteur
}

export interface Pack {
  id: string;
  name: string;
  description: string;
  price: number;
  pricePro?: number | null; // Prix professionnel
  originalPrice: number;
  image: string;
  items: PackItem[];
  tag?: string;
  color: string;
  active: boolean;
  visibleForClients?: boolean; // Visible pour les clients (défaut: true)
  visibleForPros?: boolean; // Visible pour les pros (défaut: false)
}

interface PacksStore {
  packs: Pack[];
  addPack: (pack: Omit<Pack, 'id'>) => void;
  updatePack: (id: string, updates: Partial<Pack>) => void;
  removePack: (id: string) => void;
  togglePackActive: (id: string) => void;
  getActivePacks: () => Pack[];
}

export const usePacksStore = create<PacksStore>()(
  persist(
    (set, get) => ({
      packs: [],

      addPack: (packData) => {
        const newPack: Pack = {
          ...packData,
          id: `pack-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        set((state) => ({
          packs: [...state.packs, newPack],
        }));
      },

      updatePack: (id, updates) =>
        set((state) => ({
          packs: state.packs.map((pack) =>
            pack.id === id ? { ...pack, ...updates } : pack
          ),
        })),

      removePack: (id) =>
        set((state) => ({
          packs: state.packs.filter((pack) => pack.id !== id),
        })),

      togglePackActive: (id) =>
        set((state) => ({
          packs: state.packs.map((pack) =>
            pack.id === id ? { ...pack, active: !pack.active } : pack
          ),
        })),

      getActivePacks: () => {
        return get().packs.filter((pack) => pack.active);
      },
    }),
    {
      name: 'cbd-packs-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Inventory Store - for storing won lots from tirage
export type LotType = 'product' | 'discount';

export interface InventoryLot {
  id: string;
  lotId: string;
  name: string;
  description: string;
  rarity: Rarity;
  image: string;
  type: LotType;
  // For product lots
  items?: LotItem[];
  value?: number;
  // For discount lots
  discountPercent?: number;
  discountAmount?: number; // Fixed amount in euros
  minOrderAmount?: number; // Minimum order amount to apply discount
  wonAt: number;
  used: boolean;
  usedAt?: number;
}

interface InventoryStore {
  inventory: InventoryLot[];
  addToInventory: (lot: Lot, type: LotType, discountPercent?: number, discountAmount?: number, minOrderAmount?: number) => void;
  useInventoryLot: (inventoryLotId: string) => void;
  getAvailableLots: () => InventoryLot[];
  getAvailableDiscounts: () => InventoryLot[];
  getAvailableProducts: () => InventoryLot[];
  clearUsedLots: () => void;
}

export const useInventoryStore = create<InventoryStore>()(
  persist(
    (set, get) => ({
      inventory: [],

      addToInventory: (lot: Lot, type: LotType, discountPercent?: number, discountAmount?: number, minOrderAmount?: number) => {
        const inventoryLot: InventoryLot = {
          id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          lotId: lot.id,
          name: lot.name,
          description: lot.description,
          rarity: lot.rarity,
          image: lot.image,
          type,
          items: type === 'product' ? lot.items : undefined,
          value: type === 'product' ? lot.value : undefined,
          discountPercent: type === 'discount' ? discountPercent : undefined,
          discountAmount: type === 'discount' ? discountAmount : undefined,
          minOrderAmount: type === 'discount' ? minOrderAmount : undefined,
          wonAt: Date.now(),
          used: false,
        };
        set((state) => ({
          inventory: [inventoryLot, ...state.inventory],
        }));
      },

      useInventoryLot: (inventoryLotId: string) =>
        set((state) => ({
          inventory: state.inventory.map((lot) =>
            lot.id === inventoryLotId
              ? { ...lot, used: true, usedAt: Date.now() }
              : lot
          ),
        })),

      getAvailableLots: () => {
        return get().inventory.filter((lot) => !lot.used);
      },

      getAvailableDiscounts: () => {
        return get().inventory.filter((lot) => !lot.used && lot.type === 'discount');
      },

      getAvailableProducts: () => {
        return get().inventory.filter((lot) => !lot.used && lot.type === 'product');
      },

      clearUsedLots: () =>
        set((state) => ({
          inventory: state.inventory.filter((lot) => !lot.used),
        })),
    }),
    {
      name: 'cbd-inventory-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Tab Visibility Store - for controlling which tabs are visible per role
export type TabId = 'map' | 'packs' | 'promo' | 'produits' | 'cart' | 'farming' | 'tirage' | 'profile' | 'music' | 'bourse' | 'regions' | 'ma-boutique' | 'chat-producteurs' | 'marche-local';

// Role-based visibility
export type TabRole = 'client' | 'pro' | 'producer';

export interface TabRoleVisibility {
  client: boolean;
  pro: boolean;
  producer: boolean;
}

export interface TabConfig {
  id: TabId;
  name: string;
  visible: boolean; // Legacy - kept for backward compatibility
  roleVisibility: TabRoleVisibility;
}

interface TabVisibilityStore {
  tabs: TabConfig[];
  setTabVisibility: (tabId: TabId, visible: boolean) => void;
  setTabRoleVisibility: (tabId: TabId, role: TabRole, visible: boolean) => void;
  isTabVisible: (tabId: TabId) => boolean;
  isTabVisibleForRole: (tabId: TabId, role: TabRole | null) => boolean;
  resetToDefaults: () => void;
}

const DEFAULT_TABS: TabConfig[] = [
  { id: 'map', name: 'Carte', visible: true, roleVisibility: { client: true, pro: true, producer: true } },
  { id: 'music', name: 'Musique', visible: true, roleVisibility: { client: true, pro: true, producer: true } },
  { id: 'packs', name: 'Packs', visible: true, roleVisibility: { client: true, pro: true, producer: false } },
  { id: 'promo', name: 'Promo', visible: true, roleVisibility: { client: true, pro: true, producer: false } },
  { id: 'bourse', name: 'Bourse', visible: true, roleVisibility: { client: true, pro: true, producer: true } },
  { id: 'regions', name: 'Régions', visible: true, roleVisibility: { client: false, pro: true, producer: true } },
  { id: 'produits', name: 'Produits', visible: true, roleVisibility: { client: true, pro: true, producer: true } },
  { id: 'ma-boutique', name: 'Ma Boutique', visible: true, roleVisibility: { client: false, pro: false, producer: true } },
  { id: 'chat-producteurs', name: 'Chat Producteurs', visible: true, roleVisibility: { client: false, pro: true, producer: true } },
  { id: 'cart', name: 'Panier', visible: true, roleVisibility: { client: true, pro: true, producer: false } },
  { id: 'farming', name: 'Farm', visible: true, roleVisibility: { client: true, pro: false, producer: false } },
  { id: 'tirage', name: 'Tirage', visible: true, roleVisibility: { client: true, pro: false, producer: false } },
  { id: 'profile', name: 'Profil', visible: true, roleVisibility: { client: true, pro: true, producer: true } },
  { id: 'marche-local', name: 'Marché Local', visible: true, roleVisibility: { client: true, pro: true, producer: true } },
];

export const useTabVisibilityStore = create<TabVisibilityStore>()(
  persist(
    (set, get) => ({
      tabs: DEFAULT_TABS,

      setTabVisibility: (tabId: TabId, visible: boolean) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId ? { ...tab, visible } : tab
          ),
        })),

      setTabRoleVisibility: (tabId: TabId, role: TabRole, visible: boolean) =>
        set((state) => ({
          tabs: state.tabs.map((tab) =>
            tab.id === tabId
              ? {
                  ...tab,
                  roleVisibility: {
                    ...tab.roleVisibility,
                    [role]: visible,
                  },
                }
              : tab
          ),
        })),

      isTabVisible: (tabId: TabId) => {
        const tab = get().tabs.find((t) => t.id === tabId);
        return tab?.visible ?? true;
      },

      isTabVisibleForRole: (tabId: TabId, role: TabRole | null) => {
        const tab = get().tabs.find((t) => t.id === tabId);
        if (!tab) return true;
        // If no role (not logged in), treat as client
        const effectiveRole = role ?? 'client';
        return tab.roleVisibility?.[effectiveRole] ?? tab.visible ?? true;
      },

      resetToDefaults: () =>
        set({ tabs: DEFAULT_TABS }),
    }),
    {
      name: 'cbd-tab-visibility-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Merge persisted tabs with default tabs to ensure new tabs are added
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<TabVisibilityStore>;
        const persistedTabs = persisted?.tabs ?? [];

        // Ensure all default tabs exist, preserving visibility from persisted state
        const mergedTabs = DEFAULT_TABS.map((defaultTab) => {
          const existingTab = persistedTabs.find((t) => t.id === defaultTab.id);
          if (existingTab) {
            // Merge roleVisibility with defaults to handle new roles
            return {
              ...defaultTab,
              ...existingTab,
              roleVisibility: {
                ...defaultTab.roleVisibility,
                ...existingTab.roleVisibility,
              },
            };
          }
          return defaultTab;
        });

        return {
          ...currentState,
          ...persisted,
          tabs: mergedTabs,
        };
      },
    }
  )
);

// Promo Store - for managing promotions
export interface Promo {
  id: string;
  title: string;
  description: string;
  code: string;
  discount: number; // percentage
  image: string;
  validUntil: string;
  minOrder: number;
  active: boolean;
}

interface PromosStore {
  promos: Promo[];
  addPromo: (promo: Omit<Promo, 'id'>) => void;
  updatePromo: (id: string, updates: Partial<Promo>) => void;
  removePromo: (id: string) => void;
  togglePromoActive: (id: string) => void;
  getActivePromos: () => Promo[];
  clearAllPromos: () => void;
}

export const usePromosStore = create<PromosStore>()(
  persist(
    (set, get) => ({
      promos: [],

      addPromo: (promoData) => {
        const newPromo: Promo = {
          ...promoData,
          id: `promo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        set((state) => ({
          promos: [...state.promos, newPromo],
        }));
      },

      updatePromo: (id, updates) =>
        set((state) => ({
          promos: state.promos.map((promo) =>
            promo.id === id ? { ...promo, ...updates } : promo
          ),
        })),

      removePromo: (id) =>
        set((state) => ({
          promos: state.promos.filter((promo) => promo.id !== id),
        })),

      togglePromoActive: (id) =>
        set((state) => ({
          promos: state.promos.map((promo) =>
            promo.id === id ? { ...promo, active: !promo.active } : promo
          ),
        })),

      getActivePromos: () => {
        return get().promos.filter((promo) => promo.active);
      },

      clearAllPromos: () =>
        set({ promos: [] }),
    }),
    {
      name: 'cbd-promos-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Promo Products Store - for managing products on promotion
export interface PromoProduct {
  id: string;
  productId: string;
  producerId: string;
  productName: string;
  producerName: string;
  originalPrice: number;
  promoPrice: number;
  promoPricePro?: number | null; // Prix promo pour les pros
  discountPercent: number;
  image: string;
  validUntil: string;
  active: boolean;
  visibleForClients?: boolean; // Visible pour les clients (défaut: true)
  visibleForPros?: boolean; // Visible pour les pros (défaut: true)
}

interface PromoProductsStore {
  promoProducts: PromoProduct[];
  addPromoProduct: (product: Omit<PromoProduct, 'id'>) => void;
  updatePromoProduct: (id: string, updates: Partial<PromoProduct>) => void;
  removePromoProduct: (id: string) => void;
  togglePromoProductActive: (id: string) => void;
  getActivePromoProducts: () => PromoProduct[];
  clearAllPromoProducts: () => void;
}

export const usePromoProductsStore = create<PromoProductsStore>()(
  persist(
    (set, get) => ({
      promoProducts: [],

      addPromoProduct: (productData) => {
        const newProduct: PromoProduct = {
          ...productData,
          id: `promo-product-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        };
        set((state) => ({
          promoProducts: [...state.promoProducts, newProduct],
        }));
      },

      updatePromoProduct: (id, updates) =>
        set((state) => ({
          promoProducts: state.promoProducts.map((product) =>
            product.id === id ? { ...product, ...updates } : product
          ),
        })),

      removePromoProduct: (id) =>
        set((state) => ({
          promoProducts: state.promoProducts.filter((product) => product.id !== id),
        })),

      togglePromoProductActive: (id) =>
        set((state) => ({
          promoProducts: state.promoProducts.map((product) =>
            product.id === id ? { ...product, active: !product.active } : product
          ),
        })),

      getActivePromoProducts: () => {
        return get().promoProducts.filter((product) => product.active);
      },

      clearAllPromoProducts: () =>
        set({ promoProducts: [] }),
    }),
    {
      name: 'cbd-promo-products-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Notifications Store - Manage push notifications to users
export type NotificationType = 'promo' | 'news' | 'event' | 'reminder' | 'general';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  scheduledAt?: string; // ISO date string for scheduled notifications
  sentAt?: string; // ISO date string when actually sent
  status: 'draft' | 'scheduled' | 'sent';
  targetAudience: 'all' | 'subscribers' | 'vip';
  createdAt: number;
}

export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, { label: string; color: string; icon: string }> = {
  promo: { label: 'Promotion', color: '#EF4444', icon: 'percent' },
  news: { label: 'Actualité', color: '#3B82F6', icon: 'newspaper' },
  event: { label: 'Événement', color: '#8B5CF6', icon: 'calendar' },
  reminder: { label: 'Rappel', color: '#F59E0B', icon: 'bell' },
  general: { label: 'Général', color: '#6B7280', icon: 'megaphone' },
};

interface NotificationsStore {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'status' | 'sentAt'>) => void;
  updateNotification: (id: string, updates: Partial<AppNotification>) => void;
  deleteNotification: (id: string) => void;
  sendNotification: (id: string) => void;
  getScheduledNotifications: () => AppNotification[];
  getSentNotifications: () => AppNotification[];
  getDraftNotifications: () => AppNotification[];
}

export const useNotificationsStore = create<NotificationsStore>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (notificationData) => {
        const newNotification: AppNotification = {
          ...notificationData,
          id: `notif-${Date.now()}`,
          status: notificationData.scheduledAt ? 'scheduled' : 'draft',
          createdAt: Date.now(),
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
        }));
      },

      updateNotification: (id, updates) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          ),
        }));
      },

      deleteNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      sendNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, status: 'sent' as const, sentAt: new Date().toISOString() } : n
          ),
        }));
      },

      getScheduledNotifications: () => get().notifications.filter((n) => n.status === 'scheduled'),
      getSentNotifications: () => get().notifications.filter((n) => n.status === 'sent'),
      getDraftNotifications: () => get().notifications.filter((n) => n.status === 'draft'),
    }),
    {
      name: 'cbd-notifications-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Product Stock Inventory - Manage product quantities and prices
export interface StockItem {
  id: string;
  productId: string;
  producerId: string;
  productName: string;
  producerName: string;
  productType: string;
  quantity: number;
  price: number;
  costPrice: number; // Prix d'achat
  tvaRate: number;
  unit: string; // 'g', 'ml', 'unité'
  minStock: number; // Seuil d'alerte stock bas
  image?: string;
  description?: string;
  cbdPercent?: number;
  thcPercent?: number;
  weight?: string;
  // Visibility and promo settings
  visible: boolean; // Visible dans la boutique du producteur
  isOnPromo: boolean; // En promotion
  discountPercent: number; // Pourcentage de réduction
  promoValidUntil?: string; // Date de fin de promo
  createdAt: number;
  updatedAt: number;
}

interface StockInventoryStore {
  stock: StockItem[];
  addStockItem: (item: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateStockItem: (id: string, updates: Partial<StockItem>) => void;
  removeStockItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  decrementQuantity: (id: string, amount: number) => boolean;
  incrementQuantity: (id: string, amount: number) => void;
  getStockByProduct: (productId: string) => StockItem | undefined;
  getLowStockItems: () => StockItem[];
  getTotalStockValue: () => number;
  clearAllStock: () => void;
}

export const useStockInventoryStore = create<StockInventoryStore>()(
  persist(
    (set, get) => ({
      stock: [],

      addStockItem: (itemData) => {
        const now = Date.now();
        const newItem: StockItem = {
          ...itemData,
          id: `stock-${now}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({
          stock: [...state.stock, newItem],
        }));
      },

      updateStockItem: (id, updates) =>
        set((state) => ({
          stock: state.stock.map((item) =>
            item.id === id
              ? { ...item, ...updates, updatedAt: Date.now() }
              : item
          ),
        })),

      removeStockItem: (id) =>
        set((state) => ({
          stock: state.stock.filter((item) => item.id !== id),
        })),

      updateQuantity: (id, quantity) =>
        set((state) => ({
          stock: state.stock.map((item) =>
            item.id === id
              ? { ...item, quantity: Math.max(0, quantity), updatedAt: Date.now() }
              : item
          ),
        })),

      decrementQuantity: (id, amount) => {
        const state = get();
        const item = state.stock.find((i) => i.id === id);
        if (!item || item.quantity < amount) return false;

        set((s) => ({
          stock: s.stock.map((i) =>
            i.id === id
              ? { ...i, quantity: i.quantity - amount, updatedAt: Date.now() }
              : i
          ),
        }));
        return true;
      },

      incrementQuantity: (id, amount) =>
        set((state) => ({
          stock: state.stock.map((item) =>
            item.id === id
              ? { ...item, quantity: item.quantity + amount, updatedAt: Date.now() }
              : item
          ),
        })),

      getStockByProduct: (productId) => {
        return get().stock.find((item) => item.productId === productId);
      },

      getLowStockItems: () => {
        return get().stock.filter((item) => item.quantity <= item.minStock);
      },

      getTotalStockValue: () => {
        return get().stock.reduce((sum, item) => sum + item.quantity * item.price, 0);
      },

      clearAllStock: () => set({ stock: [] }),
    }),
    {
      name: 'cbd-stock-inventory-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Referral / Gift System - Send lots to friends and earn points
export interface GiftedLot {
  id: string;
  collectionItemId: string; // Reference to the original collection item
  product: CBDProduct;
  senderCode: string; // Unique code of the sender
  recipientCode: string | null; // Code of the recipient (null until claimed)
  giftCode: string; // Unique code to share with friend
  createdAt: number;
  claimedAt: number | null;
  used: boolean; // Whether the recipient has used the lot
}

interface ReferralStore {
  myCode: string; // User's unique referral code
  points: number; // Points earned from referrals
  giftsSent: GiftedLot[]; // Lots sent to friends
  giftsReceived: GiftedLot[]; // Lots received from friends
  // Actions
  generateMyCode: () => string;
  sendLotAsGift: (collectionItemId: string, product: CBDProduct) => string; // Returns gift code
  claimGift: (giftCode: string) => GiftedLot | null; // Claim a gift with code
  markGiftAsUsed: (giftId: string) => void; // Mark received gift as used (awards points to sender)
  addPoints: (amount: number) => void;
  getPointsHistory: () => { sent: number; pointsEarned: number };
  resetStore: () => void; // Reset pour changement d'utilisateur
}

const generateUniqueCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const useReferralStore = create<ReferralStore>()(
  persist(
    (set, get) => ({
      myCode: '',
      points: 0,
      giftsSent: [],
      giftsReceived: [],

      generateMyCode: () => {
        const state = get();
        if (state.myCode) return state.myCode;
        const newCode = generateUniqueCode();
        set({ myCode: newCode });
        return newCode;
      },

      sendLotAsGift: (collectionItemId: string, product: CBDProduct) => {
        const state = get();
        // Ensure user has a code
        const myCode = state.myCode || get().generateMyCode();

        const giftCode = `GIFT-${generateUniqueCode()}`;
        const newGift: GiftedLot = {
          id: `gift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          collectionItemId,
          product,
          senderCode: myCode,
          recipientCode: null,
          giftCode,
          createdAt: Date.now(),
          claimedAt: null,
          used: false,
        };

        set((s) => ({
          giftsSent: [...s.giftsSent, newGift],
        }));

        return giftCode;
      },

      claimGift: (giftCode: string) => {
        const state = get();
        // Ensure user has a code
        const myCode = state.myCode || get().generateMyCode();

        // Find the gift in all users' sent gifts (simulated - in real app this would be server-side)
        // For now, we check our own sent gifts (for demo/testing)
        const gift = state.giftsSent.find(
          (g) => g.giftCode === giftCode && !g.recipientCode
        );

        if (gift) {
          // Update the gift as claimed
          const claimedGift: GiftedLot = {
            ...gift,
            recipientCode: myCode,
            claimedAt: Date.now(),
          };

          set((s) => ({
            giftsSent: s.giftsSent.map((g) =>
              g.id === gift.id ? claimedGift : g
            ),
            giftsReceived: [...s.giftsReceived, claimedGift],
          }));

          return claimedGift;
        }

        return null;
      },

      markGiftAsUsed: (giftId: string) => {
        const state = get();
        const gift = state.giftsReceived.find((g) => g.id === giftId);

        if (gift && !gift.used) {
          // Mark as used
          set((s) => ({
            giftsReceived: s.giftsReceived.map((g) =>
              g.id === giftId ? { ...g, used: true } : g
            ),
          }));

          // Award points to sender (10 points per used gift)
          // In a real app, this would be server-side
          set((s) => ({
            giftsSent: s.giftsSent.map((g) =>
              g.id === giftId ? { ...g, used: true } : g
            ),
          }));

          // Check if this is a gift we sent that was used
          const sentGift = state.giftsSent.find((g) => g.id === giftId);
          if (sentGift) {
            set((s) => ({ points: s.points + 10 }));
          }
        }
      },

      addPoints: (amount: number) =>
        set((s) => ({ points: s.points + amount })),

      getPointsHistory: () => {
        const state = get();
        const usedGifts = state.giftsSent.filter((g) => g.used);
        return {
          sent: state.giftsSent.length,
          pointsEarned: usedGifts.length * 10,
        };
      },

      resetStore: () =>
        set({
          myCode: '',
          points: 0,
          giftsSent: [],
          giftsReceived: [],
        }),
    }),
    {
      name: 'cbd-referral-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// Supabase Sync Store - for syncing producers from Supabase
interface SupabaseSyncStore {
  syncedProducers: Producer[];
  syncedLots: Lot[];
  lastSyncAt: string | null;
  lastLotsSyncAt: string | null;
  isSyncing: boolean;
  syncError: string | null;
  setSyncedProducers: (producers: Producer[]) => void;
  setSyncedLots: (lots: Lot[]) => void;
  setSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  updateLastSync: () => void;
  updateLastLotsSync: () => void;
  clearSyncedData: () => void;
}

export const useSupabaseSyncStore = create<SupabaseSyncStore>()(
  persist(
    (set) => ({
      syncedProducers: [],
      syncedLots: [],
      lastSyncAt: null,
      lastLotsSyncAt: null,
      isSyncing: false,
      syncError: null,

      setSyncedProducers: (producers: Producer[]) =>
        set({
          syncedProducers: producers,
          lastSyncAt: new Date().toISOString(),
          syncError: null,
        }),

      setSyncedLots: (lots: Lot[]) =>
        set({
          syncedLots: lots,
          lastLotsSyncAt: new Date().toISOString(),
          syncError: null,
        }),

      setSyncing: (syncing: boolean) =>
        set({ isSyncing: syncing }),

      setSyncError: (error: string | null) =>
        set({ syncError: error }),

      updateLastSync: () =>
        set({ lastSyncAt: new Date().toISOString() }),

      updateLastLotsSync: () =>
        set({ lastLotsSyncAt: new Date().toISOString() }),

      clearSyncedData: () =>
        set({
          syncedProducers: [],
          syncedLots: [],
          lastSyncAt: null,
          lastLotsSyncAt: null,
          syncError: null,
        }),
    }),
    {
      name: 'cbd-supabase-sync-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

// ============================================
// PRODUCER CHAT STORE
// ============================================

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  senderEmail: string;
  content: string;
  createdAt: number;
  isRead: boolean;
}

interface ProducerChatStore {
  messages: ChatMessage[];
  unreadCount: number;
  lastReadAt: number;
  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'createdAt' | 'isRead'>) => void;
  markAllAsRead: () => void;
  getUnreadCount: () => number;
  clearMessages: () => void;
}

export const useProducerChatStore = create<ProducerChatStore>()(
  persist(
    (set, get) => ({
      messages: [],
      unreadCount: 0,
      lastReadAt: 0,

      addMessage: (messageData) => {
        const now = Date.now();
        const newMessage: ChatMessage = {
          ...messageData,
          id: `msg-${now}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: now,
          isRead: false,
        };
        set((state) => ({
          messages: [...state.messages, newMessage],
          unreadCount: state.unreadCount + 1,
        }));
      },

      markAllAsRead: () => {
        const now = Date.now();
        set((state) => ({
          messages: state.messages.map((msg) => ({ ...msg, isRead: true })),
          unreadCount: 0,
          lastReadAt: now,
        }));
      },

      getUnreadCount: () => {
        const { messages, lastReadAt } = get();
        return messages.filter((msg) => msg.createdAt > lastReadAt).length;
      },

      clearMessages: () =>
        set({
          messages: [],
          unreadCount: 0,
        }),
    }),
    {
      name: 'cbd-producer-chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
