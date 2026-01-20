-- ============================================================================
-- FIX CHAT_MESSAGES RLS POLICY
-- ============================================================================
-- Version: 1.0
-- Date: 2026-01-14
--
-- Problem: RLS policy for chat_messages table is blocking INSERT operations
-- Error: 42501 - new row violates row-level security policy
--
-- Solution: Create proper RLS policies for chat_messages table
-- ============================================================================

-- First, check if table exists and create it if not
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id text NOT NULL,
  sender_name text NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete" ON chat_messages;
DROP POLICY IF EXISTS "chat_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_insert" ON chat_messages;

-- Helper function to check if user is producer (if not exists)
CREATE OR REPLACE FUNCTION is_producer_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND (role = 'producer' OR role = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Producers and admins can read all messages
CREATE POLICY "chat_messages_select"
ON chat_messages FOR SELECT
USING (
  -- Allow if user is authenticated (producers/admins can access chat)
  auth.uid() IS NOT NULL
);

-- Policy: Authenticated producers and admins can send messages
-- This is the critical fix - allowing INSERT for producers/admins
CREATE POLICY "chat_messages_insert"
ON chat_messages FOR INSERT
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  AND
  -- User must be a producer or admin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND (role = 'producer' OR role = 'admin')
  )
);

-- Policy: Only admins can delete messages
CREATE POLICY "chat_messages_delete"
ON chat_messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify the policies are created:
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'chat_messages';
-- ============================================================================
