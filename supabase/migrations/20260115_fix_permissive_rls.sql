-- =============================================================================
-- Migration: Fix Permissive RLS Policies (USING(true) / WITH CHECK(true))
-- Date: 2026-01-15
-- Description: Remplace 15 policies dangereuses par des policies restrictives
-- =============================================================================
--
-- TABLES CONCERNÉES:
-- - app_data (3 policies)
-- - music_tracks (4 policies)
-- - producer_chat_messages (1 policy)
-- - producers (3 policies)
-- - products (3 policies)
-- - profiles (1 policy)
-- - upload_logs (1 policy)
-- - user_lots (3 policies)
--
-- PRINCIPE: Chaque policy doit vérifier auth.uid() ou un rôle spécifique
-- =============================================================================

-- =============================================================================
-- HELPER FUNCTIONS (si pas déjà créées)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_producer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'producer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================================================
-- 1. APP_DATA - Configuration de l'application
-- Logique: Lecture publique, modification admin uniquement
-- =============================================================================

ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les policies existantes sur app_data
DROP POLICY IF EXISTS "Allow public delete" ON public.app_data;
DROP POLICY IF EXISTS "Allow public insert" ON public.app_data;
DROP POLICY IF EXISTS "Allow public update" ON public.app_data;
DROP POLICY IF EXISTS "Allow public read" ON public.app_data;
DROP POLICY IF EXISTS "app_data_select" ON public.app_data;
DROP POLICY IF EXISTS "app_data_insert" ON public.app_data;
DROP POLICY IF EXISTS "app_data_update" ON public.app_data;
DROP POLICY IF EXISTS "app_data_delete" ON public.app_data;

-- Lecture publique (données de config non sensibles)
CREATE POLICY "app_data_select"
ON public.app_data FOR SELECT
TO authenticated, anon
USING (true);

-- Insertion réservée aux admins
CREATE POLICY "app_data_insert"
ON public.app_data FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Modification réservée aux admins
CREATE POLICY "app_data_update"
ON public.app_data FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Suppression réservée aux admins
CREATE POLICY "app_data_delete"
ON public.app_data FOR DELETE
TO authenticated
USING (public.is_admin());


-- =============================================================================
-- 2. MUSIC_TRACKS - Pistes audio
-- Logique: Lecture publique, gestion par admins/producteurs propriétaires
-- =============================================================================

ALTER TABLE public.music_tracks ENABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les policies existantes
DROP POLICY IF EXISTS "Allow public all" ON public.music_tracks;
DROP POLICY IF EXISTS "Allow public insert" ON public.music_tracks;
DROP POLICY IF EXISTS "Allow public update" ON public.music_tracks;
DROP POLICY IF EXISTS "Allow public delete" ON public.music_tracks;
DROP POLICY IF EXISTS "music_tracks_select" ON public.music_tracks;
DROP POLICY IF EXISTS "music_tracks_insert" ON public.music_tracks;
DROP POLICY IF EXISTS "music_tracks_update" ON public.music_tracks;
DROP POLICY IF EXISTS "music_tracks_delete" ON public.music_tracks;

-- Lecture publique (catalogue de musique)
CREATE POLICY "music_tracks_select"
ON public.music_tracks FOR SELECT
TO authenticated, anon
USING (true);

-- Insertion réservée aux admins
CREATE POLICY "music_tracks_insert"
ON public.music_tracks FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

-- Modification réservée aux admins
CREATE POLICY "music_tracks_update"
ON public.music_tracks FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Suppression réservée aux admins
CREATE POLICY "music_tracks_delete"
ON public.music_tracks FOR DELETE
TO authenticated
USING (public.is_admin());


-- =============================================================================
-- 3. PRODUCER_CHAT_MESSAGES - Messages du chat producteurs
-- Logique: Accès réservé aux producteurs et admins
-- =============================================================================

