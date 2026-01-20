/**
 * AI Proxy - Appels sécurisés aux APIs d'IA via Edge Functions
 *
 * Les clés API sont stockées côté serveur (secrets Supabase).
 * L'authentification utilisateur est requise pour tous les appels.
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';

// Types pour les différents providers
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'grok' | 'elevenlabs';

interface ProxyRequestOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: Record<string, unknown>;
  accessToken: string;
}

interface ProxyResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Appel générique à un proxy AI
 */
async function callAIProxy<T = unknown>(
  provider: AIProvider,
  options: ProxyRequestOptions
): Promise<ProxyResponse<T>> {
  const { endpoint, method = 'POST', body, accessToken } = options;

  const functionName = `${provider}-proxy`;
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  // Check if Supabase URL is configured
  if (!SUPABASE_URL) {
    console.warn(`[AI Proxy] ${provider}: SUPABASE_URL not configured`);
    return {
      success: false,
      error: 'Supabase URL not configured. Please check your environment variables.',
    };
  }

  try {
    console.log(`[AI Proxy] ${provider}: Calling ${url}`);

    const response = await fetch(url, {
      method: 'POST', // Edge Function always receives POST
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        endpoint,
        method,
        payload: body,
      }),
    });

    if (!response.ok) {
      let errorText = '';
      try {
        errorText = await response.text();
      } catch {
        errorText = 'Unable to read error response';
      }

      console.warn(`[AI Proxy] ${provider} error:`, response.status, errorText);

      // Provide more helpful error messages based on status
      if (response.status === 404) {
        return {
          success: false,
          error: `Edge Function "${functionName}" not found. It may not be deployed yet.`,
        };
      }
      if (response.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please sign in again.',
        };
      }
      if (response.status === 500) {
        return {
          success: false,
          error: `Server error: ${errorText || 'The API key may not be configured on the server.'}`,
        };
      }

      return {
        success: false,
        error: `API error ${response.status}: ${errorText || 'Unknown error'}`,
      };
    }

    const data = await response.json() as T;
    return { success: true, data };

  } catch (error) {
    console.warn(`[AI Proxy] ${provider} network error:`, error);

    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : 'Network error';

    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
      return {
        success: false,
        error: `Network error: Unable to reach ${provider} proxy. The Edge Function may not be deployed or there's a connection issue.`,
      };
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// OpenAI
// ============================================================================

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChatOptions {
  model?: string;
  messages: OpenAIChatMessage[];
  temperature?: number;
  max_tokens?: number;
  accessToken: string;
}

export async function openaiChat(options: OpenAIChatOptions) {
  const { model = 'gpt-4o-mini', messages, temperature = 0.7, max_tokens = 1000, accessToken } = options;

  return callAIProxy<{ choices: Array<{ message: { content: string } }> }>('openai', {
    endpoint: '/v1/chat/completions',
    body: { model, messages, temperature, max_tokens },
    accessToken,
  });
}

export interface OpenAIImageOptions {
  prompt: string;
  model?: string;
  size?: '1024x1024' | '1792x1024' | '1024x1792';
  quality?: 'standard' | 'hd';
  accessToken: string;
}

export async function openaiGenerateImage(options: OpenAIImageOptions) {
  const { prompt, model = 'dall-e-3', size = '1024x1024', quality = 'standard', accessToken } = options;

  return callAIProxy<{ data: Array<{ url: string }> }>('openai', {
    endpoint: '/v1/images/generations',
    body: { prompt, model, size, quality, n: 1 },
    accessToken,
  });
}

// ============================================================================
// Anthropic (Claude)
// ============================================================================

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AnthropicChatOptions {
  model?: string;
  messages: AnthropicMessage[];
  system?: string;
  max_tokens?: number;
  accessToken: string;
}

export async function anthropicChat(options: AnthropicChatOptions) {
  const { model = 'claude-3-haiku-20240307', messages, system, max_tokens = 1000, accessToken } = options;

  return callAIProxy<{ content: Array<{ text: string }> }>('anthropic', {
    endpoint: '/v1/messages',
    body: { model, messages, system, max_tokens },
    accessToken,
  });
}

// ============================================================================
// Google (Gemini)
// ============================================================================

export interface GoogleChatOptions {
  model?: string;
  prompt: string;
  accessToken: string;
}

export async function googleChat(options: GoogleChatOptions) {
  const { model = 'gemini-1.5-flash', prompt, accessToken } = options;

  return callAIProxy<{ candidates: Array<{ content: { parts: Array<{ text: string }> } }> }>('google', {
    endpoint: `/v1/models/${model}:generateContent`,
    body: {
      contents: [{ parts: [{ text: prompt }] }],
    },
    accessToken,
  });
}

// ============================================================================
// Grok (xAI)
// ============================================================================

export interface GrokChatOptions {
  model?: string;
  messages: OpenAIChatMessage[]; // Same format as OpenAI
  accessToken: string;
}

export async function grokChat(options: GrokChatOptions) {
  const { model = 'grok-beta', messages, accessToken } = options;

  return callAIProxy<{ choices: Array<{ message: { content: string } }> }>('grok', {
    endpoint: '/v1/chat/completions',
    body: { model, messages },
    accessToken,
  });
}

// ============================================================================
// ElevenLabs (Voice) - Via Edge Function
// ============================================================================

export interface ElevenLabsTTSOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  accessToken: string;
}

export async function elevenlabsTextToSpeech(options: ElevenLabsTTSOptions) {
  const { text, voiceId = 'EXAVITQu4vr4xnSDxMaL', modelId = 'eleven_multilingual_v2', accessToken } = options;

  return callAIProxy<ArrayBuffer>('elevenlabs', {
    endpoint: `/v1/text-to-speech/${voiceId}`,
    body: { text, model_id: modelId },
    accessToken,
  });
}

export interface ElevenLabsVoicesOptions {
  accessToken: string;
}

export async function elevenlabsGetVoices(options: ElevenLabsVoicesOptions) {
  const { accessToken } = options;

  return callAIProxy<{ voices: Array<{ voice_id: string; name: string }> }>('elevenlabs', {
    endpoint: '/v1/voices',
    method: 'GET',
    accessToken,
  });
}

// ============================================================================
// Helper pour obtenir le token d'accès
// ============================================================================

export { getValidSession } from './supabase-auth';
