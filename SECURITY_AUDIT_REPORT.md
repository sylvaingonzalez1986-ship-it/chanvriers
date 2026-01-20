# RAPPORT D'AUDIT DE SÉCURITÉ
## Les Chanvriers Unis - Application Mobile

**Date:** 14 Janvier 2026
**Score de sécurité:** 6/10 (MODÉRÉ)

---

## RÉSUMÉ EXÉCUTIF

L'application démontre une maturité de sécurité **MODÉRÉE** avec plusieurs protections bien implémentées mais aussi des vulnérabilités notables. Le code montre un effort conscient vers la sécurité (politiques RLS, gestion des tokens, contrôle d'accès basé sur les rôles) mais présente des lacunes dans l'implémentation.

---

## 1. CE QUI EST BIEN SÉCURISÉ ✅

### 1.1 Stockage des Tokens d'Authentification ✅
**Fichier:** `src/lib/supabase-auth.ts`

- Tokens stockés dans `expo-secure-store` (chiffrement natif iOS/Android)
- Pas de fallback vers AsyncStorage non sécurisé
- Déconnexion forcée si SecureStore échoue
- Refresh token avec buffer de 60 secondes avant expiration

### 1.2 Protection de l'Écran Admin ✅
**Fichier:** `src/app/(tabs)/admin.tsx`

- Vérification `isAdmin` avant affichage du contenu
- Message "Non autorisé" clair pour les non-admins
- Utilise le hook `usePermissions()` centralisé

### 1.3 Vérification de Propriété des Produits ✅
**Fichier:** `src/lib/supabase-producer.ts`

- `updateProduct()` vérifie que le produit appartient au producteur connecté
- `deleteProduct()` applique la même vérification
- Récupère d'abord le producteur de l'utilisateur avant modification

### 1.4 Fonctions Admin Protégées ✅
**Fichier:** `src/lib/supabase-users.ts`

- `updateUserRole()` vérifie le rôle admin avant exécution
- `updateProStatus()` vérifie le rôle admin avant exécution
- `deleteUser()` vérifie le rôle admin avant exécution

### 1.5 Sécurisation des Commandes Producteurs ✅
**Fichier:** `src/app/(tabs)/ma-boutique.tsx`

- `handleOrderStatusChange()` vérifie que la commande contient des produits du producteur
- `handleTrackingNumberUpdate()` applique la même vérification

### 1.6 Politiques RLS sur les Commandes ✅
**Fichier:** `supabase/migrations/20260113120000_fix_orders_rls.sql`

- Clients voient uniquement leurs propres commandes
- Admins peuvent voir toutes les commandes
- Seuls les admins peuvent supprimer des commandes

---

## 2. FAILLES DE SÉCURITÉ TROUVÉES ❌

### 2.1 CRITIQUE: Pas de Vérification de Propriété sur updateMyProducer ❌
**Fichier:** `src/lib/supabase-producer.ts` (lignes 290-316)

**Problème:** La fonction `updateMyProducer()` ne vérifie PAS que le producteur appartient à l'utilisateur connecté.

**Impact:** Un producteur peut modifier les informations de N'IMPORTE QUEL autre producteur.

**Code vulnérable:**
```typescript
export async function updateMyProducer(
  producerId: string,
  updates: Partial<ProducerDB>
): Promise<ProducerDB | null> {
  // ❌ AUCUNE VÉRIFICATION DE PROPRIÉTÉ
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/producers?id=eq.${producerId}`,
    ...
  );
}
```

---

### 2.2 HAUTE: Données Sensibles dans les Logs ❌
**Fichiers:** `src/lib/supabase-auth.ts`, `src/lib/useAuth.ts`

**Problème:** Les logs exposent des données personnelles (SIRET, adresses, TVA, etc.)

**Code vulnérable:**
```typescript
// supabase-auth.ts ligne 548
console.log('[supabase-auth] updateProfile called with:', JSON.stringify(updates, null, 2));

