import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Modal,
  Image,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text, TextInput } from '@/components/ui';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  Settings,
  MapPin,
  Leaf,
  Cloud,
  Package,
  Plus,
  Trash2,
  Edit3,
  X,
  Check,
  RotateCcw,
  Users,
  Tag,
  Gift,
  Eye,
  EyeOff,
  ChevronDown,
  ShoppingBag,
  Phone,
  Mail,
  Home,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  CreditCard,
  Layout,
  Percent,
  ImageIcon,
  Boxes,
  AlertTriangle,
  Minus,
  Layers,
  ChevronUp,
  ShoppingCart,
  Sparkles,
  Database,
  RefreshCw,
  Upload,
  Download,
  CloudCog,
  UserCog,
  Link2,
  Unlink,
  Ticket,
  BarChart3,
  Store,
  Briefcase,
} from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import {
  useOptionsStore,
  useProducerStore,
  useLotsStore,
  useOrdersStore,
  useTabVisibilityStore,
  usePromosStore,
  usePromoProductsStore,
  usePacksStore,
  useStockInventoryStore,
  useSubscriptionStore,
  ProductTypeOption,
  Lot,
  LotItem,
  Rarity,
  RARITY_CONFIG,
  Order,
  OrderItem,
  OrderStatus,
  ORDER_STATUS_CONFIG,
  TabId,
  Promo,
  PromoProduct,
  StockItem,
} from '@/lib/store';
import { SAMPLE_PRODUCERS, ProducerProduct, PRODUCT_TYPE_LABELS, PRODUCT_TYPE_COLORS } from '@/lib/producers';
import { AddProducerModal } from '@/components/AddProducerModal';
import { AddProductModal } from '@/components/AddProductModal';
import { Producer } from '@/lib/producers';
import { getImageSource } from '@/lib/asset-images';
import {
  fetchAppData,
  addAppData,
  updateAppData,
  deleteAppData,
  isSupabaseConfigured,
  AppDataItem,
} from '@/lib/supabase';
import {
  isSupabaseSyncConfigured,
  fetchAllProducersWithProducts,
  syncProducerToSupabase,
  deleteProducerFromSupabase,
  deleteProductFromSupabase,
  syncLotToSupabase,
  fetchAllLotsWithItems,
  syncAllPacksToSupabase,
  syncAllPromoProductsToSupabase,
  fetchAllPacksWithItems,
  fetchPromoProducts,
  fetchOrders,
  syncOrderToSupabase,
  updateOrderInSupabase,
  deleteOrderFromSupabase,
} from '@/lib/supabase-sync';
import { useSupabaseSyncStore } from '@/lib/store';
import { processImageForSync } from '@/lib/image-upload';
import {
  fetchUsers,
  updateUserProfile,
  updateProStatus,
  fetchProducerUsers,
  linkProducerToProfile,
  fetchProducersWithProfiles,
  isUsersApiConfigured,
  inviteUser,
  deleteUser,
  UserProfile,
  UserRole,
  UserCategory,
  ProStatus,
  USER_ROLE_LABELS,
  USER_ROLE_COLORS,
  USER_CATEGORY_LABELS,
  PRO_STATUS_LABELS,
  PRO_STATUS_COLORS,
} from '@/lib/supabase-users';
import { usePermissions } from '@/lib/useAuth';
import { AdminProducerOrders } from '@/components/AdminProducerOrders';

type TabType = 'orders' | 'users' | 'producers' | 'lots' | 'inventory' | 'promo-products' | 'codes' | 'regions' | 'soils' | 'climates' | 'products' | 'tabs' | 'produits-view' | 'supabase-data' | 'sync' | 'producer-orders';

// Edit Modal Component
interface EditModalProps {
  visible: boolean;
  title: string;
  value: string;
  onSave: (value: string) => void;
  onClose: () => void;
  color?: string;
  onColorChange?: (color: string) => void;
}

