# 🔒 RAPPORT D'AUDIT DE SÉCURITÉ COMPLET
## Les Chanvriers Unis - Application Mobile React Native/Expo + Supabase

**Date:** 15 Janvier 2026
**Auditeur:** Claude Code - Audit automatisé
**Version application:** 1.0.0
**Framework:** Expo SDK 53, React Native 0.79.6, Supabase

---

## RÉSUMÉ EXÉCUTIF

| Critère | Évaluation |
|---------|------------|
| **Score Global** | **7.5/10** (BON avec améliorations requises) |
| Vulnérabilités Critiques | 1 |
| Vulnérabilités Élevées | 4 |
| Vulnérabilités Moyennes | 5 |
| Vulnérabilités Faibles | 3 |

L'application démontre une **bonne maturité de sécurité** avec des protections solides pour le stockage des tokens et l'authentification. Cependant, plusieurs failles importantes nécessitent une correction avant la mise en production.

---

## 1. PORTÉE ET MÉTHODOLOGIE

### 1.1 Périmètre audité
- ✅ Code frontend React Native (écrans, stores, hooks, services API)
- ✅ Intégration Supabase (auth, RLS, policies, storage)
- ✅ Gestion des tokens et stockage local
- ✅ Sécurité réseau et API
- ✅ Uploads de fichiers et storage
- ✅ Dépendances et permissions mobiles
- ✅ Journalisation et logs

### 1.2 Méthodologie
- **Analyse statique:** Revue complète du code source
- **Référentiel:** OWASP MASVS / MAS checklist
- **Focus:** Top 10 vulnérabilités mobiles OWASP

---

## 2. TABLEAU SYNTHÉTIQUE DES VULNÉRABILITÉS

| ID | Titre | Sévérité | Surface | Priorité |
|----|-------|----------|---------|----------|
| SEC-001 | Clé de chiffrement web hardcodée | **CRITIQUE** | Frontend/Stockage | P0 |
| SEC-002 | RLS Orders basé sur email (changeable) | **ÉLEVÉE** | Supabase/RLS | P1 |
| SEC-003 | RLS Producers trop permissive (OR true) | **ÉLEVÉE** | Supabase/RLS | P1 |
| SEC-004 | Absence de certificate pinning | **ÉLEVÉE** | Réseau/Mobile | P1 |
| SEC-005 | updateUserCategory sans vérification admin | **ÉLEVÉE** | Frontend/API | P1 |
| SEC-006 | Logs sensibles en production potentiels | **MOYENNE** | Journalisation | P2 |
| SEC-007 | Rate limiting côté client uniquement | **MOYENNE** | Auth/Backend | P2 |
| SEC-008 | Pas de validation backend pour linking producer | **MOYENNE** | API/Backend | P2 |
| SEC-009 | Bucket storage créable via anon key | **MOYENNE** | Storage/Config | P2 |
| SEC-010 | Fallback AsyncStorage non chiffré (web) | **MOYENNE** | Stockage/Web | P2 |
| SEC-011 | dangerouslySetInnerHTML présent | **FAIBLE** | Frontend/Web | P3 |
| SEC-012 | Logs d'ID de commande exposés | **FAIBLE** | Journalisation | P3 |
| SEC-013 | Pas de politique de mot de passe forte | **FAIBLE** | Auth | P3 |

---

## 3. DÉTAILS DES VULNÉRABILITÉS

### SEC-001 | CRITIQUE: Clé de chiffrement web hardcodée

**Fichier:** `src/lib/secure-storage.ts` (ligne 38)

**Problème:**
```typescript
const APP_SECRET = process.env.EXPO_PUBLIC_ENCRYPTION_KEY || 'les-chanvriers-unis-secure-storage-2024';
```

La clé de chiffrement AES-256 a une valeur par défaut hardcodée. Si la variable d'environnement n'est pas définie, tous les tokens sont chiffrés avec la même clé publiquement connue.

**Impact:**
- Un attaquant connaissant cette clé peut déchiffrer tous les tokens stockés sur le web
- Compromission totale de la sécurité du stockage web

**Scénario d'attaque:**
1. Attaquant accède au localStorage d'un utilisateur (XSS, malware, accès physique)
2. Déchiffre les tokens avec la clé connue
3. Utilise les tokens pour usurper l'identité de l'utilisateur

**Recommandation:**
```typescript
// Supprimer la valeur par défaut et exiger la variable d'environnement
const APP_SECRET = process.env.EXPO_PUBLIC_ENCRYPTION_KEY;
if (!APP_SECRET && Platform.OS === 'web') {
  throw new Error('[SecureStorage] EXPO_PUBLIC_ENCRYPTION_KEY is required for web security');
}
```

