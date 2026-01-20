-- ============================================================================
-- COMPLETE RLS POLICIES & AUDIT LOG - Les Chanvriers Unis
-- ============================================================================
-- Version: 2.0
-- Date: 2026-01-14
--
-- This file contains:
-- 1. Audit log table for security monitoring
-- 2. Complete RLS policies for ALL sensitive tables
-- 3. Helper functions for role checking
--
-- IMPORTANT: Run this in your Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is a producer
CREATE OR REPLACE FUNCTION is_producer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'producer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the producer_id for current user
CREATE OR REPLACE FUNCTION get_user_producer_id()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT p.id FROM producers p
    WHERE p.profile_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely get the current user's email (uses profiles, not auth.users)
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
-- 1. AUDIT LOG TABLE
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_name ON audit_log_entries(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log_entries(action);

-- Enable RLS on audit_log_entries
ALTER TABLE audit_log_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
ON audit_log_entries FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON audit_log_entries FOR SELECT
USING (is_admin());

-- Policy: System can insert audit logs (authenticated users)
CREATE POLICY "Authenticated users can insert audit logs"
ON audit_log_entries FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: No one can update or delete audit logs (immutable)
-- (No UPDATE or DELETE policies = blocked by default)

-- ============================================================================
-- 2. PROFILES TABLE RLS (Users)
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Only service role can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Only admins can update user roles" ON profiles;

-- Policy: Users can read their own profile, admins can read all
CREATE POLICY "profiles_select"
ON profiles FOR SELECT
USING (
  auth.uid() = id
  OR is_admin()
);

-- Policy: Users can update their own profile (except role/pro_status)
CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  -- Note: role and pro_status changes are validated at application level
);

-- Policy: Admins can update any profile
CREATE POLICY "profiles_update_admin"
ON profiles FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Policy: Only service role can insert profiles (via auth trigger)
CREATE POLICY "profiles_insert"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- Policy: Only admins can delete profiles
CREATE POLICY "profiles_delete"
ON profiles FOR DELETE
USING (is_admin());

-- ============================================================================
-- 3. PRODUCERS TABLE RLS
-- ============================================================================

ALTER TABLE producers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Producers can read own and public producer info" ON producers;
DROP POLICY IF EXISTS "Producers can update own producer account" ON producers;

-- Policy: Everyone can read producer info (public)
CREATE POLICY "producers_select"
ON producers FOR SELECT
USING (true);

-- Policy: Only the linked profile can update their producer
CREATE POLICY "producers_update_own"
ON producers FOR UPDATE
USING (auth.uid() = profile_id)
WITH CHECK (auth.uid() = profile_id);

-- Policy: Admins can update any producer
CREATE POLICY "producers_update_admin"
ON producers FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

-- Policy: Admins can insert new producers
CREATE POLICY "producers_insert_admin"
ON producers FOR INSERT
WITH CHECK (is_admin() OR auth.uid() = profile_id);

-- Policy: Only admins can delete producers
CREATE POLICY "producers_delete"
ON producers FOR DELETE
USING (is_admin());

-- ============================================================================
-- 4. PRODUCTS TABLE RLS
-- ============================================================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Producers can read own products" ON products;
DROP POLICY IF EXISTS "Producers can create products" ON products;
DROP POLICY IF EXISTS "Producers can update own products" ON products;
DROP POLICY IF EXISTS "Producers can delete own products" ON products;

-- Policy: Everyone can read published products, producers can read their own
CREATE POLICY "products_select"
ON products FOR SELECT
USING (
  -- Published products visible to clients
  (status = 'published' AND visible_for_clients = true)
  OR
  -- Producers can see their own products
  auth.uid() IN (SELECT profile_id FROM producers WHERE id = producer_id)
  OR
  -- Admins can see all
  is_admin()
);

-- Policy: Producers can insert products for their producer account
CREATE POLICY "products_insert"
ON products FOR INSERT
WITH CHECK (
  auth.uid() IN (SELECT profile_id FROM producers WHERE id = producer_id)
  OR is_admin()
);

-- Policy: Producers can update their own products
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

-- Policy: Producers can delete their own products
CREATE POLICY "products_delete"
ON products FOR DELETE
USING (
  auth.uid() IN (SELECT profile_id FROM producers WHERE id = producer_id)
  OR is_admin()
);

-- ============================================================================
-- 5. ORDERS TABLE RLS
-- ============================================================================

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_delete" ON orders;

-- Policy: Users see their own orders, producers see orders with their products, admins see all
CREATE POLICY "orders_select"
ON orders FOR SELECT
USING (
  -- Check if user's email matches customer_email (via profiles, not auth.users)
  customer_email = get_current_user_email()
  OR
  -- Check user_id column if it exists and matches
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR
  -- Admins can see all
  is_admin()
  OR
  -- Producers can see orders containing their products
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(items) AS item
    WHERE item->>'producerId' IN (
      SELECT id FROM producers WHERE profile_id = auth.uid()
    )
  )
);

-- Policy: Authenticated users can create orders
CREATE POLICY "orders_insert"
ON orders FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Producers can update status for orders with their products, admins can update all
CREATE POLICY "orders_update"
ON orders FOR UPDATE
USING (
  is_admin()
  OR
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(items) AS item
    WHERE item->>'producerId' IN (
      SELECT id FROM producers WHERE profile_id = auth.uid()
    )
  )
)
WITH CHECK (
  is_admin()
  OR
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(items) AS item
    WHERE item->>'producerId' IN (
      SELECT id FROM producers WHERE profile_id = auth.uid()
    )
  )
);

