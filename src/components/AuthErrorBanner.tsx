/**
 * AuthErrorBanner - Les Chanvriers Unis
 * Bannière d'erreur d'authentification avec distinction erreur réseau vs credentials
 * et bouton Réessayer
 */

import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui';
import { WifiOff, AlertCircle, RefreshCw, XCircle, ShieldAlert } from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Types d'erreurs d'authentification
export type AuthErrorType = 'network' | 'credentials' | 'token' | 'server' | 'rate_limit' | 'unknown';

/**
 * Déterminer le type d'erreur à partir du message ou de l'objet erreur
 */
export function getAuthErrorType(error: Error | string | null | undefined): AuthErrorType {
  if (!error) return 'unknown';

  const message = typeof error === 'string' ? error.toLowerCase() : error.message?.toLowerCase() || '';

  // Erreurs réseau / timeout
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('impossible de contacter') ||
    message.includes('connexion internet') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('vérifiez votre connexion')
  ) {
    return 'network';
  }

  // Erreurs de rate limiting
  if (
    message.includes('trop de tentatives') ||
    message.includes('rate limit') ||
    message.includes('429')
  ) {
    return 'rate_limit';
  }

  // Erreurs de credentials (email/password invalides)
  if (
    message.includes('invalid') ||
    message.includes('incorrect') ||
    message.includes('identifiants') ||
    message.includes('mot de passe') ||
    message.includes('email') ||
    message.includes('user not found') ||
    message.includes('invalid login credentials') ||
    message.includes('email not confirmed')
  ) {
    return 'credentials';
  }

  // Erreurs de token (session expirée, token invalide)
  if (
    message.includes('token') ||
    message.includes('session') ||
    message.includes('expired') ||
    message.includes('jwt') ||
    message.includes('refresh')
  ) {
    return 'token';
  }

  // Erreurs serveur
  if (
    message.includes('server') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503')
  ) {
    return 'server';
  }

  return 'unknown';
}

/**
 * Obtenir un message utilisateur clair selon le type d'erreur
 */
export function getAuthErrorMessage(errorType: AuthErrorType, originalMessage?: string): string {
  switch (errorType) {
    case 'network':
      return 'Impossible de vérifier votre compte. Vérifiez votre connexion.';
    case 'credentials':
      return originalMessage || 'Email ou mot de passe incorrect.';
    case 'token':
      return 'Votre session a expiré. Veuillez vous reconnecter.';
    case 'server':
      return 'Le serveur est temporairement indisponible. Réessayez dans quelques instants.';
    case 'rate_limit':
      return originalMessage || 'Trop de tentatives. Veuillez patienter avant de réessayer.';
    default:
      return originalMessage || 'Une erreur est survenue. Veuillez réessayer.';
  }
}

/**
 * Vérifier si l'erreur permet un retry (erreurs réseau/serveur)
 */
export function canRetryAuthError(errorType: AuthErrorType): boolean {
  return errorType === 'network' || errorType === 'server' || errorType === 'token';
}

interface AuthErrorBannerProps {
  error: Error | string | null | undefined;
  onRetry?: () => void;
  isRetrying?: boolean;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export function AuthErrorBanner({
  error,
  onRetry,
  isRetrying = false,
  onDismiss,
  showDismiss = false,
}: AuthErrorBannerProps) {
  if (!error) return null;

  const errorType = getAuthErrorType(error);
  const originalMessage = typeof error === 'string' ? error : error.message;
  const message = getAuthErrorMessage(errorType, originalMessage);
  const canRetry = canRetryAuthError(errorType);

  // Icône selon le type d'erreur
  const IconComponent = (() => {
    switch (errorType) {
      case 'network':
        return WifiOff;
      case 'credentials':
        return XCircle;
      case 'token':
        return ShieldAlert;
      case 'rate_limit':
        return AlertCircle;
      default:
        return AlertCircle;
    }
  })();

  // Couleur selon le type d'erreur
  const getColors = () => {
    switch (errorType) {
      case 'network':
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.3)',
          icon: '#EF4444',
          text: '#EF4444',
          buttonBg: 'rgba(239, 68, 68, 0.2)',
        };
      case 'credentials':
        return {
          bg: 'rgba(249, 115, 22, 0.15)',
          border: 'rgba(249, 115, 22, 0.3)',
          icon: '#F97316',
          text: '#F97316',
          buttonBg: 'rgba(249, 115, 22, 0.2)',
        };
      case 'rate_limit':
        return {
          bg: 'rgba(234, 179, 8, 0.15)',
          border: 'rgba(234, 179, 8, 0.3)',
          icon: '#EAB308',
          text: '#EAB308',
          buttonBg: 'rgba(234, 179, 8, 0.2)',
        };
      default:
        return {
          bg: 'rgba(239, 68, 68, 0.15)',
          border: 'rgba(239, 68, 68, 0.3)',
          icon: '#EF4444',
          text: '#EF4444',
          buttonBg: 'rgba(239, 68, 68, 0.2)',
        };
    }
  };

  const colors = getColors();

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRetry?.();
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
      className="rounded-xl p-4 mb-4"
      style={{
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <View className="flex-row items-start">
        <IconComponent size={20} color={colors.icon} />
        <View className="flex-1 ml-3">
          <Text
            style={{ color: colors.text }}
            className="text-sm font-medium leading-5"
          >
            {message}
          </Text>

          {/* Boutons d'action */}
          <View className="flex-row mt-3 gap-2">
            {canRetry && onRetry && (
              <Pressable
                onPress={handleRetry}
                disabled={isRetrying}
                className="flex-row items-center px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: colors.buttonBg,
                  opacity: isRetrying ? 0.6 : 1,
                }}
              >
                {isRetrying ? (
                  <ActivityIndicator size="small" color={colors.icon} />
                ) : (
                  <RefreshCw size={14} color={colors.icon} />
                )}
                <Text
                  style={{ color: colors.text }}
                  className="text-sm font-medium ml-1.5"
                >
                  {isRetrying ? 'Réessai...' : 'Réessayer'}
                </Text>
              </Pressable>
            )}

            {showDismiss && onDismiss && (
              <Pressable
                onPress={onDismiss}
                className="px-3 py-2 rounded-lg"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <Text style={{ color: COLORS.text.muted }} className="text-sm">
                  Fermer
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Indication pour erreurs de credentials */}
      {errorType === 'credentials' && (
        <View className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
          <Text style={{ color: COLORS.text.muted }} className="text-xs">
            Vérifiez votre email et mot de passe, ou utilisez "Mot de passe oublié ?" pour réinitialiser.
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
