/**
 * Écran d'inscription - Les Chanvriers Unis
 * Inscription avec Supabase Auth + complétion de profil
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, TextInput } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Mail,
  Lock,
  User,
  Phone,
  Building2,
  FileText,
  ChevronLeft,
  Check,
  Eye,
  EyeOff,
  ChevronDown,
  Briefcase,
  Leaf,
} from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { useAuth } from '@/lib/useAuth';
import {
  UserCategory,
  USER_CATEGORY_LABELS,
  UserRole,
  USER_ROLE_LABELS,
  USER_ROLE_COLORS,
} from '@/lib/supabase-users';
import { AuthErrorBanner, canRetryAuthError, getAuthErrorType } from '@/components/AuthErrorBanner';

type SignupStep = 'credentials' | 'profile' | 'business' | 'email-confirmation';

type SelectableRole = 'client' | 'pro' | 'producer';

const ROLE_OPTIONS: { value: SelectableRole; label: string; icon: string }[] = [
  { value: 'client', label: 'Particulier', icon: 'user' },
  { value: 'pro', label: 'Professionnel', icon: 'briefcase' },
  { value: 'producer', label: 'Producteur', icon: 'leaf' },
];

// Clé pour stocker le rôle en attente de confirmation email
export const PENDING_SIGNUP_ROLE_KEY = 'pending-signup-role';
export const PENDING_SIGNUP_EMAIL_KEY = 'pending-signup-email';

const CATEGORY_OPTIONS: { value: UserCategory; label: string }[] = [
  { value: 'restaurateur', label: 'Restaurateur' },
  { value: 'epicerie', label: 'Épicerie' },
  { value: 'grossiste', label: 'Grossiste' },
  { value: 'producteur_maraicher', label: 'Producteur Maraîcher' },
  { value: 'autre', label: 'Autre' },
];

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signUp, isSigningUp, signUpError, signUpErrorType, resetSignUpError, updateProfile, isUpdatingProfile } = useAuth();

  // Step state
  const [step, setStep] = useState<SignupStep>('credentials');

  // Credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState<UserCategory>(null);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Business state (for pro/producer)
  const [siret, setSiret] = useState('');
  const [tvaNumber, setTvaNumber] = useState('');
  const [companyName, setCompanyName] = useState('');

  // Account type / Role selection
  const [selectedRole, setSelectedRole] = useState<SelectableRole>('client');

  // Helper to check if business info is required
  const requiresBusinessInfo = selectedRole === 'pro' || selectedRole === 'producer';

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Validate credentials step
  const validateCredentials = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email invalide';
    }

    if (!password) {
      newErrors.password = 'Mot de passe requis';
    } else if (password.length < 6) {
      newErrors.password = 'Minimum 6 caractères';
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate profile step
  const validateProfile = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Nom complet requis';
    }

    if (!category) {
      newErrors.category = 'Catégorie requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate business step (for pro/producer)
  const validateBusiness = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (requiresBusinessInfo) {
      if (!siret.trim()) {
        newErrors.siret = 'SIRET requis pour les professionnels';
      } else if (!/^\d{14}$/.test(siret.replace(/\s/g, ''))) {
        newErrors.siret = 'SIRET invalide (14 chiffres)';
      }

      // TVA est optionnel - valider le format seulement si renseigné
      if (tvaNumber.trim() && !/^FR\d{11}$/.test(tvaNumber.replace(/\s/g, '').toUpperCase())) {
        newErrors.tvaNumber = 'Format TVA invalide (ex: FR12345678901)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle signup
  const handleSignup = async () => {
    if (!validateCredentials()) return;

    setGeneralError('');
    try {
      const result = await signUp({ email, password, fullName });
      console.log('[Signup] signUp result:', result);

      // Check if we have a session (email confirmation disabled)
      if (result?.session) {
        console.log('[Signup] Session created, moving to profile step');
        setStep('profile');
        setSuccessMessage('Compte créé ! Complétez votre profil.');
      } else {
        // No session means email confirmation is required
        // Save the selected role and email for later use after email confirmation
        console.log('[Signup] No session, email confirmation required');
        console.log('[Signup] Saving pending role for later application');
        await AsyncStorage.setItem(PENDING_SIGNUP_ROLE_KEY, selectedRole);
        await AsyncStorage.setItem(PENDING_SIGNUP_EMAIL_KEY, email.toLowerCase());
        setStep('email-confirmation');
      }
    } catch (error) {
      console.error('[Signup] signUp error:', error);
      const message = error instanceof Error ? error.message : 'Erreur lors de l\'inscription';
      setGeneralError(message);
    }
  };

  // Handle profile completion
  const handleCompleteProfile = async () => {
    if (!validateProfile()) return;

    if (requiresBusinessInfo) {
      // Go to business step for professionals/producers
      setStep('business');
    } else {
      // Save profile and finish for clients
      await saveProfile();
    }
  };

  // Handle business info completion
  const handleCompleteBusiness = async () => {
    if (!validateBusiness()) return;
    await saveProfile();
  };

  // Gérer le retry pour les erreurs réseau
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    try {
      resetSignUpError();
      await handleSignup();
    } finally {
      setIsRetrying(false);
    }
  }, [email, password, fullName, selectedRole]);

  // Save profile to Supabase
  const saveProfile = async () => {
    console.log('[Signup] ========== SAVE PROFILE START ==========');
    console.log('[Signup] selectedRole:', selectedRole);
    console.log('[Signup] Full name:', fullName ? 'SET' : 'NOT SET');
    console.log('[Signup] Phone:', phone ? 'SET' : 'NOT SET');
    console.log('[Signup] Category:', category ?? 'NOT SET');
    // Note: Personal data (name, phone, siret, etc.) not logged for security

    setIsSaving(true);
    setGeneralError('');

    try {
      // Ensure role is explicitly set
      // Pour les pros et producteurs, définir pro_status à 'pending' pour validation admin
      const profileData = {
        full_name: fullName,
        phone: phone || null,
        category,
        siret: siret || null,
        tva_number: tvaNumber ? tvaNumber.toUpperCase() : null,
        company_name: companyName || null,
        role: selectedRole, // Explicitly set the role
        // Si c'est un compte pro ou producteur, il doit être validé par l'admin
        ...((selectedRole === 'pro' || selectedRole === 'producer') ? { pro_status: 'pending' } : {}),
      };

      console.log('[Signup] CALLING updateProfile with:');
      console.log('[Signup] - role:', profileData.role);
      console.log('[Signup] - full_name:', profileData.full_name ? 'SET' : 'NULL');
      console.log('[Signup] - category:', profileData.category);
      console.log('[Signup] - profile keys:', Object.keys(profileData));

      const result = await updateProfile(profileData as any);

      console.log('[Signup] Profile update result:', result);
      console.log('[Signup] Result type:', typeof result);
      console.log('[Signup] Result is UserProfile?', result && 'role' in result);
      console.log('[Signup] ========== SAVE PROFILE END ==========');

      if (!result) {
        throw new Error('Profile not returned from updateProfile');
      }

      setSuccessMessage('Profil complété !');

      // Navigate to home after short delay
      setTimeout(() => {
        console.log('[Signup] Navigating to home');
        router.replace('/(tabs)');
      }, 1500);
    } catch (error) {
      console.error('[Signup] Error updating profile:', error);
      console.log('[Signup] ========== SAVE PROFILE ERROR ==========');
      const message = error instanceof Error ? error.message : 'Erreur lors de la mise à jour du profil';
      setGeneralError(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => (
    <View className="flex-row items-center justify-center mb-6">
      {['credentials', 'profile', 'business'].map((s, index) => {
        const isActive = s === step;
        const isPast =
          (s === 'credentials' && step !== 'credentials') ||
          (s === 'profile' && step === 'business');
        const shouldShow = s !== 'business' || requiresBusinessInfo;

        if (!shouldShow) return null;

        return (
          <React.Fragment key={s}>
            {index > 0 && shouldShow && (
              <View
                className="w-8 h-0.5 mx-1"
                style={{ backgroundColor: isPast ? COLORS.accent.hemp : `${COLORS.text.white}20` }}
              />
            )}
            <View
              className="w-8 h-8 rounded-full items-center justify-center"
              style={{
                backgroundColor: isActive || isPast ? COLORS.accent.hemp : `${COLORS.text.white}10`,
              }}
            >
              {isPast ? (
                <Check size={16} color="#fff" />
              ) : (
                <Text style={{ color: isActive ? '#fff' : COLORS.text.muted }} className="text-sm font-bold">
                  {index + 1}
                </Text>
              )}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );

  // Render credentials step
  const renderCredentialsStep = () => (
    <View>
      <Text style={{ color: COLORS.text.white }} className="text-2xl font-bold text-center mb-2">
        Créer un compte
      </Text>
      <Text style={{ color: COLORS.text.muted }} className="text-center mb-6">
        Rejoignez Les Chanvriers Unis
      </Text>

      {/* Account type selector - 3 options */}
      <View className="mb-6">
        <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-3">
          Vous êtes...
        </Text>
        <View className="gap-3">
          {ROLE_OPTIONS.map((option) => {
            const isSelected = selectedRole === option.value;
            const IconComponent = option.value === 'client' ? User : option.value === 'pro' ? Briefcase : Leaf;
            const accentColor = option.value === 'client' ? COLORS.accent.hemp : option.value === 'pro' ? COLORS.accent.teal : COLORS.primary.gold;

            return (
              <Pressable
                key={option.value}
                onPress={() => setSelectedRole(option.value)}
                className="flex-row items-center py-4 px-4 rounded-xl"
                style={{
                  backgroundColor: isSelected ? `${accentColor}15` : `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: isSelected ? accentColor : `${COLORS.text.white}10`,
                }}
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: isSelected ? `${accentColor}20` : `${COLORS.text.white}10` }}
                >
                  <IconComponent size={20} color={isSelected ? accentColor : COLORS.text.muted} />
                </View>
                <View className="flex-1">
                  <Text
                    style={{ color: isSelected ? COLORS.text.white : COLORS.text.lightGray }}
                    className="font-medium"
                  >
                    {option.label}
                  </Text>
                </View>
                {isSelected && (
                  <Check size={20} color={accentColor} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Email input */}
      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
          Email *
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.email ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-4">
            <Mail size={20} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) setErrors((e) => ({ ...e, email: '' }));
            }}
            placeholder="votre@email.com"
            placeholderTextColor={COLORS.text.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            className="flex-1 py-4 pr-4"
            style={{ color: COLORS.text.white }}
          />
        </View>
        {errors.email && (
          <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
            {errors.email}
          </Text>
        )}
      </View>

      {/* Password input */}
      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
          Mot de passe *
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.password ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-4">
            <Lock size={20} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) setErrors((e) => ({ ...e, password: '' }));
            }}
            placeholder="Minimum 6 caractères"
            placeholderTextColor={COLORS.text.muted}
            secureTextEntry={!showPassword}
            autoComplete="password-new"
            className="flex-1 py-4"
            style={{ color: COLORS.text.white }}
          />
          <Pressable onPress={() => setShowPassword(!showPassword)} className="px-4">
            {showPassword ? (
              <EyeOff size={20} color={COLORS.text.muted} />
            ) : (
              <Eye size={20} color={COLORS.text.muted} />
            )}
          </Pressable>
        </View>
        {errors.password && (
          <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
            {errors.password}
          </Text>
        )}
      </View>

      {/* Confirm password input */}
      <View className="mb-6">
        <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
          Confirmer le mot de passe *
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.confirmPassword ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-4">
            <Lock size={20} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) setErrors((e) => ({ ...e, confirmPassword: '' }));
            }}
            placeholder="Répétez le mot de passe"
            placeholderTextColor={COLORS.text.muted}
            secureTextEntry={!showPassword}
            autoComplete="password-new"
            className="flex-1 py-4 pr-4"
            style={{ color: COLORS.text.white }}
          />
        </View>
        {errors.confirmPassword && (
          <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
            {errors.confirmPassword}
          </Text>
        )}
      </View>

      {/* Error message with retry button */}
      {signUpError && (
        <AuthErrorBanner
          error={signUpError}
          onRetry={handleRetry}
          isRetrying={isRetrying}
          onDismiss={resetSignUpError}
          showDismiss={!canRetryAuthError(getAuthErrorType(signUpError))}
        />
      )}

      {/* Signup button */}
      <Pressable
        onPress={handleSignup}
        disabled={isSigningUp}
        className="rounded-xl py-4 items-center active:opacity-80"
        style={{
          backgroundColor: COLORS.primary.gold,
          opacity: isSigningUp ? 0.6 : 1,
        }}
      >
        {isSigningUp ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff' }} className="font-bold text-base">
            Créer mon compte
          </Text>
        )}
      </Pressable>

      {/* Login link */}
      <Pressable
        onPress={() => router.push('/auth/login')}
        className="mt-4 py-2"
      >
        <Text style={{ color: COLORS.text.muted }} className="text-center">
          Déjà un compte ?{' '}
          <Text style={{ color: COLORS.primary.gold }}>Se connecter</Text>
        </Text>
      </Pressable>
    </View>
  );

  // Render profile step
  const renderProfileStep = () => (
    <View>
      <Text style={{ color: COLORS.text.white }} className="text-2xl font-bold text-center mb-2">
        Complétez votre profil
      </Text>
      <Text style={{ color: COLORS.text.muted }} className="text-center mb-6">
        Quelques informations pour personnaliser votre expérience
      </Text>

      {successMessage && (
        <View
          className="rounded-xl p-3 mb-4"
          style={{ backgroundColor: `${COLORS.accent.hemp}15` }}
        >
          <Text style={{ color: COLORS.accent.hemp }} className="text-sm text-center">
            {successMessage}
          </Text>
        </View>
      )}

      {/* Full name input */}
      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
          Nom complet *
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.fullName ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-4">
            <User size={20} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={fullName}
            onChangeText={(text) => {
              setFullName(text);
              if (errors.fullName) setErrors((e) => ({ ...e, fullName: '' }));
            }}
            placeholder="Jean Dupont"
            placeholderTextColor={COLORS.text.muted}
            autoComplete="name"
            className="flex-1 py-4 pr-4"
            style={{ color: COLORS.text.white }}
          />
        </View>
        {errors.fullName && (
          <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
            {errors.fullName}
          </Text>
        )}
      </View>

      {/* Phone input */}
      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
          Téléphone (optionnel)
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-4">
            <Phone size={20} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="06 12 34 56 78"
            placeholderTextColor={COLORS.text.muted}
            keyboardType="phone-pad"
            autoComplete="tel"
            className="flex-1 py-4 pr-4"
            style={{ color: COLORS.text.white }}
          />
        </View>
      </View>

      {/* Category selector */}
      <View className="mb-6">
        <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
          Catégorie *
        </Text>
        <Pressable
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          className="flex-row items-center rounded-xl px-4 py-4"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.category ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <Building2 size={20} color={COLORS.text.muted} />
          <Text
            style={{ color: category ? COLORS.text.white : COLORS.text.muted }}
            className="flex-1 ml-4"
          >
            {category ? USER_CATEGORY_LABELS[category] : 'Sélectionner une catégorie'}
          </Text>
          <ChevronDown size={20} color={COLORS.text.muted} />
        </Pressable>
        {errors.category && (
          <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
            {errors.category}
          </Text>
        )}

        {/* Category options */}
        {showCategoryPicker && (
          <View
            className="mt-2 rounded-xl overflow-hidden"
            style={{
              backgroundColor: COLORS.background.dark,
              borderWidth: 1,
              borderColor: `${COLORS.primary.paleGold}20`,
            }}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value ?? 'null'}
                onPress={() => {
                  setCategory(opt.value);
                  setShowCategoryPicker(false);
                  if (errors.category) setErrors((e) => ({ ...e, category: '' }));
                }}
                className="px-4 py-3 flex-row items-center"
                style={{
                  backgroundColor: category === opt.value ? `${COLORS.accent.teal}20` : 'transparent',
                  borderBottomWidth: 1,
                  borderBottomColor: `${COLORS.text.white}10`,
                }}
              >
                <Text
                  style={{ color: category === opt.value ? COLORS.accent.teal : COLORS.text.white }}
                >
                  {opt.label}
                </Text>
                {category === opt.value && (
                  <Check size={18} color={COLORS.accent.teal} style={{ marginLeft: 'auto' }} />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Error message */}
      {generalError && (
        <View
          className="rounded-xl p-3 mb-4"
          style={{ backgroundColor: `${COLORS.accent.red}15` }}
        >
          <Text style={{ color: COLORS.accent.red }} className="text-sm text-center">
            {generalError}
          </Text>
        </View>
      )}

      {/* Continue button */}
      <Pressable
        onPress={handleCompleteProfile}
        disabled={isUpdatingProfile || isSaving}
        className="rounded-xl py-4 items-center active:opacity-80"
        style={{
          backgroundColor: COLORS.primary.gold,
          opacity: (isUpdatingProfile || isSaving) ? 0.6 : 1,
        }}
      >
        {(isUpdatingProfile || isSaving) ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff' }} className="font-bold text-base">
            {requiresBusinessInfo ? 'Continuer' : 'Terminer'}
          </Text>
        )}
      </Pressable>
    </View>
  );

  // Render business step (for pro/producer)
  const renderBusinessStep = () => (
    <View>
      <Text style={{ color: COLORS.text.white }} className="text-2xl font-bold text-center mb-2">
        Informations professionnelles
      </Text>
      <Text style={{ color: COLORS.text.muted }} className="text-center mb-6">
        Requis pour les comptes professionnels
      </Text>

      {/* Company name input */}
      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
          Nom de l'entreprise (optionnel)
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-4">
            <Building2 size={20} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={companyName}
            onChangeText={setCompanyName}
            placeholder="Ma Société SARL"
            placeholderTextColor={COLORS.text.muted}
            className="flex-1 py-4 pr-4"
            style={{ color: COLORS.text.white }}
          />
        </View>
      </View>

      {/* SIRET input */}
      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
          SIRET *
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.siret ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-4">
            <FileText size={20} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={siret}
            onChangeText={(text) => {
              setSiret(text);
              if (errors.siret) setErrors((e) => ({ ...e, siret: '' }));
            }}
            placeholder="12345678901234"
            placeholderTextColor={COLORS.text.muted}
            keyboardType="numeric"
            maxLength={14}
            className="flex-1 py-4 pr-4"
            style={{ color: COLORS.text.white }}
          />
        </View>
        {errors.siret && (
          <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
            {errors.siret}
          </Text>
        )}
      </View>

      {/* TVA input */}
      <View className="mb-6">
        <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
          Numéro de TVA intracommunautaire (optionnel)
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.tvaNumber ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-4">
            <FileText size={20} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={tvaNumber}
            onChangeText={(text) => {
              setTvaNumber(text.toUpperCase());
              if (errors.tvaNumber) setErrors((e) => ({ ...e, tvaNumber: '' }));
            }}
            placeholder="FR12345678901"
            placeholderTextColor={COLORS.text.muted}
            autoCapitalize="characters"
            maxLength={13}
            className="flex-1 py-4 pr-4"
            style={{ color: COLORS.text.white }}
          />
        </View>
        {errors.tvaNumber && (
          <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
            {errors.tvaNumber}
          </Text>
        )}
      </View>

      {/* Error message */}
      {generalError && (
        <View
          className="rounded-xl p-3 mb-4"
          style={{ backgroundColor: `${COLORS.accent.red}15` }}
        >
          <Text style={{ color: COLORS.accent.red }} className="text-sm text-center">
            {generalError}
          </Text>
        </View>
      )}

      {/* Success message */}
      {successMessage && (
        <View
          className="rounded-xl p-3 mb-4"
          style={{ backgroundColor: `${COLORS.accent.hemp}15` }}
        >
          <Text style={{ color: COLORS.accent.hemp }} className="text-sm text-center">
            {successMessage}
          </Text>
        </View>
      )}

      {/* Complete button */}
      <Pressable
        onPress={handleCompleteBusiness}
        disabled={isUpdatingProfile || isSaving}
        className="rounded-xl py-4 items-center active:opacity-80"
        style={{
          backgroundColor: COLORS.primary.gold,
          opacity: (isUpdatingProfile || isSaving) ? 0.6 : 1,
        }}
      >
        {(isUpdatingProfile || isSaving) ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff' }} className="font-bold text-base">
            Terminer l'inscription
          </Text>
        )}
      </Pressable>

      {/* Back button */}
      <Pressable
        onPress={() => setStep('profile')}
        className="mt-4 py-2 flex-row items-center justify-center"
      >
        <ChevronLeft size={18} color={COLORS.text.muted} />
        <Text style={{ color: COLORS.text.muted }}>Retour</Text>
      </Pressable>
    </View>
  );

  // Render email confirmation step
  const renderEmailConfirmationStep = () => (
    <View className="items-center py-8">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-6"
        style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
      >
        <Mail size={40} color={COLORS.accent.hemp} />
      </View>
      <Text style={{ color: COLORS.text.white }} className="text-2xl font-bold text-center mb-2">
        Compte créé !
      </Text>
      <Text style={{ color: COLORS.text.muted }} className="text-center mb-6 px-4">
        Votre compte a été créé avec l'adresse{'\n'}
        <Text style={{ color: COLORS.primary.gold }}>{email}</Text>
      </Text>
      <Text style={{ color: COLORS.text.muted }} className="text-center text-sm mb-8 px-4">
        Si la confirmation par email est activée, vérifiez votre boîte mail.
        Sinon, vous pouvez vous connecter directement.
      </Text>

      <Pressable
        onPress={() => router.push('/auth/login')}
        className="rounded-xl py-4 px-8 active:opacity-80 mb-3"
        style={{ backgroundColor: COLORS.primary.gold }}
      >
        <Text style={{ color: '#fff' }} className="font-bold">
          Se connecter
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setStep('credentials')}
        className="mt-4 py-2"
      >
        <Text style={{ color: COLORS.text.muted }}>
          Utiliser un autre email
        </Text>
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
      style={{ backgroundColor: COLORS.background.nightSky }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back button */}
        {step === 'credentials' && (
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')}
            className="flex-row items-center mb-6"
          >
            <ChevronLeft size={24} color={COLORS.text.white} />
            <Text style={{ color: COLORS.text.white }} className="ml-1">
              Retour
            </Text>
          </Pressable>
        )}

        {/* Step indicator */}
        {step !== 'email-confirmation' && renderStepIndicator()}

        {/* Step content */}
        {step === 'credentials' && renderCredentialsStep()}
        {step === 'profile' && renderProfileStep()}
        {step === 'business' && renderBusinessStep()}
        {step === 'email-confirmation' && renderEmailConfirmationStep()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
