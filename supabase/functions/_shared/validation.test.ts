/**
 * Validation Tests - Les Chanvriers Unis
 *
 * Unit tests for all validation schemas
 * Run with: deno test --allow-net supabase/functions/_shared/validation.test.ts
 */

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';

import {
  emailSchema,
  passwordSchema,
  usernameSchema,
  titleSchema,
  priceSchema,
  quantitySchema,
  uuidSchema,
  loginSchema,
  registerSchema,
  productSchema,
  orderSchema,
  seasonSchema,
  openaiProxySchema,
  anthropicProxySchema,
  grokProxySchema,
  googleProxySchema,
  elevenlabsProxySchema,
  validateSchema,
  sanitizeString,
  sanitizeHtml,
  escapeSqlString,
} from './validation.ts';

// =============================================================================
// BASE SCHEMAS TESTS
// =============================================================================

Deno.test('emailSchema - valid emails', () => {
  const validEmails = [
    'test@example.com',
    'user.name@domain.co.uk',
    'user+tag@example.org',
  ];

  for (const email of validEmails) {
    const result = emailSchema.safeParse(email);
    assertEquals(result.success, true, `Should accept: ${email}`);
  }
});

Deno.test('emailSchema - invalid emails', () => {
  const invalidEmails = [
    'not-an-email',
    'missing@domain',
    '@no-local.com',
    'spaces in@email.com',
    '', // empty
  ];

  for (const email of invalidEmails) {
    const result = emailSchema.safeParse(email);
    assertEquals(result.success, false, `Should reject: ${email}`);
  }
});

Deno.test('passwordSchema - valid passwords', () => {
  const validPasswords = [
    'Password1',
    'MySecure123',
    'Test1234Password',
    'Abc123!!Complex',
  ];

  for (const password of validPasswords) {
    const result = passwordSchema.safeParse(password);
    assertEquals(result.success, true, `Should accept: ${password}`);
  }
});

Deno.test('passwordSchema - invalid passwords', () => {
  const invalidPasswords = [
    'short1A',      // too short
    'nouppercase1', // no uppercase
    'NOLOWERCASE1', // no lowercase
    'NoNumbers',    // no digits
    '',             // empty
  ];

  for (const password of invalidPasswords) {
    const result = passwordSchema.safeParse(password);
    assertEquals(result.success, false, `Should reject: ${password}`);
  }
});

Deno.test('usernameSchema - valid usernames', () => {
  const validUsernames = ['user123', 'JohnDoe', 'test_user', 'a1b2c3'];

  for (const username of validUsernames) {
    const result = usernameSchema.safeParse(username);
    assertEquals(result.success, true, `Should accept: ${username}`);
  }
});

Deno.test('usernameSchema - invalid usernames', () => {
  const invalidUsernames = [
    'ab',                     // too short
    'user@name',              // invalid char
    'user name',              // space
    'user-name',              // dash not allowed
    'a'.repeat(31),           // too long
  ];

  for (const username of invalidUsernames) {
    const result = usernameSchema.safeParse(username);
    assertEquals(result.success, false, `Should reject: ${username}`);
  }
});

Deno.test('priceSchema - valid prices', () => {
  const validPrices = [0.01, 1, 10.5, 99.99, 1000];

  for (const price of validPrices) {
    const result = priceSchema.safeParse(price);
    assertEquals(result.success, true, `Should accept: ${price}`);
  }
});

Deno.test('priceSchema - invalid prices', () => {
  const invalidPrices = [0, -1, -10.5, 1000000]; // 0, negative, too high

  for (const price of invalidPrices) {
    const result = priceSchema.safeParse(price);
    assertEquals(result.success, false, `Should reject: ${price}`);
  }
});

Deno.test('priceSchema - rounds to 2 decimals', () => {
  const result = priceSchema.safeParse(10.999);
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data, 11.00);
  }
});

