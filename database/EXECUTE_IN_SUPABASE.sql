-- ============================================================================
-- SQL À EXÉCUTER DANS SUPABASE - Les Chanvriers Unis
-- ============================================================================
-- Copiez-collez ce fichier entier dans l'éditeur SQL de Supabase
-- Puis cliquez sur "Run" pour exécuter
-- ============================================================================

-- ============================================================================
-- 1. FONCTIONS HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_producer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'producer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. TABLE AUDIT LOG
-- ============================================================================

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

CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log_entries(created_at DESC);

ALTER TABLE audit_log_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own audit logs" ON audit_log_entries;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON audit_log_entries;
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON audit_log_entries;

CREATE POLICY "Users can view own audit logs"
ON audit_log_entries FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
ON audit_log_entries FOR SELECT
USING (is_admin());

CREATE POLICY "Authenticated users can insert audit logs"
ON audit_log_entries FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- 3. PROFILES TABLE RLS
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Only service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can update user roles" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_delete" ON profiles;

CREATE POLICY "profiles_select"
ON profiles FOR SELECT
USING (auth.uid() = id OR is_admin());

CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_admin"
ON profiles FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "profiles_insert"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

CREATE POLICY "profiles_delete"
ON profiles FOR DELETE
USING (is_admin());

-- ============================================================================
-- 4. PRODUCERS TABLE RLS
-- ============================================================================

ALTER TABLE producers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Producers can read own and public producer info" ON producers;
DROP POLICY IF EXISTS "Producers can update own producer account" ON producers;
DROP POLICY IF EXISTS "producers_select" ON producers;
DROP POLICY IF EXISTS "producers_update_own" ON producers;
DROP POLICY IF EXISTS "producers_update_admin" ON producers;
DROP POLICY IF EXISTS "producers_insert_admin" ON producers;
DROP POLICY IF EXISTS "producers_delete" ON producers;

CREATE POLICY "producers_select"
ON producers FOR SELECT
USING (true);

CREATE POLICY "producers_update_own"
ON producers FOR UPDATE
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "producers_update_admin"
ON producers FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "producers_insert_admin"
ON producers FOR INSERT
WITH CHECK (is_admin() OR auth.uid() = profile_id);

CREATE POLICY "producers_delete"
ON producers FOR DELETE
USING (is_admin());

-- ============================================================================
-- 5. PRODUCTS TABLE RLS
-- ============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Producers can read own products" ON products;
DROP POLICY IF EXISTS "Producers can create products" ON products;
DROP POLICY IF EXISTS "Producers can update own products" ON products;
DROP POLICY IF EXISTS "Producers can delete own products" ON products;
DROP POLICY IF EXISTS "products_select" ON products;
DROP POLICY IF EXISTS "products_insert" ON products;
DROP POLICY IF EXISTS "products_update" ON products;
DROP POLICY IF EXISTS "products_delete" ON products;

CREATE POLICY "products_select"
ON products FOR SELECT
USING (
  (status = 'published' AND visible_for_clients = true)
  OR auth.uid() IN (SELECT profile_id FROM producers WHERE id = producer_id)
  OR is_admin()
);

CREATE POLICY "products_insert"
ON products FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT profile_id FROM producers WHERE id = producer_id)
  OR is_admin()
);

CREATE POLICY "products_update"
ON products FOR UPDATE
USING (
  auth.uid() IN (SELECT profile_id FROM producers WHERE id = producer_id)
  OR is_admin()
)
WITH CHECK (
  auth.uid() IN (SELECT profile_id FROM producers WHERE id = producer_id)
  OR is_admin()
);

CREATE POLICY "products_delete"
ON products FOR DELETE
USING (
  auth.uid() IN (SELECT profile_id FROM producers WHERE id = producer_id)
  OR is_admin()
);

-- ============================================================================
-- 6. ORDERS TABLE RLS
-- ============================================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_delete" ON orders;

