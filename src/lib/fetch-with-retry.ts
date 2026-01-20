/**
 * Helper centralisé pour les requêtes réseau avec timeout et retry
 * Applique un timeout + jusqu'à 3 tentatives avec backoff exponentiel
 */

// Types pour les options de requête
export interface FetchWithRetryOptions extends RequestInit {
  timeout?: number; // Timeout en ms (défaut: 10000)
  maxRetries?: number; // Nombre max de tentatives (défaut: 3)
  backoffMs?: number; // Délai initial entre les tentatives (défaut: 1000)
  onRetry?: (attempt: number, error: Error) => void; // Callback à chaque retry
}

// Types pour les erreurs
export class NetworkError extends Error {
  public readonly isTimeout: boolean;
  public readonly isOffline: boolean;
  public readonly attempts: number;

  constructor(
    message: string,
    options: { isTimeout?: boolean; isOffline?: boolean; attempts?: number } = {}
  ) {
    super(message);
    this.name = 'NetworkError';
    this.isTimeout = options.isTimeout ?? false;
    this.isOffline = options.isOffline ?? false;
    this.attempts = options.attempts ?? 1;
  }
}

// Messages d'erreur utilisateur en français
export const ERROR_MESSAGES = {
  TIMEOUT: 'Le serveur met du temps à répondre. Nouvelle tentative...',
  FINAL_FAILURE: 'Impossible de contacter le serveur. Vérifiez votre connexion.',
  OFFLINE: 'Connexion internet indisponible. Certaines fonctionnalités sont limitées.',
  RETRY_IN_PROGRESS: 'Nouvelle tentative en cours...',
} as const;

// Vérifier si on est en ligne (approximatif sur React Native)
export function isOnline(): boolean {
  // Sur React Native, on ne peut pas utiliser navigator.onLine de manière fiable
  // On retourne true par défaut et on laisse le timeout/retry gérer les erreurs
  return true;
}

// Délai avec backoff exponentiel
function getBackoffDelay(attempt: number, baseMs: number): number {
  // Backoff exponentiel avec jitter: baseMs * 2^attempt + random(0-500ms)
  const exponentialDelay = baseMs * Math.pow(2, attempt);
  const jitter = Math.random() * 500;
  return Math.min(exponentialDelay + jitter, 30000); // Max 30 secondes
}

// Fonction principale avec timeout et retry
export async function fetchWithRetry(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeout = 10000,
    maxRetries = 3,
    backoffMs = 1000,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError: Error = new Error('Unknown error');
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    try {
      // Créer un AbortController pour le timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Si la réponse est OK, la retourner
        if (response.ok) {
          return response;
        }

        // Si erreur serveur (5xx), on peut retenter
        if (response.status >= 500 && attempt < maxRetries) {
          lastError = new Error(`Server error: ${response.status}`);
          console.log(`[FetchRetry] Erreur serveur ${response.status}, tentative ${attempt}/${maxRetries}`);
          onRetry?.(attempt, lastError);
          await new Promise((resolve) => setTimeout(resolve, getBackoffDelay(attempt, backoffMs)));
          continue;
        }

        // Pour les autres erreurs (4xx), ne pas retenter
        return response;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      const err = error as Error;

      // Déterminer le type d'erreur
      const isAbortError = err.name === 'AbortError';
      const isNetworkError =
        err.message?.includes('Network request failed') ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('network') ||
        err.message?.includes('Network');

      if (isAbortError) {
        console.log(`[FetchRetry] Timeout après ${timeout}ms, tentative ${attempt}/${maxRetries}`);
        lastError = new NetworkError(ERROR_MESSAGES.TIMEOUT, {
          isTimeout: true,
          attempts: attempt,
        });
      } else if (isNetworkError) {
        console.log(`[FetchRetry] Erreur réseau, tentative ${attempt}/${maxRetries}`);
        lastError = new NetworkError(ERROR_MESSAGES.OFFLINE, {
          isOffline: true,
          attempts: attempt,
        });
      } else {
        console.log(`[FetchRetry] Erreur inconnue: ${err.message}, tentative ${attempt}/${maxRetries}`);
        lastError = err;
      }

      // Si on n'a pas épuisé les tentatives, attendre et réessayer
      if (attempt < maxRetries) {
        onRetry?.(attempt, lastError);
        const delay = getBackoffDelay(attempt, backoffMs);
        console.log(`[FetchRetry] Attente ${delay}ms avant nouvelle tentative...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // Toutes les tentatives ont échoué
  console.warn(`[FetchRetry] Échec après ${maxRetries} tentatives`);
  throw new NetworkError(ERROR_MESSAGES.FINAL_FAILURE, {
    isTimeout: lastError instanceof NetworkError && lastError.isTimeout,
    isOffline: lastError instanceof NetworkError && lastError.isOffline,
    attempts: maxRetries,
  });
}

// Version qui retourne null au lieu de throw (pour compatibilité avec le code existant)
export async function fetchWithRetryOrNull(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<Response | null> {
  try {
    return await fetchWithRetry(url, options);
  } catch (error) {
    console.warn('[FetchRetry] Échec final:', String(error));
    return null;
  }
}

// Helper pour les requêtes Supabase avec headers auth
export async function supabaseRequest(
  url: string,
  options: FetchWithRetryOptions & { headers?: Record<string, string> } = {}
): Promise<Response> {
  return fetchWithRetry(url, {
    timeout: 10000,
    maxRetries: 3,
    backoffMs: 1000,
    ...options,
  });
}

// Helper pour extraire le message d'erreur utilisateur
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof NetworkError) {
    if (error.isTimeout) {
      return ERROR_MESSAGES.TIMEOUT;
    }
    if (error.isOffline) {
      return ERROR_MESSAGES.OFFLINE;
    }
    return error.message;
  }
  return ERROR_MESSAGES.FINAL_FAILURE;
}
