# RAPPORT D'AUDIT DE SÉCURITÉ
## Application Mobile "Les Chanvriers Unis"
### Date: 2026-01-14 | Version: 1.0

---

## RÉSUMÉ EXÉCUTIF

| Catégorie | Score | Statut |
|-----------|-------|--------|
| RLS Database | 9/10 | Excellent |
| Authentification | 8/10 | Bon |
| Protection données sensibles | 6/10 | À améliorer |
| Validation entrées | 7/10 | Bon |
| Permissions & autorisation | 9/10 | Excellent |
| Sécurité API | 7/10 | Bon |
| Gestion erreurs | 8/10 | Bon |
| Uploads fichiers | 7/10 | Bon |
| Conformité RGPD | 7/10 | Bon |
| **SCORE GLOBAL** | **75/100** | **Bon** |

### Vulnérabilités critiques identifiées: 1
### Vulnérabilités moyennes: 3
### Vulnérabilités mineures: 5

---

## 1. ANALYSE DES POLITIQUES RLS (Row Level Security)

### Score: 9/10 - EXCELLENT

#### Points forts
- RLS activé sur **toutes les tables sensibles**:
  - `profiles`, `producers`, `products`, `orders`
  - `user_lots`, `lots`, `packs`, `promo_products`
  - `audit_log_entries`, `pro_orders`, `producer_chat_messages`

- **Fonctions SECURITY DEFINER** bien implémentées:
  ```sql
  is_admin()           -- Vérifie rôle admin via profiles
  is_producer()        -- Vérifie rôle producteur
  get_user_producer_id() -- Récupère producer_id lié
  get_current_user_email() -- Récupère email via profiles (pas auth.users)
  ```

- **Séparation des rôles** correcte:
  - Utilisateurs: accès limité à leurs propres données
  - Producteurs: accès à leurs produits + commandes associées
  - Admins: accès complet avec vérification explicite

#### Vulnérabilités identifiées

| ID | Sévérité | Description | Fichier |
|----|----------|-------------|---------|
| RLS-01 | Faible | La politique `producers_select` autorise `USING (true)` - tous les producteurs sont publics | COMPLETE_RLS_POLICIES.sql:167 |

**RLS-01 Détail**: Les informations des producteurs (nom, localisation, etc.) sont visibles par tous les utilisateurs anonymes. C'est probablement intentionnel pour l'affichage catalogue, mais à documenter.

#### Recommandations
- Vérifier que les champs sensibles des producteurs (email, téléphone personnel) ne sont pas exposés
- Ajouter des colonnes `public_email`, `public_phone` distinctes si nécessaire

---

## 2. AUTHENTIFICATION & GESTION UTILISATEURS

### Score: 8/10 - BON

#### Points forts
- **Tokens sécurisés**: Stockage via `expo-secure-store` avec fallback AsyncStorage
- **Rate limiting**: 5 tentatives max / 60 secondes sur:
  - `signIn`, `magicLink`, `resetPassword`
- **Refresh automatique**: Session rafraîchie si < 60s avant expiration
- **Masquage des tokens**: Métadonnées ne contiennent que `***SECURE***`

#### Architecture sécurité tokens
```
┌─────────────────────────────────────────────────────────────┐
│                     STOCKAGE TOKENS                         │
├─────────────────────────────────────────────────────────────┤
│ iOS/Android: expo-secure-store (chiffré hardware)           │
│ Web: AsyncStorage (fallback) avec préfixe "secure_"         │
├─────────────────────────────────────────────────────────────┤
│ Clés:                                                       │
│   - supabase-access-token-secure (JWT court terme)          │
│   - supabase-refresh-token-secure (Refresh long terme)      │
│   - supabase-auth-session (Métadonnées sans tokens)         │
└─────────────────────────────────────────────────────────────┘
```

#### Vulnérabilités identifiées

| ID | Sévérité | Description | Fichier |
|----|----------|-------------|---------|
| AUTH-01 | Moyenne | Fallback AsyncStorage sur web non chiffré | supabase-auth.ts:60-67 |
| AUTH-02 | Faible | Rate limit in-memory (reset au redémarrage app) | supabase-auth.ts:110 |

**AUTH-01 Détail**: Sur plateforme web, les tokens tombent dans AsyncStorage (localStorage) non chiffré. Un XSS pourrait extraire les tokens.

#### Recommandations
- Implémenter HttpOnly cookies pour la version web si applicable
- Persister le rate limit dans AsyncStorage pour survivre aux redémarrages
- Ajouter MFA (authentification multi-facteurs) optionnelle

---

