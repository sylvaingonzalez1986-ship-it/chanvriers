/**
 * Écran mot de passe oublié - Les Chanvriers Unis
 */

import React, { useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Mail, ChevronLeft, Check } from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { useAuth } from '@/lib/useAuth';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resetPassword, isResettingPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Email requis');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email invalide');
      return;
    }

    try {
      await resetPassword(email);
      setEmailSent(true);
    } catch (err) {
      setError('Erreur lors de l\'envoi');
    }
  };

  if (emailSent) {
    return (
      <View
        className="flex-1 px-5 items-center justify-center"
        style={{ backgroundColor: COLORS.background.nightSky }}
      >
        <View
          className="w-20 h-20 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: `${COLORS.accent.hemp}20` }}
        >
          <Check size={40} color={COLORS.accent.hemp} />
        </View>
        <Text style={{ color: COLORS.text.white }} className="text-2xl font-bold text-center mb-2">
          Email envoyé
        </Text>
        <Text style={{ color: COLORS.text.muted }} className="text-center mb-8 px-4">
          Si un compte existe avec l'adresse{'\n'}
          <Text style={{ color: COLORS.primary.gold }}>{email}</Text>
          {'\n'}vous recevrez un lien pour réinitialiser votre mot de passe.
        </Text>
        <Pressable
          onPress={() => router.push('/auth/login')}
          className="rounded-xl py-4 px-8"
          style={{ backgroundColor: COLORS.primary.gold }}
        >
          <Text style={{ color: '#fff' }} className="font-bold">
            Retour à la connexion
          </Text>
        </Pressable>
      </View>
    );
  }

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
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/auth/login')}
          className="flex-row items-center mb-6"
        >
          <ChevronLeft size={24} color={COLORS.text.white} />
          <Text style={{ color: COLORS.text.white }} className="ml-1">
            Retour
          </Text>
        </Pressable>

        {/* Header */}
        <Text style={{ color: COLORS.text.white }} className="text-2xl font-bold text-center mb-2">
          Mot de passe oublié
        </Text>
        <Text style={{ color: COLORS.text.muted }} className="text-center mb-8">
          Entrez votre email pour recevoir un lien de réinitialisation
        </Text>

        {/* Email input */}
        <View className="mb-6">
          <Text style={{ color: COLORS.text.lightGray }} className="text-sm font-medium mb-2">
            Email
          </Text>
          <View
            className="flex-row items-center rounded-xl overflow-hidden"
            style={{
              backgroundColor: `${COLORS.text.white}05`,
              borderWidth: 1,
              borderColor: error ? COLORS.accent.red : `${COLORS.primary.paleGold}20`,
            }}
          >
            <View className="px-4">
              <Mail size={20} color={COLORS.text.muted} />
            </View>
            <TextInput
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) setError('');
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
          {error && (
            <Text style={{ color: COLORS.accent.red }} className="text-xs mt-1">
              {error}
            </Text>
          )}
        </View>

        {/* Submit button */}
        <Pressable
          onPress={handleResetPassword}
          disabled={isResettingPassword}
          className="rounded-xl py-4 items-center active:opacity-80"
          style={{
            backgroundColor: COLORS.primary.gold,
            opacity: isResettingPassword ? 0.6 : 1,
          }}
        >
          {isResettingPassword ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: '#fff' }} className="font-bold text-base">
              Envoyer le lien
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
