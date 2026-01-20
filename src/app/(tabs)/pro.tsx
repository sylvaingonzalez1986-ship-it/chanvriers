import React, { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Image,
  Modal,
  RefreshControl,
  TextInput as RNTextInput,
} from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Briefcase,
  ShoppingCart,
  Search,
  Filter,
  X,
  Check,
  ChevronDown,
  Package,
  Star,
  Leaf,
  Building2,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { COLORS } from '@/lib/colors';
import {
  useProducerStore,
  useCartStore,
  PromoProduct,
} from '@/lib/store';
import {
  Producer,
  SAMPLE_PRODUCERS,
  ProducerProduct,
  PRODUCT_TYPE_LABELS,
  PRODUCT_TYPE_COLORS,
} from '@/lib/producers';
import { usePricingContext } from '@/lib/useProductPricing';
import { usePermissions } from '@/lib/useAuth';

// Type pour les filtres
interface Filters {
  search: string;
  producerId: string | null;
  productType: ProducerProduct['type'] | null;
  minPrice: number | null;
  maxPrice: number | null;
}

export default function ProScreen() {
  const insets = useSafeAreaInsets();
  const addToCart = useCartStore((s) => s.addToCart);
  const customProducers = useProducerStore((s) => s.producers);

  // Permissions et pricing
  const { isPro, isAdmin, isProApproved, isProPending, isProRejected } = usePermissions();
  const { pricingMode } = usePricingContext();

  // États - tous les hooks doivent être appelés avant tout return conditionnel
  const [showAddedToast, setShowAddedToast] = useState(false);
  const [addedProductName, setAddedProductName] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    producerId: null,
    productType: null,
    minPrice: null,
    maxPrice: null,
  });

  // Combinaison des producteurs
  const allProducers = useMemo(
    () => [...SAMPLE_PRODUCERS, ...customProducers],
    [customProducers]
  );

  // Extraire tous les produits visibles pour les pros
  const allProProducts = useMemo(() => {
    const products: Array<{
      product: ProducerProduct;
      producer: Producer;
    }> = [];

    allProducers.forEach((producer) => {
      producer.products.forEach((product) => {
        // Filtrer par visible_for_pros (si le champ existe)
        // Pour la compatibilité, on considère tous les produits comme visibles par défaut
        const isVisibleForPros = (product as any).visibleForPros !== false;
        const isPublished = (product as any).status !== 'draft' && (product as any).status !== 'archived';

        if (isVisibleForPros && isPublished) {
          products.push({ product, producer });
        }
      });
    });

    return products;
  }, [allProducers]);

  // Appliquer les filtres
  const filteredProducts = useMemo(() => {
    return allProProducts.filter(({ product, producer }) => {
      // Filtre recherche
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = product.name.toLowerCase().includes(searchLower);
        const matchesProducer = producer.name.toLowerCase().includes(searchLower);
        const matchesType = PRODUCT_TYPE_LABELS[product.type]?.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesProducer && !matchesType) return false;
      }

      // Filtre producteur
      if (filters.producerId && producer.id !== filters.producerId) return false;

      // Filtre type
      if (filters.productType && product.type !== filters.productType) return false;

      // Filtre prix
      const price = (product as any).pricePro ?? product.price;
      if (filters.minPrice !== null && price < filters.minPrice) return false;
      if (filters.maxPrice !== null && price > filters.maxPrice) return false;

      return true;
    });
  }, [allProProducts, filters]);

  // Types de produits uniques pour le filtre
  const productTypes = useMemo(() => {
    const types = new Set<ProducerProduct['type']>();
    allProProducts.forEach(({ product }) => types.add(product.type));
    return Array.from(types);
  }, [allProProducts]);

  // Helper pour obtenir le prix pro
  const getProPrice = (product: ProducerProduct) => {
    return (product as any).pricePro ?? product.price ?? 0;
  };

  // Refresh
  const onRefresh = async () => {
    setRefreshing(true);
    // Simuler un rechargement
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  // Ajouter au panier
  const handleAddToCart = (product: ProducerProduct, producer: Producer) => {
    const proPrice = getProPrice(product);
    addToCart(
      {
        ...product,
        price: proPrice, // Utiliser le prix pro
      },
      producer.id,
      producer.name
    );
    setAddedProductName(product.name);
    setShowAddedToast(true);
    setTimeout(() => setShowAddedToast(false), 2000);
  };

  // Reset filtres
  const resetFilters = () => {
    setFilters({
      search: '',
      producerId: null,
      productType: null,
      minPrice: null,
      maxPrice: null,
    });
  };

  // Vérifier si des filtres sont actifs
  const hasActiveFilters =
    filters.producerId !== null ||
    filters.productType !== null ||
    filters.minPrice !== null ||
    filters.maxPrice !== null;

  // Si l'utilisateur est pro mais pas encore approuvé, afficher le message d'attente
  if (isPro && !isProApproved && !isAdmin) {
    return (
      <View className="flex-1" style={{ backgroundColor: COLORS.background.dark }}>
        <LinearGradient
          colors={[COLORS.background.nightSky, COLORS.background.charcoal]}
          style={{
            paddingTop: insets.top + 12,
            paddingHorizontal: 20,
            paddingBottom: 16,
          }}
        >
          <View className="flex-row items-center">
            <View
              className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
              style={{ backgroundColor: `${COLORS.accent.teal}20` }}
            >
              <Briefcase size={24} color={COLORS.accent.teal} />
            </View>
            <View className="flex-1">
              <Text style={{ color: COLORS.text.cream }} className="text-2xl font-bold">
                Espace Pro
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View className="flex-1 items-center justify-center px-8">
          {isProPending && (
            <Animated.View entering={FadeInDown.duration(500)} className="items-center">
              <View
                className="w-24 h-24 rounded-full items-center justify-center mb-6"
                style={{ backgroundColor: '#F59E0B20' }}
              >
                <Clock size={48} color="#F59E0B" />
              </View>
              <Text
                style={{ color: COLORS.text.cream }}
                className="text-2xl font-bold text-center mb-4"
              >
                Compte en attente de validation
              </Text>
              <Text
                style={{ color: COLORS.text.muted }}
                className="text-base text-center mb-6"
              >
                Votre demande de compte professionnel est en cours d'examen par notre equipe.
                Vous recevrez une notification des que votre compte sera valide.
              </Text>
              <View
                className="rounded-2xl p-4 w-full"
                style={{ backgroundColor: '#F59E0B15', borderWidth: 1, borderColor: '#F59E0B30' }}
              >
                <View className="flex-row items-center mb-2">
                  <Clock size={16} color="#F59E0B" />
                  <Text style={{ color: '#F59E0B' }} className="font-semibold ml-2">
                    Delai de traitement
                  </Text>
                </View>
                <Text style={{ color: COLORS.text.muted }} className="text-sm">
                  Les demandes sont generalement traitees sous 24 a 48 heures ouvrees.
                </Text>
              </View>
            </Animated.View>
          )}

          {isProRejected && (
            <Animated.View entering={FadeInDown.duration(500)} className="items-center">
              <View
                className="w-24 h-24 rounded-full items-center justify-center mb-6"
                style={{ backgroundColor: '#EF444420' }}
              >
                <AlertCircle size={48} color="#EF4444" />
              </View>
              <Text
                style={{ color: COLORS.text.cream }}
                className="text-2xl font-bold text-center mb-4"
              >
                Demande refusee
              </Text>
              <Text
                style={{ color: COLORS.text.muted }}
                className="text-base text-center mb-6"
              >
                Votre demande de compte professionnel n'a pas ete approuvee.
                Contactez-nous pour plus d'informations.
              </Text>
              <View
                className="rounded-2xl p-4 w-full"
                style={{ backgroundColor: '#EF444415', borderWidth: 1, borderColor: '#EF444430' }}
              >
                <Text style={{ color: COLORS.text.muted }} className="text-sm text-center">
                  contact@leschanvriersunys.fr
                </Text>
              </View>
            </Animated.View>
          )}
        </View>
      </View>
    );
  }

  // Rendu d'une carte produit
  const renderProductCard = (
    { product, producer }: { product: ProducerProduct; producer: Producer },
    index: number
  ) => {
    const proPrice = getProPrice(product);
    const originalPrice = product.price ?? 0;
    const hasDiscount = proPrice < originalPrice && originalPrice > 0;
    const discountPercent = hasDiscount
      ? Math.round(((originalPrice - proPrice) / originalPrice) * 100)
      : 0;
    const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;

    return (
      <Animated.View
        key={`${producer.id}-${product.id}`}
        entering={FadeInDown.duration(400).delay(index * 50)}
        className="mb-4"
        style={{ opacity: isOutOfStock ? 0.7 : 1 }}
      >
        <Pressable
          onPress={() => !isOutOfStock && handleAddToCart(product, producer)}
          disabled={isOutOfStock}
          className="rounded-2xl overflow-hidden active:opacity-90"
          style={{
            backgroundColor: COLORS.background.charcoal,
            borderWidth: 1,
            borderColor: isOutOfStock ? `${COLORS.accent.red}40` : `${COLORS.accent.teal}30`,
          }}
        >
          {/* Image */}
          <View className="h-36 relative">
            {product.image ? (
              <Image
                source={{ uri: product.image }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View
                className="w-full h-full items-center justify-center"
                style={{ backgroundColor: `${COLORS.text.muted}20` }}
              >
                <Leaf size={40} color={COLORS.text.muted} />
              </View>
            )}
            {/* Overlay grisé si rupture */}
            {isOutOfStock && (
              <View
                className="absolute inset-0"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
              />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 60,
              }}
            />

            {/* Badge PRO ou RUPTURE */}
            {isOutOfStock ? (
              <View
                className="absolute top-3 left-3 px-3 py-1.5 rounded-full flex-row items-center"
                style={{ backgroundColor: COLORS.accent.red }}
              >
                <Text className="text-white font-bold text-xs">RUPTURE</Text>
              </View>
            ) : (
              <View
                className="absolute top-3 left-3 px-3 py-1.5 rounded-full flex-row items-center"
                style={{ backgroundColor: COLORS.accent.teal }}
              >
                <Briefcase size={12} color={COLORS.text.white} />
                <Text className="text-white font-bold text-xs ml-1">PRO</Text>
              </View>
            )}

            {/* Badge réduction */}
            {hasDiscount && !isOutOfStock && (
              <View
                className="absolute top-3 right-3 px-2 py-1 rounded-full"
                style={{ backgroundColor: COLORS.accent.hemp }}
              >
                <Text className="text-white font-bold text-xs">-{discountPercent}%</Text>
              </View>
            )}

            {/* Type de produit */}
            <View
              className="absolute bottom-3 left-3 px-2 py-1 rounded-full"
              style={{ backgroundColor: `${PRODUCT_TYPE_COLORS[product.type]}90` }}
            >
              <Text style={{ color: COLORS.text.white }} className="font-semibold text-xs">
                {PRODUCT_TYPE_LABELS[product.type]}
              </Text>
            </View>
          </View>

          {/* Contenu */}
          <View className="p-4">
            <Text style={{ color: COLORS.text.cream }} className="font-bold text-lg mb-1">
              {product.name}
            </Text>
            <View className="flex-row items-center mb-2">
              <Building2 size={12} color={COLORS.text.muted} />
              <Text style={{ color: COLORS.text.muted }} className="text-sm ml-1">
                {producer.name}
              </Text>
            </View>

            {/* CBD/THC */}
            <View className="flex-row mb-3">
              <View
                className="px-2 py-1 rounded mr-2"
                style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
              >
                <Text style={{ color: COLORS.accent.hemp }} className="text-xs font-medium">
                  CBD {product.cbdPercent}%
                </Text>
              </View>
              <View
                className="px-2 py-1 rounded"
                style={{ backgroundColor: `${COLORS.text.muted}20` }}
              >
                <Text style={{ color: COLORS.text.muted }} className="text-xs font-medium">
                  THC {product.thcPercent}%
                </Text>
              </View>
              {product.weight && (
                <View
                  className="px-2 py-1 rounded ml-2"
                  style={{ backgroundColor: `${COLORS.primary.gold}20` }}
                >
                  <Text style={{ color: COLORS.primary.paleGold }} className="text-xs font-medium">
                    {product.weight}
                  </Text>
                </View>
              )}
            </View>

            {/* Prix et bouton */}
            <View className="flex-row items-center justify-between">
              <View>
                {hasDiscount && (
                  <Text
                    style={{
                      color: COLORS.text.muted,
                      textDecorationLine: 'line-through',
                      fontSize: 12,
                    }}
                  >
                    {originalPrice.toFixed(2)}€
                  </Text>
                )}
                <Text style={{ color: COLORS.accent.teal }} className="font-bold text-xl">
                  {proPrice.toFixed(2)}€
                </Text>
              </View>

              {isOutOfStock ? (
                <View
                  className="px-4 py-2.5 rounded-xl flex-row items-center"
                  style={{ backgroundColor: `${COLORS.accent.red}20`, borderWidth: 1, borderColor: `${COLORS.accent.red}40` }}
                >
                  <Text style={{ color: COLORS.accent.red }} className="font-semibold">
                    Rupture de stock
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => handleAddToCart(product, producer)}
                  className="px-4 py-2.5 rounded-xl flex-row items-center"
                  style={{ backgroundColor: COLORS.accent.teal }}
                >
                  <ShoppingCart size={16} color={COLORS.text.white} />
                  <Text style={{ color: COLORS.text.white }} className="font-semibold ml-2">
                    Ajouter
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background.dark }}>
      {/* Toast ajouté au panier */}
      {showAddedToast && (
        <Animated.View
          entering={FadeInUp.duration(300)}
          className="absolute top-20 left-6 right-6 z-50"
        >
          <View
            className="rounded-2xl p-4 flex-row items-center"
            style={{
              backgroundColor: COLORS.accent.teal,
              shadowColor: COLORS.accent.teal,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
            }}
          >
            <Check size={24} color={COLORS.text.white} />
            <Text style={{ color: COLORS.text.white }} className="font-bold ml-3 flex-1">
              {addedProductName} ajouté !
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Modal Filtres */}
      <Modal
        visible={showFilters}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilters(false)}
      >
        <View className="flex-1 bg-black/80 justify-end">
          <View
            className="rounded-t-3xl p-6"
            style={{
              backgroundColor: COLORS.background.charcoal,
              paddingBottom: insets.bottom + 20,
            }}
          >
            <View className="flex-row items-center justify-between mb-6">
              <Text style={{ color: COLORS.text.cream }} className="text-xl font-bold">
                Filtres
              </Text>
              <Pressable onPress={() => setShowFilters(false)}>
                <X size={24} color={COLORS.text.muted} />
              </Pressable>
            </View>

            {/* Filtre producteur */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="font-medium mb-2">
                Producteur
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable
                  onPress={() => setFilters((f) => ({ ...f, producerId: null }))}
                  className="px-4 py-2 rounded-full mr-2"
                  style={{
                    backgroundColor:
                      filters.producerId === null ? COLORS.accent.teal : `${COLORS.text.muted}20`,
                  }}
                >
                  <Text
                    style={{
                      color: filters.producerId === null ? COLORS.text.white : COLORS.text.muted,
                    }}
                  >
                    Tous
                  </Text>
                </Pressable>
                {allProducers.map((producer) => (
                  <Pressable
                    key={producer.id}
                    onPress={() => setFilters((f) => ({ ...f, producerId: producer.id }))}
                    className="px-4 py-2 rounded-full mr-2"
                    style={{
                      backgroundColor:
                        filters.producerId === producer.id
                          ? COLORS.accent.teal
                          : `${COLORS.text.muted}20`,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          filters.producerId === producer.id
                            ? COLORS.text.white
                            : COLORS.text.muted,
                      }}
                    >
                      {producer.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Filtre type */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="font-medium mb-2">
                Type de produit
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Pressable
                  onPress={() => setFilters((f) => ({ ...f, productType: null }))}
                  className="px-4 py-2 rounded-full mr-2"
                  style={{
                    backgroundColor:
                      filters.productType === null ? COLORS.accent.teal : `${COLORS.text.muted}20`,
                  }}
                >
                  <Text
                    style={{
                      color: filters.productType === null ? COLORS.text.white : COLORS.text.muted,
                    }}
                  >
                    Tous
                  </Text>
                </Pressable>
                {productTypes.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setFilters((f) => ({ ...f, productType: type }))}
                    className="px-4 py-2 rounded-full mr-2"
                    style={{
                      backgroundColor:
                        filters.productType === type
                          ? PRODUCT_TYPE_COLORS[type]
                          : `${COLORS.text.muted}20`,
                    }}
                  >
                    <Text
                      style={{
                        color:
                          filters.productType === type ? COLORS.text.white : COLORS.text.muted,
                      }}
                    >
                      {PRODUCT_TYPE_LABELS[type]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Boutons */}
            <View className="flex-row mt-4">
              <Pressable
                onPress={resetFilters}
                className="flex-1 py-3 rounded-xl mr-2"
                style={{ backgroundColor: `${COLORS.text.muted}20` }}
              >
                <Text style={{ color: COLORS.text.muted }} className="text-center font-semibold">
                  Réinitialiser
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setShowFilters(false)}
                className="flex-1 py-3 rounded-xl ml-2"
                style={{ backgroundColor: COLORS.accent.teal }}
              >
                <Text style={{ color: COLORS.text.white }} className="text-center font-semibold">
                  Appliquer
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <LinearGradient
        colors={[COLORS.background.nightSky, COLORS.background.charcoal]}
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 16,
        }}
      >
        <View className="flex-row items-center mb-4">
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
            style={{ backgroundColor: `${COLORS.accent.teal}20` }}
          >
            <Briefcase size={24} color={COLORS.accent.teal} />
          </View>
          <View className="flex-1">
            <Text style={{ color: COLORS.text.cream }} className="text-2xl font-bold">
              Espace Pro
            </Text>
            <Text style={{ color: COLORS.text.muted }} className="text-sm">
              {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} disponible{filteredProducts.length > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Barre de recherche */}
        <View className="flex-row items-center">
          <View
            className="flex-1 flex-row items-center px-4 py-3 rounded-xl mr-3"
            style={{ backgroundColor: `${COLORS.text.white}10` }}
          >
            <Search size={18} color={COLORS.text.muted} />
            <RNTextInput
              className="flex-1 ml-3 text-base"
              style={{ color: COLORS.text.cream }}
              placeholder="Rechercher un produit..."
              placeholderTextColor={COLORS.text.muted}
              value={filters.search}
              onChangeText={(text) => setFilters((f) => ({ ...f, search: text }))}
            />
            {filters.search ? (
              <Pressable onPress={() => setFilters((f) => ({ ...f, search: '' }))}>
                <X size={18} color={COLORS.text.muted} />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            onPress={() => setShowFilters(true)}
            className="p-3 rounded-xl"
            style={{
              backgroundColor: hasActiveFilters ? COLORS.accent.teal : `${COLORS.text.white}10`,
            }}
          >
            <Filter size={20} color={hasActiveFilters ? COLORS.text.white : COLORS.text.muted} />
          </Pressable>
        </View>
      </LinearGradient>

      {/* Liste des produits */}
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent.teal}
          />
        }
      >
        {filteredProducts.length === 0 ? (
          <View className="items-center py-20">
            <Package size={64} color={COLORS.text.muted} />
            <Text style={{ color: COLORS.text.muted }} className="text-center mt-4 text-lg">
              Aucun produit trouvé
            </Text>
            <Text style={{ color: COLORS.text.muted }} className="text-center mt-2 text-sm">
              Essayez de modifier vos filtres
            </Text>
            {hasActiveFilters && (
              <Pressable
                onPress={resetFilters}
                className="mt-4 px-6 py-3 rounded-xl"
                style={{ backgroundColor: COLORS.accent.teal }}
              >
                <Text style={{ color: COLORS.text.white }} className="font-semibold">
                  Réinitialiser les filtres
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredProducts.map((item, index) => renderProductCard(item, index))
        )}
      </ScrollView>
    </View>
  );
}
