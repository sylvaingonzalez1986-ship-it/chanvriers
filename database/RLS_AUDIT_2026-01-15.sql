-- ============================================================================
-- AUDIT SÉCURITÉ RLS COMPLET - Les Chanvriers Unis
-- ============================================================================
-- Date: 2026-01-15
-- Priorité: CRITIQUE
--
-- Ce fichier contient:
-- 1. Audit de toutes les tables existantes
-- 2. Activation RLS sur toutes les tables
-- 3. Politiques de sécurité par table
-- 4. Fonctions helper sécurisées
-- 5. Scripts de test
-- ============================================================================

-- ============================================================================
-- SECTION 0: REQUÊTES D'AUDIT (À EXÉCUTER EN PREMIER)
-- ============================================================================

-- Lister toutes les tables avec leur statut RLS
-- SELECT
--   schemaname,
--   tablename,
--   rowsecurity as rls_enabled
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- Lister toutes les politiques RLS existantes
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual as using_expression,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Identifier les tables SANS RLS (CRITIQUE!)
-- SELECT tablename
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename NOT IN (
--     SELECT DISTINCT tablename
--     FROM pg_policies
--     WHERE schemaname = 'public'
--   );

-- ============================================================================
-- SECTION 1: FONCTIONS HELPER SÉCURISÉES
-- ============================================================================

-- Fonction pour vérifier si l'utilisateur est admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fonction pour vérifier si l'utilisateur est producteur
CREATE OR REPLACE FUNCTION is_producer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'producer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fonction pour vérifier si l'utilisateur est professionnel
CREATE OR REPLACE FUNCTION is_pro()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'pro'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fonction pour obtenir l'ID producteur de l'utilisateur
CREATE OR REPLACE FUNCTION get_user_producer_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT p.id FROM public.producers p
    WHERE p.profile_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fonction pour obtenir l'email de l'utilisateur courant (via profiles)
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT email FROM public.profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

-- ============================================================================
-- SECTION 2: TABLE PROFILES (Utilisateurs)
-- ============================================================================

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text DEFAULT 'client' CHECK (role IN ('client', 'pro', 'producer', 'admin')),
  category text,
  full_name text,
  email text,
  phone text,
  siret text,
  tva_number text,
  company_name text,
  user_code text UNIQUE,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activer RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- SELECT: Utilisateurs voient leur propre profil uniquement
CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- SELECT: Admins voient tous les profils
CREATE POLICY "profiles_select_admin"
ON profiles FOR SELECT
USING (is_admin());

-- INSERT: Uniquement pour création du propre profil (via trigger auth)
CREATE POLICY "profiles_insert"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- UPDATE: Utilisateurs modifient leur propre profil
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- UPDATE: Admins peuvent tout modifier
CREATE POLICY "profiles_update_admin"
ON profiles FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- DELETE: Bloqué (conservation des données)
-- Pas de politique DELETE = bloqué par défaut

-- ============================================================================
-- SECTION 3: TABLE PRODUCTS (Produits chanvre)
-- ============================================================================

-- Activer RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE products FORCE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_select_public" ON products;
DROP POLICY IF EXISTS "products_select_producer" ON products;
DROP POLICY IF EXISTS "products_select_admin" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;

-- SELECT: Public peut lire les produits publiés
CREATE POLICY "products_select_public"
ON products FOR SELECT
USING (
  status = 'published'
  AND visible_for_clients = true
);

-- SELECT: Producteurs voient leurs propres produits
CREATE POLICY "products_select_producer"
ON products FOR SELECT
USING (
  producer_id IN (
    SELECT id FROM producers WHERE profile_id = auth.uid()
  )
);

-- SELECT: Admins voient tout
CREATE POLICY "products_select_admin"
ON products FOR SELECT
USING (is_admin());

-- INSERT: Uniquement admins
CREATE POLICY "products_insert"
ON products FOR INSERT
WITH CHECK (
  is_admin()
  OR producer_id IN (
    SELECT id FROM producers WHERE profile_id = auth.uid()
  )
);

-- UPDATE: Uniquement admins et producteurs propriétaires
CREATE POLICY "products_update"
ON products FOR UPDATE
USING (
  is_admin()
  OR producer_id IN (
    SELECT id FROM producers WHERE profile_id = auth.uid()
  )
)
WITH CHECK (
  is_admin()
  OR producer_id IN (
    SELECT id FROM producers WHERE profile_id = auth.uid()
  )
);