const EditModal = ({ visible, title, value, onSave, onClose, color, onColorChange }: EditModalProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [inputColor, setInputColor] = useState(color || '');
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (visible) {
      setInputValue(value);
      setInputColor(color || '');
    }
  }, [value, color, visible]);

  const handleSave = () => {
    if (inputValue.trim()) {
      onSave(inputValue.trim());
      if (onColorChange && inputColor) {
        onColorChange(inputColor);
      }
    }
  };

  const presetColors = [
    '#7d8c5c', '#5a7247', '#f1cf6e', '#8b6914',
    '#6c5c18', '#c9b896', '#8b7355', '#4a6b5d',
  ];

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
        <Pressable className="flex-1" onPress={onClose} />
        <View
          className="rounded-t-3xl"
          style={{ backgroundColor: COLORS.background.dark, paddingBottom: insets.bottom + 20 }}
        >
          <View
            className="flex-row items-center justify-between px-5 py-4"
            style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
          >
            <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">{title}</Text>
            <Pressable onPress={onClose} className="p-2">
              <X size={24} color={COLORS.text.white} />
            </Pressable>
          </View>

          <View className="px-5 py-4">
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">Nom</Text>
            <TextInput
              value={inputValue}
              onChangeText={setInputValue}
              placeholder="Entrez une valeur..."
              placeholderTextColor={COLORS.text.muted}
              className="rounded-xl px-4 py-3 mb-4"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
              }}
            />

            {onColorChange && (
              <>
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">Couleur</Text>
                <View className="flex-row flex-wrap gap-2 mb-4">
                  {presetColors.map((c) => (
                    <Pressable
                      key={c}
                      onPress={() => setInputColor(c)}
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{
                        backgroundColor: c,
                        borderWidth: inputColor === c ? 3 : 0,
                        borderColor: COLORS.text.white,
                      }}
                    >
                      {inputColor === c && <Check size={16} color={COLORS.text.white} />}
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={inputColor}
                  onChangeText={setInputColor}
                  placeholder="#RRGGBB"
                  placeholderTextColor={COLORS.text.muted}
                  className="rounded-xl px-4 py-3 mb-4"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}20`,
                    color: COLORS.text.white,
                  }}
                />
              </>
            )}

            <Pressable
              onPress={handleSave}
              className="rounded-xl py-4 items-center active:opacity-80"
              style={{ backgroundColor: COLORS.primary.gold }}
            >
              <Text style={{ color: COLORS.text.white }} className="font-bold">Enregistrer</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// List Item Component
const ListItem = ({ label, color, onEdit, onDelete }: {
  label: string;
  color?: string;
  onEdit: () => void;
  onDelete: () => void;
}) => (
  <View
    className="flex-row items-center justify-between px-4 py-3 mb-2 rounded-xl"
    style={{
      backgroundColor: `${COLORS.text.white}05`,
      borderWidth: 1,
      borderColor: `${COLORS.primary.paleGold}10`,
    }}
  >
    <View className="flex-row items-center flex-1">
      {color && (
        <View className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: color }} />
      )}
      <Text style={{ color: COLORS.text.white }} className="flex-1" numberOfLines={1}>{label}</Text>
    </View>
    <View className="flex-row">
      <Pressable onPress={onEdit} className="p-2">
        <Edit3 size={18} color={COLORS.primary.paleGold} />
      </Pressable>
      <Pressable onPress={onDelete} className="p-2">
        <Trash2 size={18} color="#EF4444" />
      </Pressable>
    </View>
  </View>
);

// Producer Item Component
const ProducerItem = ({ name, region, image, productCount, onEdit, onDelete, onAddProduct }: {
  name: string;
  region: string;
  image?: string;
  productCount: number;
  onEdit: () => void;
  onDelete: () => void;
  onAddProduct: () => void;
}) => (
  <View
    className="flex-row items-center px-4 py-3 mb-2 rounded-xl"
    style={{
      backgroundColor: `${COLORS.text.white}05`,
      borderWidth: 1,
      borderColor: `${COLORS.primary.paleGold}10`,
    }}
  >
    {image ? (
      <Image
        source={getImageSource(image)}
        className="w-14 h-14 rounded-xl"
        resizeMode="cover"
      />
    ) : (
      <View className="w-14 h-14 rounded-xl items-center justify-center" style={{ backgroundColor: `${COLORS.text.white}10` }}>
        <Leaf size={24} color={COLORS.text.muted} />
      </View>
    )}
    <View className="flex-1 ml-3">
      <Text style={{ color: COLORS.text.white }} className="font-semibold" numberOfLines={1}>{name}</Text>
      <Text style={{ color: COLORS.text.muted }} className="text-xs" numberOfLines={1}>{region}</Text>
      <Pressable onPress={onAddProduct}>
        <Text style={{ color: COLORS.primary.paleGold }} className="text-xs">
          {productCount} produit(s) • Ajouter +
        </Text>
      </Pressable>
    </View>
    <View className="flex-row">
      <Pressable onPress={onEdit} className="p-2">
        <Edit3 size={18} color={COLORS.primary.paleGold} />
      </Pressable>
      <Pressable onPress={onDelete} className="p-2">
        <Trash2 size={18} color="#EF4444" />
      </Pressable>
    </View>
  </View>
);

// Lot Item Component
const LotItemCard = ({ lot, onEdit, onDelete, onToggle }: {
  lot: Lot;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
}) => {
  const rarityConfig = RARITY_CONFIG[lot.rarity];

  return (
    <View
      className="px-4 py-3 mb-3 rounded-xl"
      style={{
        backgroundColor: `${COLORS.text.white}05`,
        borderWidth: 2,
        borderColor: lot.active ? rarityConfig.color : `${COLORS.text.white}10`,
        opacity: lot.active ? 1 : 0.6,
      }}
    >
      <View className="flex-row items-center mb-2">
        <View
          className="px-2 py-1 rounded-lg mr-2"
          style={{ backgroundColor: `${rarityConfig.color}30` }}
        >
          <Text style={{ color: rarityConfig.color }} className="text-xs font-bold">
            {rarityConfig.label}
          </Text>
        </View>
        <Text style={{ color: COLORS.text.white }} className="font-semibold flex-1" numberOfLines={1}>
          {lot.name}
        </Text>
        <Text style={{ color: COLORS.primary.paleGold }} className="font-bold">
          {lot.value}€
        </Text>
      </View>

      {lot.description ? (
        <Text style={{ color: COLORS.text.muted }} className="text-xs mb-2" numberOfLines={2}>
          {lot.description}
        </Text>
      ) : null}

      <View className="flex-row items-center mb-2">
        <Package size={14} color={COLORS.text.muted} />
        <Text style={{ color: COLORS.text.muted }} className="text-xs ml-1">
          {lot.items.length} produit(s)
        </Text>
      </View>

      <View className="flex-row justify-end">
        <Pressable onPress={onToggle} className="p-2">
          {lot.active ? (
            <Eye size={18} color={COLORS.accent.hemp} />
          ) : (
            <EyeOff size={18} color={COLORS.text.muted} />
          )}
        </Pressable>
        <Pressable onPress={onEdit} className="p-2">
          <Edit3 size={18} color={COLORS.primary.paleGold} />
        </Pressable>
        <Pressable onPress={onDelete} className="p-2">
          <Trash2 size={18} color="#EF4444" />
        </Pressable>
      </View>
    </View>
  );
};

// Add Stock Modal Component
interface AddStockModalProps {
  visible: boolean;
  onClose: () => void;
  editingItem: StockItem | null;
}

const AddStockModal = ({ visible, onClose, editingItem }: AddStockModalProps) => {
  const insets = useSafeAreaInsets();
  const addStockItem = useStockInventoryStore((s) => s.addStockItem);
  const updateStockItem = useStockInventoryStore((s) => s.updateStockItem);
  const productTypes = useOptionsStore((s) => s.productTypes);
  const customProducers = useProducerStore((s) => s.producers);

  // Merge producers
  const allProducers = React.useMemo(() => {
    const customIds = new Set(customProducers.map((p) => p.id));
    const sampleOnly = SAMPLE_PRODUCERS.filter((p) => !customIds.has(p.id));
    return [...sampleOnly, ...customProducers];
  }, [customProducers]);

  // Form state
  const [productName, setProductName] = useState('');
  const [selectedProducerId, setSelectedProducerId] = useState('');
  const [productType, setProductType] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [tvaRate, setTvaRate] = useState('20');
  const [unit, setUnit] = useState('g');
  const [minStock, setMinStock] = useState('5');
  const [image, setImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const [showProducerPicker, setShowProducerPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const units = [
    { id: 'g', label: 'Gramme (g)' },
    { id: 'ml', label: 'Millilitre (ml)' },
    { id: 'unité', label: 'Unité' },
    { id: 'kg', label: 'Kilogramme (kg)' },
    { id: 'L', label: 'Litre (L)' },
  ];

  // Reset/populate form when modal opens
  React.useEffect(() => {
    if (visible) {
      if (editingItem) {
        setProductName(editingItem.productName);
        setSelectedProducerId(editingItem.producerId);
        setProductType(editingItem.productType);
        setQuantity(editingItem.quantity.toString());
        setPrice(editingItem.price.toString());
        setCostPrice(editingItem.costPrice.toString());
        setTvaRate(editingItem.tvaRate.toString());
        setUnit(editingItem.unit);
        setMinStock(editingItem.minStock.toString());
        setImage(editingItem.image || '');
      } else {
        setProductName('');
        setSelectedProducerId('');
        setProductType('');
        setQuantity('');
        setPrice('');
        setCostPrice('');
        setTvaRate('20');
        setUnit('g');
        setMinStock('5');
        setImage('');
      }
    }
  }, [visible, editingItem]);

  const selectedProducer = allProducers.find((p) => p.id === selectedProducerId);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const canSave = productName.trim() && selectedProducerId && productType &&
    quantity && parseFloat(quantity) >= 0 &&
    price && parseFloat(price) > 0;

  const handleSave = async () => {
    if (!canSave) return;

    setIsUploading(true);
    try {
      // Upload image to Supabase Storage if it's a local file
      const uploadedImage = image ? await processImageForSync(image, 'products') : undefined;

      const producerName = selectedProducer?.name || '';

      if (editingItem) {
        updateStockItem(editingItem.id, {
          productName: productName.trim(),
          producerId: selectedProducerId,
          producerName,
          productType,
          quantity: parseInt(quantity, 10),
          price: parseFloat(price),
          costPrice: parseFloat(costPrice) || 0,
          tvaRate: parseFloat(tvaRate) || 20,
          unit,
          minStock: parseInt(minStock, 10) || 5,
          image: uploadedImage || undefined,
        });
      } else {
        addStockItem({
          productId: `prod-${Date.now()}`,
          productName: productName.trim(),
          producerId: selectedProducerId,
          producerName,
          productType,
          quantity: parseInt(quantity, 10),
          price: parseFloat(price),
          costPrice: parseFloat(costPrice) || 0,
          tvaRate: parseFloat(tvaRate) || 20,
          unit,
          minStock: parseInt(minStock, 10) || 5,
          image: uploadedImage || undefined,
          visible: true,
          isOnPromo: false,
          discountPercent: 0,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error saving stock item:', error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.background.dark, paddingTop: insets.top }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5 py-4"
          style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
        >
          <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
            {editingItem ? 'Modifier le produit' : 'Ajouter au stock'}
          </Text>
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color={COLORS.text.white} />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className="py-4">
            {/* Product Image */}
            <Pressable
              onPress={pickImage}
              className="w-full h-32 rounded-xl items-center justify-center mb-4"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                borderStyle: 'dashed',
              }}
            >
              {image ? (
                <Image source={{ uri: image }} className="w-full h-full rounded-xl" />
              ) : (
                <View className="items-center">
                  <ImageIcon size={32} color={COLORS.text.muted} />
                  <Text style={{ color: COLORS.text.muted }} className="text-sm mt-2">
                    Ajouter une image
                  </Text>
                </View>
              )}
            </Pressable>

            {/* Product Name */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Nom du produit *
            </Text>
            <TextInput
              value={productName}
              onChangeText={setProductName}
              placeholder="Ex: Purple Haze Premium"
              placeholderTextColor={COLORS.text.muted}
              className="rounded-xl px-4 py-3 mb-4"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
              }}
            />

            {/* Producer Picker */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Producteur *
            </Text>
            <Pressable
              onPress={() => setShowProducerPicker(!showProducerPicker)}
              className="rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
              }}
            >
              <Text style={{ color: selectedProducer ? COLORS.text.white : COLORS.text.muted }}>
                {selectedProducer?.name || 'Sélectionner un producteur'}
              </Text>
              <ChevronDown size={20} color={COLORS.text.muted} />
            </Pressable>
            {showProducerPicker && (
              <View
                className="rounded-xl mb-4 overflow-hidden"
                style={{
                  backgroundColor: `${COLORS.text.white}08`,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.paleGold}15`,
                }}
              >
                {allProducers.map((producer) => (
                  <Pressable
                    key={producer.id}
                    onPress={() => {
                      setSelectedProducerId(producer.id);
                      setShowProducerPicker(false);
                    }}
                    className="px-4 py-3 flex-row items-center"
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: `${COLORS.text.white}08`,
                      backgroundColor: selectedProducerId === producer.id ? `${COLORS.primary.gold}15` : 'transparent',
                    }}
                  >
                    {producer.image && (
                      <Image source={getImageSource(producer.image)} className="w-8 h-8 rounded-full mr-3" />
                    )}
                    <Text style={{ color: COLORS.text.white }}>{producer.name}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Product Type Picker */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Type de produit *
            </Text>
            <Pressable
              onPress={() => setShowTypePicker(!showTypePicker)}
              className="rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
              }}
            >
              <Text style={{ color: productType ? COLORS.text.white : COLORS.text.muted }}>
                {productTypes.find((t) => t.id === productType)?.label || 'Sélectionner un type'}
              </Text>
              <ChevronDown size={20} color={COLORS.text.muted} />
            </Pressable>
            {showTypePicker && (
              <View
                className="rounded-xl mb-4 overflow-hidden"
                style={{
                  backgroundColor: `${COLORS.text.white}08`,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.paleGold}15`,
                }}
              >
                {productTypes.map((type) => (
                  <Pressable
                    key={type.id}
                    onPress={() => {
                      setProductType(type.id);
                      setShowTypePicker(false);
                    }}
                    className="px-4 py-3 flex-row items-center"
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: `${COLORS.text.white}08`,
                      backgroundColor: productType === type.id ? `${COLORS.primary.gold}15` : 'transparent',
                    }}
                  >
                    <View
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: type.color }}
                    />
                    <Text style={{ color: COLORS.text.white }}>{type.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Quantity & Price Row */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                  Quantité *
                </Text>
                <TextInput
                  value={quantity}
                  onChangeText={setQuantity}
                  placeholder="0"
                  placeholderTextColor={COLORS.text.muted}
                  keyboardType="numeric"
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}20`,
                    color: COLORS.text.white,
                  }}
                />
              </View>
              <View className="flex-1">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                  Prix de vente (€) *
                </Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.text.muted}
                  keyboardType="decimal-pad"
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}20`,
                    color: COLORS.text.white,
                  }}
                />
              </View>
            </View>

            {/* Cost Price & TVA Row */}
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                  Prix d'achat (€)
                </Text>
                <TextInput
                  value={costPrice}
                  onChangeText={setCostPrice}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.text.muted}
                  keyboardType="decimal-pad"
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}20`,
                    color: COLORS.text.white,
                  }}
                />
              </View>
              <View className="flex-1">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                  TVA (%)
                </Text>
                <TextInput
                  value={tvaRate}
                  onChangeText={setTvaRate}
                  placeholder="20"
                  placeholderTextColor={COLORS.text.muted}
                  keyboardType="decimal-pad"
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}20`,
                    color: COLORS.text.white,
                  }}
                />
              </View>
            </View>

            {/* Unit Picker */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Unité de mesure
            </Text>
            <Pressable
              onPress={() => setShowUnitPicker(!showUnitPicker)}
              className="rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
              }}
            >
              <Text style={{ color: COLORS.text.white }}>
                {units.find((u) => u.id === unit)?.label || unit}
              </Text>
              <ChevronDown size={20} color={COLORS.text.muted} />
            </Pressable>
            {showUnitPicker && (
              <View
                className="rounded-xl mb-4 overflow-hidden"
                style={{
                  backgroundColor: `${COLORS.text.white}08`,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.paleGold}15`,
                }}
              >
                {units.map((u) => (
                  <Pressable
                    key={u.id}
                    onPress={() => {
                      setUnit(u.id);
                      setShowUnitPicker(false);
                    }}
                    className="px-4 py-3"
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: `${COLORS.text.white}08`,
                      backgroundColor: unit === u.id ? `${COLORS.primary.gold}15` : 'transparent',
                    }}
                  >
                    <Text style={{ color: COLORS.text.white }}>{u.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Min Stock Alert */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Seuil d'alerte stock bas
            </Text>
            <TextInput
              value={minStock}
              onChangeText={setMinStock}
              placeholder="5"
              placeholderTextColor={COLORS.text.muted}
              keyboardType="numeric"
              className="rounded-xl px-4 py-3 mb-6"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
              }}
            />

            {/* Save Button */}
            <Pressable
              onPress={handleSave}
              disabled={!canSave}
              className="rounded-xl py-4 items-center active:opacity-80 mb-6"
              style={{
                backgroundColor: canSave ? COLORS.primary.gold : `${COLORS.text.white}10`,
              }}
            >
              <Text style={{ color: canSave ? COLORS.text.white : COLORS.text.muted }} className="font-bold">
                {editingItem ? 'Enregistrer les modifications' : 'Ajouter au stock'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

// Add Order Modal Component
interface AddOrderModalProps {
  visible: boolean;
  onClose: () => void;
}

const AddOrderModal = ({ visible, onClose }: AddOrderModalProps) => {
  const insets = useSafeAreaInsets();
  const addOrder = useOrdersStore((s) => s.addOrder);
  const customProducers = useProducerStore((s) => s.producers);

  // Merge producers
  const allProducers = React.useMemo(() => {
    const customIds = new Set(customProducers.map((p) => p.id));
    const sampleOnly = SAMPLE_PRODUCERS.filter((p) => !customIds.has(p.id));
    return [...sampleOnly, ...customProducers];
  }, [customProducers]);

  // Customer info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Order items
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showProductPicker, setShowProductPicker] = useState(false);

  // Reset form when modal opens
  React.useEffect(() => {
    if (visible) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setCity('');
      setPostalCode('');
      setOrderItems([]);
    }
  }, [visible]);

  const addProductToOrder = (product: ProducerProduct, producer: { id: string; name: string }) => {
    const existingItem = orderItems.find((i) => i.productId === product.id);
    if (existingItem) {
      setOrderItems(orderItems.map((i) =>
        i.productId === product.id
          ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice }
          : i
      ));
    } else {
      setOrderItems([...orderItems, {
        productId: product.id,
        productName: product.name,
        productType: product.type,
        producerId: producer.id,
        producerName: producer.name,
        quantity: 1,
        unitPrice: product.price,
        totalPrice: product.price,
        tvaRate: product.tvaRate ?? 20,
      }]);
    }
    setShowProductPicker(false);
  };

  const removeProductFromOrder = (productId: string) => {
    setOrderItems(orderItems.filter((i) => i.productId !== productId));
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty < 1) {
      removeProductFromOrder(productId);
      return;
    }
    setOrderItems(orderItems.map((i) =>
      i.productId === productId
        ? { ...i, quantity: newQty, totalPrice: newQty * i.unitPrice }
        : i
    ));
  };

  const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const shippingFee = subtotal >= 50 ? 0 : 4.90;
  const total = subtotal + shippingFee;
  // TVA calculée par produit selon son taux
  const tvaAmount = orderItems.reduce((sum, item) => {
    const tvaRate = item.tvaRate ?? 20;
    const tva = item.totalPrice - (item.totalPrice / (1 + tvaRate / 100));
    return sum + tva;
  }, 0);

  const canSave = firstName.trim() && lastName.trim() && email.trim() && orderItems.length > 0;

  const handleSave = () => {
    if (!canSave) return;

    // Calculate tickets earned (1 per 20€)
    const ticketsEarned = Math.floor(total / 20);

    addOrder({
      customerInfo: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        postalCode: postalCode.trim(),
      },
      items: orderItems,
      subtotal,
      shippingFee,
      total,
      // Payment validation - tickets NOT distributed until admin validates payment
      paymentValidated: false,
      ticketsDistributed: false,
      ticketsEarned: ticketsEarned,
    });

    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.background.dark, paddingTop: insets.top }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5 py-4"
          style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
        >
          <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
            Nouvelle commande
          </Text>
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color={COLORS.text.white} />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className="py-4">
            {/* Customer Info Section */}
            <Text style={{ color: COLORS.primary.paleGold }} className="font-bold mb-3">
              Informations client
            </Text>

            <View className="flex-row gap-2 mb-3">
              <View className="flex-1">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm mb-1">Prénom *</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Prénom"
                  placeholderTextColor={COLORS.text.muted}
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}20`,
                    color: COLORS.text.white,
                  }}
                />
              </View>
              <View className="flex-1">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm mb-1">Nom *</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Nom"
                  placeholderTextColor={COLORS.text.muted}
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}20`,
                    color: COLORS.text.white,
                  }}
                />
              </View>
            </View>

            <Text style={{ color: COLORS.text.lightGray }} className="text-sm mb-1">Email *</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="email@exemple.com"
              placeholderTextColor={COLORS.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              className="rounded-xl px-4 py-3 mb-3"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
              }}
            />

            <Text style={{ color: COLORS.text.lightGray }} className="text-sm mb-1">Téléphone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="06 12 34 56 78"
              placeholderTextColor={COLORS.text.muted}
              keyboardType="phone-pad"
              className="rounded-xl px-4 py-3 mb-3"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
              }}
            />

            <Text style={{ color: COLORS.text.lightGray }} className="text-sm mb-1">Adresse</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="123 rue de la Paix"
              placeholderTextColor={COLORS.text.muted}
              className="rounded-xl px-4 py-3 mb-3"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
              }}
            />

            <View className="flex-row gap-2 mb-4">
              <View className="flex-1">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm mb-1">Code postal</Text>
                <TextInput
                  value={postalCode}
                  onChangeText={setPostalCode}
                  placeholder="75001"
                  placeholderTextColor={COLORS.text.muted}
                  keyboardType="numeric"
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}20`,
                    color: COLORS.text.white,
                  }}
                />
              </View>
              <View className="flex-1">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm mb-1">Ville</Text>
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder="Paris"
                  placeholderTextColor={COLORS.text.muted}
                  className="rounded-xl px-4 py-3"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}20`,
                    color: COLORS.text.white,
                  }}
                />
              </View>
            </View>

            {/* Order Items Section */}
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ color: COLORS.primary.paleGold }} className="font-bold">
                Articles *
              </Text>
              <Pressable
                onPress={() => setShowProductPicker(true)}
                className="flex-row items-center px-3 py-1.5 rounded-lg"
                style={{ backgroundColor: COLORS.primary.gold }}
              >
                <Plus size={16} color={COLORS.text.white} />
                <Text style={{ color: COLORS.text.white }} className="text-sm font-medium ml-1">
                  Ajouter
                </Text>
              </Pressable>
            </View>

            {orderItems.length === 0 ? (
              <View
                className="rounded-xl p-4 items-center mb-4"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.text.white}10`,
                }}
              >
                <Package size={32} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-sm mt-2">
                  Aucun produit ajouté
                </Text>
              </View>
            ) : (
              <View className="mb-4">
                {orderItems.map((item) => (
                  <View
                    key={item.productId}
                    className="flex-row items-center px-4 py-3 mb-2 rounded-xl"
                    style={{
                      backgroundColor: `${COLORS.text.white}05`,
                      borderWidth: 1,
                      borderColor: `${COLORS.primary.paleGold}10`,
                    }}
                  >
                    <View className="flex-1">
                      <Text style={{ color: COLORS.text.white }} className="font-medium">
                        {item.productName}
                      </Text>
                      <Text style={{ color: COLORS.text.muted }} className="text-xs">
                        {item.producerName} - {item.unitPrice.toFixed(2)}€/u
                      </Text>
                    </View>
                    <View className="flex-row items-center">
                      <Pressable
                        onPress={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-8 h-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${COLORS.text.white}10` }}
                      >
                        <Text style={{ color: COLORS.text.white }} className="font-bold">-</Text>
                      </Pressable>
                      <Text style={{ color: COLORS.text.white }} className="mx-3 font-medium">
                        {item.quantity}
                      </Text>
                      <Pressable
                        onPress={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-8 h-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: `${COLORS.text.white}10` }}
                      >
                        <Text style={{ color: COLORS.text.white }} className="font-bold">+</Text>
                      </Pressable>
                      <Text style={{ color: COLORS.primary.brightYellow }} className="ml-3 font-bold min-w-[60px] text-right">
                        {item.totalPrice.toFixed(2)}€
                      </Text>
                    </View>
                  </View>
                ))}

                {/* Order Summary */}
                <View
                  className="rounded-xl p-4 mt-2"
                  style={{
                    backgroundColor: `${COLORS.primary.gold}15`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.gold}30`,
                  }}
                >
                  <View className="flex-row justify-between mb-1">
                    <Text style={{ color: COLORS.text.lightGray }}>Sous-total TTC</Text>
                    <Text style={{ color: COLORS.text.white }}>{subtotal.toFixed(2)}€</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text style={{ color: COLORS.text.lightGray }}>Frais de port</Text>
                    <Text style={{ color: shippingFee === 0 ? COLORS.accent.hemp : COLORS.text.white }}>
                      {shippingFee === 0 ? 'OFFERTS' : `${shippingFee.toFixed(2)}€`}
                    </Text>
                  </View>
                  {/* TVA due à l'État */}
                  <View
                    className="flex-row justify-between py-2 px-3 rounded-lg mb-2"
                    style={{ backgroundColor: 'rgba(199, 91, 91, 0.15)', borderWidth: 1, borderColor: 'rgba(199, 91, 91, 0.4)' }}
                  >
                    <Text style={{ color: '#C75B5B' }} className="text-sm font-semibold">TVA due à l'État</Text>
                    <Text style={{ color: '#C75B5B' }} className="font-bold">{tvaAmount.toFixed(2)}€</Text>
                  </View>
                  <View className="flex-row justify-between pt-2" style={{ borderTopWidth: 1, borderTopColor: `${COLORS.primary.gold}30` }}>
                    <Text style={{ color: COLORS.text.white }} className="font-bold">Total TTC</Text>
                    <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold text-lg">
                      {total.toFixed(2)}€
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View
          className="px-5 py-4"
          style={{
            borderTopWidth: 1,
            borderTopColor: `${COLORS.primary.paleGold}15`,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <Pressable
            onPress={handleSave}
            disabled={!canSave}
            className="rounded-xl py-4 flex-row items-center justify-center"
            style={{
              backgroundColor: canSave ? COLORS.primary.gold : `${COLORS.primary.gold}30`,
            }}
          >
            <Check size={20} color={COLORS.text.white} />
            <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
              Créer la commande
            </Text>
          </Pressable>
        </View>

        {/* Product Picker Modal */}
        <Modal visible={showProductPicker} animationType="slide" transparent onRequestClose={() => setShowProductPicker(false)}>
          <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
            <Pressable className="flex-1" onPress={() => setShowProductPicker(false)} />
            <View
              className="rounded-t-3xl"
              style={{ backgroundColor: COLORS.background.dark, maxHeight: '80%', paddingBottom: insets.bottom + 20 }}
            >
              <View
                className="flex-row items-center justify-between px-5 py-4"
                style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
              >
                <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
                  Sélectionner un produit
                </Text>
                <Pressable onPress={() => setShowProductPicker(false)} className="p-2">
                  <X size={24} color={COLORS.text.white} />
                </Pressable>
              </View>
              <ScrollView className="px-5 py-4">
                {allProducers.map((producer) => (
                  <View key={producer.id} className="mb-4">
                    <Text style={{ color: COLORS.primary.paleGold }} className="font-semibold mb-2">
                      {producer.name}
                    </Text>
                    {producer.products.length === 0 ? (
                      <Text style={{ color: COLORS.text.muted }} className="text-sm">
                        Aucun produit
                      </Text>
                    ) : (
                      producer.products.map((product) => (
                        <Pressable
                          key={product.id}
                          onPress={() => addProductToOrder(product, { id: producer.id, name: producer.name })}
                          className="flex-row items-center px-4 py-3 mb-2 rounded-xl active:opacity-70"
                          style={{
                            backgroundColor: `${COLORS.text.white}05`,
                            borderWidth: 1,
                            borderColor: `${COLORS.primary.paleGold}10`,
                          }}
                        >
                          <View className="flex-1">
                            <Text style={{ color: COLORS.text.white }} className="font-medium">
                              {product.name}
                            </Text>
                            <Text style={{ color: COLORS.text.muted }} className="text-xs">
                              {product.type} - {product.price}€
                            </Text>
                          </View>
                          <Plus size={18} color={COLORS.primary.gold} />
                        </Pressable>
                      ))
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

// Add Lot Modal Component
interface AddLotModalProps {
  visible: boolean;
  onClose: () => void;
  editingLot?: Lot | null;
}

const AddLotModal = ({ visible, onClose, editingLot }: AddLotModalProps) => {
  const insets = useSafeAreaInsets();
  const addLot = useLotsStore((s) => s.addLot);
  const updateLot = useLotsStore((s) => s.updateLot);
  const customProducers = useProducerStore((s) => s.producers);

  // Merge producers: custom producers override sample ones (by id)
  const allProducers = React.useMemo(() => {
    const customIds = new Set(customProducers.map((p) => p.id));
    const sampleOnly = SAMPLE_PRODUCERS.filter((p) => !customIds.has(p.id));
    return [...sampleOnly, ...customProducers];
  }, [customProducers]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rarity, setRarity] = useState<Rarity>('common');
  const [image, setImage] = useState('');
  const [items, setItems] = useState<LotItem[]>([]);
  const [showRarityPicker, setShowRarityPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [lotType, setLotType] = useState<'product' | 'discount'>('product');
  const [discountPercent, setDiscountPercent] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  React.useEffect(() => {
    if (visible && editingLot) {
      setName(editingLot.name);
      setDescription(editingLot.description);
      setRarity(editingLot.rarity);
      setImage(editingLot.image || '');
      setItems(editingLot.items);
      setLotType(editingLot.lotType || 'product');
      setDiscountPercent(editingLot.discountPercent?.toString() || '');
    } else if (visible) {
      setName('');
      setDescription('');
      setRarity('common');
      setImage('');
      setItems([]);
      setLotType('product');
      setDiscountPercent('');
    }
  }, [visible, editingLot]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsUploading(true);
    try {
      // Upload image to Supabase Storage if it's a local file
      const uploadedImage = await processImageForSync(image.trim() || undefined, 'general');

      const lotData: Lot = {
        id: editingLot?.id || `lot-${Date.now()}`,
        name: name.trim(),
        description: description.trim(),
        rarity,
        image: uploadedImage,
        items: lotType === 'product' ? items : [],
        value: 0,
        active: editingLot?.active ?? true,
        lotType,
        discountPercent: lotType === 'discount' ? parseFloat(discountPercent) || 0 : undefined,
      };

      if (editingLot) {
        updateLot(editingLot.id, lotData);
      } else {
        addLot(lotData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving lot:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const addProductToLot = (product: ProducerProduct, producer: { id: string; name: string }) => {
    const existingItem = items.find((i) => i.productId === product.id);
    if (existingItem) {
      setItems(items.map((i) =>
        i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setItems([...items, {
        productId: product.id,
        producerId: producer.id,
        productName: product.name,
        producerName: producer.name,
        quantity: 1,
      }]);
    }
    setShowProductPicker(false);
  };

  const removeProductFromLot = (productId: string) => {
    setItems(items.filter((i) => i.productId !== productId));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.background.dark, paddingTop: insets.top }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5 py-4"
          style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
        >
          <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
            {editingLot ? 'Modifier le lot' : 'Nouveau lot'}
          </Text>
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color={COLORS.text.white} />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className="py-4">
            {/* Name */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Nom du lot *
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ex: Pack Découverte CBD"
              placeholderTextColor={COLORS.text.muted}
              className="rounded-xl px-4 py-3 mb-4"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
              }}
            />

            {/* Description */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description du lot..."
              placeholderTextColor={COLORS.text.muted}
              multiline
              className="rounded-xl px-4 py-3 mb-4 min-h-[80px]"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
                textAlignVertical: 'top',
              }}
            />

            {/* Lot Type Selector */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Type de lot *
            </Text>
            <View className="flex-row gap-3 mb-4">
              <Pressable
                onPress={() => setLotType('product')}
                className="flex-1 rounded-xl py-3 flex-row items-center justify-center"
                style={{
                  backgroundColor: lotType === 'product' ? `${COLORS.primary.brightYellow}20` : `${COLORS.text.white}05`,
                  borderWidth: 2,
                  borderColor: lotType === 'product' ? COLORS.primary.brightYellow : `${COLORS.primary.paleGold}20`,
                }}
              >
                <Package size={18} color={lotType === 'product' ? COLORS.primary.brightYellow : COLORS.text.muted} />
                <Text
                  style={{ color: lotType === 'product' ? COLORS.primary.brightYellow : COLORS.text.muted }}
                  className="font-semibold ml-2"
                >
                  Lot physique
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setLotType('discount')}
                className="flex-1 rounded-xl py-3 flex-row items-center justify-center"
                style={{
                  backgroundColor: lotType === 'discount' ? `${COLORS.accent.hemp}20` : `${COLORS.text.white}05`,
                  borderWidth: 2,
                  borderColor: lotType === 'discount' ? COLORS.accent.hemp : `${COLORS.primary.paleGold}20`,
                }}
              >
                <Percent size={18} color={lotType === 'discount' ? COLORS.accent.hemp : COLORS.text.muted} />
                <Text
                  style={{ color: lotType === 'discount' ? COLORS.accent.hemp : COLORS.text.muted }}
                  className="font-semibold ml-2"
                >
                  Réduction
                </Text>
              </Pressable>
            </View>

            {/* Discount Percent - only for discount type */}
            {lotType === 'discount' && (
              <>
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                  Pourcentage de réduction *
                </Text>
                <View className="flex-row items-center mb-4">
                  <TextInput
                    value={discountPercent}
                    onChangeText={setDiscountPercent}
                    placeholder="10"
                    placeholderTextColor={COLORS.text.muted}
                    keyboardType="numeric"
                    className="flex-1 rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: `${COLORS.text.white}05`,
                      borderWidth: 1,
                      borderColor: `${COLORS.primary.paleGold}20`,
                      color: COLORS.text.white,
                    }}
                  />
                  <View
                    className="ml-2 px-4 py-3 rounded-xl"
                    style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
                  >
                    <Text style={{ color: COLORS.accent.hemp }} className="font-bold text-lg">%</Text>
                  </View>
                </View>
                <View
                  className="rounded-xl p-3 mb-4 flex-row items-center"
                  style={{ backgroundColor: `${COLORS.accent.hemp}10` }}
                >
                  <Percent size={16} color={COLORS.accent.hemp} />
                  <Text style={{ color: COLORS.accent.hemp }} className="text-xs ml-2 flex-1">
                    Ce lot appliquera une réduction de {discountPercent || '0'}% sur le montant total de la commande.
                  </Text>
                </View>
              </>
            )}

            {/* Product type info */}
            {lotType === 'product' && (
              <View
                className="rounded-xl p-3 mb-4 flex-row items-center"
                style={{ backgroundColor: `${COLORS.primary.brightYellow}10` }}
              >
                <Gift size={16} color={COLORS.primary.brightYellow} />
                <Text style={{ color: COLORS.primary.paleGold }} className="text-xs ml-2 flex-1">
                  Ce lot sera ajouté gratuitement à la commande avec la mention "OFFERT".
                </Text>
              </View>
            )}

            {/* Rarity Picker */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Rareté *
            </Text>
            <Pressable
              onPress={() => setShowRarityPicker(!showRarityPicker)}
              className="rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="w-4 h-4 rounded-full mr-3"
                  style={{ backgroundColor: RARITY_CONFIG[rarity].color }}
                />
                <Text style={{ color: COLORS.text.white }}>{RARITY_CONFIG[rarity].label}</Text>
                <Text style={{ color: COLORS.text.muted }} className="text-xs ml-2">
                  ({RARITY_CONFIG[rarity].odds})
                </Text>
              </View>
              <ChevronDown size={20} color={COLORS.text.muted} />
            </Pressable>
            {showRarityPicker && (
              <View
                className="rounded-xl mb-4"
                style={{
                  backgroundColor: COLORS.background.charcoal,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.paleGold}20`,
                }}
              >
                {(['common', 'rare', 'epic', 'platinum', 'legendary'] as Rarity[]).map((r) => (
                  <Pressable
                    key={r}
                    onPress={() => {
                      setRarity(r);
                      setShowRarityPicker(false);
                    }}
                    className="px-4 py-3 flex-row items-center"
                    style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.text.white}05` }}
                  >
                    <View
                      className="w-4 h-4 rounded-full mr-3"
                      style={{ backgroundColor: RARITY_CONFIG[r].color }}
                    />
                    <Text style={{ color: COLORS.text.white }}>{RARITY_CONFIG[r].label}</Text>
                    <Text style={{ color: COLORS.text.muted }} className="text-xs ml-2">
                      ({RARITY_CONFIG[r].odds})
                    </Text>
                    {rarity === r && <Check size={16} color={COLORS.primary.gold} style={{ marginLeft: 'auto' }} />}
                  </Pressable>
                ))}
              </View>
            )}

            {/* Image */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Photo du lot
            </Text>
            {image ? (
              <View className="mb-3">
                <Image
                  source={{ uri: image }}
                  className="w-full h-40 rounded-xl"
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => setImage('')}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                  <X size={16} color="white" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickImage}
                className="rounded-xl p-6 items-center mb-3"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 2,
                  borderColor: `${COLORS.primary.paleGold}20`,
                  borderStyle: 'dashed',
                }}
              >
                <ImageIcon size={40} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="mt-2 text-sm">
                  Appuyez pour choisir une photo
                </Text>
              </Pressable>
            )}
            {image ? (
              <Pressable
                onPress={pickImage}
                className="rounded-xl py-3 flex-row items-center justify-center mb-4"
                style={{
                  backgroundColor: `${COLORS.primary.gold}20`,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.gold}50`,
                }}
              >
                <ImageIcon size={18} color={COLORS.primary.gold} />
                <Text style={{ color: COLORS.primary.gold }} className="font-medium ml-2">
                  Changer la photo
                </Text>
              </Pressable>
            ) : null}

            {/* Products - only for product type */}
            {lotType === 'product' && (
              <>
                <View className="flex-row items-center justify-between mb-2">
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium">
                    Produits dans le lot
                  </Text>
                  <Pressable
                    onPress={() => setShowProductPicker(true)}
                    className="flex-row items-center px-3 py-1 rounded-lg"
                    style={{ backgroundColor: COLORS.primary.gold }}
                  >
                    <Plus size={16} color={COLORS.text.white} />
                    <Text style={{ color: COLORS.text.white }} className="text-sm font-medium ml-1">
                      Ajouter
                    </Text>
                  </Pressable>
                </View>

                {items.length === 0 ? (
                  <View
                    className="rounded-xl p-4 items-center mb-4"
                    style={{
                      backgroundColor: `${COLORS.text.white}05`,
                      borderWidth: 1,
                      borderColor: `${COLORS.text.white}10`,
                    }}
                  >
                    <Package size={32} color={COLORS.text.muted} />
                    <Text style={{ color: COLORS.text.muted }} className="text-sm mt-2">
                      Aucun produit ajouté
                    </Text>
                  </View>
                ) : (
                  <View className="mb-4">
                    {items.map((item) => (
                      <View
                        key={item.productId}
                        className="flex-row items-center justify-between px-4 py-3 mb-2 rounded-xl"
                        style={{
                          backgroundColor: `${COLORS.text.white}05`,
                          borderWidth: 1,
                          borderColor: `${COLORS.primary.paleGold}10`,
                        }}
                      >
                        <View className="flex-1">
                          <Text style={{ color: COLORS.text.white }} className="font-medium">
                            {item.productName}
                          </Text>
                          <Text style={{ color: COLORS.text.muted }} className="text-xs">
                            {item.producerName} × {item.quantity}
                          </Text>
                        </View>
                        <Pressable onPress={() => removeProductFromLot(item.productId)} className="p-2">
                          <Trash2 size={16} color="#EF4444" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View
          className="px-5 py-4"
          style={{
            borderTopWidth: 1,
            borderTopColor: `${COLORS.primary.paleGold}15`,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <Pressable
            onPress={handleSave}
            disabled={!name.trim()}
            className="rounded-xl py-4 flex-row items-center justify-center"
            style={{
              backgroundColor: name.trim() ? COLORS.primary.gold : `${COLORS.primary.gold}30`,
            }}
          >
            <Check size={20} color={COLORS.text.white} />
            <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
              {editingLot ? 'Enregistrer' : 'Créer le lot'}
            </Text>
          </Pressable>
        </View>

        {/* Product Picker Modal */}
        <Modal visible={showProductPicker} animationType="slide" transparent onRequestClose={() => setShowProductPicker(false)}>
          <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
            <Pressable className="flex-1" onPress={() => setShowProductPicker(false)} />
            <View
              className="rounded-t-3xl"
              style={{ backgroundColor: COLORS.background.dark, maxHeight: '80%', paddingBottom: insets.bottom + 20 }}
            >
              <View
                className="flex-row items-center justify-between px-5 py-4"
                style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
              >
                <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
                  Sélectionner un produit
                </Text>
                <Pressable onPress={() => setShowProductPicker(false)} className="p-2">
                  <X size={24} color={COLORS.text.white} />
                </Pressable>
              </View>
              <ScrollView className="px-5 py-4">
                {allProducers.map((producer) => (
                  <View key={producer.id} className="mb-4">
                    <Text style={{ color: COLORS.primary.paleGold }} className="font-semibold mb-2">
                      {producer.name}
                    </Text>
                    {producer.products.length === 0 ? (
                      <Text style={{ color: COLORS.text.muted }} className="text-sm">
                        Aucun produit
                      </Text>
                    ) : (
                      producer.products.map((product) => (
                        <Pressable
                          key={product.id}
                          onPress={() => addProductToLot(product, { id: producer.id, name: producer.name })}
                          className="flex-row items-center px-4 py-3 mb-2 rounded-xl active:opacity-70"
                          style={{
                            backgroundColor: `${COLORS.text.white}05`,
                            borderWidth: 1,
                            borderColor: `${COLORS.primary.paleGold}10`,
                          }}
                        >
                          <View className="flex-1">
                            <Text style={{ color: COLORS.text.white }} className="font-medium">
                              {product.name}
                            </Text>
                            <Text style={{ color: COLORS.text.muted }} className="text-xs">
                              {product.type} - {product.price}€
                            </Text>
                          </View>
                          <Plus size={18} color={COLORS.primary.gold} />
                        </Pressable>
                      ))
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

// Add Promo Modal
interface AddPromoModalProps {
  visible: boolean;
  onClose: () => void;
  editingPromo?: Promo | null;
}

const AddPromoModal = ({ visible, onClose, editingPromo }: AddPromoModalProps) => {
  const insets = useSafeAreaInsets();
  const addPromo = usePromosStore((s) => s.addPromo);
  const updatePromo = usePromosStore((s) => s.updatePromo);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [discount, setDiscount] = useState('');
  const [image, setImage] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  React.useEffect(() => {
    if (visible && editingPromo) {
      setTitle(editingPromo.title);
      setDescription(editingPromo.description);
      setCode(editingPromo.code);
      setDiscount(editingPromo.discount.toString());
      setImage(editingPromo.image || '');
      setValidUntil(editingPromo.validUntil);
      setMinOrder(editingPromo.minOrder.toString());
    } else if (visible) {
      setTitle('');
      setDescription('');
      setCode('');
      setDiscount('');
      setImage('');
      setValidUntil('');
      setMinOrder('');
    }
  }, [visible, editingPromo]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !code.trim()) return;

    setIsUploading(true);
    try {
      // Upload image to Supabase Storage if it's a local file
      const uploadedImage = await processImageForSync(image.trim() || undefined, 'promos');

      const promoData = {
        title: title.trim(),
        description: description.trim(),
        code: code.trim().toUpperCase(),
        discount: parseFloat(discount) || 0,
        image: uploadedImage,
        validUntil: validUntil.trim(),
        minOrder: parseFloat(minOrder) || 0,
        active: editingPromo?.active ?? true,
      };

      if (editingPromo) {
        updatePromo(editingPromo.id, promoData);
      } else {
        addPromo(promoData);
      }

      onClose();
    } catch (error) {
      console.error('Error saving promo:', error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.background.dark, paddingTop: insets.top }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5 py-4"
          style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
        >
          <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
            {editingPromo ? 'Modifier la promo' : 'Nouvelle promo'}
          </Text>
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color={COLORS.text.white} />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className="py-4">
            {/* Title */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Titre *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex: Offre de bienvenue"
              placeholderTextColor={COLORS.text.muted}
              className="rounded-xl px-4 py-3 mb-4"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
              }}
            />

            {/* Description */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Ex: -15% sur votre première commande"
              placeholderTextColor={COLORS.text.muted}
              multiline
              className="rounded-xl px-4 py-3 mb-4 min-h-[60px]"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
                textAlignVertical: 'top',
              }}
            />

            {/* Code */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Code promo *
            </Text>
            <TextInput
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              placeholder="Ex: BIENVENUE15"
              placeholderTextColor={COLORS.text.muted}
              autoCapitalize="characters"
              className="rounded-xl px-4 py-3 mb-4"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
              }}
            />

            {/* Discount */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Réduction (%)
            </Text>
            <View className="flex-row items-center mb-4">
              <TextInput
                value={discount}
                onChangeText={setDiscount}
                placeholder="15"
                placeholderTextColor={COLORS.text.muted}
                keyboardType="numeric"
                className="flex-1 rounded-xl px-4 py-3"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.paleGold}20`,
                  color: COLORS.text.white,
                }}
              />
              <View
                className="ml-2 px-4 py-3 rounded-xl"
                style={{ backgroundColor: `${COLORS.accent.red}20` }}
              >
                <Text style={{ color: COLORS.accent.red }} className="font-bold text-lg">%</Text>
              </View>
            </View>

            {/* Min Order */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Commande minimum (€)
            </Text>
            <TextInput
              value={minOrder}
              onChangeText={setMinOrder}
              placeholder="30"
              placeholderTextColor={COLORS.text.muted}
              keyboardType="numeric"
              className="rounded-xl px-4 py-3 mb-4"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
              }}
            />

            {/* Valid Until */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Valide jusqu'au
            </Text>
            <TextInput
              value={validUntil}
              onChangeText={setValidUntil}
              placeholder="31/12/2026"
              placeholderTextColor={COLORS.text.muted}
              className="rounded-xl px-4 py-3 mb-4"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
              }}
            />

            {/* Image */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Image
            </Text>
            {image ? (
              <View className="mb-3">
                <Image
                  source={{ uri: image }}
                  className="w-full h-32 rounded-xl"
                  resizeMode="cover"
                />
                <Pressable
                  onPress={() => setImage('')}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
                >
                  <X size={16} color="white" />
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={pickImage}
                className="rounded-xl p-6 items-center mb-3"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 2,
                  borderColor: `${COLORS.primary.paleGold}20`,
                  borderStyle: 'dashed',
                }}
              >
                <ImageIcon size={40} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="mt-2 text-sm">
                  Appuyez pour choisir une photo
                </Text>
              </Pressable>
            )}
            {image ? (
              <Pressable
                onPress={pickImage}
                className="rounded-xl py-3 flex-row items-center justify-center mb-4"
                style={{
                  backgroundColor: `${COLORS.primary.gold}20`,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.gold}50`,
                }}
              >
                <ImageIcon size={18} color={COLORS.primary.gold} />
                <Text style={{ color: COLORS.primary.gold }} className="font-medium ml-2">
                  Changer la photo
                </Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>

        {/* Save Button */}
        <View
          className="px-5 py-4"
          style={{
            borderTopWidth: 1,
            borderTopColor: `${COLORS.primary.paleGold}15`,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <Pressable
            onPress={handleSave}
            disabled={!title.trim() || !code.trim()}
            className="rounded-xl py-4 items-center"
            style={{
              backgroundColor: title.trim() && code.trim() ? COLORS.accent.red : COLORS.text.muted,
            }}
          >
            <Text style={{ color: COLORS.text.white }} className="font-bold text-base">
              {editingPromo ? 'Enregistrer les modifications' : 'Créer la promo'}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// Add Promo Product Modal
interface AddPromoProductModalProps {
  visible: boolean;
  onClose: () => void;
  producers: Producer[];
}

const AddPromoProductModal = ({ visible, onClose, producers }: AddPromoProductModalProps) => {
  const insets = useSafeAreaInsets();
  const addPromoProduct = usePromoProductsStore((s) => s.addPromoProduct);

  const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProducerProduct | null>(null);
  const [discountPercent, setDiscountPercent] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [showProducerPicker, setShowProducerPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setSelectedProducer(null);
      setSelectedProduct(null);
      setDiscountPercent('');
      setValidUntil('');
    }
  }, [visible]);

  const handleSave = () => {
    if (!selectedProducer || !selectedProduct || !discountPercent) return;

    const discount = parseFloat(discountPercent) || 0;
    const originalPrice = selectedProduct.price;
    const promoPrice = originalPrice * (1 - discount / 100);

    addPromoProduct({
      productId: selectedProduct.id,
      producerId: selectedProducer.id,
      productName: selectedProduct.name,
      producerName: selectedProducer.name,
      originalPrice,
      promoPrice,
      discountPercent: discount,
      image: selectedProduct.image || '',
      validUntil: validUntil.trim(),
      active: true,
    });

    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: COLORS.background.dark, paddingTop: insets.top }}>
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-5 py-4"
          style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
        >
          <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
            Produit en promo
          </Text>
          <Pressable onPress={onClose} className="p-2">
            <X size={24} color={COLORS.text.white} />
          </Pressable>
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          <View className="py-4">
            {/* Producer Picker */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Producteur *
            </Text>
            <Pressable
              onPress={() => setShowProducerPicker(!showProducerPicker)}
              className="rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
              }}
            >
              <Text style={{ color: selectedProducer ? COLORS.text.white : COLORS.text.muted }}>
                {selectedProducer?.name || 'Sélectionner un producteur'}
              </Text>
              <ChevronDown size={20} color={COLORS.text.muted} />
            </Pressable>
            {showProducerPicker && (
              <View
                className="rounded-xl mb-4 max-h-48"
                style={{
                  backgroundColor: COLORS.background.charcoal,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.paleGold}20`,
                }}
              >
                <ScrollView nestedScrollEnabled>
                  {producers.map((producer) => (
                    <Pressable
                      key={producer.id}
                      onPress={() => {
                        setSelectedProducer(producer);
                        setSelectedProduct(null);
                        setShowProducerPicker(false);
                      }}
                      className="px-4 py-3 flex-row items-center"
                      style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.text.white}05` }}
                    >
                      <Text style={{ color: COLORS.text.white }}>{producer.name}</Text>
                      {selectedProducer?.id === producer.id && (
                        <Check size={16} color={COLORS.primary.gold} style={{ marginLeft: 'auto' }} />
                      )}
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Product Picker */}
            {selectedProducer && (
              <>
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                  Produit *
                </Text>
                <Pressable
                  onPress={() => setShowProductPicker(!showProductPicker)}
                  className="rounded-xl px-4 py-3 mb-2 flex-row items-center justify-between"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}20`,
                  }}
                >
                  <Text style={{ color: selectedProduct ? COLORS.text.white : COLORS.text.muted }}>
                    {selectedProduct?.name || 'Sélectionner un produit'}
                  </Text>
                  <ChevronDown size={20} color={COLORS.text.muted} />
                </Pressable>
                {showProductPicker && (
                  <View
                    className="rounded-xl mb-4 max-h-48"
                    style={{
                      backgroundColor: COLORS.background.charcoal,
                      borderWidth: 1,
                      borderColor: `${COLORS.primary.paleGold}20`,
                    }}
                  >
                    <ScrollView nestedScrollEnabled>
                      {selectedProducer.products.map((product) => (
                        <Pressable
                          key={product.id}
                          onPress={() => {
                            setSelectedProduct(product);
                            setShowProductPicker(false);
                          }}
                          className="px-4 py-3 flex-row items-center justify-between"
                          style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.text.white}05` }}
                        >
                          <View>
                            <Text style={{ color: COLORS.text.white }}>{product.name}</Text>
                            <Text style={{ color: COLORS.text.muted }} className="text-xs">
                              {product.price.toFixed(2)}€ ({product.weight})
                            </Text>
                          </View>
                          {selectedProduct?.id === product.id && (
                            <Check size={16} color={COLORS.primary.gold} />
                          )}
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </>
            )}

            {/* Discount */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Réduction (%) *
            </Text>
            <View className="flex-row items-center mb-4">
              <TextInput
                value={discountPercent}
                onChangeText={setDiscountPercent}
                placeholder="20"
                placeholderTextColor={COLORS.text.muted}
                keyboardType="numeric"
                className="flex-1 rounded-xl px-4 py-3"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.paleGold}20`,
                  color: COLORS.text.white,
                }}
              />
              <View
                className="ml-2 px-4 py-3 rounded-xl"
                style={{ backgroundColor: `${COLORS.primary.orange}20` }}
              >
                <Text style={{ color: COLORS.primary.orange }} className="font-bold text-lg">%</Text>
              </View>
            </View>

            {/* Preview */}
            {selectedProduct && discountPercent && (
              <View
                className="rounded-xl p-4 mb-4"
                style={{ backgroundColor: `${COLORS.primary.orange}10`, borderWidth: 1, borderColor: `${COLORS.primary.orange}30` }}
              >
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm mb-2">Aperçu:</Text>
                <View className="flex-row items-center">
                  <Text style={{ color: COLORS.text.muted, textDecorationLine: 'line-through' }} className="mr-2">
                    {selectedProduct.price.toFixed(2)}€
                  </Text>
                  <Text style={{ color: COLORS.primary.orange }} className="font-bold text-xl">
                    {(selectedProduct.price * (1 - (parseFloat(discountPercent) || 0) / 100)).toFixed(2)}€
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="ml-2 text-sm">({selectedProduct.weight})</Text>
                </View>
              </View>
            )}

            {/* Valid Until */}
            <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
              Valide jusqu'au
            </Text>
            <TextInput
              value={validUntil}
              onChangeText={setValidUntil}
              placeholder="31/12/2026"
              placeholderTextColor={COLORS.text.muted}
              className="rounded-xl px-4 py-3 mb-4"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
                color: COLORS.text.white,
              }}
            />
          </View>
        </ScrollView>

        {/* Save Button */}
        <View
          className="px-5 py-4"
          style={{
            borderTopWidth: 1,
            borderTopColor: `${COLORS.primary.paleGold}15`,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <Pressable
            onPress={handleSave}
            disabled={!selectedProducer || !selectedProduct || !discountPercent}
            className="rounded-xl py-4 items-center"
            style={{
              backgroundColor: selectedProducer && selectedProduct && discountPercent ? COLORS.primary.orange : COLORS.text.muted,
            }}
          >
            <Text style={{ color: COLORS.text.white }} className="font-bold text-base">
              Ajouter le produit en promo
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// Swipeable Order Card Component
interface SwipeableOrderCardProps {
  order: Order;
  onPress: () => void;
  onDelete: () => void;
}

const SwipeableOrderCard = ({ order, onPress, onDelete }: SwipeableOrderCardProps) => {
  const translateX = useSharedValue(0);
  const showConfirm = useSharedValue(false);
  const DELETE_THRESHOLD = -80;
  const CONFIRM_THRESHOLD = -140;

  const statusConfig = ORDER_STATUS_CONFIG[order.status];
  const orderDate = new Date(order.createdAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const ORDER_STATUS_ICONS: Record<OrderStatus, React.ReactNode> = {
    pending: <Clock size={16} color={ORDER_STATUS_CONFIG.pending.color} />,
    payment_sent: <Mail size={16} color={ORDER_STATUS_CONFIG.payment_sent.color} />,
    paid: <CreditCard size={16} color={ORDER_STATUS_CONFIG.paid.color} />,
    shipped: <Truck size={16} color={ORDER_STATUS_CONFIG.shipped.color} />,
    cancelled: <XCircle size={16} color={ORDER_STATUS_CONFIG.cancelled.color} />,
  };

  const handleDelete = () => {
    onDelete();
    translateX.value = withSpring(0);
    showConfirm.value = false;
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Only allow left swipe
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, CONFIRM_THRESHOLD);
      }
    })
    .onEnd((event) => {
      if (translateX.value < CONFIRM_THRESHOLD + 20) {
        // Second swipe or past confirm threshold - delete
        if (showConfirm.value) {
          runOnJS(handleDelete)();
        } else {
          showConfirm.value = true;
          translateX.value = withSpring(DELETE_THRESHOLD);
        }
      } else if (translateX.value < DELETE_THRESHOLD / 2) {
        // First swipe - show confirm
        showConfirm.value = true;
        translateX.value = withSpring(DELETE_THRESHOLD);
      } else {
        // Reset
        showConfirm.value = false;
        translateX.value = withSpring(0);
      }
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (showConfirm.value) {
        // Reset on tap when showing confirm
        showConfirm.value = false;
        translateX.value = withSpring(0);
      } else {
        runOnJS(onPress)();
      }
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedDeleteStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(translateX.value) / 60),
  }));

  return (
    <View className="mb-3 relative overflow-hidden rounded-xl">
      {/* Delete background */}
      <Animated.View
        style={[
          animatedDeleteStyle,
          {
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            width: 140,
            backgroundColor: '#EF4444',
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
            paddingRight: 16,
          },
        ]}
      >
        <Pressable
          onPress={handleDelete}
          className="flex-row items-center"
        >
          <Trash2 size={20} color="white" />
          <Text className="text-white font-bold ml-2">
            {showConfirm.value ? 'OUI' : 'Supprimer'}
          </Text>
        </Pressable>
      </Animated.View>

      {/* Card content */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View
          style={[
            animatedCardStyle,
            {
              backgroundColor: `${COLORS.text.white}08`,
              borderWidth: 1,
              borderColor: `${statusConfig.color}30`,
              borderRadius: 12,
            },
          ]}
        >
          <View className="p-4">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                {ORDER_STATUS_ICONS[order.status]}
                <Text style={{ color: statusConfig.color }} className="font-medium text-sm ml-2">
                  {statusConfig.label}
                </Text>
              </View>
              <Text style={{ color: COLORS.text.muted }} className="text-xs">
                {orderDate}
              </Text>
            </View>

            {/* Customer */}
            <Text style={{ color: COLORS.text.white }} className="font-bold text-base">
              {order.customerInfo.firstName} {order.customerInfo.lastName}
            </Text>
            <Text style={{ color: COLORS.text.muted }} className="text-sm">
              {order.items.length} article{order.items.length > 1 ? 's' : ''}
            </Text>

            {/* Total */}
            <View className="flex-row items-center justify-between mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: `${COLORS.text.white}10` }}>
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm">
                Total
              </Text>
              <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold text-lg">
                {order.total.toFixed(2)}€
              </Text>
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

// Main Admin Screen
export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const { isAdmin, isProducer } = usePermissions();
  const [activeTab, setActiveTab] = useState<TabType>(isProducer && !isAdmin ? 'producer-orders' : 'orders');
  const [tabsSaveStatus, setTabsSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [addProducerVisible, setAddProducerVisible] = useState(false);
  const [editingProducer, setEditingProducer] = useState<Producer | null>(null);
  const [addLotVisible, setAddLotVisible] = useState(false);
  const [editingLot, setEditingLot] = useState<Lot | null>(null);
  const [addProductVisible, setAddProductVisible] = useState(false);
  const [selectedProducerForProduct, setSelectedProducerForProduct] = useState<Producer | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [addOrderVisible, setAddOrderVisible] = useState(false);
  const [addPromoVisible, setAddPromoVisible] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promo | null>(null);
  const [addPromoProductVisible, setAddPromoProductVisible] = useState(false);
  const [editModal, setEditModal] = useState<{
    visible: boolean;
    title: string;
    value: string;
    color?: string;
    onSave: (value: string) => void;
    onColorChange?: (color: string) => void;
  }>({ visible: false, title: '', value: '', onSave: () => {} });

  // Supabase data states
  const [supabaseData, setSupabaseData] = useState<AppDataItem[]>([]);
  const [supabaseLoading, setSupabaseLoading] = useState(false);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [supabaseFormVisible, setSupabaseFormVisible] = useState(false);
  const [supabaseEditingItem, setSupabaseEditingItem] = useState<AppDataItem | null>(null);
  const [supabaseFormNom, setSupabaseFormNom] = useState('');
  const [supabaseFormDescription, setSupabaseFormDescription] = useState('');
  const [supabaseFormValeur, setSupabaseFormValeur] = useState('');

  // Users management states
  const [usersData, setUsersData] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersRoleFilter, setUsersRoleFilter] = useState<UserRole | ''>('');
  const [usersCategoryFilter, setUsersCategoryFilter] = useState<UserCategory | ''>('');
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [usersLastUpdate, setUsersLastUpdate] = useState<Date | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userEditModalVisible, setUserEditModalVisible] = useState(false);
  const [editingUserRole, setEditingUserRole] = useState<UserRole>('client');
  const [editingUserCategory, setEditingUserCategory] = useState<UserCategory>(null);
  const [editingUserSiret, setEditingUserSiret] = useState('');
  const [editingUserTva, setEditingUserTva] = useState('');
  const [producerUsers, setProducerUsers] = useState<UserProfile[]>([]);
  const [linkProducerModalVisible, setLinkProducerModalVisible] = useState(false);
  const [selectedProducerForLink, setSelectedProducerForLink] = useState<{ id: string; name: string; profile_id: string | null } | null>(null);
  const [producersWithProfiles, setProducersWithProfiles] = useState<Map<string, string | null>>(new Map());
  // Add user modal states
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('client');
  const [newUserCategory, setNewUserCategory] = useState<UserCategory>(null);
  const [addUserLoading, setAddUserLoading] = useState(false);
  // Fetch Supabase data
  const loadSupabaseData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSupabaseError('Supabase non configuré. Ajoutez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans les variables ENV.');
      return;
    }
    setSupabaseLoading(true);
    setSupabaseError(null);
    try {
      const data = await fetchAppData();
      setSupabaseData(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setSupabaseError(message);
      Alert.alert('Erreur', message);
    } finally {
      setSupabaseLoading(false);
    }
  }, []);

  // Auto-refresh every 5 seconds when on supabase-data tab
  useEffect(() => {
    if (activeTab === 'supabase-data') {
      loadSupabaseData();
      const interval = setInterval(loadSupabaseData, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab, loadSupabaseData]);

  // Handle add/edit Supabase item
  const handleSupabaseSave = async () => {
    if (!supabaseFormNom.trim()) {
      Alert.alert('Erreur', 'Le nom est requis');
      return;
    }
    setSupabaseLoading(true);
    try {
      if (supabaseEditingItem) {
        await updateAppData(supabaseEditingItem.id, {
          nom: supabaseFormNom.trim(),
          description: supabaseFormDescription.trim(),
          valeur: supabaseFormValeur.trim(),
        });
      } else {
        await addAppData({
          nom: supabaseFormNom.trim(),
          description: supabaseFormDescription.trim(),
          valeur: supabaseFormValeur.trim(),
        });
      }
      setSupabaseFormVisible(false);
      setSupabaseEditingItem(null);
      setSupabaseFormNom('');
      setSupabaseFormDescription('');
      setSupabaseFormValeur('');
      await loadSupabaseData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setSupabaseLoading(false);
    }
  };

  // Handle delete Supabase item
  const handleSupabaseDelete = async (id: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer cet élément ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setSupabaseLoading(true);
            try {
              await deleteAppData(id);
              await loadSupabaseData();
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Erreur inconnue';
              Alert.alert('Erreur', message);
            } finally {
              setSupabaseLoading(false);
            }
          },
        },
      ]
    );
  };

  // Open edit form for Supabase item
  const openSupabaseEditForm = (item: AppDataItem) => {
    setSupabaseEditingItem(item);
    setSupabaseFormNom(item.nom);
    setSupabaseFormDescription(item.description);
    setSupabaseFormValeur(item.valeur);
    setSupabaseFormVisible(true);
  };

  // Open add form for Supabase item
  const openSupabaseAddForm = () => {
    setSupabaseEditingItem(null);
    setSupabaseFormNom('');
    setSupabaseFormDescription('');
    setSupabaseFormValeur('');
    setSupabaseFormVisible(true);
  };

  // Load users data
  const loadUsersData = useCallback(async () => {
    console.log('[Admin Screen] Loading users data...');
    console.log('[Admin Screen] isUsersApiConfigured:', isUsersApiConfigured());
    console.log('[Admin Screen] Role filter:', usersRoleFilter);
    console.log('[Admin Screen] Category filter:', usersCategoryFilter);
    console.log('[Admin Screen] Search query:', usersSearchQuery);

    if (!isUsersApiConfigured()) {
      console.log('[Admin Screen] ERROR: Supabase not configured');
      setUsersError('Supabase non configuré');
      return;
    }
    setUsersLoading(true);
    setUsersError(null);
    try {
      const { users, error } = await fetchUsers({
        role: usersRoleFilter || undefined,
        category: usersCategoryFilter || undefined,
        search: usersSearchQuery || undefined,
      });
      console.log('[Admin Screen] Fetch result - users count:', users?.length || 0);
      console.log('[Admin Screen] Fetch result - error:', error);
      console.log('[Admin Screen] Users to display:', JSON.stringify(users));
      if (error) throw error;
      setUsersData(users);
      setUsersLastUpdate(new Date());
      console.log('[Admin Screen] usersData state updated with', users.length, 'users');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      console.log('[Admin Screen] ERROR:', message);
      setUsersError(message);
    } finally {
      setUsersLoading(false);
    }
  }, [usersRoleFilter, usersCategoryFilter, usersSearchQuery]);

  // Load producer users for linking
  const loadProducerUsers = useCallback(async () => {
    if (!isUsersApiConfigured()) return;
    try {
      const { users } = await fetchProducerUsers();
      setProducerUsers(users);
    } catch (err) {
      console.error('Error loading producer users:', err);
    }
  }, []);

  // Load producers with their profile_id
  const loadProducersWithProfiles = useCallback(async () => {
    if (!isUsersApiConfigured()) return;
    try {
      const { producers } = await fetchProducersWithProfiles();
      const profileMap = new Map<string, string | null>();
      producers.forEach((p) => {
        profileMap.set(p.id, p.profile_id);
      });
      setProducersWithProfiles(profileMap);
    } catch (err) {
      console.error('Error loading producers with profiles:', err);
    }
  }, []);

  // Auto-refresh users when on users tab or filters change
  useEffect(() => {
    if (activeTab === 'users') {
      loadUsersData();
    }
  }, [activeTab, usersRoleFilter, usersCategoryFilter, loadUsersData]);

  // Auto-refresh users every 60 seconds when on users tab
  useEffect(() => {
    if (activeTab === 'users') {
      const interval = setInterval(() => {
        console.log('[Admin Users] Auto-refresh...');
        loadUsersData();
      }, 60000); // 60 seconds

      return () => {
        console.log('[Admin Users] Stopping auto-refresh');
        clearInterval(interval);
      };
    }
  }, [activeTab, loadUsersData]);

  // Load producer profile data when on producers tab
  useEffect(() => {
    if (activeTab === 'producers') {
      loadProducersWithProfiles();
      loadProducerUsers();
    }
  }, [activeTab, loadProducersWithProfiles, loadProducerUsers]);

  // Open user edit modal
  const openUserEditModal = (user: UserProfile) => {
    setSelectedUser(user);
    setEditingUserRole(user.role);
    setEditingUserCategory(user.category);
    setEditingUserSiret(user.siret || '');
    setEditingUserTva(user.tva_number || '');
    setUserEditModalVisible(true);
  };

  // Save user changes
  const handleSaveUserChanges = async () => {
    if (!selectedUser) return;

    setUsersLoading(true);
    try {
      const { success, error } = await updateUserProfile(selectedUser.id, {
        role: editingUserRole,
        category: editingUserCategory,
        siret: editingUserSiret || null,
        tva_number: editingUserTva || null,
      });

      if (error) throw error;
      if (success) {
        setUserEditModalVisible(false);
        await loadUsersData();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setUsersLoading(false);
    }
  };

  // Handle producer linking
  const handleLinkProducer = async (profileId: string | null) => {
    if (!selectedProducerForLink) return;

    setUsersLoading(true);
    try {
      // Find the full producer data from allProducers
      const fullProducer = allProducers.find(p => p.id === selectedProducerForLink.id);

      const { success, error } = await linkProducerToProfile(
        selectedProducerForLink.id,
        profileId,
        fullProducer ? {
          name: fullProducer.name,
          region: fullProducer.region,
        } : undefined
      );
      if (error) throw error;
      if (success) {
        setLinkProducerModalVisible(false);
        setSelectedProducerForLink(null);
        Alert.alert('Succès', profileId ? 'Boutique liée au compte producteur' : 'Boutique déliée');
        // Refresh data
        await loadProducerUsers();
        await loadProducersWithProfiles();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setUsersLoading(false);
    }
  };

  // Handle adding a new user
  const handleAddUser = async () => {
    console.log('[Admin Users] handleAddUser called');
    console.log('[Admin Users] Email:', newUserEmail);
    console.log('[Admin Users] Name:', newUserFullName);
    console.log('[Admin Users] Role:', newUserRole);

    if (!newUserEmail.trim()) {
      Alert.alert('Erreur', 'L\'email est requis');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail.trim())) {
      Alert.alert('Erreur', 'Veuillez entrer un email valide');
      return;
    }

    setAddUserLoading(true);
    try {
      const { user, error } = await inviteUser({
        email: newUserEmail.trim(),
        full_name: newUserFullName.trim() || undefined,
        role: newUserRole,
        category: newUserRole === 'pro' ? newUserCategory : null,
      });

      if (error) throw error;

      console.log('[Admin Users] User created:', user);
      setAddUserModalVisible(false);
      Alert.alert('Succès', `Utilisateur ${newUserEmail} créé avec succès`);
      await loadUsersData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      console.log('[Admin Users] Error adding user:', message);
      Alert.alert('Erreur', message);
    } finally {
      setAddUserLoading(false);
    }
  };

  // Store selectors
  const regions = useOptionsStore((s) => s.regions);
  const soilTypes = useOptionsStore((s) => s.soilTypes);
  const climateTypes = useOptionsStore((s) => s.climateTypes);
  const productTypes = useOptionsStore((s) => s.productTypes);

  // Supabase sync store
  const syncedProducers = useSupabaseSyncStore((s) => s.syncedProducers);
  const syncedLots = useSupabaseSyncStore((s) => s.syncedLots);
  const setSyncedProducers = useSupabaseSyncStore((s) => s.setSyncedProducers);
  const setSyncedLots = useSupabaseSyncStore((s) => s.setSyncedLots);
  const lastSyncAt = useSupabaseSyncStore((s) => s.lastSyncAt);
  const isSyncingGlobal = useSupabaseSyncStore((s) => s.isSyncing);
  const setSyncingGlobal = useSupabaseSyncStore((s) => s.setSyncing);
  const syncErrorGlobal = useSupabaseSyncStore((s) => s.syncError);
  const setSyncErrorGlobal = useSupabaseSyncStore((s) => s.setSyncError);

  const addRegion = useOptionsStore((s) => s.addRegion);
  const removeRegion = useOptionsStore((s) => s.removeRegion);
  const updateRegion = useOptionsStore((s) => s.updateRegion);

  const addSoilType = useOptionsStore((s) => s.addSoilType);
  const removeSoilType = useOptionsStore((s) => s.removeSoilType);
  const updateSoilType = useOptionsStore((s) => s.updateSoilType);

  // New soil type options with composition
  const soilTypeOptions = useOptionsStore((s) => s.soilTypeOptions);
  const addSoilTypeOption = useOptionsStore((s) => s.addSoilTypeOption);
  const removeSoilTypeOption = useOptionsStore((s) => s.removeSoilTypeOption);
  const updateSoilTypeOption = useOptionsStore((s) => s.updateSoilTypeOption);
  const resetSoilTypeOptions = useOptionsStore((s) => s.resetSoilTypeOptions);

  const addClimateType = useOptionsStore((s) => s.addClimateType);
  const removeClimateType = useOptionsStore((s) => s.removeClimateType);
  const updateClimateType = useOptionsStore((s) => s.updateClimateType);

  const addProductType = useOptionsStore((s) => s.addProductType);
  const removeProductType = useOptionsStore((s) => s.removeProductType);
  const updateProductType = useOptionsStore((s) => s.updateProductType);

  const resetToDefaults = useOptionsStore((s) => s.resetToDefaults);

  const customProducers = useProducerStore((s) => s.producers);
  const removeProducer = useProducerStore((s) => s.removeProducer);
  const addProducer = useProducerStore((s) => s.addProducer);

  const lots = useLotsStore((s) => s.lots);
  const removeLot = useLotsStore((s) => s.removeLot);
  const clearAllLots = useLotsStore((s) => s.clearAllLots);
  const toggleLotActive = useLotsStore((s) => s.toggleLotActive);

  // Orders
  const orders = useOrdersStore((s) => s.orders);
  const setOrders = useOrdersStore((s) => s.setOrders);
  const updateOrderStatus = useOrdersStore((s) => s.updateOrderStatus);
  const updateOrderTrackingNumber = useOrdersStore((s) => s.updateOrderTrackingNumber);
  const deleteOrder = useOrdersStore((s) => s.deleteOrder);
  const validatePayment = useOrdersStore((s) => s.validatePayment);
  const markTicketsDistributed = useOrdersStore((s) => s.markTicketsDistributed);

  // Tickets
  const addTickets = useSubscriptionStore((s) => s.addTickets);

  // Tab visibility
  const tabsConfig = useTabVisibilityStore((s) => s.tabs);
  const setTabVisibility = useTabVisibilityStore((s) => s.setTabVisibility);
  const setTabRoleVisibility = useTabVisibilityStore((s) => s.setTabRoleVisibility);

  // Promos
  const promos = usePromosStore((s) => s.promos);
  const addPromo = usePromosStore((s) => s.addPromo);
  const updatePromo = usePromosStore((s) => s.updatePromo);
  const removePromo = usePromosStore((s) => s.removePromo);
  const togglePromoActive = usePromosStore((s) => s.togglePromoActive);

  // Promo Products
  const promoProducts = usePromoProductsStore((s) => s.promoProducts);
  const addPromoProduct = usePromoProductsStore((s) => s.addPromoProduct);
  const removePromoProduct = usePromoProductsStore((s) => s.removePromoProduct);
  const togglePromoProductActive = usePromoProductsStore((s) => s.togglePromoProductActive);

  // Packs
  const packs = usePacksStore((s) => s.packs);

  // Stock Inventory
  const stockItems = useStockInventoryStore((s) => s.stock);
  const addStockItem = useStockInventoryStore((s) => s.addStockItem);
  const updateStockItem = useStockInventoryStore((s) => s.updateStockItem);
  const removeStockItem = useStockInventoryStore((s) => s.removeStockItem);
  const clearAllStock = useStockInventoryStore((s) => s.clearAllStock);

  // Stock inventory modal state
  const [addStockVisible, setAddStockVisible] = useState(false);
  const [editingStock, setEditingStock] = useState<StockItem | null>(null);

  // Orders sync state
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Load orders from Supabase (with optional loading indicator)
  const loadOrdersFromSupabase = async (showLoading = true) => {
    if (!isSupabaseSyncConfigured()) return;

    if (showLoading) {
      setOrdersLoading(true);
    }
    try {
      const supabaseOrders = await fetchOrders();
      if (supabaseOrders.length > 0) {
        // Simply replace with Supabase data (source of truth)
        const sortedOrders = [...supabaseOrders].sort((a, b) => b.createdAt - a.createdAt);
        setOrders(sortedOrders);
      }
    } catch (error) {
      console.error('Erreur chargement commandes:', error);
    } finally {
      if (showLoading) {
        setOrdersLoading(false);
      }
    }
  };

  // Auto-load orders when tab is active
  useEffect(() => {
    if (activeTab === 'orders') {
      loadOrdersFromSupabase(true); // Show loading on initial load
      // Refresh every 30 seconds silently (no loading indicator)
      const interval = setInterval(() => loadOrdersFromSupabase(false), 30000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Produits view state
  const [expandedProducers, setExpandedProducers] = useState<string[]>([]);
  const [produitsAddModalVisible, setProduitsAddModalVisible] = useState(false);
  const [selectedProducerIdForProduits, setSelectedProducerIdForProduits] = useState<string>('');
  const [selectedProducerNameForProduits, setSelectedProducerNameForProduits] = useState<string>('');
  const [editingProductForProduits, setEditingProductForProduits] = useState<ProducerProduct | null>(null);
  const [showDeleteProductConfirm, setShowDeleteProductConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ producerId: string; productId: string } | null>(null);

  const updateProducer = useProducerStore((s) => s.updateProducer);

  // Low stock count
  const lowStockCount = stockItems.filter((s) => s.quantity <= s.minStock).length;

  // Function to decrement stock when order is shipped
  const decrementStockForOrder = (order: Order) => {
    order.items.forEach((item) => {
      // Find matching stock item by product name and producer
      const stockItem = stockItems.find(
        (s) => s.productName.toLowerCase() === item.productName.toLowerCase() &&
               s.producerId === item.producerId
      );
      if (stockItem && stockItem.quantity >= item.quantity) {
        updateStockItem(stockItem.id, {
          quantity: stockItem.quantity - item.quantity,
        });
      }
    });
  };

  // Handle order status change with stock decrement and Supabase sync
  const handleOrderStatusChange = async (orderId: string, newStatus: OrderStatus, order: Order) => {
    // If changing to shipped and wasn't already shipped, decrement stock
    if (newStatus === 'shipped' && order.status !== 'shipped') {
      decrementStockForOrder(order);
    }
    updateOrderStatus(orderId, newStatus);

    // Sync to Supabase
    if (isSupabaseSyncConfigured()) {
      try {
        await updateOrderInSupabase(orderId, { status: newStatus });
      } catch (error) {
        console.error('Erreur sync statut commande:', error);
      }
    }
  };

  // Handle order delete with Supabase sync
  const handleOrderDelete = async (orderId: string) => {
    deleteOrder(orderId);

    // Sync to Supabase
    if (isSupabaseSyncConfigured()) {
      try {
        await deleteOrderFromSupabase(orderId);
      } catch (error) {
        console.error('Erreur suppression commande Supabase:', error);
      }
    }
  };

  // Merge producers: custom producers override sample ones (by id)
  const allProducers = React.useMemo(() => {
    const customIds = new Set(customProducers.map((p) => p.id));
    const sampleOnly = SAMPLE_PRODUCERS.filter((p) => !customIds.has(p.id));
    return [...sampleOnly, ...customProducers];
  }, [customProducers]);

  // Count pending orders
  const pendingOrdersCount = orders.filter((o) => o.status === 'pending').length;

  // Calculate total products across all producers
  const totalProducts = allProducers.reduce((sum, p) => sum + p.products.length, 0);

  // Calculate total revenue from shipped orders
  const totalRevenue = orders
    .filter((o) => o.status === 'shipped')
    .reduce((sum, o) => sum + o.total, 0);

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count: number }[] = [
    // Producer-specific tab (only for producers)
    ...(isProducer ? [{ id: 'producer-orders' as TabType, label: 'Mes Commandes', icon: <Store size={20} color={activeTab === 'producer-orders' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: 0 }] : []),
    // Admin tabs
    ...(isAdmin ? [
      { id: 'orders' as TabType, label: 'Commandes', icon: <ShoppingBag size={20} color={activeTab === 'orders' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: pendingOrdersCount },
      { id: 'users' as TabType, label: 'Utilisateurs', icon: <UserCog size={20} color={activeTab === 'users' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: usersData.length },
      { id: 'inventory' as TabType, label: 'Stock', icon: <Boxes size={20} color={activeTab === 'inventory' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: lowStockCount > 0 ? lowStockCount : stockItems.length },
      { id: 'produits-view' as TabType, label: 'Produits', icon: <Layers size={20} color={activeTab === 'produits-view' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: totalProducts },
      { id: 'producers' as TabType, label: 'Producteurs', icon: <Users size={20} color={activeTab === 'producers' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: allProducers.length },
      { id: 'lots' as TabType, label: 'Lots', icon: <Gift size={20} color={activeTab === 'lots' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: lots.length },
      { id: 'promo-products' as TabType, label: 'Promos', icon: <Tag size={20} color={activeTab === 'promo-products' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: promoProducts.length },
      { id: 'codes' as TabType, label: 'Codes', icon: <Percent size={20} color={activeTab === 'codes' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: promos.length },
      { id: 'tabs' as TabType, label: 'Onglets', icon: <Layout size={20} color={activeTab === 'tabs' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: tabsConfig.filter(t => t.visible).length },
      { id: 'regions' as TabType, label: 'Régions', icon: <MapPin size={20} color={activeTab === 'regions' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: regions.length },
      { id: 'soils' as TabType, label: 'Sols', icon: <Leaf size={20} color={activeTab === 'soils' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: soilTypes.length },
      { id: 'climates' as TabType, label: 'Climats', icon: <Cloud size={20} color={activeTab === 'climates' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: climateTypes.length },
      { id: 'products' as TabType, label: 'Types', icon: <Package size={20} color={activeTab === 'products' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: productTypes.length },
      { id: 'supabase-data' as TabType, label: 'Supabase', icon: <Database size={20} color={activeTab === 'supabase-data' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: supabaseData.length },
      { id: 'sync' as TabType, label: 'Sync', icon: <CloudCog size={20} color={activeTab === 'sync' ? COLORS.primary.brightYellow : COLORS.text.muted} />, count: syncedProducers.length },
    ] : []),
  ];

  const openAddModal = () => {
    switch (activeTab) {
      case 'orders':
        setAddOrderVisible(true);
        break;
      case 'inventory':
        setEditingStock(null);
        setAddStockVisible(true);
        break;
      case 'lots':
        setEditingLot(null);
        setAddLotVisible(true);
        break;
      case 'codes':
        setEditingPromo(null);
        setAddPromoVisible(true);
        break;
      case 'regions':
        setEditModal({
          visible: true,
          title: 'Ajouter une région',
          value: '',
          onSave: (value) => {
            addRegion(value);
            setEditModal((m) => ({ ...m, visible: false }));
          },
        });
        break;
      case 'soils':
        setEditModal({
          visible: true,
          title: 'Ajouter un type de sol',
          value: '',
          onSave: (value) => {
            addSoilType(value);
            setEditModal((m) => ({ ...m, visible: false }));
          },
        });
        break;
      case 'climates':
        setEditModal({
          visible: true,
          title: 'Ajouter un type de climat',
          value: '',
          onSave: (value) => {
            addClimateType(value);
            setEditModal((m) => ({ ...m, visible: false }));
          },
        });
        break;
      case 'products':
        setEditModal({
          visible: true,
          title: 'Ajouter un type de produit',
          value: '',
          color: '#7d8c5c',
          onSave: (value) => {
            const id = value.toLowerCase().replace(/\s+/g, '-');
            addProductType({ id, label: value, color: '#7d8c5c' });
            setEditModal((m) => ({ ...m, visible: false }));
          },
          onColorChange: () => {},
        });
        break;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'producer-orders':
        return <AdminProducerOrders />;
      case 'orders':
        return (
          <View>
            {/* Sync status bar */}
            {isSupabaseSyncConfigured() && (
              <Pressable
                onPress={() => loadOrdersFromSupabase(true)}
                className="flex-row items-center justify-between rounded-xl p-3 mb-3"
                style={{
                  backgroundColor: `${COLORS.accent.hemp}15`,
                  borderWidth: 1,
                  borderColor: `${COLORS.accent.hemp}30`,
                }}
              >
                <View className="flex-row items-center">
                  <RefreshCw size={16} color={COLORS.accent.hemp} />
                  <Text style={{ color: COLORS.accent.hemp }} className="ml-2 text-sm">
                    Synchronisation Supabase
                  </Text>
                </View>
                {ordersLoading ? (
                  <ActivityIndicator size="small" color={COLORS.accent.hemp} />
                ) : (
                  <Text style={{ color: COLORS.text.muted }} className="text-xs">
                    Actualiser
                  </Text>
                )}
              </Pressable>
            )}

            {orders.length === 0 ? (
              <View
                className="rounded-xl p-6 items-center"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.text.white}10`,
                }}
              >
                <ShoppingBag size={48} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-center mt-3">
                  Aucune commande
                </Text>
                <Text style={{ color: COLORS.text.muted }} className="text-center text-sm mt-1">
                  Les commandes des clients apparaîtront ici
                </Text>
              </View>
            ) : (
              orders.map((order) => (
                <SwipeableOrderCard
                  key={order.id}
                  order={order}
                  onPress={() => setSelectedOrder(order)}
                  onDelete={() => handleOrderDelete(order.id)}
                />
              ))
            )}

            {/* Revenue Summary */}
            {orders.length > 0 && (
              <View
                className="mt-4 rounded-xl p-4"
                style={{
                  backgroundColor: `${ORDER_STATUS_CONFIG.shipped.color}15`,
                  borderWidth: 1,
                  borderColor: `${ORDER_STATUS_CONFIG.shipped.color}30`,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Truck size={20} color={ORDER_STATUS_CONFIG.shipped.color} />
                    <Text style={{ color: ORDER_STATUS_CONFIG.shipped.color }} className="font-medium ml-2">
                      CA (commandes expédiées)
                    </Text>
                  </View>
                  <Text style={{ color: ORDER_STATUS_CONFIG.shipped.color }} className="font-bold text-xl">
                    {totalRevenue.toFixed(2)}€
                  </Text>
                </View>
                <Text style={{ color: COLORS.text.muted }} className="text-xs mt-1">
                  {orders.filter((o) => o.status === 'shipped').length} commande{orders.filter((o) => o.status === 'shipped').length > 1 ? 's' : ''} expédiée{orders.filter((o) => o.status === 'shipped').length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        );

      case 'users':
        // Calculate statistics first
        const clientsCount = usersData.filter((u) => u.role === 'client').length;
        const prosCount = usersData.filter((u) => u.role === 'pro').length;
        const producersCount = usersData.filter((u) => u.role === 'producer').length;
        const adminsCount = usersData.filter((u) => u.role === 'admin').length;
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const newThisWeek = usersData.filter((u) => {
          const createdAt = u.created_at ? new Date(u.created_at).getTime() : 0;
          return createdAt > oneWeekAgo;
        }).length;

        // Role options with counts
        const roleOptions: { value: UserRole | ''; label: string }[] = [
          { value: '', label: `Tous (${usersData.length})` },
          { value: 'client', label: `Clients (${clientsCount})` },
          { value: 'pro', label: `Pros (${prosCount})` },
          { value: 'producer', label: `Producteurs (${producersCount})` },
          { value: 'admin', label: `Admins (${adminsCount})` },
        ];
        const categoryOptions: { value: UserCategory | ''; label: string }[] = [
          { value: '', label: 'Toutes catégories' },
          { value: 'restaurateur', label: 'Restaurateur' },
          { value: 'epicerie', label: 'Épicerie' },
          { value: 'grossiste', label: 'Grossiste' },
          { value: 'producteur_maraicher', label: 'Producteur Maraîcher' },
          { value: 'autre', label: 'Autre' },
        ];

        return (
          <View>
            {/* Dashboard statistiques */}
            <View
              className="rounded-2xl p-4 mb-4"
              style={{
                backgroundColor: `${COLORS.background.charcoal}`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}20`,
              }}
            >
              <View className="flex-row items-center justify-between mb-1">
                <View className="flex-row items-center">
                  <BarChart3 size={18} color={COLORS.primary.gold} />
                  <Text style={{ color: COLORS.primary.gold }} className="font-bold ml-2">
                    Vue d'ensemble
                  </Text>
                </View>
                <Pressable
                  onPress={loadUsersData}
                  className="flex-row items-center px-3 py-1.5 rounded-lg active:opacity-70"
                  style={{ backgroundColor: `${COLORS.accent.teal}20` }}
                >
                  {usersLoading ? (
                    <ActivityIndicator size="small" color={COLORS.accent.teal} />
                  ) : (
                    <>
                      <RefreshCw size={14} color={COLORS.accent.teal} />
                      <Text style={{ color: COLORS.accent.teal }} className="text-xs ml-1">
                        Actualiser
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* Last update time */}
              {usersLastUpdate && (
                <Text style={{ color: COLORS.text.muted }} className="text-xs mb-3">
                  Dernière mise à jour : {usersLastUpdate.toLocaleTimeString('fr-FR')}
                </Text>
              )}

              {/* Stats Grid */}
              <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                {/* Total */}
                <View
                  className="rounded-xl p-3 items-center"
                  style={{
                    backgroundColor: `${COLORS.primary.gold}15`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.gold}30`,
                    width: '31%',
                  }}
                >
                  <Text style={{ color: COLORS.primary.gold }} className="text-2xl font-bold">
                    {usersData.length}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs text-center">
                    Total
                  </Text>
                </View>

                {/* Clients */}
                <View
                  className="rounded-xl p-3 items-center"
                  style={{
                    backgroundColor: `${COLORS.accent.sky}15`,
                    borderWidth: 1,
                    borderColor: `${COLORS.accent.sky}30`,
                    width: '31%',
                  }}
                >
                  <Text style={{ color: COLORS.accent.sky }} className="text-2xl font-bold">
                    {clientsCount}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs text-center">
                    Clients
                  </Text>
                </View>

                {/* Producteurs */}
                <View
                  className="rounded-xl p-3 items-center"
                  style={{
                    backgroundColor: `${COLORS.accent.hemp}15`,
                    borderWidth: 1,
                    borderColor: `${COLORS.accent.hemp}30`,
                    width: '31%',
                  }}
                >
                  <Text style={{ color: COLORS.accent.hemp }} className="text-2xl font-bold">
                    {producersCount}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs text-center">
                    Producteurs
                  </Text>
                </View>

                {/* Professionnels */}
                <View
                  className="rounded-xl p-3 items-center"
                  style={{
                    backgroundColor: `${COLORS.accent.teal}15`,
                    borderWidth: 1,
                    borderColor: `${COLORS.accent.teal}30`,
                    width: '31%',
                  }}
                >
                  <Text style={{ color: COLORS.accent.teal }} className="text-2xl font-bold">
                    {prosCount}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs text-center">
                    Pros
                  </Text>
                </View>

                {/* Admins */}
                <View
                  className="rounded-xl p-3 items-center"
                  style={{
                    backgroundColor: `${COLORS.accent.red}15`,
                    borderWidth: 1,
                    borderColor: `${COLORS.accent.red}30`,
                    width: '31%',
                  }}
                >
                  <Text style={{ color: COLORS.accent.red }} className="text-2xl font-bold">
                    {adminsCount}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs text-center">
                    Admins
                  </Text>
                </View>

                {/* Nouveaux cette semaine */}
                <View
                  className="rounded-xl p-3 items-center"
                  style={{
                    backgroundColor: `${COLORS.primary.brightYellow}15`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.brightYellow}30`,
                    width: '31%',
                  }}
                >
                  <Text style={{ color: COLORS.primary.brightYellow }} className="text-2xl font-bold">
                    {newThisWeek}
                  </Text>
                  <Text style={{ color: COLORS.text.muted }} className="text-xs text-center">
                    Nouveaux (7j)
                  </Text>
                </View>
              </View>
            </View>

            {/* Header with add button */}
            <View className="flex-row justify-end mb-3">
              {/* Add user button */}
              <Pressable
                onPress={() => {
                  console.log('[Admin Users] Add button clicked');
                  setNewUserEmail('');
                  setNewUserFullName('');
                  setNewUserRole('client');
                  setNewUserCategory(null);
                  setAddUserModalVisible(true);
                }}
                className="flex-row items-center justify-center rounded-xl px-4 py-3 active:opacity-80"
                style={{
                  backgroundColor: COLORS.primary.gold,
                }}
              >
                <Plus size={18} color={COLORS.text.white} />
                <Text style={{ color: COLORS.text.white }} className="font-semibold ml-1">
                  Ajouter un utilisateur
                </Text>
              </Pressable>
            </View>

            {/* Search */}
            <View className="mb-3">
              <TextInput
                value={usersSearchQuery}
                onChangeText={setUsersSearchQuery}
                placeholder="Rechercher par nom ou email..."
                placeholderTextColor={COLORS.text.muted}
                className="rounded-xl px-4 py-3"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.paleGold}20`,
                  color: COLORS.text.white,
                }}
                onSubmitEditing={loadUsersData}
              />
            </View>

            {/* Filters */}
            <View className="flex-row gap-2 mb-4">
              {/* Role filter */}
              <View className="flex-1">
                <Text style={{ color: COLORS.text.muted }} className="text-xs mb-1">Rôle</Text>
                <View
                  className="rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}20`,
                  }}
                >
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {roleOptions.map((opt) => (
                      <Pressable
                        key={opt.value}
                        onPress={() => setUsersRoleFilter(opt.value)}
                        className="px-3 py-2"
                        style={{
                          backgroundColor: usersRoleFilter === opt.value ? COLORS.primary.gold : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            color: usersRoleFilter === opt.value ? COLORS.text.white : COLORS.text.muted,
                            fontSize: 12,
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            </View>

            {/* Category filter (only show when role is pro) */}
            {usersRoleFilter === 'pro' && (
              <View className="mb-4">
                <Text style={{ color: COLORS.text.muted }} className="text-xs mb-1">Catégorie</Text>
                <View
                  className="rounded-lg overflow-hidden"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}20`,
                  }}
                >
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {categoryOptions.map((opt) => (
                      <Pressable
                        key={opt.value ?? 'null'}
                        onPress={() => setUsersCategoryFilter(opt.value)}
                        className="px-3 py-2"
                        style={{
                          backgroundColor: usersCategoryFilter === opt.value ? COLORS.accent.teal : 'transparent',
                        }}
                      >
                        <Text
                          style={{
                            color: usersCategoryFilter === opt.value ? COLORS.text.white : COLORS.text.muted,
                            fontSize: 12,
                          }}
                        >
                          {opt.label}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* Error message */}
            {usersError && (
              <View
                className="rounded-xl p-4 mb-4"
                style={{
                  backgroundColor: `${COLORS.accent.red}15`,
                  borderWidth: 1,
                  borderColor: `${COLORS.accent.red}30`,
                }}
              >
                <Text style={{ color: COLORS.accent.red }}>{usersError}</Text>
              </View>
            )}

            {/* Users list */}
            {usersData.length === 0 && !usersLoading ? (
              <View
                className="rounded-xl p-6 items-center"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.text.white}10`,
                }}
              >
                <UserCog size={48} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-center mt-3">
                  Aucun utilisateur trouvé
                </Text>
              </View>
            ) : (
              usersData.map((user) => (
                <Pressable
                  key={user.id}
                  onPress={() => openUserEditModal(user)}
                  className="rounded-xl p-4 mb-3 active:opacity-80"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}15`,
                  }}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text style={{ color: COLORS.text.white }} className="font-semibold text-base">
                        {user.full_name || 'Sans nom'}
                      </Text>
                      <Text style={{ color: COLORS.text.muted }} className="text-sm mt-1">
                        {user.email || 'Pas d\'email'}
                      </Text>
                      {user.siret && (
                        <Text style={{ color: COLORS.text.muted }} className="text-xs mt-1">
                          SIRET: {user.siret}
                        </Text>
                      )}
                      {user.tva_number && (
                        <Text style={{ color: COLORS.text.muted }} className="text-xs">
                          TVA: {user.tva_number}
                        </Text>
                      )}
                    </View>
                    <View className="items-end">
                      <View
                        className="px-2 py-1 rounded-full"
                        style={{ backgroundColor: `${USER_ROLE_COLORS[user.role]}30` }}
                      >
                        <Text style={{ color: USER_ROLE_COLORS[user.role], fontSize: 11, fontWeight: '600' }}>
                          {USER_ROLE_LABELS[user.role]}
                        </Text>
                      </View>
                      {user.category && (
                        <Text style={{ color: COLORS.text.muted }} className="text-xs mt-1">
                          {USER_CATEGORY_LABELS[user.category] || user.category}
                        </Text>
                      )}
                      {/* Pro Status Badge - pour pro ET producer */}
                      {(user.role === 'pro' || user.role === 'producer') && (
                        <View
                          className="px-2 py-1 rounded-full mt-1"
                          style={{ backgroundColor: `${PRO_STATUS_COLORS[(user as any).pro_status] || PRO_STATUS_COLORS.pending}30` }}
                        >
                          <Text style={{ color: PRO_STATUS_COLORS[(user as any).pro_status] || PRO_STATUS_COLORS.pending, fontSize: 10, fontWeight: '600' }}>
                            {PRO_STATUS_LABELS[(user as any).pro_status] || PRO_STATUS_LABELS.pending}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Bouton d'approbation pour les pros/producteurs en attente (y compris pro_status null) */}
                  {(user.role === 'pro' || user.role === 'producer') && ((user as any).pro_status === 'pending' || (user as any).pro_status === null || (user as any).pro_status === undefined) && (
                    <View className="flex-row mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: `${COLORS.text.white}10` }}>
                      <Pressable
                        onPress={async () => {
                          console.log('[Admin] Approving user, role:', user.role);
                          Alert.alert('Validation en cours', `Approbation du compte ${user.role === 'producer' ? 'producteur' : 'pro'}...`);
                          const { success, error } = await updateProStatus(user.id, 'approved');
                          console.log('[Admin] Approval result:', success, error?.message);
                          if (success) {
                            Alert.alert('Succès', 'Le compte a été approuvé');
                            await loadUsersData();
                          } else if (error) {
                            Alert.alert('Erreur', error.message);
                          }
                        }}
                        className="flex-1 py-3 rounded-lg mr-2 items-center active:opacity-70"
                        style={{ backgroundColor: '#22C55E' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                          Approuver
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={async () => {
                          console.log('[Admin] Rejecting user');
                          const { success, error } = await updateProStatus(user.id, 'rejected');
                          console.log('[Admin] Rejection result:', success, error?.message);
                          if (success) {
                            Alert.alert('Succès', 'Le compte a été refusé');
                            await loadUsersData();
                          } else if (error) {
                            Alert.alert('Erreur', error.message);
                          }
                        }}
                        className="flex-1 py-3 rounded-lg ml-2 items-center active:opacity-70"
                        style={{ backgroundColor: '#EF4444' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                          Refuser
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Bouton pour créer une boutique - seulement pour producteurs approuvés sans boutique liée */}
                  {user.role === 'producer' && (user as any).pro_status === 'approved' && !Array.from(producersWithProfiles.values()).includes(user.id) && (
                    <View className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: `${COLORS.text.white}10` }}>
                      <Pressable
                        onPress={async () => {
                          console.log('[Admin] Creating shop for producer');
                          // Créer une nouvelle boutique pour ce producteur
                          const newProducer = {
                            id: `producer-${Date.now()}`,
                            name: user.full_name || user.company_name || 'Nouvelle Boutique',
                            region: user.city || 'France',
                            department: '',
                            city: user.city || '',
                            image: '',
                            description: `Boutique de ${user.full_name || 'producteur'}`,
                            siret: user.siret || '',
                            tva_number: user.tva_number || '',
                            culture_outdoor: false,
                            culture_greenhouse: false,
                            culture_indoor: false,
                            coordinates: { latitude: 46.603354, longitude: 1.888334 }, // Centre de la France par défaut
                            soil: { type: 'Argilo-calcaire', ph: '7.0', characteristics: 'Sol fertile' },
                            climate: { type: 'Tempéré', avgTemp: '12°C', rainfall: '800mm' },
                            products: [],
                          };

                          try {
                            // Ajouter au store local
                            addProducer(newProducer);

                            // Lier au profil utilisateur avec les données du producteur
                            const { success, error } = await linkProducerToProfile(
                              newProducer.id,
                              user.id,
                              {
                                name: newProducer.name,
                                region: newProducer.region,
                                siret: newProducer.siret,
                                tva_number: newProducer.tva_number,
                              }
                            );
                            if (success) {
                              Alert.alert('Succès', `Boutique "${newProducer.name}" créée et liée au compte producteur`);
                              await loadProducersWithProfiles();
                              await loadProducerUsers();
                            } else {
                              Alert.alert('Erreur', error?.message || 'Impossible de lier la boutique');
                            }
                          } catch (err) {
                            console.error('[Admin] Error creating shop:', err);
                            Alert.alert('Erreur', 'Impossible de créer la boutique');
                          }
                        }}
                        className="py-3 rounded-lg items-center active:opacity-70 flex-row justify-center"
                        style={{ backgroundColor: COLORS.accent.hemp }}
                      >
                        <Store size={18} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }} className="ml-2">
                          Créer sa boutique
                        </Text>
                      </Pressable>
                    </View>
                  )}

                  {/* Delete button */}
                  <View className="flex-row items-center justify-between mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: `${COLORS.text.white}10` }}>
                    <View className="flex-row items-center">
                      <Text style={{ color: COLORS.text.muted }} className="text-xs">
                        ID: {user.id.slice(0, 8)}...
                      </Text>
                      <Text style={{ color: COLORS.text.muted }} className="text-xs ml-3">
                        {new Date(user.created_at).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          'Supprimer l\'utilisateur',
                          `Êtes-vous sûr de vouloir supprimer ${user.full_name || user.email || 'cet utilisateur'} ?\n\nCette action est irréversible.`,
                          [
                            { text: 'Annuler', style: 'cancel' },
                            {
                              text: 'Supprimer',
                              style: 'destructive',
                              onPress: async () => {
                                console.log('[Admin] Deleting user');
                                const { success, error } = await deleteUser(user.id);
                                if (success) {
                                  Alert.alert('Succès', 'L\'utilisateur a été supprimé');
                                  await loadUsersData();
                                } else if (error) {
                                  Alert.alert('Erreur', error.message);
                                }
                              },
                            },
                          ]
                        );
                      }}
                      className="flex-row items-center px-3 py-2 rounded-lg active:opacity-70"
                      style={{ backgroundColor: `${COLORS.accent.red}20` }}
                    >
                      <Trash2 size={14} color={COLORS.accent.red} />
                      <Text style={{ color: COLORS.accent.red, fontSize: 12, fontWeight: '500' }} className="ml-1">
                        Supprimer
                      </Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        );

      case 'inventory':
        const totalStockValue = stockItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
        return (
          <View>
            {/* Stock Summary */}
            {stockItems.length > 0 && (
              <View
                className="rounded-xl p-4 mb-4"
                style={{
                  backgroundColor: `${COLORS.primary.gold}15`,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.gold}30`,
                }}
              >
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
                      Valeur totale du stock
                    </Text>
                    <Text style={{ color: COLORS.primary.brightYellow }} className="text-2xl font-bold">
                      {totalStockValue.toFixed(2)}€
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
                      Produits en stock
                    </Text>
                    <Text style={{ color: COLORS.text.white }} className="text-lg font-semibold">
                      {stockItems.length}
                    </Text>
                  </View>
                </View>
                {lowStockCount > 0 && (
                  <View
                    className="flex-row items-center mt-3 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: `${COLORS.accent.red}20` }}
                  >
                    <AlertTriangle size={16} color={COLORS.accent.red} />
                    <Text style={{ color: COLORS.accent.red }} className="text-sm ml-2 font-medium">
                      {lowStockCount} produit{lowStockCount > 1 ? 's' : ''} en stock bas
                    </Text>
                  </View>
                )}
              </View>
            )}

            {stockItems.length === 0 ? (
              <View
                className="rounded-xl p-6 items-center"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.text.white}10`,
                }}
              >
                <Boxes size={48} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-center mt-3">
                  Aucun produit en stock
                </Text>
                <Text style={{ color: COLORS.text.muted }} className="text-center text-sm mt-1">
                  Ajoutez des produits pour gérer votre inventaire
                </Text>
              </View>
            ) : (
              stockItems.map((item) => {
                const isLowStock = item.quantity <= item.minStock;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setEditingStock(item);
                      setAddStockVisible(true);
                    }}
                    className="mb-3 rounded-xl overflow-hidden active:opacity-80"
                    style={{
                      backgroundColor: `${COLORS.text.white}05`,
                      borderWidth: 1,
                      borderColor: isLowStock ? `${COLORS.accent.red}40` : `${COLORS.text.white}10`,
                    }}
                  >
                    <View className="p-4">
                      <View className="flex-row items-center">
                        {item.image ? (
                          <Image
                            source={{ uri: item.image }}
                            className="w-14 h-14 rounded-lg mr-3"
                          />
                        ) : (
                          <View
                            className="w-14 h-14 rounded-lg mr-3 items-center justify-center"
                            style={{ backgroundColor: `${COLORS.primary.gold}20` }}
                          >
                            <Package size={24} color={COLORS.primary.gold} />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text style={{ color: COLORS.text.white }} className="font-semibold">
                            {item.productName}
                          </Text>
                          <Text style={{ color: COLORS.text.muted }} className="text-xs">
                            {item.producerName} • {item.productType}
                          </Text>
                          <View className="flex-row items-center mt-1">
                            <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold">
                              {item.price.toFixed(2)}€
                            </Text>
                            <Text style={{ color: COLORS.text.muted }} className="text-xs ml-1">
                              /{item.unit}
                            </Text>
                            <Text style={{ color: COLORS.text.muted }} className="text-xs ml-2">
                              • TVA {item.tvaRate}%
                            </Text>
                          </View>
                        </View>
                        <View className="items-end">
                          <View
                            className="px-3 py-1.5 rounded-lg"
                            style={{
                              backgroundColor: isLowStock
                                ? `${COLORS.accent.red}20`
                                : `${COLORS.accent.hemp}20`,
                            }}
                          >
                            <Text
                              style={{
                                color: isLowStock ? COLORS.accent.red : COLORS.accent.hemp,
                              }}
                              className="font-bold text-lg"
                            >
                              {item.quantity}
                            </Text>
                          </View>
                          {isLowStock && (
                            <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
                              Stock bas
                            </Text>
                          )}
                        </View>
                      </View>

                      {/* Quick quantity adjustment */}
                      <View className="flex-row items-center justify-end mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: `${COLORS.text.white}10` }}>
                        <Pressable
                          onPress={() => {
                            if (item.quantity > 0) {
                              updateStockItem(item.id, { quantity: item.quantity - 1 });
                            }
                          }}
                          className="w-8 h-8 rounded-lg items-center justify-center mr-2"
                          style={{ backgroundColor: `${COLORS.accent.red}20` }}
                        >
                          <Minus size={16} color={COLORS.accent.red} />
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            updateStockItem(item.id, { quantity: item.quantity + 1 });
                          }}
                          className="w-8 h-8 rounded-lg items-center justify-center mr-3"
                          style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
                        >
                          <Plus size={16} color={COLORS.accent.hemp} />
                        </Pressable>
                        <Pressable
                          onPress={() => removeStockItem(item.id)}
                          className="w-8 h-8 rounded-lg items-center justify-center"
                          style={{ backgroundColor: `${COLORS.accent.red}20` }}
                        >
                          <Trash2 size={16} color={COLORS.accent.red} />
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}

            {stockItems.length > 0 && (
              <Pressable
                onPress={clearAllStock}
                className="mt-4 rounded-xl py-3 flex-row items-center justify-center active:opacity-80"
                style={{
                  backgroundColor: `${COLORS.accent.red}15`,
                  borderWidth: 1,
                  borderColor: `${COLORS.accent.red}30`,
                }}
              >
                <Trash2 size={16} color={COLORS.accent.red} />
                <Text style={{ color: COLORS.accent.red }} className="font-medium ml-2">
                  Vider tout l'inventaire
                </Text>
              </Pressable>
            )}
          </View>
        );

      case 'producers':
        return (
          <View>
            <Pressable
              onPress={() => {
                setEditingProducer(null);
                setAddProducerVisible(true);
              }}
              className="rounded-xl py-4 flex-row items-center justify-center mb-4 active:opacity-80"
              style={{ backgroundColor: COLORS.primary.gold }}
            >
              <Plus size={20} color={COLORS.text.white} />
              <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                Ajouter un producteur
              </Text>
            </Pressable>

            {/* Info about linking */}
            {isUsersApiConfigured() && (
              <View
                className="rounded-xl p-3 mb-4"
                style={{
                  backgroundColor: `${COLORS.accent.teal}15`,
                  borderWidth: 1,
                  borderColor: `${COLORS.accent.teal}30`,
                }}
              >
                <View className="flex-row items-center">
                  <Link2 size={16} color={COLORS.accent.teal} />
                  <Text style={{ color: COLORS.accent.teal }} className="ml-2 text-sm flex-1">
                    Cliquez sur l'icône lien pour associer un producteur à un compte utilisateur
                  </Text>
                </View>
              </View>
            )}

            <Text style={{ color: COLORS.text.muted }} className="text-sm mb-4">
              Les producteurs exemple ne peuvent pas être supprimés.
            </Text>
            {allProducers.map((producer) => {
              const isCustom = !SAMPLE_PRODUCERS.find((p) => p.id === producer.id);
              // Check if this producer has a profile_id from our map
              const profileId = producersWithProfiles.get(producer.id) ?? null;
              const linkedUser = profileId ? producerUsers.find((u) => u.id === profileId) : null;

              return (
                <View
                  key={producer.id}
                  className="mb-2 rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}10`,
                  }}
                >
                  {/* Main producer row */}
                  <View className="flex-row items-center px-4 py-3">
                    {producer.image ? (
                      <Image
                        source={getImageSource(producer.image)}
                        className="w-14 h-14 rounded-xl"
                        resizeMode="cover"
                      />
                    ) : (
                      <View className="w-14 h-14 rounded-xl items-center justify-center" style={{ backgroundColor: `${COLORS.text.white}10` }}>
                        <Leaf size={24} color={COLORS.text.muted} />
                      </View>
                    )}
                    <View className="flex-1 ml-3">
                      <Text style={{ color: COLORS.text.white }} className="font-semibold" numberOfLines={1}>{producer.name}</Text>
                      <Text style={{ color: COLORS.text.muted }} className="text-xs" numberOfLines={1}>{producer.region}</Text>
                      <Pressable onPress={() => {
                        setSelectedProducerForProduct(producer);
                        setAddProductVisible(true);
                      }}>
                        <Text style={{ color: COLORS.primary.paleGold }} className="text-xs">
                          {producer.products.length} produit(s) • Ajouter +
                        </Text>
                      </Pressable>
                    </View>
                    <View className="flex-row">
                      {/* Link button */}
                      {isUsersApiConfigured() && (
                        <Pressable
                          onPress={() => {
                            setSelectedProducerForLink({ id: producer.id, name: producer.name, profile_id: profileId });
                            loadProducerUsers();
                            setLinkProducerModalVisible(true);
                          }}
                          className="p-2"
                        >
                          {profileId ? (
                            <Link2 size={18} color={COLORS.accent.hemp} />
                          ) : (
                            <Unlink size={18} color={COLORS.text.muted} />
                          )}
                        </Pressable>
                      )}
                      <Pressable
                        onPress={() => {
                          if (isCustom) {
                            setEditingProducer(producer);
                            setAddProducerVisible(true);
                          }
                        }}
                        className="p-2"
                      >
                        <Edit3 size={18} color={COLORS.primary.paleGold} />
                      </Pressable>
                      <Pressable
                        onPress={async () => {
                          if (isCustom) {
                            // Supprimer de Supabase d'abord
                            try {
                              await deleteProducerFromSupabase(producer.id);
                            } catch (error) {
                              console.log('Erreur suppression Supabase:', error);
                            }
                            // Puis supprimer du store local
                            removeProducer(producer.id);
                          }
                        }}
                        className="p-2"
                      >
                        <Trash2 size={18} color={isCustom ? COLORS.accent.red : COLORS.text.muted} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Linked user info */}
                  {linkedUser && (
                    <View
                      className="px-4 py-2 flex-row items-center"
                      style={{
                        backgroundColor: `${COLORS.accent.hemp}10`,
                        borderTopWidth: 1,
                        borderTopColor: `${COLORS.accent.hemp}20`,
                      }}
                    >
                      <Link2 size={14} color={COLORS.accent.hemp} />
                      <Text style={{ color: COLORS.accent.hemp }} className="text-xs ml-2">
                        Lié à: {linkedUser.full_name || linkedUser.email || 'Utilisateur'}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        );

      case 'lots':
        return (
          <View>
            <View className="flex-row gap-2 mb-4">
              <Pressable
                onPress={() => {
                  setEditingLot(null);
                  setAddLotVisible(true);
                }}
                className="flex-1 rounded-xl py-4 flex-row items-center justify-center active:opacity-80"
                style={{ backgroundColor: COLORS.primary.gold }}
              >
                <Plus size={20} color={COLORS.text.white} />
                <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                  Créer un lot
                </Text>
              </Pressable>

              {lots.length > 0 && (
                <Pressable
                  onPress={clearAllLots}
                  className="rounded-xl py-4 px-4 flex-row items-center justify-center active:opacity-80"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  <Trash2 size={20} color={COLORS.text.white} />
                </Pressable>
              )}
            </View>

            {/* Rarity legend */}
            <View className="flex-row flex-wrap mb-4">
              {(['common', 'rare', 'epic', 'platinum', 'legendary'] as Rarity[]).map((r) => (
                <View key={r} className="flex-row items-center mr-4 mb-2">
                  <View
                    className="w-3 h-3 rounded-full mr-1"
                    style={{ backgroundColor: RARITY_CONFIG[r].color }}
                  />
                  <Text style={{ color: COLORS.text.muted }} className="text-xs">
                    {RARITY_CONFIG[r].label} ({RARITY_CONFIG[r].odds})
                  </Text>
                </View>
              ))}
            </View>

            {lots.length === 0 ? (
              <View
                className="rounded-xl p-6 items-center"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.text.white}10`,
                }}
              >
                <Gift size={48} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-center mt-3">
                  Aucun lot créé
                </Text>
                <Text style={{ color: COLORS.text.muted }} className="text-center text-sm mt-1">
                  Créez des lots pour le tirage au sort
                </Text>
              </View>
            ) : (
              lots.map((lot) => (
                <LotItemCard
                  key={lot.id}
                  lot={lot}
                  onEdit={() => {
                    setEditingLot(lot);
                    setAddLotVisible(true);
                  }}
                  onDelete={() => removeLot(lot.id)}
                  onToggle={() => toggleLotActive(lot.id)}
                />
              ))
            )}
          </View>
        );

      case 'promo-products':
        return (
          <View>
            <Pressable
              onPress={() => setAddPromoProductVisible(true)}
              className="rounded-xl py-4 flex-row items-center justify-center mb-4 active:opacity-80"
              style={{ backgroundColor: COLORS.primary.orange }}
            >
              <Plus size={20} color={COLORS.text.white} />
              <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                Ajouter un produit en promo
              </Text>
            </Pressable>

            {promoProducts.length === 0 ? (
              <View
                className="rounded-xl p-6 items-center"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.text.white}10`,
                }}
              >
                <Tag size={48} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-center mt-3">
                  Aucun produit en promo
                </Text>
                <Text style={{ color: COLORS.text.muted }} className="text-center text-sm mt-1">
                  Ajoutez des produits pour les afficher dans l'onglet Promo
                </Text>
              </View>
            ) : (
              promoProducts.map((product) => (
                <View
                  key={product.id}
                  className="rounded-xl mb-3 overflow-hidden"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: product.active ? `${COLORS.primary.orange}50` : `${COLORS.text.white}10`,
                  }}
                >
                  <View className="p-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center flex-1">
                        {product.image ? (
                          <Image
                            source={{ uri: product.image }}
                            className="w-12 h-12 rounded-xl mr-3"
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            className="w-12 h-12 rounded-xl items-center justify-center mr-3"
                            style={{ backgroundColor: `${COLORS.primary.orange}20` }}
                          >
                            <Tag size={20} color={COLORS.primary.orange} />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text style={{ color: COLORS.text.white }} className="font-bold">
                            {product.productName}
                          </Text>
                          <Text style={{ color: COLORS.text.muted }} className="text-xs">
                            {product.producerName}
                          </Text>
                        </View>
                      </View>
                      <View
                        className="px-2 py-1 rounded-full"
                        style={{ backgroundColor: product.active ? `${COLORS.accent.hemp}20` : `${COLORS.text.muted}20` }}
                      >
                        <Text style={{ color: product.active ? COLORS.accent.hemp : COLORS.text.muted }} className="text-xs font-medium">
                          {product.active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center mb-2">
                      <Text style={{ color: COLORS.text.muted, textDecorationLine: 'line-through' }} className="text-sm mr-2">
                        {product.originalPrice.toFixed(2)}€
                      </Text>
                      <Text style={{ color: COLORS.primary.orange }} className="font-bold text-lg">
                        {product.promoPrice.toFixed(2)}€
                      </Text>
                      <View className="bg-red-500/20 px-2 py-0.5 rounded-lg ml-2">
                        <Text style={{ color: COLORS.accent.red }} className="text-xs font-bold">
                          -{product.discountPercent}%
                        </Text>
                      </View>
                    </View>
                    {product.validUntil && (
                      <Text style={{ color: COLORS.text.muted }} className="text-xs mb-2">
                        Jusqu'au {product.validUntil}
                      </Text>
                    )}
                    <View className="flex-row justify-end pt-2" style={{ borderTopWidth: 1, borderTopColor: `${COLORS.text.white}10` }}>
                      <Pressable
                        onPress={() => togglePromoProductActive(product.id)}
                        className="px-3 py-2 rounded-lg mr-2"
                        style={{ backgroundColor: `${COLORS.text.white}10` }}
                      >
                        {product.active ? (
                          <EyeOff size={16} color={COLORS.text.muted} />
                        ) : (
                          <Eye size={16} color={COLORS.accent.hemp} />
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => removePromoProduct(product.id)}
                        className="px-3 py-2 rounded-lg"
                        style={{ backgroundColor: `${COLORS.accent.red}20` }}
                      >
                        <Trash2 size={16} color={COLORS.accent.red} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        );

      case 'codes':
        return (
          <View>
            <Pressable
              onPress={() => {
                setEditingPromo(null);
                setAddPromoVisible(true);
              }}
              className="rounded-xl py-4 flex-row items-center justify-center mb-4 active:opacity-80"
              style={{ backgroundColor: COLORS.accent.red }}
            >
              <Plus size={20} color={COLORS.text.white} />
              <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                Créer une promo
              </Text>
            </Pressable>

            {promos.length === 0 ? (
              <View
                className="rounded-xl p-6 items-center"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.text.white}10`,
                }}
              >
                <Percent size={48} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-center mt-3">
                  Aucune promo créée
                </Text>
                <Text style={{ color: COLORS.text.muted }} className="text-center text-sm mt-1">
                  Créez des promotions pour vos clients
                </Text>
              </View>
            ) : (
              promos.map((promo) => (
                <View
                  key={promo.id}
                  className="rounded-xl mb-3 overflow-hidden"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: promo.active ? `${COLORS.accent.red}50` : `${COLORS.text.white}10`,
                  }}
                >
                  <View className="p-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center flex-1">
                        <View
                          className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                          style={{ backgroundColor: `${COLORS.accent.red}20` }}
                        >
                          <Percent size={20} color={COLORS.accent.red} />
                        </View>
                        <View className="flex-1">
                          <Text style={{ color: COLORS.text.white }} className="font-bold">
                            {promo.title}
                          </Text>
                          <Text style={{ color: COLORS.text.muted }} className="text-xs">
                            Code: {promo.code}
                          </Text>
                        </View>
                      </View>
                      <View
                        className="px-2 py-1 rounded-full"
                        style={{ backgroundColor: promo.active ? `${COLORS.accent.hemp}20` : `${COLORS.text.muted}20` }}
                      >
                        <Text style={{ color: promo.active ? COLORS.accent.hemp : COLORS.text.muted }} className="text-xs font-medium">
                          {promo.active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: COLORS.text.muted }} className="text-sm mb-2">
                      {promo.description}
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        {promo.discount > 0 && (
                          <View className="bg-red-500/20 px-2 py-1 rounded-lg mr-2">
                            <Text style={{ color: COLORS.accent.red }} className="text-xs font-bold">
                              -{promo.discount}%
                            </Text>
                          </View>
                        )}
                        <Text style={{ color: COLORS.text.muted }} className="text-xs">
                          Min. {promo.minOrder}€ | Jusqu'au {promo.validUntil}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row justify-end mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: `${COLORS.text.white}10` }}>
                      <Pressable
                        onPress={() => togglePromoActive(promo.id)}
                        className="px-3 py-2 rounded-lg mr-2"
                        style={{ backgroundColor: `${COLORS.text.white}10` }}
                      >
                        {promo.active ? (
                          <EyeOff size={16} color={COLORS.text.muted} />
                        ) : (
                          <Eye size={16} color={COLORS.accent.hemp} />
                        )}
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setEditingPromo(promo);
                          setAddPromoVisible(true);
                        }}
                        className="px-3 py-2 rounded-lg mr-2"
                        style={{ backgroundColor: `${COLORS.primary.gold}20` }}
                      >
                        <Edit3 size={16} color={COLORS.primary.gold} />
                      </Pressable>
                      <Pressable
                        onPress={() => removePromo(promo.id)}
                        className="px-3 py-2 rounded-lg"
                        style={{ backgroundColor: `${COLORS.accent.red}20` }}
                      >
                        <Trash2 size={16} color={COLORS.accent.red} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        );

      case 'regions':
        return (
          <View>
            {regions.map((region) => (
              <ListItem
                key={region}
                label={region}
                onEdit={() => {
                  setEditModal({
                    visible: true,
                    title: 'Modifier la région',
                    value: region,
                    onSave: (value) => {
                      updateRegion(region, value);
                      setEditModal((m) => ({ ...m, visible: false }));
                    },
                  });
                }}
                onDelete={() => removeRegion(region)}
              />
            ))}
          </View>
        );

      case 'soils':
        return (
          <View>
            {soilTypes.map((soil) => (
              <ListItem
                key={soil}
                label={soil}
                onEdit={() => {
                  setEditModal({
                    visible: true,
                    title: 'Modifier le type de sol',
                    value: soil,
                    onSave: (value) => {
                      updateSoilType(soil, value);
                      setEditModal((m) => ({ ...m, visible: false }));
                    },
                  });
                }}
                onDelete={() => removeSoilType(soil)}
              />
            ))}
          </View>
        );

      case 'climates':
        return (
          <View>
            {climateTypes.map((climate) => (
              <ListItem
                key={climate}
                label={climate}
                onEdit={() => {
                  setEditModal({
                    visible: true,
                    title: 'Modifier le type de climat',
                    value: climate,
                    onSave: (value) => {
                      updateClimateType(climate, value);
                      setEditModal((m) => ({ ...m, visible: false }));
                    },
                  });
                }}
                onDelete={() => removeClimateType(climate)}
              />
            ))}
          </View>
        );

      case 'tabs':
        return (
          <View className="pb-24">
            <Text style={{ color: COLORS.text.muted }} className="text-sm mb-2">
              Contrôlez la visibilité des onglets par rôle utilisateur.
            </Text>

            {/* Legend */}
            <View className="flex-row items-center justify-end mb-4 gap-4">
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS.accent.hemp }} />
                <Text style={{ color: COLORS.text.muted }} className="text-xs">Client</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS.accent.teal }} />
                <Text style={{ color: COLORS.text.muted }} className="text-xs">Pro</Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS.primary.gold }} />
                <Text style={{ color: COLORS.text.muted }} className="text-xs">Producteur</Text>
              </View>
            </View>

            {tabsConfig.map((tab) => {
              const clientVisible = tab.roleVisibility?.client ?? true;
              const proVisible = tab.roleVisibility?.pro ?? true;
              const producerVisible = tab.roleVisibility?.producer ?? true;
              const anyVisible = clientVisible || proVisible || producerVisible;

              return (
                <View
                  key={tab.id}
                  className="px-4 py-3 mb-2 rounded-xl"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: anyVisible ? `${COLORS.primary.gold}30` : `${COLORS.text.white}10`,
                  }}
                >
                  {/* Tab name row */}
                  <View className="flex-row items-center mb-3">
                    <View
                      className="w-9 h-9 rounded-lg items-center justify-center mr-3"
                      style={{
                        backgroundColor: anyVisible ? `${COLORS.primary.gold}20` : `${COLORS.text.white}10`,
                      }}
                    >
                      <Layout size={18} color={anyVisible ? COLORS.primary.brightYellow : COLORS.text.muted} />
                    </View>
                    <Text style={{ color: anyVisible ? COLORS.text.white : COLORS.text.muted }} className="font-medium text-base flex-1">
                      {tab.name}
                    </Text>
                  </View>

                  {/* Role toggles row */}
                  <View className="flex-row items-center justify-between">
                    {/* Client toggle */}
                    <Pressable
                      onPress={() => {
                        setTabRoleVisibility(tab.id, 'client', !clientVisible);
                        setTabsSaveStatus('saving');
                        // Simulate save feedback
                        setTimeout(() => setTabsSaveStatus('saved'), 300);
                        setTimeout(() => setTabsSaveStatus('idle'), 2000);
                      }}
                      className="flex-1 flex-row items-center justify-center py-2 mx-1 rounded-lg"
                      style={{
                        backgroundColor: clientVisible ? `${COLORS.accent.hemp}20` : `${COLORS.text.white}08`,
                        borderWidth: 1,
                        borderColor: clientVisible ? COLORS.accent.hemp : `${COLORS.text.white}15`,
                      }}
                    >
                      <Users size={14} color={clientVisible ? COLORS.accent.hemp : COLORS.text.muted} />
                      <Text
                        style={{ color: clientVisible ? COLORS.accent.hemp : COLORS.text.muted }}
                        className="text-xs font-medium ml-1.5"
                      >
                        Client
                      </Text>
                      {clientVisible && (
                        <Check size={12} color={COLORS.accent.hemp} style={{ marginLeft: 4 }} />
                      )}
                    </Pressable>

                    {/* Pro toggle */}
                    <Pressable
                      onPress={() => {
                        setTabRoleVisibility(tab.id, 'pro', !proVisible);
                        setTabsSaveStatus('saving');
                        setTimeout(() => setTabsSaveStatus('saved'), 300);
                        setTimeout(() => setTabsSaveStatus('idle'), 2000);
                      }}
                      className="flex-1 flex-row items-center justify-center py-2 mx-1 rounded-lg"
                      style={{
                        backgroundColor: proVisible ? `${COLORS.accent.teal}20` : `${COLORS.text.white}08`,
                        borderWidth: 1,
                        borderColor: proVisible ? COLORS.accent.teal : `${COLORS.text.white}15`,
                      }}
                    >
                      <Briefcase size={14} color={proVisible ? COLORS.accent.teal : COLORS.text.muted} />
                      <Text
                        style={{ color: proVisible ? COLORS.accent.teal : COLORS.text.muted }}
                        className="text-xs font-medium ml-1.5"
                      >
                        Pro
                      </Text>
                      {proVisible && (
                        <Check size={12} color={COLORS.accent.teal} style={{ marginLeft: 4 }} />
                      )}
                    </Pressable>

                    {/* Producer toggle */}
                    <Pressable
                      onPress={() => {
                        setTabRoleVisibility(tab.id, 'producer', !producerVisible);
                        setTabsSaveStatus('saving');
                        setTimeout(() => setTabsSaveStatus('saved'), 300);
                        setTimeout(() => setTabsSaveStatus('idle'), 2000);
                      }}
                      className="flex-1 flex-row items-center justify-center py-2 mx-1 rounded-lg"
                      style={{
                        backgroundColor: producerVisible ? `${COLORS.primary.gold}20` : `${COLORS.text.white}08`,
                        borderWidth: 1,
                        borderColor: producerVisible ? COLORS.primary.gold : `${COLORS.text.white}15`,
                      }}
                    >
                      <Leaf size={14} color={producerVisible ? COLORS.primary.gold : COLORS.text.muted} />
                      <Text
                        style={{ color: producerVisible ? COLORS.primary.gold : COLORS.text.muted }}
                        className="text-xs font-medium ml-1.5"
                      >
                        Prod
                      </Text>
                      {producerVisible && (
                        <Check size={12} color={COLORS.primary.gold} style={{ marginLeft: 4 }} />
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}

            {/* Save Button */}
            <View className="mt-6 flex-row gap-3">
              <Pressable
                onPress={() => {
                  setTabsSaveStatus('saving');
                  // Simulate save
                  setTimeout(() => setTabsSaveStatus('saved'), 500);
                  setTimeout(() => setTabsSaveStatus('idle'), 2000);
                }}
                className="flex-1 py-4 px-4 rounded-xl flex-row items-center justify-center"
                style={{
                  backgroundColor:
                    tabsSaveStatus === 'saved'
                      ? `${COLORS.accent.hemp}30`
                      : `${COLORS.primary.gold}`,
                }}
              >
                {tabsSaveStatus === 'saving' ? (
                  <>
                    <ActivityIndicator size="small" color={COLORS.text.white} />
                    <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">Sauvegarde...</Text>
                  </>
                ) : tabsSaveStatus === 'saved' ? (
                  <>
                    <CheckCircle size={20} color={COLORS.accent.hemp} />
                    <Text style={{ color: COLORS.accent.hemp }} className="font-bold ml-2">Sauvegardé !</Text>
                  </>
                ) : (
                  <>
                    <Download size={20} color={COLORS.text.white} />
                    <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">Sauvegarder</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        );

      case 'products':
        return (
          <View>
            {productTypes.map((product) => (
              <ListItem
                key={product.id}
                label={product.label}
                color={product.color}
                onEdit={() => {
                  let newColor = product.color;
                  setEditModal({
                    visible: true,
                    title: 'Modifier le type de produit',
                    value: product.label,
                    color: product.color,
                    onSave: (value) => {
                      updateProductType(product.id, { label: value, color: newColor });
                      setEditModal((m) => ({ ...m, visible: false }));
                    },
                    onColorChange: (color) => {
                      newColor = color;
                    },
                  });
                }}
                onDelete={() => removeProductType(product.id)}
              />
            ))}
          </View>
        );

      case 'produits-view':
        const producersWithProducts = allProducers.filter((p) => p.products.length > 0);

        const toggleProducerExpand = (producerId: string) => {
          setExpandedProducers((prev) =>
            prev.includes(producerId)
              ? prev.filter((id) => id !== producerId)
              : [...prev, producerId]
          );
        };

        const handleAddProductInProduits = (producerId: string, producerName: string) => {
          setSelectedProducerIdForProduits(producerId);
          setSelectedProducerNameForProduits(producerName);
          setEditingProductForProduits(null);
          setProduitsAddModalVisible(true);
        };

        const handleEditProductInProduits = (producerId: string, producerName: string, product: ProducerProduct) => {
          setSelectedProducerIdForProduits(producerId);
          setSelectedProducerNameForProduits(producerName);
          setEditingProductForProduits(product);
          setProduitsAddModalVisible(true);
        };

        const handleDeleteProductInProduits = (producerId: string, productId: string) => {
          setProductToDelete({ producerId, productId });
          setShowDeleteProductConfirm(true);
        };

        const confirmDeleteProduct = () => {
          if (productToDelete) {
            const producer = allProducers.find((p) => p.id === productToDelete.producerId);
            if (producer) {
              const updatedProducts = producer.products.filter((p) => p.id !== productToDelete.productId);
              updateProducer(productToDelete.producerId, { products: updatedProducts });
            }
          }
          setShowDeleteProductConfirm(false);
          setProductToDelete(null);
        };

        return (
          <View>
            {allProducers.length === 0 ? (
              <View
                className="rounded-xl p-6 items-center"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.text.white}10`,
                }}
              >
                <Layers size={48} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-center mt-3">
                  Aucun producteur
                </Text>
                <Text style={{ color: COLORS.text.muted }} className="text-center text-sm mt-1">
                  Ajoutez d'abord des producteurs dans l'onglet Producteurs
                </Text>
              </View>
            ) : (
              allProducers.map((producer: Producer) => (
                <View key={producer.id} className="mb-4">
                  {/* Producer Header */}
                  <Pressable
                    onPress={() => toggleProducerExpand(producer.id)}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      backgroundColor: `${COLORS.text.white}05`,
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
                            <Text style={{ color: COLORS.text.white }} className="font-bold text-lg">
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
                        return (
                          <View
                            key={product.id}
                            className="mb-2 rounded-xl overflow-hidden"
                            style={{
                              backgroundColor: `${COLORS.text.white}05`,
                              borderWidth: 1,
                              borderColor: hasPromo ? '#EF444450' : `${COLORS.primary.gold}15`,
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
                                </View>
                                {/* Promo badge */}
                                {hasPromo && (
                                  <View
                                    className="absolute top-0 left-0 right-0 rounded-t-lg px-1 py-0.5"
                                    style={{ backgroundColor: '#EF4444' }}
                                  >
                                    <Text style={{ color: '#FFFFFF', fontSize: 8, fontWeight: '800', textAlign: 'center' }}>
                                      -{product.promoPercent}%
                                    </Text>
                                  </View>
                                )}
                                {/* Stock badge */}
                                {product.stock !== undefined && product.stock <= 0 && (
                                  <View
                                    className="absolute bottom-0 left-0 right-0 rounded-b-lg px-1 py-0.5"
                                    style={{ backgroundColor: COLORS.primary.brightYellow }}
                                  >
                                    <Text style={{ color: '#000', fontSize: 7, fontWeight: '800', textAlign: 'center' }}>
                                      RUPTURE
                                    </Text>
                                  </View>
                                )}
                              </View>

                              {/* Product Info */}
                              <View className="flex-1 ml-3">
                                <View className="flex-row items-start justify-between">
                                  <View className="flex-1">
                                    <View
                                      className="self-start px-2 py-0.5 rounded-full mb-1"
                                      style={{ backgroundColor: `${PRODUCT_TYPE_COLORS[product.type] ?? COLORS.accent.teal}20` }}
                                    >
                                      <Text
                                        className="text-xs font-bold"
                                        style={{ color: PRODUCT_TYPE_COLORS[product.type] ?? COLORS.accent.teal }}
                                      >
                                        {PRODUCT_TYPE_LABELS[product.type] ?? product.type}
                                      </Text>
                                    </View>
                                    <Text style={{ color: COLORS.text.white }} className="font-bold text-base">
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
                                  <Pressable
                                    onPress={() => handleEditProductInProduits(producer.id, producer.name, product)}
                                    className="flex-row items-center px-3 py-1.5 rounded-lg mr-2"
                                    style={{ backgroundColor: `${COLORS.accent.sky}20` }}
                                  >
                                    <Edit3 size={14} color={COLORS.accent.sky} />
                                    <Text style={{ color: COLORS.accent.sky }} className="text-xs font-semibold ml-1">
                                      Modifier
                                    </Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => handleDeleteProductInProduits(producer.id, product.id)}
                                    className="flex-row items-center px-3 py-1.5 rounded-lg"
                                    style={{ backgroundColor: `${COLORS.accent.red}20` }}
                                  >
                                    <Trash2 size={14} color={COLORS.accent.red} />
                                  </Pressable>
                                </View>
                              </View>
                            </View>
                          </View>
                        );
                      })}

                      {/* Add product button */}
                      <Pressable
                        onPress={() => handleAddProductInProduits(producer.id, producer.name)}
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
                    </View>
                  )}
                </View>
              ))
            )}

            {/* Info Card */}
            {allProducers.length > 0 && (
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
                    Astuce
                  </Text>
                </View>
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm">
                  Cliquez sur un producteur pour voir et gérer ses produits. Vous pouvez ajouter, modifier ou supprimer des produits directement depuis cette page.
                </Text>
              </View>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
              visible={showDeleteProductConfirm}
              transparent
              animationType="fade"
              onRequestClose={() => setShowDeleteProductConfirm(false)}
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
                      onPress={() => setShowDeleteProductConfirm(false)}
                      className="flex-1 py-3 rounded-xl mr-2"
                      style={{ backgroundColor: COLORS.background.mediumBlue }}
                    >
                      <Text style={{ color: COLORS.text.lightGray }} className="text-center font-semibold">
                        Annuler
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={confirmDeleteProduct}
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
          </View>
        );

      case 'sync':
        // Sync functions
        const handlePushToSupabase = async () => {
          if (!isSupabaseSyncConfigured()) {
            Alert.alert('Erreur', 'Supabase non configuré. Ajoutez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans les variables ENV.');
            return;
          }
          setSyncingGlobal(true);
          setSyncErrorGlobal(null);
          try {
            // Push all local producers to Supabase
            for (const producer of allProducers) {
              await syncProducerToSupabase(producer);
            }
            // Push all local lots to Supabase
            for (const lot of lots) {
              await syncLotToSupabase(lot);
            }
            // Push all packs to Supabase
            await syncAllPacksToSupabase(packs);
            // Push all promo products to Supabase
            await syncAllPromoProductsToSupabase(promoProducts);
            Alert.alert('Succès', `${allProducers.length} producteur(s), ${lots.length} lot(s), ${packs.length} pack(s) et ${promoProducts.length} promo(s) synchronisé(s)`);
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur inconnue';
            setSyncErrorGlobal(message);
            Alert.alert('Erreur', message);
          } finally {
            setSyncingGlobal(false);
          }
        };

        const handlePullFromSupabase = async () => {
          if (!isSupabaseSyncConfigured()) {
            Alert.alert('Erreur', 'Supabase non configuré.');
            return;
          }
          setSyncingGlobal(true);
          setSyncErrorGlobal(null);
          try {
            const [producers, lotsFromSupabase, packsFromSupabase, promosFromSupabase] = await Promise.all([
              fetchAllProducersWithProducts(),
              fetchAllLotsWithItems(),
              fetchAllPacksWithItems(),
              fetchPromoProducts(),
            ]);
            setSyncedProducers(producers);
            setSyncedLots(lotsFromSupabase);
            // Update local stores with Supabase data
            if (packsFromSupabase.length > 0) {
              usePacksStore.setState({ packs: packsFromSupabase });
            }
            if (promosFromSupabase.length > 0) {
              usePromoProductsStore.setState({ promoProducts: promosFromSupabase });
            }
            if (producers.length > 0) {
              useProducerStore.setState({ producers });
            }
            if (lotsFromSupabase.length > 0) {
              useLotsStore.setState({ lots: lotsFromSupabase });
            }
            Alert.alert('Succès', `${producers.length} producteur(s), ${lotsFromSupabase.length} lot(s), ${packsFromSupabase.length} pack(s) et ${promosFromSupabase.length} promo(s) récupéré(s)`);
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Erreur inconnue';
            setSyncErrorGlobal(message);
            Alert.alert('Erreur', message);
          } finally {
            setSyncingGlobal(false);
          }
        };

        const totalSyncedProducts = syncedProducers.reduce((sum, p) => sum + p.products.length, 0);

        return (
          <View>
            {/* Status Card */}
            <View
              className="rounded-2xl p-5 mb-4"
              style={{
                backgroundColor: `${COLORS.accent.teal}10`,
                borderWidth: 1,
                borderColor: `${COLORS.accent.teal}30`,
              }}
            >
              <View className="flex-row items-center mb-3">
                <CloudCog size={24} color={COLORS.accent.teal} />
                <Text style={{ color: COLORS.text.white }} className="text-lg font-bold ml-2">
                  Synchronisation Supabase
                </Text>
              </View>
              <Text style={{ color: COLORS.text.lightGray }} className="text-sm mb-2">
                Synchronisez vos producteurs et produits pour que tous les utilisateurs voient les mêmes données.
              </Text>
              {!isSupabaseSyncConfigured() && (
                <View
                  className="rounded-lg p-3 mt-2"
                  style={{ backgroundColor: `${COLORS.accent.red}20` }}
                >
                  <Text style={{ color: COLORS.accent.red }} className="text-sm">
                    Supabase non configuré. Ajoutez les variables ENV.
                  </Text>
                </View>
              )}
              {lastSyncAt && (
                <Text style={{ color: COLORS.text.muted }} className="text-xs mt-2">
                  Dernière sync: {new Date(lastSyncAt).toLocaleString('fr-FR')}
                </Text>
              )}
            </View>

            {/* Error State */}
            {syncErrorGlobal && (
              <View
                className="rounded-xl p-4 mb-4"
                style={{
                  backgroundColor: `${COLORS.accent.red}15`,
                  borderWidth: 1,
                  borderColor: `${COLORS.accent.red}30`,
                }}
              >
                <Text style={{ color: COLORS.accent.red }} className="text-center">
                  {syncErrorGlobal}
                </Text>
              </View>
            )}

            {/* Push to Supabase */}
            <View
              className="rounded-xl p-4 mb-4"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}15`,
              }}
            >
              <View className="flex-row items-center mb-3">
                <Upload size={20} color={COLORS.accent.hemp} />
                <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                  Envoyer vers Supabase
                </Text>
              </View>
              <Text style={{ color: COLORS.text.muted }} className="text-sm mb-3">
                Envoyer tous vos producteurs, produits, lots, packs et promos vers Supabase pour les partager.
              </Text>
              <View className="flex-row items-center flex-wrap mb-3">
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm">
                  {allProducers.length} producteur(s) • {allProducers.reduce((sum, p) => sum + p.products.length, 0)} produit(s) • {lots.length} lot(s) • {packs.length} pack(s) • {promoProducts.length} promo(s)
                </Text>
              </View>
              <Pressable
                onPress={handlePushToSupabase}
                disabled={isSyncingGlobal || !isSupabaseSyncConfigured()}
                className="rounded-xl py-3 flex-row items-center justify-center active:opacity-80"
                style={{
                  backgroundColor: isSupabaseSyncConfigured() ? '#22C55E' : COLORS.text.muted,
                }}
              >
                {isSyncingGlobal ? (
                  <ActivityIndicator size="small" color={COLORS.text.white} />
                ) : (
                  <>
                    <Upload size={18} color={COLORS.text.white} />
                    <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                      Envoyer tout vers Supabase
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Pull from Supabase */}
            <View
              className="rounded-xl p-4 mb-4"
              style={{
                backgroundColor: `${COLORS.text.white}05`,
                borderWidth: 1,
                borderColor: `${COLORS.primary.paleGold}15`,
              }}
            >
              <View className="flex-row items-center mb-3">
                <Download size={20} color={COLORS.accent.sky} />
                <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                  Récupérer depuis Supabase
                </Text>
              </View>
              <Text style={{ color: COLORS.text.muted }} className="text-sm mb-3">
                Télécharger les données depuis Supabase. Les autres utilisateurs verront ces données.
              </Text>
              <Pressable
                onPress={handlePullFromSupabase}
                disabled={isSyncingGlobal || !isSupabaseSyncConfigured()}
                className="rounded-xl py-3 flex-row items-center justify-center active:opacity-80"
                style={{
                  backgroundColor: isSupabaseSyncConfigured() ? COLORS.accent.sky : COLORS.text.muted,
                }}
              >
                {isSyncingGlobal ? (
                  <ActivityIndicator size="small" color={COLORS.text.white} />
                ) : (
                  <>
                    <Download size={18} color={COLORS.text.white} />
                    <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                      Récupérer depuis Supabase
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {/* Synced Data Preview */}
            {syncedProducers.length > 0 && (
              <View
                className="rounded-xl p-4"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.accent.sky}30`,
                }}
              >
                <View className="flex-row items-center mb-3">
                  <Database size={20} color={COLORS.accent.sky} />
                  <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                    Données Supabase ({syncedProducers.length} producteurs)
                  </Text>
                </View>
                <Text style={{ color: COLORS.text.muted }} className="text-sm mb-3">
                  {totalSyncedProducts} produit(s) au total
                </Text>
                {syncedProducers.slice(0, 5).map((producer) => (
                  <View
                    key={producer.id}
                    className="flex-row items-center py-2"
                    style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.text.white}10` }}
                  >
                    <Leaf size={16} color={COLORS.accent.hemp} />
                    <Text style={{ color: COLORS.text.white }} className="ml-2 flex-1">
                      {producer.name}
                    </Text>
                    <Text style={{ color: COLORS.text.muted }} className="text-xs">
                      {producer.products.length} produit(s)
                    </Text>
                  </View>
                ))}
                {syncedProducers.length > 5 && (
                  <Text style={{ color: COLORS.text.muted }} className="text-xs mt-2 text-center">
                    ... et {syncedProducers.length - 5} autres producteurs
                  </Text>
                )}
              </View>
            )}
          </View>
        );

      case 'supabase-data':
        return (
          <View>
            {/* Header with Refresh Button */}
            <View className="flex-row items-center justify-between mb-4">
              <Pressable
                onPress={openSupabaseAddForm}
                className="flex-1 rounded-xl py-4 flex-row items-center justify-center mr-2 active:opacity-80"
                style={{ backgroundColor: '#22C55E' }}
              >
                <Plus size={20} color={COLORS.text.white} />
                <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                  Ajouter
                </Text>
              </Pressable>
              <Pressable
                onPress={loadSupabaseData}
                disabled={supabaseLoading}
                className="rounded-xl py-4 px-4 flex-row items-center justify-center active:opacity-80"
                style={{ backgroundColor: COLORS.accent.sky }}
              >
                {supabaseLoading ? (
                  <ActivityIndicator size="small" color={COLORS.text.white} />
                ) : (
                  <RefreshCw size={20} color={COLORS.text.white} />
                )}
              </Pressable>
            </View>

            {/* Error State */}
            {supabaseError && (
              <View
                className="rounded-xl p-4 mb-4"
                style={{
                  backgroundColor: `${COLORS.accent.red}15`,
                  borderWidth: 1,
                  borderColor: `${COLORS.accent.red}30`,
                }}
              >
                <Text style={{ color: COLORS.accent.red }} className="text-center">
                  {supabaseError}
                </Text>
              </View>
            )}

            {/* Loading State */}
            {supabaseLoading && supabaseData.length === 0 && (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color={COLORS.primary.gold} />
                <Text style={{ color: COLORS.text.muted }} className="mt-2">
                  Chargement...
                </Text>
              </View>
            )}

            {/* Empty State */}
            {!supabaseLoading && !supabaseError && supabaseData.length === 0 && (
              <View
                className="rounded-xl p-6 items-center"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.text.white}10`,
                }}
              >
                <Database size={48} color={COLORS.text.muted} />
                <Text style={{ color: COLORS.text.muted }} className="text-center mt-3">
                  Aucune donnée
                </Text>
                <Text style={{ color: COLORS.text.muted }} className="text-center text-sm mt-1">
                  Ajoutez des produits CBD/tisanes avec le bouton Ajouter
                </Text>
              </View>
            )}

            {/* Data List */}
            {supabaseData.map((item) => (
              <View
                key={item.id}
                className="rounded-xl mb-3 overflow-hidden"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.paleGold}15`,
                }}
              >
                <View className="p-4">
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1 mr-3">
                      <Text style={{ color: COLORS.text.white }} className="font-bold text-base">
                        {item.nom}
                      </Text>
                      {item.description ? (
                        <Text style={{ color: COLORS.text.lightGray }} className="text-sm mt-1">
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    <View
                      className="px-3 py-1.5 rounded-lg"
                      style={{ backgroundColor: `${COLORS.primary.gold}20` }}
                    >
                      <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold">
                        {item.valeur}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: COLORS.text.muted }} className="text-xs mb-3">
                    Créé le {new Date(item.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>

                  <View className="flex-row justify-end pt-3" style={{ borderTopWidth: 1, borderTopColor: `${COLORS.text.white}10` }}>
                    <Pressable
                      onPress={() => openSupabaseEditForm(item)}
                      className="flex-row items-center px-4 py-2 rounded-lg mr-2 active:opacity-70"
                      style={{ backgroundColor: `${COLORS.primary.gold}20` }}
                    >
                      <Edit3 size={16} color={COLORS.primary.gold} />
                      <Text style={{ color: COLORS.primary.gold }} className="font-medium ml-1">
                        Modifier
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleSupabaseDelete(item.id)}
                      className="flex-row items-center px-4 py-2 rounded-lg active:opacity-70"
                      style={{ backgroundColor: `${COLORS.accent.red}20` }}
                    >
                      <Trash2 size={16} color={COLORS.accent.red} />
                      <Text style={{ color: COLORS.accent.red }} className="font-medium ml-1">
                        Supprimer
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))}

            {/* Add/Edit Form Modal */}
            <Modal
              visible={supabaseFormVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setSupabaseFormVisible(false)}
            >
              <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
                <Pressable className="flex-1" onPress={() => setSupabaseFormVisible(false)} />
                <View
                  className="rounded-t-3xl"
                  style={{ backgroundColor: COLORS.background.dark, paddingBottom: insets.bottom + 20 }}
                >
                  <View
                    className="flex-row items-center justify-between px-5 py-4"
                    style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
                  >
                    <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
                      {supabaseEditingItem ? 'Modifier' : 'Ajouter un produit'}
                    </Text>
                    <Pressable onPress={() => setSupabaseFormVisible(false)} className="p-2">
                      <X size={24} color={COLORS.text.white} />
                    </Pressable>
                  </View>

                  <View className="px-5 py-4">
                    <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                      Nom *
                    </Text>
                    <TextInput
                      value={supabaseFormNom}
                      onChangeText={setSupabaseFormNom}
                      placeholder="Ex: Tisane Relaxation"
                      placeholderTextColor={COLORS.text.muted}
                      className="rounded-xl px-4 py-3 mb-4"
                      style={{
                        backgroundColor: `${COLORS.text.white}05`,
                        borderWidth: 1,
                        borderColor: `${COLORS.primary.paleGold}20`,
                        color: COLORS.text.white,
                      }}
                    />

                    <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                      Description
                    </Text>
                    <TextInput
                      value={supabaseFormDescription}
                      onChangeText={setSupabaseFormDescription}
                      placeholder="Description du produit"
                      placeholderTextColor={COLORS.text.muted}
                      multiline
                      numberOfLines={3}
                      className="rounded-xl px-4 py-3 mb-4"
                      style={{
                        backgroundColor: `${COLORS.text.white}05`,
                        borderWidth: 1,
                        borderColor: `${COLORS.primary.paleGold}20`,
                        color: COLORS.text.white,
                        minHeight: 80,
                        textAlignVertical: 'top',
                      }}
                    />

                    <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                      Valeur
                    </Text>
                    <TextInput
                      value={supabaseFormValeur}
                      onChangeText={setSupabaseFormValeur}
                      placeholder="Ex: 15€"
                      placeholderTextColor={COLORS.text.muted}
                      className="rounded-xl px-4 py-3 mb-6"
                      style={{
                        backgroundColor: `${COLORS.text.white}05`,
                        borderWidth: 1,
                        borderColor: `${COLORS.primary.paleGold}20`,
                        color: COLORS.text.white,
                      }}
                    />

                    <Pressable
                      onPress={handleSupabaseSave}
                      disabled={supabaseLoading || !supabaseFormNom.trim()}
                      className="rounded-xl py-4 items-center active:opacity-80"
                      style={{
                        backgroundColor: supabaseFormNom.trim() ? '#22C55E' : COLORS.text.muted,
                      }}
                    >
                      {supabaseLoading ? (
                        <ActivityIndicator size="small" color={COLORS.text.white} />
                      ) : (
                        <Text style={{ color: COLORS.text.white }} className="font-bold">
                          {supabaseEditingItem ? 'Enregistrer' : 'Ajouter'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        );

      default:
        return null;
    }
  };

  // Check admin or producer permissions - deny access if neither
  if (!isAdmin && !isProducer) {
    return (
      <View className="flex-1 items-center justify-center px-6" style={{ backgroundColor: COLORS.background.dark }}>
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-4"
          style={{ backgroundColor: `${COLORS.accent.red}20` }}
        >
          <AlertTriangle size={48} color={COLORS.accent.red} />
        </View>
        <Text style={{ color: COLORS.text.cream }} className="text-xl font-bold text-center mb-2">
          Non autorisé
        </Text>
        <Text style={{ color: COLORS.text.muted }} className="text-center">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
          Seuls les administrateurs et producteurs peuvent accéder au panneau de contrôle.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background.dark, paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Settings size={24} color={COLORS.primary.paleGold} />
          <Text style={{ color: COLORS.text.white }} className="text-2xl font-bold ml-2">
            Administration
          </Text>
        </View>
        <Pressable
          onPress={resetToDefaults}
          className="flex-row items-center px-3 py-2 rounded-xl"
          style={{ backgroundColor: `${COLORS.text.white}10` }}
        >
          <RotateCcw size={16} color={COLORS.text.muted} />
          <Text style={{ color: COLORS.text.muted }} className="text-sm ml-1">Reset</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-3 py-2"
        style={{ flexGrow: 0 }}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id)}
            className="flex-row items-center px-4 py-2 mx-1 rounded-xl"
            style={{
              backgroundColor: activeTab === tab.id ? `${COLORS.primary.gold}30` : `${COLORS.text.white}05`,
              borderWidth: 1,
              borderColor: activeTab === tab.id ? COLORS.primary.gold : 'transparent',
            }}
          >
            {tab.icon}
            <Text
              style={{ color: activeTab === tab.id ? COLORS.primary.brightYellow : COLORS.text.muted }}
              className="text-sm font-medium ml-2"
            >
              {tab.label}
            </Text>
            <View
              className="ml-2 px-2 py-0.5 rounded-full"
              style={{ backgroundColor: activeTab === tab.id ? COLORS.primary.gold : `${COLORS.text.white}10` }}
            >
              <Text
                style={{ color: activeTab === tab.id ? COLORS.text.white : COLORS.text.muted }}
                className="text-xs font-bold"
              >
                {tab.count}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {renderContent()}
        <View className="h-24" />
      </ScrollView>

      {/* Add Button (not for producers and lots tabs - they have their own buttons) */}
      {activeTab !== 'producers' && activeTab !== 'lots' && activeTab !== 'tabs' && activeTab !== 'produits-view' && activeTab !== 'supabase-data' && activeTab !== 'sync' && activeTab !== 'producer-orders' && (
        <View className="absolute bottom-0 left-0 right-0 px-5" style={{ paddingBottom: insets.bottom + 16 }}>
          <Pressable
            onPress={openAddModal}
            className="rounded-2xl py-4 flex-row items-center justify-center active:opacity-80"
            style={{ backgroundColor: COLORS.primary.gold }}
          >
            <Plus size={24} color={COLORS.text.white} />
            <Text style={{ color: COLORS.text.white }} className="font-bold text-lg ml-2">
              Ajouter
            </Text>
          </Pressable>
        </View>
      )}

      {/* Edit Modal */}
      <EditModal
        visible={editModal.visible}
        title={editModal.title}
        value={editModal.value}
        color={editModal.color}
        onSave={editModal.onSave}
        onColorChange={editModal.onColorChange}
        onClose={() => setEditModal((m) => ({ ...m, visible: false }))}
      />

      {/* Add/Edit Producer Modal */}
      <AddProducerModal
        visible={addProducerVisible}
        onClose={() => {
          setAddProducerVisible(false);
          setEditingProducer(null);
        }}
        editingProducer={editingProducer}
      />

      {/* Add/Edit Lot Modal */}
      <AddLotModal
        visible={addLotVisible}
        onClose={() => {
          setAddLotVisible(false);
          setEditingLot(null);
        }}
        editingLot={editingLot}
      />

      {/* Add Order Modal */}
      <AddOrderModal
        visible={addOrderVisible}
        onClose={() => setAddOrderVisible(false)}
      />

      {/* Add/Edit Stock Modal */}
      <AddStockModal
        visible={addStockVisible}
        onClose={() => {
          setAddStockVisible(false);
          setEditingStock(null);
        }}
        editingItem={editingStock}
      />

      {/* Add Product Modal */}
      {selectedProducerForProduct && (
        <AddProductModal
          visible={addProductVisible}
          producerId={selectedProducerForProduct.id}
          producerName={selectedProducerForProduct.name}
          onClose={() => {
            setAddProductVisible(false);
            setSelectedProducerForProduct(null);
          }}
        />
      )}

      {/* Add Product Modal for Produits View */}
      <AddProductModal
        visible={produitsAddModalVisible}
        producerId={selectedProducerIdForProduits}
        producerName={selectedProducerNameForProduits}
        onClose={() => {
          setProduitsAddModalVisible(false);
          setEditingProductForProduits(null);
        }}
        editingProduct={editingProductForProduits}
      />

      {/* Add/Edit Promo Modal */}
      <AddPromoModal
        visible={addPromoVisible}
        onClose={() => {
          setAddPromoVisible(false);
          setEditingPromo(null);
        }}
        editingPromo={editingPromo}
      />

      {/* Add Promo Product Modal */}
      <AddPromoProductModal
        visible={addPromoProductVisible}
        onClose={() => setAddPromoProductVisible(false)}
        producers={allProducers}
      />

      {/* Order Details Modal */}
      <Modal
        visible={!!selectedOrder}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedOrder(null)}
      >
        {selectedOrder && (
          <View style={{ flex: 1, backgroundColor: COLORS.background.dark, paddingTop: insets.top }}>
            {/* Header */}
            <View
              className="flex-row items-center justify-between px-5 py-4"
              style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
            >
              <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
                Détails commande
              </Text>
              <Pressable onPress={() => setSelectedOrder(null)} className="p-2">
                <X size={24} color={COLORS.text.white} />
              </Pressable>
            </View>

            <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
              <View className="py-4">
                {/* Order Status */}
                <View className="mb-4">
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                    Statut de la commande
                  </Text>
                  <View className="flex-row flex-wrap">
                    {(['pending', 'payment_sent', 'paid', 'shipped', 'cancelled'] as OrderStatus[]).map((status) => {
                      const isActive = selectedOrder.status === status;
                      const config = ORDER_STATUS_CONFIG[status];
                      return (
                        <Pressable
                          key={status}
                          onPress={() => {
                            handleOrderStatusChange(selectedOrder.id, status, selectedOrder);
                            setSelectedOrder({ ...selectedOrder, status });
                          }}
                          className="mr-2 mb-2 px-4 py-2 rounded-lg"
                          style={{
                            backgroundColor: isActive ? config.color : `${config.color}20`,
                            borderWidth: 1,
                            borderColor: config.color,
                          }}
                        >
                          <Text style={{ color: isActive ? '#fff' : config.color }} className="text-sm font-medium">
                            {config.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Tracking Number (visible when shipped) */}
                {(selectedOrder.status === 'shipped' || selectedOrder.trackingNumber) && (
                  <View
                    className="rounded-xl p-4 mb-4"
                    style={{
                      backgroundColor: `${ORDER_STATUS_CONFIG.shipped.color}15`,
                      borderWidth: 1,
                      borderColor: `${ORDER_STATUS_CONFIG.shipped.color}30`,
                    }}
                  >
                    <View className="flex-row items-center mb-3">
                      <Truck size={18} color={ORDER_STATUS_CONFIG.shipped.color} />
                      <Text style={{ color: ORDER_STATUS_CONFIG.shipped.color }} className="font-bold ml-2">
                        Numéro de suivi
                      </Text>
                    </View>
                    <TextInput
                      value={selectedOrder.trackingNumber || ''}
                      onChangeText={(text) => {
                        updateOrderTrackingNumber(selectedOrder.id, text);
                        setSelectedOrder({ ...selectedOrder, trackingNumber: text });
                      }}
                      placeholder="Entrez le numéro de suivi..."
                      placeholderTextColor={COLORS.text.muted}
                      className="rounded-xl px-4 py-3"
                      style={{
                        backgroundColor: `${COLORS.text.white}10`,
                        borderWidth: 1,
                        borderColor: `${ORDER_STATUS_CONFIG.shipped.color}30`,
                        color: COLORS.text.white,
                      }}
                    />
                  </View>
                )}

                {/* Customer Info */}
                <View
                  className="rounded-xl p-4 mb-4"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}15`,
                  }}
                >
                  <Text style={{ color: COLORS.primary.paleGold }} className="font-bold mb-3">
                    Informations client
                  </Text>

                  <View className="flex-row items-center mb-2">
                    <Users size={16} color={COLORS.text.muted} />
                    <Text style={{ color: COLORS.text.white }} className="ml-2 font-medium">
                      {selectedOrder.customerInfo.firstName} {selectedOrder.customerInfo.lastName}
                    </Text>
                  </View>

                  <View className="flex-row items-center mb-2">
                    <Mail size={16} color={COLORS.text.muted} />
                    <Text style={{ color: COLORS.text.lightGray }} className="ml-2">
                      {selectedOrder.customerInfo.email}
                    </Text>
                  </View>

                  <View className="flex-row items-center mb-2">
                    <Phone size={16} color={COLORS.text.muted} />
                    <Text style={{ color: COLORS.text.lightGray }} className="ml-2">
                      {selectedOrder.customerInfo.phone}
                    </Text>
                  </View>

                  <View className="flex-row items-start">
                    <Home size={16} color={COLORS.text.muted} style={{ marginTop: 2 }} />
                    <Text style={{ color: COLORS.text.lightGray }} className="ml-2 flex-1">
                      {selectedOrder.customerInfo.address}{'\n'}
                      {selectedOrder.customerInfo.postalCode} {selectedOrder.customerInfo.city}
                    </Text>
                  </View>
                </View>

                {/* Order Items */}
                <View
                  className="rounded-xl p-4 mb-4"
                  style={{
                    backgroundColor: `${COLORS.text.white}05`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.paleGold}15`,
                  }}
                >
                  <Text style={{ color: COLORS.primary.paleGold }} className="font-bold mb-3">
                    Articles commandés
                  </Text>

                  {selectedOrder.items.map((item, index) => (
                    <View
                      key={index}
                      className="flex-row items-center justify-between py-3"
                      style={{
                        borderBottomWidth: index < selectedOrder.items.length - 1 ? 1 : 0,
                        borderBottomColor: `${COLORS.text.white}10`,
                      }}
                    >
                      <View className="flex-1">
                        <Text style={{ color: COLORS.text.white }} className="font-medium">
                          {item.productName}
                        </Text>
                        <Text style={{ color: COLORS.text.muted }} className="text-xs">
                          {item.productType} • {item.producerName}
                        </Text>
                        <Text style={{ color: COLORS.text.lightGray }} className="text-sm mt-1">
                          {item.quantity} x {item.unitPrice.toFixed(2)}€
                        </Text>
                      </View>
                      <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold">
                        {item.totalPrice.toFixed(2)}€
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Order Total */}
                <View
                  className="rounded-xl p-4 mb-4"
                  style={{
                    backgroundColor: `${COLORS.primary.gold}15`,
                    borderWidth: 1,
                    borderColor: `${COLORS.primary.gold}30`,
                  }}
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <Text style={{ color: COLORS.text.lightGray }}>Sous-total</Text>
                    <Text style={{ color: COLORS.text.white }}>{selectedOrder.subtotal.toFixed(2)}€</Text>
                  </View>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text style={{ color: COLORS.text.lightGray }}>Frais de port</Text>
                    <Text style={{ color: selectedOrder.shippingFee === 0 ? COLORS.accent.hemp : COLORS.text.white }}>
                      {selectedOrder.shippingFee === 0 ? 'OFFERTS' : `${selectedOrder.shippingFee.toFixed(2)}€`}
                    </Text>
                  </View>
                  {/* TVA due à l'État */}
                  <View
                    className="flex-row justify-between py-2 px-3 rounded-lg mb-2"
                    style={{ backgroundColor: 'rgba(199, 91, 91, 0.15)', borderWidth: 1, borderColor: 'rgba(199, 91, 91, 0.4)' }}
                  >
                    <Text style={{ color: '#C75B5B' }} className="text-sm font-semibold">TVA due à l'État</Text>
                    <Text style={{ color: '#C75B5B' }} className="font-bold">
                      {selectedOrder.items.reduce((sum, item) => {
                        const tvaRate = item.tvaRate ?? 20;
                        const tva = item.totalPrice - (item.totalPrice / (1 + tvaRate / 100));
                        return sum + tva;
                      }, 0).toFixed(2)}€
                    </Text>
                  </View>
                  <View className="flex-row justify-between items-center pt-2" style={{ borderTopWidth: 1, borderTopColor: `${COLORS.primary.gold}30` }}>
                    <Text style={{ color: COLORS.text.white }} className="font-bold text-lg">Total</Text>
                    <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold text-2xl">
                      {selectedOrder.total.toFixed(2)}€
                    </Text>
                  </View>
                </View>

                {/* Order Date */}
                <View className="flex-row items-center mb-4">
                  <Clock size={16} color={COLORS.text.muted} />
                  <Text style={{ color: COLORS.text.muted }} className="ml-2 text-sm">
                    Commande passée le {new Date(selectedOrder.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {/* Payment Validation Section */}
                <View
                  className="rounded-xl p-4 mb-4"
                  style={{
                    backgroundColor: selectedOrder.paymentValidated
                      ? `${COLORS.accent.hemp}15`
                      : `${COLORS.primary.brightYellow}15`,
                    borderWidth: 1,
                    borderColor: selectedOrder.paymentValidated
                      ? `${COLORS.accent.hemp}40`
                      : `${COLORS.primary.brightYellow}40`,
                  }}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center">
                      <CreditCard size={18} color={selectedOrder.paymentValidated ? COLORS.accent.hemp : COLORS.primary.brightYellow} />
                      <Text
                        style={{ color: selectedOrder.paymentValidated ? COLORS.accent.hemp : COLORS.primary.brightYellow }}
                        className="font-bold ml-2"
                      >
                        Validation du paiement
                      </Text>
                    </View>
                    {selectedOrder.paymentValidated && (
                      <View
                        className="px-3 py-1 rounded-full"
                        style={{ backgroundColor: `${COLORS.accent.hemp}30` }}
                      >
                        <Text style={{ color: COLORS.accent.hemp }} className="text-xs font-bold">
                          VALIDÉ
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Tickets info */}
                  <View className="flex-row items-center justify-between mb-3 py-2 px-3 rounded-lg" style={{ backgroundColor: `${COLORS.text.white}05` }}>
                    <Text style={{ color: COLORS.text.lightGray }} className="text-sm">
                      Tickets à distribuer
                    </Text>
                    <View className="flex-row items-center">
                      <Ticket size={16} color={COLORS.primary.brightYellow} />
                      <Text style={{ color: COLORS.primary.brightYellow }} className="font-bold ml-1">
                        {selectedOrder.ticketsEarned || Math.floor(selectedOrder.total / 20)} ticket{(selectedOrder.ticketsEarned || Math.floor(selectedOrder.total / 20)) > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </View>

                  {selectedOrder.paymentValidated ? (
                    <View>
                      <Text style={{ color: COLORS.text.muted }} className="text-xs mb-2">
                        Paiement validé le {selectedOrder.paymentValidatedAt
                          ? new Date(selectedOrder.paymentValidatedAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'N/A'}
                      </Text>
                      {selectedOrder.ticketsDistributed ? (
                        <View className="flex-row items-center">
                          <Check size={16} color={COLORS.accent.hemp} />
                          <Text style={{ color: COLORS.accent.hemp }} className="text-sm ml-2">
                            Tickets distribués au client
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ color: COLORS.text.muted }} className="text-xs">
                          En attente de notification au client
                        </Text>
                      )}
                    </View>
                  ) : (
                    <Pressable
                      onPress={async () => {
                        const result = validatePayment(selectedOrder.id);
                        if (result.success && result.ticketsDistributed > 0) {
                          // Note: In a real app, tickets would be distributed to the client's account
                          // For now, we just mark them as distributed
                          // The addTickets would need the client's user context
                          markTicketsDistributed(selectedOrder.id);

                          // Update the selected order state to reflect changes
                          setSelectedOrder({
                            ...selectedOrder,
                            paymentValidated: true,
                            paymentValidatedAt: Date.now(),
                            ticketsDistributed: true,
                            status: 'paid',
                          });

                          // Sync to Supabase
                          if (isSupabaseSyncConfigured()) {
                            try {
                              await updateOrderInSupabase(selectedOrder.id, {
                                status: 'paid',
                                paymentValidated: true,
                                paymentValidatedAt: Date.now(),
                                ticketsDistributed: true,
                              });
                            } catch (error) {
                              console.error('Error syncing payment validation to Supabase:', error);
                            }
                          }

                          Alert.alert(
                            'Paiement validé',
                            `${result.ticketsDistributed} ticket${result.ticketsDistributed > 1 ? 's' : ''} seront distribués au client.`,
                            [{ text: 'OK' }]
                          );
                        }
                      }}
                      className="rounded-xl py-3 items-center active:opacity-80"
                      style={{
                        backgroundColor: COLORS.accent.hemp,
                      }}
                    >
                      <View className="flex-row items-center">
                        <Check size={18} color="#fff" />
                        <Text style={{ color: '#fff' }} className="font-bold ml-2">
                          Valider le paiement
                        </Text>
                      </View>
                    </Pressable>
                  )}
                </View>

                {/* Delete Order Button */}
                <Pressable
                  onPress={() => {
                    deleteOrder(selectedOrder.id);
                    setSelectedOrder(null);
                  }}
                  className="rounded-xl py-4 flex-row items-center justify-center mb-8 active:opacity-80"
                  style={{
                    backgroundColor: `${COLORS.accent.red}20`,
                    borderWidth: 1,
                    borderColor: `${COLORS.accent.red}40`,
                  }}
                >
                  <Trash2 size={20} color={COLORS.accent.red} />
                  <Text style={{ color: COLORS.accent.red }} className="font-bold ml-2">
                    Supprimer la commande
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Add User Modal */}
      <Modal
        visible={addUserModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddUserModalVisible(false)}
      >
        <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <Pressable className="flex-1" onPress={() => setAddUserModalVisible(false)} />
          <View
            className="rounded-t-3xl"
            style={{ backgroundColor: COLORS.background.dark, paddingBottom: insets.bottom + 20, maxHeight: '80%' }}
          >
            <View
              className="flex-row items-center justify-between px-5 py-4"
              style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
            >
              <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
                Ajouter un utilisateur
              </Text>
              <Pressable onPress={() => setAddUserModalVisible(false)} className="p-2">
                <X size={24} color={COLORS.text.white} />
              </Pressable>
            </View>

            <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
              <View className="py-4">
                {/* Email input */}
                <View className="mb-4">
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                    Email *
                  </Text>
                  <TextInput
                    value={newUserEmail}
                    onChangeText={setNewUserEmail}
                    placeholder="exemple@email.com"
                    placeholderTextColor={COLORS.text.muted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: `${COLORS.text.white}05`,
                      borderWidth: 1,
                      borderColor: `${COLORS.primary.paleGold}20`,
                      color: COLORS.text.white,
                    }}
                  />
                </View>

                {/* Full name input */}
                <View className="mb-4">
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                    Nom complet
                  </Text>
                  <TextInput
                    value={newUserFullName}
                    onChangeText={setNewUserFullName}
                    placeholder="Jean Dupont"
                    placeholderTextColor={COLORS.text.muted}
                    className="rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: `${COLORS.text.white}05`,
                      borderWidth: 1,
                      borderColor: `${COLORS.primary.paleGold}20`,
                      color: COLORS.text.white,
                    }}
                  />
                </View>

                {/* Role selector */}
                <View className="mb-4">
                  <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                    Rôle
                  </Text>
                  <View className="flex-row flex-wrap">
                    {(['client', 'pro', 'producer', 'admin'] as UserRole[]).map((role) => (
                      <Pressable
                        key={role}
                        onPress={() => setNewUserRole(role)}
                        className="mr-2 mb-2 px-4 py-2 rounded-lg"
                        style={{
                          backgroundColor: newUserRole === role ? USER_ROLE_COLORS[role] : `${USER_ROLE_COLORS[role]}20`,
                          borderWidth: 1,
                          borderColor: USER_ROLE_COLORS[role],
                        }}
                      >
                        <Text style={{ color: newUserRole === role ? '#fff' : USER_ROLE_COLORS[role] }} className="text-sm font-medium">
                          {USER_ROLE_LABELS[role]}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Category selector (only for pro) */}
                {newUserRole === 'pro' && (
                  <View className="mb-4">
                    <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                      Catégorie professionnelle
                    </Text>
                    <View className="flex-row flex-wrap">
                      {(['restaurateur', 'epicerie', 'grossiste', 'producteur_maraicher', 'autre'] as UserCategory[]).map((cat) => (
                        <Pressable
                          key={cat ?? 'null'}
                          onPress={() => setNewUserCategory(cat)}
                          className="mr-2 mb-2 px-3 py-2 rounded-lg"
                          style={{
                            backgroundColor: newUserCategory === cat ? COLORS.accent.teal : `${COLORS.accent.teal}20`,
                            borderWidth: 1,
                            borderColor: COLORS.accent.teal,
                          }}
                        >
                          <Text style={{ color: newUserCategory === cat ? '#fff' : COLORS.accent.teal }} className="text-xs font-medium">
                            {cat ? USER_CATEGORY_LABELS[cat] : 'Aucune'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* Info note */}
                <View
                  className="rounded-xl p-3 mb-4"
                  style={{
                    backgroundColor: `${COLORS.accent.teal}15`,
                    borderWidth: 1,
                    borderColor: `${COLORS.accent.teal}30`,
                  }}
                >
                  <Text style={{ color: COLORS.accent.teal }} className="text-xs">
                    L'utilisateur sera créé avec ce profil. Il pourra ensuite se connecter avec cet email via l'écran de connexion.
                  </Text>
                </View>

                {/* Add button */}
                <Pressable
                  onPress={handleAddUser}
                  disabled={addUserLoading || !newUserEmail.trim()}
                  className="rounded-xl py-4 flex-row items-center justify-center mb-4 active:opacity-80"
                  style={{
                    backgroundColor: newUserEmail.trim() ? COLORS.primary.gold : `${COLORS.primary.gold}50`,
                    opacity: addUserLoading ? 0.6 : 1
                  }}
                >
                  {addUserLoading ? (
                    <ActivityIndicator size="small" color={COLORS.text.white} />
                  ) : (
                    <>
                      <Plus size={20} color={COLORS.text.white} />
                      <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                        Créer l'utilisateur
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* User Edit Modal */}
      <Modal
        visible={userEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUserEditModalVisible(false)}
      >
        <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <Pressable className="flex-1" onPress={() => setUserEditModalVisible(false)} />
          <View
            className="rounded-t-3xl"
            style={{ backgroundColor: COLORS.background.dark, paddingBottom: insets.bottom + 20, maxHeight: '80%' }}
          >
            <View
              className="flex-row items-center justify-between px-5 py-4"
              style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
            >
              <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
                Modifier l'utilisateur
              </Text>
              <Pressable onPress={() => setUserEditModalVisible(false)} className="p-2">
                <X size={24} color={COLORS.text.white} />
              </Pressable>
            </View>

            <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
              <View className="py-4">
                {/* User info display */}
                {selectedUser && (
                  <>
                    <View className="mb-4">
                      <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-1">
                        Nom complet
                      </Text>
                      <Text style={{ color: COLORS.text.white }} className="text-base">
                        {selectedUser.full_name || 'Sans nom'}
                      </Text>
                    </View>

                    <View className="mb-4">
                      <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-1">
                        Email
                      </Text>
                      <Text style={{ color: COLORS.text.white }} className="text-base">
                        {selectedUser.email || 'Pas d\'email'}
                      </Text>
                    </View>

                    {/* Role selector */}
                    <View className="mb-4">
                      <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                        Rôle
                      </Text>
                      <View className="flex-row flex-wrap">
                        {(['client', 'pro', 'producer', 'admin'] as UserRole[]).map((role) => (
                          <Pressable
                            key={role}
                            onPress={() => setEditingUserRole(role)}
                            className="mr-2 mb-2 px-4 py-2 rounded-lg"
                            style={{
                              backgroundColor: editingUserRole === role ? USER_ROLE_COLORS[role] : `${USER_ROLE_COLORS[role]}20`,
                              borderWidth: 1,
                              borderColor: USER_ROLE_COLORS[role],
                            }}
                          >
                            <Text style={{ color: editingUserRole === role ? '#fff' : USER_ROLE_COLORS[role] }} className="text-sm font-medium">
                              {USER_ROLE_LABELS[role]}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </View>

                    {/* Category selector (only for pro) */}
                    {editingUserRole === 'pro' && (
                      <View className="mb-4">
                        <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                          Catégorie professionnelle
                        </Text>
                        <View className="flex-row flex-wrap">
                          {(['restaurateur', 'epicerie', 'grossiste', 'producteur_maraicher', 'autre'] as UserCategory[]).map((cat) => (
                            <Pressable
                              key={cat ?? 'null'}
                              onPress={() => setEditingUserCategory(cat)}
                              className="mr-2 mb-2 px-3 py-2 rounded-lg"
                              style={{
                                backgroundColor: editingUserCategory === cat ? COLORS.accent.teal : `${COLORS.accent.teal}20`,
                                borderWidth: 1,
                                borderColor: COLORS.accent.teal,
                              }}
                            >
                              <Text style={{ color: editingUserCategory === cat ? '#fff' : COLORS.accent.teal }} className="text-xs font-medium">
                                {cat ? USER_CATEGORY_LABELS[cat] : 'Aucune'}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}

                    {/* SIRET input */}
                    <View className="mb-4">
                      <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                        SIRET
                      </Text>
                      <TextInput
                        value={editingUserSiret}
                        onChangeText={setEditingUserSiret}
                        placeholder="Numéro SIRET..."
                        placeholderTextColor={COLORS.text.muted}
                        className="rounded-xl px-4 py-3"
                        style={{
                          backgroundColor: `${COLORS.text.white}05`,
                          borderWidth: 1,
                          borderColor: `${COLORS.primary.paleGold}20`,
                          color: COLORS.text.white,
                        }}
                        keyboardType="numeric"
                      />
                    </View>

                    {/* TVA input */}
                    <View className="mb-4">
                      <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
                        Numéro de TVA
                      </Text>
                      <TextInput
                        value={editingUserTva}
                        onChangeText={setEditingUserTva}
                        placeholder="Numéro de TVA intracommunautaire..."
                        placeholderTextColor={COLORS.text.muted}
                        className="rounded-xl px-4 py-3"
                        style={{
                          backgroundColor: `${COLORS.text.white}05`,
                          borderWidth: 1,
                          borderColor: `${COLORS.primary.paleGold}20`,
                          color: COLORS.text.white,
                        }}
                      />
                    </View>

                    {/* Save button */}
                    <Pressable
                      onPress={handleSaveUserChanges}
                      disabled={usersLoading}
                      className="rounded-xl py-4 flex-row items-center justify-center mb-4 active:opacity-80"
                      style={{ backgroundColor: COLORS.primary.gold, opacity: usersLoading ? 0.6 : 1 }}
                    >
                      {usersLoading ? (
                        <ActivityIndicator size="small" color={COLORS.text.white} />
                      ) : (
                        <>
                          <Check size={20} color={COLORS.text.white} />
                          <Text style={{ color: COLORS.text.white }} className="font-bold ml-2">
                            Enregistrer les modifications
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Link Producer to Profile Modal */}
      <Modal
        visible={linkProducerModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLinkProducerModalVisible(false)}
      >
        <View className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}>
          <Pressable className="flex-1" onPress={() => setLinkProducerModalVisible(false)} />
          <View
            className="rounded-t-3xl"
            style={{ backgroundColor: COLORS.background.dark, paddingBottom: insets.bottom + 20, maxHeight: '70%' }}
          >
            <View
              className="flex-row items-center justify-between px-5 py-4"
              style={{ borderBottomWidth: 1, borderBottomColor: `${COLORS.primary.paleGold}15` }}
            >
              <View className="flex-1">
                <Text style={{ color: COLORS.text.white }} className="text-xl font-bold">
                  Lier à un compte
                </Text>
                {selectedProducerForLink && (
                  <Text style={{ color: COLORS.text.muted }} className="text-sm mt-1">
                    Producteur: {selectedProducerForLink.name}
                  </Text>
                )}
              </View>
              <Pressable onPress={() => setLinkProducerModalVisible(false)} className="p-2">
                <X size={24} color={COLORS.text.white} />
              </Pressable>
            </View>

            <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
              <View className="py-4">
                {/* Unlink option */}
                {selectedProducerForLink?.profile_id && (
                  <Pressable
                    onPress={() => handleLinkProducer(null)}
                    className="rounded-xl p-4 mb-4 flex-row items-center active:opacity-80"
                    style={{
                      backgroundColor: `${COLORS.accent.red}15`,
                      borderWidth: 1,
                      borderColor: `${COLORS.accent.red}30`,
                    }}
                  >
                    <Unlink size={20} color={COLORS.accent.red} />
                    <Text style={{ color: COLORS.accent.red }} className="font-medium ml-3">
                      Délier ce producteur
                    </Text>
                  </Pressable>
                )}

                {/* List of producer users */}
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-3">
                  Comptes avec rôle "Producteur"
                </Text>

                {producerUsers.length === 0 ? (
                  <View
                    className="rounded-xl p-4 items-center"
                    style={{
                      backgroundColor: `${COLORS.text.white}05`,
                      borderWidth: 1,
                      borderColor: `${COLORS.text.white}10`,
                    }}
                  >
                    <UserCog size={32} color={COLORS.text.muted} />
                    <Text style={{ color: COLORS.text.muted }} className="text-center mt-2 text-sm">
                      Aucun compte avec le rôle "Producteur"
                    </Text>
                    <Text style={{ color: COLORS.text.muted }} className="text-center text-xs mt-1">
                      Allez dans l'onglet "Utilisateurs" et changez le rôle d'un compte en "Producteur"
                    </Text>
                  </View>
                ) : (
                  producerUsers.map((user) => {
                    const isSelected = selectedProducerForLink?.profile_id === user.id;
                    return (
                      <Pressable
                        key={user.id}
                        onPress={() => handleLinkProducer(user.id)}
                        className="rounded-xl p-4 mb-2 flex-row items-center active:opacity-80"
                        style={{
                          backgroundColor: isSelected ? `${COLORS.accent.hemp}20` : `${COLORS.text.white}05`,
                          borderWidth: 1,
                          borderColor: isSelected ? COLORS.accent.hemp : `${COLORS.primary.paleGold}15`,
                        }}
                      >
                        <View className="flex-1">
                          <Text style={{ color: COLORS.text.white }} className="font-medium">
                            {user.full_name || 'Sans nom'}
                          </Text>
                          <Text style={{ color: COLORS.text.muted }} className="text-sm">
                            {user.email}
                          </Text>
                        </View>
                        {isSelected && (
                          <View
                            className="px-2 py-1 rounded-full"
                            style={{ backgroundColor: COLORS.accent.hemp }}
                          >
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>
                              Lié
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
