/**
 * Google AI (Gemini) Proxy Edge Function
 *
 * Proxies requests to Google Generative AI API with:
 * - User authentication via Supabase
 * - Rate limiting (30 req/min per user)
 * - Input validation with Zod
 * - Secure API key storage (server-side only)
 *
 * Endpoints supported:
 * - /v1beta/models/gemini-{model}:generateContent
 * - /v1beta/models/gemini-{model}:streamGenerateContent
 * - /v1/models/{model}
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import {
  createValidatedHandler,
  googleProxySchema,
  RATE_LIMIT_PRESETS,
  corsHeaders,
} from '../_shared/middleware.ts';
import type { GoogleProxyInput } from '../_shared/validation.ts';

// =============================================================================
// ALLOWED ENDPOINTS (regex patterns)
// =============================================================================

const ALLOWED_PATTERNS = [
  /^\/v1beta\/models\/gemini-[\w.-]+:generateContent$/,
  /^\/v1beta\/models\/gemini-[\w.-]+:streamGenerateContent$/,
  /^\/v1\/models\/gemini-[\w.-]+:generateContent$/,
  /^\/v1\/models$/,
];

function isEndpointAllowed(endpoint: string): boolean {
  return ALLOWED_PATTERNS.some(pattern => pattern.test(endpoint));
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

const handler = createValidatedHandler<GoogleProxyInput>(
  {
    schema: googleProxySchema,
    rateLimit: RATE_LIMIT_PRESETS.AI_API,
    functionName: 'google-proxy',
  },
  async ({ user, data }) => {
    const startTime = Date.now();
    const { endpoint, method = 'POST', payload } = data;

    // -------------------------------------------------------------------------
    // Security: Only allow whitelisted endpoints
    // -------------------------------------------------------------------------
    if (!isEndpointAllowed(endpoint)) {
      console.error(`[Google Proxy] Blocked endpoint: ${endpoint}`);
      return new Response(
        JSON.stringify({
          error: 'FORBIDDEN',
          message: 'Endpoint not allowed',
          hint: 'Use /v1beta/models/gemini-1.5-flash:generateContent or similar',
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
    const apiKey = Deno.env.get('GOOGLE_API_KEY');
    if (!apiKey) {
      console.error('[Google Proxy] GOOGLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'SERVER_ERROR', message: 'API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // -------------------------------------------------------------------------
    // Call Google API (key as query param)
    // -------------------------------------------------------------------------
    const apiUrl = `https://generativelanguage.googleapis.com${endpoint}?key=${apiKey}`;
    console.log(`[Google Proxy] ${user.id} -> ${method} ${endpoint}`);

    const apiResponse = await fetch(apiUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: method !== 'GET' && payload ? JSON.stringify(payload) : undefined,
    });

    // -------------------------------------------------------------------------
    // Return Response
    // -------------------------------------------------------------------------
    const responseData = await apiResponse.json();
    const duration = Date.now() - startTime;

    console.log(`[Google Proxy] Response: ${apiResponse.status} (${duration}ms)`);

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
