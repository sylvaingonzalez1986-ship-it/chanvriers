/**
 * Script de vérification de la configuration Supabase Auth
 * Vérifie si les tables et types nécessaires sont en place
 */

import { isSupabaseConfigured, getSupabaseConfig } from './env-validation';

interface CheckResult {
  name: string;
  exists: boolean;
  error?: string;
}

async function checkTable(tableName: string): Promise<CheckResult> {
  if (!isSupabaseConfigured()) {
    return { name: tableName, exists: false, error: 'Supabase non configuré' };
  }

  const { url, anonKey } = getSupabaseConfig();

  try {
    const response = await fetch(
      `${url}/rest/v1/${tableName}?select=id&limit=1`,
      {
        method: 'GET',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
        },
      }
    );

    if (response.status === 404) {
      return { name: tableName, exists: false, error: 'Table non trouvée' };
    }

    if (response.status === 401 || response.status === 403) {
      // Table existe mais RLS bloque l'accès (normal pour profiles)
      return { name: tableName, exists: true };
    }

    if (response.ok) {
      return { name: tableName, exists: true };
    }

    const errorText = await response.text();
    return { name: tableName, exists: false, error: errorText };
  } catch (error) {
    return {
      name: tableName,
      exists: false,
      error: error instanceof Error ? error.message : 'Erreur réseau'
    };
  }
}

export async function checkSupabaseAuthSetup(): Promise<{
  configured: boolean;
  profiles: CheckResult;
  summary: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      profiles: { name: 'profiles', exists: false, error: 'Supabase non configuré' },
      summary: 'Supabase non configuré. Ajoutez EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  const profilesCheck = await checkTable('profiles');

  const configured = profilesCheck.exists;

  let summary = '';
  if (configured) {
    summary = '✅ Table profiles trouvée. Supabase Auth est configuré.';
  } else {
    summary = '❌ Table profiles non trouvée. Exécutez SUPABASE_AUTH_SETUP.sql dans Supabase.';
  }

  return {
    configured,
    profiles: profilesCheck,
    summary,
  };
}

// Exécution directe si appelé comme script
if (typeof require !== 'undefined' && require.main === module) {
  checkSupabaseAuthSetup().then((result) => {
    console.log('\n=== Vérification Supabase Auth ===\n');
    console.log('Table profiles:', result.profiles.exists ? '✅' : '❌', result.profiles.error || '');
    console.log('\n' + result.summary + '\n');
  });
}
