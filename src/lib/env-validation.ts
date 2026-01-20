/**
 * Environment Variables Validation
 * This module validates that all required environment variables are present
 * and throws an error at startup if any are missing.
 *
 * SECURITY: Never expose or log the actual values of these variables.
 */

interface EnvValidationResult {
  isValid: boolean;
  missingRequired: string[];
  missingOptional: string[];
}

/**
 * Validates environment variables and returns the result
 * Does NOT log any values for security
 */
export function validateEnvironment(): EnvValidationResult {
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  // Check required variables - must access statically for Expo
  if (!process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL.trim() === '') {
    missingRequired.push('EXPO_PUBLIC_SUPABASE_URL');
  }
  if (!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.trim() === '') {
    missingRequired.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  // Check optional variables
  if (!process.env.EXPO_PUBLIC_ENCRYPTION_KEY || process.env.EXPO_PUBLIC_ENCRYPTION_KEY.trim() === '') {
    missingOptional.push('EXPO_PUBLIC_ENCRYPTION_KEY');
  }

  return {
    isValid: missingRequired.length === 0,
    missingRequired,
    missingOptional,
  };
}

/**
 * Throws an error if required environment variables are missing
 * Call this at app startup to fail fast
 */
export function assertEnvironmentValid(): void {
  const result = validateEnvironment();

  if (!result.isValid) {
    const errorMessage = `
[FATAL] Missing required environment variables:
${result.missingRequired.map(v => `  - ${v}`).join('\n')}

Please add these variables in the ENV tab of the Vibecode app.
The application cannot start without them.
`.trim();

    console.error('[ENV] Validation failed - missing required variables');
    throw new Error(errorMessage);
  }

  // Log warnings for optional variables (without exposing values)
  if (result.missingOptional.length > 0) {
    console.warn('[ENV] Optional variables not configured:', result.missingOptional.join(', '));
  }

  console.log('[ENV] Environment validation passed');
}

/**
 * Get Supabase configuration
 * Throws if not configured
 */
export function getSupabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Supabase non configuré. Ajoutez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans l\'onglet ENV.'
    );
  }

  return { url, anonKey };
}

/**
 * Check if Supabase is configured (non-throwing version)
 */
export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}
