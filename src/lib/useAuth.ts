/**
 * useAuth Hook - Les Chanvriers Unis
 * Gestion de l'état d'authentification avec migration progressive
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AuthSession,
  AuthUser,
  UserProfile,
  loadStoredSession,
  signIn,
  signUp,
  signOut,
  signInWithMagicLink,
  verifyOtp,
  resetPassword,
  updatePassword,
  fetchProfile,
  updateProfile,
  linkUserCode,
  getSession,
  getCurrentUser,
  refreshSession,
} from './supabase-auth';
import { useReferralStore, useCollectionStore, useSubscriptionStore } from './store';
import { getAuthErrorType, AuthErrorType } from '@/components/AuthErrorBanner';

// Query keys
export const AUTH_QUERY_KEYS = {
  session: ['auth', 'session'] as const,
  profile: ['auth', 'profile'] as const,
};

/**
 * Hook principal d'authentification
 */
export function useAuth() {
  const queryClient = useQueryClient();
  const [isInitialized, setIsInitialized] = useState(false);

  // Charger la session au démarrage
  const { data: session, isLoading: isLoadingSession } = useQuery({
    queryKey: AUTH_QUERY_KEYS.session,
    queryFn: async () => {
      const stored = await loadStoredSession();
      setIsInitialized(true);
      return stored;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Charger le profil si connecté
  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: AUTH_QUERY_KEYS.profile,
    queryFn: async () => {
      const result = await fetchProfile();
      // React Query requires a non-undefined return value
      return result.profile ?? null;
    },
    enabled: !!session,
    staleTime: 1000 * 60 * 5,
  });

  // Mutation: Connexion email/password
  const signInMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const result = await signIn(email, password);
      if (result.error) throw new Error(result.error.message);
      return result.session;
    },
    onSuccess: (session) => {
      queryClient.setQueryData(AUTH_QUERY_KEYS.session, session);
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.profile });
    },
  });

  // Mutation: Inscription
  const signUpMutation = useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
    }: {
      email: string;
      password: string;
      fullName?: string;
    }) => {
      const result = await signUp(email, password, { full_name: fullName });
      if (result.error) throw new Error(result.error.message);
      return { session: result.session, user: result.user };
    },
    onSuccess: (data) => {
      if (data.session) {
        queryClient.setQueryData(AUTH_QUERY_KEYS.session, data.session);
        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.profile });
      }
    },
  });

  // Mutation: Déconnexion
  const signOutMutation = useMutation({
    mutationFn: async () => {
      const result = await signOut();
      if (result.error) throw new Error(result.error.message);
    },
    onSuccess: () => {
      queryClient.setQueryData(AUTH_QUERY_KEYS.session, null);
      queryClient.setQueryData(AUTH_QUERY_KEYS.profile, null);
      // Réinitialiser les stores utilisateur pour isoler les données entre comptes
      useCollectionStore.getState().resetStore();
      useSubscriptionStore.getState().resetStore();
      useReferralStore.getState().resetStore();
    },
  });

  // Mutation: Magic link
  const magicLinkMutation = useMutation({
    mutationFn: async (email: string) => {
      const result = await signInWithMagicLink(email);
      if (result.error) throw new Error(result.error.message);
    },
  });

  // Mutation: Vérifier OTP
  const verifyOtpMutation = useMutation({
    mutationFn: async ({ email, token }: { email: string; token: string }) => {
      const result = await verifyOtp(email, token);
      if (result.error) throw new Error(result.error.message);
      return result.session;
    },
    onSuccess: (session) => {
      queryClient.setQueryData(AUTH_QUERY_KEYS.session, session);
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.profile });
    },
  });

  // Mutation: Reset password
  const resetPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const result = await resetPassword(email);
      if (result.error) throw new Error(result.error.message);
    },
  });

  // Mutation: Update password
  const updatePasswordMutation = useMutation({
    mutationFn: async (newPassword: string) => {
      const result = await updatePassword(newPassword);
      if (result.error) throw new Error(result.error.message);
    },
  });

  // Mutation: Update profile
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const result = await updateProfile(updates);
      if (result.error) throw new Error(result.error.message);
      return result.profile;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(AUTH_QUERY_KEYS.profile, profile);
      // Force re-fetch to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.profile });
    },
  });

  // Mutation: Lier user_code
  const linkUserCodeMutation = useMutation({
    mutationFn: async (userCode: string) => {
      const result = await linkUserCode(userCode);
      if (result.error) throw new Error(result.error.message);
      return result.success;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.profile });
    },
  });

  // Rafraîchir la session
  const refresh = useCallback(async () => {
    const newSession = await refreshSession();
    queryClient.setQueryData(AUTH_QUERY_KEYS.session, newSession);
    return newSession;
  }, [queryClient]);

  return {
    // État
    session,
    user: session?.user ?? null,
    profile,
    isAuthenticated: !!session,
    isInitialized,
    isLoading: isLoadingSession || isLoadingProfile,

    // Actions
    signIn: signInMutation.mutateAsync,
    signUp: signUpMutation.mutateAsync,
    signOut: signOutMutation.mutateAsync,
    sendMagicLink: magicLinkMutation.mutateAsync,
    verifyOtp: verifyOtpMutation.mutateAsync,
    resetPassword: resetPasswordMutation.mutateAsync,
    updatePassword: updatePasswordMutation.mutateAsync,
    updateProfile: updateProfileMutation.mutateAsync,
    linkUserCode: linkUserCodeMutation.mutateAsync,
    refresh,

    // États des mutations
    isSigningIn: signInMutation.isPending,
    isSigningUp: signUpMutation.isPending,
    isSigningOut: signOutMutation.isPending,
    isSendingMagicLink: magicLinkMutation.isPending,
    isVerifyingOtp: verifyOtpMutation.isPending,
    isResettingPassword: resetPasswordMutation.isPending,
    isUpdatingPassword: updatePasswordMutation.isPending,
    isUpdatingProfile: updateProfileMutation.isPending,
    isLinkingUserCode: linkUserCodeMutation.isPending,

    // Erreurs
    signInError: signInMutation.error,
    signUpError: signUpMutation.error,
    magicLinkError: magicLinkMutation.error,

    // Types d'erreurs (pour distinguer réseau vs credentials)
    signInErrorType: signInMutation.error ? getAuthErrorType(signInMutation.error) : null,
    signUpErrorType: signUpMutation.error ? getAuthErrorType(signUpMutation.error) : null,
    magicLinkErrorType: magicLinkMutation.error ? getAuthErrorType(magicLinkMutation.error) : null,

    // Reset des erreurs
    resetSignInError: signInMutation.reset,
    resetSignUpError: signUpMutation.reset,
    resetMagicLinkError: magicLinkMutation.reset,

    // Retry pour la session (en cas d'erreur réseau au chargement)
    retrySession: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.session });
    },
    retryProfile: () => {
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.profile });
    },
  };
}