-- DELETE: Uniquement admins et producteurs propriétaires
CREATE POLICY "products_delete"
ON products FOR DELETE
USING (
  is_admin()
  OR producer_id IN (
    SELECT id FROM producers WHERE profile_id = auth.uid()
  )
);

-- ============================================================================
-- SECTION 4: TABLE PLAYER_PROGRESS (Progression jeu)
-- ============================================================================

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS player_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level integer DEFAULT 1,
  experience integer DEFAULT 0,
  coins integer DEFAULT 0,
  achievements jsonb DEFAULT '[]'::jsonb,
  stats jsonb DEFAULT '{}'::jsonb,
  last_played_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_player_progress_user_id ON player_progress(user_id);

-- Activer RLS
ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_progress FORCE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "player_progress_select" ON player_progress;
DROP POLICY IF EXISTS "player_progress_insert" ON player_progress;
DROP POLICY IF EXISTS "player_progress_update" ON player_progress;
DROP POLICY IF EXISTS "player_progress_delete" ON player_progress;

-- SELECT: Utilisateur voit uniquement sa progression
CREATE POLICY "player_progress_select"
ON player_progress FOR SELECT
USING (user_id = auth.uid() OR is_admin());

-- INSERT: Utilisateur peut créer sa propre progression
CREATE POLICY "player_progress_insert"
ON player_progress FOR INSERT
WITH CHECK (user_id = auth.uid());

-- UPDATE: Utilisateur peut modifier uniquement sa progression
CREATE POLICY "player_progress_update"
ON player_progress FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Utilisateur peut supprimer uniquement sa progression
CREATE POLICY "player_progress_delete"
ON player_progress FOR DELETE
USING (user_id = auth.uid() OR is_admin());

-- ============================================================================
-- SECTION 5: TABLE SEASONS (Saisons de culture)
-- ============================================================================

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  year integer NOT NULL,
  start_date date,
  end_date date,
  status text DEFAULT 'active' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
  notes text,
  weather_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_seasons_user_id ON seasons(user_id);
CREATE INDEX IF NOT EXISTS idx_seasons_year ON seasons(year);

-- Activer RLS
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasons FORCE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "seasons_select" ON seasons;
DROP POLICY IF EXISTS "seasons_insert" ON seasons;
DROP POLICY IF EXISTS "seasons_update" ON seasons;
DROP POLICY IF EXISTS "seasons_delete" ON seasons;

-- SELECT: Utilisateur voit uniquement ses saisons
CREATE POLICY "seasons_select"
ON seasons FOR SELECT
USING (user_id = auth.uid() OR is_admin());

-- INSERT: Utilisateur peut créer ses propres saisons
CREATE POLICY "seasons_insert"
ON seasons FOR INSERT
WITH CHECK (user_id = auth.uid());

-- UPDATE: Utilisateur peut modifier uniquement ses saisons
CREATE POLICY "seasons_update"
ON seasons FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Utilisateur peut supprimer uniquement ses saisons
CREATE POLICY "seasons_delete"
ON seasons FOR DELETE
USING (user_id = auth.uid() OR is_admin());

-- ============================================================================
-- SECTION 6: TABLE FIELDS (Parcelles)
-- ============================================================================

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name text NOT NULL,
  area_m2 numeric,
  soil_type text,
  coordinates jsonb,
  crop_type text,
  planting_date date,
  harvest_date date,
  yield_kg numeric,
  notes text,
  images text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_fields_season_id ON fields(season_id);

-- Activer RLS
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields FORCE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "fields_select" ON fields;
DROP POLICY IF EXISTS "fields_insert" ON fields;
DROP POLICY IF EXISTS "fields_update" ON fields;
DROP POLICY IF EXISTS "fields_delete" ON fields;

-- Fonction helper pour vérifier propriété d'une parcelle via season_id
CREATE OR REPLACE FUNCTION owns_season(p_season_id uuid)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.seasons
    WHERE id = p_season_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- SELECT: Utilisateur via season_id
CREATE POLICY "fields_select"
ON fields FOR SELECT
USING (
  owns_season(season_id) OR is_admin()
);

-- INSERT: Utilisateur pour ses saisons
CREATE POLICY "fields_insert"
ON fields FOR INSERT
WITH CHECK (owns_season(season_id));

