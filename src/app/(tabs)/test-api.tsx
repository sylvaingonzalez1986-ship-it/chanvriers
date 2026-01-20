/**
 * Test Edge Functions Proxy
 * Écran de test pour vérifier les 5 proxies AI
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlaskConical, Play, RotateCcw, CheckCircle, XCircle, Clock, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import {
  openaiChat,
  anthropicChat,
  grokChat,
  googleChat,
  elevenlabsGetVoices,
  getValidSession,
} from '@/lib/ai-proxy';
import { COLORS } from '@/lib/colors';

// =============================================================================
// Types
// =============================================================================

type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

interface TestResult {
  status: ApiStatus;
  response?: string;
  error?: string;
  duration?: number;
}

type ApiName = 'openai' | 'anthropic' | 'grok' | 'google' | 'elevenlabs';

const API_CONFIG: Record<ApiName, { name: string; color: string; description: string }> = {
  openai: { name: 'OpenAI', color: '#10A37F', description: 'GPT-4o Mini' },
  anthropic: { name: 'Anthropic', color: '#D4A27F', description: 'Claude 3 Haiku' },
  grok: { name: 'Grok', color: '#1DA1F2', description: 'xAI Grok Beta' },
  google: { name: 'Google', color: '#4285F4', description: 'Gemini 1.5 Flash' },
  elevenlabs: { name: 'ElevenLabs', color: '#F5A623', description: 'Voices API' },
};

// =============================================================================
// Component
// =============================================================================

export default function TestApiScreen() {
  const [results, setResults] = useState<Record<ApiName, TestResult>>({
    openai: { status: 'idle' },
    anthropic: { status: 'idle' },
    grok: { status: 'idle' },
    google: { status: 'idle' },
    elevenlabs: { status: 'idle' },
  });

  const [requestCount, setRequestCount] = useState(0);

  // ---------------------------------------------------------------------------
  // Test Functions
  // ---------------------------------------------------------------------------

  const updateResult = useCallback((api: ApiName, result: Partial<TestResult>) => {
    setResults(prev => ({
      ...prev,
      [api]: { ...prev[api], ...result },
    }));
  }, []);

  const testOpenAI = useCallback(async () => {
    updateResult('openai', { status: 'loading' });
    const startTime = Date.now();
    setRequestCount(c => c + 1);

    try {
      const session = await getValidSession();
      if (!session?.access_token) {
        throw new Error('Non authentifié');
      }

      const result = await openaiChat({
        messages: [{ role: 'user', content: 'Dis bonjour en une phrase courte.' }],
        max_tokens: 50,
        accessToken: session.access_token,
      });

      const duration = Date.now() - startTime;

      if (result.success && result.data) {
        const text = result.data.choices[0]?.message?.content || 'Pas de réponse';
        updateResult('openai', { status: 'success', response: text, duration });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateResult('openai', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Erreur',
        duration,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [updateResult]);

  const testAnthropic = useCallback(async () => {
    updateResult('anthropic', { status: 'loading' });
    const startTime = Date.now();
    setRequestCount(c => c + 1);

    try {
      const session = await getValidSession();
      if (!session?.access_token) {
        throw new Error('Non authentifié');
      }

      const result = await anthropicChat({
        messages: [{ role: 'user', content: 'Dis bonjour en une phrase courte.' }],
        max_tokens: 50,
        accessToken: session.access_token,
      });

      const duration = Date.now() - startTime;

      if (result.success && result.data) {
        const text = result.data.content[0]?.text || 'Pas de réponse';
        updateResult('anthropic', { status: 'success', response: text, duration });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateResult('anthropic', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Erreur',
        duration,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [updateResult]);

  const testGrok = useCallback(async () => {
    updateResult('grok', { status: 'loading' });
    const startTime = Date.now();
    setRequestCount(c => c + 1);

    try {
      const session = await getValidSession();
      if (!session?.access_token) {
        throw new Error('Non authentifié');
      }

      const result = await grokChat({
        messages: [{ role: 'user', content: 'Dis bonjour en une phrase courte.' }],
        accessToken: session.access_token,
      });

      const duration = Date.now() - startTime;

      if (result.success && result.data) {
        const text = result.data.choices[0]?.message?.content || 'Pas de réponse';
        updateResult('grok', { status: 'success', response: text, duration });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateResult('grok', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Erreur',
        duration,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [updateResult]);

  const testGoogle = useCallback(async () => {
    updateResult('google', { status: 'loading' });
    const startTime = Date.now();
    setRequestCount(c => c + 1);

    try {
      const session = await getValidSession();
      if (!session?.access_token) {
        throw new Error('Non authentifié');
      }

      const result = await googleChat({
        prompt: 'Dis bonjour en une phrase courte.',
        accessToken: session.access_token,
      });

      const duration = Date.now() - startTime;

      if (result.success && result.data) {
        const text = result.data.candidates[0]?.content?.parts[0]?.text || 'Pas de réponse';
        updateResult('google', { status: 'success', response: text, duration });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateResult('google', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Erreur',
        duration,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [updateResult]);

  const testElevenLabs = useCallback(async () => {
    updateResult('elevenlabs', { status: 'loading' });
    const startTime = Date.now();
    setRequestCount(c => c + 1);

    try {
      const session = await getValidSession();
      if (!session?.access_token) {
        throw new Error('Non authentifié');
      }

      const result = await elevenlabsGetVoices({
        accessToken: session.access_token,
      });

      const duration = Date.now() - startTime;

      if (result.success && result.data) {
        const voiceCount = result.data.voices?.length || 0;
        const voiceNames = result.data.voices?.slice(0, 3).map(v => v.name).join(', ') || '';
        updateResult('elevenlabs', {
          status: 'success',
          response: `${voiceCount} voix disponibles: ${voiceNames}...`,
          duration,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(result.error || 'Erreur inconnue');
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      updateResult('elevenlabs', {
        status: 'error',
        error: error instanceof Error ? error.message : 'Erreur',
        duration,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [updateResult]);

  const testAll = useCallback(async () => {
    await Promise.all([
      testOpenAI(),
      testAnthropic(),
      testGrok(),
      testGoogle(),
      testElevenLabs(),
    ]);
  }, [testOpenAI, testAnthropic, testGrok, testGoogle, testElevenLabs]);

  const resetAll = useCallback(() => {
    setResults({
      openai: { status: 'idle' },
      anthropic: { status: 'idle' },
      grok: { status: 'idle' },
      google: { status: 'idle' },
      elevenlabs: { status: 'idle' },
    });
    setRequestCount(0);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const testFunctions: Record<ApiName, () => Promise<void>> = {
    openai: testOpenAI,
    anthropic: testAnthropic,
    grok: testGrok,
    google: testGoogle,
    elevenlabs: testElevenLabs,
  };

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  const successCount = Object.values(results).filter(r => r.status === 'success').length;
  const errorCount = Object.values(results).filter(r => r.status === 'error').length;
  const avgDuration = Object.values(results)
    .filter(r => r.duration)
    .reduce((acc, r, _, arr) => acc + (r.duration || 0) / arr.length, 0);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <SafeAreaView className="flex-1 bg-[#0A0F0D]">
      <ScrollView className="flex-1 px-4">
        {/* Header */}
        <View className="flex-row items-center justify-center gap-3 py-6">
          <FlaskConical size={28} color={COLORS.primary.gold} />
          <Text
            className="text-2xl text-white"
            style={{ fontFamily: 'Wallpoet_400Regular' }}
          >
            Test API Proxies
          </Text>
        </View>

        {/* Stats Bar */}
        <View className="flex-row justify-between bg-[#1A1F1D] rounded-xl p-4 mb-6">
          <View className="items-center">
            <Text className="text-gray-400 text-xs">Requêtes</Text>
            <Text className="text-white text-lg font-bold">{requestCount}</Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-400 text-xs">Succès</Text>
            <Text className="text-green-500 text-lg font-bold">{successCount}</Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-400 text-xs">Erreurs</Text>
            <Text className="text-red-500 text-lg font-bold">{errorCount}</Text>
          </View>
          <View className="items-center">
            <Text className="text-gray-400 text-xs">Temps moy.</Text>
            <Text className="text-white text-lg font-bold">
              {avgDuration ? `${Math.round(avgDuration)}ms` : '-'}
            </Text>
          </View>
        </View>

        {/* Global Actions */}
        <View className="flex-row gap-3 mb-6">
          <Pressable
            onPress={testAll}
            className="flex-1 flex-row items-center justify-center gap-2 bg-[#D4A853] rounded-xl py-3 active:opacity-80"
          >
            <Play size={18} color="#000" />
            <Text className="text-black font-bold">Tester Tout</Text>
          </Pressable>
          <Pressable
            onPress={resetAll}
            className="flex-row items-center justify-center gap-2 bg-[#2A2F2D] rounded-xl px-4 py-3 active:opacity-80"
          >
            <RotateCcw size={18} color="#888" />
            <Text className="text-gray-400">Reset</Text>
          </Pressable>
        </View>

        {/* Rate Limit Warning */}
        {requestCount >= 25 && (
          <View className="bg-yellow-900/30 border border-yellow-600 rounded-xl p-3 mb-4">
            <Text className="text-yellow-500 text-center text-sm">
              ⚠️ Attention: {30 - requestCount} requêtes restantes avant rate limit
            </Text>
          </View>
        )}

        {/* API Cards */}
        {(Object.keys(API_CONFIG) as ApiName[]).map((api) => {
          const config = API_CONFIG[api];
          const result = results[api];

          return (
            <View
              key={api}
              className="bg-[#1A1F1D] rounded-xl p-4 mb-4 border border-[#2A2F2D]"
            >
              {/* Header */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: config.color }}
                  />
                  <View>
                    <Text className="text-white font-bold text-lg">{config.name}</Text>
                    <Text className="text-gray-500 text-xs">{config.description}</Text>
                  </View>
                </View>

                {/* Status Icon */}
                {result.status === 'loading' && (
                  <ActivityIndicator size="small" color={config.color} />
                )}
                {result.status === 'success' && (
                  <CheckCircle size={24} color="#22C55E" />
                )}
                {result.status === 'error' && (
                  <XCircle size={24} color="#EF4444" />
                )}
              </View>

              {/* Test Button */}
              <Pressable
                onPress={testFunctions[api]}
                disabled={result.status === 'loading'}
                className="flex-row items-center justify-center gap-2 rounded-lg py-2.5 mb-3 active:opacity-80"
                style={{ backgroundColor: result.status === 'loading' ? '#333' : config.color }}
              >
                {result.status === 'loading' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Play size={16} color="#fff" />
                )}
                <Text className="text-white font-semibold">
                  {result.status === 'loading' ? 'Test en cours...' : `Tester ${config.name}`}
                </Text>
              </Pressable>

              {/* Result */}
              {result.status !== 'idle' && result.status !== 'loading' && (
                <View className="bg-[#0A0F0D] rounded-lg p-3">
                  {/* Duration */}
                  {result.duration && (
                    <View className="flex-row items-center gap-1 mb-2">
                      <Clock size={12} color="#888" />
                      <Text className="text-gray-500 text-xs">{result.duration}ms</Text>
                    </View>
                  )}

                  {/* Response or Error */}
                  {result.status === 'success' && result.response && (
                    <View>
                      <Text className="text-green-400 text-sm mb-2">{result.response}</Text>
                      <Pressable
                        onPress={() => copyToClipboard(result.response || '')}
                        className="flex-row items-center gap-1 self-end"
                      >
                        <Copy size={12} color="#888" />
                        <Text className="text-gray-500 text-xs">Copier</Text>
                      </Pressable>
                    </View>
                  )}
                  {result.status === 'error' && result.error && (
                    <Text className="text-red-400 text-sm">{result.error}</Text>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Footer */}
        <View className="py-6">
          <Text className="text-gray-600 text-center text-xs">
            Rate limit: 30 requêtes/minute par utilisateur
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
