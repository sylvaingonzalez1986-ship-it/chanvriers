import React, { useState } from 'react';
import { View, ScrollView, Dimensions, Pressable, Modal, Share, Alert } from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Grid3X3, Package, Gift, X, Copy, Share2, Sparkles, Check, ChevronLeft } from 'lucide-react-native';
import { useCollectionStore, useReferralStore } from '@/lib/store';
import { CollectionCard } from '@/components/CollectionCard';
import { ProductDetailModal } from '@/components/ProductDetailModal';
import { RARITY_CONFIG, Rarity, CollectionItem } from '@/lib/types';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { isSupabaseSyncConfigured, getGiftCodeForCollectionItem, claimGiftedLotWithDetails, ClaimGiftResult } from '@/lib/supabase-sync';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2; // 2 columns with padding and gap

// Gift Modal Component
const GiftModal = ({
  visible,
  onClose,
  item,
  onSend,
  isLoading
}: {
  visible: boolean;
  onClose: () => void;
  item: CollectionItem | null;
  onSend: (item: CollectionItem) => void;
  isLoading?: boolean;
}) => {

  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#1A1F1D', borderRadius: 24, padding: 24 }}>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Gift size={24} color="#D4AF37" />
              <Text className="text-white text-xl font-bold ml-2">Envoyer en cadeau</Text>
            </View>
            <Pressable onPress={onClose} className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
              <X size={18} color="#fff" />
            </Pressable>
          </View>

          <View className="bg-white/5 rounded-xl p-4 mb-4">
            <Text className="text-white font-semibold">{item.product.name}</Text>
            <Text className="text-gray-400 text-sm mt-1">{item.product.producer}</Text>
            <Text style={{ color: RARITY_CONFIG[item.product.rarity].color }} className="text-sm mt-1">
              {RARITY_CONFIG[item.product.rarity].label}
            </Text>
          </View>

          <Text className="text-gray-400 text-sm mb-4">
            Un code unique sera généré que vous pourrez partager avec un ami.
            Quand il utilisera le lot, vous gagnerez 10 points de parrainage !
          </Text>

          <Pressable
            onPress={() => onSend(item)}
            disabled={isLoading}
            className="bg-amber-600 py-4 rounded-xl flex-row items-center justify-center"
            style={{ opacity: isLoading ? 0.6 : 1 }}
          >
            <Gift size={20} color="#fff" />
            <Text className="text-white font-bold text-lg ml-2">
              {isLoading ? 'Génération...' : 'Générer le code cadeau'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// Share Code Modal
const ShareCodeModal = ({
  visible,
  onClose,
  giftCode
}: {
  visible: boolean;
  onClose: () => void;
  giftCode: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(giftCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `J'ai un cadeau pour toi ! Utilise ce code dans l'app Les Chanvriers Unis pour recevoir un lot gratuit : ${giftCode}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#1A1F1D', borderRadius: 24, padding: 24 }}>
          <View className="items-center mb-4">
            <View className="w-16 h-16 rounded-full bg-green-600/20 items-center justify-center mb-3">
              <Check size={32} color="#22C55E" />
            </View>
            <Text className="text-white text-xl font-bold">Code généré !</Text>
          </View>

          <View className="bg-amber-600/20 rounded-xl p-4 mb-4 border border-amber-600/30">
            <Text className="text-amber-400 text-center text-2xl font-bold tracking-widest">
              {giftCode}
            </Text>
          </View>

          <Text className="text-gray-400 text-sm text-center mb-4">
            Partagez ce code avec un ami. Il pourra le rentrer dans son app pour recevoir le lot.
          </Text>

          <View className="flex-row space-x-3">
            <Pressable
              onPress={handleCopy}
              className="flex-1 bg-white/10 py-3 rounded-xl flex-row items-center justify-center"
            >
              {copied ? <Check size={18} color="#22C55E" /> : <Copy size={18} color="#fff" />}
              <Text className="text-white font-semibold ml-2">{copied ? 'Copié !' : 'Copier'}</Text>
            </Pressable>
            <Pressable
              onPress={handleShare}
              className="flex-1 bg-amber-600 py-3 rounded-xl flex-row items-center justify-center"
            >
              <Share2 size={18} color="#fff" />
              <Text className="text-white font-semibold ml-2">Partager</Text>
            </Pressable>
          </View>

          <Pressable onPress={onClose} className="mt-4 py-3">
            <Text className="text-gray-400 text-center">Fermer</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// Claim Gift Modal
const ClaimGiftModal = ({
  visible,
  onClose,
  onClaim
}: {
  visible: boolean;
  onClose: () => void;
  onClaim: (code: string) => void;
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleClaim = () => {
    console.log('[ClaimGiftModal] handleClaim called with code:', code);
    if (code.length < 5) {
      setError('Code invalide');
      return;
    }
    console.log('[ClaimGiftModal] Calling onClaim with:', code.toUpperCase());
    onClaim(code.toUpperCase());
    setCode('');
    setError('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#1A1F1D', borderRadius: 24, padding: 24 }}>
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center">
              <Sparkles size={24} color="#D4AF37" />
              <Text className="text-white text-xl font-bold ml-2">Recevoir un cadeau</Text>
            </View>
            <Pressable onPress={onClose} className="w-8 h-8 rounded-full bg-white/10 items-center justify-center">
              <X size={18} color="#fff" />
            </Pressable>
          </View>

          <Text className="text-gray-400 text-sm mb-4">
            Entrez le code cadeau que vous avez reçu d'un ami pour récupérer votre lot.
          </Text>

          <TextInput
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase());
              setError('');
            }}
            placeholder="GIFT-XXXXXXXX"
            placeholderTextColor="#6B7280"
            className="bg-white/10 rounded-xl px-4 py-4 text-white text-lg text-center font-bold tracking-widest mb-2"
            autoCapitalize="characters"
          />

          {error ? <Text className="text-red-400 text-sm text-center mb-2">{error}</Text> : null}

          <Pressable
            onPress={handleClaim}
            className="bg-amber-600 py-4 rounded-xl flex-row items-center justify-center mt-2"
          >
            <Sparkles size={20} color="#fff" />
            <Text className="text-white font-bold text-lg ml-2">Récupérer mon cadeau</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const collection = useCollectionStore((s) => s.collection);
  const removeFromCollection = useCollectionStore((s) => s.useCollectionItem);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Referral states
  const points = useReferralStore((s) => s.points);
  const giftsSent = useReferralStore((s) => s.giftsSent);
  const sendLotAsGift = useReferralStore((s) => s.sendLotAsGift);
  const claimGift = useReferralStore((s) => s.claimGift);
  const addToCollection = useCollectionStore((s) => s.addToCollection);
  const myCode = useReferralStore((s) => s.myCode);
  const generateMyCode = useReferralStore((s) => s.generateMyCode);
  const addPoints = useReferralStore((s) => s.addPoints);

  const [giftModalVisible, setGiftModalVisible] = useState(false);
  const [shareCodeModalVisible, setShareCodeModalVisible] = useState(false);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [itemToGift, setItemToGift] = useState<CollectionItem | null>(null);
  const [generatedGiftCode, setGeneratedGiftCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCardPress = (item: CollectionItem) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedItem(null);
  };

  const handleGiftPress = (item: CollectionItem) => {
    setItemToGift(item);
    setGiftModalVisible(true);
  };

  const handleSendGift = async (item: CollectionItem) => {
    setIsLoading(true);

    // Try to get gift code from Supabase first
    if (isSupabaseSyncConfigured() && item.lotId) {
      const userCode = myCode || generateMyCode();
      console.log('[handleSendGift] Getting gift code from Supabase for lot:', item.lotId);
      const supabaseGiftCode = await getGiftCodeForCollectionItem(userCode, item.lotId);

      if (supabaseGiftCode) {
        console.log('[handleSendGift] Found Supabase gift code:', supabaseGiftCode);
        // Remove item from collection
        removeFromCollection(item.id);
        setGeneratedGiftCode(supabaseGiftCode);
        setGiftModalVisible(false);
        setShareCodeModalVisible(true);
        setIsLoading(false);
        return;
      }
      console.log('[handleSendGift] No Supabase gift code found, falling back to local');
    }

    // Fallback to local gift system
    const code = sendLotAsGift(item.id, item.product);
    // Remove item from collection
    removeFromCollection(item.id);
    setGeneratedGiftCode(code);
    setGiftModalVisible(false);
    setShareCodeModalVisible(true);
    setIsLoading(false);
  };

  const handleClaimGift = async (code: string) => {
    setIsLoading(true);
    console.log('[handleClaimGift] Starting claim process for code:', code);
    console.log('[handleClaimGift] Supabase configured:', isSupabaseSyncConfigured());

    // Try Supabase first
    if (isSupabaseSyncConfigured()) {
      const userCode = myCode || generateMyCode();
      console.log('[handleClaimGift] User code:', userCode);
      console.log('[handleClaimGift] Trying to claim from Supabase:', code);
      const result = await claimGiftedLotWithDetails(code, userCode);

      console.log('[handleClaimGift] Claim result:', JSON.stringify(result, null, 2));

      if (result.success && result.lot) {
        console.log('[handleClaimGift] Gift claimed from Supabase:', result.lot);
        console.log('[handleClaimGift] Lot details - id:', result.lot.lotId, 'type:', result.lot.lotType, 'name:', result.lot.lotName, 'rarity:', result.lot.lotRarity);

        // Create the product object
        const product = {
          id: result.lot.lotId,
          name: result.lot.lotName,
          description: result.lot.lotDescription || 'Lot gagné',
          producer: 'Cadeau',
          region: 'France',
          rarity: result.lot.lotRarity || 'common' as const,
          thcPercent: 0.2,
          cbdPercent: 10,
          image: result.lot.lotImage || 'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400',
          value: result.lot.lotValue ?? 0,
        };

        console.log('[handleClaimGift] Product object created:', JSON.stringify(product, null, 2));

        // Create lotInfo with all necessary metadata
        const lotInfo = {
          lotId: result.lot.lotId,
          lotType: (result.lot.lotType || 'product') as 'product' | 'discount',
          discountPercent: result.lot.discountPercent ?? undefined,
          discountAmount: result.lot.discountAmount ?? undefined,
          minOrderAmount: result.lot.minOrderAmount ?? undefined,
        };

        console.log('[handleClaimGift] LotInfo object created:', JSON.stringify(lotInfo, null, 2));
        console.log('[handleClaimGift] Current collection size before add:', collection.length);
        console.log('[handleClaimGift] Calling addToCollection...');

        // Add to collection with the lot info so it appears in inventory
        addToCollection(product, lotInfo);

        console.log('[handleClaimGift] addToCollection called, waiting for state update...');

        // Force a small delay and check collection
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('[handleClaimGift] Collection size after delay:', collection.length);

        addPoints(5); // Points for claiming
        setClaimModalVisible(false);
        setIsLoading(false);
        Alert.alert('Cadeau reçu !', `Vous avez reçu "${result.lot.lotName}" dans votre collection ! Rafraîchissez l'écran si le lot n'apparaît pas.`);
        return;
      } else if (result.error) {
        // Show specific error message
        console.log('[handleClaimGift] Claim failed with error:', result.error, result.errorMessage);
        setIsLoading(false);
        Alert.alert('Erreur', result.errorMessage || 'Code invalide');
        return;
      }
    }

    // Fallback to local gift system
    console.log('[handleClaimGift] Falling back to local gift system');
    const gift = claimGift(code);
    if (gift) {
      // Add to collection
      addToCollection(gift.product);
      setClaimModalVisible(false);
      setIsLoading(false);
      Alert.alert('Cadeau reçu !', `Vous avez reçu "${gift.product.name}" dans votre collection !`);
    } else {
      setIsLoading(false);
      Alert.alert('Code invalide', 'Ce code n\'existe pas ou a déjà été utilisé.');
    }
  };

  // Calculate rarity counts
  const rarityCounts = collection.reduce(
    (acc, item) => {
      acc[item.product.rarity] = (acc[item.product.rarity] || 0) + 1;
      return acc;
    },
    {} as Record<Rarity, number>
  );

  // Calculate total value
  const totalValue = collection.reduce(
    (sum, item) => sum + item.product.value,
    0
  );

  return (
    <View className="flex-1 bg-dark">
      <LinearGradient
        colors={['#0A0F0D', '#0F1A12', '#0A0F0D']}
        style={{ flex: 1, paddingTop: insets.top }}
      >
        {/* Header */}
        <View className="px-6 pt-4 pb-4">
          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.replace('/(tabs)/profile')}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mr-3"
            >
              <ChevronLeft size={24} color="#fff" />
            </Pressable>
            <Grid3X3 size={28} color="#D4AF37" />
            <Text className="text-white text-2xl font-bold ml-2">Ma Collection</Text>
          </View>

          {/* Stats */}
          <View className="flex-row mt-4 space-x-3">
            <View className="flex-1 bg-darkCard rounded-xl p-3 border border-secondary/20">
              <Text className="text-gray-400 text-xs">Total</Text>
              <Text className="text-white text-xl font-bold">{collection.length}</Text>
              <Text className="text-gray-500 text-xs">produits</Text>
            </View>
            <View className="flex-1 bg-darkCard rounded-xl p-3 border border-accent/30">
              <Text className="text-gray-400 text-xs">Valeur</Text>
              <Text className="text-accent text-xl font-bold">{totalValue}€</Text>
              <Text className="text-gray-500 text-xs">estimée</Text>
            </View>
          </View>

          {/* Rarity breakdown */}
          <View className="flex-row mt-3 space-x-2">
            {(Object.keys(RARITY_CONFIG) as Rarity[]).map((rarity) => (
              <View
                key={rarity}
                style={{
                  backgroundColor: RARITY_CONFIG[rarity].bgColor,
                  borderWidth: 1,
                  borderColor: RARITY_CONFIG[rarity].borderColor,
                }}
                className="flex-1 rounded-lg py-2 items-center"
              >
                <Text
                  style={{ color: RARITY_CONFIG[rarity].color }}
                  className="text-lg font-bold"
                >
                  {rarityCounts[rarity] || 0}
                </Text>
                <Text className="text-gray-500 text-xs">
                  {RARITY_CONFIG[rarity].label}
                </Text>
              </View>
            ))}
          </View>

          {/* Referral section */}
          <View className="mt-4 bg-amber-600/10 rounded-xl p-3 border border-amber-600/30">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Gift size={18} color="#D4AF37" />
                <Text className="text-amber-400 font-semibold ml-2">Parrainage</Text>
              </View>
              <View className="bg-amber-600/20 px-3 py-1 rounded-full">
                <Text className="text-amber-400 font-bold">{points} pts</Text>
              </View>
            </View>
            <View className="flex-row space-x-2">
              <Pressable
                onPress={() => setClaimModalVisible(true)}
                className="flex-1 bg-amber-600 py-2.5 rounded-lg flex-row items-center justify-center"
              >
                <Sparkles size={16} color="#fff" />
                <Text className="text-white font-semibold text-sm ml-1">Recevoir un cadeau</Text>
              </Pressable>
            </View>
            <Text className="text-gray-500 text-xs mt-2 text-center">
              Appuyez sur un lot pour l'envoyer en cadeau
            </Text>
          </View>
        </View>

        {/* Collection grid */}
        {collection.length > 0 ? (
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {collection.map((item) => (
                <View key={item.id} style={{ width: CARD_WIDTH, position: 'relative' }}>
                  <CollectionCard
                    item={item}
                    onPress={() => handleCardPress(item)}
                  />
                  {/* Gift button */}
                  <Pressable
                    onPress={() => handleGiftPress(item)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-amber-600/80 items-center justify-center"
                    style={{ zIndex: 10 }}
                  >
                    <Gift size={14} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1 items-center justify-center px-6">
            <View className="bg-darkCard rounded-3xl p-8 items-center border border-secondary/20">
              <Package size={64} color="#6B7280" />
              <Text className="text-white text-lg font-semibold mt-4">
                Collection vide
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                Ouvrez des Mystery Box pour{'\n'}découvrir des produits CBD exclusifs
              </Text>
            </View>
          </View>
        )}

        {/* Product Detail Modal */}
        <ProductDetailModal
          item={selectedItem}
          visible={modalVisible}
          onClose={handleCloseModal}
        />

        {/* Gift Modals */}
        <GiftModal
          visible={giftModalVisible}
          onClose={() => {
            setGiftModalVisible(false);
            setItemToGift(null);
          }}
          item={itemToGift}
          onSend={handleSendGift}
          isLoading={isLoading}
        />

        <ShareCodeModal
          visible={shareCodeModalVisible}
          onClose={() => setShareCodeModalVisible(false)}
          giftCode={generatedGiftCode}
        />

        <ClaimGiftModal
          visible={claimModalVisible}
          onClose={() => setClaimModalVisible(false)}
          onClaim={handleClaimGift}
        />
      </LinearGradient>
    </View>
  );
}