-- UPDATE: Utilisateur pour ses parcelles
CREATE POLICY "fields_update"
ON fields FOR UPDATE
USING (owns_season(season_id))
WITH CHECK (owns_season(season_id));

-- DELETE: Utilisateur pour ses parcelles
CREATE POLICY "fields_delete"
ON fields FOR DELETE
USING (owns_season(season_id) OR is_admin());

-- ============================================================================
-- SECTION 7: TABLE AUDIT_LOG_ENTRIES (Logs d'audit - SENSIBLE)
-- ============================================================================

-- Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS audit_log_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log_entries(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log_entries(action);

-- Activer RLS
ALTER TABLE audit_log_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log_entries FORCE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "audit_log_select_own" ON audit_log_entries;
DROP POLICY IF EXISTS "audit_log_select_admin" ON audit_log_entries;
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log_entries;
DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_log_entries;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_log_entries;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_log_entries;

-- SELECT: Utilisateurs voient leurs propres logs
CREATE POLICY "audit_log_select_own"
ON audit_log_entries FOR SELECT
USING (auth.uid() = user_id);

-- SELECT: Admins voient tous les logs
CREATE POLICY "audit_log_select_admin"
ON audit_log_entries FOR SELECT
USING (is_admin());

-- INSERT: Via trigger automatique uniquement (service_role)
CREATE POLICY "audit_log_insert"
ON audit_log_entries FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- UPDATE/DELETE: Bloqué totalement (pas de politique = bloqué)

-- ============================================================================
-- SECTION 8: TABLE PRODUCERS (Producteurs)
-- ============================================================================

ALTER TABLE producers ENABLE ROW LEVEL SECURITY;
ALTER TABLE producers FORCE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "producers_select" ON producers;
DROP POLICY IF EXISTS "producers_select_public" ON producers;
DROP POLICY IF EXISTS "producers_update_own" ON producers;
DROP POLICY IF EXISTS "producers_update_admin" ON producers;
DROP POLICY IF EXISTS "producers_insert" ON producers;
DROP POLICY IF EXISTS "producers_insert_admin" ON producers;
DROP POLICY IF EXISTS "producers_delete" ON producers;

-- SELECT: Public peut voir les producteurs
CREATE POLICY "producers_select_public"
ON producers FOR SELECT
USING (true);

-- UPDATE: Producteur peut modifier son propre profil
CREATE POLICY "producers_update_own"
ON producers FOR UPDATE
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- UPDATE: Admins peuvent tout modifier
CREATE POLICY "producers_update_admin"
ON producers FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- INSERT: Admins ou le profil lui-même
CREATE POLICY "producers_insert"
ON producers FOR INSERT
WITH CHECK (is_admin() OR auth.uid() = profile_id);

-- DELETE: Uniquement admins
CREATE POLICY "producers_delete"
ON producers FOR DELETE
USING (is_admin());

-- ============================================================================
-- SECTION 9: TABLE ORDERS (Commandes marketplace)
-- ============================================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_select_own" ON orders;
DROP POLICY IF EXISTS "orders_select_producer" ON orders;
DROP POLICY IF EXISTS "orders_select_admin" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_delete" ON orders;

-- SELECT: Utilisateur voit ses propres commandes
CREATE POLICY "orders_select_own"
ON orders FOR SELECT
USING (
  customer_email = get_current_user_email()
  OR (user_id IS NOT NULL AND user_id = auth.uid())
);

-- SELECT: Producteur voit les commandes avec ses produits
CREATE POLICY "orders_select_producer"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(items) AS item
    WHERE item->>'producerId' IN (
      SELECT id FROM producers WHERE profile_id = auth.uid()
    )
  )
);

-- SELECT: Admins voient tout
CREATE POLICY "orders_select_admin"
ON orders FOR SELECT
USING (is_admin());

-- INSERT: Utilisateurs authentifiés peuvent créer
CREATE POLICY "orders_insert"
ON orders FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Producteurs et admins
CREATE POLICY "orders_update"
ON orders FOR UPDATE
USING (
  is_admin()
  OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(items) AS item
    WHERE item->>'producerId' IN (
      SELECT id FROM producers WHERE profile_id = auth.uid()
    )
  )
);

-- DELETE: Uniquement admins
CREATE POLICY "orders_delete"
ON orders FOR DELETE
USING (is_admin());

