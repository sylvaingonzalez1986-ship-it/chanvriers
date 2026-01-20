/**
 * ElevenLabs (Voice AI) Proxy Edge Function
 *
 * Proxies requests to ElevenLabs API with:
 * - User authentication via Supabase
 * - Rate limiting (30 req/min per user)
 * - Input validation with Zod
 * - Secure API key storage (server-side only)
 *
 * Endpoints supported:
 * - /v1/text-to-speech/*
 * - /v1/voices
 * - /v1/voices/*
 * - /v1/models
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createValidatedHandler,
  elevenlabsProxySchema,
  RATE_LIMIT_PRESETS,
  corsHeaders,
} from '../_shared/middleware.ts';
import type { ElevenLabsProxyInput } from '../_shared/validation.ts';

// =============================================================================
// ALLOWED ENDPOINTS
// =============================================================================

const ALLOWED_PATTERNS = [
  /^\/v1\/text-to-speech\/[\w-]+$/,
  /^\/v1\/text-to-speech\/[\w-]+\/stream$/,
  /^\/v1\/voices$/,
  /^\/v1\/voices\/[\w-]+$/,
  /^\/v1\/models$/,
  /^\/v1\/user$/,
];

function isEndpointAllowed(endpoint: string): boolean {
  return ALLOWED_PATTERNS.some(pattern => pattern.test(endpoint));
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

const handler = createValidatedHandler<ElevenLabsProxyInput>(
  {
    schema: elevenlabsProxySchema,
    rateLimit: RATE_LIMIT_PRESETS.AI_API,
    functionName: 'elevenlabs-proxy',
  },
  async ({ user, data }) => {
    const startTime = Date.now();
    const { endpoint, method = 'POST', payload } = data;

    // -------------------------------------------------------------------------
    // Security: Only allow whitelisted endpoints
    // -------------------------------------------------------------------------
    if (!isEndpointAllowed(endpoint)) {
      console.error(`[ElevenLabs Proxy] Blocked endpoint: ${endpoint}`);
      return new Response(
        JSON.stringify({
          error: 'FORBIDDEN',
          message: 'Endpoint not allowed',
          hint: 'Use /v1/text-to-speech/{voice_id} or /v1/voices',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // -------------------------------------------------------------------------
    // Get API Key
    // -------------------------------------------------------------------------
    const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
    if (!apiKey) {
      console.error('[ElevenLabs Proxy] ELEVENLABS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'SERVER_ERROR', message: 'API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // -------------------------------------------------------------------------
    // Call ElevenLabs API
    // -------------------------------------------------------------------------
    const apiUrl = `https://api.elevenlabs.io${endpoint}`;
    console.log(`[ElevenLabs Proxy] ${user.id} -> ${method} ${endpoint}`);

    const apiResponse = await fetch(apiUrl, {
      method,
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' && payload ? JSON.stringify(payload) : undefined,
    });

    // -------------------------------------------------------------------------
    // Return Response - Handle both JSON and binary (audio) responses
    // -------------------------------------------------------------------------
    const contentType = apiResponse.headers.get('content-type') || '';
    const duration = Date.now() - startTime;

    console.log(`[ElevenLabs Proxy] Response: ${apiResponse.status} (${duration}ms) [${contentType}]`);

    // If audio response, return as binary
    if (contentType.includes('audio/')) {
      const audioData = await apiResponse.arrayBuffer();
      return new Response(audioData, {
        status: apiResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'X-Proxy-Duration': `${duration}ms`,
        },
      });
    }

    // Otherwise return JSON
    const responseData = await apiResponse.json();
    return new Response(JSON.stringify(responseData), {
      status: apiResponse.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'X-Proxy-Duration': `${duration}ms`,
      },
    });
  }
);

serve(handler);
