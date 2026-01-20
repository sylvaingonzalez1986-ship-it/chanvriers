-- ============================================================================
-- FIX ORDERS RLS POLICIES - Les Chanvriers Unis
-- ============================================================================
-- Version: 1.0
-- Date: 2026-01-14
--
-- Problem: The SELECT policy uses (SELECT email FROM auth.users WHERE id = auth.uid())
-- which can fail with "permission denied for table users" in some Supabase configs.
--
-- Solution: Use profiles table instead (which is accessible via RLS)
-- or use auth.email() function directly.
-- ============================================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "orders_select" ON orders;
DROP POLICY IF EXISTS "orders_insert" ON orders;
DROP POLICY IF EXISTS "orders_update" ON orders;
DROP POLICY IF EXISTS "orders_delete" ON orders;

-- Create a SECURITY DEFINER function to safely get the current user's email
-- This avoids direct access to auth.users from RLS policies
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

-- Policy: Users see their own orders, producers see orders with their products, admins see all
-- FIXED: Uses profiles table via function instead of auth.users
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
  -- Owner can update their own orders
  (user_id IS NOT NULL AND user_id = auth.uid())
  OR
  -- Producers can update orders containing their products
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
  (user_id IS NOT NULL AND user_id = auth.uid())
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
-- VERIFY: Check that the policies were created correctly
-- ============================================================================

-- You can run this to verify:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'orders';
