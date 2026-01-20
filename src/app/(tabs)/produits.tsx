import React, { useState, useMemo } from 'react';
import { View, ScrollView, Pressable, Image, Modal } from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package, Plus, Sparkles, Edit3, Trash2, ChevronDown, ChevronUp, ShoppingCart, Leaf, MapPin, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { COLORS } from '@/lib/colors';
import { useProducerStore, useCartStore, useSupabaseSyncStore } from '@/lib/store';
import { ProducerProduct, Producer, PRODUCT_TYPE_LABELS, PRODUCT_TYPE_COLORS, SAMPLE_PRODUCERS } from '@/lib/producers';
import { AddProductModal } from '@/components/AddProductModal';
import { usePermissions, useAuth } from '@/lib/useAuth';

export default function ProduitsScreen() {
  const insets = useSafeAreaInsets();
  const customProducers = useProducerStore((s) => s.producers);
  const syncedProducers = useSupabaseSyncStore((s) => s.syncedProducers);
  const updateProducer = useProducerStore((s) => s.updateProducer);
  const addToCart = useCartStore((s) => s.addToCart);
  const { isAdmin, isProducer } = usePermissions();
  const { profile } = useAuth();

  // Déterminer si l'utilisateur peut gérer des produits (admin ou producteur)
  const canManageProducts = isAdmin || isProducer;

  // ID du producteur lié au profil (pour les producteurs)
  const linkedProducerId = (profile as any)?.linked_producer_id ?? null;

  // Combine custom and sample producers, prioritizing custom versions
  const allProducers = useMemo(() => {
    // Utiliser les producteurs synchronisés si disponibles (non-admin)
    if (!isAdmin && syncedProducers.length > 0) {
      return syncedProducers;
    }
    const customIds = new Set(customProducers.map(p => p.id));
    const filteredSamples = SAMPLE_PRODUCERS.filter(p => !customIds.has(p.id));
    return [...customProducers, ...filteredSamples];
  }, [isAdmin, syncedProducers, customProducers]);

  // Vérifier si l'utilisateur peut éditer un producteur spécifique
  const canEditProducer = (producerId: string) => {
    if (isAdmin) return true;
    if (isProducer && linkedProducerId === producerId) return true;
    return false;
  };

  const [expandedProducers, setExpandedProducers] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProducerId, setSelectedProducerId] = useState<string>('');
  const [selectedProducerName, setSelectedProducerName] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<ProducerProduct | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ producerId: string; productId: string } | null>(null);
  const [showAddedToast, setShowAddedToast] = useState(false);

  // Get all producers with products
  const producersWithProducts = allProducers.filter((p) => p.products.length > 0);
  const totalProducts = allProducers.reduce((sum, p) => sum + p.products.length, 0);

  const toggleProducer = (producerId: string) => {
    setExpandedProducers((prev) =>
      prev.includes(producerId)
        ? prev.filter((id) => id !== producerId)
        : [...prev, producerId]
    );
  };

  const handleAddProduct = (producerId: string, producerName: string) => {
    setSelectedProducerId(producerId);
    setSelectedProducerName(producerName);
    setEditingProduct(null);
    setShowAddModal(true);
  };

  const handleEditProduct = (producerId: string, producerName: string, product: ProducerProduct) => {
    setSelectedProducerId(producerId);
    setSelectedProducerName(producerName);
    setEditingProduct(product);
    setShowAddModal(true);
  };

  const handleDeleteProduct = (producerId: string, productId: string) => {
    setProductToDelete({ producerId, productId });
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      const producer = allProducers.find((p) => p.id === productToDelete.producerId);
      if (producer) {
        const updatedProducts = producer.products.filter((p) => p.id !== productToDelete.productId);
        updateProducer(productToDelete.producerId, { products: updatedProducts });
      }
    }
    setShowDeleteConfirm(false);
    setProductToDelete(null);
  };

  const handleAddToCart = (product: ProducerProduct, producerId: string, producerName: string) => {
    const hasPromo = product.isOnPromo && product.promoPercent && product.promoPercent > 0;
    addToCart(product, producerId, producerName, hasPromo ? product.promoPercent : undefined);
    setShowAddedToast(true);
    setTimeout(() => setShowAddedToast(false), 2000);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background.nightSky }}>
      {/* Toast ajouté au panier */}
      {showAddedToast && (
        <Animated.View
          entering={FadeInUp.duration(300)}
          className="absolute top-20 left-6 right-6 z-50"
        >
          <View
            className="rounded-2xl p-4 flex-row items-center"
            style={{
              backgroundColor: COLORS.accent.forest,
              shadowColor: COLORS.accent.hemp,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
            }}
          >
            <Check size={24} color={COLORS.text.white} />
            <Text style={{ color: COLORS.text.white }} className="font-bold ml-3">
              Produit ajouté au panier !
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Delete Confirmation Modal - Admin or Producer */}
      {canManageProducts && (
        <Modal
          visible={showDeleteConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeleteConfirm(false)}
        >
          <View className="flex-1 bg-black/80 items-center justify-center px-6">
            <View
              className="w-full max-w-sm rounded-3xl p-6"
              style={{
                backgroundColor: COLORS.background.charcoal,
                borderWidth: 2,
                borderColor: COLORS.accent.red,
              }}
            >
              <View className="items-center mb-4">
                <View
                  className="w-16 h-16 rounded-full items-center justify-center mb-3"
                  style={{ backgroundColor: `${COLORS.accent.red}20` }}
                >
                  <Trash2 size={32} color={COLORS.accent.red} />
                </View>
                <Text style={{ color: COLORS.text.cream }} className="text-xl font-bold text-center">
                  Supprimer ce produit ?
                </Text>
              </View>
              <Text style={{ color: COLORS.text.muted }} className="text-center mb-6">
                Cette action est irréversible.
              </Text>
              <View className="flex-row">
                <Pressable
                  onPress={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl mr-2"
                  style={{ backgroundColor: COLORS.background.mediumBlue }}
                >
                  <Text style={{ color: COLORS.text.lightGray }} className="text-center font-semibold">
                    Annuler
                  </Text>
                </Pressable>
                <Pressable
                  onPress={confirmDelete}
                  className="flex-1 py-3 rounded-xl ml-2"
                  style={{ backgroundColor: COLORS.accent.red }}
                >
                  <Text style={{ color: COLORS.text.white }} className="text-center font-semibold">
                    Supprimer
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Add/Edit Product Modal - Admin or Producer */}
      {canManageProducts && (
        <AddProductModal
          visible={showAddModal}
          producerId={selectedProducerId}
          producerName={selectedProducerName}
          onClose={() => {
            setShowAddModal(false);
            setEditingProduct(null);
          }}
          editingProduct={editingProduct}
        />
      )}

      {/* Decorative gradient */}
      <LinearGradient
        colors={[`${COLORS.accent.hemp}15`, 'transparent', `${COLORS.primary.gold}10`]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      {/* Header */}
      <View style={{ paddingTop: insets.top }}>
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="px-6 py-4"
          style={{ borderBottomWidth: 2, borderBottomColor: `${COLORS.primary.gold}30` }}
        >
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-2xl items-center justify-center mr-4"
                style={{
                  backgroundColor: `${COLORS.accent.hemp}20`,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.accent.hemp}40`,
                }}
              >
                <Package size={24} color={COLORS.accent.hemp} />
              </View>
              <View>
                <View className="flex-row items-center">
                  <Text style={{ color: COLORS.text.cream }} className="text-2xl font-bold">
                    Produits
                  </Text>
                  <Sparkles size={18} color={COLORS.primary.brightYellow} style={{ marginLeft: 8 }} />
                </View>
                <Text style={{ color: COLORS.text.muted }} className="text-sm">
                  {totalProducts} produit{totalProducts > 1 ? 's' : ''} • {producersWithProducts.length} producteur{producersWithProducts.length > 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Products List */}
      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {producersWithProducts.length === 0 ? (
          <Animated.View
            entering={FadeInUp.duration(500)}
            className="items-center justify-center py-20"
          >
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: `${COLORS.text.muted}20` }}
            >
              <Package size={48} color={COLORS.text.muted} />
            </View>
            <Text style={{ color: COLORS.text.cream }} className="text-xl font-bold text-center">
              {canManageProducts ? 'Aucun produit' : 'Aucun produit disponible'}
            </Text>
            <Text style={{ color: COLORS.text.muted }} className="text-center mt-2">
              {canManageProducts ? 'Ajoutez des produits via votre espace' : 'Revenez bientôt pour découvrir nos produits'}
            </Text>
          </Animated.View>
        ) : (
          producersWithProducts.map((producer: Producer, index: number) => (
            <Animated.View
              key={producer.id}
              entering={FadeInUp.duration(500).delay(index * 80)}
              className="mb-4"
            >
              {/* Producer Header */}
              <Pressable
                onPress={() => toggleProducer(producer.id)}
                className="rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: COLORS.background.charcoal,
                  borderWidth: 1.5,
                  borderColor: expandedProducers.includes(producer.id)
                    ? `${COLORS.accent.hemp}50`
                    : `${COLORS.primary.gold}25`,
                }}
              >
                <View className="p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                        style={{ backgroundColor: `${COLORS.accent.forest}20` }}
                      >
                        <Leaf size={24} color={COLORS.accent.hemp} />
                      </View>
                      <View className="flex-1">
                        <Text style={{ color: COLORS.text.cream }} className="font-bold text-lg">
                          {producer.name}
                        </Text>
                        <View className="flex-row items-center mt-0.5">
                          <MapPin size={12} color={COLORS.text.muted} />
                          <Text style={{ color: COLORS.text.muted }} className="text-sm ml-1">
                            {producer.region}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      <View
                        className="px-3 py-1.5 rounded-full mr-3"
                        style={{ backgroundColor: `${COLORS.primary.gold}20` }}
                      >
                        <Text style={{ color: COLORS.primary.paleGold }} className="font-bold text-sm">
                          {producer.products.length}
                        </Text>
                      </View>
                      {expandedProducers.includes(producer.id) ? (
                        <ChevronUp size={24} color={COLORS.text.muted} />
                      ) : (
                        <ChevronDown size={24} color={COLORS.text.muted} />
                      )}
                    </View>
                  </View>
                </View>
              </Pressable>

              {/* Products List (expanded) */}
              {expandedProducers.includes(producer.id) && (
                <View className="mt-2">
                  {producer.products.map((product: ProducerProduct) => {
                    const hasPromo = product.isOnPromo && product.promoPercent && product.promoPercent > 0;
                    const promoPrice = hasPromo ? product.price * (1 - (product.promoPercent ?? 0) / 100) : product.price;
                    const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;
                    return (
                    <View
                      key={product.id}
                      className="mb-2 rounded-xl overflow-hidden"
                      style={{
                        backgroundColor: COLORS.background.charcoal,
                        borderWidth: 1,
                        borderColor: isOutOfStock ? `${COLORS.accent.red}50` : hasPromo ? '#EF444450' : `${COLORS.primary.gold}15`,
                        opacity: isOutOfStock ? 0.7 : 1,
                      }}
                    >
                      <View className="flex-row p-3">
                        {/* Product Image */}
                        <View className="relative">
                          <View
                            className="rounded-xl overflow-hidden"
                            style={{ borderWidth: 1.5, borderColor: `${COLORS.primary.gold}30` }}
                          >
                            <Image
                              source={{ uri: product.image }}
                              className="w-20 h-20"
                              resizeMode="cover"
                            />
                            {/* Overlay grisé si rupture */}
                            {isOutOfStock && (
                              <View
                                className="absolute inset-0"
                                style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                              />
                            )}
                          </View>
                          {/* Promo badge */}
                          {hasPromo && !isOutOfStock && (
                            <View
                              className="absolute top-0 left-0 right-0 rounded-t-lg px-1 py-0.5"
                              style={{ backgroundColor: '#EF4444' }}
                            >
                              <Text style={{ color: '#FFFFFF', fontSize: 8, fontWeight: '800', textAlign: 'center' }}>
                                -{product.promoPercent}%
                              </Text>
                            </View>
                          )}
                          {/* Stock badge - Rupture */}
                          {isOutOfStock && (
                            <View
                              className="absolute inset-0 items-center justify-center"
                            >
                              <View
                                className="px-2 py-1 rounded-lg"
                                style={{ backgroundColor: COLORS.accent.red }}
                              >
                                <Text style={{ color: '#FFFFFF', fontSize: 9, fontWeight: '800', textAlign: 'center' }}>
                                  RUPTURE
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>

                        {/* Product Info */}
                        <View className="flex-1 ml-3">
                          <View className="flex-row items-start justify-between">
                            <View className="flex-1">
                              <View
                                className="self-start px-2 py-0.5 rounded-full mb-1"
                                style={{ backgroundColor: `${PRODUCT_TYPE_COLORS[product.type]}20` }}
                              >
                                <Text
                                  className="text-xs font-bold"
                                  style={{ color: PRODUCT_TYPE_COLORS[product.type] }}
                                >
                                  {PRODUCT_TYPE_LABELS[product.type]}
                                </Text>
                              </View>
                              <Text style={{ color: COLORS.text.cream }} className="font-bold text-base">
                                {product.name}
                              </Text>
                              <Text style={{ color: COLORS.text.muted }} className="text-xs">
                                {product.weight} • CBD {product.cbdPercent}%
                              </Text>
                            </View>
                            {hasPromo ? (
                              <View className="items-end">
                                <Text style={{ color: COLORS.text.muted, textDecorationLine: 'line-through' }} className="text-xs">
                                  {product.price}€
                                </Text>
                                <Text style={{ color: '#EF4444' }} className="font-bold text-lg">
                                  {promoPrice.toFixed(2)}€
                                </Text>
                              </View>
                            ) : (
                              <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold text-lg">
                                {product.price}€
                              </Text>
                            )}
                          </View>

                          {/* Action buttons */}
                          <View className="flex-row mt-2 justify-end">
                            {isOutOfStock ? (
                              <View
                                className="flex-row items-center px-3 py-1.5 rounded-lg mr-2"
                                style={{ backgroundColor: `${COLORS.accent.red}15` }}
                              >
                                <Text style={{ color: COLORS.accent.red }} className="text-xs font-semibold">
                                  Rupture de stock
                                </Text>
                              </View>
                            ) : (
                              <Pressable
                                onPress={() => handleAddToCart(product, producer.id, producer.name)}
                                className="flex-row items-center px-3 py-1.5 rounded-lg mr-2"
                                style={{ backgroundColor: `${COLORS.accent.forest}20` }}
                              >
                                <ShoppingCart size={14} color={COLORS.accent.hemp} />
                                <Text style={{ color: COLORS.accent.hemp }} className="text-xs font-semibold ml-1">
                                  Panier
                                </Text>
                              </Pressable>
                            )}
                            {canEditProducer(producer.id) && (
                              <>
                                <Pressable
                                  onPress={() => handleEditProduct(producer.id, producer.name, product)}
                                  className="flex-row items-center px-3 py-1.5 rounded-lg mr-2"
                                  style={{ backgroundColor: `${COLORS.accent.sky}20` }}
                                >
                                  <Edit3 size={14} color={COLORS.accent.sky} />
                                  <Text style={{ color: COLORS.accent.sky }} className="text-xs font-semibold ml-1">
                                    Modifier
                                  </Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => handleDeleteProduct(producer.id, product.id)}
                                  className="flex-row items-center px-3 py-1.5 rounded-lg"
                                  style={{ backgroundColor: `${COLORS.accent.red}20` }}
                                >
                                  <Trash2 size={14} color={COLORS.accent.red} />
                                </Pressable>
                              </>
                            )}
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                  })}

                  {/* Add product button - Admin or Producer (own products) */}
                  {canEditProducer(producer.id) && (
                    <Pressable
                      onPress={() => handleAddProduct(producer.id, producer.name)}
                      className="flex-row items-center justify-center py-3 rounded-xl mb-2"
                      style={{
                        backgroundColor: `${COLORS.accent.hemp}15`,
                        borderWidth: 1.5,
                        borderColor: `${COLORS.accent.hemp}30`,
                        borderStyle: 'dashed',
                      }}
                    >
                      <Plus size={18} color={COLORS.accent.hemp} />
                      <Text style={{ color: COLORS.accent.hemp }} className="font-semibold ml-2">
                        Ajouter un produit
                      </Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Animated.View>
          ))
        )}

        {/* Info Card */}
        {producersWithProducts.length > 0 && (
          <Animated.View entering={FadeInUp.duration(500).delay(400)}>
            <View
              className="rounded-2xl p-5 mt-4"
              style={{
                backgroundColor: `${COLORS.primary.gold}10`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.gold}20`,
              }}
            >
              <View className="flex-row items-center mb-2">
                <Sparkles size={18} color={COLORS.primary.paleGold} />
                <Text style={{ color: COLORS.primary.paleGold }} className="font-bold ml-2">
                  {canManageProducts ? 'Astuce' : 'Nos producteurs'}
                </Text>
              </View>
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm">
                {canManageProducts
                  ? 'Cliquez sur un producteur pour voir et gérer ses produits. Vous pouvez ajouter, modifier ou supprimer des produits directement depuis cette page.'
                  : 'Découvrez les produits de nos producteurs locaux. Cliquez sur un producteur pour voir sa sélection de produits CBD de qualité.'
                }
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