CREATE POLICY "orders_select"
ON orders FOR SELECT
USING (
  customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  OR is_admin()
  OR EXISTS (
    SELECT 1 FROM jsonb_array_elements(items) AS item
    WHERE item->>'producerId' IN (
      SELECT id FROM producers WHERE profile_id = auth.uid()
    )
  )
);

CREATE POLICY "orders_insert"
ON orders FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

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

CREATE POLICY "orders_delete"
ON orders FOR DELETE
USING (is_admin());

-- ============================================================================
-- 7. USER_LOTS TABLE RLS
-- ============================================================================

ALTER TABLE user_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_lots_select" ON user_lots;
DROP POLICY IF EXISTS "user_lots_insert" ON user_lots;
DROP POLICY IF EXISTS "user_lots_update" ON user_lots;

CREATE POLICY "user_lots_select"
ON user_lots FOR SELECT
USING (
  user_id = auth.uid()
  OR is_admin()
);

CREATE POLICY "user_lots_insert"
ON user_lots FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "user_lots_update"
ON user_lots FOR UPDATE
USING (user_id = auth.uid() OR is_admin());

-- ============================================================================
-- 8. LOTS TABLE RLS
-- ============================================================================

ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lots_select" ON lots;
DROP POLICY IF EXISTS "lots_all" ON lots;
DROP POLICY IF EXISTS "lots_insert" ON lots;
DROP POLICY IF EXISTS "lots_update" ON lots;
DROP POLICY IF EXISTS "lots_delete" ON lots;

CREATE POLICY "lots_select"
ON lots FOR SELECT
USING (active = true OR is_admin());

CREATE POLICY "lots_insert"
ON lots FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "lots_update"
ON lots FOR UPDATE
USING (is_admin());

CREATE POLICY "lots_delete"
ON lots FOR DELETE
USING (is_admin());

-- ============================================================================
-- 9. LOT_ITEMS TABLE RLS
-- ============================================================================

ALTER TABLE lot_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lot_items_select" ON lot_items;
DROP POLICY IF EXISTS "lot_items_all" ON lot_items;

CREATE POLICY "lot_items_select"
ON lot_items FOR SELECT
USING (true);

CREATE POLICY "lot_items_insert"
ON lot_items FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "lot_items_update"
ON lot_items FOR UPDATE
USING (is_admin());

CREATE POLICY "lot_items_delete"
ON lot_items FOR DELETE
USING (is_admin());

-- ============================================================================
-- 10. PACKS TABLE RLS
-- ============================================================================

ALTER TABLE packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packs_select" ON packs;
DROP POLICY IF EXISTS "packs_all" ON packs;
DROP POLICY IF EXISTS "packs_insert" ON packs;
DROP POLICY IF EXISTS "packs_update" ON packs;
DROP POLICY IF EXISTS "packs_delete" ON packs;

CREATE POLICY "packs_select"
ON packs FOR SELECT
USING (active = true OR is_admin());

CREATE POLICY "packs_insert"
ON packs FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "packs_update"
ON packs FOR UPDATE
USING (is_admin());

CREATE POLICY "packs_delete"
ON packs FOR DELETE
USING (is_admin());

-- ============================================================================
-- 11. PACK_ITEMS TABLE RLS
-- ============================================================================

ALTER TABLE pack_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pack_items_select" ON pack_items;
DROP POLICY IF EXISTS "pack_items_all" ON pack_items;

CREATE POLICY "pack_items_select"
ON pack_items FOR SELECT
USING (true);

CREATE POLICY "pack_items_insert"
ON pack_items FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "pack_items_update"
ON pack_items FOR UPDATE
USING (is_admin());

CREATE POLICY "pack_items_delete"
ON pack_items FOR DELETE
USING (is_admin());

-- ============================================================================
-- 12. PROMO_PRODUCTS TABLE RLS
-- ============================================================================