Deno.test('uuidSchema - valid UUIDs', () => {
  const validUUIDs = [
    '123e4567-e89b-12d3-a456-426614174000',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  ];

  for (const uuid of validUUIDs) {
    const result = uuidSchema.safeParse(uuid);
    assertEquals(result.success, true, `Should accept: ${uuid}`);
  }
});

Deno.test('uuidSchema - invalid UUIDs', () => {
  const invalidUUIDs = [
    'not-a-uuid',
    '123456',
    '123e4567-e89b-12d3-a456', // incomplete
  ];

  for (const uuid of invalidUUIDs) {
    const result = uuidSchema.safeParse(uuid);
    assertEquals(result.success, false, `Should reject: ${uuid}`);
  }
});

// =============================================================================
// AUTHENTICATION SCHEMAS TESTS
// =============================================================================

Deno.test('loginSchema - valid login', () => {
  const result = loginSchema.safeParse({
    email: 'test@example.com',
    password: 'Password123',
  });
  assertEquals(result.success, true);
});

Deno.test('loginSchema - missing password', () => {
  const result = loginSchema.safeParse({
    email: 'test@example.com',
  });
  assertEquals(result.success, false);
});

Deno.test('registerSchema - valid registration', () => {
  const result = registerSchema.safeParse({
    email: 'test@example.com',
    password: 'SecurePass1',
    username: 'testuser',
  });
  assertEquals(result.success, true);
});

// =============================================================================
// PRODUCT SCHEMAS TESTS
// =============================================================================

Deno.test('productSchema - valid product', () => {
  const result = productSchema.safeParse({
    name: 'CBD Flower',
    type: 'fleur',
    price_public: 25.99,
    producer_id: '123e4567-e89b-12d3-a456-426614174000',
  });
  assertEquals(result.success, true);
});

Deno.test('productSchema - invalid THC (>0.3%)', () => {
  const result = productSchema.safeParse({
    name: 'CBD Flower',
    type: 'fleur',
    price_public: 25.99,
    producer_id: '123e4567-e89b-12d3-a456-426614174000',
    thc_percent: 0.5, // Too high!
  });
  assertEquals(result.success, false);
});

Deno.test('productSchema - invalid type', () => {
  const result = productSchema.safeParse({
    name: 'Product',
    type: 'invalid_type',
    price_public: 10,
    producer_id: '123e4567-e89b-12d3-a456-426614174000',
  });
  assertEquals(result.success, false);
});

// =============================================================================
// AI PROXY SCHEMAS TESTS
// =============================================================================

Deno.test('openaiProxySchema - valid request', () => {
  const result = openaiProxySchema.safeParse({
    endpoint: '/v1/chat/completions',
    method: 'POST',
    payload: {
      model: 'gpt-4',
      messages: [
        { role: 'user', content: 'Hello' },
      ],
      temperature: 0.7,
    },
  });
  assertEquals(result.success, true);
});

Deno.test('openaiProxySchema - invalid endpoint', () => {
  const result = openaiProxySchema.safeParse({
    endpoint: '/invalid/endpoint',
    method: 'POST',
  });
  assertEquals(result.success, false);
});

Deno.test('anthropicProxySchema - valid request', () => {
  const result = anthropicProxySchema.safeParse({
    endpoint: '/v1/messages',
    method: 'POST',
    payload: {
      model: 'claude-3-opus-20240229',
      messages: [
        { role: 'user', content: 'Hello Claude' },
      ],
      max_tokens: 1000,
    },
  });
  assertEquals(result.success, true);
});

Deno.test('grokProxySchema - valid request', () => {
  const result = grokProxySchema.safeParse({
    endpoint: '/v1/chat/completions',
    method: 'POST',
    payload: {
      model: 'grok-2',
      messages: [
        { role: 'user', content: 'Hello Grok' },
      ],
    },
  });
  assertEquals(result.success, true);
});

Deno.test('googleProxySchema - valid request', () => {
  const result = googleProxySchema.safeParse({
    endpoint: '/v1beta/models/gemini-1.5-flash:generateContent',
    method: 'POST',
    payload: {
      contents: [
        { parts: [{ text: 'Hello Gemini' }] },
      ],
    },
  });
  assertEquals(result.success, true);
});