## 3. PROTECTION DES DONNÉES SENSIBLES

### Score: 6/10 - À AMÉLIORER

#### VULNÉRABILITÉ CRITIQUE

| ID | Sévérité | Description | Fichier |
|----|----------|-------------|---------|
| **DATA-01** | **CRITIQUE** | **Clés API tierces exposées côté client** | .env |

**Détail DATA-01**:
Les clés suivantes sont préfixées `EXPO_PUBLIC_` et donc **visibles dans le bundle JavaScript**:
```env
EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY=sk-proj-...
EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY=sk-ant-...
EXPO_PUBLIC_VIBECODE_GROK_API_KEY=xai-...
EXPO_PUBLIC_VIBECODE_GOOGLE_API_KEY=...
EXPO_PUBLIC_VIBECODE_ELEVENLABS_API_KEY=...
```

**Risques**:
- Utilisation frauduleuse des API (facturation sur votre compte)
- Extraction via décompilation APK/IPA
- Vol de crédits API

**Remédiation immédiate**:
1. Révoquer et régénérer toutes les clés API compromises
2. Utiliser un backend proxy (Edge Functions Supabase) pour les appels API
3. Ou: Passer les clés via l'onglet ENV de Vibecode (non public)

#### Autres points

| ID | Sévérité | Description |
|----|----------|-------------|
| DATA-02 | Moyenne | AsyncStorage non chiffré pour données locales |
| DATA-03 | Faible | Console.log peut exposer des données sensibles en dev |

#### Points forts
- Emails utilisateurs stockés dans `profiles` (protégé par RLS)
- Pas de stockage de mots de passe côté client
- Tokens d'accès dans SecureStore

---

## 4. VALIDATION DES ENTRÉES

### Score: 7/10 - BON

#### Points forts
- **Email**: Validation regex + trim + lowercase
  ```typescript
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  email.toLowerCase().trim()
  ```
- **Encodage URL**: `encodeURIComponent()` utilisé pour les paramètres API
- **Pas de SQL direct**: Tout via Supabase REST API (PostgREST)

#### Vulnérabilités identifiées

| ID | Sévérité | Description |
|----|----------|-------------|
| INPUT-01 | Faible | Validation email basique (accepte formats invalides edge-case) |
| INPUT-02 | Faible | Pas de validation longueur max sur champs texte |

#### Recommandations
- Utiliser une bibliothèque de validation robuste (zod, yup)
- Implémenter des limites de longueur côté client ET serveur
- Sanitizer les entrées HTML si affichage de contenu utilisateur

---

## 5. PERMISSIONS & AUTORISATION

### Score: 9/10 - EXCELLENT

#### Matrice des permissions

| Rôle | profiles | producers | products | orders | lots |
|------|----------|-----------|----------|--------|------|
| Anonyme | - | Lecture | Lecture (publiés) | - | - |
| User | Propre | Lecture | Lecture (publiés) | Propres | Propres |
| Producer | Propre | Propre | Propres | Liées | - |
| Admin | Toutes | Toutes | Toutes | Toutes | Toutes |

#### Points forts
- Vérification `is_admin()` systématique avant opérations sensibles
- Producteurs limités à leurs propres produits/commandes
- Audit log automatique sur `profiles` et `orders`
- Suppression réservée aux admins sur la plupart des tables

#### Audit log
```sql
-- Structure immutable (pas de UPDATE/DELETE policies)
audit_log_entries:
  - user_id, action, table_name, record_id
  - old_data, new_data (JSONB)
  - created_at (timestamptz)
```

---

## 6. SÉCURITÉ DES RELATIONS DE TABLES

### Score: 8/10 - BON

#### Architecture relationnelle sécurisée
```
auth.users (Supabase géré)
    │
    └──► profiles (RLS: propre profil)
           │
           └──► producers (RLS: via profile_id)
                  │
                  └──► products (RLS: via producer_id)
                         │
                         └──► orders.items (JSONB, producerId vérifié)
```

#### Points forts
- Clés étrangères avec `REFERENCES auth.users(id)`
- Pas d'accès direct à `auth.users` depuis RLS (utilise `get_current_user_email()`)
- Vérification `producer_id` dans les policies products

---

## 7. SÉCURITÉ API & ENDPOINTS

### Score: 7/10 - BON

#### Points forts
- **Headers Authorization**: Bearer token systématique
- **Retry avec backoff**: Jusqu'à 3 tentatives avec délai exponentiel
- **Timeout**: 10-30s selon les opérations
- **Network error handling**: Classe `NetworkError` dédiée