ALTER TABLE public.producer_chat_messages ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes
DROP POLICY IF EXISTS "Allow public insert" ON public.producer_chat_messages;
DROP POLICY IF EXISTS "chat_messages_select" ON public.producer_chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON public.producer_chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete" ON public.producer_chat_messages;
DROP POLICY IF EXISTS "producer_chat_messages_select" ON public.producer_chat_messages;
DROP POLICY IF EXISTS "producer_chat_messages_insert" ON public.producer_chat_messages;
DROP POLICY IF EXISTS "producer_chat_messages_delete" ON public.producer_chat_messages;

-- Lecture réservée aux producteurs et admins
CREATE POLICY "producer_chat_messages_select"
ON public.producer_chat_messages FOR SELECT
TO authenticated
USING (public.is_producer() OR public.is_admin());

-- Insertion réservée aux producteurs et admins (sender vérifié)
CREATE POLICY "producer_chat_messages_insert"
ON public.producer_chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  (public.is_producer() OR public.is_admin())
  AND sender_id = auth.uid()
);

-- Suppression réservée aux admins uniquement
CREATE POLICY "producer_chat_messages_delete"
ON public.producer_chat_messages FOR DELETE
TO authenticated
USING (public.is_admin());


-- =============================================================================
-- 4. PRODUCERS - Comptes producteurs
-- Logique: Lecture publique, modification par le propriétaire ou admin
-- =============================================================================

ALTER TABLE public.producers ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes
DROP POLICY IF EXISTS "Allow public delete" ON public.producers;
DROP POLICY IF EXISTS "Allow public insert" ON public.producers;
DROP POLICY IF EXISTS "Allow public update" ON public.producers;
DROP POLICY IF EXISTS "producers_select" ON public.producers;
DROP POLICY IF EXISTS "producers_insert" ON public.producers;
DROP POLICY IF EXISTS "producers_update_own" ON public.producers;
DROP POLICY IF EXISTS "producers_update_admin" ON public.producers;
DROP POLICY IF EXISTS "producers_delete" ON public.producers;

-- Lecture publique (catalogue de producteurs)
CREATE POLICY "producers_select"
ON public.producers FOR SELECT
TO authenticated, anon
USING (true);

-- Insertion: admin ou création de son propre profil producteur
CREATE POLICY "producers_insert"
ON public.producers FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR profile_id = auth.uid()
);

-- Modification par le propriétaire
CREATE POLICY "producers_update_own"
ON public.producers FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());

-- Modification par les admins
CREATE POLICY "producers_update_admin"
ON public.producers FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Suppression réservée aux admins
CREATE POLICY "producers_delete"
ON public.producers FOR DELETE
TO authenticated
USING (public.is_admin());


-- =============================================================================
-- 5. PRODUCTS - Produits
-- Logique: Lecture publique (publiés), gestion par producteur propriétaire/admin
-- =============================================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes
DROP POLICY IF EXISTS "Allow public delete" ON public.products;
DROP POLICY IF EXISTS "Allow public insert" ON public.products;
DROP POLICY IF EXISTS "Allow public update" ON public.products;
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_insert" ON public.products;
DROP POLICY IF EXISTS "products_update" ON public.products;
DROP POLICY IF EXISTS "products_delete" ON public.products;

-- Lecture: produits publiés pour tous, tous les produits pour propriétaire/admin
CREATE POLICY "products_select"
ON public.products FOR SELECT
TO authenticated, anon
USING (
  -- Produits publiés et visibles pour les clients
  (status = 'published' AND visible_for_clients = true)
  OR
  -- Producteurs voient leurs propres produits
  producer_id IN (SELECT id FROM public.producers WHERE profile_id = auth.uid())
  OR
  -- Admins voient tout
  public.is_admin()
);

-- Insertion par le producteur propriétaire ou admin
CREATE POLICY "products_insert"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
  producer_id IN (SELECT id FROM public.producers WHERE profile_id = auth.uid())
  OR public.is_admin()
);

-- Modification par le producteur propriétaire ou admin
CREATE POLICY "products_update"
ON public.products FOR UPDATE
TO authenticated
USING (
  producer_id IN (SELECT id FROM public.producers WHERE profile_id = auth.uid())
  OR public.is_admin()
)
WITH CHECK (
  producer_id IN (SELECT id FROM public.producers WHERE profile_id = auth.uid())
  OR public.is_admin()
);

