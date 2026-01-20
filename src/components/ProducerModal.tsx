import React, { useState, useRef } from 'react';
import { View, ScrollView, Pressable, Image, Modal, Dimensions } from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, MapPin, Thermometer, CloudRain, Leaf, ShoppingCart, Plus, Check, Package, Star, MessageCircle, Send, Edit3, Play, ChevronLeft, ChevronRight, Truck } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown } from 'react-native-reanimated';
import { Video, ResizeMode } from 'expo-av';
import { Producer, ProducerProduct, PRODUCT_TYPE_LABELS, PRODUCT_TYPE_COLORS, SAMPLE_PRODUCERS } from '@/lib/producers';
import { useCartStore, useProducerStore, useProductReviewsStore, useCustomerInfoStore, usePromoProductsStore } from '@/lib/store';
import { AddProductModal } from './AddProductModal';
import { COLORS } from '@/lib/colors';
import { getImageSource } from '@/lib/asset-images';

interface ProducerModalProps {
  producer: Producer | null;
  visible: boolean;
  onClose: () => void;
}

// Star rating component
const StarRating = ({ rating, onRate, size = 20, readonly = false }: { rating: number; onRate?: (r: number) => void; size?: number; readonly?: boolean }) => {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => !readonly && onRate?.(star)}
          disabled={readonly}
          className="mr-0.5"
        >
          <Star
            size={size}
            color={star <= rating ? COLORS.primary.brightYellow : COLORS.text.muted}
            fill={star <= rating ? COLORS.primary.brightYellow : 'transparent'}
          />
        </Pressable>
      ))}
    </View>
  );
};

