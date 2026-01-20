/**
 * Validation Library - Les Chanvriers Unis
 *
 * Centralized validation schemas using Zod for all Edge Functions.
 * Provides type-safe validation with clear error messages.
 *
 * @module validation
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// =============================================================================
// CONSTANTS
// =============================================================================

export const VALIDATION_LIMITS = {
  // String lengths
  EMAIL_MAX: 255,
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 72,
  USERNAME_MIN: 3,
  USERNAME_MAX: 30,
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 5000,
  PROMPT_MAX: 10000,

  // Numeric limits
  PRICE_MAX: 999999.99,
  QUANTITY_MAX: 10000,
  TEMPERATURE_MIN: 0,
  TEMPERATURE_MAX: 2,
  MAX_TOKENS_MIN: 1,
  MAX_TOKENS_MAX: 128000,
} as const;

// =============================================================================
// BASE SCHEMAS - Reusable atomic types
// =============================================================================

/** Valid UUID format */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/** Valid email format */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .max(VALIDATION_LIMITS.EMAIL_MAX, `Email must be at most ${VALIDATION_LIMITS.EMAIL_MAX} characters`);

/** Secure password requirements */
export const passwordSchema = z
  .string()
  .min(VALIDATION_LIMITS.PASSWORD_MIN, `Password must be at least ${VALIDATION_LIMITS.PASSWORD_MIN} characters`)
  .max(VALIDATION_LIMITS.PASSWORD_MAX, `Password must be at most ${VALIDATION_LIMITS.PASSWORD_MAX} characters`)
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

/** Username (alphanumeric with underscores) */
export const usernameSchema = z
  .string()
  .min(VALIDATION_LIMITS.USERNAME_MIN, `Username must be at least ${VALIDATION_LIMITS.USERNAME_MIN} characters`)
  .max(VALIDATION_LIMITS.USERNAME_MAX, `Username must be at most ${VALIDATION_LIMITS.USERNAME_MAX} characters`)
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores');

/** Title (no HTML allowed) */
export const titleSchema = z
  .string()
  .min(1, 'Title is required')
  .max(VALIDATION_LIMITS.TITLE_MAX, `Title must be at most ${VALIDATION_LIMITS.TITLE_MAX} characters`)
  .transform(str => sanitizeString(str));

/** Description (HTML sanitized) */
export const descriptionSchema = z
  .string()
  .max(VALIDATION_LIMITS.DESCRIPTION_MAX, `Description must be at most ${VALIDATION_LIMITS.DESCRIPTION_MAX} characters`)
  .transform(str => sanitizeHtml(str))
  .optional();

/** Positive price with max 2 decimals */
export const priceSchema = z
  .number()
  .positive('Price must be positive')
  .max(VALIDATION_LIMITS.PRICE_MAX, `Price must be at most ${VALIDATION_LIMITS.PRICE_MAX}`)
  .transform(val => Math.round(val * 100) / 100); // Round to 2 decimals

/** Positive integer quantity */
export const quantitySchema = z
  .number()
  .int('Quantity must be a whole number')
  .positive('Quantity must be positive')
  .max(VALIDATION_LIMITS.QUANTITY_MAX, `Quantity must be at most ${VALIDATION_LIMITS.QUANTITY_MAX}`);

/** ISO 8601 date string */
export const dateSchema = z
  .string()
  .datetime('Invalid date format. Use ISO 8601 format.')
  .transform(str => new Date(str));

/** Date not in the future */
export const pastDateSchema = z
  .string()
  .datetime('Invalid date format')
  .refine(
    (dateStr) => new Date(dateStr) <= new Date(),
    'Date cannot be in the future'
  );

// =============================================================================
// AUTHENTICATION SCHEMAS
// =============================================================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema.optional(),
  fullName: z.string().max(100).optional(),
});

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

// =============================================================================
// PRODUCT SCHEMAS
// =============================================================================

export const productTypeSchema = z.enum(['fleur', 'huile', 'resine', 'infusion', 'cosmetique', 'autre']);

export const productSchema = z.object({
  name: titleSchema,
  type: productTypeSchema,
  description: descriptionSchema,
  price_public: priceSchema,
  price_pro: priceSchema.optional(),
  cbd_percent: z.number().min(0).max(100).optional(),
  thc_percent: z.number().min(0).max(0.3, 'THC must be under 0.3%').optional(),
  weight: z.number().positive().optional(),
  stock: quantitySchema.optional(),
  producer_id: uuidSchema,
});