Deno.test('elevenlabsProxySchema - valid request', () => {
  const result = elevenlabsProxySchema.safeParse({
    endpoint: '/v1/voices',
    method: 'GET',
  });
  assertEquals(result.success, true);
});

Deno.test('elevenlabsProxySchema - text-to-speech request', () => {
  const result = elevenlabsProxySchema.safeParse({
    endpoint: '/v1/text-to-speech/voice123',
    method: 'POST',
    payload: {
      text: 'Hello world',
      model_id: 'eleven_multilingual_v2',
    },
  });
  assertEquals(result.success, true);
});

// =============================================================================
// SANITIZATION TESTS
// =============================================================================

Deno.test('sanitizeString - removes HTML tags', () => {
  const input = '<script>alert("xss")</script>Hello';
  const result = sanitizeString(input);
  assertEquals(result, 'alert("xss")Hello');
});

Deno.test('sanitizeString - removes javascript:', () => {
  const input = 'javascript:alert(1)';
  const result = sanitizeString(input);
  assertEquals(result, 'alert(1)');
});

Deno.test('sanitizeString - removes event handlers', () => {
  const input = 'onclick=alert(1)';
  const result = sanitizeString(input);
  assertEquals(result, 'alert(1)');
});

Deno.test('sanitizeHtml - removes script tags', () => {
  const input = '<p>Hello</p><script>evil()</script><p>World</p>';
  const result = sanitizeHtml(input);
  assertEquals(result.includes('script'), false);
  assertEquals(result.includes('Hello'), true);
  assertEquals(result.includes('World'), true);
});

Deno.test('sanitizeHtml - removes event handlers from tags', () => {
  const input = '<img src="x" onerror="alert(1)">';
  const result = sanitizeHtml(input);
  assertEquals(result.includes('onerror'), false);
});

Deno.test('escapeSqlString - escapes single quotes', () => {
  const input = "O'Brien";
  const result = escapeSqlString(input);
  assertEquals(result, "O''Brien");
});

// =============================================================================
// VALIDATE SCHEMA HELPER TESTS
// =============================================================================

Deno.test('validateSchema - returns success with data', () => {
  const result = validateSchema(emailSchema, 'test@example.com');
  assertEquals(result.success, true);
  assertExists(result.data);
  assertEquals(result.data, 'test@example.com');
});

Deno.test('validateSchema - returns error with details', () => {
  const result = validateSchema(emailSchema, 'invalid');
  assertEquals(result.success, false);
  assertExists(result.error);
  assertEquals(result.error.code, 'VALIDATION_ERROR');
  assertEquals(Array.isArray(result.error.details), true);
});

// =============================================================================
// SEASON SCHEMA TESTS
// =============================================================================

Deno.test('seasonSchema - valid season', () => {
  const result = seasonSchema.safeParse({
    name: 'Summer 2026',
    year: 2026,
    status: 'active',
  });
  assertEquals(result.success, true);
});

Deno.test('seasonSchema - invalid year (too old)', () => {
  const result = seasonSchema.safeParse({
    name: 'Old Season',
    year: 2010,
  });
  assertEquals(result.success, false);
});

// =============================================================================
// ORDER SCHEMA TESTS
// =============================================================================

Deno.test('orderSchema - valid order', () => {
  const result = orderSchema.safeParse({
    items: [
      {
        productId: '123e4567-e89b-12d3-a456-426614174000',
        producerId: '123e4567-e89b-12d3-a456-426614174001',
        name: 'CBD Oil',
        quantity: 2,
        price: 29.99,
      },
    ],
    customer_email: 'customer@example.com',
  });
  assertEquals(result.success, true);
});

Deno.test('orderSchema - empty items array', () => {
  const result = orderSchema.safeParse({
    items: [],
    customer_email: 'customer@example.com',
  });
  assertEquals(result.success, false);
});

console.log('\n✅ All validation tests completed!');
