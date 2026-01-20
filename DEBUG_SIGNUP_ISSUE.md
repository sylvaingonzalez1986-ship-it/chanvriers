# Guide de Diagnostic - Problème Inscription Android

## Problème
Le beta testeur ne peut pas se connecter sur Android. Le profil utilisateur ne se crée pas dans la table `profiles` lors de l'inscription.

Build Expo Android: https://expo.dev/accounts/les-champs-bretons/projects/les-chanvriers-unis/builds/79cdfe89-fdab-4af2-a965-61b765e4355d

---

## 1️⃣ Vérification de la configuration (URGENT)

### Vérifier que Android utilise la MÊME URL Supabase

**Problème possible**: La build Android utilise peut-être une URL Supabase différente.

```bash
# Sur la build Android, vérifier dans les logs:
# La première ligne après le démarrage devrait afficher:
# [Auth] Using Supabase URL: https://vosqgjsaujsayhrrhthf.supabase.co

# Clé Supabase correcte:
EXPO_PUBLIC_SUPABASE_URL=https://vosqgjsaujsayhrrhthf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**À faire**:
- [ ] Vérifier dans les logs Expo que l'URL est correcte
- [ ] Vérifier que les env variables sont bien passées à la build EAS

---

## 2️⃣ Exécuter les requêtes SQL de diagnostic

**Fichier**: `supabase/migrations/20260115_diagnostic_signup_issue.sql`

**À faire en ordre**:

1. **Vérifier le trigger**:
   ```sql
   SELECT trigger_name FROM information_schema.triggers
   WHERE trigger_name = 'on_auth_user_created';
   ```
   ✅ Doit retourner: `on_auth_user_created`

2. **Vérifier la fonction**:
   ```sql
   SELECT routine_name FROM information_schema.routines
   WHERE routine_name = 'handle_new_user';
   ```
   ✅ Doit retourner: `handle_new_user`

3. **Vérifier les policies**:
   ```sql
   SELECT policyname FROM pg_policies WHERE tablename = 'profiles';
   ```
   ✅ Doit inclure: `Users can insert their own profile during signup`

4. **Vérifier RLS**:
   ```sql
   SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles';
   ```
   ✅ Doit retourner: `true`

5. **Trouver les utilisateurs SANS profil**:
   ```sql
   SELECT u.id, u.email, u.created_at
   FROM auth.users u
   LEFT JOIN public.profiles p ON u.id = p.id
   WHERE p.id IS NULL
   AND u.created_at > NOW() - INTERVAL '7 days';
   ```
   ⚠️ S'il y a des résultats, ces utilisateurs n'ont pas de profil!

---

## 3️⃣ Ajouter des logs côté frontend

**Fichier à modifier**: `src/app/auth/signup.tsx` (déjà fait ✅)

Les logs suivants doivent être vus dans l'app:

```
[Signup] selectedRole: client
[Signup] Updating profile with data: {role: 'client', ...}
[Signup] Profile update result: {...success response...}
```

**À faire**:
- [ ] Regarder la console Expo lors de l'inscription sur Android
- [ ] Chercher les messages `[Signup]`
- [ ] Si erreur, copier le message exact

---

## 4️⃣ Ajouter des logs côté backend

**Ajouter une fonction de debug dans Supabase**:

```sql
CREATE OR REPLACE FUNCTION public.debug_signup()
RETURNS TABLE(trigger_status text, policy_status text, rls_status text) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Trigger: ' || COALESCE(
      (SELECT 'ENABLED' FROM information_schema.triggers
       WHERE trigger_name = 'on_auth_user_created' LIMIT 1),
      'MISSING'
    ) as trigger_status,
    'Policy INSERT: ' || COALESCE(
      (SELECT 'EXISTS' FROM pg_policies
       WHERE tablename = 'profiles' AND cmd = 'INSERT' LIMIT 1),
      'MISSING'
    ) as policy_status,
    'RLS: ' || CASE
      WHEN (SELECT relrowsecurity FROM pg_class WHERE relname = 'profiles')
      THEN 'ENABLED' ELSE 'DISABLED' END as rls_status;
END;
$$ LANGUAGE plpgsql;

-- Appeler pour vérifier:
SELECT * FROM public.debug_signup();
```

---

## 5️⃣ Tester une création de profil manuelle

**Une fois diagnostiqué, tester manuellement**:

1. Trouver un user_id sans profil (requête #5 ci-dessus)
2. Insérer un profil:
   ```sql
   INSERT INTO public.profiles (
     id, email, role, full_name, created_at, updated_at
   ) VALUES (
     'USER_ID_FOUND_ABOVE',
     'test@example.com',
     'client',
     'Test User',
     NOW(),
     NOW()
   );
   ```
3. Si ça marche → problème avec le trigger ou les permissions
4. Si ça échoue → problème avec la table ou les policies

---

## 6️⃣ Problèmes connus et solutions

### ❌ Trigger ne crée pas le profil
**Symptômes**: Utilisateur créé dans `auth.users` mais pas dans `profiles`

**Solution**:
```sql
-- Forcer le trigger à s'exécuter
ALTER TRIGGER on_auth_user_created ON auth.users ENABLE;

-- Ou recréer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### ❌ Policy INSERT bloque la création
**Symptômes**: Erreur "permission denied" dans les logs

**Solution**: Vérifier que la policy existe:
```sql
CREATE POLICY "Users can insert their own profile during signup"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);
```

### ❌ Android utilise une URL Supabase différente
**Symptômes**: URL différente dans les logs Android vs Web

**Solution**:
- Vérifier `.env` et `app.json`
- Reconstruire la build EAS
- Vérifier que les env variables sont injectées correctement

### ❌ RLS désactivé
**Symptômes**: Aucune permission sur `profiles`

**Solution**:
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

---

## 7️⃣ Checklist de dépannage

- [ ] Vérifier l'URL Supabase dans les logs Android
- [ ] Exécuter les 5 requêtes SQL de diagnostic
- [ ] Si trigger absent → créer le trigger
- [ ] Si policy manquante → créer la policy
- [ ] Si RLS désactivé → activer RLS
- [ ] Tester insertion manuelle
- [ ] Tester inscription à nouveau sur Android
- [ ] Vérifier que le profil est créé maintenant

---

## 📞 Logs à partager

Pour debugger, demander au testeur:

1. **Logs de l'app**:
   - Ouvrir LOGS tab dans Vibecode
   - Faire une inscription
   - Copier les lignes avec `[Signup]` et `[Auth]`

2. **État Supabase**:
   - Nombre d'utilisateurs dans `auth.users`
   - Nombre de profils dans `public.profiles`
   - Différence = utilisateurs SANS profil = BUG

3. **Logs Supabase** (si accessible):
   - Voir `supabase/migrations/20260115_diagnostic_signup_issue.sql` requête #10
