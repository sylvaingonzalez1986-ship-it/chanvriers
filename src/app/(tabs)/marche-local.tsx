import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  FlatList,
} from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Store, ChevronRight, ShoppingCart, ShoppingBag, Check, ChevronDown, ChevronUp, Zap, ClipboardList, Sparkles, X, Star, Leaf } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '@/lib/colors';
import { SUPABASE_URL, SUPABASE_ANON_KEY, getValidSession } from '@/lib/supabase-auth';
import { useDirectSalesCart } from '@/lib/direct-sales-cart';
import LocalMarketOrderModal from '@/components/LocalMarketOrderModal';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { getImageSource } from '@/lib/asset-images';
import { CultureTypeIcons } from '@/components/CultureTypeIcons';
import { PRODUCT_TYPE_COLORS } from '@/lib/producers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 80;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

// Liste des noms de départements français
const DEPARTMENT_NAMES: Record<string, string> = {
  '01': 'Ain',
  '02': 'Aisne',
  '03': 'Allier',
  '04': 'Alpes-de-Haute-Provence',
  '05': 'Hautes-Alpes',
  '06': 'Alpes-Maritimes',
  '07': 'Ardèche',
  '08': 'Ardennes',
  '09': 'Ariège',
  '10': 'Aube',
  '11': 'Aude',
  '12': 'Aveyron',
  '13': 'Bouches-du-Rhône',
  '14': 'Calvados',
  '15': 'Cantal',
  '16': 'Charente',
  '17': 'Charente-Maritime',
  '18': 'Cher',
  '19': 'Corrèze',
  '2A': 'Corse-du-Sud',
  '2B': 'Haute-Corse',
  '21': 'Côte-d\'Or',
  '22': 'Côtes-d\'Armor',
  '23': 'Creuse',
  '24': 'Dordogne',
  '25': 'Doubs',
  '26': 'Drôme',
  '27': 'Eure',
  '28': 'Eure-et-Loir',
  '29': 'Finistère',
  '30': 'Gard',
  '31': 'Haute-Garonne',
  '32': 'Gers',
  '33': 'Gironde',
  '34': 'Hérault',
  '35': 'Ille-et-Vilaine',
  '36': 'Indre',
  '37': 'Indre-et-Loire',
  '38': 'Isère',
  '39': 'Jura',
  '40': 'Landes',
  '41': 'Loir-et-Cher',
  '42': 'Loire',
  '43': 'Haute-Loire',
  '44': 'Loire-Atlantique',
  '45': 'Loiret',
  '46': 'Lot',
  '47': 'Lot-et-Garonne',
  '48': 'Lozère',
  '49': 'Maine-et-Loire',
  '50': 'Manche',
  '51': 'Marne',
  '52': 'Haute-Marne',
  '53': 'Mayenne',
  '54': 'Meurthe-et-Moselle',
  '55': 'Meuse',
  '56': 'Morbihan',
  '57': 'Moselle',
  '58': 'Nièvre',
  '59': 'Nord',
  '60': 'Oise',
  '61': 'Orne',
  '62': 'Pas-de-Calais',
  '63': 'Puy-de-Dôme',
  '64': 'Pyrénées-Atlantiques',
  '65': 'Hautes-Pyrénées',
  '66': 'Pyrénées-Orientales',
  '67': 'Bas-Rhin',
  '68': 'Haut-Rhin',
  '69': 'Rhône',
  '70': 'Haute-Saône',
  '71': 'Saône-et-Loire',
  '72': 'Sarthe',
  '73': 'Savoie',
  '74': 'Haute-Savoie',
  '75': 'Paris',
  '76': 'Seine-Maritime',
  '77': 'Seine-et-Marne',
  '78': 'Yvelines',
  '79': 'Deux-Sèvres',
  '80': 'Somme',
  '81': 'Tarn',
  '82': 'Tarn-et-Garonne',
  '83': 'Var',
  '84': 'Vaucluse',
  '85': 'Vendée',
  '86': 'Vienne',
  '87': 'Haute-Vienne',
  '88': 'Vosges',
  '89': 'Yonne',
  '90': 'Territoire de Belfort',
  '91': 'Essonne',
  '92': 'Hauts-de-Seine',
  '93': 'Seine-Saint-Denis',
  '94': 'Val-de-Marne',
  '95': 'Val-d\'Oise',
};

