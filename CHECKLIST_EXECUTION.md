# ✅ CHECKLIST - Exécution de la Solution

## 📋 Avant d'Exécuter

- [ ] Vous avez accès à Supabase SQL Editor
- [ ] Vous êtes connecté au projet "les-chanvriers-unis"
- [ ] Vous avez lire le fichier `SIMPLE_SOLUTION.md` (optionnel mais recommandé)

---

## 🚀 Exécution de la Migration

### ÉTAPE 1: Ouvrir Supabase SQL Editor
- [ ] Aller à https://app.supabase.com
- [ ] Cliquer sur "les-chanvriers-unis" projet
- [ ] Dans le menu de gauche: **SQL Editor**
- [ ] Cliquer sur **"New Query"**

### ÉTAPE 2: Copier le Code SQL
- [ ] Ouvrir le fichier: `supabase/migrations/20260115_fix_fk_trigger_timing.sql`
- [ ] Sélectionner tout le contenu (Ctrl+A)
- [ ] Copier (Ctrl+C)

### ÉTAPE 3: Coller dans Supabase
- [ ] Aller dans Supabase SQL Editor (onglet ouvert)
- [ ] Cliquer dans la zone de texte
- [ ] Coller le code (Ctrl+V)

### ÉTAPE 4: Exécuter
- [ ] Vérifier que tout le code est visible
- [ ] Cliquer sur le bouton **"▶ Run"** (en haut à droite)
- [ ] OU appuyer sur **Ctrl+Enter**

### ÉTAPE 5: Attendre
- [ ] Attendre que l'exécution se termine
- [ ] Vérifier qu'**aucune erreur** n'apparaît
- [ ] Voir les résultats en bas (plusieurs sections "Results")

---

## 🧪 Tests Immédiatement Après

### Test 1: Vérifier le Trigger (30 secondes)

- [ ] Nouvelle requête SQL
- [ ] Copier-coller:
```sql
SELECT action_timing FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```
- [ ] Exécuter
- [ ] **Résultat attendu:** Une ligne avec **AFTER**
- [ ] ✅ Si vous voyez AFTER, c'est bon!

### Test 2: Vérifier les Profils Manquants (30 secondes)

- [ ] Nouvelle requête SQL
- [ ] Copier-coller:
```sql
SELECT COUNT(*) FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;
```
- [ ] Exécuter
- [ ] **Résultat attendu:** 0 (zéro)
- [ ] ✅ Si vous voyez 0, tous les utilisateurs ont un profil!

### Test 3: Tester une Inscription (2 minutes)

- [ ] Ouvrir l'app sur Android
- [ ] Aller à l'écran d'inscription
- [ ] Remplir le formulaire:
  - [ ] Sélectionner "Particulier"
  - [ ] Entrer email
  - [ ] Entrer mot de passe
  - [ ] Cliquer "Créer mon compte"
- [ ] Remplir le profil:
  - [ ] Entrer nom complet
  - [ ] Sélectionner catégorie
  - [ ] Cliquer "Terminer"
- [ ] ✅ Si vous accédez à l'accueil, c'est bon!

---

## ✅ Vérification Finale

Après le test d'inscription:

- [ ] Aller dans Supabase → Table Editor
- [ ] Cliquer sur table **"auth.users"**
- [ ] Voir votre nouvel utilisateur en bas
- [ ] Cliquer sur table **"profiles"**
- [ ] Voir votre nouveau profil avec:
  - [ ] Email = email du test
  - [ ] role = "client"
  - [ ] created_at = moment du test

---

## 📱 Tester sur Tous les Appareils (Optionnel)

- [ ] Tester sur **Android** ← C'était le problème
- [ ] Tester sur **iOS** (pour vérifier qu'on n'a rien cassé)
- [ ] Tester sur **Web** (pour vérifier qu'on n'a rien cassé)

---

## 🎉 RÉSULTAT FINAL

Si vous avez ✅ toutes les cases:

```
✅ Migration exécutée sans erreur
✅ Trigger est maintenant AFTER INSERT
✅ Aucun utilisateur sans profil
✅ Nouvelle inscription fonctionne sur Android
✅ Profil créé automatiquement
```

**PROBLÈME RÉSOLU!** 🚀

---

## ❌ Troubleshooting

### Erreur lors de l'exécution?
- [ ] Vérifier que vous avez copié **tout** le fichier
- [ ] Vérifier qu'aucune ligne n'est manquante
- [ ] Vérifier que vous êtes dans le bon projet Supabase
- [ ] Réessayer d'exécuter

### Trigger est toujours BEFORE?
- [ ] Refaire l'exécution
- [ ] Vérifier que la première ligne `DROP TRIGGER` a bien exécuté
- [ ] Attendre quelques secondes
- [ ] Réessayer la vérification

### Inscription toujours échoue?
- [ ] Vérifier les logs Expo (LOGS tab)
- [ ] Chercher les lignes avec **[Signup]** et **[Auth]**
- [ ] Vérifier que le status HTTP est 201 ou 200
- [ ] Contacter pour plus d'aide

---

## 📞 Support

Si quelque chose ne fonctionne pas:
1. Faire une screenshot de l'erreur
2. Noter exactement à quelle étape vous êtes bloqué
3. Vérifier le fichier `DEBUG_SIGNUP_ISSUE.md` pour plus d'infos

---

**Durée totale estimée:** 5-10 minutes ⏱️

**Difficulté:** ⭐ Très facile (copier-coller)

Bonne chance! 🍀