// useAuth.ts ligne 158
console.log('[useAuth] updateProfile called with:', updates);
```

---

### 2.3 HAUTE: Filtrage des Commandes Côté Frontend Uniquement ❌
**Fichier:** `src/app/(tabs)/ma-boutique.tsx` (lignes 212-217)

**Problème:** Le filtrage des commandes par producteur se fait uniquement côté frontend.

**Impact:** Si les politiques RLS échouent, TOUTES les commandes sont exposées.

---

### 2.4 HAUTE: Contrôle d'Accès par Email Vulnérable ❌
**Fichier:** `supabase/migrations/20260113120000_fix_orders_rls.sql`

**Problème:** L'accès aux commandes est basé sur `customer_email = auth.email()`.

**Impact:** Si un utilisateur change son email, il peut accéder aux commandes de l'ancien email.

---

### 2.5 MOYENNE: Pas de Rate Limiting ❌
**Fichiers:** `src/lib/supabase-auth.ts`

**Problème:** Aucune limite de taux sur:
- Demandes de magic link
- Réinitialisation de mot de passe
- Tentatives de connexion
- Réclamation de codes cadeaux

---

### 2.6 MOYENNE: Politique RLS Producteurs Trop Permissive ❌
**Fichier:** `SECURITY_RLS_POLICIES.sql` (lignes 76-91)

**Problème:** La politique SELECT permet à TOUS de lire les données des producteurs:
```sql
USING (
  auth.uid() = profile_id
  OR
  true  -- ❌ PERMET TOUT LE MONDE
);
```

---

### 2.7 MOYENNE: Pas de Vérification Backend pour Mise à Jour Commandes ❌
**Fichier:** `src/app/(tabs)/ma-boutique.tsx`

**Problème:** La vérification que le producteur peut modifier une commande est uniquement côté frontend.

---

## 3. CORRECTIFS RECOMMANDÉS 🔧

### PROMPT 1 - CRITIQUE: Sécuriser updateMyProducer
```
Dans la fonction updateMyProducer de supabase-producer.ts, ajoute une
vérification que le producteur appartient bien à l'utilisateur connecté
avant de permettre la modification. Récupère d'abord le producteur de
l'utilisateur avec fetchMyProducer() et vérifie que producerId correspond
à myProducer.id.
```

### PROMPT 2 - HAUTE: Nettoyer les logs sensibles
```
Dans supabase-auth.ts et useAuth.ts, supprime ou masque tous les
console.log qui affichent des données de profil utilisateur (updates,
requestBody, result). Remplace par des logs avec uniquement le statut
de l'opération (succès/échec) sans données personnelles.
```

### PROMPT 3 - HAUTE: Renforcer le filtrage des commandes
```
Dans ma-boutique.tsx, ajoute une vérification côté serveur en modifiant
fetchOrders() dans supabase-sync.ts pour filtrer les commandes par
producer_id directement dans la requête Supabase, pas uniquement côté
frontend.
```

### PROMPT 4 - HAUTE: Sécuriser l'accès aux commandes par user_id
```
Modifie la politique RLS des commandes dans Supabase pour utiliser
user_id au lieu de customer_email. Ajoute une colonne user_id à la
table orders si elle n'existe pas, et mets à jour la politique pour
vérifier auth.uid() = user_id.
```

### PROMPT 5 - MOYENNE: Ajouter le rate limiting
```
Dans supabase-auth.ts, ajoute un système de rate limiting pour les
fonctions signInWithMagicLink, resetPassword et signIn. Utilise
AsyncStorage pour stocker le timestamp des dernières tentatives et
bloquer pendant 60 secondes après 5 tentatives échouées.
```

### PROMPT 6 - MOYENNE: Corriger la politique RLS des producteurs
```
Dans SECURITY_RLS_POLICIES.sql, modifie la politique SELECT des
producteurs pour ne permettre la lecture complète qu'au propriétaire
(profile_id = auth.uid()) ou aux admins. Les autres utilisateurs
ne doivent voir que les champs publics (id, name, region).
```

### PROMPT 7 - MOYENNE: Ajouter vérification backend pour commandes
```
Dans supabase-sync.ts, modifie la fonction updateOrderInSupabase pour
qu'elle vérifie côté serveur que l'utilisateur a le droit de modifier
cette commande (soit admin, soit producteur avec produits dans la
commande). Ajoute un appel RPC Supabase pour cette vérification.
```

### PROMPT 8 - BASSE: Masquer les erreurs détaillées
```
Dans tous les fichiers supabase-*.ts, modifie les console.error pour
ne pas afficher les messages d'erreur bruts de la base de données.
Remplace par des messages génériques comme "Erreur de base de données"
sans détails techniques.
```

---

## 4. TABLEAU RÉCAPITULATIF

| Aspect | Statut | Priorité |
|--------|--------|----------|
| Stockage tokens | ✅ Sécurisé | - |
| Accès admin | ✅ Sécurisé | - |
| Modification produits | ✅ Sécurisé | - |
| Fonctions admin | ✅ Sécurisé | - |
| Commandes producteurs | ✅ Sécurisé | - |
| **Modification producteurs** | ❌ FAILLE | CRITIQUE |
| **Logs sensibles** | ❌ FAILLE | HAUTE |
| **Filtrage commandes** | ❌ FAILLE | HAUTE |
| **Accès par email** | ❌ FAILLE | HAUTE |
| Rate limiting | ❌ Absent | MOYENNE |
| RLS producteurs | ⚠️ Permissif | MOYENNE |
| Vérification backend | ⚠️ Partielle | MOYENNE |

---

## 5. TESTS DE SÉCURITÉ RECOMMANDÉS

### Test 1: Vérifier l'isolation des producteurs
1. Connectez-vous comme Producteur A
2. Notez l'ID d'un produit du Producteur B
3. Tentez de modifier ce produit via l'API
4. **Attendu:** Erreur "Non autorisé"

### Test 2: Vérifier les politiques RLS
```sql
-- En tant que client A, essayez de voir les commandes du client B
SELECT * FROM orders WHERE customer_email = 'autre@email.com';
-- Attendu: 0 résultats
```

### Test 3: Vérifier le stockage des tokens
1. Connectez-vous à l'application
2. Inspectez AsyncStorage
3. **Attendu:** Pas de tokens en clair, uniquement `***SECURE***`

### Test 4: Vérifier l'accès admin
1. Créez un utilisateur avec role='client'
2. Naviguez vers /admin
3. **Attendu:** Message "Non autorisé"

---

## 6. CONCLUSION

L'application a une base de sécurité solide mais nécessite des corrections urgentes:

1. **CRITIQUE:** Sécuriser `updateMyProducer()` immédiatement
2. **HAUTE:** Nettoyer les logs avant mise en production
3. **HAUTE:** Renforcer le filtrage des commandes côté serveur

**Score actuel:** 6/10
**Score après corrections:** 8.5/10

---

*Rapport généré automatiquement par l'audit de sécurité Claude Code*
