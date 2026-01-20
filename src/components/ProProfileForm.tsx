/**
 * ProProfileForm - Formulaire profil pour les professionnels
 * Champs: prénom, nom, raison sociale, SIRET, TVA, email, téléphone, adresse
 */

import React, { useState, useEffect } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text, TextInput } from '@/components/ui';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  Building2,
  FileText,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { UserProfile } from '@/lib/supabase-auth';

interface ProProfileFormProps {
  profile: UserProfile | null;
  email: string | null;
  onSave: (data: Partial<UserProfile>) => Promise<void>;
  isSaving: boolean;
}

export function ProProfileForm({ profile, email, onSave, isSaving }: ProProfileFormProps) {
  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [siret, setSiret] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Load existing profile data
  useEffect(() => {
    if (profile) {
      // Parse full_name into first/last name
      const nameParts = (profile.full_name || '').split(' ');
      setFirstName((profile as any).first_name || nameParts[0] || '');
      setLastName((profile as any).last_name || nameParts.slice(1).join(' ') || '');
      setBusinessName((profile as any).business_name || '');
      setSiret(profile.siret || '');
      setVatNumber(profile.tva_number || '');
      setPhone(profile.phone || '');
      setAddress((profile as any).address || '');
      setPostalCode((profile as any).postal_code || '');
      setCity((profile as any).city || '');
    }
  }, [profile]);

  // Validate SIRET (14 digits)
  const validateSiret = (value: string): boolean => {
    return /^\d{14}$/.test(value.replace(/\s/g, ''));
  };

  // Validate TVA (FR + 11 digits)
  const validateVat = (value: string): boolean => {
    return /^FR\d{11}$/.test(value.replace(/\s/g, '').toUpperCase());
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'Prénom requis';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Nom requis';
    }

    if (!businessName.trim()) {
      newErrors.businessName = 'Raison sociale requise';
    }

    if (!siret.trim()) {
      newErrors.siret = 'SIRET requis';
    } else if (!validateSiret(siret)) {
      newErrors.siret = 'Le SIRET doit contenir 14 chiffres';
    }

    // TVA est optionnel - valider le format seulement si renseigné
    if (vatNumber.trim() && !validateVat(vatNumber)) {
      newErrors.vatNumber = 'Format invalide. Exemple : FR12345678901';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Numéro de téléphone requis';
    }

    if (!address.trim()) {
      newErrors.address = 'Adresse requise';
    }

    if (!postalCode.trim()) {
      newErrors.postalCode = 'Code postal requis';
    }

    if (!city.trim()) {
      newErrors.city = 'Ville requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) return;

    try {
      await onSave({
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        business_name: businessName,
        siret: siret.replace(/\s/g, ''),
        tva_number: vatNumber.trim() ? vatNumber.replace(/\s/g, '').toUpperCase() : null,
        phone,
        address,
        postal_code: postalCode,
        city,
      } as any);

      setSuccessMessage('Profil enregistré !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  return (
    <View>
      {/* Success message */}
      {successMessage && (
        <View
          className="rounded-xl p-3 mb-4 flex-row items-center"
          style={{ backgroundColor: `${COLORS.accent.hemp}15` }}
        >
          <Check size={18} color={COLORS.accent.hemp} />
          <Text style={{ color: COLORS.accent.hemp }} className="text-sm ml-2">
            {successMessage}
          </Text>
        </View>
      )}

      {/* First Name & Last Name */}
      <View className="flex-row mb-4" style={{ gap: 12 }}>
        <View className="flex-1">
          <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
            Prénom *
          </Text>
          <View
            className="flex-row items-center rounded-xl overflow-hidden"
            style={{
              backgroundColor: `${COLORS.text.white}05`,
              borderWidth: 1,
              borderColor: errors.firstName ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
            }}
          >
            <View className="px-3">
              <User size={18} color={COLORS.text.muted} />
            </View>
            <TextInput
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                if (errors.firstName) setErrors((e) => ({ ...e, firstName: '' }));
              }}
              placeholder="Jean"
              placeholderTextColor={COLORS.text.muted}
              className="flex-1 py-3 pr-3"
              style={{ color: COLORS.text.white }}
            />
          </View>
          {errors.firstName && (
            <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
              {errors.firstName}
            </Text>
          )}
        </View>

        <View className="flex-1">
          <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
            Nom *
          </Text>
          <View
            className="flex-row items-center rounded-xl overflow-hidden"
            style={{
              backgroundColor: `${COLORS.text.white}05`,
              borderWidth: 1,
              borderColor: errors.lastName ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
            }}
          >
            <TextInput
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                if (errors.lastName) setErrors((e) => ({ ...e, lastName: '' }));
              }}
              placeholder="Dupont"
              placeholderTextColor={COLORS.text.muted}
              className="flex-1 py-3 px-3"
              style={{ color: COLORS.text.white }}
            />
          </View>
          {errors.lastName && (
            <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
              {errors.lastName}
            </Text>
          )}
        </View>
      </View>

      {/* Business Name (Raison Sociale) */}
      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
          Raison sociale *
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.businessName ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-3">
            <Building2 size={18} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={businessName}
            onChangeText={(text) => {
              setBusinessName(text);
              if (errors.businessName) setErrors((e) => ({ ...e, businessName: '' }));
            }}
            placeholder="Ma Société SARL"
            placeholderTextColor={COLORS.text.muted}
            className="flex-1 py-3 pr-3"
            style={{ color: COLORS.text.white }}
          />
        </View>
        {errors.businessName && (
          <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
            {errors.businessName}
          </Text>
        )}
      </View>

      {/* SIRET */}
      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
          SIRET * (14 chiffres)
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.siret ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-3">
            <FileText size={18} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={siret}
            onChangeText={(text) => {
              setSiret(text);
              if (errors.siret) setErrors((e) => ({ ...e, siret: '' }));
            }}
            placeholder="12345678901234"
            placeholderTextColor={COLORS.text.muted}
            keyboardType="number-pad"
            maxLength={14}
            className="flex-1 py-3 pr-3"
            style={{ color: COLORS.text.white }}
          />
        </View>
        {errors.siret && (
          <View className="flex-row items-center mt-1">
            <AlertCircle size={14} color={COLORS.accent.red} />
            <Text style={{ color: COLORS.accent.red }} className="text-xs ml-1">
              {errors.siret}
            </Text>
          </View>
        )}
      </View>

      {/* VAT Number */}
      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
          Numéro de TVA (optionnel - FR + 11 chiffres)
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.vatNumber ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-3">
            <FileText size={18} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={vatNumber}
            onChangeText={(text) => {
              setVatNumber(text.toUpperCase());
              if (errors.vatNumber) setErrors((e) => ({ ...e, vatNumber: '' }));
            }}
            placeholder="FR12345678901"
            placeholderTextColor={COLORS.text.muted}
            autoCapitalize="characters"
            maxLength={13}
            className="flex-1 py-3 pr-3"
            style={{ color: COLORS.text.white }}
          />
        </View>
        {errors.vatNumber && (
          <View className="flex-row items-center mt-1">
            <AlertCircle size={14} color={COLORS.accent.red} />
            <Text style={{ color: COLORS.accent.red }} className="text-xs ml-1">
              {errors.vatNumber}
            </Text>
          </View>
        )}
      </View>

      {/* Email (read-only) */}
      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
          Email * (lecture seule)
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}03`,
            borderWidth: 1,
            borderColor: `${COLORS.primary.paleGold}10`,
          }}
        >
          <View className="px-3">
            <Mail size={18} color={COLORS.text.muted} />
          </View>
          <Text style={{ color: COLORS.text.muted }} className="flex-1 py-3 pr-3">
            {email || 'Non renseigné'}
          </Text>
        </View>
      </View>

      {/* Phone */}
      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
          Téléphone *
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.phone ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-3">
            <Phone size={18} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={phone}
            onChangeText={(text) => {
              setPhone(text);
              if (errors.phone) setErrors((e) => ({ ...e, phone: '' }));
            }}
            placeholder="06 12 34 56 78"
            placeholderTextColor={COLORS.text.muted}
            keyboardType="phone-pad"
            className="flex-1 py-3 pr-3"
            style={{ color: COLORS.text.white }}
          />
        </View>
        {errors.phone && (
          <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
            {errors.phone}
          </Text>
        )}
      </View>

      {/* Address */}
      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
          Adresse *
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.address ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-3">
            <Home size={18} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={address}
            onChangeText={(text) => {
              setAddress(text);
              if (errors.address) setErrors((e) => ({ ...e, address: '' }));
            }}
            placeholder="123 Rue de la Paix"
            placeholderTextColor={COLORS.text.muted}
            className="flex-1 py-3 pr-3"
            style={{ color: COLORS.text.white }}
          />
        </View>
        {errors.address && (
          <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
            {errors.address}
          </Text>
        )}
      </View>

      {/* City & Postal Code */}
      <View className="flex-row mb-6" style={{ gap: 12 }}>
        <View className="flex-1">
          <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
            Ville *
          </Text>
          <View
            className="flex-row items-center rounded-xl overflow-hidden"
            style={{
              backgroundColor: `${COLORS.text.white}05`,
              borderWidth: 1,
              borderColor: errors.city ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
            }}
          >
            <View className="px-3">
              <MapPin size={18} color={COLORS.text.muted} />
            </View>
            <TextInput
              value={city}
              onChangeText={(text) => {
                setCity(text);
                if (errors.city) setErrors((e) => ({ ...e, city: '' }));
              }}
              placeholder="Paris"
              placeholderTextColor={COLORS.text.muted}
              className="flex-1 py-3 pr-3"
              style={{ color: COLORS.text.white }}
            />
          </View>
          {errors.city && (
            <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
              {errors.city}
            </Text>
          )}
        </View>

        <View className="flex-1">
          <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
            Code postal *
          </Text>
          <View
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: `${COLORS.text.white}05`,
              borderWidth: 1,
              borderColor: errors.postalCode ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
            }}
          >
            <TextInput
              value={postalCode}
              onChangeText={(text) => {
                setPostalCode(text);
                if (errors.postalCode) setErrors((e) => ({ ...e, postalCode: '' }));
              }}
              placeholder="75001"
              placeholderTextColor={COLORS.text.muted}
              keyboardType="number-pad"
              maxLength={5}
              className="py-3 px-3"
              style={{ color: COLORS.text.white }}
            />
          </View>
          {errors.postalCode && (
            <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
              {errors.postalCode}
            </Text>
          )}
        </View>
      </View>

      {/* Save Button */}
      <Pressable
        onPress={handleSave}
        disabled={isSaving}
        className="rounded-xl py-4 items-center active:opacity-80"
        style={{
          backgroundColor: COLORS.primary.gold,
          opacity: isSaving ? 0.6 : 1,
        }}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff' }} className="font-bold text-base">
            Enregistrer
          </Text>
        )}
      </Pressable>
    </View>
  );
}
