import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Dimensions,
} from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MapPin, ShoppingCart, Plus, Minus, Leaf, Sparkles, Store, Star, MessageSquare, Send, User, X, Camera, Briefcase, Package, Mail, Check, Truck } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { COLORS } from '@/lib/colors';
import { useProducerStore, useCartStore, useProducerReviewsStore, useSupabaseSyncStore, ProducerReview } from '@/lib/store';
import { SAMPLE_PRODUCERS, PRODUCT_TYPE_COLORS, PRODUCT_TYPE_LABELS, ProducerProduct } from '@/lib/producers';
import { getImageSource } from '@/lib/asset-images';
import { usePermissions, useAuth } from '@/lib/useAuth';
import { ProductPhotoManager } from '@/components/ProductPhotoManager';
import { LabAnalysisViewer } from '@/components/LabAnalysisViewer';
import { CultureTypeIcons } from '@/components/CultureTypeIcons';
import { CacheStatusBanner } from '@/components/CacheStatusBanner';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Image Viewer Modal Component
const ImageViewerModal = ({
  visible,
  images,
  initialIndex,
  onClose,
}: {
  visible: boolean;
  images: string[];
  initialIndex: number;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);

  React.useEffect(() => {
    if (visible && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: initialIndex * SCREEN_WIDTH, animated: false });
      }, 50);
    }
    setActiveIndex(initialIndex);
  }, [visible, initialIndex]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}>
        {/* Close button */}
        <Pressable
          onPress={onClose}
          className="absolute z-10 p-3 rounded-full"
          style={{
            top: insets.top + 10,
            right: 16,
            backgroundColor: 'rgba(255,255,255,0.15)',
          }}
        >
          <X size={24} color="#fff" />
        </Pressable>

        {/* Image carousel */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setActiveIndex(index);
          }}
          contentContainerStyle={{ alignItems: 'center' }}
          style={{ flex: 1 }}
        >
          {images.map((uri, index) => (
            <View
              key={index}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
            >
              <Image
                source={{ uri }}
                style={{ width: SCREEN_WIDTH - 32, height: SCREEN_WIDTH - 32, borderRadius: 16 }}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Page indicators */}
        {images.length > 1 && (
          <View
            className="absolute left-0 right-0 flex-row justify-center"
            style={{ bottom: insets.bottom + 40 }}
          >
            {images.map((_, index) => (
              <View
                key={index}
                className="w-2.5 h-2.5 rounded-full mx-1"
                style={{
                  backgroundColor: index === activeIndex
                    ? COLORS.primary.brightYellow
                    : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </View>
        )}

        {/* Image counter */}
        <View
          className="absolute left-0 right-0 items-center"
          style={{ bottom: insets.bottom + 16 }}
        >
          <Text className="text-white/70 text-sm">
            {activeIndex + 1} / {images.length}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

// Star Rating Component
const StarRating = ({ rating, size = 16, onRate }: { rating: number; size?: number; onRate?: (rating: number) => void }) => {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          onPress={() => onRate?.(star)}
          disabled={!onRate}
          className="mr-0.5"
        >
          <Star
            size={size}
            color={star <= rating ? '#F59E0B' : '#4B5563'}
            fill={star <= rating ? '#F59E0B' : 'transparent'}
          />
        </Pressable>
      ))}
    </View>
  );
};

// Review Card Component
const ReviewCard = ({ review }: { review: ProducerReview }) => {
  const date = new Date(review.createdAt);
  const formattedDate = date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View
      className="rounded-xl p-4 mb-3"
      style={{
        backgroundColor: `${COLORS.background.charcoal}80`,
        borderWidth: 1,
        borderColor: `${COLORS.primary.gold}15`,
      }}
    >
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-row items-center">
          <View
            className="w-8 h-8 rounded-full items-center justify-center mr-2"
            style={{ backgroundColor: `${COLORS.accent.teal}30` }}
          >
            <User size={16} color={COLORS.accent.teal} />
          </View>
          <Text style={{ color: COLORS.text.cream }} className="font-semibold">
            {review.userName}
          </Text>
        </View>
        <Text style={{ color: COLORS.text.muted }} className="text-xs">
          {formattedDate}
        </Text>
      </View>
      <StarRating rating={review.rating} size={14} />
      {review.comment && (
        <Text style={{ color: COLORS.text.lightGray }} className="text-sm mt-2">
          {review.comment}
        </Text>
      )}
    </View>
  );
};

const ProductCard = ({
  product,
  producerId,
  producerName,
  index,
  isProducer = false,
  isPro = false,
  onUpdateProductImages,
}: {
  product: ProducerProduct;
  producerId: string;
  producerName: string;
  index: number;
  isProducer?: boolean;
  isPro?: boolean;
  onUpdateProductImages?: (productId: string, images: string[]) => void;
}) => {
  const addToCart = useCartStore((s) => s.addToCart);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [editingQuantity, setEditingQuantity] = useState(false);
  const [tempQuantity, setTempQuantity] = useState('');
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  // Déterminer le prix à afficher (Pro ou Public)
  const hasProPrice = isPro && product.pricePro !== undefined && product.pricePro !== null;
  const displayPrice = hasProPrice ? product.pricePro! : product.price;

  // Check if product is on promo
  const isOnPromo = !!(product.isOnPromo && product.promoPercent && product.promoPercent > 0);
  const promoPrice = isOnPromo ? displayPrice * (1 - (product.promoPercent ?? 0) / 100) : displayPrice;

  // Check if product is out of stock
  // stock null ou undefined = stock illimité (pas en rupture)
  // stock = 0 ou négatif = rupture de stock
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;

  const cartItem = items.find((item) => item.product.id === product.id);
  const quantity = cartItem?.quantity ?? 0;

  const handleQuantityPress = () => {
    setTempQuantity(quantity.toString());
    setEditingQuantity(true);
  };

  const handleQuantitySubmit = () => {
    const newQty = parseInt(tempQuantity, 10);
    if (!isNaN(newQty) && newQty >= 0) {
      updateQuantity(product.id, newQty);
    }
    setEditingQuantity(false);
  };

  const handleAddToCart = () => {
    if (isOnPromo) {
      addToCart(product, producerId, producerName, product.promoPercent);
    } else {
      addToCart(product, producerId, producerName);
    }
  };

  // Get all images (use images array if available, otherwise fallback to single image)
  const productImages = product.images && product.images.length > 0
    ? product.images
    : [product.image];

  const openImageViewer = (index: number) => {
    setViewerInitialIndex(index);
    setShowImageViewer(true);
  };

  const handleImagesUpdated = (newImages: string[]) => {
    if (onUpdateProductImages) {
      onUpdateProductImages(product.id, newImages);
    }
  };

  return (
    <>
      <ImageViewerModal
        visible={showImageViewer}
        images={productImages}
        initialIndex={viewerInitialIndex}
        onClose={() => setShowImageViewer(false)}
      />
      {isProducer && (
        <ProductPhotoManager
          visible={showPhotoManager}
          onClose={() => setShowPhotoManager(false)}
          product={product}
          producerId={producerId}
          onImagesUpdated={handleImagesUpdated}
        />
      )}
      <Animated.View
        entering={FadeInUp.duration(400).delay(index * 80)}
        className="mb-4 rounded-2xl overflow-hidden"
        style={{
          backgroundColor: COLORS.background.charcoal,
          borderWidth: 1.5,
          borderColor: isOutOfStock ? `${COLORS.accent.red}50` : isOnPromo ? '#EF444450' : `${COLORS.primary.gold}20`,
          shadowColor: isOutOfStock ? COLORS.accent.red : isOnPromo ? '#EF4444' : COLORS.primary.gold,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          opacity: isOutOfStock ? 0.8 : 1,
        }}
      >
        <View className="flex-row">
          {/* Product images with golden border */}
          <View className="relative">
            {/* Photo button for producers */}
            {isProducer && (
              <Pressable
                onPress={() => setShowPhotoManager(true)}
                className="absolute top-1 left-1 z-10 w-8 h-8 rounded-full items-center justify-center"
                style={{
                  backgroundColor: COLORS.primary.gold,
                  shadowColor: COLORS.primary.gold,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.4,
                  shadowRadius: 4,
                }}
              >
                <Camera size={16} color={COLORS.text.dark} />
              </Pressable>
            )}
            <Pressable
              onPress={() => openImageViewer(activeImageIndex)}
              className="m-3 rounded-xl overflow-hidden"
              style={{ borderWidth: 2, borderColor: isOnPromo ? '#EF444450' : `${COLORS.primary.gold}30` }}
            >
            {productImages.length > 1 ? (
              <View>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / 96);
                    setActiveImageIndex(idx);
                  }}
                  style={{ width: 96, height: 96 }}
                >
                  {productImages.map((uri, imgIndex) => (
                    <Pressable
                      key={imgIndex}
                      onPress={() => openImageViewer(imgIndex)}
                    >
                      <Image
                        source={{ uri }}
                        style={{ width: 96, height: 96 }}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                </ScrollView>
                {/* Image indicators */}
                <View className="absolute bottom-1 left-0 right-0 flex-row justify-center">
                  {productImages.map((_, imgIndex) => (
                    <View
                      key={imgIndex}
                      className="w-1.5 h-1.5 rounded-full mx-0.5"
                      style={{
                        backgroundColor: imgIndex === activeImageIndex
                          ? COLORS.primary.brightYellow
                          : `${COLORS.text.white}50`,
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <Image
                source={{ uri: productImages[0] }}
                className="w-24 h-24"
                resizeMode="cover"
              />
            )}
            </Pressable>
            {/* Promo badge */}
            {isOnPromo && !isOutOfStock && (
              <View
                className="absolute top-1 left-1 px-2 py-1 rounded-lg"
                style={{ backgroundColor: '#EF4444' }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                  -{product.promoPercent}%
                </Text>
              </View>
            )}
            {/* Out of stock badge */}
            {isOutOfStock && (
              <View
                className="absolute top-1 left-1 right-1 bottom-1 items-center justify-center"
              >
                <View
                  className="absolute inset-0 rounded-xl"
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                />
                <View
                  className="px-2 py-1 rounded-lg z-10"
                  style={{ backgroundColor: COLORS.accent.red }}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '800' }}>
                    RUPTURE
                  </Text>
                </View>
              </View>
            )}
          </View>

        {/* Product info */}
        <View className="flex-1 py-3 pr-3">
          <View className="flex-row items-center mb-1.5">
            <View
              className="px-2.5 py-1 rounded-full mr-2"
              style={{
                backgroundColor: `${PRODUCT_TYPE_COLORS[product.type]}25`,
                borderWidth: 1,
                borderColor: `${PRODUCT_TYPE_COLORS[product.type]}40`,
              }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: PRODUCT_TYPE_COLORS[product.type] }}
              >
                {PRODUCT_TYPE_LABELS[product.type]}
              </Text>
            </View>
          </View>

          <Text style={{ color: COLORS.text.cream }} className="font-bold text-base">
            {product.name}
          </Text>

          <Pressable onPress={() => setDescriptionExpanded(!descriptionExpanded)}>
            <Text
              style={{ color: COLORS.text.muted }}
              className="text-xs mt-1"
              numberOfLines={descriptionExpanded ? undefined : 2}
            >
              {product.description}
            </Text>
            {product.description && product.description.length > 80 && (
              <Text style={{ color: COLORS.primary.paleGold }} className="text-xs mt-0.5">
                {descriptionExpanded ? 'Voir moins' : 'Voir plus...'}
              </Text>
            )}
          </Pressable>

          <View className="flex-row items-center mt-2">
            <View
              className="flex-row items-center px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
            >
              <Leaf size={11} color={COLORS.accent.hemp} />
              <Text style={{ color: COLORS.accent.hemp }} className="text-xs font-semibold ml-1">
                CBD {product.cbdPercent}%
              </Text>
            </View>
            <Text style={{ color: COLORS.text.muted }} className="text-xs ml-2">
              THC {product.thcPercent}%
            </Text>
            {/* Bouton analyse labo */}
            {product.labAnalysisUrl && (
              <View className="ml-2">
                <LabAnalysisViewer url={product.labAnalysisUrl} compact />
              </View>
            )}
          </View>

          {/* Delivery info */}
          {product.delivery_type && (
            <View className="flex-row items-center mt-2">
              <View
                className="flex-row items-center px-2 py-1 rounded-lg"
                style={{ backgroundColor: `${COLORS.accent.sky}15` }}
              >
                <Truck size={12} color={COLORS.accent.sky} />
                <Text style={{ color: COLORS.accent.sky }} className="text-xs font-medium ml-1">
                  {product.delivery_type === 'flat'
                    ? `Livraison : ${product.delivery_flat_price?.toFixed(2) ?? '0'}€`
                    : `Livraison dès ${product.delivery_min_order_amount?.toFixed(0) ?? '0'}€ d'achat`}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Bottom bar with price and add to cart */}
      <View
        className="flex-row items-center justify-between px-4 py-3"
        style={{
          backgroundColor: `${COLORS.background.nightSky}80`,
          borderTopWidth: 1,
          borderTopColor: isOnPromo ? '#EF444430' : hasProPrice ? `${COLORS.accent.teal}30` : `${COLORS.primary.gold}15`,
        }}
      >
        <View>
          {isOnPromo ? (
            <>
              <View className="flex-row items-center">
                <View
                  className="px-2 py-0.5 rounded-full mr-2"
                  style={{ backgroundColor: '#EF444420' }}
                >
                  <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '700' }}>
                    {`-${product.promoPercent}%`}
                  </Text>
                </View>
                <Text style={{ color: COLORS.text.muted, textDecorationLine: 'line-through' }} className="text-sm">
                  {`${displayPrice}€`}
                </Text>
              </View>
              <Text style={{ color: '#EF4444' }} className="text-xl font-bold">
                {`${promoPrice.toFixed(2)}€`}
              </Text>
            </>
          ) : hasProPrice ? (
            <>
              <View className="flex-row items-center">
                <View
                  className="flex-row items-center px-2 py-0.5 rounded-full mr-2"
                  style={{ backgroundColor: `${COLORS.accent.teal}25` }}
                >
                  <Briefcase size={10} color={COLORS.accent.teal} />
                  <Text style={{ color: COLORS.accent.teal, fontSize: 10, fontWeight: '700', marginLeft: 3 }}>
                    {"PRO"}
                  </Text>
                </View>
                <Text style={{ color: COLORS.text.muted, textDecorationLine: 'line-through' }} className="text-sm">
                  {`${product.price}€`}
                </Text>
              </View>
              <Text style={{ color: COLORS.accent.teal }} className="text-xl font-bold">
                {`${displayPrice}€`}
              </Text>
            </>
          ) : (
            <Text style={{ color: COLORS.primary.brightYellow }} className="text-xl font-bold">
              {`${displayPrice}€`}
            </Text>
          )}
          <Text style={{ color: COLORS.text.muted }} className="text-xs">
            {`/ ${product.weight}`}
          </Text>
        </View>

        {isOutOfStock ? (
          <View
            className="flex-row items-center px-5 py-2.5 rounded-xl"
            style={{
              backgroundColor: `${COLORS.accent.red}20`,
              borderWidth: 1,
              borderColor: `${COLORS.accent.red}40`,
            }}
          >
            <Text style={{ color: COLORS.accent.red }} className="font-bold">
              Rupture de stock
            </Text>
          </View>
        ) : quantity === 0 ? (
          <Pressable
            onPress={handleAddToCart}
            className="flex-row items-center px-5 py-2.5 rounded-xl active:opacity-80"
            style={{
              backgroundColor: isOnPromo ? '#EF4444' : COLORS.accent.forest,
              shadowColor: isOnPromo ? '#EF4444' : COLORS.accent.hemp,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
            }}
          >
            <Plus size={18} color={COLORS.text.white} />
            <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
              Ajouter
            </Text>
          </Pressable>
        ) : (
          <View className="flex-row items-center">
            <Pressable
              onPress={() => updateQuantity(product.id, quantity - 1)}
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{
                backgroundColor: `${COLORS.text.muted}20`,
                borderWidth: 1,
                borderColor: `${COLORS.text.muted}30`,
              }}
            >
              <Minus size={18} color={COLORS.text.lightGray} />
            </Pressable>
            {editingQuantity ? (
              <TextInput
                value={tempQuantity}
                onChangeText={setTempQuantity}
                onBlur={handleQuantitySubmit}
                onSubmitEditing={handleQuantitySubmit}
                keyboardType="number-pad"
                autoFocus
                selectTextOnFocus
                className="font-bold text-xl mx-2 text-center"
                style={{
                  color: COLORS.text.cream,
                  backgroundColor: `${COLORS.primary.gold}20`,
                  borderRadius: 8,
                  minWidth: 48,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                }}
              />
            ) : (
              <Pressable onPress={handleQuantityPress}>
                <Text style={{ color: COLORS.text.cream }} className="font-bold text-xl mx-4">
                  {quantity}
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleAddToCart}
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{
                backgroundColor: isOnPromo ? '#EF4444' : COLORS.accent.forest,
                shadowColor: isOnPromo ? '#EF4444' : COLORS.accent.hemp,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
              }}
            >
              <Plus size={18} color={COLORS.text.white} />
            </Pressable>
          </View>
        )}
      </View>
    </Animated.View>
    </>
  );
};

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { producerId } = useLocalSearchParams<{ producerId: string }>();

  // Review form state
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [userName, setUserName] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(true);
  const [showThankYou, setShowThankYou] = useState(false);

  const customProducers = useProducerStore((s) => s.producers);
  const updateProductInProducer = useProducerStore((s) => s.updateProductInProducer);

  // Check if user is admin or producer
  const { isAdmin, isProducer, isPro, isProApproved } = usePermissions();
  const { profile } = useAuth();

  // Sample request state
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [sampleRequestSent, setSampleRequestSent] = useState(false);

  // Supabase synced producers
  const syncedProducers = useSupabaseSyncStore((s) => s.syncedProducers);

  // Admin uses local data, non-admin uses Supabase data
  const allProducers = React.useMemo(() => {
    // Admin always uses local producers
    if (isAdmin) {
      const customIds = new Set(customProducers.map((p) => p.id));
      const sampleOnly = SAMPLE_PRODUCERS.filter((p) => !customIds.has(p.id));
      return [...customProducers, ...sampleOnly];
    }
    // Non-admin: use Supabase synced producers if available
    if (syncedProducers.length > 0) {
      return syncedProducers;
    }
    const customIds = new Set(customProducers.map((p) => p.id));
    const sampleOnly = SAMPLE_PRODUCERS.filter((p) => !customIds.has(p.id));
    return [...customProducers, ...sampleOnly];
  }, [isAdmin, syncedProducers, customProducers]);

  const producer = allProducers.find((p) => p.id === producerId);

  // Reviews
  const reviews = useProducerReviewsStore((s) => s.reviews);
  const addReview = useProducerReviewsStore((s) => s.addReview);
  const producerReviews = reviews.filter((r) => r.producerId === producerId);
  const averageRating = producerReviews.length > 0
    ? producerReviews.reduce((sum, r) => sum + r.rating, 0) / producerReviews.length
    : 0;

  const itemCount = useCartStore((s) => s.items.reduce((sum, item) => sum + item.quantity, 0));
  const cartTotal = useCartStore((s) =>
    s.items.reduce((sum, item) => sum + (item.product.price ?? 0) * item.quantity, 0)
  );

  const handleSubmitReview = () => {
    if (newRating > 0 && producerId) {
      addReview(producerId, newRating, newComment, userName || 'Anonyme');
      setNewRating(0);
      setNewComment('');
      setUserName('');
      setShowReviewForm(false);
      setShowThankYou(true);
    }
  };

  const handleAddAnotherReview = () => {
    setShowThankYou(false);
    setShowReviewForm(true);
  };

  // Handle product images update (for producers)
  const handleUpdateProductImages = (productId: string, images: string[]) => {
    if (!producer) return;

    const product = producer.products.find(p => p.id === productId);
    if (!product) return;

    const updatedProduct = {
      ...product,
      images,
      image: images[0] || product.image, // First image is the main one
    };

    updateProductInProducer(producer.id, updatedProduct);
    console.log('[Shop] Product images updated:', productId, images.length, 'images');
  };

  // Handle sample request
  const handleSampleRequest = async () => {
    if (!producer?.email) {
      console.log('[Shop] No email for producer');
      return;
    }

    // Construire les informations du professionnel
    const proName = profile?.first_name && profile?.last_name
      ? `${profile.first_name} ${profile.last_name}`
      : profile?.full_name || 'Non renseigné';
    const proCompany = profile?.company_name || profile?.business_name || 'Non renseigné';
    const proEmail = profile?.email || 'Non renseigné';
    const proAddress = profile?.address && profile?.postal_code && profile?.city
      ? `${profile.address}, ${profile.postal_code} ${profile.city}`
      : profile?.address || 'Non renseigné';
    const proPhone = profile?.phone || 'Non renseigné';

    const subject = encodeURIComponent(`Demande d'échantillons - ${producer.name}`);
    const body = encodeURIComponent(
      `Bonjour ${producer.name},\n\n` +
      `Je suis professionnel et je souhaite recevoir des échantillons de vos produits pour découvrir votre gamme.\n\n` +
      `Produits disponibles :\n` +
      producer.products.map(p => `- ${p.name} (${p.cbdPercent}% CBD)`).join('\n') +
      `\n\n` +
      `--- MES COORDONNÉES ---\n` +
      `Nom : ${proName}\n` +
      `Entreprise : ${proCompany}\n` +
      `Email : ${proEmail}\n` +
      `Adresse : ${proAddress}\n` +
      `Téléphone : ${proPhone}\n\n` +
      `Merci de me contacter pour convenir des modalités d'envoi.\n\n` +
      `Cordialement`
    );

    const mailtoUrl = `mailto:${producer.email}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        setSampleRequestSent(true);
        setShowSampleModal(false);
      } else {
        console.log('[Shop] Cannot open mailto URL');
      }
    } catch (error) {
      console.error('[Shop] Error opening mail client:', error);
    }
  };

  if (!producer) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: COLORS.background.nightSky }}>
        <Store size={64} color={COLORS.text.muted} />
        <Text style={{ color: COLORS.text.cream }} className="text-lg font-bold mt-4">
          Producteur non trouvé
        </Text>
        <Pressable
          onPress={() => router.replace(isPro ? '/(tabs)/regions' : '/(tabs)/map')}
          className="mt-4 px-6 py-3 rounded-xl"
          style={{ backgroundColor: COLORS.primary.gold }}
        >
          <Text style={{ color: COLORS.text.white }} className="font-bold">Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background.nightSky }}>
      {/* Sample Request Modal */}
      <Modal
        visible={showSampleModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSampleModal(false)}
      >
        <View className="flex-1 justify-center items-center" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <View
            className="mx-6 rounded-3xl p-6 w-full max-w-sm"
            style={{
              backgroundColor: COLORS.background.charcoal,
              borderWidth: 2,
              borderColor: `${COLORS.accent.teal}40`,
            }}
          >
            <View className="items-center mb-4">
              <View
                className="w-16 h-16 rounded-2xl items-center justify-center mb-4"
                style={{ backgroundColor: `${COLORS.accent.teal}20` }}
              >
                <Package size={32} color={COLORS.accent.teal} />
              </View>
              <Text style={{ color: COLORS.text.cream }} className="text-xl font-bold text-center">
                Demande d'échantillons
              </Text>
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm text-center mt-2">
                Envoyer une demande d'échantillons à {producer?.name} ?
              </Text>
            </View>

            {producer?.email ? (
              <View
                className="rounded-xl p-3 mb-4"
                style={{ backgroundColor: `${COLORS.background.nightSky}80` }}
              >
                <View className="flex-row items-center">
                  <Mail size={16} color={COLORS.text.muted} />
                  <Text style={{ color: COLORS.text.muted }} className="text-sm ml-2">
                    Email : {producer.email}
                  </Text>
                </View>
              </View>
            ) : (
              <View
                className="rounded-xl p-3 mb-4"
                style={{ backgroundColor: `${COLORS.accent.earth}20` }}
              >
                <Text style={{ color: COLORS.accent.earth }} className="text-sm text-center">
                  Ce producteur n'a pas encore renseigné son email de contact.
                </Text>
              </View>
            )}

            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowSampleModal(false)}
                className="flex-1 py-3 rounded-xl items-center"
                style={{
                  backgroundColor: `${COLORS.text.muted}20`,
                  borderWidth: 1,
                  borderColor: `${COLORS.text.muted}30`,
                }}
              >
                <Text style={{ color: COLORS.text.lightGray }} className="font-semibold">
                  Annuler
                </Text>
              </Pressable>
              <Pressable
                onPress={handleSampleRequest}
                disabled={!producer?.email}
                className="flex-1 py-3 rounded-xl items-center flex-row justify-center"
                style={{
                  backgroundColor: producer?.email ? COLORS.accent.teal : COLORS.text.muted,
                  opacity: producer?.email ? 1 : 0.5,
                }}
              >
                <Mail size={18} color={COLORS.text.white} />
                <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                  Envoyer
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {/* Fixed header buttons */}
      <View className="absolute top-0 left-0 right-0 z-10" style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row justify-between px-4">
          {/* Back button */}
          <Pressable
            onPress={() => router.replace(isPro ? '/(tabs)/regions' : '/(tabs)/map')}
            className="w-11 h-11 rounded-2xl items-center justify-center"
            style={{
              backgroundColor: `${COLORS.background.nightSky}90`,
              borderWidth: 1.5,
              borderColor: `${COLORS.primary.gold}40`,
            }}
          >
            <ArrowLeft size={22} color={COLORS.primary.paleGold} />
          </Pressable>

        </View>
      </View>

      {/* Cache/Sync status banner */}
      <CacheStatusBanner showOnlyOnError />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with image */}
        <View className="relative">
          {producer.image ? (
            <Image
              source={getImageSource(producer.image)}
              className="w-full h-60"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-60 items-center justify-center" style={{ backgroundColor: `${COLORS.text.white}10` }}>
              <Leaf size={64} color={COLORS.text.muted} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', `${COLORS.background.nightSky}99`, COLORS.background.nightSky]}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 120,
            }}
          />

          {/* Decorative gradient top */}
          <LinearGradient
            colors={[`${COLORS.background.nightSky}60`, 'transparent']}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 100,
            }}
          />

          {/* Sparkle decoration */}
          <View className="absolute top-0 right-20" style={{ marginTop: insets.top + 16 }}>
            <Sparkles size={16} color={COLORS.primary.brightYellow} />
          </View>
        </View>

        {/* Producer info */}
        <Animated.View entering={FadeInDown.duration(500)} className="px-5 -mt-8">
          <View
            className="rounded-2xl px-4 py-3 mb-3"
            style={{
              backgroundColor: `${COLORS.primary.gold}20`,
              borderWidth: 2,
              borderColor: `${COLORS.primary.gold}40`,
            }}
          >
            <View className="flex-row items-center justify-center">
              <Sparkles size={18} color={COLORS.primary.brightYellow} />
              <Text style={{ color: COLORS.text.cream }} className="text-2xl font-bold mx-3">
                {producer.name}
              </Text>
              <Sparkles size={18} color={COLORS.primary.brightYellow} />
            </View>
            {/* Average Rating */}
            {producerReviews.length > 0 && (
              <View className="flex-row items-center justify-center mt-2">
                <StarRating rating={Math.round(averageRating)} size={18} />
                <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold ml-2">
                  {averageRating.toFixed(1)}
                </Text>
                <Text style={{ color: COLORS.text.muted }} className="text-sm ml-1">
                  ({producerReviews.length} avis)
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center justify-center mb-4">
            <View
              className="flex-row items-center px-3 py-1.5 rounded-full"
              style={{ backgroundColor: `${COLORS.accent.forest}25` }}
            >
              <MapPin size={14} color={COLORS.accent.hemp} />
              <Text style={{ color: COLORS.accent.hemp }} className="text-sm font-semibold ml-1.5">
                {producer.city}, {producer.region}
              </Text>
            </View>
          </View>

          {producer.description && (
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm text-center mb-4">
              {producer.description}
            </Text>
          )}

          {/* Terroir info - Fantasy RPG style */}
          <View
            className="flex-row rounded-2xl p-3 mb-4"
            style={{
              backgroundColor: `${COLORS.background.charcoal}80`,
              borderWidth: 1.5,
              borderColor: `${COLORS.primary.gold}20`,
            }}
          >
            <View className="flex-1 items-center">
              <Text style={{ color: COLORS.text.muted }} className="text-xs uppercase font-bold">Sol</Text>
              <Text style={{ color: COLORS.accent.earth }} className="text-sm font-bold mt-1">
                {producer.soil.type || '-'}
              </Text>
            </View>
            <View className="w-px h-10" style={{ backgroundColor: `${COLORS.primary.gold}30` }} />
            <View className="flex-1 items-center">
              <Text style={{ color: COLORS.text.muted }} className="text-xs uppercase font-bold">Climat</Text>
              <Text style={{ color: COLORS.accent.sky }} className="text-sm font-bold mt-1">
                {producer.climate.type || '-'}
              </Text>
            </View>
            <View className="w-px h-10" style={{ backgroundColor: `${COLORS.primary.gold}30` }} />
            <View className="flex-1 items-center">
              <Text style={{ color: COLORS.text.muted }} className="text-xs uppercase font-bold">pH Sol</Text>
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-bold mt-1">
                {producer.soil.ph || '-'}
              </Text>
            </View>
          </View>

          {/* Culture types icons */}
          {(producer.cultureOutdoor || producer.cultureGreenhouse || producer.cultureIndoor) && (
            <View className="flex-row items-center justify-center mb-4">
              <CultureTypeIcons
                outdoor={producer.cultureOutdoor}
                greenhouse={producer.cultureGreenhouse}
                indoor={producer.cultureIndoor}
                size={20}
                animated={true}
              />
            </View>
          )}

          {/* Sample Request Button - Only visible for approved pros */}
          {isProApproved && (
            <Animated.View entering={FadeIn.duration(400).delay(200)}>
              {sampleRequestSent ? (
                <View
                  className="rounded-2xl p-4 mb-4"
                  style={{
                    backgroundColor: `${COLORS.accent.forest}20`,
                    borderWidth: 1.5,
                    borderColor: `${COLORS.accent.forest}40`,
                  }}
                >
                  <View className="flex-row items-center justify-center">
                    <Check size={20} color={COLORS.accent.hemp} />
                    <Text style={{ color: COLORS.accent.hemp }} className="font-bold ml-2">
                      Demande d'échantillons envoyée
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.text.lightGray }} className="text-xs text-center mt-1">
                    Le producteur vous contactera prochainement
                  </Text>
                </View>
              ) : (
                <Pressable
                  onPress={() => setShowSampleModal(true)}
                  className="rounded-2xl p-4 mb-4 flex-row items-center justify-center active:opacity-80"
                  style={{
                    backgroundColor: `${COLORS.accent.teal}15`,
                    borderWidth: 1.5,
                    borderColor: `${COLORS.accent.teal}40`,
                  }}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{ backgroundColor: `${COLORS.accent.teal}25` }}
                  >
                    <Package size={22} color={COLORS.accent.teal} />
                  </View>
                  <View className="flex-1">
                    <Text style={{ color: COLORS.accent.teal }} className="font-bold">
                      Demander des échantillons
                    </Text>
                    <Text style={{ color: COLORS.text.muted }} className="text-xs">
                      Recevez des échantillons pour découvrir les produits
                    </Text>
                  </View>
                  <View
                    className="px-3 py-1.5 rounded-lg"
                    style={{ backgroundColor: COLORS.accent.teal }}
                  >
                    <Briefcase size={16} color={COLORS.text.white} />
                  </View>
                </Pressable>
              )}
            </Animated.View>
          )}
        </Animated.View>

        {/* Products list header */}
        <View className="px-5 mb-3">
          <View className="flex-row items-center">
            <Leaf size={18} color={COLORS.accent.hemp} />
            <Text style={{ color: COLORS.primary.paleGold }} className="text-lg font-bold ml-2">
              Produits ({producer.products.length})
            </Text>
          </View>
        </View>

        {/* Products */}
        <View className="px-5">
          {producer.products.length === 0 ? (
            <View
              className="rounded-2xl p-8 items-center"
              style={{
                backgroundColor: COLORS.background.charcoal,
                borderWidth: 1.5,
                borderColor: `${COLORS.primary.gold}20`,
              }}
            >
              <LinearGradient
                colors={[`${COLORS.accent.forest}30`, `${COLORS.primary.gold}20`]}
                className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
              >
                <Leaf size={40} color={COLORS.accent.hemp} />
              </LinearGradient>
              <Text style={{ color: COLORS.text.cream }} className="text-center text-lg font-bold">
                Aucun produit disponible
              </Text>
              <Text style={{ color: COLORS.text.muted }} className="text-center text-sm mt-2">
                Ce producteur n'a pas encore ajouté de produits
              </Text>
            </View>
          ) : (
            producer.products.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                producerId={producer.id}
                producerName={producer.name}
                index={index}
                isProducer={isProducer}
                isPro={isPro}
                onUpdateProductImages={handleUpdateProductImages}
              />
            ))
          )}

          {/* Reviews Section */}
          <View className="mt-6 mb-4">
            <View className="flex-row items-center mb-4">
              <MessageSquare size={18} color={COLORS.primary.gold} />
              <Text style={{ color: COLORS.primary.paleGold }} className="text-lg font-bold ml-2">
                Avis clients ({producerReviews.length})
              </Text>
            </View>

            {/* Thank You Message */}
            {showThankYou && (
              <View
                className="rounded-2xl p-4 mb-4"
                style={{
                  backgroundColor: `${COLORS.accent.forest}20`,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.accent.forest}40`,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text style={{ color: COLORS.accent.hemp }} className="font-bold text-base">
                      Merci pour votre avis !
                    </Text>
                    <Text style={{ color: COLORS.text.lightGray }} className="text-sm mt-1">
                      Votre retour aide les autres clients.
                    </Text>
                  </View>
                  <Pressable
                    onPress={handleAddAnotherReview}
                    className="w-10 h-10 rounded-full items-center justify-center ml-3"
                    style={{
                      backgroundColor: COLORS.accent.forest,
                    }}
                  >
                    <Plus size={22} color={COLORS.text.white} />
                  </Pressable>
                </View>
              </View>
            )}

            {/* Add Review Form */}
            {showReviewForm && (
              <View
                className="rounded-2xl p-4 mb-4"
                style={{
                  backgroundColor: `${COLORS.background.charcoal}90`,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.primary.gold}20`,
                }}
              >
                <Text style={{ color: COLORS.text.cream }} className="font-semibold mb-3">
                  Donner votre avis
                </Text>

                {/* Star selection */}
                <View className="flex-row items-center mb-3">
                  <Text style={{ color: COLORS.text.muted }} className="text-sm mr-3">Note :</Text>
                  <StarRating rating={newRating} size={28} onRate={setNewRating} />
                </View>

                {/* Name input */}
                <TextInput
                  value={userName}
                  onChangeText={setUserName}
                  placeholder="Votre nom (optionnel)"
                  placeholderTextColor={COLORS.text.muted}
                  style={{
                    backgroundColor: `${COLORS.background.nightSky}80`,
                    borderWidth: 1,
                    borderColor: `${COLORS.text.muted}30`,
                    borderRadius: 12,
                    padding: 12,
                    color: COLORS.text.cream,
                    marginBottom: 12,
                  }}
                />

                {/* Comment input */}
                <TextInput
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder="Votre commentaire..."
                  placeholderTextColor={COLORS.text.muted}
                  multiline
                  numberOfLines={3}
                  style={{
                    backgroundColor: `${COLORS.background.nightSky}80`,
                    borderWidth: 1,
                    borderColor: `${COLORS.text.muted}30`,
                    borderRadius: 12,
                    padding: 12,
                    color: COLORS.text.cream,
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                />

                {/* Submit button */}
                <Pressable
                  onPress={handleSubmitReview}
                  disabled={newRating === 0}
                  className="mt-3 rounded-xl py-3 flex-row items-center justify-center"
                  style={{
                    backgroundColor: newRating > 0 ? COLORS.accent.forest : COLORS.text.muted,
                    opacity: newRating > 0 ? 1 : 0.5,
                  }}
                >
                  <Send size={18} color={COLORS.text.white} />
                  <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                    Publier l'avis
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Reviews list */}
            {producerReviews.length > 0 ? (
              producerReviews
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))
            ) : (
              <View
                className="rounded-xl p-6 items-center"
                style={{
                  backgroundColor: `${COLORS.background.charcoal}60`,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.gold}10`,
                }}
              >
                <MessageSquare size={32} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-center mt-2">
                  Aucun avis pour le moment.{'\n'}Soyez le premier à donner votre avis !
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating cart button */}
      {itemCount > 0 && (
        <View
          className="absolute bottom-0 left-0 right-0 px-5"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <Pressable
            onPress={() => router.push('/(tabs)/cart')}
            className="rounded-2xl py-3 flex-row items-center justify-center active:opacity-90"
            style={{
              backgroundColor: COLORS.primary.gold,
              shadowColor: COLORS.primary.brightYellow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
            }}
          >
            <ShoppingCart size={22} color={COLORS.text.white} />
            <Text style={{ color: COLORS.text.white }} className="font-bold text-lg ml-3">
              Voir le panier ({itemCount}) - {cartTotal.toFixed(0)}€
            </Text>
            <Sparkles size={16} color={COLORS.text.white} style={{ marginLeft: 8 }} />
          </Pressable>
        </View>
      )}
    </View>
  );
}
