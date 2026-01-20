# 🔧 Solution - Problème Foreign Key sur Trigger d'Inscription

## Problème Identifié

```
Error: 23503: insert or update on table "profiles" violates foreign key constraint
"profiles_id_fkey" Key (id)=(af765a30-0ad1-4f5f-8ce6-d32aab886ef4) is not present in table "users"
```

### Cause Racine

Le trigger `on_auth_user_created` est configuré avec le mauvais timing:
- ❌ **BEFORE INSERT** - Le trigger se déclenche AVANT que l'utilisateur soit inséré
- ✅ **AFTER INSERT** - Le trigger se déclenche APRÈS que l'utilisateur soit inséré

Quand le trigger est BEFORE, l'utilisateur n'existe pas encore dans `auth.users`, donc la contrainte de clé étrangère échoue.

---

## Solution Appliquée

**Fichier**: `supabase/migrations/20260115_fix_fk_trigger_timing.sql`

### 1. Supprimer le trigger existant
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

### 2. Recréer la fonction avec gestion d'erreur
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'client', NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error creating profile: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Créer le trigger avec timing APRÈS INSERT
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users      -- ⚠️ APRÈS, pas AVANT!
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## Étapes d'Exécution

### Dans Supabase SQL Editor:

1. **Copier** tout le contenu de `supabase/migrations/20260115_fix_fk_trigger_timing.sql`
2. **Coller** dans Supabase SQL Editor
3. **Exécuter** la migration complète

### Vérification:

```sql
-- Doit retourner: action_timing = AFTER
SELECT action_timing FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

---

## Tests Après Correction

### 1. Créer un utilisateur test
```sql
-- Inscrivez-vous sur l'app normalement
-- L'utilisateur doit être créé dans auth.users
```

### 2. Vérifier que le profil est créé
```sql
SELECT id, email, role FROM profiles
WHERE email = 'votre-email-test@example.com';

-- Doit retourner 1 ligne avec role = 'client'
```

### 3. Chercher les utilisateurs sans profil
```sql
SELECT u.id, u.email FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Doit retourner 0 lignes (aucun utilisateur sans profil)
```

---

## Timeline du Problème

### ❌ Avant (BEFORE INSERT)
```
1. Utilisateur remplit le formulaire d'inscription
2. Supabase crée l'utilisateur dans auth.users
3. Trigger se déclenche AVANT insertion ← ⚠️ TROP TÔT!
4. Essaie de créer le profil
5. FK Check: L'utilisateur n'existe pas encore → ERREUR 23503
6. Profil non créé ❌
```

### ✅ Après (AFTER INSERT)
```
1. Utilisateur remplit le formulaire d'inscription
2. Supabase crée l'utilisateur dans auth.users ✓
3. Trigger se déclenche APRÈS insertion ✓
4. Essaie de créer le profil
5. FK Check: L'utilisateur existe déjà → OK ✓
6. Profil créé avec succès ✓
```

---

## Fichiers Associés

| Fichier | Description |
|---------|-------------|
| `supabase/migrations/20260115_fix_fk_trigger_timing.sql` | Migration avec la correction |
| `DEBUG_SIGNUP_ISSUE.md` | Guide de dépannage complet |
| `src/lib/supabase-auth.ts` | Logs améliorés pour le debug |
| `src/app/auth/signup.tsx` | Logs améliorés pour l'inscription |

---

## Résultat Attendu

Après exécution de la migration et une nouvelle inscription:

**Logs attendus dans Expo**:
```
[Signup] selectedRole: client
[Auth] updateProfile: userId = af765a30-0ad1-4f5f-8ce6-d32aab886ef4
[Auth] updateProfile: response status = 201
[Auth] updateProfile: SUCCESS
[Signup] Profile update result: {id: "af765a30...", role: "client", ...}
[Signup] Navigating to home
```

**Base de données**:
```
✅ auth.users a 1 nouvelle ligne
✅ profiles a 1 nouvelle ligne
✅ Les IDs correspondent
```

---

## Support

Si le problème persiste:

1. Vérifier que le trigger est bien AFTER INSERT:
   ```sql
   SELECT action_timing FROM information_schema.triggers
   WHERE trigger_name = 'on_auth_user_created';
   ```

2. Vérifier les logs Supabase (Function logs)

3. Tester l'insertion manuelle:
   ```sql
   INSERT INTO public.profiles (id, email, role)
   VALUES ('test-uuid', 'test@example.com', 'client');
   ```

4. Vérifier que la policy INSERT existe:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'INSERT';
   ```