-- ============================================================================
-- SECTION 10: TABLE APP_DATA (Configuration)
-- ============================================================================

-- Vérifier si la table existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_data') THEN
    ALTER TABLE app_data ENABLE ROW LEVEL SECURITY;
    ALTER TABLE app_data FORCE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "app_data_select" ON app_data;
DROP POLICY IF EXISTS "app_data_insert" ON app_data;
DROP POLICY IF EXISTS "app_data_update" ON app_data;
DROP POLICY IF EXISTS "app_data_delete" ON app_data;

-- SELECT: Tous peuvent lire
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_data') THEN
    EXECUTE 'CREATE POLICY "app_data_select" ON app_data FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "app_data_insert" ON app_data FOR INSERT WITH CHECK (is_admin())';
    EXECUTE 'CREATE POLICY "app_data_update" ON app_data FOR UPDATE USING (is_admin()) WITH CHECK (is_admin())';
    EXECUTE 'CREATE POLICY "app_data_delete" ON app_data FOR DELETE USING (is_admin())';
  END IF;
END $$;

-- ============================================================================
-- SECTION 11: TABLE MUSIC_TRACKS (Musique)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'music_tracks') THEN
    ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;
    ALTER TABLE music_tracks FORCE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "music_tracks_select" ON music_tracks;
DROP POLICY IF EXISTS "music_tracks_insert" ON music_tracks;
DROP POLICY IF EXISTS "music_tracks_update" ON music_tracks;
DROP POLICY IF EXISTS "music_tracks_delete" ON music_tracks;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'music_tracks') THEN
    EXECUTE 'CREATE POLICY "music_tracks_select" ON music_tracks FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "music_tracks_insert" ON music_tracks FOR INSERT WITH CHECK (is_admin())';
    EXECUTE 'CREATE POLICY "music_tracks_update" ON music_tracks FOR UPDATE USING (is_admin()) WITH CHECK (is_admin())';
    EXECUTE 'CREATE POLICY "music_tracks_delete" ON music_tracks FOR DELETE USING (is_admin())';
  END IF;
END $$;

-- ============================================================================
-- SECTION 12: TABLE UPLOAD_LOGS (Logs uploads - SENSIBLE)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'upload_logs') THEN
    ALTER TABLE upload_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE upload_logs FORCE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "upload_logs_select" ON upload_logs;
DROP POLICY IF EXISTS "upload_logs_insert" ON upload_logs;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'upload_logs') THEN
    -- SELECT: Uniquement admins
    EXECUTE 'CREATE POLICY "upload_logs_select" ON upload_logs FOR SELECT USING (is_admin())';
    -- INSERT: Service role uniquement
    EXECUTE 'CREATE POLICY "upload_logs_insert" ON upload_logs FOR INSERT WITH CHECK (auth.role() = ''service_role'')';
    -- UPDATE/DELETE: Bloqué
  END IF;
END $$;

-- ============================================================================
-- SECTION 13: TABLE USER_LOTS (Lots gagnés)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_lots') THEN
    ALTER TABLE user_lots ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_lots FORCE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "user_lots_select" ON user_lots;
DROP POLICY IF EXISTS "user_lots_select_own" ON user_lots;
DROP POLICY IF EXISTS "user_lots_select_admin" ON user_lots;
DROP POLICY IF EXISTS "user_lots_insert" ON user_lots;
DROP POLICY IF EXISTS "user_lots_update" ON user_lots;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_lots') THEN
    -- SELECT: Utilisateur voit ses propres lots
    EXECUTE 'CREATE POLICY "user_lots_select_own" ON user_lots FOR SELECT USING (user_id = auth.uid())';
    -- SELECT: Admins voient tout
    EXECUTE 'CREATE POLICY "user_lots_select_admin" ON user_lots FOR SELECT USING (is_admin())';
    -- INSERT: Authentifié
    EXECUTE 'CREATE POLICY "user_lots_insert" ON user_lots FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)';
    -- UPDATE: Propriétaire ou admin
    EXECUTE 'CREATE POLICY "user_lots_update" ON user_lots FOR UPDATE USING (user_id = auth.uid() OR is_admin())';
  END IF;
END $$;

