/**
 * Anthropic (Claude) Proxy Edge Function
 *
 * Proxies requests to Anthropic API with:
 * - User authentication via Supabase
 * - Rate limiting (30 req/min per user)
 * - Input validation with Zod
 * - Secure API key storage (server-side only)
 *
 * Endpoints supported:
 * - /v1/messages
 * - /v1/complete (legacy)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createValidatedHandler,
  anthropicProxySchema,
  RATE_LIMIT_PRESETS,
  corsHeaders,
} from '../_shared/middleware.ts';
import type { AnthropicProxyInput } from '../_shared/validation.ts';

// =============================================================================
// ALLOWED ENDPOINTS
// =============================================================================

const ALLOWED_ENDPOINTS = [
  '/v1/messages',
  '/v1/complete',
];

function isEndpointAllowed(endpoint: string): boolean {
  return ALLOWED_ENDPOINTS.some(allowed => endpoint.startsWith(allowed));
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

const handler = createValidatedHandler<AnthropicProxyInput>(
  {
    schema: anthropicProxySchema,
    rateLimit: RATE_LIMIT_PRESETS.AI_API,
    functionName: 'anthropic-proxy',
  },
  async ({ user, data }) => {
    const startTime = Date.now();
    const { endpoint, method = 'POST', payload } = data;

    // -------------------------------------------------------------------------
    // Security: Only allow whitelisted endpoints
    // -------------------------------------------------------------------------
    if (!isEndpointAllowed(endpoint)) {
      console.error(`[Anthropic Proxy] Blocked endpoint: ${endpoint}`);
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
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      console.error('[Anthropic Proxy] ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'SERVER_ERROR', message: 'API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // -------------------------------------------------------------------------
    // Call Anthropic API
    // -------------------------------------------------------------------------
    const apiUrl = `https://api.anthropic.com${endpoint}`;
    console.log(`[Anthropic Proxy] ${user.id} -> ${method} ${endpoint}`);

    const apiResponse = await fetch(apiUrl, {
      method,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' && payload ? JSON.stringify(payload) : undefined,
    });

    // -------------------------------------------------------------------------
    // Return Response
    // -------------------------------------------------------------------------
    const responseData = await apiResponse.json();
    const duration = Date.now() - startTime;

    console.log(`[Anthropic Proxy] Response: ${apiResponse.status} (${duration}ms)`);

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
