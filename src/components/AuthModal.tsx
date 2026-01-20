/**
 * AuthModal - Composant d'authentification
 * Modal de connexion/inscription avec support email/password et magic link
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Mail, Lock, User, ArrowLeft, CheckCircle } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { useAuth } from '../lib/useAuth';
import { cn } from '../lib/cn';

type AuthMode = 'login' | 'signup' | 'magic-link' | 'forgot-password' | 'verify-otp';

interface AuthModalProps {
  onClose: () => void;
  initialMode?: AuthMode;
}

export function AuthModal({ onClose, initialMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const {
    signIn,
    signUp,
    sendMagicLink,
    verifyOtp,
    resetPassword,
    isSigningIn,
    isSigningUp,
    isSendingMagicLink,
    isVerifyingOtp,
    isResettingPassword,
  } = useAuth();

  const isLoading =
    isSigningIn || isSigningUp || isSendingMagicLink || isVerifyingOtp || isResettingPassword;

  const resetMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSignIn = async () => {
    resetMessages();
    if (!email || !password) {
      setErrorMessage('Veuillez remplir tous les champs');
      return;
    }
    try {
      await signIn({ email, password });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Erreur de connexion');
    }
  };

  const handleSignUp = async () => {
    resetMessages();
    if (!email || !password) {
      setErrorMessage('Veuillez remplir tous les champs');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    try {
      const result = await signUp({ email, password, fullName: fullName || undefined });
      if (result.session) {
        onClose();
      } else {
        setSuccessMessage('Vérifiez votre email pour confirmer votre inscription');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur d'inscription");
    }
  };

  const handleMagicLink = async () => {
    resetMessages();
    if (!email) {
      setErrorMessage('Veuillez entrer votre email');
      return;
    }
    try {
      await sendMagicLink(email);
      setSuccessMessage('Un lien de connexion a été envoyé à votre email');
      setMode('verify-otp');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur d'envoi");
    }
  };

  const handleVerifyOtp = async () => {
    resetMessages();
    if (!otpCode) {
      setErrorMessage('Veuillez entrer le code reçu par email');
      return;
    }
    try {
      await verifyOtp({ email, token: otpCode });
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Code invalide');
    }
  };

  const handleForgotPassword = async () => {
    resetMessages();
    if (!email) {
      setErrorMessage('Veuillez entrer votre email');
      return;
    }
    try {
      await resetPassword(email);
      setSuccessMessage('Un email de réinitialisation a été envoyé');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erreur d'envoi");
    }
  };

  const renderHeader = () => {
    const titles: Record<AuthMode, string> = {
      login: 'Connexion',
      signup: 'Créer un compte',
      'magic-link': 'Connexion par email',
      'forgot-password': 'Mot de passe oublié',
      'verify-otp': 'Vérification',
    };

    return (
      <View className="flex-row items-center justify-between mb-6">
        {mode !== 'login' && mode !== 'signup' ? (
          <Pressable
            onPress={() => {
              resetMessages();
              setMode('login');
            }}
            className="p-2 -ml-2"
          >
            <ArrowLeft size={24} color="#fff" />
          </Pressable>
        ) : (
          <View className="w-8" />
        )}
        <Text className="text-xl font-bold text-white">{titles[mode]}</Text>
        <Pressable onPress={onClose} className="p-2 -mr-2">
          <X size={24} color="#fff" />
        </Pressable>
      </View>
    );
  };

  const renderLoginForm = () => (
    <Animated.View entering={FadeIn} exiting={FadeOut}>
      <View className="mb-4">
        <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-3">
          <Mail size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-3 text-white text-base"
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View className="mb-6">
        <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-3">
          <Lock size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-3 text-white text-base"
            placeholder="Mot de passe"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      <Pressable
        onPress={handleSignIn}
        disabled={isLoading}
        className={cn(
          'bg-emerald-600 rounded-xl py-4 items-center mb-4',
          isLoading && 'opacity-50'
        )}
      >
        {isSigningIn ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">Se connecter</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => {
          resetMessages();
          setMode('forgot-password');
        }}
        className="items-center mb-6"
      >
        <Text className="text-gray-400 text-sm">Mot de passe oublié ?</Text>
      </Pressable>

      <View className="flex-row items-center mb-6">
        <View className="flex-1 h-px bg-white/20" />
        <Text className="text-gray-400 mx-4">ou</Text>
        <View className="flex-1 h-px bg-white/20" />
      </View>

      <Pressable
        onPress={() => {
          resetMessages();
          setMode('magic-link');
        }}
        className="border border-white/30 rounded-xl py-4 items-center mb-4"
      >
        <Text className="text-white font-medium">Connexion par lien email</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          resetMessages();
          setMode('signup');
        }}
        className="items-center py-2"
      >
        <Text className="text-gray-400">
          Pas de compte ?{' '}
          <Text className="text-emerald-400 font-semibold">Créer un compte</Text>
        </Text>
      </Pressable>
    </Animated.View>
  );

  const renderSignUpForm = () => (
    <Animated.View entering={SlideInRight} exiting={SlideOutLeft}>
      <View className="mb-4">
        <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-3">
          <User size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-3 text-white text-base"
            placeholder="Nom complet (optionnel)"
            placeholderTextColor="#9ca3af"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>
      </View>

      <View className="mb-4">
        <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-3">
          <Mail size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-3 text-white text-base"
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View className="mb-6">
        <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-3">
          <Lock size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-3 text-white text-base"
            placeholder="Mot de passe (min. 6 caractères)"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
      </View>

      <Pressable
        onPress={handleSignUp}
        disabled={isLoading}
        className={cn(
          'bg-emerald-600 rounded-xl py-4 items-center mb-4',
          isLoading && 'opacity-50'
        )}
      >
        {isSigningUp ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">Créer mon compte</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => {
          resetMessages();
          setMode('login');
        }}
        className="items-center py-2"
      >
        <Text className="text-gray-400">
          Déjà un compte ?{' '}
          <Text className="text-emerald-400 font-semibold">Se connecter</Text>
        </Text>
      </Pressable>
    </Animated.View>
  );

  const renderMagicLinkForm = () => (
    <Animated.View entering={FadeIn} exiting={FadeOut}>
      <Text className="text-gray-300 text-center mb-6">
        Recevez un lien de connexion directement dans votre boîte email, sans mot de passe.
      </Text>

      <View className="mb-6">
        <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-3">
          <Mail size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-3 text-white text-base"
            placeholder="Votre email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <Pressable
        onPress={handleMagicLink}
        disabled={isLoading}
        className={cn(
          'bg-emerald-600 rounded-xl py-4 items-center',
          isLoading && 'opacity-50'
        )}
      >
        {isSendingMagicLink ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">Envoyer le lien</Text>
        )}
      </Pressable>
    </Animated.View>
  );

  const renderVerifyOtpForm = () => (
    <Animated.View entering={FadeIn} exiting={FadeOut}>
      <Text className="text-gray-300 text-center mb-6">
        Entrez le code à 6 chiffres reçu par email à{' '}
        <Text className="text-white font-medium">{email}</Text>
      </Text>

      <View className="mb-6">
        <TextInput
          className="bg-white/10 rounded-xl px-4 py-4 text-white text-center text-2xl tracking-widest"
          placeholder="000000"
          placeholderTextColor="#9ca3af"
          value={otpCode}
          onChangeText={setOtpCode}
          keyboardType="number-pad"
          maxLength={6}
        />
      </View>

      <Pressable
        onPress={handleVerifyOtp}
        disabled={isLoading}
        className={cn(
          'bg-emerald-600 rounded-xl py-4 items-center mb-4',
          isLoading && 'opacity-50'
        )}
      >
        {isVerifyingOtp ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">Vérifier</Text>
        )}
      </Pressable>

      <Pressable onPress={handleMagicLink} className="items-center py-2">
        <Text className="text-gray-400">Renvoyer le code</Text>
      </Pressable>
    </Animated.View>
  );

  const renderForgotPasswordForm = () => (
    <Animated.View entering={FadeIn} exiting={FadeOut}>
      <Text className="text-gray-300 text-center mb-6">
        Entrez votre email pour recevoir un lien de réinitialisation.
      </Text>

      <View className="mb-6">
        <View className="flex-row items-center bg-white/10 rounded-xl px-4 py-3">
          <Mail size={20} color="#9ca3af" />
          <TextInput
            className="flex-1 ml-3 text-white text-base"
            placeholder="Votre email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <Pressable
        onPress={handleForgotPassword}
        disabled={isLoading}
        className={cn(
          'bg-emerald-600 rounded-xl py-4 items-center',
          isLoading && 'opacity-50'
        )}
      >
        {isResettingPassword ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white font-semibold text-base">Envoyer</Text>
        )}
      </Pressable>
    </Animated.View>
  );

  return (
    <View className="flex-1 bg-black/80 justify-end">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end"
      >
        <Animated.View
          entering={FadeIn.duration(200)}
          className="bg-gray-900 rounded-t-3xl px-6 pt-6 pb-10 max-h-[85%]"
        >
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {renderHeader()}

            {errorMessage ? (
              <View className="bg-red-900/50 border border-red-500/50 rounded-xl p-4 mb-4">
                <Text className="text-red-300 text-center">{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View className="bg-emerald-900/50 border border-emerald-500/50 rounded-xl p-4 mb-4 flex-row items-center justify-center">
                <CheckCircle size={18} color="#34d399" />
                <Text className="text-emerald-300 text-center ml-2">{successMessage}</Text>
              </View>
            ) : null}

            {mode === 'login' && renderLoginForm()}
            {mode === 'signup' && renderSignUpForm()}
            {mode === 'magic-link' && renderMagicLinkForm()}
            {mode === 'verify-otp' && renderVerifyOtpForm()}
            {mode === 'forgot-password' && renderForgotPasswordForm()}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