export const productUpdateSchema = productSchema.partial().extend({
  id: uuidSchema,
});

// =============================================================================
// ORDER SCHEMAS
// =============================================================================

export const orderItemSchema = z.object({
  productId: uuidSchema,
  producerId: uuidSchema,
  name: z.string().max(200),
  quantity: quantitySchema,
  price: priceSchema,
});

export const orderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Order must have at least one item'),
  customer_email: emailSchema,
  shipping_address: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

// =============================================================================
// GAME/PROGRESSION SCHEMAS
// =============================================================================

export const seasonSchema = z.object({
  name: titleSchema,
  year: z.number().int().min(2020).max(2100),
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
  status: z.enum(['planning', 'active', 'completed', 'archived']).optional(),
  notes: z.string().max(2000).optional(),
});

export const fieldSchema = z.object({
  season_id: uuidSchema,
  name: titleSchema,
  area_m2: z.number().positive().max(1000000).optional(),
  soil_type: z.string().max(50).optional(),
  crop_type: z.string().max(50).optional(),
  planting_date: dateSchema.optional(),
  harvest_date: dateSchema.optional(),
  yield_kg: z.number().min(0).max(100000).optional(),
});

export const playerProgressSchema = z.object({
  level: z.number().int().min(1).max(100),
  experience: z.number().int().min(0),
  coins: z.number().int().min(0),
});

// =============================================================================
// AI API PROXY SCHEMAS
// =============================================================================

export const aiProviderSchema = z.enum([
  'openai',
  'anthropic',
  'grok',
  'google',
  'elevenlabs'
]);

/** OpenAI proxy request schema */
export const openaiProxySchema = z.object({
  endpoint: z.string()
    .min(1, 'Endpoint is required')
    .refine(
      (ep) => ep.startsWith('/v1/'),
      'Endpoint must start with /v1/'
    ),
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE']).default('POST'),
  payload: z.object({
    model: z.string().max(100).optional(),
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant', 'function', 'tool']),
      content: z.string().max(VALIDATION_LIMITS.PROMPT_MAX),
      name: z.string().max(64).optional(),
    })).optional(),
    prompt: z.string().max(VALIDATION_LIMITS.PROMPT_MAX).optional(),
    max_tokens: z.number().int()
      .min(VALIDATION_LIMITS.MAX_TOKENS_MIN)
      .max(VALIDATION_LIMITS.MAX_TOKENS_MAX)
      .optional(),
    temperature: z.number()
      .min(VALIDATION_LIMITS.TEMPERATURE_MIN)
      .max(VALIDATION_LIMITS.TEMPERATURE_MAX)
      .optional(),
    stream: z.boolean().optional(),
  }).passthrough().optional(), // Allow additional OpenAI params
});

/** Anthropic proxy request schema */
export const anthropicProxySchema = z.object({
  endpoint: z.string()
    .min(1, 'Endpoint is required')
    .refine(
      (ep) => ep.startsWith('/v1/'),
      'Endpoint must start with /v1/'
    ),
  method: z.enum(['GET', 'POST']).default('POST'),
  payload: z.object({
    model: z.string().max(100).optional(),
    messages: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().max(VALIDATION_LIMITS.PROMPT_MAX),
    })).optional(),
    system: z.string().max(VALIDATION_LIMITS.PROMPT_MAX).optional(),
    max_tokens: z.number().int()
      .min(1)
      .max(200000)
      .optional(),
    temperature: z.number().min(0).max(1).optional(),
  }).passthrough().optional(),
});

/** Grok proxy request schema */
export const grokProxySchema = z.object({
  endpoint: z.string()
    .min(1, 'Endpoint is required')
    .refine(
      (ep) => ep.startsWith('/v1/'),
      'Endpoint must start with /v1/'
    ),
  method: z.enum(['GET', 'POST']).default('POST'),
  payload: z.object({
    model: z.string().max(100).optional(),
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string().max(VALIDATION_LIMITS.PROMPT_MAX),
    })).optional(),
    max_tokens: z.number().int().min(1).max(131072).optional(),
    temperature: z.number().min(0).max(2).optional(),
  }).passthrough().optional(),
});

