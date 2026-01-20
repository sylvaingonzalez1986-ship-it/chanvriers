/**
 * Écran d'attente de validation - Compte Professionnel
 * Affiché pour les comptes pro en attente de validation par l'admin
 */

import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Clock, LogOut, RefreshCw, Mail, Building2, XCircle } from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { useAuth } from '@/lib/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { AUTH_QUERY_KEYS } from '@/lib/useAuth';

export default function ProPendingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut, isSigningOut, profile } = useAuth();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const proStatus = (profile as any)?.pro_status;
  const isRejected = proStatus === 'rejected';

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalider et re-fetcher le profil pour vérifier si l'admin a validé
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.profile });
      await queryClient.refetchQueries({ queryKey: AUTH_QUERY_KEYS.profile });
    } catch (error) {
      console.error('Erreur lors du rafraîchissement:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <View
      className="flex-1 px-6 items-center justify-center"
      style={{
        backgroundColor: COLORS.background.nightSky,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      {/* Icon */}
      <View
        className="w-24 h-24 rounded-full items-center justify-center mb-6"
        style={{ backgroundColor: isRejected ? `${COLORS.accent.red}15` : `${COLORS.accent.teal}15` }}
      >
        {isRejected ? (
          <XCircle size={48} color={COLORS.accent.red} />
        ) : (
          <Clock size={48} color={COLORS.accent.teal} />
        )}
      </View>

      {/* Title */}
      <Text style={{ color: COLORS.text.white }} className="text-2xl font-bold text-center mb-3">
        {isRejected ? 'Compte non validé' : 'Compte en attente de validation'}
      </Text>

      {/* Description */}
      <Text style={{ color: COLORS.text.muted }} className="text-center mb-8 px-4 leading-6">
        {isRejected ? (
          <>
            Votre demande de compte professionnel n'a pas été approuvée.{'\n\n'}
            Si vous pensez qu'il s'agit d'une erreur, veuillez nous contacter.
          </>
        ) : (
          <>
            Votre compte professionnel a été créé avec succès.{'\n\n'}
            Un administrateur doit valider votre compte avant que vous puissiez accéder à l'application.
          </>
        )}
      </Text>

      {/* User info card */}
      <View
        className="w-full rounded-2xl p-5 mb-8"
        style={{
          backgroundColor: `${COLORS.text.white}05`,
          borderWidth: 1,
          borderColor: `${COLORS.primary.paleGold}15`,
        }}
      >
        <View className="flex-row items-center mb-4">
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: `${COLORS.accent.teal}20` }}
          >
            <Building2 size={20} color={COLORS.accent.teal} />
          </View>
          <View className="flex-1">
            <Text style={{ color: COLORS.text.lightGray }} className="text-xs uppercase tracking-wider mb-1">
              Compte Professionnel
            </Text>
            <Text style={{ color: COLORS.text.white }} className="font-medium">
              {profile?.full_name || (profile as any)?.company_name || 'Non renseigné'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center">
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: `${COLORS.primary.gold}20` }}
          >
            <Mail size={20} color={COLORS.primary.gold} />
          </View>
          <View className="flex-1">
            <Text style={{ color: COLORS.text.lightGray }} className="text-xs uppercase tracking-wider mb-1">
              Email
            </Text>
            <Text style={{ color: COLORS.text.white }} className="font-medium">
              {profile?.email || 'Non renseigné'}
            </Text>
          </View>
        </View>
      </View>

      {/* Status badge */}
      <View
        className="flex-row items-center px-4 py-2 rounded-full mb-8"
        style={{ backgroundColor: isRejected ? `${COLORS.accent.red}15` : `${COLORS.accent.teal}15` }}
      >
        <View
          className="w-2 h-2 rounded-full mr-2"
          style={{ backgroundColor: isRejected ? COLORS.accent.red : COLORS.accent.teal }}
        />
        <Text style={{ color: isRejected ? COLORS.accent.red : COLORS.accent.teal }} className="text-sm font-medium">
          {isRejected ? 'Demande refusée' : 'En attente de validation'}
        </Text>
      </View>

      {/* Refresh button */}
      {!isRejected && (
        <Pressable
          onPress={handleRefresh}
          disabled={isRefreshing}
          className="w-full rounded-xl py-4 flex-row items-center justify-center active:opacity-80 mb-3"
          style={{
            backgroundColor: COLORS.primary.gold,
            opacity: isRefreshing ? 0.6 : 1,
          }}
        >
          {isRefreshing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <RefreshCw size={20} color="#fff" />
              <Text style={{ color: '#fff' }} className="font-bold text-base ml-2">
                Vérifier le statut
              </Text>
            </>
          )}
        </Pressable>
      )}

      {/* Sign out button */}
      <Pressable
        onPress={handleSignOut}
        disabled={isSigningOut}
        className="w-full rounded-xl py-4 flex-row items-center justify-center active:opacity-80"
        style={{
          backgroundColor: `${COLORS.text.white}08`,
          borderWidth: 1,
          borderColor: `${COLORS.text.white}15`,
          opacity: isSigningOut ? 0.6 : 1,
        }}
      >
        {isSigningOut ? (
          <ActivityIndicator color={COLORS.text.muted} />
        ) : (
          <>
            <LogOut size={20} color={COLORS.text.muted} />
            <Text style={{ color: COLORS.text.muted }} className="font-medium text-base ml-2">
              Se déconnecter
            </Text>
          </>
        )}
      </Pressable>

      {/* Help text */}
      <Text style={{ color: COLORS.text.muted }} className="text-center text-xs mt-6 px-4">
        Si vous avez des questions, contactez-nous à{'\n'}
        <Text style={{ color: COLORS.primary.gold }}>contact@leschanvriersunis.fr</Text>
      </Text>
    </View>
  );
}