interface DirectSalesProducer {
  id: string;
  name: string;
  city: string;
  region: string;
  department: string;
  image: string;
  vente_directe_ferme: boolean;
  adresse_retrait: string | null;
  horaires_retrait: string | null;
  instructions_retrait: string | null;
  soil_type?: string;
  climate_type?: string;
  culture_outdoor?: boolean;
  culture_greenhouse?: boolean;
  culture_indoor?: boolean;
  profile_id?: string;
  profile?: {
    company_name: string | null;
    business_name: string | null;
  };
  products?: Array<{
    id: string;
    name: string;
    price_public: number;
    price_pro?: number;
    image: string;
    description: string;
    disponible_vente_directe: boolean;
    stock?: number;
  }>;
}

// Helper pour obtenir le nom d'affichage du producteur (entreprise ou nom)
function getProducerDisplayName(producer: DirectSalesProducer): string {
  // Priorité: company_name > business_name > name
  return producer.profile?.company_name || producer.profile?.business_name || producer.name || 'Producteur';
}

interface DepartmentGroup {
  department: string;
  departmentName: string;
  producers: DirectSalesProducer[];
}

export default function MarcheLocal() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const { producerId: highlightedProducerId } = useLocalSearchParams<{ producerId: string }>();

  const [producers, setProducers] = useState<DirectSalesProducer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);
  const [addedProductIds, setAddedProductIds] = useState<Set<string>>(new Set());
  const [expandedDepartments, setExpandedDepartments] = useState<Set<string>>(new Set());

  // État pour le modal de commande directe
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DirectSalesProduct | null>(null);
  const [selectedProducer, setSelectedProducer] = useState<DirectSalesProducer | null>(null);

  // État pour le carrousel de producteurs (carte Pokémon)
  const [carouselVisible, setCarouselVisible] = useState(false);
  const [carouselProducers, setCarouselProducers] = useState<DirectSalesProducer[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);

  // Direct sales cart
  const addItem = useDirectSalesCart((s) => s.addItem);

  // Grouper les producteurs par département
  const departmentGroups = useMemo(() => {
    const groups: Record<string, DirectSalesProducer[]> = {};
    const seenIds = new Set<string>();

    producers.forEach((producer) => {
      // Éviter les doublons en vérifiant l'ID
      if (seenIds.has(producer.id)) return;
      seenIds.add(producer.id);

      const dept = producer.department || 'Inconnu';
      if (!groups[dept]) {
        groups[dept] = [];
      }
      groups[dept].push(producer);
    });

    // Convertir en tableau et trier par nom de département
    return Object.entries(groups)
      .map(([department, prods]) => ({
        department,
        departmentName: DEPARTMENT_NAMES[department] || department,
        producers: prods,
      }))
      .sort((a, b) => a.departmentName.localeCompare(b.departmentName));
  }, [producers]);

  // Handler pour ajouter un produit au panier
  const handleAddToCart = useCallback(async (
    product: {
      id: string;
      name: string;
      price_public: number;
      price_pro?: number;
      image: string;
      description: string;
      disponible_vente_directe: boolean;
      stock?: number;
    },
    producer: DirectSalesProducer
  ) => {
    if (!product || addingProductId) return;

    setAddingProductId(product.id);

    try {
      const session = await getValidSession();
      if (!session?.user?.id || !session?.access_token) {
        console.log('[MarcheLocal] User not authenticated, redirecting to login');
        router.push('/auth/login');
        return;
      }

      await addItem(session.user.id, session.access_token, {
        product_id: product.id,
        producer_id: producer.id,
        producer_name: producer.name,
        product_name: product.name,
        price: product.price_public ?? 0,
        quantity: 1,
        image: product.image || '',
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setAddedProductIds((prev) => new Set(prev).add(product.id));

      setTimeout(() => {
        setAddedProductIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(product.id);
          return newSet;
        });
      }, 2000);

    } catch (error) {
      console.log('[MarcheLocal] Error adding to cart:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAddingProductId(null);
    }
  }, [addingProductId, addItem]);

  // Handler pour ouvrir le modal de commande directe
  const handleDirectOrder = useCallback(async (
    product: DirectSalesProduct,
    producer: DirectSalesProducer
  ) => {
    console.log('[MarcheLocal] handleDirectOrder called for product:', product.name);

    const session = await getValidSession();
    if (!session?.user?.id || !session?.access_token) {
      console.log('[MarcheLocal] User not authenticated, redirecting to login');
      router.push('/auth/login');
      return;
    }

    console.log('[MarcheLocal] Opening order modal');
    setSelectedProduct(product);
    setSelectedProducer(producer);
    setOrderModalVisible(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Handler appelé après une commande réussie
  const handleOrderSuccess = useCallback((pickupCode: string) => {
    console.log('[MarcheLocal] Order success, pickup code:', pickupCode);
  }, []);

  // Toggle département expansion
  const toggleDepartment = useCallback((department: string, departmentProducers: DirectSalesProducer[]) => {
    // Ouvrir le carrousel avec les producteurs de ce département
    setCarouselProducers(departmentProducers);
    setCarouselIndex(0);
    setCarouselVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Charger les producteurs qui ont des produits disponibles en vente directe
  const loadProducers = async () => {
    console.log('[MarcheLocal] Loading producers with direct sales products...');
    try {
      const productsUrl = `${SUPABASE_URL}/rest/v1/products?select=producer_id&disponible_vente_directe=eq.true&status=eq.published`;

      console.log('[MarcheLocal] Fetching products URL:', productsUrl);
      const productsResponse = await fetch(productsUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Prefer: 'return=representation',
        },
      });

      const responseText = await productsResponse.text();
      console.log('[MarcheLocal] Products response status:', productsResponse.status);

      if (!productsResponse.ok) {
        console.log('[MarcheLocal] Error fetching products, trying fallback...');

        // Joindre avec profiles pour récupérer company_name (nom de l'entreprise)
        const fallbackUrl = `${SUPABASE_URL}/rest/v1/producers?select=id,name,city,region,department,image,vente_directe_ferme,adresse_retrait,horaires_retrait,instructions_retrait,soil_type,climate_type,culture_outdoor,culture_greenhouse,culture_indoor,profile_id,profile:profiles(company_name,business_name)&vente_directe_ferme=eq.true&order=name.asc`;

        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        });

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log('[MarcheLocal] Fallback loaded producers:', fallbackData?.length || 0);
          setProducers(fallbackData || []);
        } else {
          setProducers([]);
        }
        setLoading(false);
        return;
      }

      let productsData;
      try {
        productsData = JSON.parse(responseText);
      } catch {
        console.log('[MarcheLocal] Failed to parse products response');
        setProducers([]);
        setLoading(false);
        return;
      }

      console.log('[MarcheLocal] Products with vente directe:', productsData?.length || 0);

      const producerIds = [...new Set(productsData?.map((p: { producer_id: string }) => p.producer_id).filter(Boolean) || [])] as string[];
      console.log('[MarcheLocal] Unique producer IDs with products:', producerIds.length);

      if (producerIds.length === 0) {
        console.log('[MarcheLocal] No producers with direct sales products');
        setProducers([]);
        setLoading(false);
        return;
      }

      const producerIdsFilter = producerIds.map(id => `"${id}"`).join(',');
      // Joindre avec profiles pour récupérer company_name (nom de l'entreprise)
      const producersUrl = `${SUPABASE_URL}/rest/v1/producers?select=id,name,city,region,department,image,vente_directe_ferme,adresse_retrait,horaires_retrait,instructions_retrait,soil_type,climate_type,culture_outdoor,culture_greenhouse,culture_indoor,profile_id,profile:profiles(company_name,business_name)&id=in.(${producerIdsFilter})&order=name.asc`;

      console.log('[MarcheLocal] Fetching producer details...');
      const producersResponse = await fetch(producersUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
      });

      console.log('[MarcheLocal] Producers response status:', producersResponse.status);

      if (producersResponse.ok) {
        const producersData = await producersResponse.json();
        console.log('[MarcheLocal] Loaded producers:', producersData?.length || 0);

        console.log('[MarcheLocal] Fetching products for producers...');
        const productsForProducers = await fetch(
          `${SUPABASE_URL}/rest/v1/products?select=id,name,price_public,price_pro,image,description,producer_id,disponible_vente_directe,stock&producer_id=in.(${producerIdsFilter})&disponible_vente_directe=eq.true&status=eq.published`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              Pragma: 'no-cache',
            },
          }
        );

        let producersList = producersData || [];

        if (productsForProducers.ok) {
          const allProducts = await productsForProducers.json();
          console.log('[MarcheLocal] Loaded products:', allProducts?.length || 0);

          producersList = producersData.map((producer: DirectSalesProducer) => ({
            ...producer,
            products: (allProducts || []).filter((p: { producer_id: string }) => p.producer_id === producer.id),
          }));
        }

        // Dédupliquer les producteurs par ID pour éviter les doublons dans le carrousel
        const uniqueProducers = producersList.filter(
          (producer: DirectSalesProducer, index: number, self: DirectSalesProducer[]) =>
            index === self.findIndex((p) => p.id === producer.id)
        );
        console.log('[MarcheLocal] Unique producers after dedup:', uniqueProducers.length);

        setProducers(uniqueProducers);
      } else {
        const errorText = await producersResponse.text();
        console.log('[MarcheLocal] Error loading producers:', producersResponse.status, errorText);
        setProducers([]);
      }
    } catch (error) {
      console.log('[MarcheLocal] Error:', error);
      setProducers([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProducers();
    }, [])
  );

  // Scroller vers le producteur spécifique si highlightedProducerId existe
  useEffect(() => {
    if (highlightedProducerId && producers.length > 0) {
      const producer = producers.find(p => p.id === highlightedProducerId);
      if (producer) {
        // Trouver le département et ouvrir le carrousel
        const dept = producer.department || 'Inconnu';
        const deptProducers = producers.filter(p => (p.department || 'Inconnu') === dept);
        const index = deptProducers.findIndex(p => p.id === highlightedProducerId);

        setCarouselProducers(deptProducers);
        setCarouselIndex(index >= 0 ? index : 0);
        setCarouselVisible(true);
      }
    }
  }, [highlightedProducerId, producers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducers();
    setRefreshing(false);
  };

  const handleProducerPress = (producerId: string) => {
    router.push({
      pathname: '/(tabs)/marche-catalogue',
      params: { producerId },
    });
  };

  // Navigation dans le carrousel
  const handlePrevious = useCallback(() => {
    if (carouselIndex > 0) {
      setCarouselIndex(carouselIndex - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [carouselIndex]);

  const handleNext = useCallback(() => {
    if (carouselIndex < carouselProducers.length - 1) {
      setCarouselIndex(carouselIndex + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [carouselIndex, carouselProducers.length]);

  if (loading) {
    return (
      <LinearGradient
        colors={[COLORS.background.nightSky, COLORS.background.mediumBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
      >
        <ActivityIndicator size="large" color={COLORS.primary.gold} />
        <Text className="mt-4" style={{ color: COLORS.text.lightGray }}>
          Chargement des producteurs...
        </Text>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[COLORS.background.nightSky, COLORS.background.mediumBlue]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary.gold} />}
      >
        {/* Header */}
        <View style={{ paddingTop: insets.top + 16 }} className="px-4 mb-6 flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-3xl font-bold" style={{ color: COLORS.text.cream }}>
              Marché local
            </Text>
            <Text className="text-sm mt-2" style={{ color: COLORS.text.lightGray }}>
              Commandez directement chez vos producteurs locaux
            </Text>
            <Text className="text-xs mt-1" style={{ color: COLORS.text.muted }}>
              Paiement sur place lors du retrait
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => router.push('/mes-commandes-marche-local')}
              className="p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(232, 148, 90, 0.19)' }}
            >
              <ClipboardList size={20} color={COLORS.primary.orange} />
            </Pressable>
            <CartButton />
          </View>
        </View>

        {/* Liste des départements */}
        {departmentGroups.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4 py-12">
            <Store size={48} color={COLORS.text.muted} strokeWidth={1.5} />
            <Text className="text-center mt-4" style={{ color: COLORS.text.lightGray }}>
              Aucun producteur ne propose la vente directe pour le moment.
            </Text>
          </View>
        ) : (
          <View className="px-4">
            {departmentGroups.map((group) => (
              <DepartmentCard
                key={group.department}
                department={group.department}
                departmentName={group.departmentName}
                producers={group.producers}
                onPress={() => toggleDepartment(group.department, group.producers)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Carrousel de producteurs (style carte Pokémon) */}
      {carouselVisible && carouselProducers.length > 0 && (
        <ProducerCarousel
          producers={carouselProducers}
          currentIndex={carouselIndex}
          onClose={() => setCarouselVisible(false)}
          onPrevious={carouselIndex > 0 ? handlePrevious : undefined}
          onNext={carouselIndex < carouselProducers.length - 1 ? handleNext : undefined}
          onViewShop={(producerId) => {
            setCarouselVisible(false);
            handleProducerPress(producerId);
          }}
          onAddToCart={handleAddToCart}
          onDirectOrder={handleDirectOrder}
          addingProductId={addingProductId}
          addedProductIds={addedProductIds}
        />
      )}

      {/* Modal de commande directe */}
      {selectedProduct && selectedProducer && (
        <LocalMarketOrderModal
          visible={orderModalVisible}
          onClose={() => {
            setOrderModalVisible(false);
            setSelectedProduct(null);
            setSelectedProducer(null);
          }}
          product={{
            id: selectedProduct.id,
            name: selectedProduct.name,
            price_public: selectedProduct.price_public,
            description: selectedProduct.description,
            image: selectedProduct.image,
            stock: selectedProduct.stock,
          }}
          producer={{
            id: selectedProducer.id,
            name: selectedProducer.name,
            city: selectedProducer.city,
            region: selectedProducer.region,
            adresse_retrait: selectedProducer.adresse_retrait || undefined,
            horaires_retrait: selectedProducer.horaires_retrait || undefined,
            instructions_retrait: selectedProducer.instructions_retrait || undefined,
          }}
          onOrderSuccess={handleOrderSuccess}
        />
      )}
    </LinearGradient>
  );
}

// Type pour un produit individuel
type DirectSalesProduct = {
  id: string;
  name: string;
  price_public: number;
  price_pro?: number;
  image: string;
  description: string;
  disponible_vente_directe: boolean;
  stock?: number;
  ville_retrait?: string;
};

// Carte de département
interface DepartmentCardProps {
  department: string;
  departmentName: string;
  producers: DirectSalesProducer[];
  onPress: () => void;
}

function DepartmentCard({ department, departmentName, producers, onPress }: DepartmentCardProps) {
  const producerCount = producers.length;
  const productCount = producers.reduce((acc, p) => acc + (p.products?.length || 0), 0);

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-2xl overflow-hidden active:opacity-80"
    >
      <LinearGradient
        colors={['rgba(90, 158, 90, 0.12)', 'rgba(212, 168, 83, 0.06)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          padding: 16,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: 'rgba(90, 158, 90, 0.25)',
        }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1">
            <View
              className="w-12 h-12 rounded-xl items-center justify-center mr-3"
              style={{ backgroundColor: 'rgba(212, 168, 83, 0.15)' }}
            >
              <MapPin size={24} color={COLORS.primary.gold} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold" style={{ color: COLORS.text.cream }}>
                {departmentName}
              </Text>
              <View className="flex-row items-center mt-1">
                <View className="flex-row items-center mr-4">
                  <Store size={14} color={COLORS.accent.hemp} />
                  <Text className="text-sm ml-1" style={{ color: COLORS.accent.hemp }}>
                    {producerCount} producteur{producerCount > 1 ? 's' : ''}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <ShoppingBag size={14} color={COLORS.text.muted} />
                  <Text className="text-sm ml-1" style={{ color: COLORS.text.muted }}>
                    {productCount} produit{productCount > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(90, 158, 90, 0.19)' }}
          >
            <ChevronRight size={20} color={COLORS.accent.hemp} />
          </View>
        </View>

        {/* Aperçu des producteurs */}
        <View className="flex-row mt-3 -space-x-2">
          {producers.slice(0, 5).map((producer, index) => (
            <View
              key={producer.id}
              className="w-10 h-10 rounded-full overflow-hidden"
              style={{
                borderWidth: 2,
                borderColor: COLORS.background.nightSky,
                marginLeft: index > 0 ? -8 : 0,
                zIndex: 5 - index,
              }}
            >
              {producer.image ? (
                <Image
                  source={getImageSource(producer.image)}
                  className="w-full h-full"
                />
              ) : (
                <View className="w-full h-full items-center justify-center" style={{ backgroundColor: COLORS.accent.hemp }}>
                  <Store size={16} color={COLORS.text.white} />
                </View>
              )}
            </View>
          ))}
          {producers.length > 5 && (
            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{
                backgroundColor: 'rgba(212, 168, 83, 0.25)',
                borderWidth: 2,
                borderColor: COLORS.background.nightSky,
                marginLeft: -8,
              }}
            >
              <Text className="text-xs font-bold" style={{ color: COLORS.primary.gold }}>
                +{producers.length - 5}
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

// Carrousel de producteurs (style carte Pokémon)
interface ProducerCarouselProps {
  producers: DirectSalesProducer[];
  currentIndex: number;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onViewShop: (producerId: string) => void;
  onAddToCart: (product: DirectSalesProduct, producer: DirectSalesProducer) => Promise<void>;
  onDirectOrder: (product: DirectSalesProduct, producer: DirectSalesProducer) => Promise<void>;
  addingProductId: string | null;
  addedProductIds: Set<string>;
}

function ProducerCarousel({
  producers,
  currentIndex,
  onClose,
  onPrevious,
  onNext,
  onViewShop,
  onAddToCart,
  onDirectOrder,
  addingProductId,
  addedProductIds,
}: ProducerCarouselProps) {
  const producer = producers[currentIndex];

  // Glow animation
  const glowOpacity = useSharedValue(0.4);
  const starRotation = useSharedValue(0);

  React.useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 2000 }),
        withTiming(0.4, { duration: 2000 })
      ),
      -1,
      true
    );
    starRotation.value = withRepeat(
      withTiming(360, { duration: 8000 }),
      -1,
      false
    );
  }, [glowOpacity, starRotation]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${starRotation.value}deg` }],
  }));

  // Obtenir les types de produits uniques
  const productTypes = [...new Set(producer.products?.map(p => 'fleur') || [])];

  // Ville de retrait (utilise la ville du producteur)
  const pickupCity = producer.city;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(15, 26, 46, 0.95)' }}
    >
      {/* Backdrop press to close */}
      <Pressable className="absolute inset-0" onPress={onClose} />

      {/* Navigation arrows */}
      {onPrevious && (
        <Pressable
          onPress={onPrevious}
          className="absolute left-2 z-20 w-12 h-12 rounded-full items-center justify-center active:scale-95"
          style={{
            backgroundColor: `${COLORS.background.nightSky}E0`,
            borderWidth: 2,
            borderColor: COLORS.primary.gold,
            shadowColor: COLORS.primary.gold,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
          }}
        >
          <ChevronDown size={28} color={COLORS.primary.brightYellow} style={{ transform: [{ rotate: '90deg' }] }} />
        </Pressable>
      )}
      {onNext && (
        <Pressable
          onPress={onNext}
          className="absolute right-2 z-20 w-12 h-12 rounded-full items-center justify-center active:scale-95"
          style={{
            backgroundColor: `${COLORS.background.nightSky}E0`,
            borderWidth: 2,
            borderColor: COLORS.primary.gold,
            shadowColor: COLORS.primary.gold,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
          }}
        >
          <ChevronDown size={28} color={COLORS.primary.brightYellow} style={{ transform: [{ rotate: '-90deg' }] }} />
        </Pressable>
      )}

      {/* Counter indicator */}
      {producers.length > 1 && (
        <View
          className="absolute bottom-8 px-4 py-2 rounded-full"
          style={{
            backgroundColor: `${COLORS.background.nightSky}E0`,
            borderWidth: 1.5,
            borderColor: 'rgba(212, 168, 83, 0.31)',
          }}
        >
          <Text style={{ color: COLORS.primary.paleGold }} className="font-bold text-sm">
            {currentIndex + 1} / {producers.length}
          </Text>
        </View>
      )}

      {/* Magical glow effect behind card */}
      <Animated.View
        style={[
          glowStyle,
          {
            position: 'absolute',
            width: CARD_WIDTH + 30,
            height: CARD_HEIGHT + 30,
            borderRadius: 32,
            backgroundColor: COLORS.primary.gold,
            shadowColor: COLORS.primary.brightYellow,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 1,
            shadowRadius: 40,
          },
        ]}
      />

      {/* Secondary glow - green accent */}
      <Animated.View
        style={[
          glowStyle,
          {
            position: 'absolute',
            width: CARD_WIDTH + 20,
            height: CARD_HEIGHT + 20,
            borderRadius: 30,
            backgroundColor: COLORS.accent.forest,
            shadowColor: COLORS.accent.hemp,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 30,
            opacity: 0.3,
          },
        ]}
      />

      {/* Decorative floating stars */}
      <Animated.View style={[starStyle, { position: 'absolute', top: '15%', left: '10%' }]}>
        <Star size={16} color={COLORS.primary.brightYellow} fill={COLORS.primary.brightYellow} />
      </Animated.View>
      <Animated.View style={[starStyle, { position: 'absolute', top: '20%', right: '15%' }]}>
        <Sparkles size={14} color={COLORS.clouds.golden} />
      </Animated.View>

      {/* Main Card */}
      <Animated.View
        entering={ZoomIn.springify().damping(14)}
        style={{
          width: CARD_WIDTH,
          height: CARD_HEIGHT,
          borderRadius: 28,
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={[COLORS.primary.gold, COLORS.primary.orange, COLORS.clouds.golden]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, padding: 4 }}
        >
          {/* Inner card with night sky background */}
          <View
            className="flex-1 rounded-[24px] overflow-hidden"
            style={{ backgroundColor: COLORS.background.nightSky }}
          >
            {/* Close button */}
            <Pressable
              onPress={onClose}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full items-center justify-center"
              style={{
                backgroundColor: `${COLORS.background.nightSky}90`,
                borderWidth: 1.5,
                borderColor: 'rgba(212, 168, 83, 0.31)',
              }}
            >
              <X size={18} color={COLORS.primary.paleGold} />
            </Pressable>

            {/* Card header with image */}
            <View className="h-[35%] relative">
              {producer.image ? (
                <Image
                  source={getImageSource(producer.image)}
                  className="w-full h-full"
                  resizeMode="cover"
                  onError={(e) => {
                    console.log('[MarcheLocal] Image load error for producer:', producer.name, {
                      image: producer.image,
                      imageSource: getImageSource(producer.image),
                      error: e.nativeEvent.error
                    });
                  }}
                  onLoad={() => {
                    console.log('[MarcheLocal] Image loaded successfully for:', producer.name);
                  }}
                />
              ) : (
                <View className="w-full h-full items-center justify-center" style={{ backgroundColor: 'rgba(255, 255, 255, 0.06)' }}>
                  <Store size={48} color={COLORS.text.muted} />
                </View>
              )}
              {/* Gradient overlay */}
              <LinearGradient
                colors={['transparent', `${COLORS.background.nightSky}99`, COLORS.background.nightSky]}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 80,
                }}
              />

              {/* Sparkle decorations on image */}
              <View className="absolute top-4 left-4">
                <Sparkles size={20} color={COLORS.primary.brightYellow} />
              </View>

              {/* Badge Vente directe */}
              <View
                className="absolute top-4 right-14 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(90, 158, 90, 0.56)' }}
              >
                <Text className="text-xs font-bold" style={{ color: COLORS.text.white }}>
                  Vente directe
                </Text>
              </View>
            </View>

            {/* Card content */}
            <ScrollView
              className="flex-1 px-4 -mt-4"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {/* Name banner */}
              <View
                className="rounded-2xl px-4 py-3 mb-3"
                style={{
                  backgroundColor: 'rgba(212, 168, 83, 0.15)',
                  borderWidth: 2,
                  borderColor: 'rgba(212, 168, 83, 0.31)',
                }}
              >
                <View className="flex-row items-center justify-center">
                  <Sparkles size={16} color={COLORS.primary.brightYellow} />
                  <Text
                    className="text-lg font-bold text-center mx-2"
                    style={{ color: COLORS.primary.paleGold }}
                    numberOfLines={1}
                  >
                    {getProducerDisplayName(producer)}
                  </Text>
                  <Sparkles size={16} color={COLORS.primary.brightYellow} />
                </View>
              </View>

              {/* Ville de retrait - MISE EN AVANT */}
              <View
                className="rounded-xl px-4 py-3 mb-3"
                style={{
                  backgroundColor: 'rgba(74, 155, 155, 0.12)',
                  borderWidth: 2,
                  borderColor: 'rgba(74, 155, 155, 0.31)',
                }}
              >
                <View className="flex-row items-center justify-center">
                  <MapPin size={18} color={COLORS.accent.teal} />
                  <Text
                    className="text-base font-bold ml-2"
                    style={{ color: COLORS.accent.teal }}
                  >
                    Retrait à {pickupCity}
                  </Text>
                </View>
              </View>

              {/* Location et département */}
              <View className="flex-row items-center justify-center mb-3">
                <View
                  className="flex-row items-center px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: 'rgba(147, 112, 219, 0.2)' }}
                >
                  <MapPin size={14} color="#9370DB" />
                  <Text
                    className="text-sm ml-1.5 font-semibold"
                    style={{ color: '#9370DB' }}
                  >
                    {[
                      producer.department ? DEPARTMENT_NAMES[producer.department] || producer.department : '',
                      producer.region
                    ].filter(Boolean).join(', ')}
                  </Text>
                </View>
              </View>

              {/* Attributs du terroir */}
              <View className="mb-3">
                {/* Terre */}
                {producer.soil_type && (
                  <View
                    className="flex-row items-center px-3 py-2 rounded-xl mb-2"
                    style={{
                      backgroundColor: 'rgba(121, 85, 72, 0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(121, 85, 72, 0.19)',
                    }}
                  >
                    <View
                      className="w-6 h-6 rounded-md items-center justify-center mr-2"
                      style={{ backgroundColor: COLORS.characteristics.terre }}
                    >
                      <Leaf size={12} color="#FFFFFF" />
                    </View>
                    <Text style={{ color: COLORS.characteristics.terre }} className="text-xs font-bold uppercase">Terre</Text>
                    <Text style={{ color: COLORS.characteristics.terre }} className="text-sm font-bold ml-auto">{producer.soil_type}</Text>
                  </View>
                )}

                {/* Climat */}
                {producer.climate_type && (
                  <View
                    className="flex-row items-center px-3 py-2 rounded-xl"
                    style={{
                      backgroundColor: 'rgba(33, 150, 243, 0.1)',
                      borderWidth: 1,
                      borderColor: 'rgba(33, 150, 243, 0.19)',
                    }}
                  >
                    <View
                      className="w-6 h-6 rounded-md items-center justify-center mr-2"
                      style={{ backgroundColor: COLORS.characteristics.climat }}
                    >
                      <Sparkles size={12} color="#FFFFFF" />
                    </View>
                    <Text style={{ color: COLORS.characteristics.climat }} className="text-xs font-bold uppercase">Climat</Text>
                    <Text style={{ color: COLORS.characteristics.climat }} className="text-sm font-bold ml-auto">{producer.climate_type}</Text>
                  </View>
                )}
              </View>

              {/* Culture type icons */}
              <View className="flex-row items-center justify-center mb-3">
                <CultureTypeIcons
                  outdoor={producer.culture_outdoor === true}
                  greenhouse={producer.culture_greenhouse === true}
                  indoor={producer.culture_indoor === true}
                  size={18}
                  animated={true}
                />
              </View>

              {/* Produits disponibles */}
              {producer.products && producer.products.length > 0 && (
                <View className="mb-3">
                  <Text className="text-sm font-semibold mb-2" style={{ color: COLORS.text.lightGray }}>
                    Produits disponibles ({producer.products.length})
                  </Text>
                  {producer.products.slice(0, 3).map((product) => {
                    // Force stock to number and log for debugging
                    const stockValue = typeof product.stock === 'string' ? parseInt(product.stock, 10) : (product.stock ?? 0);
                    const isOutOfStock = typeof stockValue === 'number' && !isNaN(stockValue) && stockValue <= 0;
                    console.log('[MarcheLocal] Product stock check:', { name: product.name, rawStock: product.stock, parsedStock: stockValue, isOutOfStock });
                    return (
                      <View
                        key={product.id}
                        className="rounded-xl mb-2 overflow-hidden"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          borderWidth: 1,
                          borderColor: isOutOfStock ? 'rgba(199, 91, 91, 0.19)' : 'rgba(90, 158, 90, 0.19)',
                          opacity: isOutOfStock ? 0.6 : 1,
                        }}
                      >
                        <View className="flex-row p-2 items-center">
                          {product.image ? (
                            <Image
                              source={{ uri: product.image }}
                              className="w-12 h-12 rounded-lg mr-2"
                            />
                          ) : (
                            <View className="w-12 h-12 rounded-lg mr-2 items-center justify-center" style={{ backgroundColor: 'rgba(90, 158, 90, 0.12)' }}>
                              <ShoppingBag size={16} color={COLORS.accent.hemp} />
                            </View>
                          )}
                          <View className="flex-1">
                            <Text className="text-sm font-bold" style={{ color: COLORS.text.cream }} numberOfLines={1}>
                              {product.name}
                            </Text>
                            <Text className="text-base font-bold" style={{ color: COLORS.primary.gold }}>
                              {(product.price_public ?? 0).toFixed(2)}€
                            </Text>
                          </View>
                          {!isOutOfStock && (
                            <Pressable
                              onPress={() => onDirectOrder(product, producer)}
                              className="px-3 py-2 rounded-lg"
                              style={{ backgroundColor: 'rgba(232, 148, 90, 0.12)' }}
                            >
                              <Zap size={16} color={COLORS.primary.orange} />
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* View shop button */}
              <Pressable
                onPress={() => onViewShop(producer.id)}
                className="rounded-2xl py-3.5 flex-row items-center justify-center active:opacity-80"
                style={{
                  backgroundColor: COLORS.accent.forest,
                  shadowColor: COLORS.accent.hemp,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                }}
              >
                <ShoppingBag size={18} color={COLORS.text.white} />
                <Text
                  className="font-bold ml-2"
                  style={{ color: COLORS.text.white }}
                >
                  Voir tous les produits
                </Text>
                <Sparkles size={14} color={COLORS.primary.brightYellow} style={{ marginLeft: 8 }} />
              </Pressable>
            </ScrollView>

            {/* Card border shine effect */}
            <View
              pointerEvents="none"
              className="absolute inset-0 rounded-[24px]"
              style={{
                borderWidth: 2,
                borderColor: 'rgba(212, 168, 83, 0.25)',
              }}
            />
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}

function CartButton() {
  const cart = useDirectSalesCart((s) => s);
  const itemCount = cart.items.length;

  return (
    <Pressable
      onPress={() => router.push('/panier-vente-directe')}
      className="p-3 rounded-lg relative"
      style={{ backgroundColor: 'rgba(90, 158, 90, 0.19)' }}
    >
      <ShoppingCart size={20} color={COLORS.accent.hemp} />
      {itemCount > 0 && (
        <View
          className="absolute top-0 right-0 w-5 h-5 rounded-full items-center justify-center"
          style={{ backgroundColor: COLORS.accent.red }}
        >
          <Text className="text-xs font-bold" style={{ color: COLORS.text.white }}>
            {itemCount > 99 ? '99+' : itemCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
