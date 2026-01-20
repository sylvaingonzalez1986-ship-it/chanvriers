# Audit Sécurité RLS - Les Chanvriers Unis

## Date: 2026-01-15 | Priorité: CRITIQUE

---

## 📊 Résumé de l'Audit

### Tables Analysées

| Table | RLS | Politiques | Statut |
|-------|-----|------------|--------|
| `profiles` | ✅ | 5 | Sécurisé |
| `products` | ✅ | 5 | Sécurisé |
| `player_progress` | ✅ | 4 | Sécurisé |
| `seasons` | ✅ | 4 | Sécurisé |
| `fields` | ✅ | 4 | Sécurisé |
| `audit_log_entries` | ✅ | 3 | Sécurisé (Immutable) |
| `producers` | ✅ | 4 | Sécurisé |
| `orders` | ✅ | 5 | Sécurisé |
| `app_data` | ✅ | 4 | Sécurisé |
| `music_tracks` | ✅ | 4 | Sécurisé |
| `upload_logs` | ✅ | 2 | Sécurisé (Lecture admin seul) |
| `user_lots` | ✅ | 4 | Sécurisé |
| `producer_chat_messages` | ✅ | 3 | Sécurisé |

---

## 🔐 Politiques RLS par Table

### 1. `profiles` (Utilisateurs)

| Opération | Politique |
|-----------|-----------|
| **SELECT** | Utilisateur voit son propre profil uniquement |
| **SELECT** | Admins voient tous les profils |
| **INSERT** | Uniquement pour création du propre profil |
| **UPDATE** | Utilisateur modifie son propre profil |
| **UPDATE** | Admins peuvent tout modifier |
| **DELETE** | ❌ Bloqué (conservation des données) |

### 2. `products` (Produits chanvre)

| Opération | Politique |
|-----------|-----------|
| **SELECT** | Public peut lire les produits publiés (`status='published'`) |
| **SELECT** | Producteurs voient leurs propres produits |
| **SELECT** | Admins voient tout |
| **INSERT** | Admins et producteurs (pour leurs propres produits) |
| **UPDATE** | Admins et producteurs propriétaires |
| **DELETE** | Admins et producteurs propriétaires |

### 3. `player_progress` (Progression jeu)

| Opération | Politique |
|-----------|-----------|
| **SELECT** | Utilisateur voit uniquement sa progression |
| **INSERT** | Utilisateur peut créer sa propre progression |
| **UPDATE** | Utilisateur modifie uniquement sa progression |
| **DELETE** | Utilisateur peut supprimer + Admins |

### 4. `seasons` (Saisons de culture)

| Opération | Politique |
|-----------|-----------|
| **SELECT** | Utilisateur voit uniquement ses saisons |
| **INSERT** | Utilisateur peut créer ses propres saisons |
| **UPDATE** | Utilisateur modifie uniquement ses saisons |
| **DELETE** | Utilisateur peut supprimer + Admins |

### 5. `fields` (Parcelles)

| Opération | Politique |
|-----------|-----------|
| **SELECT** | Via relation `season_id` → propriétaire de la saison |
| **INSERT** | Utilisateur pour ses saisons |
| **UPDATE** | Utilisateur pour ses parcelles (via saison) |
| **DELETE** | Utilisateur pour ses parcelles + Admins |

### 6. `audit_log_entries` (Logs d'audit - SENSIBLE)

| Opération | Politique |
|-----------|-----------|
| **SELECT** | Utilisateur voit ses propres logs |
| **SELECT** | Admins voient tous les logs |
| **INSERT** | Via trigger automatique uniquement |
| **UPDATE** | ❌ Bloqué totalement |
| **DELETE** | ❌ Bloqué totalement |

---

## 🛡️ Fonctions Helper Sécurisées

```sql
-- Vérifier si admin
is_admin() → BOOLEAN

-- Vérifier si producteur
is_producer() → BOOLEAN

-- Vérifier si professionnel (B2B)
is_pro() → BOOLEAN

-- Obtenir l'ID producteur de l'utilisateur
get_user_producer_id() → TEXT

-- Obtenir l'email de l'utilisateur courant
get_current_user_email() → TEXT

-- Vérifier propriété d'une saison
owns_season(p_season_id uuid) → BOOLEAN
```

> ⚠️ Toutes les fonctions utilisent `SECURITY DEFINER SET search_path = ''` pour éviter les vulnérabilités de search_path.

---

## 🧪 Scripts de Test

### Test 1: Vérifier isolation des profils

```sql
-- En tant qu'utilisateur normal
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "user-uuid-here"}';

-- Devrait retourner UNIQUEMENT le profil de l'utilisateur
SELECT * FROM profiles;
```

### Test 2: Vérifier accès public aux produits

```sql
-- Non authentifié
SET LOCAL ROLE anon;

-- Devrait retourner les produits publiés
SELECT * FROM products WHERE status = 'published';
```

### Test 3: Vérifier protection des logs d'audit

```sql
-- En tant qu'utilisateur normal
SET LOCAL ROLE authenticated;

-- Devrait ÉCHOUER
DELETE FROM audit_log_entries;
-- Erreur attendue: permission denied
```

### Test 4: Vérifier isolation progression joueur

```sql
-- En tant qu'utilisateur authentifié
SELECT * FROM player_progress;
-- Retourne uniquement SA progression
```

### Test 5: Vérifier isolation des saisons

```sql
-- En tant qu'utilisateur authentifié
SELECT * FROM seasons;
-- Retourne uniquement SES saisons
```

### Test 6: Vérifier cascade fields → seasons

```sql
-- Créer une saison puis une parcelle
INSERT INTO seasons (user_id, name, year) VALUES (auth.uid(), 'Test', 2026);
INSERT INTO fields (season_id, name) VALUES ('season-id', 'Parcelle Test');

-- Un autre utilisateur ne peut PAS voir cette parcelle
```

---

## 📋 Requêtes de Vérification

### Lister toutes les tables avec statut RLS

```sql
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS ACTIVÉ' ELSE '❌ RLS DÉSACTIVÉ' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

### Lister toutes les politiques

```sql
SELECT
  tablename,
  policyname,
  permissive,
  cmd,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Identifier les tables sans politiques (CRITIQUE!)

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT DISTINCT tablename FROM pg_policies WHERE schemaname = 'public'
  );
```

---

## ⚠️ Points d'Attention

1. **Tables sensibles sans DELETE**: `profiles`, `audit_log_entries` - les données sont conservées pour conformité RGPD

2. **Cascade via relation**: `fields` dépend de `seasons` - la sécurité est vérifiée via la fonction `owns_season()`

3. **Audit automatique**: Les triggers `audit_trigger_func()` logent automatiquement les changements sur `profiles`, `orders`, `products`

4. **FORCE ROW LEVEL SECURITY**: Activé sur toutes les tables critiques pour s'assurer que même le propriétaire de la table respecte les politiques

---

## 🚀 Déploiement

1. Exécuter le fichier `RLS_AUDIT_2026-01-15.sql` dans l'éditeur SQL Supabase
2. Vérifier avec les requêtes de vérification
3. Tester avec les scripts de test
4. Monitorer les logs d'audit pour détecter les tentatives d'accès non autorisées

---

## 📁 Fichiers Générés

- `database/RLS_AUDIT_2026-01-15.sql` - Script SQL complet
- `database/RLS_DOCUMENTATION.md` - Cette documentation
