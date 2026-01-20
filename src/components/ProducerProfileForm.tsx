/**
 * ProducerProfileForm - Formulaire profil pour les producteurs
 * Champs: prénom, nom, entreprise, email, téléphone, adresse, SIRET
 */

import React, { useState, useEffect } from 'react';
import { View, Pressable, ActivityIndicator, Switch } from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { useRouter } from 'expo-router';
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
  ChevronRight,
  Store,
  Clock,
  Info,
} from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { UserProfile } from '@/lib/supabase-auth';

interface ProducerProfileFormProps {
  profile: UserProfile | null;
  email: string | null;
  onSave: (data: Partial<UserProfile>) => Promise<void>;
  isSaving: boolean;
}

export function ProducerProfileForm({ profile, email, onSave, isSaving }: ProducerProfileFormProps) {
  const router = useRouter();

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [siret, setSiret] = useState('');

  // Direct farm sales state
  const [venteDirecteFerme, setVenteDirecteFerme] = useState(false);
  const [adresseRetrait, setAdresseRetrait] = useState('');
  const [horairesRetrait, setHorairesRetrait] = useState('');
  const [instructionsRetrait, setInstructionsRetrait] = useState('');

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
      setCompanyName(profile.company_name || '');
      setPhone(profile.phone || '');
      setAddress((profile as any).address || '');
      setPostalCode((profile as any).postal_code || '');
      setCity((profile as any).city || '');
      setSiret(profile.siret || '');

      // Load direct farm sales data
      setVenteDirecteFerme(profile.vente_directe_ferme || false);
      setAdresseRetrait(profile.adresse_retrait || '');
      setHorairesRetrait(profile.horaires_retrait || '');
      setInstructionsRetrait(profile.instructions_retrait || '');
    }
  }, [profile]);

  // Validate SIRET (14 digits)
  const validateSiret = (value: string): boolean => {
    return /^\d{14}$/.test(value.replace(/\s/g, ''));
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

    if (!companyName.trim()) {
      newErrors.companyName = 'Nom de l\'entreprise requis';
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

    if (siret.trim()) {
      if (!validateSiret(siret)) {
        newErrors.siret = 'Le SIRET doit contenir 14 chiffres';
      }
    } else {
      newErrors.siret = 'SIRET requis';
    }

    // Validate direct farm sales fields if enabled
    if (venteDirecteFerme) {
      if (!adresseRetrait.trim()) {
        newErrors.adresseRetrait = 'Adresse de retrait requise';
      }
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
        company_name: companyName,
        phone,
        address,
        postal_code: postalCode,
        city,
        siret: siret.replace(/\s/g, ''),
        // Direct farm sales fields
        vente_directe_ferme: venteDirecteFerme,
        adresse_retrait: venteDirecteFerme ? adresseRetrait : null,
        horaires_retrait: venteDirecteFerme ? horairesRetrait || null : null,
        instructions_retrait: venteDirecteFerme ? instructionsRetrait || null : null,
      } as any);

      setSuccessMessage('Profil enregistré !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  // Navigate to producer page
  const handleGoToProducerPage = () => {
    router.push('/producer-profile');
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

      {/* Company Name */}
      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
          Nom de l'entreprise *
        </Text>
        <View
          className="flex-row items-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.companyName ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <View className="px-3">
            <Building2 size={18} color={COLORS.text.muted} />
          </View>
          <TextInput
            value={companyName}
            onChangeText={(text) => {
              setCompanyName(text);
              if (errors.companyName) setErrors((e) => ({ ...e, companyName: '' }));
            }}
            placeholder="Ma Ferme CBD"
            placeholderTextColor={COLORS.text.muted}
            className="flex-1 py-3 pr-3"
            style={{ color: COLORS.text.white }}
          />
        </View>
        {errors.companyName && (
          <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
            {errors.companyName}
          </Text>
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
      <View className="flex-row mb-4" style={{ gap: 12 }}>
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

      {/* SIRET */}
      <View className="mb-6">
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

      {/* DIRECT FARM SALES SECTION */}
      <View className="mb-6 rounded-xl p-4" style={{ backgroundColor: `${COLORS.accent.hemp}10`, borderWidth: 1, borderColor: `${COLORS.accent.hemp}30` }}>
        <View className="flex-row items-center mb-4">
          <Store size={20} color={COLORS.accent.hemp} style={{ marginRight: 8 }} />
          <Text style={{ color: COLORS.text.white }} className="font-semibold text-base flex-1">
            Vente directe à la ferme
          </Text>
          <Switch
            value={venteDirecteFerme}
            onValueChange={setVenteDirecteFerme}
            trackColor={{ false: COLORS.text.muted, true: COLORS.accent.hemp }}
            thumbColor={venteDirecteFerme ? COLORS.accent.hemp : COLORS.text.lightGray}
          />
        </View>

        {venteDirecteFerme && (
          <View>
            {/* Pickup Address */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
                Adresse de retrait des commandes *
              </Text>
              <View
                className="flex-row items-start rounded-xl overflow-hidden"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: errors.adresseRetrait ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
                  minHeight: 100,
                  paddingTop: 12,
                }}
              >
                <View className="px-3 pt-1">
                  <MapPin size={18} color={COLORS.text.muted} />
                </View>
                <TextInput
                  value={adresseRetrait}
                  onChangeText={(text) => {
                    setAdresseRetrait(text);
                    if (errors.adresseRetrait) setErrors((e) => ({ ...e, adresseRetrait: '' }));
                  }}
                  placeholder="123 Rue de la Ferme, 75001 Paris"
                  placeholderTextColor={COLORS.text.muted}
                  multiline
                  numberOfLines={3}
                  className="flex-1 py-3 pr-3"
                  style={{ color: COLORS.text.white }}
                />
              </View>
              {errors.adresseRetrait && (
                <View className="flex-row items-center mt-1">
                  <AlertCircle size={14} color={COLORS.accent.red} />
                  <Text style={{ color: COLORS.accent.red }} className="text-xs ml-1">
                    {errors.adresseRetrait}
                  </Text>
                </View>
              )}
            </View>

            {/* Opening Hours */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
                Horaires de retrait (ex: Lun-Ven 14h-18h)
              </Text>
              <View
                className="flex-row items-center rounded-xl overflow-hidden"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.paleGold}20`,
                }}
              >
                <View className="px-3">
                  <Clock size={18} color={COLORS.text.muted} />
                </View>
                <TextInput
                  value={horairesRetrait}
                  onChangeText={setHorairesRetrait}
                  placeholder="Lundi-Vendredi 14h-18h, Samedi 9h-12h"
                  placeholderTextColor={COLORS.text.muted}
                  className="flex-1 py-3 pr-3"
                  style={{ color: COLORS.text.white }}
                />
              </View>
            </View>

            {/* Instructions */}
            <View className="mb-4">
              <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
                Instructions complémentaires (accès, parking, etc.)
              </Text>
              <View
                className="flex-row items-start rounded-xl overflow-hidden"
                style={{
                  backgroundColor: `${COLORS.text.white}05`,
                  borderWidth: 1,
                  borderColor: `${COLORS.primary.paleGold}20`,
                  minHeight: 80,
                  paddingTop: 12,
                }}
              >
                <View className="px-3 pt-1">
                  <Info size={18} color={COLORS.text.muted} />
                </View>
                <TextInput
                  value={instructionsRetrait}
                  onChangeText={setInstructionsRetrait}
                  placeholder="Ex: Accès par la cour intérieure, parking gratuit"
                  placeholderTextColor={COLORS.text.muted}
                  multiline
                  numberOfLines={3}
                  className="flex-1 py-3 pr-3"
                  style={{ color: COLORS.text.white }}
                />
              </View>
            </View>
          </View>
        )}
      </View>
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

      {/* Producer Page Button */}
      <Pressable
        onPress={handleGoToProducerPage}
        className="mt-4 rounded-xl py-4 flex-row items-center justify-center active:opacity-80"
        style={{
          backgroundColor: `${COLORS.accent.hemp}15`,
          borderWidth: 1,
          borderColor: `${COLORS.accent.hemp}40`,
        }}
      >
        <Text style={{ color: COLORS.accent.hemp }} className="font-medium">
          Accéder à ma fiche producteur
        </Text>
        <ChevronRight size={20} color={COLORS.accent.hemp} style={{ marginLeft: 8 }} />
      </Pressable>
    </View>
  );
}
