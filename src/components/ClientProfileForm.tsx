/**
 * ClientProfileForm - Formulaire profil pour les clients
 * Champs: prenom, nom, date de naissance, email, telephone, adresse
 */

import React, { useState, useEffect } from 'react';
import { View, Pressable, ActivityIndicator, Platform } from 'react-native';
import { Text, TextInput } from '@/components/ui';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  Calendar,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { UserProfile } from '@/lib/supabase-auth';

interface ClientProfileFormProps {
  profile: UserProfile | null;
  email: string | null;
  onSave: (data: Partial<UserProfile>) => Promise<void>;
  isSaving: boolean;
}

export function ClientProfileForm({ profile, email, onSave, isSaving }: ClientProfileFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (profile) {
      const nameParts = (profile.full_name || '').split(' ');
      setFirstName((profile as any).first_name || nameParts[0] || '');
      setLastName((profile as any).last_name || nameParts.slice(1).join(' ') || '');
      setPhone(profile.phone || '');
      setAddress((profile as any).address || '');
      setPostalCode((profile as any).postal_code || '');
      setCity((profile as any).city || '');
      if ((profile as any).birth_date) {
        setBirthDate(new Date((profile as any).birth_date));
      }
    }
  }, [profile]);

  const calculateAge = (date: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age;
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'Prenom requis';
    if (!lastName.trim()) newErrors.lastName = 'Nom requis';
    if (!birthDate) {
      newErrors.birthDate = 'Date de naissance requise';
    } else if (calculateAge(birthDate) < 18) {
      newErrors.birthDate = 'Vous devez avoir 18 ans ou plus';
    }
    if (!phone.trim()) newErrors.phone = 'Telephone requis';
    if (!address.trim()) newErrors.address = 'Adresse requise';
    if (!postalCode.trim()) newErrors.postalCode = 'Code postal requis';
    if (!city.trim()) newErrors.city = 'Ville requise';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      await onSave({
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        birth_date: birthDate?.toISOString().split('T')[0],
        phone,
        address,
        postal_code: postalCode,
        city,
      } as any);
      setSuccessMessage('Profil enregistre !');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setBirthDate(selectedDate);
      if (errors.birthDate) setErrors((e) => ({ ...e, birthDate: '' }));
    }
  };

  return (
    <View>
      {successMessage ? (
        <View
          className="rounded-xl p-3 mb-4 flex-row items-center"
          style={{ backgroundColor: `${COLORS.accent.hemp}15` }}
        >
          <Check size={18} color={COLORS.accent.hemp} />
          <Text style={{ color: COLORS.accent.hemp }} className="text-sm ml-2">
            {successMessage}
          </Text>
        </View>
      ) : null}

      <View className="flex-row mb-4" style={{ gap: 12 }}>
        <View className="flex-1">
          <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
            Prenom *
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
          {errors.firstName ? (
            <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
              {errors.firstName}
            </Text>
          ) : null}
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
          {errors.lastName ? (
            <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
              {errors.lastName}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
          Date de naissance *
        </Text>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          className="flex-row items-center rounded-xl px-3 py-3"
          style={{
            backgroundColor: `${COLORS.text.white}05`,
            borderWidth: 1,
            borderColor: errors.birthDate ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
          }}
        >
          <Calendar size={18} color={COLORS.text.muted} />
          <Text
            style={{ color: birthDate ? COLORS.text.white : COLORS.text.muted }}
            className="flex-1 ml-3"
          >
            {birthDate ? formatDate(birthDate) : 'Selectionner une date'}
          </Text>
        </Pressable>
        {errors.birthDate ? (
          <View className="flex-row items-center mt-1">
            <AlertCircle size={14} color={COLORS.accent.red} />
            <Text style={{ color: COLORS.accent.red }} className="text-xs ml-1">
              {errors.birthDate}
            </Text>
          </View>
        ) : null}

        {showDatePicker ? (
          <View>
            <DateTimePicker
              value={birthDate || new Date(2000, 0, 1)}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1920, 0, 1)}
              locale="fr-FR"
            />
            {Platform.OS === 'ios' ? (
              <Pressable
                onPress={() => setShowDatePicker(false)}
                className="py-2 items-center"
              >
                <Text style={{ color: COLORS.primary.gold }} className="font-medium">
                  Valider
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
          Email (lecture seule)
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
            {email || 'Non renseigne'}
          </Text>
        </View>
      </View>

      <View className="mb-4">
        <Text style={{ color: COLORS.text.lightGray }} className="text-xs mb-1">
          Telephone *
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
        {errors.phone ? (
          <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
            {errors.phone}
          </Text>
        ) : null}
      </View>

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
        {errors.address ? (
          <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
            {errors.address}
          </Text>
        ) : null}
      </View>

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
          {errors.city ? (
            <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
              {errors.city}
            </Text>
          ) : null}
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
          {errors.postalCode ? (
            <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
              {errors.postalCode}
            </Text>
          ) : null}
        </View>
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
    </View>
  );
}