-- Policy: Only admins can delete orders
CREATE POLICY "orders_delete"
ON orders FOR DELETE
USING (is_admin());

-- ============================================================================
-- 6. PRO_ORDERS TABLE RLS (B2B Orders)
-- ============================================================================

-- Check if table exists before altering
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pro_orders') THEN
    ALTER TABLE pro_orders ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop and recreate policies if table exists
DROP POLICY IF EXISTS "Users can read own orders" ON pro_orders;
DROP POLICY IF EXISTS "Users can create own orders" ON pro_orders;
DROP POLICY IF EXISTS "Users can update own orders" ON pro_orders;

-- Policies (only created if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pro_orders') THEN
    -- SELECT policy
    EXECUTE 'CREATE POLICY "pro_orders_select" ON pro_orders FOR SELECT USING (
      pro_user_id = auth.uid()
      OR is_admin()
    )';

    -- INSERT policy
    EXECUTE 'CREATE POLICY "pro_orders_insert" ON pro_orders FOR INSERT WITH CHECK (
      pro_user_id = auth.uid()
    )';

    -- UPDATE policy
    EXECUTE 'CREATE POLICY "pro_orders_update" ON pro_orders FOR UPDATE USING (
      pro_user_id = auth.uid() OR is_admin()
    )';
  END IF;
END $$;

-- ============================================================================
-- 7. PRODUCER_CHAT_MESSAGES TABLE RLS
-- ============================================================================

-- Check if table exists before altering
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'producer_chat_messages') THEN
    ALTER TABLE producer_chat_messages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

DROP POLICY IF EXISTS "chat_select" ON producer_chat_messages;
DROP POLICY IF EXISTS "chat_insert" ON producer_chat_messages;

-- Policies for chat (only producers and admins can access)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'producer_chat_messages') THEN
    -- SELECT: Only producers and admins can read messages
    EXECUTE 'CREATE POLICY "chat_messages_select" ON producer_chat_messages FOR SELECT USING (
      is_producer() OR is_admin()
    )';

    -- INSERT: Only producers and admins can send messages
    EXECUTE 'CREATE POLICY "chat_messages_insert" ON producer_chat_messages FOR INSERT WITH CHECK (
      is_producer() OR is_admin()
    )';

    -- DELETE: Only admins can delete messages
    EXECUTE 'CREATE POLICY "chat_messages_delete" ON producer_chat_messages FOR DELETE USING (
      is_admin()
    )';
  END IF;
END $$;

-- ============================================================================
-- 8. USER_LOTS TABLE RLS (Won lots)
-- ============================================================================

ALTER TABLE user_lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_lots_select" ON user_lots;
DROP POLICY IF EXISTS "user_lots_insert" ON user_lots;
DROP POLICY IF EXISTS "user_lots_update" ON user_lots;

-- Policy: Users can see their own lots
CREATE POLICY "user_lots_select"
ON user_lots FOR SELECT
USING (
  user_id = auth.uid()
  OR user_code = (SELECT user_code FROM profiles WHERE id = auth.uid())
  OR is_admin()
);

-- Policy: Authenticated users can create lot entries
CREATE POLICY "user_lots_insert"
ON user_lots FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can update their own lots (mark as used)
CREATE POLICY "user_lots_update"
ON user_lots FOR UPDATE
USING (
  user_id = auth.uid()
  OR user_code = (SELECT user_code FROM profiles WHERE id = auth.uid())
  OR is_admin()
);

-- ============================================================================
-- 9. LOTS TABLE RLS (Available lots for drawing)
-- ============================================================================

ALTER TABLE lots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lots_select" ON lots;
DROP POLICY IF EXISTS "lots_all" ON lots;

-- Policy: Everyone can read active lots
CREATE POLICY "lots_select"
ON lots FOR SELECT
USING (active = true OR is_admin());

-- Policy: Only admins can manage lots
CREATE POLICY "lots_insert"
ON lots FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "lots_update"
ON lots FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "lots_delete"
ON lots FOR DELETE
USING (is_admin());

-- ============================================================================
-- 10. PACKS TABLE RLS
-- ============================================================================

ALTER TABLE packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packs_select" ON packs;
DROP POLICY IF EXISTS "packs_all" ON packs;

-- Policy: Everyone can read active packs
CREATE POLICY "packs_select"
ON packs FOR SELECT
USING (active = true OR is_admin());

-- Policy: Only admins can manage packs
CREATE POLICY "packs_insert"
ON packs FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "packs_update"
ON packs FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "packs_delete"
ON packs FOR DELETE
USING (is_admin());

-- ============================================================================
-- 11. PROMO_PRODUCTS TABLE RLS
-- ============================================================================

ALTER TABLE promo_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "promo_products_select" ON promo_products;
DROP POLICY IF EXISTS "promo_products_all" ON promo_products;

-- Policy: Everyone can read active promos
CREATE POLICY "promo_products_select"
ON promo_products FOR SELECT
USING (active = true OR is_admin());

-- Policy: Admins and product owners can manage promos
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
-- 12. AUDIT TRIGGER FUNCTION
-- ============================================================================

-- Function to automatically log changes to sensitive tables
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

-- Apply audit trigger to sensitive tables
DROP TRIGGER IF EXISTS audit_profiles ON profiles;
CREATE TRIGGER audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify RLS is enabled on all tables:

-- SELECT schemaname, tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- List all policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- ============================================================================
-- END OF COMPLETE RLS POLICIES
-- ============================================================================