/** Google AI proxy request schema */
export const googleProxySchema = z.object({
  endpoint: z.string()
    .min(1, 'Endpoint is required')
    .refine(
      (ep) => ep.startsWith('/v1beta/') || ep.startsWith('/v1/'),
      'Endpoint must start with /v1/ or /v1beta/'
    ),
  method: z.enum(['GET', 'POST']).default('POST'),
  payload: z.object({
    contents: z.array(z.object({
      role: z.enum(['user', 'model']).optional(),
      parts: z.array(z.object({
        text: z.string().max(VALIDATION_LIMITS.PROMPT_MAX).optional(),
      })).optional(),
    })).optional(),
    generationConfig: z.object({
      maxOutputTokens: z.number().int().min(1).max(8192).optional(),
      temperature: z.number().min(0).max(2).optional(),
    }).optional(),
  }).passthrough().optional(),
});

/** ElevenLabs proxy request schema */
export const elevenlabsProxySchema = z.object({
  endpoint: z.string()
    .min(1, 'Endpoint is required')
    .refine(
      (ep) => ep.startsWith('/v1/'),
      'Endpoint must start with /v1/'
    ),
  method: z.enum(['GET', 'POST']).default('POST'),
  payload: z.object({
    text: z.string().max(5000, 'Text must be at most 5000 characters').optional(),
    voice_settings: z.object({
      stability: z.number().min(0).max(1).optional(),
      similarity_boost: z.number().min(0).max(1).optional(),
    }).optional(),
    model_id: z.string().max(100).optional(),
  }).passthrough().optional(),
});

// =============================================================================
// SANITIZATION FUNCTIONS
// =============================================================================

/**
 * Sanitize a plain string - remove HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove potential script injections
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    // Remove null bytes
    .replace(/\x00/g, '')
    // Trim whitespace
    .trim();
}

/**
 * Sanitize HTML content - allow basic formatting, remove dangerous elements
 */
export function sanitizeHtml(input: string): string {
  // Remove script tags and their content
  let clean = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  clean = clean.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  clean = clean.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: URLs
  clean = clean.replace(/javascript:/gi, '');

  // Remove data: URLs (can contain scripts)
  clean = clean.replace(/data:/gi, '');

  // Remove iframe, object, embed tags
  clean = clean.replace(/<(iframe|object|embed|form|input|button)[^>]*>.*?<\/\1>/gi, '');
  clean = clean.replace(/<(iframe|object|embed|form|input|button)[^>]*\/?>/gi, '');

  // Remove style tags (can contain expressions)
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove link tags (can load external resources)
  clean = clean.replace(/<link[^>]*>/gi, '');

  // Remove null bytes
  clean = clean.replace(/\x00/g, '');

  return clean.trim();
}

/**
 * Escape SQL special characters (defense in depth - use parameterized queries!)
 */
export function escapeSqlString(input: string): string {
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, '\\\\')
    .replace(/\x00/g, '');
}

/**
 * Validate and sanitize a command string (prevent command injection)
 */
export function sanitizeCommand(input: string): string {
  // Remove shell metacharacters
  return input.replace(/[;&|`$(){}[\]<>\\!#*?]/g, '');
}

// =============================================================================
// VALIDATION MIDDLEWARE HELPERS
// =============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details: Array<{ path: string; message: string }>;
  };
}

/**
 * Validate data against a Zod schema with formatted error response
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const details = result.error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
  }));

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details,
    },
  };
}

/**
 * Create a validation error response for Edge Functions
 */
export function createValidationErrorResponse(
  error: NonNullable<ValidationResult<unknown>['error']>,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: error.code,
      message: error.message,
      details: error.details,
    }),
    {
      status: 400,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  );
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type SeasonInput = z.infer<typeof seasonSchema>;
export type FieldInput = z.infer<typeof fieldSchema>;
export type OpenAIProxyInput = z.infer<typeof openaiProxySchema>;
export type AnthropicProxyInput = z.infer<typeof anthropicProxySchema>;
export type GrokProxyInput = z.infer<typeof grokProxySchema>;
export type GoogleProxyInput = z.infer<typeof googleProxySchema>;
export type ElevenLabsProxyInput = z.infer<typeof elevenlabsProxySchema>;
