import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Package, Sparkles, MapPin, CheckCircle, AlertCircle, X, User, Ticket, Gift, Truck, Building2, Briefcase } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as MailComposer from 'expo-mail-composer';
import * as Linking from 'expo-linking';
import { COLORS } from '@/lib/colors';
import { useCartStore, useCustomerInfoStore, useOrdersStore, useSubscriptionStore, useCollectionStore, useStockInventoryStore, useProducerStore, Order, CustomerInfo } from '@/lib/store';
import { PRODUCT_TYPE_COLORS, PRODUCT_TYPE_LABELS } from '@/lib/producers';
import { InventoryModal } from '@/components/InventoryModal';
import { TicketRecapScreen } from '@/components/TicketRecapScreen';
import { CollectionItem } from '@/lib/types';
import { isSupabaseSyncConfigured, syncOrderToSupabase } from '@/lib/supabase-sync';
import { usePricingContext } from '@/lib/useProductPricing';
import { decrementProductStockInSupabase } from '@/lib/supabase-producer';
import { Toast, useToast } from '@/components/Toast';
import { OfflineDisabledButton } from '@/components/OfflineDisabledButton';
import { useOfflineStatus } from '@/lib/network-context';
import { useOrderQueueStore } from '@/lib/order-queue-store';
import { PendingOrdersBanner } from '@/components/PendingOrdersBanner';

