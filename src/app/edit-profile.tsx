/**
 * Edit Profile Screen - Les Chanvriers Unis
 * Écran dédié à l'édition du profil utilisateur
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  Hash,
  CheckCircle,
  Save,
  Sparkles,
} from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { useCustomerInfoStore, CustomerInfo } from '@/lib/store';
import { Toast, useToast } from '@/components/Toast';
import { useAuth } from '@/lib/useAuth';
import { OfflineDisabledButton } from '@/components/OfflineDisabledButton';
import { useOfflineStatus } from '@/lib/network-context';
import { WifiOff } from 'lucide-react-native';

interface FormField {
  key: keyof CustomerInfo;
  label: string;
  placeholder: string;
  icon: React.ElementType;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

const FORM_FIELDS: FormField[] = [
  {
    key: 'firstName',
    label: 'Prénom',
    placeholder: 'Votre prénom',
    icon: User,
    autoCapitalize: 'words',
  },
  {
    key: 'lastName',
    label: 'Nom',
    placeholder: 'Votre nom',
    icon: User,
    autoCapitalize: 'words',
  },
  {
    key: 'email',
    label: 'Email',
    placeholder: 'votre@email.com',
    icon: Mail,
    keyboardType: 'email-address',
    autoCapitalize: 'none',
  },
  {
    key: 'phone',
    label: 'Téléphone',
    placeholder: '06 12 34 56 78',
    icon: Phone,
    keyboardType: 'phone-pad',
  },
  {
    key: 'address',
    label: 'Adresse',
    placeholder: '123 rue des Chanvriers',
    icon: Home,
    autoCapitalize: 'words',
  },
  {
    key: 'city',
    label: 'Ville',
    placeholder: 'Votre ville',
    icon: MapPin,
    autoCapitalize: 'words',
  },
  {
    key: 'postalCode',
    label: 'Code postal',
    placeholder: '75001',
    icon: Hash,
    keyboardType: 'numeric',
  },
];

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { toast, showToast, hideToast } = useToast();
  const { profile, updateProfile, refresh } = useAuth();
  const { isOffline } = useOfflineStatus();

  // Store
  const customerInfo = useCustomerInfoStore((s) => s.customerInfo);
  const setCustomerInfo = useCustomerInfoStore((s) => s.setCustomerInfo);
  const isProfileComplete = useCustomerInfoStore((s) => s.isProfileComplete);

  // Local form state
  const [formData, setFormData] = useState<CustomerInfo>(customerInfo);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form with current data
  useEffect(() => {
    setFormData(customerInfo);
  }, [customerInfo]);

  // Check for changes
  useEffect(() => {
    const changed = Object.keys(formData).some(
      (key) => formData[key as keyof CustomerInfo] !== customerInfo[key as keyof CustomerInfo]
    );
    setHasChanges(changed);
  }, [formData, customerInfo]);

  const handleFieldChange = (key: keyof CustomerInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string): boolean => {
    // Accept French phone numbers (10 digits, starting with 0)
    const cleanPhone = phone.replace(/\s/g, '');
    return /^0[1-9][0-9]{8}$/.test(cleanPhone);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      showToast('Veuillez renseigner votre nom et prénom.', 'warning');
      return;
    }

    if (!validateEmail(formData.email)) {
      showToast('Veuillez entrer une adresse email valide.', 'warning');
      return;
    }

    if (formData.phone && !validatePhone(formData.phone)) {
      showToast('Veuillez entrer un numéro de téléphone valide.', 'warning');
      return;
    }

    setIsSaving(true);

    try {
      // Save to local store
      setCustomerInfo(formData);

      // Save to Supabase if user is authenticated
      if (profile?.id) {
        try {
          await updateProfile({
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: `${formData.firstName} ${formData.lastName}`,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            postal_code: formData.postalCode,
          });
          // Refresh profile data
          await refresh();
        } catch (error) {
          console.error('[EditProfile] Supabase update error:', error);
          showToast('Profil sauvegardé localement. Synchronisation en cours...', 'info');
        }
      }

      showToast('Profil mis à jour avec succès !', 'success');

      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error('[EditProfile] Save error:', error);
      showToast('Erreur lors de la sauvegarde. Veuillez réessayer.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldStatus = (key: keyof CustomerInfo): 'empty' | 'filled' | 'error' => {
    const value = formData[key]?.trim();
    if (!value) return 'empty';

    if (key === 'email' && !validateEmail(value)) return 'error';
    if (key === 'phone' && value && !validatePhone(value)) return 'error';

    return 'filled';
  };

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background.nightSky }}>
      {/* Decorative gradient */}
      <LinearGradient
        colors={[`${COLORS.primary.gold}15`, 'transparent', `${COLORS.accent.forest}10`]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      {/* Header */}
      <View style={{ paddingTop: insets.top }}>
        <Animated.View
          entering={FadeInDown.duration(400)}
          className="flex-row items-center justify-between px-5 py-4"
          style={{ borderBottomWidth: 2, borderBottomColor: `${COLORS.primary.gold}30` }}
        >
          <View className="flex-row items-center">
            <Pressable
              onPress={() => router.back()}
              className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
              style={{
                backgroundColor: `${COLORS.primary.gold}20`,
                borderWidth: 1.5,
                borderColor: `${COLORS.primary.gold}40`,
              }}
            >
              <ArrowLeft size={22} color={COLORS.primary.paleGold} />
            </Pressable>
            <View>
              <View className="flex-row items-center">
                <Text style={{ color: COLORS.text.cream }} className="text-2xl font-bold">
                  Mon profil
                </Text>
                <Sparkles size={18} color={COLORS.primary.brightYellow} style={{ marginLeft: 8 }} />
              </View>
              <Text style={{ color: COLORS.text.muted }} className="text-sm">
                Modifier mes informations
              </Text>
            </View>
          </View>

          {/* Save button in header */}
          {hasChanges && (
            <OfflineDisabledButton
              onPress={handleSave}
              disabled={isSaving}
              offlineMessage="Sauvegarde impossible hors ligne"
              showOfflineIcon={false}
              className="flex-row items-center px-4 py-2.5 rounded-2xl"
              style={{
                backgroundColor: COLORS.accent.forest,
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={COLORS.text.white} />
              ) : isOffline ? (
                <WifiOff size={18} color={COLORS.text.white} />
              ) : (
                <Save size={18} color={COLORS.text.white} />
              )}
              <Text style={{ color: COLORS.text.white }} className="font-semibold ml-2">
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Text>
            </OfflineDisabledButton>
          )}
        </Animated.View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          className="flex-1 px-5 pt-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile completion indicator */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(100)}
            className="mb-6 rounded-2xl p-4"
            style={{
              backgroundColor: isProfileComplete()
                ? `${COLORS.accent.hemp}15`
                : `${COLORS.primary.brightYellow}15`,
              borderWidth: 1.5,
              borderColor: isProfileComplete()
                ? `${COLORS.accent.hemp}40`
                : `${COLORS.primary.brightYellow}40`,
            }}
          >
            <View className="flex-row items-center">
              <View
                className="w-12 h-12 rounded-full items-center justify-center mr-3"
                style={{
                  backgroundColor: isProfileComplete()
                    ? `${COLORS.accent.hemp}25`
                    : `${COLORS.primary.brightYellow}25`,
                }}
              >
                {isProfileComplete() ? (
                  <CheckCircle size={24} color={COLORS.accent.hemp} />
                ) : (
                  <User size={24} color={COLORS.primary.brightYellow} />
                )}
              </View>
              <View className="flex-1">
                <Text
                  style={{
                    color: isProfileComplete() ? COLORS.accent.hemp : COLORS.primary.brightYellow,
                  }}
                  className="font-bold text-base"
                >
                  {isProfileComplete() ? 'Profil complet' : 'Profil incomplet'}
                </Text>
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm">
                  {isProfileComplete()
                    ? 'Toutes vos informations sont renseignées'
                    : 'Complétez vos informations pour commander'}
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Form fields */}
          {FORM_FIELDS.map((field, index) => {
            const IconComponent = field.icon;
            const status = getFieldStatus(field.key);

            return (
              <Animated.View
                key={field.key}
                entering={FadeInUp.duration(400).delay(150 + index * 50)}
                className="mb-4"
              >
                <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2 ml-1">
                  {field.label}
                </Text>
                <View
                  className="flex-row items-center rounded-2xl px-4 py-3"
                  style={{
                    backgroundColor: COLORS.background.charcoal,
                    borderWidth: 1.5,
                    borderColor:
                      status === 'error'
                        ? COLORS.accent.red
                        : status === 'filled'
                        ? `${COLORS.accent.hemp}40`
                        : `${COLORS.primary.gold}25`,
                  }}
                >
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                    style={{
                      backgroundColor:
                        status === 'error'
                          ? `${COLORS.accent.red}20`
                          : status === 'filled'
                          ? `${COLORS.accent.hemp}20`
                          : `${COLORS.primary.gold}15`,
                    }}
                  >
                    <IconComponent
                      size={20}
                      color={
                        status === 'error'
                          ? COLORS.accent.red
                          : status === 'filled'
                          ? COLORS.accent.hemp
                          : COLORS.primary.paleGold
                      }
                    />
                  </View>
                  <TextInput
                    value={formData[field.key]}
                    onChangeText={(value) => handleFieldChange(field.key, value)}
                    placeholder={field.placeholder}
                    placeholderTextColor={COLORS.text.muted}
                    keyboardType={field.keyboardType || 'default'}
                    autoCapitalize={field.autoCapitalize || 'sentences'}
                    className="flex-1 text-base"
                    style={{ color: COLORS.text.cream }}
                  />
                  {status === 'filled' && (
                    <CheckCircle size={18} color={COLORS.accent.hemp} />
                  )}
                </View>
                {status === 'error' && (
                  <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1 ml-1">
                    {field.key === 'email'
                      ? 'Format email invalide'
                      : 'Format de téléphone invalide (ex: 06 12 34 56 78)'}
                  </Text>
                )}
              </Animated.View>
            );
          })}

          {/* Bottom save button */}
          <Animated.View entering={FadeInUp.duration(500).delay(500)}>
            <OfflineDisabledButton
              onPress={handleSave}
              disabled={isSaving || !hasChanges}
              offlineMessage="Sauvegarde impossible hors ligne"
              className="rounded-2xl py-4 flex-row items-center justify-center mt-4"
              style={{
                backgroundColor: hasChanges && !isOffline ? COLORS.accent.forest : `${COLORS.text.muted}30`,
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={COLORS.text.white} />
              ) : isOffline ? (
                <WifiOff size={20} color={COLORS.text.muted} />
              ) : (
                <Save size={20} color={hasChanges ? COLORS.text.white : COLORS.text.muted} />
              )}
              <Text
                style={{ color: hasChanges && !isOffline ? COLORS.text.white : COLORS.text.muted }}
                className="font-bold text-base ml-2"
              >
                {isSaving ? 'Sauvegarde en cours...' : isOffline ? 'Hors ligne' : 'Sauvegarder les modifications'}
              </Text>
            </OfflineDisabledButton>

            {!hasChanges && !isOffline && (
              <Text style={{ color: COLORS.text.muted }} className="text-center text-sm mt-3">
                Modifiez vos informations pour activer la sauvegarde
              </Text>
            )}
            {isOffline && (
              <Text style={{ color: '#EF4444' }} className="text-center text-sm mt-3">
                Connexion requise pour sauvegarder
              </Text>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast */}
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