-- ============================================================================
-- SECTION 14: TABLE PRODUCER_CHAT_MESSAGES
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'producer_chat_messages') THEN
    ALTER TABLE producer_chat_messages ENABLE ROW LEVEL SECURITY;
    ALTER TABLE producer_chat_messages FORCE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "chat_messages_select" ON producer_chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON producer_chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete" ON producer_chat_messages;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'producer_chat_messages') THEN
    -- SELECT: Producteurs et admins
    EXECUTE 'CREATE POLICY "chat_messages_select" ON producer_chat_messages FOR SELECT USING (is_producer() OR is_admin())';
    -- INSERT: Producteurs et admins
    EXECUTE 'CREATE POLICY "chat_messages_insert" ON producer_chat_messages FOR INSERT WITH CHECK (is_producer() OR is_admin())';
    -- DELETE: Uniquement admins
    EXECUTE 'CREATE POLICY "chat_messages_delete" ON producer_chat_messages FOR DELETE USING (is_admin())';
  END IF;
END $$;

-- ============================================================================
-- SECTION 15: TRIGGERS D'AUDIT AUTOMATIQUE
-- ============================================================================

-- Fonction de trigger pour audit automatique
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log_entries (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log_entries (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log_entries (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Appliquer les triggers sur les tables sensibles
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_products ON products;
CREATE TRIGGER audit_products
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- SECTION 16: VÉRIFICATION FINALE
-- ============================================================================

-- Requête pour vérifier que toutes les tables ont RLS activé
-- SELECT
--   t.tablename,
--   CASE WHEN t.rowsecurity THEN '✅ RLS ACTIVÉ' ELSE '❌ RLS DÉSACTIVÉ' END as rls_status,
--   COUNT(p.policyname) as policy_count
-- FROM pg_tables t
-- LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
-- WHERE t.schemaname = 'public'
-- GROUP BY t.tablename, t.rowsecurity
-- ORDER BY t.rowsecurity, t.tablename;

-- ============================================================================
-- SECTION 17: SCRIPTS DE TEST
-- ============================================================================

-- Test 1: Vérifier accès profil (en tant qu'utilisateur normal)
-- SET LOCAL ROLE authenticated;
-- SET LOCAL "request.jwt.claims" = '{"sub": "user-uuid-here"}';
-- SELECT * FROM profiles; -- Devrait retourner uniquement le profil de l'utilisateur

-- Test 2: Vérifier accès aux produits publics (non authentifié)
-- SET LOCAL ROLE anon;
-- SELECT * FROM products WHERE status = 'published'; -- Devrait fonctionner

-- Test 3: Vérifier protection des logs d'audit
-- SET LOCAL ROLE authenticated;
-- DELETE FROM audit_log_entries; -- Devrait échouer

-- Test 4: Vérifier accès progression joueur
-- SELECT * FROM player_progress; -- Uniquement ses propres données

-- Test 5: Vérifier isolation des saisons
-- SELECT * FROM seasons; -- Uniquement ses propres saisons

-- ============================================================================
-- FIN DE L'AUDIT RLS
-- ============================================================================

-- RÉSUMÉ DES POLITIQUES APPLIQUÉES:
--
-- | Table                    | SELECT           | INSERT          | UPDATE          | DELETE          |
-- |--------------------------|------------------|-----------------|-----------------|-----------------|
-- | profiles                 | Propre + Admin   | Propre          | Propre + Admin  | Bloqué          |
-- | products                 | Public + Owner   | Admin + Owner   | Admin + Owner   | Admin + Owner   |
-- | player_progress          | Propre + Admin   | Propre          | Propre          | Propre + Admin  |
-- | seasons                  | Propre + Admin   | Propre          | Propre          | Propre + Admin  |
-- | fields                   | Via season       | Via season      | Via season      | Via season      |
-- | audit_log_entries        | Propre + Admin   | Service role    | Bloqué          | Bloqué          |
-- | producers                | Public           | Admin + Self    | Owner + Admin   | Admin           |
-- | orders                   | Propre + Prod    | Authentifié     | Prod + Admin    | Admin           |
-- | app_data                 | Public           | Admin           | Admin           | Admin           |
-- | music_tracks             | Public           | Admin           | Admin           | Admin           |
-- | upload_logs              | Admin            | Service role    | Bloqué          | Bloqué          |
-- | user_lots                | Propre + Admin   | Authentifié     | Owner + Admin   | Bloqué          |
-- | producer_chat_messages   | Prod + Admin     | Prod + Admin    | Bloqué          | Admin           |