const ProductCard = ({ product, producer, onEdit }: { product: ProducerProduct; producer: Producer; onEdit?: () => void }) => {
  const addToCart = useCartStore((s) => s.addToCart);
  const items = useCartStore((s) => s.items);
  const [justAdded, setJustAdded] = React.useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const videoRef = useRef<Video>(null);

  // Get custom producers to find the most up-to-date product data
  const customProducers = useProducerStore((s) => s.producers);

  // Find the most up-to-date version of this product - always get fresh data from store
  const currentProduct = React.useMemo(() => {
    // Check if producer exists in customProducers
    const customProducer = customProducers.find((p) => p.id === producer.id);
    if (customProducer) {
      // Find this product in the custom producer
      const customProduct = customProducer.products.find((p) => p.id === product.id);
      if (customProduct) {
        return customProduct;
      }
    }
    // Fallback to the passed product
    return product;
  }, [customProducers, producer.id, product.id]);

  // Debug log pour vérifier si videoUrl est présent
  React.useEffect(() => {
    console.log('ProductCard - currentProduct:', currentProduct.name, 'videoUrl:', currentProduct.videoUrl, 'images:', currentProduct.images);
  }, [currentProduct]);

  // Check if product is on promo - use currentProduct which has the latest data
  const productHasPromo = !!(currentProduct.isOnPromo && currentProduct.promoPercent && currentProduct.promoPercent > 0);

  // Legacy promo system (promoProductsStore) - only used if product doesn't have its own promo
  const promoProductsStore = usePromoProductsStore();
  const promoProducts = promoProductsStore.promoProducts;

  const storePromo = React.useMemo(() => {
    if (productHasPromo) return null; // Use product's own promo
    if (!promoProducts || promoProducts.length === 0) return null;

    return promoProducts.find((p) => {
      if (!p.active) return false;

      // Match by product ID and producer ID
      if (p.productId === currentProduct.id && p.producerId === producer.id) {
        return true;
      }

      // Match by product name and producer name (case insensitive)
      if (
        p.productName.toLowerCase().trim() === currentProduct.name.toLowerCase().trim() &&
        p.producerName.toLowerCase().trim() === producer.name.toLowerCase().trim()
      ) {
        return true;
      }

      return false;
    });
  }, [promoProducts, currentProduct.id, currentProduct.name, producer.id, producer.name, productHasPromo]);

  // Determine promo state - product's own promo takes priority
  const isOnPromo = productHasPromo || !!storePromo;
  const discountPercent = productHasPromo
    ? (currentProduct.promoPercent ?? 0)
    : (storePromo?.discountPercent ?? 0);
  const promoPrice = isOnPromo
    ? currentProduct.price * (1 - discountPercent / 100)
    : currentProduct.price;

  const reviews = useProductReviewsStore((s) => s.reviews.filter((r) => r.productId === currentProduct.id));
  const addReview = useProductReviewsStore((s) => s.addReview);
  const customerInfo = useCustomerInfoStore((s) => s.customerInfo);

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const inCart = items.find((item) => item.product.id === currentProduct.id);
  const quantity = inCart?.quantity ?? 0;

  const handleAdd = () => {
    // If product is on promo, add with promo discount
    if (isOnPromo) {
      addToCart(currentProduct, producer.id, producer.name, discountPercent);
    } else {
      addToCart(currentProduct, producer.id, producer.name);
    }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1000);
  };

  const handleSubmitReview = () => {
    if (newComment.trim()) {
      const userName = customerInfo?.firstName || 'Anonyme';
      addReview(currentProduct.id, producer.id, newRating, newComment.trim(), userName);
      setNewComment('');
      setNewRating(5);
      setShowReviewForm(false);
    }
  };

  // Check if we should show the media gallery (multiple images OR video)
  const hasMediaGallery = !!(currentProduct.videoUrl || (currentProduct.images && currentProduct.images.length > 1));

  return (
    <View
      className="rounded-2xl p-3 mb-3"
      style={{
        backgroundColor: `${COLORS.text.white}05`,
        borderWidth: 1,
        borderColor: isOnPromo ? '#EF444450' : `${COLORS.primary.paleGold}15`,
      }}
    >
      {/* Media Gallery - Photos & Video */}
      {hasMediaGallery && (
        <View className="mb-3">
          {/* Main media display */}
          <View className="relative rounded-xl overflow-hidden" style={{ height: 180 }}>
            {showVideo && currentProduct.videoUrl ? (
              <Video
                ref={videoRef}
                source={{ uri: currentProduct.videoUrl }}
                style={{ width: '100%', height: '100%' }}
                resizeMode={ResizeMode.COVER}
                useNativeControls
                shouldPlay
              />
            ) : (
              <Image
                source={{ uri: currentProduct.images?.[currentImageIndex] || currentProduct.image }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            )}

            {/* Navigation arrows for images */}
            {!showVideo && currentProduct.images && currentProduct.images.length > 1 && (
              <>
                {currentImageIndex > 0 && (
                  <Pressable
                    onPress={() => setCurrentImageIndex((i) => i - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                  >
                    <ChevronLeft size={20} color="#fff" />
                  </Pressable>
                )}
                {currentImageIndex < currentProduct.images.length - 1 && (
                  <Pressable
                    onPress={() => setCurrentImageIndex((i) => i + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                  >
                    <ChevronRight size={20} color="#fff" />
                  </Pressable>
                )}
              </>
            )}

            {/* Promo badge */}
            {isOnPromo && !(currentProduct.stock !== undefined && currentProduct.stock <= 0) && (
              <View
                className="absolute top-0 left-0 right-0 px-2 py-1"
                style={{ backgroundColor: '#EF4444' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800', textAlign: 'center' }}>
                  PROMO -{discountPercent}%
                </Text>
              </View>
            )}

            {/* Out of stock overlay */}
            {currentProduct.stock !== undefined && currentProduct.stock <= 0 && (
              <View
                className="absolute inset-0 items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              >
                <View className="px-3 py-2 rounded" style={{ backgroundColor: COLORS.primary.brightYellow }}>
                  <Text style={{ color: '#000', fontSize: 12, fontWeight: '800' }}>RUPTURE DE STOCK</Text>
                </View>
              </View>
            )}
          </View>

          {/* Thumbnails row */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2" style={{ flexGrow: 0 }}>
            <View className="flex-row">
              {(currentProduct.images && currentProduct.images.length > 0 ? currentProduct.images : [currentProduct.image]).map((img, index) => (
                <Pressable
                  key={index}
                  onPress={() => { setCurrentImageIndex(index); setShowVideo(false); }}
                  className="mr-2 rounded-lg overflow-hidden"
                  style={{
                    borderWidth: 2,
                    borderColor: !showVideo && currentImageIndex === index ? COLORS.primary.gold : 'transparent',
                  }}
                >
                  <Image source={{ uri: img }} style={{ width: 50, height: 50 }} resizeMode="cover" />
                </Pressable>
              ))}
              {currentProduct.videoUrl && (
                <Pressable
                  onPress={() => setShowVideo(true)}
                  className="rounded-lg overflow-hidden items-center justify-center"
                  style={{
                    width: 50,
                    height: 50,
                    backgroundColor: COLORS.accent.teal,
                    borderWidth: 2,
                    borderColor: showVideo ? COLORS.primary.gold : 'transparent',
                  }}
                >
                  <Play size={24} color="#fff" fill="#fff" />
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      )}

      <View className="flex-row">
        {/* Show small thumbnail only if no gallery above */}
        {!hasMediaGallery && (
          <View className="relative">
            <Image
              source={{ uri: currentProduct.image }}
              className="w-20 h-20 rounded-xl"
              resizeMode="cover"
            />
            {/* Out of stock badge on image */}
            {currentProduct.stock !== undefined && currentProduct.stock <= 0 && (
              <View
                className="absolute top-0 left-0 right-0 bottom-0 rounded-xl items-center justify-center"
                style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
              >
                <View
                  className="px-2 py-1 rounded"
                  style={{ backgroundColor: COLORS.primary.brightYellow }}
                >
                  <Text style={{ color: '#000', fontSize: 8, fontWeight: '800', textAlign: 'center' }}>
                    RUPTURE{'\n'}DE STOCK
                  </Text>
                </View>
              </View>
            )}
            {/* Promo badge on image */}
            {isOnPromo && !(currentProduct.stock !== undefined && currentProduct.stock <= 0) && (
              <View
                className="absolute top-0 left-0 right-0 rounded-t-xl px-1 py-0.5"
                style={{ backgroundColor: '#EF4444' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800', textAlign: 'center' }}>
                  PROMO -{discountPercent}%
                </Text>
              </View>
            )}
          </View>
        )}
        <View className={`flex-1 ${!hasMediaGallery ? 'ml-3' : ''}`}>
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center flex-1">
              <View
                className="px-2 py-0.5 rounded-full mr-2"
                style={{ backgroundColor: `${PRODUCT_TYPE_COLORS[currentProduct.type]}20` }}
              >
                <Text style={{ color: PRODUCT_TYPE_COLORS[currentProduct.type], fontSize: 10, fontWeight: '600' }}>
                  {PRODUCT_TYPE_LABELS[currentProduct.type]}
                </Text>
              </View>
              <Text style={{ color: COLORS.text.muted }} className="text-xs">{currentProduct.weight}</Text>
            </View>
            {onEdit && (
              <Pressable onPress={onEdit} className="p-1">
                <Edit3 size={14} color={COLORS.primary.paleGold} />
              </Pressable>
            )}
          </View>
          <Text style={{ color: COLORS.text.white }} className="font-semibold text-base">{currentProduct.name}</Text>
          <Pressable onPress={() => setDescriptionExpanded(!descriptionExpanded)}>
            <Text
              style={{ color: COLORS.text.muted }}
              className="text-xs mt-0.5"
              numberOfLines={descriptionExpanded ? undefined : 1}
            >
              {currentProduct.description}
            </Text>
            {currentProduct.description && currentProduct.description.length > 50 && (
              <Text style={{ color: COLORS.primary.paleGold }} className="text-xs mt-0.5">
                {descriptionExpanded ? 'Voir moins' : 'Voir plus...'}
              </Text>
            )}
          </Pressable>
          <View className="flex-row items-center mt-1">
            <Text style={{ color: COLORS.accent.hemp }} className="text-xs font-medium">CBD {currentProduct.cbdPercent}%</Text>
            <Text style={{ color: COLORS.text.muted }} className="text-xs mx-2">|</Text>
            <Text style={{ color: COLORS.text.muted }} className="text-xs">THC {currentProduct.thcPercent}%</Text>
          </View>

          {/* Delivery info */}
          {currentProduct.delivery_type && (
            <View className="flex-row items-center mt-1.5">
              <View
                className="flex-row items-center px-2 py-0.5 rounded-lg"
                style={{ backgroundColor: `${COLORS.accent.sky}15` }}
              >
                <Truck size={11} color={COLORS.accent.sky} />
                <Text style={{ color: COLORS.accent.sky }} className="text-xs font-medium ml-1">
                  {currentProduct.delivery_type === 'flat'
                    ? `Livraison : ${currentProduct.delivery_flat_price?.toFixed(2) ?? '0'}€`
                    : `Livraison dès ${currentProduct.delivery_min_order_amount?.toFixed(0) ?? '0'}€`}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Rating display */}
      <View className="flex-row items-center mt-2">
        <StarRating rating={Math.round(averageRating)} readonly size={14} />
        <Text style={{ color: COLORS.text.muted }} className="text-xs ml-2">
          {averageRating > 0 ? `${averageRating.toFixed(1)} (${reviews.length} avis)` : 'Pas encore d\'avis'}
        </Text>
        <Pressable
          onPress={() => setShowReviewForm(!showReviewForm)}
          className="ml-auto flex-row items-center"
        >
          <MessageCircle size={14} color={COLORS.primary.paleGold} />
          <Text style={{ color: COLORS.primary.paleGold }} className="text-xs ml-1">
            {showReviewForm ? 'Masquer' : 'Avis'}
          </Text>
        </Pressable>
      </View>

      {/* Review form */}
      {showReviewForm && (
        <View
          className="mt-3 p-3 rounded-xl"
          style={{ backgroundColor: `${COLORS.text.white}05`, borderWidth: 1, borderColor: `${COLORS.primary.paleGold}20` }}
        >
          <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-2">Votre note:</Text>
          <StarRating rating={newRating} onRate={setNewRating} size={24} />
          <TextInput
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Votre avis sur ce produit..."
            placeholderTextColor={COLORS.text.muted}
            multiline
            numberOfLines={2}
            className="mt-2 rounded-lg p-2 text-sm"
            style={{
              backgroundColor: `${COLORS.text.white}05`,
              color: COLORS.text.white,
              borderWidth: 1,
              borderColor: `${COLORS.text.white}10`,
              minHeight: 60,
              textAlignVertical: 'top',
            }}
          />
          <Pressable
            onPress={handleSubmitReview}
            disabled={!newComment.trim()}
            className="mt-2 flex-row items-center justify-center py-2 rounded-lg"
            style={{
              backgroundColor: newComment.trim() ? COLORS.accent.hemp : `${COLORS.text.muted}30`,
            }}
          >
            <Send size={14} color={COLORS.text.white} />
            <Text style={{ color: COLORS.text.white }} className="font-medium text-sm ml-2">
              Envoyer
            </Text>
          </Pressable>

          {/* Show recent reviews */}
          {reviews.length > 0 && (
            <View className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: `${COLORS.text.white}10` }}>
              <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-2">Derniers avis:</Text>
              {reviews.slice(0, 3).map((review) => (
                <View key={review.id} className="mb-2">
                  <View className="flex-row items-center">
                    <StarRating rating={review.rating} readonly size={10} />
                    <Text style={{ color: COLORS.text.muted }} className="text-xs ml-2">{review.userName}</Text>
                  </View>
                  <Text style={{ color: COLORS.text.lightGray }} className="text-xs mt-1">{review.comment}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View
        className="flex-row items-center justify-between mt-3 pt-3"
        style={{ borderTopWidth: 1, borderTopColor: `${COLORS.text.white}10` }}
      >
        <View>
          <View className="flex-row items-center">
            {isOnPromo ? (
              <>
                <View
                  className="px-2 py-0.5 rounded-full mr-2"
                  style={{ backgroundColor: '#EF444420' }}
                >
                  <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>
                    -{discountPercent}%
                  </Text>
                </View>
                <Text style={{ color: COLORS.text.muted, textDecorationLine: 'line-through' }} className="text-sm mr-2">
                  {currentProduct.price}€
                </Text>
                <Text style={{ color: '#EF4444' }} className="text-lg font-bold">
                  {promoPrice.toFixed(2)}€
                </Text>
              </>
            ) : (
              <Text style={{ color: COLORS.primary.paleGold }} className="text-lg font-bold">{currentProduct.price}€</Text>
            )}
          </View>
          {/* Stock display */}
          {currentProduct.stock !== undefined && (
            <View className="flex-row items-center mt-1">
              <Package size={12} color={currentProduct.stock > 0 ? COLORS.primary.brightYellow : '#EF4444'} />
              <Text
                style={{ color: currentProduct.stock > 0 ? COLORS.primary.brightYellow : '#EF4444' }}
                className="text-xs ml-1 font-medium"
              >
                {currentProduct.stock > 0 ? `${currentProduct.stock} en stock` : 'Rupture de stock'}
              </Text>
            </View>
          )}
        </View>
        <Pressable
          onPress={handleAdd}
          disabled={currentProduct.stock !== undefined && currentProduct.stock <= 0}
          className="flex-row items-center px-4 py-2 rounded-xl active:opacity-70"
          style={{
            backgroundColor: currentProduct.stock !== undefined && currentProduct.stock <= 0
              ? `${COLORS.accent.red}20`
              : justAdded
                ? COLORS.accent.hemp
                : COLORS.primary.gold,
            borderWidth: currentProduct.stock !== undefined && currentProduct.stock <= 0 ? 1 : 0,
            borderColor: currentProduct.stock !== undefined && currentProduct.stock <= 0 ? `${COLORS.accent.red}50` : 'transparent',
          }}
        >
          {justAdded ? (
            <Check size={18} color={COLORS.text.white} />
          ) : (
            <Plus size={18} color={currentProduct.stock !== undefined && currentProduct.stock <= 0 ? COLORS.accent.red : COLORS.text.white} />
          )}
          <Text style={{ color: currentProduct.stock !== undefined && currentProduct.stock <= 0 ? COLORS.accent.red : COLORS.text.white }} className="font-semibold ml-1">
            {currentProduct.stock !== undefined && currentProduct.stock <= 0
              ? 'Rupture'
              : quantity > 0
                ? `(${quantity})`
                : 'Ajouter'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export const ProducerModal = ({ producer, visible, onClose }: ProducerModalProps) => {
  const insets = useSafeAreaInsets();
  const itemCount = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const [addProductVisible, setAddProductVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProducerProduct | null>(null);

  // Get the latest producer data from store (for updated products)
  // Custom producers MUST take priority over sample producers
  const customProducers = useProducerStore((s) => s.producers);

  // Find the current producer - always check customProducers first
  const currentProducer = React.useMemo(() => {
    if (!producer) return null;

    // First, check if this producer exists in customProducers (modified version)
    const customVersion = customProducers.find((p) => p.id === producer.id);
    if (customVersion) {
      return customVersion;
    }

    // If not in custom, check SAMPLE_PRODUCERS
    const sampleVersion = SAMPLE_PRODUCERS.find((p) => p.id === producer.id);
    if (sampleVersion) {
      return sampleVersion;
    }

    // Fallback to the passed producer
    return producer;
  }, [producer, customProducers]);

  const handleEditProduct = (product: ProducerProduct) => {
    setEditingProduct(product);
    setAddProductVisible(true);
  };

  const handleCloseProductModal = () => {
    setAddProductVisible(false);
    setEditingProduct(null);
  };

  if (!currentProducer) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          className="absolute inset-0"
        >
          <Pressable className="flex-1" onPress={onClose} />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          className="rounded-t-3xl mt-auto"
          style={{ backgroundColor: COLORS.background.dark, maxHeight: '90%', paddingBottom: insets.bottom + 20 }}
        >
          {/* Header Image */}
          <View className="relative h-48">
            {currentProducer.image ? (
              <Image
                source={getImageSource(currentProducer.image)}
                className="w-full h-full rounded-t-3xl"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full rounded-t-3xl items-center justify-center" style={{ backgroundColor: `${COLORS.text.white}10` }}>
                <Leaf size={48} color={COLORS.text.muted} />
              </View>
            )}
            <View className="absolute inset-0 rounded-t-3xl" style={{ backgroundColor: 'rgba(36,36,36,0.4)' }} />

            {/* Close button */}
            <Pressable
              onPress={onClose}
              className="absolute top-4 right-4 w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <X size={24} color={COLORS.text.white} />
            </Pressable>

            {/* Cart badge */}
            {itemCount > 0 && (
              <View
                className="absolute top-4 left-4 flex-row items-center px-3 py-2 rounded-full"
                style={{ backgroundColor: COLORS.primary.gold }}
              >
                <ShoppingCart size={16} color={COLORS.text.white} />
                <Text style={{ color: COLORS.text.white }} className="font-bold ml-1">{itemCount}</Text>
              </View>
            )}

            {/* Producer name overlay */}
            <View className="absolute bottom-4 left-4 right-4">
              <Text style={{ color: COLORS.text.white }} className="text-2xl font-bold">{currentProducer.name}</Text>
              <View className="flex-row items-center mt-1">
                <MapPin size={14} color={COLORS.primary.brightYellow} />
                <Text style={{ color: COLORS.primary.paleGold }} className="text-sm ml-1">
                  {currentProducer.department}, {currentProducer.region}
                </Text>
              </View>
            </View>
          </View>

          <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
            {/* Description */}
            {currentProducer.description ? (
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm leading-5 mt-4 mb-4">
                {currentProducer.description}
              </Text>
            ) : null}

            {/* Terroir Info - Attributs empilés verticalement */}
            <View className="mb-4 mt-2">
              {/* Département */}
              <View
                className="flex-row items-center rounded-xl p-3 mb-2"
                style={{
                  backgroundColor: `${COLORS.characteristics.departement}15`,
                  borderWidth: 1,
                  borderColor: `${COLORS.characteristics.departement}40`,
                }}
              >
                <View
                  className="px-2 py-1 rounded-lg mr-3"
                  style={{ backgroundColor: COLORS.characteristics.departement }}
                >
                  <MapPin size={14} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text style={{ color: COLORS.characteristics.departement }} className="font-bold text-xs uppercase tracking-wide">Département</Text>
                  <Text style={{ color: COLORS.characteristics.departement }} className="text-sm font-medium mt-0.5">{currentProducer.department || '-'}</Text>
                </View>
              </View>

              {/* Terre / Sol */}
              <View
                className="flex-row items-center rounded-xl p-3 mb-2"
                style={{
                  backgroundColor: `${COLORS.characteristics.terre}15`,
                  borderWidth: 1,
                  borderColor: `${COLORS.characteristics.terre}40`,
                }}
              >
                <View
                  className="px-2 py-1 rounded-lg mr-3"
                  style={{ backgroundColor: COLORS.characteristics.terre }}
                >
                  <Leaf size={14} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text style={{ color: COLORS.characteristics.terre }} className="font-bold text-xs uppercase tracking-wide">Terre</Text>
                  <Text style={{ color: COLORS.characteristics.terre }} className="text-sm font-medium mt-0.5">{currentProducer.soil.type || '-'}</Text>
                  {currentProducer.soil.ph ? (
                    <Text style={{ color: COLORS.text.muted }} className="text-xs mt-0.5">pH {currentProducer.soil.ph}</Text>
                  ) : null}
                </View>
              </View>

              {/* Climat */}
              <View
                className="flex-row items-center rounded-xl p-3"
                style={{
                  backgroundColor: `${COLORS.characteristics.climat}15`,
                  borderWidth: 1,
                  borderColor: `${COLORS.characteristics.climat}40`,
                }}
              >
                <View
                  className="px-2 py-1 rounded-lg mr-3"
                  style={{ backgroundColor: COLORS.characteristics.climat }}
                >
                  <Thermometer size={14} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text style={{ color: COLORS.characteristics.climat }} className="font-bold text-xs uppercase tracking-wide">Climat</Text>
                  <Text style={{ color: COLORS.characteristics.climat }} className="text-sm font-medium mt-0.5">{currentProducer.climate.type || '-'}</Text>
                  {(currentProducer.climate.avgTemp || currentProducer.climate.rainfall) ? (
                    <View className="flex-row items-center mt-0.5">
                      <Text style={{ color: COLORS.characteristics.climat }} className="text-xs">{currentProducer.climate.avgTemp}</Text>
                      {currentProducer.climate.avgTemp && currentProducer.climate.rainfall ? (
                        <CloudRain size={10} color={COLORS.characteristics.pluie} style={{ marginHorizontal: 4 }} />
                      ) : null}
                      <Text style={{ color: COLORS.characteristics.pluie }} className="text-xs">{currentProducer.climate.rainfall}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {/* Soil characteristics */}
            {currentProducer.soil.characteristics ? (
              <View
                className="rounded-xl p-3 mb-4"
                style={{
                  backgroundColor: `${COLORS.characteristics.sol}15`,
                  borderWidth: 1,
                  borderColor: `${COLORS.characteristics.sol}40`,
                }}
              >
                <Text style={{ color: COLORS.text.lightGray }} className="text-xs leading-4">
                  {currentProducer.soil.characteristics}
                </Text>
              </View>
            ) : null}

            {/* Products */}
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ color: COLORS.text.white }} className="text-lg font-bold">
                Produits disponibles
              </Text>
              <Pressable
                onPress={() => setAddProductVisible(true)}
                className="px-3 py-2 rounded-xl flex-row items-center active:opacity-80"
                style={{ backgroundColor: COLORS.primary.gold }}
              >
                <Plus size={16} color={COLORS.text.white} />
                <Text style={{ color: COLORS.text.white }} className="font-medium text-sm ml-1">Ajouter</Text>
              </Pressable>
            </View>

            {currentProducer.products.length === 0 ? (
              <View
                className="rounded-2xl p-6 items-center mb-4"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.text.white}10`,
                }}
              >
                <Package size={40} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-center mt-3">
                  Aucun produit pour l'instant
                </Text>
                <Text style={{ color: COLORS.text.muted }} className="text-center text-sm mt-1">
                  Ajoutez des produits à ce producteur
                </Text>
              </View>
            ) : (
              currentProducer.products.map((product: ProducerProduct) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  producer={currentProducer}
                  onEdit={() => handleEditProduct(product)}
                />
              ))
            )}

            <View className="h-4" />
          </ScrollView>
        </Animated.View>
      </View>

      {/* Add Product Modal */}
      <AddProductModal
        visible={addProductVisible}
        producerId={currentProducer.id}
        producerName={currentProducer.name}
        onClose={handleCloseProductModal}
        editingProduct={editingProduct}
      />
    </Modal>
  );
};
