import React, { useState, useMemo, useRef } from 'react';
import { View, ScrollView, Pressable, Image, Modal, Dimensions } from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Percent, Clock, ShoppingCart, Flame, X, Star, Leaf, Check, Plus, Minus } from 'lucide-react-native';
import Animated, { FadeInDown, FadeIn, SlideInDown } from 'react-native-reanimated';
import { COLORS } from '@/lib/colors';
import { usePromoProductsStore, useCartStore, useProducerStore, PromoProduct, useProductReviewsStore, useCustomerInfoStore } from '@/lib/store';
import { Producer, SAMPLE_PRODUCERS, ProducerProduct, PRODUCT_TYPE_LABELS, PRODUCT_TYPE_COLORS } from '@/lib/producers';
import { usePricingContext } from '@/lib/useProductPricing';
import { CompactCacheStatus } from '@/components/CacheStatusBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Product Detail Modal Component
interface ProductDetailModalProps {
  visible: boolean;
  onClose: () => void;
  promoProduct: PromoProduct | null;
  product: ProducerProduct | null;
  producer: Producer | null;
  onAddToCart: (quantity: number) => void;
}

const ProductDetailModal = ({ visible, onClose, promoProduct, product, producer, onAddToCart }: ProductDetailModalProps) => {
  const insets = useSafeAreaInsets();
  const [justAdded, setJustAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const allReviews = useProductReviewsStore((s) => s.reviews);
  const productId = product?.id || promoProduct?.productId;

  const reviews = useMemo(() => {
    if (!productId) return [];
    return allReviews.filter((r) => r.productId === productId);
  }, [allReviews, productId]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  }, [reviews]);

  // Get all images for the product
  const productImages = useMemo(() => {
    const images: string[] = [];
    if (product?.images && product.images.length > 0) {
      images.push(...product.images);
    } else if (product?.image) {
      images.push(product.image);
    } else if (promoProduct?.image) {
      images.push(promoProduct.image);
    }
    return images;
  }, [product, promoProduct]);

  if (!visible || !promoProduct) return null;

  const handleAdd = () => {
    onAddToCart(quantity);
    setJustAdded(true);
    setTimeout(() => {
      setJustAdded(false);
      setQuantity(1);
    }, 1500);
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentImageIndex(index);
  };

  // Use product data if available, otherwise fall back to promoProduct data
  const displayName = product?.name || promoProduct.productName;
  const displayDescription = product?.description || 'Produit en promotion';
  const displayCbd = product?.cbdPercent ?? 0;
  const displayThc = product?.thcPercent ?? 0;
  const displayWeight = product?.weight || '';
  const displayType = product?.type;
  const producerName = producer?.name || promoProduct.producerName;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' }}>
        <Pressable
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          onPress={onClose}
        />

        <View
          style={{
            backgroundColor: COLORS.background.dark,
            maxHeight: '90%',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: insets.bottom + 20,
          }}
        >
          {/* Image Carousel */}
          <View style={{ height: 280, position: 'relative' }}>
            {productImages.length > 0 ? (
              <>
                <ScrollView
                  ref={scrollViewRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={handleScroll}
                  scrollEventThrottle={16}
                  style={{ flex: 1 }}
                >
                  {productImages.map((imageUri, index) => (
                    <Image
                      key={index}
                      source={{ uri: imageUri }}
                      style={{
                        width: SCREEN_WIDTH,
                        height: 280,
                        borderTopLeftRadius: index === 0 ? 24 : 0,
                        borderTopRightRadius: index === productImages.length - 1 ? 24 : 0,
                      }}
                      resizeMode="cover"
                    />
                  ))}
                </ScrollView>

                {/* Image indicators */}
                {productImages.length > 1 && (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 16,
                      left: 0,
                      right: 0,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    {productImages.map((_, index) => (
                      <View
                        key={index}
                        style={{
                          width: currentImageIndex === index ? 24 : 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: currentImageIndex === index ? COLORS.primary.gold : 'rgba(255,255,255,0.5)',
                          marginHorizontal: 4,
                        }}
                      />
                    ))}
                  </View>
                )}
              </>
            ) : (
              <View style={{ width: '100%', height: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: `${COLORS.text.muted}20` }}>
                <Leaf size={60} color={COLORS.text.muted} />
              </View>
            )}

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 100,
                pointerEvents: 'none',
              }}
            />

            {/* Close button */}
            <Pressable
              onPress={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <X size={24} color={COLORS.text.white} />
            </Pressable>

            {/* Discount badge */}
            <View
              className="absolute top-4 left-4 px-4 py-2 rounded-full"
              style={{ backgroundColor: COLORS.accent.red }}
            >
              <Text className="text-white font-bold text-lg">
                -{promoProduct.discountPercent}%
              </Text>
            </View>

            {/* Product type badge */}
            {displayType && (
              <View
                className="absolute bottom-16 left-4 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: `${PRODUCT_TYPE_COLORS[displayType]}90` }}
              >
                <Text style={{ color: COLORS.text.white }} className="font-semibold text-sm">
                  {PRODUCT_TYPE_LABELS[displayType]}
                </Text>
              </View>
            )}
          </View>

          <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
            {/* Product name and producer */}
            <View className="mt-4">
              <Text style={{ color: COLORS.text.cream }} className="text-2xl font-bold">
                {displayName}
              </Text>
              <Text style={{ color: COLORS.primary.paleGold }} className="text-base mt-1">
                {producerName}
              </Text>
            </View>

            {/* Rating */}
            <View className="flex-row items-center mt-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={18}
                  color={star <= Math.round(averageRating) ? COLORS.primary.brightYellow : COLORS.text.muted}
                  fill={star <= Math.round(averageRating) ? COLORS.primary.brightYellow : 'transparent'}
                />
              ))}
              <Text style={{ color: COLORS.text.muted }} className="text-sm ml-2">
                {averageRating > 0 ? `${averageRating.toFixed(1)} (${reviews.length} avis)` : 'Pas encore d\'avis'}
              </Text>
            </View>

            {/* Price section */}
            <View
              className="mt-4 p-4 rounded-2xl"
              style={{ backgroundColor: `${COLORS.primary.orange}15`, borderWidth: 1, borderColor: `${COLORS.primary.orange}30` }}
            >
              <View className="flex-row items-center">
                <Text style={{ color: COLORS.text.muted, textDecorationLine: 'line-through' }} className="text-lg mr-3">
                  {promoProduct.originalPrice.toFixed(2)}€
                </Text>
                <Text style={{ color: COLORS.primary.orange }} className="font-bold text-3xl">
                  {promoProduct.promoPrice.toFixed(2)}€
                </Text>
              </View>
              <Text style={{ color: COLORS.text.muted }} className="text-sm mt-1">
                {displayWeight} • Économisez {(promoProduct.originalPrice - promoProduct.promoPrice).toFixed(2)}€
              </Text>
              {promoProduct.validUntil && (
                <View className="flex-row items-center mt-2">
                  <Clock size={14} color={COLORS.text.muted} />
                  <Text style={{ color: COLORS.text.muted }} className="text-xs ml-1">
                    Offre valable jusqu'au {promoProduct.validUntil}
                  </Text>
                </View>
              )}
            </View>

            {/* CBD/THC info */}
            <View className="flex-row mt-4">
              <View
                className="flex-1 p-3 rounded-xl mr-2"
                style={{ backgroundColor: `${COLORS.accent.hemp}15`, borderWidth: 1, borderColor: `${COLORS.accent.hemp}30` }}
              >
                <Text style={{ color: COLORS.accent.hemp }} className="text-xs font-medium">CBD</Text>
                <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">{displayCbd}%</Text>
              </View>
              <View
                className="flex-1 p-3 rounded-xl ml-2"
                style={{ backgroundColor: `${COLORS.text.white}05`, borderWidth: 1, borderColor: `${COLORS.text.white}10` }}
              >
                <Text style={{ color: COLORS.text.muted }} className="text-xs font-medium">THC</Text>
                <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">{displayThc}%</Text>
              </View>
            </View>

            {/* Description - Enhanced */}
            <View className="mt-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mb-2">Description de la variété</Text>
              <View
                className="p-4 rounded-xl"
                style={{ backgroundColor: `${COLORS.accent.forest}10`, borderWidth: 1, borderColor: `${COLORS.accent.forest}20` }}
              >
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm leading-6">
                  {displayDescription}
                </Text>
              </View>
            </View>

            {/* Recent reviews */}
            {reviews.length > 0 && (
              <View className="mt-4">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">Avis clients</Text>
                {reviews.slice(0, 3).map((review) => (
                  <View
                    key={review.id}
                    className="p-3 rounded-xl mb-2"
                    style={{ backgroundColor: `${COLORS.text.white}05` }}
                  >
                    <View className="flex-row items-center mb-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={12}
                          color={star <= review.rating ? COLORS.primary.brightYellow : COLORS.text.muted}
                          fill={star <= review.rating ? COLORS.primary.brightYellow : 'transparent'}
                        />
                      ))}
                      <Text style={{ color: COLORS.text.muted }} className="text-xs ml-2">{review.userName}</Text>
                    </View>
                    <Text style={{ color: COLORS.text.lightGray }} className="text-sm">{review.comment}</Text>
                  </View>
                ))}
              </View>
            )}

            <View className="h-4" />
          </ScrollView>

          {/* Bottom section with quantity and add to cart */}
          <View
            className="px-5 pt-4"
            style={{ borderTopWidth: 1, borderTopColor: `${COLORS.primary.gold}15` }}
          >
            {/* Quantity selector */}
            <View className="flex-row items-center justify-center mb-4">
              <Text style={{ color: COLORS.text.muted }} className="text-sm mr-4">Quantité :</Text>
              <View className="flex-row items-center" style={{ backgroundColor: `${COLORS.text.white}10`, borderRadius: 12 }}>
                <Pressable
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 items-center justify-center"
                  style={{ opacity: quantity <= 1 ? 0.4 : 1 }}
                >
                  <Minus size={18} color={COLORS.text.lightGray} />
                </Pressable>
                <Text style={{ color: COLORS.text.white }} className="text-lg font-bold w-10 text-center">
                  {quantity}
                </Text>
                <Pressable
                  onPress={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 items-center justify-center"
                >
                  <Plus size={18} color={COLORS.text.lightGray} />
                </Pressable>
              </View>
            </View>

            {/* Add to cart button */}
            <Pressable
              onPress={handleAdd}
              className="py-4 rounded-2xl flex-row items-center justify-center"
              style={{ backgroundColor: justAdded ? COLORS.accent.hemp : COLORS.primary.gold }}
            >
              {justAdded ? (
                <>
                  <Check size={22} color={COLORS.text.white} />
                  <Text style={{ color: COLORS.text.white }} className="font-bold text-lg ml-2">
                    Ajouté au panier !
                  </Text>
                </>
              ) : (
                <>
                  <ShoppingCart size={22} color={COLORS.text.white} />
                  <Text style={{ color: COLORS.text.white }} className="font-bold text-lg ml-2">
                    Ajouter • {(promoProduct.promoPrice * quantity).toFixed(2)}€
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function PromoScreen() {
  const insets = useSafeAreaInsets();
  const promoProducts = usePromoProductsStore((s) => s.promoProducts);
  const activePromoProducts = promoProducts.filter((p) => p.active);
  const addToCart = useCartStore((s) => s.addToCart);
  const customProducers = useProducerStore((s) => s.producers);

  // Pricing context pour afficher les bons prix selon le rôle
  const { pricingMode, isPro } = usePricingContext();

  const [selectedPromo, setSelectedPromo] = useState<PromoProduct | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Combine sample producers with custom producers
  const allProducers = [...SAMPLE_PRODUCERS, ...customProducers];

  // Helper pour obtenir le prix promo selon le rôle
  const getPromoPrice = (promo: PromoProduct) => {
    if (isPro && promo.promoPricePro !== undefined && promo.promoPricePro !== null) {
      return promo.promoPricePro;
    }
    return promo.promoPrice;
  };

  const getProductAndProducer = (promoProduct: PromoProduct) => {
    const producer = allProducers.find((p: Producer) => p.id === promoProduct.producerId);
    if (!producer) return { product: null, producer: null };
    const product = producer.products.find((prod) => prod.id === promoProduct.productId);
    return { product: product || null, producer };
  };

  const handleAddToCart = (promoProduct: PromoProduct, quantity: number = 1) => {
    const { product, producer } = getProductAndProducer(promoProduct);
    if (!product || !producer) return;
    for (let i = 0; i < quantity; i++) {
      addToCart(product, producer.id, producer.name, promoProduct.discountPercent);
    }
  };

  const handleOpenDetail = (promoProduct: PromoProduct) => {
    setSelectedPromo(promoProduct);
    setDetailModalVisible(true);
  };

  const selectedProductInfo = selectedPromo ? getProductAndProducer(selectedPromo) : { product: null, producer: null };

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background.dark }}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.background.nightSky, COLORS.background.charcoal]}
        style={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 20,
          paddingBottom: 20,
        }}
      >
        <View className="flex-row items-center">
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
            style={{ backgroundColor: `${COLORS.accent.red}20` }}
          >
            <Flame size={24} color={COLORS.accent.red} />
          </View>
          <View>
            <Text style={{ color: COLORS.text.cream }} className="text-2xl font-bold">
              Promotions
            </Text>
            <Text style={{ color: COLORS.text.muted }} className="text-sm">
              Produits en promo
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* Cache status banner */}
      <CompactCacheStatus />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
      >
        {/* Active promo products */}
        {activePromoProducts.map((promoProduct, index) => (
          <Animated.View
            key={promoProduct.id}
            entering={FadeInDown.duration(400).delay(index * 100)}
            className="mb-4"
          >
            <Pressable
              onPress={() => handleOpenDetail(promoProduct)}
              className="rounded-2xl overflow-hidden active:opacity-90"
              style={{
                backgroundColor: COLORS.background.charcoal,
                borderWidth: 1,
                borderColor: `${COLORS.primary.gold}30`,
              }}
            >
              {/* Product image */}
              <View className="h-40 relative">
                {promoProduct.image ? (
                  <Image
                    source={{ uri: promoProduct.image }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center" style={{ backgroundColor: `${COLORS.text.muted}20` }}>
                    <Percent size={40} color={COLORS.text.muted} />
                  </View>
                )}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.8)']}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 80,
                  }}
                />
                {/* Discount badge */}
                <View
                  className="absolute top-3 right-3 px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: COLORS.accent.red }}
                >
                  <Text className="text-white font-bold text-sm">
                    -{promoProduct.discountPercent}%
                  </Text>
                </View>
              </View>

              {/* Product content */}
              <View className="p-4">
                <Text style={{ color: COLORS.text.cream }} className="font-bold text-lg mb-1">
                  {promoProduct.productName}
                </Text>
                <Text style={{ color: COLORS.text.muted }} className="text-sm mb-3">
                  {promoProduct.producerName}
                </Text>

                {/* Price row */}
                <View className="flex-row items-center mb-3">
                  <Text style={{ color: COLORS.text.muted, textDecorationLine: 'line-through' }} className="text-base mr-2">
                    {promoProduct.originalPrice.toFixed(2)}€
                  </Text>
                  <View className="flex-row items-center">
                    {isPro && promoProduct.promoPricePro !== undefined && promoProduct.promoPricePro !== null && (
                      <Text style={{ color: COLORS.accent.teal, fontSize: 10, marginRight: 4 }}>PRO</Text>
                    )}
                    <Text style={{ color: COLORS.primary.orange }} className="font-bold text-xl">
                      {getPromoPrice(promoProduct).toFixed(2)}€
                    </Text>
                  </View>
                </View>

                {/* Info row */}
                <View className="flex-row items-center justify-between">
                  {promoProduct.validUntil ? (
                    <View className="flex-row items-center">
                      <Clock size={14} color={COLORS.text.muted} />
                      <Text style={{ color: COLORS.text.muted }} className="text-xs ml-1">
                        Valide jusqu'au {promoProduct.validUntil}
                      </Text>
                    </View>
                  ) : (
                    <View />
                  )}

                  {/* Add to cart button */}
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleAddToCart(promoProduct);
                    }}
                    className="px-4 py-2 rounded-xl flex-row items-center"
                    style={{ backgroundColor: COLORS.primary.gold }}
                  >
                    <ShoppingCart size={16} color={COLORS.text.white} />
                    <Text style={{ color: COLORS.text.white }} className="font-semibold text-sm ml-2">
                      Ajouter
                    </Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        ))}

        {/* Empty state if no promo products */}
        {activePromoProducts.length === 0 && (
          <View className="items-center py-20">
            <Flame size={64} color={COLORS.text.muted} />
            <Text style={{ color: COLORS.text.muted }} className="text-center mt-4 text-lg">
              Aucun produit en promotion
            </Text>
            <Text style={{ color: COLORS.text.muted }} className="text-center mt-2 text-sm">
              Revenez bientôt pour découvrir nos offres !
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Product Detail Modal */}
      <ProductDetailModal
        visible={detailModalVisible}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedPromo(null);
        }}
        promoProduct={selectedPromo}
        product={selectedProductInfo.product}
        producer={selectedProductInfo.producer}
        onAddToCart={(quantity) => selectedPromo && handleAddToCart(selectedPromo, quantity)}
      />
    </View>
  );
}
