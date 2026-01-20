import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Wallpoet_400Regular } from '@expo-google-fonts/wallpoet';
import { useCallback, useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useDataSync } from '../lib/useDataSync';
import { useUserDataSync } from '../lib/useUserData';
import { AudioProvider } from '../contexts/AudioContext';
import { useAuth, usePermissions } from '../lib/useAuth';
import { COLORS } from '../lib/colors';
import { validateEnvironment } from '../lib/env-validation';
import { NetworkProvider, useNetwork } from '../lib/network-context';
import { NetworkBanner } from '../components/NetworkBanner';
import { setupOrderQueueNetworkListener, cleanupOrderQueueNetworkListener } from '../lib/order-queue-store';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Custom dark theme for the app
const ChanvriersUnisDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0A0F0D',
    card: '#141F18',
    primary: '#D4AF37',
    border: '#1A472A',
  },
};

/**
 * Auth Guard Component - Gère la navigation basée sur l'état d'authentification
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isInitialized, profile, session } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Debug logs pour diagnostiquer les problèmes de chargement
  useEffect(() => {
    console.log('[AuthGuard] State:', {
      isInitialized,
      isLoading,
      isAuthenticated,
      hasProfile: !!profile,
      hasSession: !!session,
      loadingTimeout,
      segments: segments.join('/'),
    });
  }, [isInitialized, isLoading, isAuthenticated, profile, session, loadingTimeout, segments]);

  // Timeout de sécurité pour éviter un chargement infini (10 secondes au lieu de 15)
  useEffect(() => {
    if (!isInitialized || isLoading) {
      console.log('[AuthGuard] Starting loading timeout timer (10s)...');
      const timeout = setTimeout(() => {
        console.log('[AuthGuard] Loading timeout reached after 10s, forcing navigation');
        setLoadingTimeout(true);
      }, 10000);
      return () => clearTimeout(timeout);
    }
  }, [isInitialized, isLoading]);

  useEffect(() => {
    // Attendre que l'authentification soit initialisée (ou timeout atteint)
    if (!isInitialized || (isLoading && !loadingTimeout)) return;

    const inAuthGroup = segments[0] === 'auth';
    const inAgeVerification = segments[0] === 'age-verification';
    const inProPending = segments[0] === 'pro-pending';

    // Si non authentifié, rediriger vers login
    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace('/auth/login');
      }
      return;
    }

    // Si authentifié mais âge non vérifié, rediriger vers vérification d'âge
    const isAdultVerified = profile?.is_adult === true;

    if (!isAdultVerified) {
      if (!inAgeVerification && !inAuthGroup) {
        router.replace('/age-verification');
      }
      return;
    }

    // Si compte pro en attente de validation, bloquer l'accès
    const isPro = profile?.role === 'pro';
    const proStatus = (profile as any)?.pro_status;
    const isProPending = isPro && (proStatus === 'pending' || proStatus === null);

    if (isProPending) {
      if (!inProPending && !inAuthGroup) {
        router.replace('/pro-pending');
      }
      return;
    }

    // Si compte pro rejeté, rediriger vers page pending avec message
    const isProRejected = isPro && proStatus === 'rejected';
    if (isProRejected) {
      if (!inProPending && !inAuthGroup) {
        router.replace('/pro-pending');
      }
      return;
    }

    // Si authentifié et âge vérifié et pas en attente pro, mais sur une page spéciale
    if (inAuthGroup || inAgeVerification || inProPending) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isInitialized, isLoading, loadingTimeout, profile?.is_adult, (profile as any)?.role, (profile as any)?.pro_status, segments, router]);

  // Afficher un loader pendant l'initialisation (max 15 secondes)
  if (!isInitialized || (isLoading && !loadingTimeout)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background.nightSky }}>
        <ActivityIndicator size="large" color={COLORS.primary.gold} />
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * Audio Wrapper - Fournit le contexte audio global
 */
function AudioWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AudioProvider>
      {children}
    </AudioProvider>
  );
}

/**
 * Network Status Wrapper - Affiche la bannière réseau globale
 */
function NetworkStatusWrapper({ children }: { children: React.ReactNode }) {
  const { isOnline, checkConnection } = useNetwork();
  const [showSuccess, setShowSuccess] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline && isOnline) {
      // On vient de se reconnecter, afficher le message de succès
      setShowSuccess(true);
      setWasOffline(false);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }, [isOnline, wasOffline]);

  return (
    <>
      <NetworkBanner
        isOnline={isOnline}
        showSuccess={showSuccess}
        onRetry={checkConnection}
      />
      {children}
    </>
  );
}

function RootLayoutNav() {
  // Sync data from Supabase on app startup
  useDataSync();
  // Sync user-specific data (collection, tickets, referrals)
  useUserDataSync();

  // Setup order queue network listener for auto-resync
  useEffect(() => {
    setupOrderQueueNetworkListener();
    return () => {
      cleanupOrderQueueNetworkListener();
    };
  }, []);

  return (
    <ThemeProvider value={ChanvriersUnisDarkTheme}>
      <AuthGuard>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="age-verification" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="pro-pending" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="producer-profile" options={{ headerShown: false }} />
          <Stack.Screen name="admin-music" options={{ headerShown: false }} />
          <Stack.Screen name="edit-profile" options={{ headerShown: false, presentation: 'modal' }} />
          <Stack.Screen name="panier-vente-directe" options={{ headerShown: false }} />
          <Stack.Screen name="commande-confirmation" options={{ headerShown: false }} />
          <Stack.Screen name="mes-commandes-marche-local" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
      </AuthGuard>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Wallpoet_400Regular,
  });

  // Validate environment variables safely (without crashing)
  const envValidation = validateEnvironment();

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Log environment validation result for debugging
  useEffect(() => {
    if (!envValidation.isValid) {
      console.error('[ENV] Missing required variables:', envValidation.missingRequired);
    } else {
      console.log('[ENV] Environment validation passed');
    }
  }, [envValidation.isValid, envValidation.missingRequired]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Show error screen instead of crashing if environment is invalid
  if (!envValidation.isValid) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A0F0D', padding: 24 }}>
        <Text style={{ color: '#FF6B6B', fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>
          Configuration manquante
        </Text>
        <Text style={{ color: '#FFFFFF', fontSize: 14, textAlign: 'center', marginBottom: 8 }}>
          Variables d'environnement requises:
        </Text>
        {envValidation.missingRequired.map((v) => (
          <Text key={v} style={{ color: '#D4AF37', fontSize: 12, textAlign: 'center' }}>
            • {v}
          </Text>
        ))}
        <Text style={{ color: '#888888', fontSize: 12, textAlign: 'center', marginTop: 16 }}>
          Veuillez contacter le support.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <NetworkProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <AudioWrapper>
                <NetworkStatusWrapper>
                  <StatusBar style="light" />
                  <RootLayoutNav />
                </NetworkStatusWrapper>
              </AudioWrapper>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </NetworkProvider>
      </QueryClientProvider>
    </View>
  );
}