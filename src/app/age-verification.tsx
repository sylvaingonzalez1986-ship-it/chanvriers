import React from 'react';
import { View, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Text } from '@/components/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShieldCheck, AlertTriangle, LogOut } from 'lucide-react-native';
import { COLORS } from '@/lib/colors';
import { useAuth } from '@/lib/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getValidSession, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase-auth';

// Fonction dédiée pour la confirmation d'âge (utilise PATCH, pas UPSERT)
async function confirmAgeDirectly(retryCount = 0): Promise<{ success: boolean; error: string | null }> {
  // Utiliser getValidSession pour rafraîchir le token si expiré
  const session = await getValidSession();
  if (!session?.access_token || !session?.user?.id) {
    return { success: false, error: 'Non authentifié' };
  }

  try {
    console.log('[AgeVerification] Updating profile with PATCH for user:', session.user.id);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          is_adult: true,
          age_verified_at: new Date().toISOString(),
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log('[AgeVerification] Response status:', response.status);
    console.log('[AgeVerification] Response:', responseText);

    if (!response.ok) {
      return { success: false, error: `Erreur ${response.status}: ${responseText}` };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('[AgeVerification] Error:', error);

    // Retry automatique en cas d'erreur réseau (max 2 fois)
    if (retryCount < 2) {
      console.log(`[AgeVerification] Retrying... (attempt ${retryCount + 2})`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1s
      return confirmAgeDirectly(retryCount + 1);
    }

    return { success: false, error: 'Problème de connexion. Vérifiez votre réseau et réessayez.' };
  }
}

export default function AgeVerificationScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { signOut, isSigningOut } = useAuth();

  // Log au montage pour debug
  React.useEffect(() => {
    console.log('[AgeVerification] Screen mounted - insets:', insets);
  }, []);

  // Mutation pour confirmer l'âge
  const confirmAgeMutation = useMutation({
    mutationFn: async () => {
      console.log('[AgeVerification] Confirming age...');
      const result = await confirmAgeDirectly();
      if (result.error) {
        throw new Error(result.error);
      }
      return true;
    },
    onSuccess: () => {
      console.log('[AgeVerification] Age confirmed successfully');
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
    },
    onError: (error) => {
      console.error('[AgeVerification] Error:', error);
    },
  });

  const handleConfirmAge = () => {
    confirmAgeMutation.mutate();
  };

  const handleDecline = () => {
    signOut();
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.background.nightSky,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 40,
        }}
      >
        {/* Icon */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View
            style={{
              width: 112,
              height: 112,
              borderRadius: 56,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: `${COLORS.primary.gold}20`,
              borderWidth: 3,
              borderColor: COLORS.primary.gold,
            }}
          >
            <ShieldCheck size={56} color={COLORS.primary.gold} />
          </View>
        </View>

        {/* Title */}
        <Text
          style={{
            color: COLORS.text.cream,
            fontSize: 28,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 16,
          }}
        >
          Vérification de l'âge
        </Text>

        {/* Warning Box */}
        <View
          style={{
            borderRadius: 16,
            padding: 20,
            marginBottom: 24,
            backgroundColor: `${COLORS.accent.red}15`,
            borderWidth: 1.5,
            borderColor: `${COLORS.accent.red}40`,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <AlertTriangle size={24} color={COLORS.accent.red} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                style={{
                  color: COLORS.accent.red,
                  fontWeight: 'bold',
                  fontSize: 16,
                  marginBottom: 8,
                }}
              >
                Accès réservé aux adultes
              </Text>
              <Text style={{ color: COLORS.text.lightGray, fontSize: 16, lineHeight: 24 }}>
                Cette application est réservée aux personnes de plus de 18 ans.
              </Text>
            </View>
          </View>
        </View>

        {/* Legal Text */}
        <View
          style={{
            borderRadius: 16,
            padding: 20,
            marginBottom: 32,
            backgroundColor: COLORS.background.charcoal,
            borderWidth: 1.5,
            borderColor: `${COLORS.primary.gold}30`,
          }}
        >
          <Text
            style={{
              color: COLORS.text.cream,
              textAlign: 'center',
              fontSize: 16,
              lineHeight: 28,
            }}
          >
            En appuyant sur "Je confirme", je déclare sur l'honneur avoir plus de 18 ans.
          </Text>
        </View>

        {/* Confirm Button */}
        <Pressable
          onPress={handleConfirmAge}
          disabled={confirmAgeMutation.isPending}
          style={{
            borderRadius: 16,
            paddingVertical: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            backgroundColor: COLORS.accent.forest,
            opacity: confirmAgeMutation.isPending ? 0.7 : 1,
          }}
        >
          {confirmAgeMutation.isPending ? (
            <ActivityIndicator size="small" color={COLORS.text.white} />
          ) : (
            <>
              <ShieldCheck size={24} color={COLORS.text.white} />
              <Text
                style={{
                  color: COLORS.text.white,
                  fontWeight: 'bold',
                  fontSize: 18,
                  marginLeft: 12,
                }}
              >
                Je confirme avoir +18 ans
              </Text>
            </>
          )}
        </Pressable>

        {/* Decline Button */}
        <Pressable
          onPress={handleDecline}
          disabled={isSigningOut}
          style={{
            borderRadius: 16,
            paddingVertical: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: `${COLORS.text.muted}50`,
          }}
        >
          {isSigningOut ? (
            <ActivityIndicator size="small" color={COLORS.text.muted} />
          ) : (
            <>
              <LogOut size={20} color={COLORS.text.muted} />
              <Text
                style={{
                  color: COLORS.text.muted,
                  fontWeight: '500',
                  fontSize: 16,
                  marginLeft: 8,
                }}
              >
                Quitter
              </Text>
            </>
          )}
        </Pressable>

        {/* Error Message */}
        {confirmAgeMutation.isError && (
          <View style={{ marginTop: 16, padding: 12, backgroundColor: `${COLORS.accent.red}15`, borderRadius: 12 }}>
            <Text style={{ color: COLORS.accent.red, textAlign: 'center', fontSize: 14 }}>
              {confirmAgeMutation.error?.message || 'Problème de connexion. Vérifiez votre réseau et réessayez.'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
