/**
 * OpenAI Proxy Edge Function
 *
 * Proxies requests to OpenAI API with:
 * - User authentication via Supabase
 * - Rate limiting (30 req/min per user)
 * - Input validation with Zod
 * - Secure API key storage (server-side only)
 *
 * Endpoints supported:
 * - /v1/chat/completions
 * - /v1/completions
 * - /v1/embeddings
 * - /v1/images/generations
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createValidatedHandler,
  openaiProxySchema,
  RATE_LIMIT_PRESETS,
  corsHeaders,
} from '../_shared/middleware.ts';
import type { OpenAIProxyInput } from '../_shared/validation.ts';

// =============================================================================
// ALLOWED ENDPOINTS (whitelist for security)
// =============================================================================

const ALLOWED_ENDPOINTS = [
  '/v1/chat/completions',
  '/v1/completions',
  '/v1/embeddings',
  '/v1/images/generations',
  '/v1/audio/transcriptions',
  '/v1/audio/translations',
  '/v1/models',
];

function isEndpointAllowed(endpoint: string): boolean {
  return ALLOWED_ENDPOINTS.some(allowed => endpoint.startsWith(allowed));
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

const handler = createValidatedHandler<OpenAIProxyInput>(
  {
    schema: openaiProxySchema,
    rateLimit: RATE_LIMIT_PRESETS.AI_API,
    functionName: 'openai-proxy',
  },
  async ({ user, data }) => {
    const startTime = Date.now();
    const { endpoint, method = 'POST', payload } = data;

    // -------------------------------------------------------------------------
    // Security: Only allow whitelisted endpoints
    // -------------------------------------------------------------------------
    if (!isEndpointAllowed(endpoint)) {
      console.error(`[OpenAI Proxy] Blocked endpoint: ${endpoint}`);
      return new Response(
        JSON.stringify({
          error: 'FORBIDDEN',
          message: 'Endpoint not allowed',
          allowed: ALLOWED_ENDPOINTS,
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
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) {
      console.error('[OpenAI Proxy] OPENAI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'SERVER_ERROR', message: 'API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // -------------------------------------------------------------------------
    // Call OpenAI API
    // -------------------------------------------------------------------------
    const apiUrl = `https://api.openai.com${endpoint}`;
    console.log(`[OpenAI Proxy] ${user.id} -> ${method} ${endpoint}`);

    const apiResponse = await fetch(apiUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' && payload ? JSON.stringify(payload) : undefined,
    });

    // -------------------------------------------------------------------------
    // Return Response
    // -------------------------------------------------------------------------
    const responseData = await apiResponse.json();
    const duration = Date.now() - startTime;

    console.log(`[OpenAI Proxy] Response: ${apiResponse.status} (${duration}ms)`);

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