#### Configuration requêtes
```typescript
AUTH_RETRY_CONFIG = {
  timeout: 10000,      // 10s
  maxRetries: 3,
  backoffMs: 1000,     // Délai initial
}
```

#### Vulnérabilités identifiées

| ID | Sévérité | Description |
|----|----------|-------------|
| API-01 | Moyenne | Pas de certificate pinning |
| API-02 | Faible | Pas de validation des réponses API (schema) |

#### Recommandations
- Implémenter certificate pinning pour Supabase en production
- Ajouter validation des réponses avec zod
- Configurer CORS côté Supabase

---

## 8. GESTION DES ERREURS & LOGS

### Score: 8/10 - BON

#### Points forts
- Erreurs RLS détectées (code 42501)
- Messages d'erreur utilisateur en français
- Logs structurés avec préfixes `[Auth]`, `[OrderQueue]`, etc.

#### Vulnérabilités identifiées

| ID | Sévérité | Description |
|----|----------|-------------|
| LOG-01 | Faible | Console.log en production (à désactiver) |
| LOG-02 | Faible | Stack traces potentiellement exposées |

#### Recommandations
- Configurer `__DEV__` pour désactiver logs en production
- Implémenter un service de logging distant (Sentry, LogRocket)

---

## 9. SÉCURITÉ DES UPLOADS DE FICHIERS

### Score: 7/10 - BON

#### Points forts
- **Compression**: Images redimensionnées à 800px max
- **Types autorisés**: `image/jpeg, image/png, image/webp, image/gif`
- **Limite taille**: 5MB
- **Noms uniques**: `${timestamp}-${randomStr}.jpg`

#### Configuration upload
```typescript
MAX_IMAGE_SIZE = 800        // px
COMPRESSION_QUALITY = 0.7   // JPEG
UPLOAD_TIMEOUT = 30000      // ms
MAX_RETRIES = 3
```

#### Vulnérabilités identifiées

| ID | Sévérité | Description |
|----|----------|-------------|
| UPLOAD-01 | Moyenne | Pas de validation MIME côté serveur |
| UPLOAD-02 | Faible | Pas de scan antivirus |

#### Recommandations
- Valider le MIME type côté Supabase Storage (policies)
- Considérer un service de scan pour uploads utilisateur
- Limiter la taille totale par utilisateur

---

## 10. CONFORMITÉ RGPD

### Score: 7/10 - BON

#### Points conformes
- **Minimisation**: Seules les données nécessaires collectées
- **Audit trail**: Traçabilité des modifications (audit_log_entries)
- **Consentement**: Géré via profil utilisateur
- **Suppression**: Politique admin pour suppression profils

#### À implémenter

| Exigence | Statut | Recommandation |
|----------|--------|----------------|
| Droit d'accès | Partiel | Ajouter export données utilisateur |
| Droit à l'oubli | Partiel | Implémenter suppression cascade |
| Portabilité | Non | Ajouter export JSON/CSV |
| Consentement cookies | N/A | App mobile, non applicable |

---

## PLAN D'ACTION PRIORITAIRE

### CRITIQUE (Immédiat - 24h)
1. **DATA-01**: Révoquer et sécuriser les clés API tierces
   - Révoquer: OpenAI, Anthropic, Grok, Google, ElevenLabs
   - Créer backend proxy via Supabase Edge Functions
   - Ou utiliser variables ENV privées Vibecode

### HAUTE (Cette semaine)
2. **AUTH-01**: Améliorer sécurité tokens web
3. **UPLOAD-01**: Ajouter validation MIME serveur
4. **API-01**: Évaluer certificate pinning

### MOYENNE (Ce mois)
5. Implémenter validation entrées avec zod
6. Ajouter export données RGPD
7. Configurer logging production (Sentry)

### FAIBLE (Backlog)
8. Rate limiting persistant
9. MFA optionnelle
10. Scan antivirus uploads

---

## CONCLUSION

L'application "Les Chanvriers Unis" présente une **architecture de sécurité globalement solide**, particulièrement au niveau:
- Base de données (RLS complet et bien structuré)
- Authentification (tokens sécurisés, rate limiting)
- Permissions (séparation des rôles claire)

La **vulnérabilité critique** concernant les clés API exposées doit être traitée **immédiatement** car elle représente un risque financier et de réputation.

Une fois cette vulnérabilité corrigée et les recommandations moyennes implémentées, l'application atteindra un niveau de sécurité excellent pour une application mobile e-commerce.

---

**Audit réalisé par**: Claude (Assistant IA)
**Date**: 2026-01-14
**Version du rapport**: 1.0