-- Suppression par le producteur propriétaire ou admin
CREATE POLICY "products_delete"
ON public.products FOR DELETE
TO authenticated
USING (
  producer_id IN (SELECT id FROM public.producers WHERE profile_id = auth.uid())
  OR public.is_admin()
);


-- =============================================================================
-- 6. PROFILES - Profils utilisateurs
-- Logique: Lecture propre profil, insertion via auth trigger
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes dangereuses
DROP POLICY IF EXISTS "Allow public insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;

-- Insertion: uniquement pour son propre profil (création de compte)
CREATE POLICY "profiles_insert"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  id = auth.uid()
);

-- Note: On garde la policy INSERT existante pour le service_role (trigger auth)
-- Si nécessaire, ajouter cette policy alternative:
-- CREATE POLICY "profiles_insert_service"
-- ON public.profiles FOR INSERT
-- TO service_role
-- WITH CHECK (true);


-- =============================================================================
-- 7. UPLOAD_LOGS - Logs des uploads
-- Logique: Insertion authentifiée pour son propre log, lecture admin
-- =============================================================================

ALTER TABLE public.upload_logs ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes
DROP POLICY IF EXISTS "Allow public insert" ON public.upload_logs;
DROP POLICY IF EXISTS "upload_logs_select" ON public.upload_logs;
DROP POLICY IF EXISTS "upload_logs_insert" ON public.upload_logs;

-- Lecture: ses propres logs ou admin
CREATE POLICY "upload_logs_select"
ON public.upload_logs FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
);

-- Insertion: uniquement pour son propre log
CREATE POLICY "upload_logs_insert"
ON public.upload_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());


-- =============================================================================
-- 8. USER_LOTS - Lots gagnés par les utilisateurs
-- Logique: Accès à ses propres lots, gestion admin
-- =============================================================================

ALTER TABLE public.user_lots ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes
DROP POLICY IF EXISTS "Allow public all" ON public.user_lots;
DROP POLICY IF EXISTS "user_lots_select" ON public.user_lots;
DROP POLICY IF EXISTS "user_lots_insert" ON public.user_lots;
DROP POLICY IF EXISTS "user_lots_update" ON public.user_lots;
DROP POLICY IF EXISTS "user_lots_delete" ON public.user_lots;

-- Lecture: ses propres lots ou admin
CREATE POLICY "user_lots_select"
ON public.user_lots FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR user_code = (SELECT user_code FROM public.profiles WHERE id = auth.uid())
  OR public.is_admin()
);

-- Insertion: système/admin uniquement (lots attribués automatiquement)
CREATE POLICY "user_lots_insert"
ON public.user_lots FOR INSERT
TO authenticated
WITH CHECK (
  -- Soit l'utilisateur crée son propre lot (via tirage)
  user_id = auth.uid()
  -- Soit c'est un admin
  OR public.is_admin()
);

-- Modification: propriétaire (marquer comme utilisé) ou admin
CREATE POLICY "user_lots_update"
ON public.user_lots FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR user_code = (SELECT user_code FROM public.profiles WHERE id = auth.uid())
  OR public.is_admin()
)
WITH CHECK (
  user_id = auth.uid()
  OR user_code = (SELECT user_code FROM public.profiles WHERE id = auth.uid())
  OR public.is_admin()
);

-- Suppression: admin uniquement
CREATE POLICY "user_lots_delete"
ON public.user_lots FOR DELETE
TO authenticated
USING (public.is_admin());


-- =============================================================================
-- VÉRIFICATION
-- =============================================================================

-- Lister toutes les policies pour vérifier
-- SELECT tablename, policyname, permissive, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename IN ('app_data', 'music_tracks', 'producer_chat_messages',
--                   'producers', 'products', 'profiles', 'upload_logs', 'user_lots')
-- ORDER BY tablename, policyname;

-- =============================================================================
-- FIN DE LA MIGRATION
-- =============================================================================