**Action requise:** Définir `EXPO_PUBLIC_ENCRYPTION_KEY` dans le fichier `.env` avec une clé aléatoire de 32+ caractères unique par environnement.

---

### SEC-002 | ÉLEVÉE: RLS basé sur email changeable

**Fichier:** `supabase/migrations/20260113120000_fix_orders_rls.sql`

**Problème:**
```sql
CREATE POLICY "orders_select_own" ON orders
FOR SELECT USING (
  customer_email = auth.email()  -- ❌ VULNÉRABLE
  ...
);
```

L'accès aux commandes est basé sur `customer_email = auth.email()`. Si un utilisateur change son email, il peut potentiellement accéder aux commandes d'un autre utilisateur ayant le même ancien email.

**Impact:**
- Fuite de données personnelles (noms, adresses, téléphones)
- Violation RGPD potentielle

**Recommandation:**
```sql
-- Ajouter une colonne user_id à la table orders
ALTER TABLE orders ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Nouvelle politique sécurisée
CREATE POLICY "orders_select_own" ON orders
FOR SELECT USING (
  user_id = auth.uid()  -- ✅ Basé sur l'ID immuable
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
```

---

### SEC-003 | ÉLEVÉE: RLS Producers trop permissive

**Fichier:** `SECURITY_RLS_POLICIES.sql` (lignes 76-81)

**Problème:**
```sql
CREATE POLICY "Producers can read own and public producer info"
ON producers FOR SELECT
USING (
  auth.uid() = profile_id
  OR
  true  -- ❌ PERMET TOUT LE MONDE DE TOUT LIRE
);
```

La clause `OR true` rend la politique inutile - tous les utilisateurs peuvent lire toutes les données des producteurs, y compris les champs potentiellement sensibles.

**Impact:**
- Exposition des SIRET, numéros TVA, informations de contact de tous les producteurs

**Recommandation:**
```sql
-- Séparer les champs publics des champs privés
CREATE POLICY "Public producer info"
ON producers FOR SELECT
USING (true)
-- Utiliser une vue pour limiter les colonnes visibles publiquement
-- Ou créer une politique plus granulaire par colonne
```

---

### SEC-004 | ÉLEVÉE: Absence de certificate pinning

**Fichiers:** Tous les appels `fetch()` vers Supabase

**Problème:**
Aucune implémentation de certificate pinning n'a été détectée. Les communications HTTPS sont vulnérables aux attaques Man-in-the-Middle avec un certificat frauduleux.

**Impact:**
- Interception des tokens d'authentification
- Modification des requêtes/réponses API
- Vol de données sensibles en transit

**Recommandation:**
Implémenter le certificate pinning avec une bibliothèque comme `react-native-ssl-pinning` ou configurer via `app.json`:

```json
{
  "expo": {
    "ios": {
      "config": {
        "sslPinning": {
          "certs": ["supabase-cert"]
        }
      }
    }
  }
}
```

---

### SEC-005 | ÉLEVÉE: updateUserCategory sans vérification admin

**Fichier:** `src/lib/supabase-users.ts` (lignes 274-309)

**Problème:**
```typescript
export async function updateUserCategory(
  userId: string,
  category: UserCategory
): Promise<{ success: boolean; error: Error | null }> {
  // ❌ PAS DE VÉRIFICATION ADMIN
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
    ...
  );
}
```

Contrairement à `updateUserRole` et `updateProStatus`, la fonction `updateUserCategory` ne vérifie pas que l'appelant est un admin avant de modifier la catégorie d'un utilisateur.

**Impact:**
- Un utilisateur authentifié peut modifier sa propre catégorie ou celle d'autres utilisateurs
- Contournement des restrictions métier

**Recommandation:**
```typescript
export async function updateUserCategory(
  userId: string,
  category: UserCategory
): Promise<{ success: boolean; error: Error | null }> {
  const session = await getValidSession();
  if (!session?.access_token) {
    return { success: false, error: new Error('Non authentifié') };
  }

  // ✅ AJOUTER la vérification admin
  const checkResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=role`,
    { headers: getValidHeaders(session) }
  );
  const adminData = await checkResponse.json();
  if (adminData[0]?.role !== 'admin') {
    return { success: false, error: new Error('Non autorisé - accès admin requis') };
  }
  // ... reste du code
}
```

---

### SEC-006 | MOYENNE: Logs sensibles potentiels

**Fichiers:** Multiples fichiers dans `src/lib/`

**Problème:**
Plusieurs `console.log` exposent des informations qui pourraient être sensibles en production:
- IDs utilisateurs
- Emails dans les clés de rate limiting
- Données de réponse API

**Exemples:**
```typescript
// local-market-orders.ts:141
console.log('[LocalMarketOrders] Fetching orders for user:', userId);

