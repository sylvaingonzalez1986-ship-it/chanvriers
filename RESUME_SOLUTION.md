# 🎯 RÉSUMÉ - Solution au problème d'inscription Android

## 🔴 Problème Identifié

```
Error: 23503: insert or update on table "profiles" violates foreign key constraint
"profiles_id_fkey" Key (id)=(...) is not present in table "users"
```

Le profil ne se crée pas lors de l'inscription sur Android.

---

## 🔍 Cause Racine Découverte

Le trigger `on_auth_user_created` est configuré avec le **mauvais timing**:

- ❌ **BEFORE INSERT** - Le trigger se déclenche AVANT que l'utilisateur soit créé dans auth.users
- ✅ **AFTER INSERT** - Le trigger se déclenche APRÈS que l'utilisateur soit créé

Quand c'est BEFORE, l'utilisateur n'existe pas encore, donc la contrainte de clé étrangère échoue.

---

## ✅ Solution Appliquée

### Migration SQL Créée

**Fichier**: `supabase/migrations/20260115_fix_fk_trigger_timing.sql`

Cette migration:
1. ✅ Supprime le trigger existant
2. ✅ Recréé la fonction `handle_new_user()` avec gestion d'erreur robuste
3. ✅ Crée le trigger avec timing **AFTER INSERT** (correct)
4. ✅ Crée les profils manquants pour les utilisateurs existants
5. ✅ Vérifie les contraintes de clé étrangère

### Comment l'appliquer

1. Ouvrir **Supabase SQL Editor**
2. Copier le contenu de `supabase/migrations/20260115_fix_fk_trigger_timing.sql`
3. Exécuter dans Supabase
4. Vérifier avec: `SELECT action_timing FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created';`
   - Doit retourner: **AFTER**

---

## 📁 Fichiers Créés/Modifiés

### Nouveaux Fichiers
| Fichier | Description |
|---------|-------------|
| `supabase/migrations/20260115_fix_fk_trigger_timing.sql` | Migration SQL critique avec la correction |
| `SOLUTION_FK_TRIGGER.md` | Explication détaillée de la cause et solution |
| `DEBUG_SIGNUP_ISSUE.md` | Guide complet de dépannage |
| `supabase/migrations/20260115_diagnostic_signup_issue.sql` | Requêtes de diagnostic |

### Fichiers Modifiés
| Fichier | Modification |
|---------|--------------|
| `src/lib/supabase-auth.ts` | Logs améliorés pour `updateProfile()` |
| `src/app/auth/signup.tsx` | Logs améliorés pour le formulaire d'inscription |
| `README.md` | Section de diagnostic et solution |

---

## 🧪 Tests Après Correction

### Vérification Immédiate
```sql
-- Doit retourner: AFTER
SELECT action_timing FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

### Vérifier les Utilisateurs sans Profil
```sql
-- Doit retourner 0 lignes (vide)
SELECT u.id, u.email FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
```

### Tester une Nouvelle Inscription
```
1. Ouvrir l'app sur Android
2. Aller à l'écran d'inscription
3. Remplir le formulaire et cliquer "Créer mon compte"
4. Vérifier les logs Expo:
   - [Signup] selectedRole: client
   - [Auth] updateProfile: response status = 201
   - [Auth] updateProfile: SUCCESS
5. Vérifier que le profil est créé dans Supabase:
   SELECT * FROM profiles WHERE email = 'email-test@example.com';
   - Doit retourner 1 ligne avec role = 'client'
```

---

## 📊 Impact

### Avant
```
❌ Utilisateurs créés dans auth.users mais SANS profil
❌ Logs d'erreur: "foreign key constraint"
❌ Inscription Android échoue silencieusement
```

### Après
```
✅ Utilisateurs créés dans auth.users
✅ Profils créés automatiquement par le trigger AFTER INSERT
✅ FK constraint passe (utilisateur existe déjà)
✅ Inscription réussie
```

---

## 📋 Checklist Finale

- [x] Cause identifiée (trigger BEFORE vs AFTER)
- [x] Migration SQL créée avec correction
- [x] Logs améliorés pour le debug
- [x] Documentation complète (3 fichiers)
- [x] Tests de vérification fournis
- [x] README mis à jour

---

## 🚀 Prochaine Étape

**Exécuter la migration dans Supabase SQL Editor** et tester une nouvelle inscription sur Android.

Tous les fichiers sont prêts et documentés !
