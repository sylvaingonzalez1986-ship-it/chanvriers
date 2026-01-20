/**
 * Modal de commande directe Marché Local
 * Permet de commander directement un produit auprès d'un producteur local
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Modal,
  Pressable,
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Minus, Plus, ShoppingBag, MapPin, Clock, Check, AlertCircle, Phone, Mail, User, MessageSquare } from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { useLocalMarketOrders, CreateLocalOrderParams } from '@/lib/local-market-orders';
import { useAuth } from '@/lib/useAuth';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase-auth';
import * as Haptics from 'expo-haptics';

interface ProductInfo {
  id: string;
  name: string;
  price_public: number;
  description?: string;
  image?: string;
  stock?: number;
}

interface ProducerInfo {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  region?: string;
  adresse_retrait?: string;
  horaires_retrait?: string;
  instructions_retrait?: string;
}

interface LocalMarketOrderModalProps {
  visible: boolean;
  onClose: () => void;
  product: ProductInfo;
  producer: ProducerInfo;
  onOrderSuccess?: (pickupCode: string) => void;
}

export default function LocalMarketOrderModal({
  visible,
  onClose,
  product,
  producer,
  onOrderSuccess,
}: LocalMarketOrderModalProps) {
  const { session, profile } = useAuth();
  const { createOrder } = useLocalMarketOrders();

  // État du formulaire
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // État de l'UI
  const [step, setStep] = useState<'details' | 'confirm' | 'success'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickupCode, setPickupCode] = useState<string | null>(null);

  // Email du producteur (à récupérer si pas fourni)
  const [producerEmail, setProducerEmail] = useState(producer.email || '');

  // Charger l'email du producteur si nécessaire
  useEffect(() => {
    if (!producer.email && producer.id) {
      fetchProducerEmail();
    }
  }, [producer.id]);

  // Pré-remplir avec les infos du profil
  useEffect(() => {
    if (profile) {
      const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      if (fullName) setCustomerName(fullName);
      if (profile.email) setCustomerEmail(profile.email);
      if (profile.phone) setCustomerPhone(profile.phone);
    }
  }, [profile]);

  // Reset au changement de visibilité
  useEffect(() => {
    if (visible) {
      setStep('details');
      setQuantity(1);
      setError(null);
      setPickupCode(null);
    }
  }, [visible]);

  const fetchProducerEmail = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/producers?id=eq.${producer.id}&select=email`,
        {
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        if (data[0]?.email) {
          setProducerEmail(data[0].email);
        }
      }
    } catch (e) {
      console.log('[LocalMarketOrderModal] Error fetching producer email:', e);
    }
  };

  const totalPrice = quantity * product.price_public;
  const maxStock = typeof product.stock === 'number' ? product.stock : 99;

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (newQty >= 1 && newQty <= maxStock) {
      setQuantity(newQty);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleContinue = () => {
    // Validation
    if (!customerName.trim()) {
      setError('Veuillez entrer votre nom');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }

    setError(null);
    setStep('confirm');
  };

  const handleConfirmOrder = async () => {
    if (!session?.user?.id || !session?.access_token) {
      setError('Veuillez vous connecter pour commander');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const orderParams: CreateLocalOrderParams = {
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_phone: customerPhone.trim() || undefined,
        producer_id: producer.id,
        producer_name: producer.name,
        producer_email: producerEmail,
        producer_phone: producer.phone,
        producer_location: producer.city && producer.region
          ? `${producer.city}, ${producer.region}`
          : producer.city || producer.region,
        product_id: product.id,
        product_name: product.name,
        product_description: product.description,
        quantity,
        unit_price: product.price_public,
        pickup_location: producer.adresse_retrait,
        pickup_instructions: producer.instructions_retrait,
        customer_notes: customerNotes.trim() || undefined,
      };

      const result = await createOrder(session.user.id, session.access_token, orderParams);

      if (result.success && result.pickupCode) {
        setPickupCode(result.pickupCode);
        setStep('success');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onOrderSuccess?.(result.pickupCode);
      } else {
        setError(result.error || 'Erreur lors de la commande');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (e) {
      console.log('[LocalMarketOrderModal] Error:', e);
      setError('Une erreur est survenue');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (step === 'success') {
      // Reset complet après succès
      setStep('details');
      setQuantity(1);
      setCustomerNotes('');
      setError(null);
      setPickupCode(null);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <View
            className="rounded-t-3xl overflow-hidden"
            style={{ backgroundColor: COLORS.background.charcoal, minHeight: '70%', maxHeight: '92%' }}
          >
            {/* Header */}
            <LinearGradient
              colors={[COLORS.accent.hemp, COLORS.accent.forest]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ paddingVertical: 16, paddingHorizontal: 20 }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xl font-bold" style={{ color: COLORS.text.white }}>
                    {step === 'success' ? 'Commande confirmée !' : 'Commander directement'}
                  </Text>
                  <Text className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {step === 'success' ? 'Votre code de retrait' : `Chez ${producer.name}`}
                  </Text>
                </View>
                <Pressable
                  onPress={handleClose}
                  className="p-2 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <X size={20} color={COLORS.text.white} />
                </Pressable>
              </View>
            </LinearGradient>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* ÉTAPE SUCCÈS */}
              {step === 'success' && pickupCode && (
                <View className="items-center py-8">
                  {/* Icône de succès */}
                  <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-6"
                    style={{ backgroundColor: `${COLORS.accent.hemp}30` }}
                  >
                    <Check size={40} color={COLORS.accent.hemp} />
                  </View>

                  {/* Code de retrait */}
                  <Text className="text-sm mb-2" style={{ color: COLORS.text.muted }}>
                    Votre code de retrait
                  </Text>
                  <View
                    className="px-8 py-4 rounded-2xl mb-6"
                    style={{ backgroundColor: `${COLORS.primary.gold}20`, borderWidth: 2, borderColor: COLORS.primary.gold }}
                  >
                    <Text className="text-4xl font-bold tracking-widest" style={{ color: COLORS.primary.gold }}>
                      {pickupCode}
                    </Text>
                  </View>

                  <Text className="text-center text-sm mb-6" style={{ color: COLORS.text.lightGray }}>
                    Présentez ce code au producteur lors du retrait.{'\n'}
                    Le paiement se fait sur place.
                  </Text>

                  {/* Résumé */}
                  <View
                    className="w-full p-4 rounded-xl mb-4"
                    style={{ backgroundColor: `${COLORS.text.white}05` }}
                  >
                    <Text className="font-bold mb-2" style={{ color: COLORS.text.cream }}>
                      {product.name}
                    </Text>
                    <View className="flex-row justify-between">
                      <Text style={{ color: COLORS.text.muted }}>Quantité: {quantity}</Text>
                      <Text className="font-bold" style={{ color: COLORS.primary.gold }}>
                        {totalPrice.toFixed(2)}€
                      </Text>
                    </View>
                  </View>

                  {/* Infos retrait */}
                  {producer.adresse_retrait && (
                    <View
                      className="w-full p-4 rounded-xl"
                      style={{ backgroundColor: `${COLORS.accent.hemp}10` }}
                    >
                      <View className="flex-row items-center mb-2">
                        <MapPin size={16} color={COLORS.accent.hemp} />
                        <Text className="ml-2 font-semibold" style={{ color: COLORS.text.cream }}>
                          Lieu de retrait
                        </Text>
                      </View>
                      <Text className="text-sm" style={{ color: COLORS.text.lightGray }}>
                        {producer.adresse_retrait}
                      </Text>
                      {producer.horaires_retrait && (
                        <View className="flex-row items-center mt-2">
                          <Clock size={14} color={COLORS.text.muted} />
                          <Text className="ml-2 text-xs" style={{ color: COLORS.text.muted }}>
                            {producer.horaires_retrait}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Bouton fermer */}
                  <Pressable
                    onPress={handleClose}
                    className="w-full mt-6 py-4 rounded-xl items-center"
                    style={{ backgroundColor: COLORS.accent.hemp }}
                  >
                    <Text className="font-bold" style={{ color: COLORS.text.white }}>
                      Fermer
                    </Text>
                  </Pressable>
                </View>
              )}

              {/* ÉTAPE DÉTAILS */}
              {step === 'details' && (
                <>
                  {/* Produit */}
                  <View
                    className="flex-row rounded-xl p-3 mb-6"
                    style={{ backgroundColor: `${COLORS.text.white}05` }}
                  >
                    {product.image ? (
                      <Image
                        source={{ uri: product.image }}
                        className="w-20 h-20 rounded-lg"
                      />
                    ) : (
                      <View
                        className="w-20 h-20 rounded-lg items-center justify-center"
                        style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
                      >
                        <ShoppingBag size={28} color={COLORS.accent.hemp} />
                      </View>
                    )}
                    <View className="flex-1 ml-3 justify-center">
                      <Text className="font-bold" style={{ color: COLORS.text.cream }}>
                        {product.name}
                      </Text>
                      {product.description && (
                        <Text className="text-xs mt-1" style={{ color: COLORS.text.muted }} numberOfLines={2}>
                          {product.description}
                        </Text>
                      )}
                      <Text className="text-lg font-bold mt-1" style={{ color: COLORS.primary.gold }}>
                        {product.price_public.toFixed(2)}€
                      </Text>
                    </View>
                  </View>

                  {/* Sélecteur de quantité */}
                  <View className="mb-6">
                    <Text className="text-sm font-semibold mb-3" style={{ color: COLORS.text.lightGray }}>
                      Quantité
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Pressable
                          onPress={() => handleQuantityChange(-1)}
                          disabled={quantity <= 1}
                          className="w-12 h-12 rounded-xl items-center justify-center"
                          style={{
                            backgroundColor: quantity <= 1 ? `${COLORS.text.muted}30` : COLORS.accent.hemp,
                          }}
                        >
                          <Minus size={20} color={quantity <= 1 ? COLORS.text.muted : COLORS.text.white} />
                        </Pressable>

                        <View className="w-20 items-center">
                          <Text className="text-2xl font-bold" style={{ color: COLORS.text.cream }}>
                            {quantity}
                          </Text>
                        </View>

                        <Pressable
                          onPress={() => handleQuantityChange(1)}
                          disabled={quantity >= maxStock}
                          className="w-12 h-12 rounded-xl items-center justify-center"
                          style={{
                            backgroundColor: quantity >= maxStock ? `${COLORS.text.muted}30` : COLORS.accent.hemp,
                          }}
                        >
                          <Plus size={20} color={quantity >= maxStock ? COLORS.text.muted : COLORS.text.white} />
                        </Pressable>
                      </View>

                      <View className="items-end">
                        <Text className="text-sm" style={{ color: COLORS.text.muted }}>Total</Text>
                        <Text className="text-2xl font-bold" style={{ color: COLORS.primary.gold }}>
                          {totalPrice.toFixed(2)}€
                        </Text>
                      </View>
                    </View>
                    {typeof product.stock === 'number' && (
                      <Text className="text-xs mt-2" style={{ color: COLORS.text.muted }}>
                        {product.stock} disponible(s)
                      </Text>
                    )}
                  </View>

                  {/* Formulaire client */}
                  <View className="mb-6">
                    <Text className="text-sm font-semibold mb-3" style={{ color: COLORS.text.lightGray }}>
                      Vos coordonnées
                    </Text>

                    {/* Nom */}
                    <View className="mb-3">
                      <View className="flex-row items-center mb-1">
                        <User size={14} color={COLORS.text.muted} />
                        <Text className="ml-2 text-xs" style={{ color: COLORS.text.muted }}>
                          Nom complet *
                        </Text>
                      </View>
                      <TextInput
                        value={customerName}
                        onChangeText={setCustomerName}
                        placeholder="Votre nom"
                        placeholderTextColor={COLORS.text.muted}
                        className="px-4 py-3 rounded-xl"
                        style={{
                          backgroundColor: `${COLORS.text.white}08`,
                          color: COLORS.text.cream,
                          borderWidth: 1,
                          borderColor: `${COLORS.accent.hemp}30`,
                        }}
                      />
                    </View>

                    {/* Email */}
                    <View className="mb-3">
                      <View className="flex-row items-center mb-1">
                        <Mail size={14} color={COLORS.text.muted} />
                        <Text className="ml-2 text-xs" style={{ color: COLORS.text.muted }}>
                          Email *
                        </Text>
                      </View>
                      <TextInput
                        value={customerEmail}
                        onChangeText={setCustomerEmail}
                        placeholder="votre@email.com"
                        placeholderTextColor={COLORS.text.muted}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        className="px-4 py-3 rounded-xl"
                        style={{
                          backgroundColor: `${COLORS.text.white}08`,
                          color: COLORS.text.cream,
                          borderWidth: 1,
                          borderColor: `${COLORS.accent.hemp}30`,
                        }}
                      />
                    </View>

                    {/* Téléphone */}
                    <View className="mb-3">
                      <View className="flex-row items-center mb-1">
                        <Phone size={14} color={COLORS.text.muted} />
                        <Text className="ml-2 text-xs" style={{ color: COLORS.text.muted }}>
                          Téléphone (optionnel)
                        </Text>
                      </View>
                      <TextInput
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                        placeholder="06 12 34 56 78"
                        placeholderTextColor={COLORS.text.muted}
                        keyboardType="phone-pad"
                        className="px-4 py-3 rounded-xl"
                        style={{
                          backgroundColor: `${COLORS.text.white}08`,
                          color: COLORS.text.cream,
                          borderWidth: 1,
                          borderColor: `${COLORS.accent.hemp}30`,
                        }}
                      />
                    </View>

                    {/* Notes */}
                    <View>
                      <View className="flex-row items-center mb-1">
                        <MessageSquare size={14} color={COLORS.text.muted} />
                        <Text className="ml-2 text-xs" style={{ color: COLORS.text.muted }}>
                          Message pour le producteur (optionnel)
                        </Text>
                      </View>
                      <TextInput
                        value={customerNotes}
                        onChangeText={setCustomerNotes}
                        placeholder="Instructions spéciales, questions..."
                        placeholderTextColor={COLORS.text.muted}
                        multiline
                        numberOfLines={3}
                        className="px-4 py-3 rounded-xl"
                        style={{
                          backgroundColor: `${COLORS.text.white}08`,
                          color: COLORS.text.cream,
                          borderWidth: 1,
                          borderColor: `${COLORS.accent.hemp}30`,
                          minHeight: 80,
                          textAlignVertical: 'top',
                        }}
                      />
                    </View>
                  </View>

                  {/* Erreur */}
                  {error && (
                    <View
                      className="flex-row items-center p-3 rounded-xl mb-4"
                      style={{ backgroundColor: `${COLORS.accent.red}20` }}
                    >
                      <AlertCircle size={18} color={COLORS.accent.red} />
                      <Text className="ml-2 flex-1" style={{ color: COLORS.accent.red }}>
                        {error}
                      </Text>
                    </View>
                  )}

                  {/* Bouton continuer */}
                  <Pressable
                    onPress={handleContinue}
                    className="py-4 rounded-xl items-center"
                    style={{ backgroundColor: COLORS.accent.hemp }}
                  >
                    <Text className="font-bold" style={{ color: COLORS.text.white }}>
                      Continuer
                    </Text>
                  </Pressable>
                </>
              )}

              {/* ÉTAPE CONFIRMATION */}
              {step === 'confirm' && (
                <>
                  {/* Résumé de la commande */}
                  <View
                    className="rounded-xl p-4 mb-6"
                    style={{ backgroundColor: `${COLORS.text.white}05`, borderWidth: 1, borderColor: `${COLORS.primary.gold}30` }}
                  >
                    <Text className="font-bold mb-3" style={{ color: COLORS.primary.gold }}>
                      Récapitulatif de votre commande
                    </Text>

                    <View className="flex-row justify-between mb-2">
                      <Text style={{ color: COLORS.text.lightGray }}>Produit</Text>
                      <Text className="font-semibold" style={{ color: COLORS.text.cream }}>
                        {product.name}
                      </Text>
                    </View>

                    <View className="flex-row justify-between mb-2">
                      <Text style={{ color: COLORS.text.lightGray }}>Quantité</Text>
                      <Text className="font-semibold" style={{ color: COLORS.text.cream }}>
                        {quantity}
                      </Text>
                    </View>

                    <View className="flex-row justify-between mb-2">
                      <Text style={{ color: COLORS.text.lightGray }}>Prix unitaire</Text>
                      <Text style={{ color: COLORS.text.cream }}>
                        {product.price_public.toFixed(2)}€
                      </Text>
                    </View>

                    <View
                      className="flex-row justify-between pt-3 mt-2"
                      style={{ borderTopWidth: 1, borderTopColor: `${COLORS.text.white}10` }}
                    >
                      <Text className="font-bold" style={{ color: COLORS.text.lightGray }}>
                        Total à payer sur place
                      </Text>
                      <Text className="text-xl font-bold" style={{ color: COLORS.primary.gold }}>
                        {totalPrice.toFixed(2)}€
                      </Text>
                    </View>
                  </View>

                  {/* Infos client */}
                  <View
                    className="rounded-xl p-4 mb-6"
                    style={{ backgroundColor: `${COLORS.text.white}05` }}
                  >
                    <Text className="font-bold mb-3" style={{ color: COLORS.text.cream }}>
                      Vos coordonnées
                    </Text>
                    <Text className="mb-1" style={{ color: COLORS.text.lightGray }}>
                      {customerName}
                    </Text>
                    <Text className="mb-1" style={{ color: COLORS.text.lightGray }}>
                      {customerEmail}
                    </Text>
                    {customerPhone && (
                      <Text style={{ color: COLORS.text.lightGray }}>
                        {customerPhone}
                      </Text>
                    )}
                  </View>

                  {/* Infos retrait */}
                  <View
                    className="rounded-xl p-4 mb-6"
                    style={{ backgroundColor: `${COLORS.accent.hemp}10` }}
                  >
                    <View className="flex-row items-center mb-3">
                      <MapPin size={18} color={COLORS.accent.hemp} />
                      <Text className="ml-2 font-bold" style={{ color: COLORS.text.cream }}>
                        Retrait chez {producer.name}
                      </Text>
                    </View>

                    {producer.adresse_retrait && (
                      <Text className="text-sm mb-2" style={{ color: COLORS.text.lightGray }}>
                        {producer.adresse_retrait}
                      </Text>
                    )}

                    {producer.horaires_retrait && (
                      <View className="flex-row items-center">
                        <Clock size={14} color={COLORS.text.muted} />
                        <Text className="ml-2 text-xs" style={{ color: COLORS.text.muted }}>
                          {producer.horaires_retrait}
                        </Text>
                      </View>
                    )}

                    {producer.instructions_retrait && (
                      <Text className="text-xs mt-2 italic" style={{ color: COLORS.text.muted }}>
                        {producer.instructions_retrait}
                      </Text>
                    )}
                  </View>

                  {/* Note paiement */}
                  <View
                    className="flex-row items-start p-3 rounded-xl mb-6"
                    style={{ backgroundColor: `${COLORS.primary.gold}15` }}
                  >
                    <AlertCircle size={18} color={COLORS.primary.gold} />
                    <Text className="ml-2 flex-1 text-sm" style={{ color: COLORS.primary.gold }}>
                      Le paiement s'effectue en personne lors du retrait de votre commande.
                    </Text>
                  </View>

                  {/* Erreur */}
                  {error && (
                    <View
                      className="flex-row items-center p-3 rounded-xl mb-4"
                      style={{ backgroundColor: `${COLORS.accent.red}20` }}
                    >
                      <AlertCircle size={18} color={COLORS.accent.red} />
                      <Text className="ml-2 flex-1" style={{ color: COLORS.accent.red }}>
                        {error}
                      </Text>
                    </View>
                  )}

                  {/* Boutons */}
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => setStep('details')}
                      className="flex-1 py-4 rounded-xl items-center"
                      style={{ backgroundColor: `${COLORS.text.white}10` }}
                    >
                      <Text className="font-semibold" style={{ color: COLORS.text.lightGray }}>
                        Modifier
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleConfirmOrder}
                      disabled={loading}
                      className="flex-1 py-4 rounded-xl items-center flex-row justify-center"
                      style={{
                        backgroundColor: loading ? `${COLORS.accent.hemp}80` : COLORS.accent.hemp,
                      }}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color={COLORS.text.white} />
                      ) : (
                        <>
                          <Check size={18} color={COLORS.text.white} />
                          <Text className="ml-2 font-bold" style={{ color: COLORS.text.white }}>
                            Confirmer
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