const ORDER_EMAIL = 'leschanvriersbretons@gmail.com';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showOrderConfirmation, setShowOrderConfirmation] = useState(false);
  const [showProfileWarning, setShowProfileWarning] = useState(false);
  const [editingQuantity, setEditingQuantity] = useState<string | null>(null);
  const [tempQuantity, setTempQuantity] = useState('');
  const [earnedTicketsOnOrder, setEarnedTicketsOnOrder] = useState(0);
  const [showInventory, setShowInventory] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<CollectionItem | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<CollectionItem[]>([]);
  const [deliveryOption, setDeliveryOption] = useState<'locker' | 'domicile'>('locker');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  // États pour le récapitulatif de commande
  const [showRecapScreen, setShowRecapScreen] = useState(false);
  const [currentOrderData, setCurrentOrderData] = useState<{
    orderId: string;
    customerInfo: CustomerInfo;
    items: Array<{
      productId: string;
      productName: string;
      productType: string;
      producerId: string;
      producerName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    subtotal: number;
    shippingFee: number;
    total: number;
    ticketsEarned: number;
  } | null>(null);

  // Pricing context pour afficher le label approprié
  const { isPro, priceLabel } = usePricingContext();

  // Toast pour les feedbacks utilisateur
  const { toast, showToast, hideToast } = useToast();

  // État offline pour désactiver les actions d'écriture
  const { isOffline } = useOfflineStatus();

  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeFromCart = useCartStore((s) => s.removeFromCart);
  const clearCart = useCartStore((s) => s.clearCart);

  const customerInfo = useCustomerInfoStore((s) => s.customerInfo);
  const isProfileComplete = useCustomerInfoStore((s) => s.isProfileComplete);
  const getMissingFields = useCustomerInfoStore((s) => s.getMissingFields);

  const addOrder = useOrdersStore((s) => s.addOrder);
  const addTickets = useSubscriptionStore((s) => s.addTickets);

  // Stock inventory for updating quantities on order
  const stockInventory = useStockInventoryStore();
  const decrementProductStock = useProducerStore((s) => s.decrementProductStock);
  const producers = useProducerStore((s) => s.producers);

  const collection = useCollectionStore((s) => s.collection);
  const markItemAsUsed = useCollectionStore((s) => s.useCollectionItem);
  const availableLotsCount = collection.filter((item) => !item.used).length;

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  // Helper function to get base price (Pro or Public)
  const getBasePrice = (item: typeof items[0]) => {
    // Si l'utilisateur est Pro et que le produit a un prix Pro, utiliser le prix Pro
    if (isPro && item.product.pricePro !== undefined && item.product.pricePro !== null) {
      return item.product.pricePro;
    }
    return item.product.price ?? 0;
  };

  // Helper function to get item price (with promo discount if applicable)
  const getItemPrice = (item: typeof items[0]) => {
    const basePrice = getBasePrice(item);
    if (item.promoDiscount) {
      return basePrice * (1 - item.promoDiscount / 100);
    }
    return basePrice;
  };

  // Helper to check if item has Pro price
  const hasProPrice = (item: typeof items[0]) => {
    return isPro && item.product.pricePro !== undefined && item.product.pricePro !== null;
  };

  const subtotal = items.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);

  // Calcul de la TVA par produit (prix TTC - prix HT)
  // TVA = Prix TTC - (Prix TTC / (1 + taux TVA))
  const totalTva = items.reduce((sum, item) => {
    const tvaRate = item.product.tvaRate ?? 20; // Défaut 20%
    const itemTotal = getItemPrice(item) * item.quantity;
    const tvaAmount = itemTotal - (itemTotal / (1 + tvaRate / 100));
    return sum + tvaAmount;
  }, 0);

  // Frais de port selon l'option de livraison choisie
  const FREE_SHIPPING_THRESHOLD = 79;
  const SHIPPING_LOCKER = 4;
  const SHIPPING_DOMICILE = 7;
  const baseShippingCost = deliveryOption === 'locker' ? SHIPPING_LOCKER : SHIPPING_DOMICILE;
  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : baseShippingCost;

  // Calculate discount
  let discountAmount = 0;
  if (selectedDiscount) {
    if (selectedDiscount.discountPercent) {
      discountAmount = subtotal * (selectedDiscount.discountPercent / 100);
    } else if (selectedDiscount.discountAmount) {
      discountAmount = Math.min(selectedDiscount.discountAmount, subtotal);
    }
  }

  // Calculate product lots value
  const productLotsValue = selectedProducts.reduce((sum, item) => sum + (item.product.value ?? 0), 0);

  const totalPrice = subtotal + shippingFee - discountAmount;

  // Tickets gagnés: 1 ticket par tranche de 25€ (pas de tickets pour les pros)
  const ticketsEarned = isPro ? 0 : Math.floor(totalPrice / 25);

  const handleQuantityPress = (productId: string, currentQuantity: number) => {
    setEditingQuantity(productId);
    setTempQuantity(currentQuantity.toString());
  };

  const handleQuantitySubmit = (productId: string) => {
    const newQuantity = parseInt(tempQuantity, 10);
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      updateQuantity(productId, newQuantity);
    }
    setEditingQuantity(null);
    setTempQuantity('');
  };

  // Group items by producer
  const itemsByProducer = items.reduce((acc, item) => {
    if (!acc[item.producerId]) {
      acc[item.producerId] = {
        producerName: item.producerName,
        items: [],
      };
    }
    acc[item.producerId].items.push(item);
    return acc;
  }, {} as Record<string, { producerName: string; items: typeof items }>);

  const sendOrderEmail = async () => {
    // Build order details
    const orderDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    let orderDetails = '';
    Object.entries(itemsByProducer).forEach(([, { producerName, items: producerItems }]) => {
      orderDetails += `\n${producerName}\n`;
      orderDetails += '-------------------\n';
      producerItems.forEach((item) => {
        const itemPrice = getItemPrice(item);
        const basePrice = getBasePrice(item);
        orderDetails += `- ${item.product.name} (${PRODUCT_TYPE_LABELS[item.product.type]})\n`;
        if (item.promoDiscount) {
          orderDetails += `  Quantite: ${item.quantity} x ${itemPrice.toFixed(2)}EUR (PROMO -${item.promoDiscount}%) = ${(itemPrice * item.quantity).toFixed(2)}EUR\n`;
        } else {
          orderDetails += `  Quantite: ${item.quantity} x ${basePrice.toFixed(2)}EUR = ${(basePrice * item.quantity).toFixed(2)}EUR\n`;
        }
      });
    });

    // Add product lots from inventory
    let lotsDetails = '';
    if (selectedProducts.length > 0) {
      lotsDetails += '\nLOTS UTILISES (PRODUITS)\n';
      lotsDetails += '-------------------\n';
      selectedProducts.forEach((collectionItem) => {
        lotsDetails += `- ${collectionItem.product.name} (Valeur: ${collectionItem.product.value ?? 0}EUR)\n`;
      });
    }

    // Add discount info
    let discountDetails = '';
    if (selectedDiscount && discountAmount > 0) {
      discountDetails = `Reduction appliquee: ${selectedDiscount.product.name} (-${discountAmount.toFixed(2)}EUR)\n`;
    }

    // Déterminer si c'est une commande pro
    const isProOrder = isPro;
    const clientType = isProOrder ? 'PROFESSIONNEL' : 'CLIENT';

    const emailBody = `
NOUVELLE COMMANDE ${clientType}
===================

Date: ${orderDate}

INFORMATIONS ${clientType}
-------------------

Nom: ${customerInfo.firstName} ${customerInfo.lastName}
Email: ${customerInfo.email}
Telephone: ${customerInfo.phone}
Adresse: ${customerInfo.address}
Ville: ${customerInfo.postalCode} ${customerInfo.city}

MODE DE LIVRAISON
-------------------
${deliveryOption === 'locker' ? 'Locker / Point Relay' : 'Livraison à domicile'}

DETAIL DE LA COMMANDE
-------------------
${orderDetails}${lotsDetails}
===================
Sous-total: ${subtotal.toFixed(2)}EUR
${discountDetails}Frais de port: ${shippingFee === 0 ? 'OFFERTS' : shippingFee.toFixed(2) + 'EUR'}
===================
TOTAL: ${totalPrice.toFixed(2)}EUR
===================

Merci d'envoyer le lien de paiement au ${clientType.toLowerCase()} a l'adresse: ${customerInfo.email}
`;

    const emailSubject = `Nouvelle commande ${isProOrder ? 'PRO' : ''} - ${customerInfo.firstName} ${customerInfo.lastName} - ${totalPrice.toFixed(2)}EUR`;

    // Pour les commandes pro, envoyer à leschanvriersbretons avec les producteurs en CC
    let recipients: string[] = [ORDER_EMAIL];
    let ccRecipients: string[] | undefined = undefined;

    if (isProOrder) {
      // Récupérer les emails des producteurs concernés par la commande
      const producerIds = Object.keys(itemsByProducer);
      const producerEmails = producerIds
        .map((producerId) => {
          const producer = producers.find((p) => p.id === producerId);
          return producer?.email;
        })
        .filter((email): email is string => !!email && email.trim() !== '');

      if (producerEmails.length > 0) {
        // Pour les pros: envoyer à leschanvriersbretons avec les producteurs en CC
        // Les producteurs sont informés mais la commande est gérée par l'admin
        recipients = [ORDER_EMAIL];
        ccRecipients = producerEmails; // Producteurs en CC
      }
      // Si aucun producteur n'a d'email, on envoie à leschanvriersbretons par défaut
    }

    try {
      // Try MailComposer first
      const isAvailable = await MailComposer.isAvailableAsync();
      console.log('[Cart] MailComposer available:', isAvailable);

      if (isAvailable) {
        const result = await MailComposer.composeAsync({
          recipients,
          ccRecipients,
          subject: emailSubject,
          body: emailBody,
        });

        console.log('[Cart] MailComposer result:', result.status);

        // Check if the email was sent
        if (result.status === MailComposer.MailComposerStatus.SENT) {
          return { success: true, cancelled: false };
        }
        // User cancelled the email
        if (result.status === MailComposer.MailComposerStatus.CANCELLED) {
          return { success: false, cancelled: true };
        }
        // Email saved as draft
        if (result.status === MailComposer.MailComposerStatus.SAVED) {
          return { success: false, cancelled: false, savedAsDraft: true };
        }
        // UNDETERMINED status (common on Android) - treat as success since mail app was opened
        // On Android, we can't know for sure if the email was sent, so we assume success
        // if the user didn't explicitly cancel
        console.log('[Cart] MailComposer status UNDETERMINED - treating as success on Android');
        return { success: true, cancelled: false, undetermined: true };
      }

      // Fallback to mailto link
      console.log('[Cart] MailComposer not available, using mailto fallback');
      const recipientsStr = recipients.join(',');
      let mailtoUrl = `mailto:${recipientsStr}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
      if (ccRecipients && ccRecipients.length > 0) {
        mailtoUrl += `&cc=${ccRecipients.join(',')}`;
      }
      const canOpen = await Linking.canOpenURL(mailtoUrl);

      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        // Avec mailto on ne peut pas savoir si envoyé - on suppose que c'est ok
        return { success: true, cancelled: false, usedMailto: true };
      }

      Alert.alert(
        'Application mail requise',
        'Veuillez configurer une application mail sur votre appareil pour envoyer la commande.'
      );
      return { success: false, cancelled: false, noMailApp: true };
    } catch (error) {
      console.log('[Cart] Error sending email:', error);
      return { success: false, cancelled: false, error: true };
    }
  };

  // Accès au store de file d'attente
  const addPendingOrder = useOrderQueueStore((s) => s.addPendingOrder);
  const pendingOrdersCount = useOrderQueueStore((s) => s.getPendingCount());

  const saveOrder = async (syncToSupabase: boolean = false) => {
    const orderItems = items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      productType: PRODUCT_TYPE_LABELS[item.product.type],
      producerId: item.producerId,
      producerName: item.producerName,
      quantity: item.quantity,
      unitPrice: getItemPrice(item),
      totalPrice: getItemPrice(item) * item.quantity,
      tvaRate: item.product.tvaRate ?? 20,
    }));

    // Construire l'objet commande AVANT de l'ajouter au store local
    const now = Date.now();
    const orderId = `order_${now}_${Math.random().toString(36).substr(2, 9)}`;

    const newOrder: Order = {
      id: orderId,
      customerInfo,
      items: orderItems,
      subtotal,
      shippingFee,
      total: totalPrice,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      isProOrder: isPro, // Sauvegarde le type de commande (PRO ou client)
      paymentValidated: false,
      ticketsDistributed: false,
      ticketsEarned: ticketsEarned,
    };

    // Ajouter au store local d'abord (toujours)
    addOrder({
      customerInfo,
      items: orderItems,
      subtotal,
      shippingFee,
      total: totalPrice,
      isProOrder: isPro, // Sauvegarde le type de commande
    });

    // Distribuer les tickets directement à la commande (pour les clients non-pro)
    if (!isPro && ticketsEarned > 0) {
      addTickets(ticketsEarned);
    }

    // Sync to Supabase SEULEMENT si demandé (après confirmation email)
    if (syncToSupabase && isSupabaseSyncConfigured()) {
      try {
        await syncOrderToSupabase(newOrder);
        console.log('[Cart] Commande synchronisée à Supabase:', orderId);
      } catch (error) {
        console.error('Erreur sync commande Supabase:', error);
        // NOUVEAU: Ajouter à la file d'attente pour resync ultérieure
        addPendingOrder(newOrder);
        showToast("Votre commande n'a pas pu être envoyée. Elle sera envoyée dès que possible.", 'warning');
      }
    }

    // NOTE: Stock décrémentation déplacée vers handleOrder, APRÈS envoi email réussi

    // Retourner les données de commande pour le récapitulatif
    return {
      orderId,
      customerInfo,
      items: orderItems,
      subtotal,
      shippingFee,
      total: totalPrice,
      ticketsEarned,
    };
  };

  // Fonction pour vérifier le stock avant commande
  const checkStockAvailability = (): { isAvailable: boolean; errorMessage: string | null } => {
    for (const item of items) {
      const stock = item.product.stock;
      // Si le stock est défini et inférieur à la quantité demandée
      if (stock !== undefined && stock !== null && stock < item.quantity) {
        return {
          isAvailable: false,
          errorMessage: `Stock insuffisant pour "${item.product.name}". Disponible: ${stock}, Demandé: ${item.quantity}`,
        };
      }
    }
    return { isAvailable: true, errorMessage: null };
  };

  // Fonction pour décrémenter le stock (appelée APRÈS envoi email réussi)
  const decrementAllStock = () => {
    items.forEach((item) => {
      // D'abord essayer de décrémenter le stock du producteur (nouveau système)
      decrementProductStock(item.producerId, item.product.id, item.quantity);

      // Aussi décrémenter dans l'ancien système stockInventory si présent
      const stockItem = stockInventory.stock.find(
        (s) => s.productId === item.product.id && s.producerId === item.producerId
      );
      if (stockItem) {
        stockInventory.decrementQuantity(stockItem.id, item.quantity);
      }

      // Synchroniser avec Supabase
      decrementProductStockInSupabase(item.product.id, item.quantity);
    });
  };

  const handleOrder = async () => {
    // Empêcher les double-clics
    if (isProcessingOrder) return;

    // Vérifier si le profil est complet
    if (!isProfileComplete()) {
      setShowProfileWarning(true);
      return;
    }

    // Vérifier le stock disponible avant de passer la commande
    const stockCheck = checkStockAvailability();
    if (!stockCheck.isAvailable) {
      setStockError(stockCheck.errorMessage);
      return;
    }

    // Début du traitement
    setIsProcessingOrder(true);
    setStockError(null);

    try {
      // Stocker les tickets gagnés avant de vider le panier
      setEarnedTicketsOnOrder(ticketsEarned);

      // NOUVEAU FLUX SÉCURISÉ:
      // 1. D'abord envoyer l'email (sans toucher au stock ni créer la commande)
      const emailResult = await sendOrderEmail();

      // 2. Vérifier le résultat de l'envoi d'email
      if (emailResult.success) {
        // 3. SEULEMENT après confirmation email: sauvegarder la commande avec sync
        const orderData = await saveOrder(true); // true = sync à Supabase

        // 4. SEULEMENT après confirmation email: Décrémenter le stock
        decrementAllStock();

        // Marquer les lots utilisés
        if (selectedDiscount) {
          markItemAsUsed(selectedDiscount.id);
        }
        selectedProducts.forEach((item) => {
          markItemAsUsed(item.id);
        });
        // Reset selections
        setSelectedDiscount(null);
        setSelectedProducts([]);

        // Pour les clients (non pro), afficher le récapitulatif avec tickets
        if (!isPro && ticketsEarned > 0) {
          // Stocker les données de commande pour le récapitulatif
          console.log('[Cart] Setting currentOrderData for recap screen');
          setCurrentOrderData(orderData);
          // Afficher directement le récapitulatif
          console.log('[Cart] Showing RecapScreen');
          setShowRecapScreen(true);
        } else {
          // Pour les pros ou si pas de tickets, afficher la confirmation classique
          setShowOrderConfirmation(true);
        }

        clearCart();
      } else {
        // Afficher un feedback selon le type d'erreur
        // IMPORTANT: La commande N'EST PAS créée, le stock N'EST PAS décrémenté
        if (emailResult.cancelled) {
          showToast('Envoi annulé. Votre commande n\'a pas été finalisée.', 'warning');
        } else if (emailResult.noMailApp) {
          // Alert déjà affiché dans sendOrderEmail
        } else if (emailResult.error) {
          showToast('Erreur lors de l\'envoi. Veuillez réessayer.', 'error');
        } else if (emailResult.savedAsDraft) {
          showToast('Email sauvegardé en brouillon. Veuillez l\'envoyer manuellement.', 'info');
        }
      }
    } finally {
      setIsProcessingOrder(false);
    }
  };

  // Handler pour fermer le récapitulatif
  const handleRecapClose = () => {
    setShowRecapScreen(false);
    setCurrentOrderData(null);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background.nightSky }}>
      {/* Order Confirmation Modal */}
      <Modal
        visible={showOrderConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOrderConfirmation(false)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center px-6">
          <View
            className="w-full max-w-sm rounded-3xl p-6"
            style={{
              backgroundColor: COLORS.background.charcoal,
              borderWidth: 2,
              borderColor: COLORS.accent.hemp,
            }}
          >
            <View className="items-center mb-6">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(90, 158, 90, 0.19)' }}
              >
                <CheckCircle size={48} color={COLORS.accent.hemp} />
              </View>
              <Text style={{ color: COLORS.text.cream }} className="text-2xl font-bold text-center">
                Commande envoyée !
              </Text>
            </View>
            <Text style={{ color: COLORS.text.lightGray }} className="text-center text-base mb-4">
              Votre commande est passée, vous allez recevoir un lien de paiement sur votre adresse mail dans un délai de 24h maximum.
            </Text>
            {/* Message spécifique pour les pros */}
            {isPro ? (
              <View
                className="rounded-xl p-4 mb-6"
                style={{ backgroundColor: 'rgba(61, 122, 74, 0.12)' }}
              >
                <Text style={{ color: COLORS.accent.hemp }} className="text-center text-base font-semibold mb-2">
                  Merci pour votre commande !
                </Text>
                <Text style={{ color: COLORS.text.lightGray }} className="text-center text-sm">
                  En tant que professionnel, vous participez activement à l'essor de la filière chanvre française. Merci pour votre engagement !
                </Text>
              </View>
            ) : (
              <>
                {earnedTicketsOnOrder > 0 && (
                  <View
                    className="rounded-xl p-3 mb-4 flex-row items-center justify-center"
                    style={{ backgroundColor: `${COLORS.primary.brightYellow}20` }}
                  >
                    <Ticket size={20} color={COLORS.primary.brightYellow} />
                    <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold ml-2">
                      +{earnedTicketsOnOrder} ticket{earnedTicketsOnOrder > 1 ? 's' : ''} ajouté{earnedTicketsOnOrder > 1 ? 's' : ''} !
                    </Text>
                  </View>
                )}
              </>
            )}
            <View
              className="rounded-xl p-3 mb-6"
              style={{ backgroundColor: 'rgba(212, 168, 83, 0.1)' }}
            >
              <Text style={{ color: COLORS.primary.paleGold }} className="text-center text-sm">
                Un email sera envoyé à : {customerInfo.email}
              </Text>
            </View>
            {/* Bouton différent pour les pros et les particuliers */}
            {isPro ? (
              <Pressable
                onPress={() => {
                  setShowOrderConfirmation(false);
                  router.push('/(tabs)/map');
                }}
                className="rounded-xl py-4 items-center"
                style={{ backgroundColor: COLORS.accent.forest }}
              >
                <Text style={{ color: COLORS.text.white }} className="font-bold text-base">
                  Retour à la carte
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => {
                  setShowOrderConfirmation(false);
                  router.push('/(tabs)/tirage');
                }}
                className="rounded-xl py-4 items-center"
                style={{ backgroundColor: COLORS.accent.forest }}
              >
                <Text style={{ color: COLORS.text.white }} className="font-bold text-base">
                  Accéder au tirage
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>

      {/* Profile Warning Modal */}
      <Modal
        visible={showProfileWarning}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileWarning(false)}
      >
        <View className="flex-1 bg-black/80 items-center justify-center px-6">
          <View
            className="w-full max-w-sm rounded-3xl p-6"
            style={{
              backgroundColor: COLORS.background.charcoal,
              borderWidth: 2,
              borderColor: '#F59E0B',
            }}
          >
            <Pressable
              onPress={() => setShowProfileWarning(false)}
              className="absolute top-4 right-4 p-2"
            >
              <X size={24} color={COLORS.text.muted} />
            </Pressable>
            <View className="items-center mb-6">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
              >
                <AlertCircle size={48} color="#F59E0B" />
              </View>
              <Text style={{ color: COLORS.text.cream }} className="text-2xl font-bold text-center">
                Profil incomplet
              </Text>
            </View>
            <Text style={{ color: COLORS.text.lightGray }} className="text-center text-base mb-4">
              Pour passer commande, veuillez renseigner les informations manquantes :
            </Text>
            {/* Liste des champs manquants */}
            <View
              className="rounded-xl p-3 mb-6"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
            >
              {getMissingFields().map((field, index) => (
                <View key={index} className="flex-row items-center py-1">
                  <View
                    className="w-2 h-2 rounded-full mr-3"
                    style={{ backgroundColor: '#F59E0B' }}
                  />
                  <Text style={{ color: '#F59E0B' }} className="font-medium">
                    {field}
                  </Text>
                </View>
              ))}
            </View>
            <Pressable
              onPress={() => {
                setShowProfileWarning(false);
                router.push('/edit-profile');
              }}
              className="rounded-xl py-4 items-center flex-row justify-center"
              style={{ backgroundColor: '#F59E0B' }}
            >
              <User size={20} color={COLORS.text.white} />
              <Text style={{ color: COLORS.text.white }} className="font-bold text-base ml-2">
                Compléter mon profil
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Decorative gradient overlay */}
      <LinearGradient
        colors={['rgba(212, 168, 83, 0.1)', 'transparent', 'rgba(61, 122, 74, 0.06)']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      {/* Header */}
      <View style={{ paddingTop: insets.top }}>
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="flex-row items-center justify-between px-5 py-4"
          style={{ borderBottomWidth: 2, borderBottomColor: 'rgba(212, 168, 83, 0.19)' }}
        >
          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/map')}
              className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
              style={{
                backgroundColor: 'rgba(212, 168, 83, 0.12)',
                borderWidth: 1.5,
                borderColor: 'rgba(212, 168, 83, 0.25)',
              }}
            >
              <ArrowLeft size={22} color={COLORS.primary.paleGold} />
            </Pressable>
            <View>
              <View className="flex-row items-center">
                <Text style={{ color: COLORS.text.cream }} className="text-2xl font-bold">
                  Panier
                </Text>
                <Sparkles size={18} color={COLORS.primary.brightYellow} style={{ marginLeft: 8 }} />
              </View>
              <Text style={{ color: COLORS.text.muted }} className="text-sm">
                {totalItems} article{totalItems > 1 ? 's' : ''} magique{totalItems > 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {items.length > 0 && (
            <Pressable
              onPress={clearCart}
              className="flex-row items-center px-4 py-2.5 rounded-2xl"
              style={{
                backgroundColor: 'rgba(199, 91, 91, 0.12)',
                borderWidth: 1.5,
                borderColor: 'rgba(199, 91, 91, 0.25)',
              }}
            >
              <Trash2 size={16} color={COLORS.accent.red} />
              <Text style={{ color: COLORS.accent.red }} className="text-sm font-semibold ml-1.5">Vider</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>

      {/* Bannière des commandes en attente de synchronisation */}
      <PendingOrdersBanner
        onSyncComplete={(result) => {
          if (result.success > 0) {
            showToast(`${result.success} commande(s) synchronisée(s) avec succès !`, 'success');
          }
        }}
      />

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-10">
          <Animated.View entering={FadeInUp.duration(600).delay(200)}>
            <LinearGradient
              colors={['rgba(212, 168, 83, 0.19)', 'rgba(61, 122, 74, 0.12)']}
              className="w-28 h-28 rounded-3xl items-center justify-center mb-6"
              style={{ borderWidth: 2, borderColor: 'rgba(212, 168, 83, 0.25)' }}
            >
              <ShoppingCart size={52} color={COLORS.primary.paleGold} />
            </LinearGradient>
          </Animated.View>
          <Animated.Text
            entering={FadeInUp.duration(600).delay(300)}
            style={{ color: COLORS.text.cream }}
            className="text-xl font-bold text-center"
          >
            Votre panier est vide
          </Animated.Text>
          <Animated.Text
            entering={FadeInUp.duration(600).delay(400)}
            style={{ color: COLORS.text.muted }}
            className="text-center mt-2"
          >
            Explorez la carte magique pour découvrir les producteurs
          </Animated.Text>
          <Animated.View entering={FadeInUp.duration(600).delay(500)}>
            <Pressable
              onPress={() => router.push('/(tabs)/map')}
              className="mt-6 px-8 py-4 rounded-2xl flex-row items-center"
              style={{
                backgroundColor: COLORS.accent.forest,
                shadowColor: COLORS.accent.hemp,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
              }}
            >
              <MapPin size={18} color={COLORS.text.white} />
              <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                Voir la carte
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1 px-5 pt-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 200 }}
          >
            {Object.entries(itemsByProducer).map(([producerId, { producerName, items: producerItems }], index) => (
              <Animated.View
                key={producerId}
                entering={FadeInUp.duration(500).delay(index * 100)}
                className="mb-6"
              >
                {/* Producer header */}
                <View
                  className="flex-row items-center mb-3 px-3 py-2 rounded-xl"
                  style={{ backgroundColor: 'rgba(61, 122, 74, 0.12)' }}
                >
                  <Package size={18} color={COLORS.accent.hemp} />
                  <Text style={{ color: COLORS.accent.hemp }} className="font-bold ml-2 text-base">
                    {producerName}
                  </Text>
                </View>

                {/* Producer items */}
                {producerItems.map((item, itemIndex) => (
                  <View
                    key={item.product.id}
                    className="mb-3 rounded-2xl overflow-hidden"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: 'rgba(212, 168, 83, 0.15)',
                      shadowColor: COLORS.primary.gold,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                    }}
                  >
                    <View className="flex-row p-4">
                      <View
                        className="rounded-xl overflow-hidden"
                        style={{ borderWidth: 2, borderColor: 'rgba(212, 168, 83, 0.19)' }}
                      >
                        <Image
                          source={{ uri: item.product.image }}
                          className="w-20 h-20"
                          resizeMode="cover"
                        />
                      </View>
                      <View className="flex-1 ml-4">
                        <View
                          className="self-start px-2.5 py-1 rounded-full mb-1.5"
                          style={{ backgroundColor: `${PRODUCT_TYPE_COLORS[item.product.type]}30` }}
                        >
                          <Text
                            className="text-xs font-bold"
                            style={{ color: PRODUCT_TYPE_COLORS[item.product.type] }}
                          >
                            {PRODUCT_TYPE_LABELS[item.product.type]}
                          </Text>
                        </View>
                        <Text style={{ color: COLORS.text.cream }} className="font-bold text-base">
                          {item.product.name}
                        </Text>
                        <Text style={{ color: COLORS.text.muted }} className="text-xs mt-0.5">
                          {item.product.weight}
                        </Text>
                        {item.promoDiscount ? (
                          <View className="flex-row items-center mt-1">
                            <Text style={{ color: COLORS.text.muted, textDecorationLine: 'line-through' }} className="text-sm mr-2">
                              {getBasePrice(item).toFixed(2)}€
                            </Text>
                            <Text style={{ color: COLORS.primary.orange }} className="font-bold text-lg">
                              {getItemPrice(item).toFixed(2)}€
                            </Text>
                            <View className="bg-red-500/20 px-1.5 py-0.5 rounded ml-2">
                              <Text style={{ color: COLORS.accent.red }} className="text-xs font-bold">
                                {`-${item.promoDiscount}%`}
                              </Text>
                            </View>
                          </View>
                        ) : hasProPrice(item) ? (
                          <View className="mt-1">
                            <View className="flex-row items-center">
                              <View
                                className="flex-row items-center px-1.5 py-0.5 rounded-full mr-2"
                                style={{ backgroundColor: 'rgba(74, 155, 155, 0.15)' }}
                              >
                                <Briefcase size={10} color={COLORS.accent.teal} />
                                <Text style={{ color: COLORS.accent.teal, fontSize: 10, fontWeight: '700', marginLeft: 3 }}>
                                  {"PRO"}
                                </Text>
                              </View>
                              <Text style={{ color: COLORS.text.muted, textDecorationLine: 'line-through' }} className="text-sm">
                                {`${(item.product.price ?? 0).toFixed(2)}€`}
                              </Text>
                            </View>
                            <Text style={{ color: COLORS.accent.teal }} className="font-bold text-lg">
                              {`${getItemPrice(item).toFixed(2)}€`}
                            </Text>
                          </View>
                        ) : (
                          <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold text-lg mt-1">
                            {`${getItemPrice(item).toFixed(2)}€`}
                          </Text>
                        )}

                        {/* Delivery info */}
                        {item.product.delivery_type && (
                          <View className="flex-row items-center mt-1.5">
                            <View
                              className="flex-row items-center px-2 py-0.5 rounded-lg"
                              style={{ backgroundColor: `${COLORS.accent.sky}15` }}
                            >
                              <Truck size={10} color={COLORS.accent.sky} />
                              <Text style={{ color: COLORS.accent.sky }} className="text-xs ml-1">
                                {item.product.delivery_type === 'flat'
                                  ? `Livraison : ${item.product.delivery_flat_price?.toFixed(2) ?? '0'}€`
                                  : `Livraison dès ${item.product.delivery_min_order_amount?.toFixed(0) ?? '0'}€`}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>

                      {/* Remove button */}
                      <Pressable
                        onPress={() => removeFromCart(item.product.id)}
                        className="w-10 h-10 rounded-xl items-center justify-center"
                        style={{ backgroundColor: 'rgba(199, 91, 91, 0.1)' }}
                      >
                        <Trash2 size={18} color={COLORS.accent.red} />
                      </Pressable>
                    </View>

                    {/* Quantity controls */}
                    <View
                      className="flex-row items-center justify-between px-4 py-3"
                      style={{
                        backgroundColor: `${COLORS.background.nightSky}80`,
                        borderTopWidth: 1,
                        borderTopColor: 'rgba(212, 168, 83, 0.1)',
                      }}
                    >
                      <Text style={{ color: COLORS.text.muted }} className="text-sm font-medium">
                        Quantité
                      </Text>
                      <View className="flex-row items-center">
                        <Pressable
                          onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-10 h-10 rounded-xl items-center justify-center"
                          style={{
                            backgroundColor: 'rgba(122, 139, 168, 0.12)',
                            borderWidth: 1,
                            borderColor: 'rgba(122, 139, 168, 0.19)',
                          }}
                        >
                          <Minus size={16} color={COLORS.text.lightGray} />
                        </Pressable>
                        {editingQuantity === item.product.id ? (
                          <TextInput
                            value={tempQuantity}
                            onChangeText={setTempQuantity}
                            onBlur={() => handleQuantitySubmit(item.product.id)}
                            onSubmitEditing={() => handleQuantitySubmit(item.product.id)}
                            keyboardType="number-pad"
                            autoFocus
                            selectTextOnFocus
                            className="font-bold text-xl mx-3 text-center"
                            style={{
                              color: COLORS.text.cream,
                              backgroundColor: 'rgba(212, 168, 83, 0.12)',
                              borderRadius: 8,
                              width: 50,
                              paddingVertical: 4,
                            }}
                          />
                        ) : (
                          <Pressable onPress={() => handleQuantityPress(item.product.id, item.quantity)}>
                            <Text style={{ color: COLORS.text.cream }} className="font-bold text-xl mx-5">
                              {item.quantity}
                            </Text>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-10 h-10 rounded-xl items-center justify-center"
                          style={{
                            backgroundColor: COLORS.accent.forest,
                            shadowColor: COLORS.accent.hemp,
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                          }}
                        >
                          <Plus size={16} color={COLORS.text.white} />
                        </Pressable>
                      </View>
                      <Text style={{ color: COLORS.primary.paleGold }} className="font-bold text-lg">
                        {(getItemPrice(item) * item.quantity).toFixed(2)}€
                      </Text>
                    </View>
                  </View>
                ))}
              </Animated.View>
            ))}

            {/* Free products from inventory (lots) */}
            {selectedProducts.length > 0 && (
              <Animated.View
                entering={FadeInUp.duration(500)}
                className="mb-6"
              >
                {/* Header for free items */}
                <View
                  className="flex-row items-center mb-3 px-3 py-2 rounded-xl"
                  style={{ backgroundColor: `${COLORS.primary.brightYellow}20` }}
                >
                  <Gift size={18} color={COLORS.primary.brightYellow} />
                  <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold ml-2 text-base">
                    Lots offerts
                  </Text>
                </View>

                {/* Free items */}
                {selectedProducts.map((item) => (
                  <View
                    key={item.id}
                    className="mb-3 rounded-2xl overflow-hidden"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1.5,
                      borderColor: `${COLORS.primary.brightYellow}40`,
                      shadowColor: COLORS.primary.brightYellow,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.15,
                      shadowRadius: 8,
                    }}
                  >
                    <View className="flex-row p-4">
                      <View
                        className="rounded-xl overflow-hidden"
                        style={{ borderWidth: 2, borderColor: `${COLORS.primary.brightYellow}40` }}
                      >
                        <Image
                          source={{ uri: item.product.image }}
                          className="w-20 h-20"
                          resizeMode="cover"
                        />
                      </View>
                      <View className="flex-1 ml-4 justify-center">
                        <Text style={{ color: COLORS.text.cream }} className="font-bold text-base">
                          {item.product.name}
                        </Text>
                        <Text style={{ color: COLORS.text.muted }} className="text-sm">
                          {item.product.producer}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <Text
                            style={{ color: COLORS.text.muted, textDecorationLine: 'line-through' }}
                            className="text-sm mr-2"
                          >
                            {item.product.value}€
                          </Text>
                          <View
                            className="px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(90, 158, 90, 0.19)' }}
                          >
                            <Text style={{ color: COLORS.accent.hemp }} className="text-xs font-bold">
                              OFFERT
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View className="justify-center">
                        <Text style={{ color: COLORS.accent.hemp }} className="font-bold text-xl">
                          0,00€
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </Animated.View>
            )}
          </ScrollView>

          {/* Bottom checkout bar */}
          <View
            className="absolute bottom-0 left-0 right-0"
          >
            <LinearGradient
              colors={[COLORS.background.nightSky, COLORS.background.dark]}
              className="px-4 pt-3 pb-2"
              style={{
                borderTopWidth: 2,
                borderTopColor: COLORS.primary.gold,
              }}
            >
              {/* Summary */}
              <View className="mb-2">
                {/* Delivery options - compact */}
                <View className="mb-2">
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => setDeliveryOption('locker')}
                      className="flex-1 rounded-lg px-2 py-2 flex-row items-center justify-between"
                      style={{
                        backgroundColor: deliveryOption === 'locker' ? 'rgba(61, 122, 74, 0.12)' : 'rgba(122, 139, 168, 0.06)',
                        borderWidth: 1.5,
                        borderColor: deliveryOption === 'locker' ? COLORS.accent.forest : 'rgba(122, 139, 168, 0.19)',
                      }}
                    >
                      <View className="flex-row items-center">
                        <Building2 size={14} color={deliveryOption === 'locker' ? COLORS.accent.hemp : COLORS.text.muted} />
                        <Text
                          style={{ color: deliveryOption === 'locker' ? COLORS.accent.hemp : COLORS.text.muted }}
                          className="font-medium text-xs ml-1"
                        >
                          Locker/Relay
                        </Text>
                      </View>
                      <Text
                        style={{ color: deliveryOption === 'locker' ? COLORS.text.cream : COLORS.text.muted }}
                        className="font-bold text-sm"
                      >
                        4€
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => setDeliveryOption('domicile')}
                      className="flex-1 rounded-lg px-2 py-2 flex-row items-center justify-between"
                      style={{
                        backgroundColor: deliveryOption === 'domicile' ? 'rgba(61, 122, 74, 0.12)' : 'rgba(122, 139, 168, 0.06)',
                        borderWidth: 1.5,
                        borderColor: deliveryOption === 'domicile' ? COLORS.accent.forest : 'rgba(122, 139, 168, 0.19)',
                      }}
                    >
                      <View className="flex-row items-center">
                        <Truck size={14} color={deliveryOption === 'domicile' ? COLORS.accent.hemp : COLORS.text.muted} />
                        <Text
                          style={{ color: deliveryOption === 'domicile' ? COLORS.accent.hemp : COLORS.text.muted }}
                          className="font-medium text-xs ml-1"
                        >
                          Domicile
                        </Text>
                      </View>
                      <Text
                        style={{ color: deliveryOption === 'domicile' ? COLORS.text.cream : COLORS.text.muted }}
                        className="font-bold text-sm"
                      >
                        7€
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Compact summary row */}
                <View className="flex-row justify-between items-center mb-1">
                  <Text style={{ color: COLORS.text.muted }} className="text-xs">
                    Sous-total ({totalItems})
                  </Text>
                  <Text style={{ color: COLORS.text.lightGray }} className="text-xs">
                    {subtotal.toFixed(2)}€
                  </Text>
                </View>

                {selectedDiscount && discountAmount > 0 && (
                  <View className="flex-row justify-between items-center mb-1">
                    <Text style={{ color: COLORS.accent.hemp }} className="text-xs">
                      Réduction
                    </Text>
                    <Text style={{ color: COLORS.accent.hemp }} className="text-xs">
                      -{discountAmount.toFixed(2)}€
                    </Text>
                  </View>
                )}

                <View className="flex-row justify-between items-center mb-1">
                  <Text style={{ color: COLORS.text.muted }} className="text-xs">
                    Livraison
                  </Text>
                  <Text style={{ color: shippingFee === 0 ? COLORS.accent.hemp : COLORS.text.lightGray }} className="text-xs">
                    {shippingFee === 0 ? 'OFFERT' : `${shippingFee.toFixed(2)}€`}
                  </Text>
                </View>

                {/* Total */}
                <View
                  className="flex-row justify-between items-center pt-2 mt-1"
                  style={{ borderTopWidth: 1, borderTopColor: 'rgba(212, 168, 83, 0.19)' }}
                >
                  <Text style={{ color: COLORS.text.cream }} className="text-sm font-semibold">
                    Total TTC
                  </Text>
                  <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold text-xl">
                    {totalPrice.toFixed(2)}€
                  </Text>
                </View>

                {/* Tickets gagnés - affiché uniquement pour les non-pros */}
                {!isPro && ticketsEarned > 0 && (
                  <View
                    className="flex-row items-center justify-center mt-2 py-2 rounded-lg"
                    style={{ backgroundColor: 'rgba(247, 212, 76, 0.15)' }}
                  >
                    <Ticket size={16} color={COLORS.primary.brightYellow} />
                    <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold text-sm ml-2">
                      +{ticketsEarned} ticket{ticketsEarned > 1 ? 's' : ''} de tirage
                    </Text>
                  </View>
                )}
              </View>

              {/* Buttons row */}
              <View className="flex-row gap-2 mb-1">
                <Pressable
                  onPress={() => setShowInventory(true)}
                  className="flex-1 rounded-xl py-2.5 items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(247, 212, 76, 0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(247, 212, 76, 0.4)',
                  }}
                >
                  <Text style={{ color: COLORS.primary.brightYellow }} className="font-semibold text-xs">
                    Inventaire {availableLotsCount > 0 ? `(${availableLotsCount})` : ''}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push('/(tabs)/map')}
                  className="flex-1 rounded-xl py-2.5 items-center justify-center"
                  style={{
                    backgroundColor: 'rgba(61, 122, 74, 0.2)',
                    borderWidth: 1,
                    borderColor: COLORS.accent.forest,
                  }}
                >
                  <Text style={{ color: COLORS.accent.hemp }} className="font-semibold text-xs">
                    Continuer mes achats
                  </Text>
                </Pressable>
              </View>

              {/* Stock Error Message */}
              {stockError && (
                <View
                  className="rounded-xl p-3 mb-3 flex-row items-center"
                  style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                >
                  <AlertCircle size={18} color="#EF4444" />
                  <Text className="flex-1 ml-2 text-sm" style={{ color: '#EF4444' }}>
                    {stockError}
                  </Text>
                  <Pressable onPress={() => setStockError(null)}>
                    <X size={16} color="#EF4444" />
                  </Pressable>
                </View>
              )}

              {/* Checkout button */}
              <OfflineDisabledButton
                onPress={handleOrder}
                disabled={isProcessingOrder}
                offlineMessage="Commande impossible hors ligne"
                className="rounded-xl py-3 items-center justify-center flex-row"
                style={{
                  backgroundColor: isProcessingOrder ? 'rgba(212, 168, 83, 0.5)' : COLORS.primary.gold,
                  opacity: isProcessingOrder ? 0.7 : 1,
                }}
              >
                {isProcessingOrder ? (
                  <>
                    <ActivityIndicator size="small" color={COLORS.text.white} />
                    <Text style={{ color: COLORS.text.white }} className="font-bold text-sm ml-2">
                      Traitement en cours...
                    </Text>
                  </>
                ) : (
                  <Text style={{ color: COLORS.text.white }} className="font-bold text-sm">
                    Commander
                  </Text>
                )}
              </OfflineDisabledButton>
            </LinearGradient>
          </View>
        </>
      )}

      {/* Inventory Modal */}
      <InventoryModal
        visible={showInventory}
        onClose={() => setShowInventory(false)}
        onSelectDiscount={setSelectedDiscount}
        onSelectProducts={setSelectedProducts}
        selectedDiscount={selectedDiscount}
        selectedProducts={selectedProducts}
        orderSubtotal={subtotal}
      />

      {/* Écran récapitulatif avec crédit de tickets */}
      <TicketRecapScreen
        visible={showRecapScreen}
        orderData={currentOrderData}
        onClose={handleRecapClose}
      />

      {/* Toast pour les notifications */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
        position="top"
      />
    </View>
  );
}
