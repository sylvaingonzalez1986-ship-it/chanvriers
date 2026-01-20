import React, { useState } from 'react';
import { View, ScrollView, Pressable, Image, Modal } from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Package, Plus, Sparkles, Edit3, Trash2, ChevronDown, ChevronUp, ShoppingCart, Gift, Eye, EyeOff, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { COLORS } from '@/lib/colors';
import { usePacksStore, useCartStore, Pack } from '@/lib/store';
import { AddPackModal } from '@/components/AddPackModal';
import { ASSET_IMAGES, getImageSource } from '@/lib/asset-images';
import { usePricingContext, getProductPrice } from '@/lib/useProductPricing';
import { deletePackFromSupabase, isSupabaseSyncConfigured } from '@/lib/supabase-sync';
import { usePermissions } from '@/lib/useAuth';
import { CompactCacheStatus } from '@/components/CacheStatusBanner';

// Default image for packs without valid URL
const DEFAULT_PACK_IMAGE = 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400';

// Helper to get valid image source for packs
const getPackImageSource = (image: string | undefined): number | { uri: string } => {
  if (!image) return { uri: DEFAULT_PACK_IMAGE };
  // If it's an asset image, return the require
  if (image.startsWith('asset:')) {
    const assetId = image.replace('asset:', '');
    const assetSource = ASSET_IMAGES[assetId];
    if (assetSource) return assetSource;
    return { uri: DEFAULT_PACK_IMAGE };
  }
  // If it's a valid http/https URL, use it
  if (image.startsWith('http://') || image.startsWith('https://')) {
    return { uri: image };
  }
  // Otherwise return default
  return { uri: DEFAULT_PACK_IMAGE };
};

