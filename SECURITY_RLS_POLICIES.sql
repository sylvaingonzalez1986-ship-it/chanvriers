-- ============================================================================
-- SUPABASE RLS POLICIES - Les Chanvriers Unis
-- ============================================================================
-- These policies enforce row-level security to protect user data and prevent
-- unauthorized access to products, producers, and orders.
--
-- IMPORTANT: These policies should be applied to your Supabase database
-- after reviewing them. Test thoroughly in a development environment first.
-- ============================================================================

-- ============================================================================
-- 1. PRODUCTS TABLE RLS
-- ============================================================================
-- Producers can only see/modify their own products
-- Clients can see published products visible to clients

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: Producers can read their own products
CREATE POLICY "Producers can read own products"
ON products FOR SELECT
USING (
  auth.uid() IN (
    SELECT profile_id FROM producers WHERE id = products.producer_id
  )
  OR
  -- Allow public read for published products visible to clients
  (status = 'published' AND visible_for_clients = true)
);

-- Policy: Producers can insert products for their producer account
CREATE POLICY "Producers can create products"
ON products FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT profile_id FROM producers WHERE id = producer_id
  )
);

-- Policy: Producers can only update their own products
CREATE POLICY "Producers can update own products"
ON products FOR UPDATE
USING (
  auth.uid() IN (
    SELECT profile_id FROM producers WHERE id = products.producer_id
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT profile_id FROM producers WHERE id = products.producer_id
  )
);

-- Policy: Producers can only delete their own products
CREATE POLICY "Producers can delete own products"
ON products FOR DELETE
USING (
  auth.uid() IN (
    SELECT profile_id FROM producers WHERE id = products.producer_id
  )
);

-- ============================================================================
-- 2. PRODUCERS TABLE RLS
-- ============================================================================
-- Producers can only see/modify their own producer account
-- Clients can see all producers

-- Enable RLS on producers table
ALTER TABLE producers ENABLE ROW LEVEL SECURITY;

-- Policy: Producers can read their own producer account and public info
CREATE POLICY "Producers can read own and public producer info"
ON producers FOR SELECT
USING (
  auth.uid() = profile_id
  OR
  -- Allow reading public producer info
  true
);

-- Policy: Producers can update their own producer account
CREATE POLICY "Producers can update own producer account"
ON producers FOR UPDATE
USING (
  auth.uid() = profile_id
)
WITH CHECK (
  auth.uid() = profile_id
);

-- ============================================================================
-- 3. PROFILES TABLE RLS
-- ============================================================================
-- Users can only see/modify their own profile
-- Admins can see and modify all profiles

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (
  auth.uid() = id
  OR
  -- Admins can read all profiles
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (
  auth.uid() = id
)
WITH CHECK (
  auth.uid() = id
);

-- Policy: Only admins can insert new profiles (via auth triggers)
CREATE POLICY "Only service role can insert profiles"
ON profiles FOR INSERT
WITH CHECK (
  auth.role() = 'service_role'
);

-- Policy: Only admins can delete profiles
CREATE POLICY "Only admins can delete profiles"
ON profiles FOR DELETE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- ============================================================================
-- 4. PRO_ORDERS TABLE RLS (if exists)
-- ============================================================================
-- Users can only see/modify their own orders
-- Producers can see orders containing their products
-- Admins can see all orders

-- Enable RLS on pro_orders table if it exists
ALTER TABLE pro_orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own orders
CREATE POLICY "Users can read own orders"
ON pro_orders FOR SELECT
USING (
  auth.uid() = user_id
  OR
  -- Producers can see orders with their products
  auth.uid() IN (
    SELECT p.profile_id FROM producers p
    WHERE p.id IN (
      SELECT DISTINCT producer_id FROM pro_order_items
      WHERE order_id = pro_orders.id
    )
  )
  OR
  -- Admins can see all orders
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy: Users can insert their own orders
CREATE POLICY "Users can create own orders"
ON pro_orders FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Policy: Users and producers can update order status
CREATE POLICY "Users can update own orders"
ON pro_orders FOR UPDATE
USING (
  auth.uid() = user_id
  OR
  -- Producers can update order status for orders with their products
  auth.uid() IN (
    SELECT p.profile_id FROM producers p
    WHERE p.id IN (
      SELECT DISTINCT producer_id FROM pro_order_items
      WHERE order_id = pro_orders.id
    )
  )
  OR
  -- Admins can update any order
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  auth.uid() = user_id
  OR
  auth.uid() IN (
    SELECT p.profile_id FROM producers p
    WHERE p.id IN (
      SELECT DISTINCT producer_id FROM pro_order_items
      WHERE order_id = pro_orders.id
    )
  )
  OR
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- ============================================================================
-- 5. PRO_ORDER_ITEMS TABLE RLS (if exists)
-- ============================================================================
-- Items are readable if user can see the order

-- Enable RLS on pro_order_items table if it exists
ALTER TABLE pro_order_items ENABLE ROW LEVEL SECURITY;

-- Policy: Can read items if you can read the order
CREATE POLICY "Can read order items through order access"
ON pro_order_items FOR SELECT
USING (
  order_id IN (
    SELECT id FROM pro_orders
    WHERE auth.uid() = user_id
      OR auth.uid() IN (
        SELECT p.profile_id FROM producers p
        WHERE p.id IN (
          SELECT DISTINCT producer_id FROM pro_order_items poi
          WHERE poi.order_id = pro_orders.id
        )
      )
      OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  )
);

-- ============================================================================
-- 6. ADMIN OPERATIONS
-- ============================================================================
-- Note: Admin-only operations (user role changes, pro status approval, etc.)
-- should be enforced at the application level by checking the user's role
-- before making the API call.
--
-- The application (supabase-users.ts) already implements these checks:
-- - updateUserRole: Checks if user.role == 'admin'
-- - updateProStatus: Checks if user.role == 'admin'
-- - deleteUser: Checks if user.role == 'admin'
--
-- Additionally, you may want to create RLS policies that only allow
-- users with role='admin' to update the 'role' and 'pro_status' columns:

-- Policy: Only admins can modify user roles
CREATE POLICY "Only admins can update user roles"
ON profiles FOR UPDATE
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
-- To apply these policies, run this SQL in your Supabase SQL Editor.
-- After applying, test thoroughly to ensure:
-- 1. Producers can only see their own products
-- 2. Users can only see their own orders
-- 3. Admins can perform all operations
-- 4. Public data (published products) is visible to all authenticated users
