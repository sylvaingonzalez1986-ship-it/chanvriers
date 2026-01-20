import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ShoppingCart, Star, AlertCircle } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/lib/colors';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase-auth';
import { useDirectSalesCart } from '@/lib/direct-sales-cart';
import { useAuth } from '@/lib/useAuth';

interface DirectSalesProduct {
  id: string;
  name: string;
  price_public: number;
  price_pro?: number;
  description: string;
  image: string;
  stock?: number;
  cbd_percent?: number;
  thc_percent?: number;
  disponible_vente_directe: boolean;
}

export default function MarcheCatalogue() {
  const insets = useSafeAreaInsets();
  const { producerId } = useLocalSearchParams<{ producerId: string }>();
  const [products, setProducts] = useState<DirectSalesProduct[]>([]);
  const [producerName, setProducerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = async () => {
    if (!producerId) return;

    try {
      // Récupérer les produits du producteur avec disponible_vente_directe = true
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/products?select=*&producer_id=eq.${producerId}&disponible_vente_directe=eq.true&order=name.asc`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProducts(data || []);
      } else {
        console.log('[MarcheCatalogue] Error loading products:', response.status);
        setProducts([]);
      }
    } catch (error) {
      console.log('[MarcheCatalogue] Error:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [producerId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

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
          Chargement des produits...
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
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary.gold} />}
      >
        {/* Header avec bouton retour */}
        <View style={{ paddingTop: insets.top + 16 }} className="px-4 mb-6 flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="p-2 rounded-lg mr-3"
            style={{ backgroundColor: `${COLORS.text.white}10` }}
          >
            <ArrowLeft size={24} color={COLORS.text.cream} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-3xl font-bold" style={{ color: COLORS.text.cream }}>
              Marché local
            </Text>
            <Text className="text-sm" style={{ color: COLORS.text.lightGray }}>
              Vente directe
            </Text>
          </View>
        </View>

        {/* Liste des produits */}
        {products.length === 0 ? (
          <View className="flex-1 items-center justify-center px-4 py-12">
            <ShoppingCart size={48} color={COLORS.text.muted} strokeWidth={1.5} />
            <Text className="text-center mt-4" style={{ color: COLORS.text.lightGray }}>
              Aucun produit disponible en vente directe pour le moment.
            </Text>
          </View>
        ) : (
          <View className="px-4">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                producerId={producerId || ''}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

interface ProductCardProps {
  product: DirectSalesProduct;
  producerId: string;
}

function ProductCard({ product, producerId }: ProductCardProps) {
  const { session } = useAuth();
  const cart = useDirectSalesCart((s) => s);
  const [addedToCart, setAddedToCart] = useState(false);

  const handleAddToCart = async () => {
    if (!session?.user.id || !session?.access_token) {
      alert('Veuillez vous connecter pour ajouter au panier');
      return;
    }

    if (!product.stock || product.stock > 0) {
      await cart.addItem(session.user.id, session.access_token, {
        product_id: product.id,
        producer_id: producerId,
        producer_name: '', // Sera récupéré depuis Supabase
        product_name: product.name,
        price: product.price_public,
        quantity: 1,
        image: product.image,
      });

      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  // Vérifier si le produit est en rupture de stock
  // stock null ou undefined = stock illimité (pas en rupture)
  // stock = 0 ou négatif = rupture de stock
  const isOutOfStock = typeof product.stock === 'number' && product.stock <= 0;

  return (
    <View
      className="mb-4 rounded-2xl overflow-hidden"
      style={{ backgroundColor: `${COLORS.text.white}08` }}
    >
      {/* Image */}
      {product.image && (
        <Image
          source={{ uri: product.image }}
          className="w-full h-48 bg-gray-800"
        />
      )}

      {/* Contenu */}
      <View className="p-4">
        {/* Header - Nom et Prix */}
        <View className="flex-row items-start justify-between mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-lg font-bold" style={{ color: COLORS.text.cream }}>
              {product.name}
            </Text>
            {product.cbd_percent || product.thc_percent ? (
              <View className="flex-row items-center mt-1">
                {product.cbd_percent ? (
                  <Text className="text-xs" style={{ color: COLORS.accent.hemp }}>
                    CBD {product.cbd_percent}%
                  </Text>
                ) : null}
                {product.cbd_percent && product.thc_percent ? (
                  <Text className="text-xs mx-1" style={{ color: COLORS.text.muted }}>
                    •
                  </Text>
                ) : null}
                {product.thc_percent ? (
                  <Text className="text-xs" style={{ color: COLORS.accent.red }}>
                    THC {product.thc_percent}%
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
          <View className="items-end">
            <Text className="text-2xl font-bold" style={{ color: COLORS.primary.gold }}>
              {product.price_public.toFixed(2)}€
            </Text>
            {product.price_pro && (
              <Text className="text-xs" style={{ color: COLORS.text.muted }}>
                Pro: {product.price_pro.toFixed(2)}€
              </Text>
            )}
          </View>
        </View>

        {/* Description */}
        {product.description && (
          <Text
            className="text-sm mb-3 leading-5"
            style={{ color: COLORS.text.lightGray }}
            numberOfLines={2}
          >
            {product.description}
          </Text>
        )}

        {/* Stock */}
        {product.stock !== undefined && (
          <View className="mb-3">
            <Text className="text-xs" style={{ color: COLORS.text.muted }}>
              {isOutOfStock ? (
                <Text style={{ color: COLORS.accent.red }}>Rupture de stock</Text>
              ) : (
                <>Stock: {product.stock} disponible</>
              )}
            </Text>
          </View>
        )}

        {/* Bouton Ajouter au panier */}
        <Pressable
          onPress={handleAddToCart}
          disabled={isOutOfStock}
          className="flex-row items-center justify-center py-3 rounded-xl"
          style={{
            backgroundColor: addedToCart ? COLORS.accent.hemp : (isOutOfStock ? COLORS.text.muted : COLORS.accent.hemp),
            opacity: isOutOfStock ? 0.5 : 1,
          }}
        >
          <ShoppingCart size={18} color={COLORS.text.white} />
          <Text className="ml-2 font-bold" style={{ color: COLORS.text.white }}>
            {addedToCart ? '✓ Ajouté au panier' : (isOutOfStock ? 'Indisponible' : 'Ajouter au panier')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