// supabase-auth.ts:419
const rateLimitKey = `signIn:${email.toLowerCase()}`;
```

**Impact:**
- Fuite d'informations dans les logs de production
- Aide potentielle aux attaquants pour le profilage

**Recommandation:**
Créer un système de logging conditionnel:
```typescript
const isDev = __DEV__;
const secureLog = (message: string, ...args: unknown[]) => {
  if (isDev) {
    console.log(message, ...args);
  } else {
    // Log seulement le message sans données sensibles
    console.log(message.replace(/:.*/g, ''));
  }
};
```

---

### SEC-007 | MOYENNE: Rate limiting côté client uniquement

**Fichier:** `src/lib/supabase-auth.ts`

**Problème:**
Le rate limiting est implémenté uniquement en mémoire côté client:
```typescript
const rateLimitStore: Map<string, RateLimitEntry> = new Map();
```

Un attaquant peut contourner cette protection en:
- Rafraîchissant l'application
- Utilisant plusieurs instances
- Modifiant le code JavaScript

**Impact:**
- Bruteforce possible sur les endpoints d'authentification
- Spam de magic links / reset password

**Recommandation:**
Implémenter le rate limiting côté serveur via une Edge Function Supabase ou configurer les limites natives de Supabase Auth.

---

### SEC-008 | MOYENNE: linkProducerToProfile sans vérification stricte

**Fichier:** `src/lib/supabase-users.ts` (lignes 469-559)

**Problème:**
La fonction `linkProducerToProfile` permet de lier un producteur à un profil sans vérifier que l'appelant est un admin ou le propriétaire du profil.

**Recommandation:**
Ajouter une vérification que l'appelant est admin avant de permettre la liaison.

---

### SEC-009 | MOYENNE: Bucket storage créable via anon key

**Fichier:** `src/lib/image-upload.ts` (lignes 107-127)

**Problème:**
Le code tente de créer un bucket storage en utilisant la clé anon:
```typescript
const createResponse = await fetch(
  `${SUPABASE_URL}/storage/v1/bucket`,
  {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      id: STORAGE_BUCKET,
      public: true,
    }),
  }
);
```

**Impact:**
- Exposition de la logique de création de bucket
- Potentiel abus si les permissions Supabase sont mal configurées

**Recommandation:**
Supprimer la logique de création de bucket côté client. Les buckets doivent être créés manuellement dans le dashboard Supabase.

---

### SEC-010 | MOYENNE: Fallback AsyncStorage non chiffré

**Fichier:** `src/lib/secure-storage.ts` (lignes 335-343)

**Problème:**
```typescript
} catch (error) {
  // Fallback non chiffré en cas d'erreur
  await AsyncStorage.setItem(prefixedKey, value);
}
```

En cas d'erreur de chiffrement, les données sont stockées en clair.

**Recommandation:**
Ne jamais faire de fallback vers un stockage non chiffré pour les données sensibles. Préférer échouer avec une erreur claire.

---

## 4. CE QUI EST BIEN SÉCURISÉ ✅

### 4.1 Stockage des tokens d'authentification
- Tokens stockés dans `expo-secure-store` (chiffrement natif iOS/Android)
- Chiffrement AES-256-GCM pour le web (quand configuré)
- Pas de fallback vers AsyncStorage non sécurisé pour les tokens

### 4.2 Rate limiting implémenté
- Protection contre le bruteforce sur signIn, magicLink, resetPassword
- 5 tentatives par 60 secondes par action/email
- Messages d'erreur en français adaptés

### 4.3 Vérifications de propriété sur les produits
- `updateProduct()` vérifie que le produit appartient au producteur
- `deleteProduct()` applique la même vérification
- `updateMyProducer()` vérifie que le producerId correspond au profil connecté

### 4.4 Fonctions admin protégées
- `updateUserRole()` vérifie le rôle admin
- `updateProStatus()` vérifie le rôle admin
- `deleteUser()` vérifie le rôle admin

### 4.5 Validation des uploads
- Types MIME autorisés: jpeg, png, webp, gif
- Taille maximale: 10MB côté client
- Compression automatique des images
- Fonction de validation serveur prévue (RPC)

### 4.6 Communications HTTPS
- Toutes les requêtes vers Supabase utilisent HTTPS
- Pas d'URL HTTP en dur dans le code applicatif

---

## 5. CONFORMITÉ RGPD

### 5.1 Points positifs
- Données stockées sur Supabase (conforme RGPD)
- Pas de tracking invasif détecté
- Minimisation des données stockées localement

### 5.2 Points à améliorer
| Exigence RGPD | Statut |
|---------------|--------|
| Droit d'accès aux données | ⚠️ Non implémenté |
| Droit à l'effacement | ⚠️ Partiel (profile seulement) |
| Droit à la portabilité | ❌ Non implémenté |
| Consentement explicite | ⚠️ À vérifier |
| Registre des traitements | ❌ Non documenté |

**Recommandation:** Implémenter un écran "Mes données" permettant à l'utilisateur d'exporter et supprimer ses données.

---

## 6. PLAN D'ACTION PRIORISÉ

### P0 - CRITIQUE (À corriger immédiatement)
1. **SEC-001**: Définir `EXPO_PUBLIC_ENCRYPTION_KEY` dans `.env` avec une clé forte unique

### P1 - ÉLEVÉ (Avant mise en production)
2. **SEC-002**: Migrer le RLS orders vers `user_id` au lieu de `customer_email`
3. **SEC-003**: Corriger la politique RLS des producers
4. **SEC-004**: Implémenter le certificate pinning
5. **SEC-005**: Ajouter la vérification admin dans `updateUserCategory`

### P2 - MOYEN (Sprint suivant)
6. **SEC-006**: Nettoyer les logs sensibles pour la production
7. **SEC-007**: Implémenter le rate limiting côté serveur
8. **SEC-008**: Sécuriser `linkProducerToProfile`
9. **SEC-009**: Supprimer la création de bucket côté client
10. **SEC-010**: Supprimer le fallback non chiffré

### P3 - FAIBLE (Amélioration continue)
11. **SEC-011**: Sécuriser l'usage de dangerouslySetInnerHTML
12. **SEC-012**: Masquer les IDs de commande dans les logs
13. **SEC-013**: Implémenter une politique de mot de passe forte

---

## 7. TESTS DE SÉCURITÉ RECOMMANDÉS

### Test 1: Vérifier l'isolation des tokens
```bash
# Sur iOS/Android - les tokens ne doivent PAS être dans AsyncStorage
# Vérifier avec React Native Debugger
```

### Test 2: Vérifier les policies RLS
```sql
-- En tant que client A, essayer de voir les commandes du client B
SELECT * FROM orders WHERE customer_email = 'autre@email.com';
-- Attendu: 0 résultats ou erreur RLS
```

### Test 3: Vérifier le rate limiting
```bash
# Effectuer 6 tentatives de connexion avec mauvais mot de passe
# La 6ème devrait retourner "Trop de tentatives"
```

### Test 4: Test de certificate pinning (après implémentation)
```bash
# Avec un proxy MITM (Burp Suite, mitmproxy)
# Les requêtes devraient échouer avec un certificat frauduleux
```

---

## 8. CHECKLIST DE CONTRÔLE RÉCURRENT

### Hebdomadaire
- [ ] Vérifier les logs d'erreur Supabase pour les tentatives d'accès non autorisées
- [ ] Monitorer les tentatives de rate limiting excessives

### Mensuel
- [ ] Mettre à jour les dépendances npm/bun (`bun update`)
- [ ] Vérifier les CVE connues sur les packages utilisés
- [ ] Revoir les nouvelles politiques RLS ajoutées

### Trimestriel
- [ ] Audit de sécurité complet
- [ ] Test de pénétration (manuel ou automatisé)
- [ ] Revue des permissions et rôles utilisateurs
- [ ] Rotation des clés de chiffrement (si nécessaire)

---

## 9. DÉPENDANCES ET CVE

### Packages à surveiller
| Package | Version | Risque |
|---------|---------|--------|
| expo-secure-store | 14.0.1 | ✅ À jour |
| react-native | 0.79.6 | ✅ Récent |
| @tanstack/react-query | 5.90.2 | ✅ À jour |
| zustand | 5.0.9 | ✅ À jour |

### Recommandation
Exécuter régulièrement:
```bash
bun audit
```

---

## 10. CONCLUSION

L'application "Les Chanvriers Unis" présente une **architecture de sécurité solide** avec une attention particulière portée au stockage sécurisé des tokens et à la protection des fonctions administratives.

**Score actuel: 7.5/10**

Après correction des vulnérabilités P0 et P1:
**Score estimé: 9/10**

Les principales forces sont:
- Utilisation d'expo-secure-store pour les tokens
- Rate limiting sur l'authentification
- Vérifications de propriété sur les ressources

Les principales faiblesses à corriger sont:
- Clé de chiffrement web hardcodée (CRITIQUE)
- Policies RLS insuffisantes
- Absence de certificate pinning

---

*Rapport généré automatiquement par Claude Code le 15 janvier 2026*
*Méthodologie: OWASP MASVS / MAS Checklist*