ALTER TABLE promo_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_products_select" ON promo_products;
DROP POLICY IF EXISTS "promo_products_all" ON promo_products;
DROP POLICY IF EXISTS "promo_products_insert" ON promo_products;
DROP POLICY IF EXISTS "promo_products_update" ON promo_products;
DROP POLICY IF EXISTS "promo_products_delete" ON promo_products;

CREATE POLICY "promo_products_select"
ON promo_products FOR SELECT
USING (active = true OR is_admin());

CREATE POLICY "promo_products_insert"
ON promo_products FOR INSERT
WITH CHECK (
  is_admin()
  OR producer_id IN (SELECT id FROM producers WHERE profile_id = auth.uid())
);

CREATE POLICY "promo_products_update"
ON promo_products FOR UPDATE
USING (
  is_admin()
  OR producer_id IN (SELECT id FROM producers WHERE profile_id = auth.uid())
);

CREATE POLICY "promo_products_delete"
ON promo_products FOR DELETE
USING (
  is_admin()
  OR producer_id IN (SELECT id FROM producers WHERE profile_id = auth.uid())
);

-- ============================================================================
-- 13. PRODUCER_CHAT_MESSAGES TABLE RLS (si existe)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'producer_chat_messages') THEN
    ALTER TABLE producer_chat_messages ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "chat_select" ON producer_chat_messages;
    DROP POLICY IF EXISTS "chat_insert" ON producer_chat_messages;
    DROP POLICY IF EXISTS "chat_messages_select" ON producer_chat_messages;
    DROP POLICY IF EXISTS "chat_messages_insert" ON producer_chat_messages;
    DROP POLICY IF EXISTS "chat_messages_delete" ON producer_chat_messages;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'producer_chat_messages') THEN
    EXECUTE 'CREATE POLICY "chat_messages_select" ON producer_chat_messages FOR SELECT USING (is_producer() OR is_admin())';
    EXECUTE 'CREATE POLICY "chat_messages_insert" ON producer_chat_messages FOR INSERT WITH CHECK (is_producer() OR is_admin())';
    EXECUTE 'CREATE POLICY "chat_messages_delete" ON producer_chat_messages FOR DELETE USING (is_admin())';
  END IF;
END $$;

-- ============================================================================
-- 14. PRO_ORDERS TABLE RLS (si existe)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pro_orders') THEN
    ALTER TABLE pro_orders ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Users can read own orders" ON pro_orders;
    DROP POLICY IF EXISTS "Users can create own orders" ON pro_orders;
    DROP POLICY IF EXISTS "Users can update own orders" ON pro_orders;
    DROP POLICY IF EXISTS "pro_orders_select" ON pro_orders;
    DROP POLICY IF EXISTS "pro_orders_insert" ON pro_orders;
    DROP POLICY IF EXISTS "pro_orders_update" ON pro_orders;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pro_orders') THEN
    EXECUTE 'CREATE POLICY "pro_orders_select" ON pro_orders FOR SELECT USING (pro_user_id = auth.uid() OR is_admin())';
    EXECUTE 'CREATE POLICY "pro_orders_insert" ON pro_orders FOR INSERT WITH CHECK (pro_user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "pro_orders_update" ON pro_orders FOR UPDATE USING (pro_user_id = auth.uid() OR is_admin())';
  END IF;
END $$;

-- ============================================================================
-- 15. FONCTION D'AUDIT AUTOMATIQUE
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log_entries (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id::text, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log_entries (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id::text, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log_entries (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id::text, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Appliquer le trigger aux tables sensibles
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- VERIFICATION - Exécutez cette requête pour vérifier
-- ============================================================================

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'producers', 'products', 'orders', 'user_lots', 'lots', 'packs', 'promo_products', 'audit_log_entries')
ORDER BY tablename;

-- ============================================================================
-- FIN - Toutes les politiques RLS sont maintenant actives
-- ============================================================================