export default function PacksScreen() {
  const insets = useSafeAreaInsets();
  const packs = usePacksStore((s) => s.packs);
  const removePack = usePacksStore((s) => s.removePack);
  const togglePackActive = usePacksStore((s) => s.togglePackActive);
  const addToCart = useCartStore((s) => s.addToCart);
  const { isAdmin } = usePermissions();

  // Pricing context pour afficher les bons prix selon le rôle
  const { pricingMode, isPro, priceLabel } = usePricingContext();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPack, setEditingPack] = useState<Pack | null>(null);
  const [expandedPacks, setExpandedPacks] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [packToDelete, setPackToDelete] = useState<string | null>(null);
  const [showAddedToast, setShowAddedToast] = useState(false);

  // Pour les clients, ne montrer que les packs actifs
  const visiblePacks = isAdmin ? packs : packs.filter((p) => p.active);
  const activePacks = packs.filter((p) => p.active);
  const inactivePacks = packs.filter((p) => !p.active);

  const togglePack = (packId: string) => {
    setExpandedPacks((prev) =>
      prev.includes(packId)
        ? prev.filter((id) => id !== packId)
        : [...prev, packId]
    );
  };

  const handleAddPack = () => {
    setEditingPack(null);
    setShowAddModal(true);
  };

  const handleEditPack = (pack: Pack) => {
    setEditingPack(pack);
    setShowAddModal(true);
  };

  const handleDeletePack = (packId: string) => {
    setPackToDelete(packId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (packToDelete) {
      // Supprimer localement
      removePack(packToDelete);

      // Supprimer de Supabase si configuré
      if (isSupabaseSyncConfigured()) {
        try {
          await deletePackFromSupabase(packToDelete);
          console.log('[Packs] Pack supprimé de Supabase:', packToDelete);
        } catch (error) {
          console.error('[Packs] Erreur suppression Supabase:', error);
        }
      }
    }
    setShowDeleteConfirm(false);
    setPackToDelete(null);
  };

  const handleAddToCart = (pack: Pack) => {
    const currentPrice = getPackPrice(pack);
    addToCart(
      {
        id: pack.id,
        name: pack.name,
        price: currentPrice,
        image: pack.image,
        type: 'fleur',
        weight: `${pack.items.length} produits`,
        description: pack.description,
        cbdPercent: 0,
        thcPercent: 0,
      },
      'packs-store',
      'Les Chanvriers Bretons'
    );
    setShowAddedToast(true);
    setTimeout(() => setShowAddedToast(false), 2000);
  };

  // Helper pour obtenir le prix du pack selon le rôle
  const getPackPrice = (pack: Pack) => {
    // Si le pack a un prix pro et que l'utilisateur est pro, utiliser le prix pro
    if (isPro && pack.pricePro !== undefined && pack.pricePro !== null) {
      return pack.pricePro;
    }
    return pack.price;
  };

  const calculateDiscount = (pack: Pack) => {
    const currentPrice = getPackPrice(pack);
    if (!pack.originalPrice || pack.originalPrice <= currentPrice) return 0;
    return Math.round(((pack.originalPrice - currentPrice) / pack.originalPrice) * 100);
  };

  const calculateSavings = (pack: Pack) => {
    return pack.originalPrice - getPackPrice(pack);
  };

  const renderPackCard = (pack: Pack, index: number) => {
    const isExpanded = expandedPacks.includes(pack.id);
    const discount = calculateDiscount(pack);

    return (
      <Animated.View
        key={pack.id}
        entering={FadeInUp.duration(500).delay(index * 80)}
        className="mb-4"
      >
        {/* Pack Header */}
        <Pressable
          onPress={() => togglePack(pack.id)}
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: COLORS.background.charcoal,
            borderWidth: 1.5,
            borderColor: isExpanded ? `${pack.color}50` : `${COLORS.primary.gold}25`,
            opacity: pack.active ? 1 : 0.7,
          }}
        >
          {/* Image */}
          <View className="relative">
            <Image
              source={getPackImageSource(pack.image)}
              className="w-full h-32"
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', `${COLORS.background.charcoal}E6`]}
              style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 50 }}
            />
            {pack.tag && (
              <View
                className="absolute top-2 left-2 px-2 py-1 rounded-full"
                style={{ backgroundColor: pack.color }}
              >
                <Text style={{ color: COLORS.text.white }} className="font-bold text-xs">
                  {pack.tag}
                </Text>
              </View>
            )}
            {discount > 0 && (
              <View
                className="absolute top-2 right-2 px-2 py-1 rounded-full"
                style={{ backgroundColor: COLORS.accent.hemp }}
              >
                <Text style={{ color: COLORS.text.white }} className="font-bold text-xs">
                  -{discount}%
                </Text>
              </View>
            )}
            {isAdmin && !pack.active && (
              <View
                className="absolute top-2 right-2 px-2 py-1 rounded-full flex-row items-center"
                style={{ backgroundColor: COLORS.text.muted }}
              >
                <EyeOff size={12} color={COLORS.text.white} />
                <Text style={{ color: COLORS.text.white }} className="font-bold text-xs ml-1">
                  Masqué
                </Text>
              </View>
            )}
          </View>

          <View className="p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                  style={{ backgroundColor: `${pack.color}20` }}
                >
                  <Package size={20} color={pack.color} />
                </View>
                <View className="flex-1">
                  <Text style={{ color: COLORS.text.cream }} className="font-bold text-lg">
                    {pack.name}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm">
                    {pack.items.length} produit{pack.items.length > 1 ? 's' : ''} inclus
                  </Text>
                </View>
              </View>
              <View className="items-end mr-3">
                {pack.originalPrice > getPackPrice(pack) && (
                  <Text
                    style={{
                      color: COLORS.text.muted,
                      textDecorationLine: 'line-through',
                      fontSize: 12,
                    }}
                  >
                    {pack.originalPrice}€
                  </Text>
                )}
                <View className="flex-row items-center">
                  {isPro && pack.pricePro !== undefined && pack.pricePro !== null && (
                    <Text style={{ color: COLORS.accent.teal, fontSize: 10, marginRight: 4 }}>PRO</Text>
                  )}
                  <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold text-xl">
                    {getPackPrice(pack)}€
                  </Text>
                </View>
              </View>
              {isExpanded ? (
                <ChevronUp size={24} color={COLORS.text.muted} />
              ) : (
                <ChevronDown size={24} color={COLORS.text.muted} />
              )}
            </View>
          </View>
        </Pressable>

        {/* Expanded content */}
        {isExpanded && (
          <View className="mt-2">
            {/* Description */}
            {pack.description && (
              <View
                className="rounded-xl p-3 mb-2"
                style={{ backgroundColor: COLORS.background.charcoal }}
              >
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm">
                  {pack.description}
                </Text>
              </View>
            )}

            {/* Items list */}
            <View
              className="rounded-xl p-3 mb-2"
              style={{ backgroundColor: COLORS.background.charcoal }}
            >
              <Text style={{ color: COLORS.text.lightGray }} className="font-semibold mb-2">
                Contenu du pack
              </Text>
              {pack.items.map((item, idx) => (
                <View
                  key={idx}
                  className="flex-row items-center justify-between py-2"
                  style={{
                    borderBottomWidth: idx < pack.items.length - 1 ? 1 : 0,
                    borderBottomColor: `${COLORS.primary.gold}15`,
                  }}
                >
                  <View className="flex-row items-center flex-1">
                    <View
                      className="w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: pack.color }}
                    />
                    <View className="flex-1">
                      <Text style={{ color: COLORS.text.cream }}>
                        {item.name}
                      </Text>
                      {item.producerName && (
                        <Text style={{ color: COLORS.text.muted }} className="text-xs">
                          {item.producerName}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Text style={{ color: COLORS.text.muted }} className="text-sm mr-3">
                    {item.quantity}
                  </Text>
                  <Text style={{ color: COLORS.primary.paleGold }} className="font-medium">
                    {item.value}€
                  </Text>
                </View>
              ))}
              {/* Total */}
              <View
                className="flex-row justify-between pt-2 mt-2"
                style={{ borderTopWidth: 1, borderTopColor: `${COLORS.primary.gold}30` }}
              >
                <Text style={{ color: COLORS.text.muted }}>Valeur totale</Text>
                <Text style={{ color: COLORS.text.lightGray }} className="font-bold">
                  {pack.items.reduce((sum, item) => sum + item.value, 0)}€
                </Text>
              </View>
              {calculateSavings(pack) > 0 && (
                <View className="flex-row justify-between mt-1">
                  <Text style={{ color: COLORS.accent.hemp }}>Économie</Text>
                  <Text style={{ color: COLORS.accent.hemp }} className="font-bold">
                    -{calculateSavings(pack)}€
                  </Text>
                </View>
              )}
            </View>

            {/* Action buttons */}
            <View className="flex-row mb-2">
              <Pressable
                onPress={() => handleAddToCart(pack)}
                className="flex-1 flex-row items-center justify-center py-3 rounded-xl"
                style={{ backgroundColor: pack.color }}
              >
                <ShoppingCart size={18} color={COLORS.text.white} />
                <Text style={{ color: COLORS.text.white }} className="font-semibold ml-2">
                  Ajouter au panier
                </Text>
              </Pressable>
            </View>

            {/* Admin only buttons */}
            {isAdmin && (
              <View className="flex-row">
                <Pressable
                  onPress={() => togglePackActive(pack.id)}
                  className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl mr-2"
                  style={{ backgroundColor: `${pack.active ? COLORS.text.muted : COLORS.accent.hemp}20` }}
                >
                  {pack.active ? (
                    <>
                      <EyeOff size={16} color={COLORS.text.muted} />
                      <Text style={{ color: COLORS.text.muted }} className="font-medium ml-1 text-sm">
                        Masquer
                      </Text>
                    </>
                  ) : (
                    <>
                      <Eye size={16} color={COLORS.accent.hemp} />
                      <Text style={{ color: COLORS.accent.hemp }} className="font-medium ml-1 text-sm">
                        Activer
                      </Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => handleEditPack(pack)}
                  className="flex-1 flex-row items-center justify-center py-2.5 rounded-xl mr-2"
                  style={{ backgroundColor: `${COLORS.accent.sky}20` }}
                >
                  <Edit3 size={16} color={COLORS.accent.sky} />
                  <Text style={{ color: COLORS.accent.sky }} className="font-medium ml-1 text-sm">
                    Modifier
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleDeletePack(pack.id)}
                  className="flex-row items-center justify-center px-4 py-2.5 rounded-xl"
                  style={{ backgroundColor: `${COLORS.accent.red}20` }}
                >
                  <Trash2 size={16} color={COLORS.accent.red} />
                </Pressable>
              </View>
            )}
          </View>
        )}
      </Animated.View>
    );
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
              Pack ajouté au panier !
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Delete Confirmation Modal - Admin only */}
      {isAdmin && (
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
                  Supprimer ce pack ?
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

      {/* Add/Edit Pack Modal - Admin only */}
      {isAdmin && (
        <AddPackModal
          visible={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setEditingPack(null);
          }}
          editingPack={editingPack}
        />
      )}

      {/* Decorative gradient */}
      <LinearGradient
        colors={[`${COLORS.primary.orange}15`, 'transparent', `${COLORS.primary.gold}10`]}
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
                  backgroundColor: `${COLORS.primary.orange}20`,
                  borderWidth: 1.5,
                  borderColor: `${COLORS.primary.orange}40`,
                }}
              >
                <Gift size={24} color={COLORS.primary.orange} />
              </View>
              <View>
                <View className="flex-row items-center">
                  <Text style={{ color: COLORS.text.cream }} className="text-2xl font-bold">
                    Nos Packs
                  </Text>
                  <Sparkles size={18} color={COLORS.primary.brightYellow} style={{ marginLeft: 8 }} />
                </View>
                <Text style={{ color: COLORS.text.muted }} className="text-sm">
                  {isAdmin
                    ? `${packs.length} pack${packs.length > 1 ? 's' : ''} • ${activePacks.length} actif${activePacks.length > 1 ? 's' : ''}`
                    : `${activePacks.length} pack${activePacks.length > 1 ? 's' : ''} disponible${activePacks.length > 1 ? 's' : ''}`
                  }
                </Text>
              </View>
            </View>
            {isAdmin && (
              <Pressable
                onPress={handleAddPack}
                className="flex-row items-center px-4 py-2.5 rounded-xl"
                style={{
                  backgroundColor: COLORS.primary.orange,
                  shadowColor: COLORS.primary.orange,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }}
              >
                <Plus size={18} color={COLORS.text.white} />
                <Text style={{ color: COLORS.text.white }} className="font-bold ml-1">
                  Créer
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>

      {/* Cache status banner */}
      <CompactCacheStatus />

      {/* Packs List */}
      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {visiblePacks.length === 0 ? (
          <Animated.View
            entering={FadeInUp.duration(500)}
            className="items-center justify-center py-20"
          >
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: `${COLORS.text.muted}20` }}
            >
              <Gift size={48} color={COLORS.text.muted} />
            </View>
            <Text style={{ color: COLORS.text.cream }} className="text-xl font-bold text-center">
              {isAdmin ? 'Aucun pack' : 'Aucun pack disponible'}
            </Text>
            <Text style={{ color: COLORS.text.muted }} className="text-center mt-2 mb-6">
              {isAdmin ? 'Créez votre premier pack pour commencer' : 'Revenez bientôt pour découvrir nos offres'}
            </Text>
            {isAdmin && (
              <Pressable
                onPress={handleAddPack}
                className="flex-row items-center px-6 py-3 rounded-xl"
                style={{ backgroundColor: COLORS.primary.orange }}
              >
                <Plus size={20} color={COLORS.text.white} />
                <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                  Créer un pack
                </Text>
              </Pressable>
            )}
          </Animated.View>
        ) : isAdmin ? (
          <>
            {/* Admin view: séparé actifs/masqués */}
            {activePacks.length > 0 && (
              <View className="mb-4">
                <Text style={{ color: COLORS.accent.hemp }} className="font-bold mb-3">
                  Packs actifs ({activePacks.length})
                </Text>
                {activePacks.map((pack, index) => renderPackCard(pack, index))}
              </View>
            )}

            {inactivePacks.length > 0 && (
              <View>
                <Text style={{ color: COLORS.text.muted }} className="font-bold mb-3">
                  Packs masqués ({inactivePacks.length})
                </Text>
                {inactivePacks.map((pack, index) => renderPackCard(pack, index + activePacks.length))}
              </View>
            )}

            {/* Add pack button - Admin only */}
            <Pressable
              onPress={handleAddPack}
              className="flex-row items-center justify-center py-4 rounded-xl mt-4"
              style={{
                backgroundColor: `${COLORS.primary.orange}15`,
                borderWidth: 1.5,
                borderColor: `${COLORS.primary.orange}30`,
                borderStyle: 'dashed',
              }}
            >
              <Plus size={20} color={COLORS.primary.orange} />
              <Text style={{ color: COLORS.primary.orange }} className="font-semibold ml-2">
                Ajouter un pack
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            {/* Client view: juste la liste des packs actifs */}
            {visiblePacks.map((pack, index) => renderPackCard(pack, index))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
