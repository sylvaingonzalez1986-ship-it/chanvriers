/**
 * Request Validation Middleware - Les Chanvriers Unis
 *
 * Provides unified request validation for all Edge Functions.
 * Combines authentication, rate limiting, and schema validation.
 *
 * @module middleware
 */

import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import {
  validateSchema,
  createValidationErrorResponse,
  ValidationResult,
} from './validation.ts';
import {
  checkRateLimit,
  createRateLimitResponse,
  RateLimitConfig,
  RATE_LIMIT_PRESETS,
  logSecurityEvent,
} from './rate-limit.ts';
import { corsHeaders } from './cors.ts';

// =============================================================================
// TYPES
// =============================================================================

export interface ValidatedRequest<T> {
  user: User;
  data: T;
  supabase: SupabaseClient;
  ip: string;
  userAgent: string;
}

export interface MiddlewareConfig<T> {
  /** Zod schema to validate request body */
  schema: z.ZodSchema<T>;
  /** Rate limit configuration */
  rateLimit?: RateLimitConfig;
  /** Require authentication (default: true) */
  requireAuth?: boolean;
  /** Function name for logging */
  functionName: string;
}

export type RequestHandler<T> = (
  validatedRequest: ValidatedRequest<T>,
  rawRequest: Request
) => Promise<Response>;

// =============================================================================
// CORS HEADERS
// =============================================================================

export { corsHeaders };

// =============================================================================
// MIDDLEWARE FACTORY
// =============================================================================

/**
 * Create a validated request handler
 *
 * @example
 * ```ts
 * const handler = createValidatedHandler({
 *   schema: openaiProxySchema,
 *   rateLimit: RATE_LIMIT_PRESETS.AI_API,
 *   functionName: 'openai-proxy',
 * }, async ({ user, data, supabase }) => {
 *   // Handle validated request
 *   return new Response(JSON.stringify({ success: true }));
 * });
 *
 * serve(handler);
 * ```
 */
export function createValidatedHandler<T>(
  config: MiddlewareConfig<T>,
  handler: RequestHandler<T>
): (req: Request) => Promise<Response> {
  const {
    schema,
    rateLimit = RATE_LIMIT_PRESETS.GENERAL,
    requireAuth = true,
    functionName,
  } = config;

  return async (req: Request): Promise<Response> => {
    const startTime = Date.now();
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // -------------------------------------------------------------------------
    // Handle CORS preflight
    // -------------------------------------------------------------------------
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders });
    }

    // -------------------------------------------------------------------------
    // 1. AUTHENTICATION
    // -------------------------------------------------------------------------
    let user: User | null = null;
    let supabase: SupabaseClient;

    if (requireAuth) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        logSecurityEvent({
          userId: 'anonymous',
          action: 'auth_missing',
          endpoint: functionName,
          ip,
          userAgent,
          success: false,
          reason: 'Missing authorization header',
        });

        return new Response(
          JSON.stringify({
            error: 'UNAUTHORIZED',
            message: 'Missing authorization header',
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        logSecurityEvent({
          userId: 'anonymous',
          action: 'auth_failed',
          endpoint: functionName,
          ip,
          userAgent,
          success: false,
          reason: userError?.message || 'Invalid token',
        });

        return new Response(
          JSON.stringify({
            error: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
            details: userError?.message,
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      user = userData.user;
    } else {
      // Anonymous access allowed
      supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
    }

    const userId = user?.id || ip; // Use IP for rate limiting if anonymous

    // -------------------------------------------------------------------------
    // 2. RATE LIMITING
    // -------------------------------------------------------------------------
    const rateLimitResult = checkRateLimit(userId, rateLimit);

    if (!rateLimitResult.allowed) {
      logSecurityEvent({
        userId,
        action: 'rate_limit_exceeded',
        endpoint: functionName,
        ip,
        userAgent,
        success: false,
        reason: `Exceeded ${rateLimit.limit} requests per window`,
      });

      return createRateLimitResponse(rateLimitResult, rateLimit, corsHeaders);
    }

    // -------------------------------------------------------------------------
    // 3. PARSE REQUEST BODY
    // -------------------------------------------------------------------------
    let body: unknown;
    try {
      const contentType = req.headers.get('content-type') || '';

      if (req.method === 'GET') {
        // Parse query parameters for GET requests
        const url = new URL(req.url);
        body = Object.fromEntries(url.searchParams.entries());
      } else if (contentType.includes('application/json')) {
        body = await req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await req.formData();
        body = Object.fromEntries(formData.entries());
      } else {
        body = {};
      }
    } catch (parseError) {
      logSecurityEvent({
        userId,
        action: 'parse_error',
        endpoint: functionName,
        ip,
        userAgent,
        success: false,
        reason: 'Invalid request body',
      });

      return new Response(
        JSON.stringify({
          error: 'PARSE_ERROR',
          message: 'Invalid request body. Expected valid JSON.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // -------------------------------------------------------------------------
    // 4. VALIDATE SCHEMA
    // -------------------------------------------------------------------------
    const validationResult: ValidationResult<T> = validateSchema(schema, body);

    if (!validationResult.success) {
      logSecurityEvent({
        userId,
        action: 'validation_failed',
        endpoint: functionName,
        ip,
        userAgent,
        success: false,
        reason: validationResult.error?.details.map(d => d.message).join(', '),
      });

      return createValidationErrorResponse(validationResult.error!, corsHeaders);
    }

    // -------------------------------------------------------------------------
    // 5. EXECUTE HANDLER
    // -------------------------------------------------------------------------
    try {
      const validatedRequest: ValidatedRequest<T> = {
        user: user!,
        data: validationResult.data!,
        supabase,
        ip,
        userAgent,
      };

      const response = await handler(validatedRequest, req);
      const duration = Date.now() - startTime;

      console.log(`[${functionName}] ${userId} - ${req.method} - ${response.status} (${duration}ms)`);

      return response;

    } catch (handlerError) {
      const errorMessage = handlerError instanceof Error ? handlerError.message : 'Unknown error';

      logSecurityEvent({
        userId,
        action: 'handler_error',
        endpoint: functionName,
        ip,
        userAgent,
        success: false,
        reason: errorMessage,
      });

      console.error(`[${functionName}] Handler error:`, handlerError);

      return new Response(
        JSON.stringify({
          error: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export { RATE_LIMIT_PRESETS } from './rate-limit.ts';
export * from './validation.ts';
