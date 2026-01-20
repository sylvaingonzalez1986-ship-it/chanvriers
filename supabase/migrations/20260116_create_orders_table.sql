-- ============================================================================
-- MIGRATION CRITIQUE: Création de la table orders
-- ============================================================================
-- Date: 2026-01-16
-- Problème: Les commandes ne s'affichent pas car la table n'existe pas!
-- Erreur: "[fetchOrders] Table manquante dans Supabase"
-- Solution: Créer la table orders avec la bonne structure
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1: Vérifier si la table existe déjà
-- ============================================================================
-- Si cette requête retourne 1, la table existe déjà
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'orders';

-- ============================================================================
-- ÉTAPE 2: Créer la fonction is_admin si elle n'existe pas
-- ============================================================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- ÉTAPE 3: Créer la fonction get_current_user_email
-- ============================================================================
CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT email FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- ÉTAPE 4: Créer la table orders
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,

  -- Lien vers l'utilisateur authentifié (pour RLS)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Informations client
  customer_first_name TEXT NOT NULL,
  customer_last_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  customer_city TEXT,
  customer_postal_code TEXT,

  -- Produits commandés (JSONB array)
  items JSONB NOT NULL DEFAULT '[]',

  -- Montants
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Statut
  status TEXT NOT NULL DEFAULT 'pending',
  tracking_number TEXT,
  notes TEXT,

  -- Type de commande
  is_pro_order BOOLEAN DEFAULT false,

  -- Validation paiement
  payment_validated BOOLEAN DEFAULT false,
  payment_validated_at TIMESTAMPTZ,
  payment_validated_by UUID REFERENCES auth.users(id),

  -- Tickets
  tickets_distributed BOOLEAN DEFAULT false,
  tickets_earned INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ÉTAPE 5: Créer les index pour les performances
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_is_pro_order ON orders(is_pro_order);

-- Index GIN pour la recherche dans items JSONB
CREATE INDEX IF NOT EXISTS idx_orders_items ON orders USING GIN (items);

-- ============================================================================
-- ÉTAPE 6: Activer RLS (Row Level Security)
-- ============================================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ÉTAPE 7: Supprimer les anciennes policies si elles existent
-- ============================================================================
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_delete" ON orders;

-- ============================================================================
-- ÉTAPE 8: Créer les policies RLS
-- ============================================================================

-- SELECT: Utilisateurs voient leurs commandes, producteurs voient les commandes avec leurs produits, admins voient tout
CREATE POLICY "orders_select"
ON orders FOR SELECT
USING (
  -- Le client voit ses propres commandes (via email)
  customer_email = get_current_user_email()
  OR
  -- Le client voit ses propres commandes (via user_id)
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR
  -- Les admins voient toutes les commandes
  is_admin()
  OR
  -- Les producteurs voient les commandes contenant leurs produits
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(items) AS item
    WHERE (item->>'producer_id')::TEXT IN (
      SELECT id FROM producers WHERE profile_id = auth.uid()
    )
  )
);

-- INSERT: Tous les utilisateurs authentifiés peuvent créer des commandes
CREATE POLICY "orders_insert"
ON orders FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Producteurs peuvent mettre à jour les commandes avec leurs produits, admins peuvent tout modifier
CREATE POLICY "orders_update"
ON orders FOR UPDATE
USING (
  is_admin()
  OR
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(items) AS item
    WHERE (item->>'producer_id')::TEXT IN (
      SELECT id FROM producers WHERE profile_id = auth.uid()
    )
  )
)
WITH CHECK (
  is_admin()
  OR
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(items) AS item
    WHERE (item->>'producer_id')::TEXT IN (
      SELECT id FROM producers WHERE profile_id = auth.uid()
    )
  )
);

-- DELETE: Seuls les admins peuvent supprimer des commandes
CREATE POLICY "orders_delete"
ON orders FOR DELETE
USING (is_admin());

-- ============================================================================
-- ÉTAPE 9: Créer le trigger de mise à jour automatique de updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at_trigger ON orders;

CREATE TRIGGER orders_updated_at_trigger
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- ============================================================================
-- ÉTAPE 10: Vérifier que tout est bien créé
-- ============================================================================

-- Vérifier la table
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'orders'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Vérifier les policies
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'orders';

-- Vérifier RLS est activé
SELECT
  relname,
  relrowsecurity
FROM pg_class
WHERE relname = 'orders';

-- ============================================================================
-- RÉSUMÉ
-- ============================================================================
-- ✅ Table orders créée avec tous les champs requis
-- ✅ Index créés pour les performances
-- ✅ RLS activé
-- ✅ 4 policies créées:
--    - SELECT: clients, producteurs, admins
--    - INSERT: utilisateurs authentifiés
--    - UPDATE: producteurs avec leurs produits, admins
--    - DELETE: admins uniquement
-- ✅ Trigger updated_at
--
-- Après exécution:
-- 1. Les commandes seront enregistrées dans Supabase
-- 2. Les clients verront leurs commandes dans leur profil
-- 3. Les producteurs verront les commandes avec leurs produits
-- 4. Les admins verront toutes les commandes
-- ============================================================================