/**
 * Hook de migration progressive
 * Détecte automatiquement le mode d'authentification et gère la transition
 */
export function useUserIdentity() {
  const { session, profile, isAuthenticated, isInitialized, linkUserCode } = useAuth();

  // Récupérer le code local
  const localUserCode = useReferralStore((s) => s.myCode);
  const generateLocalCode = useReferralStore((s) => s.generateMyCode);

  // Déterminer le mode d'identification
  const authMode: 'supabase' | 'local' | 'migrating' | 'loading' = (() => {
    if (!isInitialized) return 'loading';
    if (isAuthenticated && profile?.user_code) return 'supabase';
    if (isAuthenticated && !profile?.user_code && localUserCode) return 'migrating';
    if (isAuthenticated) return 'supabase';
    return 'local';
  })();

  // Code utilisateur effectif (Supabase ou local)
  const userCode = profile?.user_code || localUserCode || '';

  // Générer un code local si nécessaire
  useEffect(() => {
    if (authMode === 'local' && !localUserCode) {
      generateLocalCode();
    }
  }, [authMode, localUserCode, generateLocalCode]);

  // Migration automatique : lier le code local au compte Supabase
  const migrateUserCode = useCallback(async () => {
    if (authMode === 'migrating' && localUserCode) {
      try {
        await linkUserCode(localUserCode);
        return true;
      } catch (error) {
        console.error('Erreur migration user_code:', error);
        return false;
      }
    }
    return false;
  }, [authMode, localUserCode, linkUserCode]);

  return {
    // Identité
    userCode,
    userId: session?.user?.id ?? null,
    email: profile?.email || session?.user?.email || null,
    fullName: profile?.full_name ?? null,
    role: profile?.role ?? 'client',
    category: profile?.category ?? null,

    // Mode
    authMode,
    isAuthenticated,
    isLocal: authMode === 'local',
    needsMigration: authMode === 'migrating',

    // Migration
    migrateUserCode,

    // Profil complet
    profile,
  };
}

/**
 * Hook pour vérifier les permissions basées sur le rôle
 * L'admin a accès à TOUTES les fonctionnalités pour pouvoir tester
 */
export function usePermissions() {
  const { profile, isAuthenticated } = useAuth();
  const role = profile?.role ?? 'client';
  const proStatus = (profile as any)?.pro_status ?? null;
  const isAdmin = role === 'admin';

  // Un pro est approuvé seulement si son statut est 'approved'
  const isProApproved = role === 'pro' && proStatus === 'approved';
  const isProPending = role === 'pro' && proStatus === 'pending';
  const isProRejected = role === 'pro' && proStatus === 'rejected';

  return {
    isAuthenticated,
    // L'admin a tous les rôles pour pouvoir tester toutes les fonctionnalités
    isClient: role === 'client' || isAdmin,
    isPro: role === 'pro' || isAdmin,
    isProApproved: isProApproved || isAdmin,
    isProPending,
    isProRejected,
    proStatus: isAdmin ? 'approved' : proStatus,
    isProducer: role === 'producer' || isAdmin,
    isAdmin,

    // Permissions composites
    canManageProducts: role === 'producer' || isAdmin,
    canManageOrders: role === 'pro' || role === 'producer' || isAdmin,
    canManageUsers: isAdmin,
    // Accès aux prix pro seulement si approuvé
    canAccessProPricing: isProApproved || role === 'producer' || isAdmin,
  };
}
