-- Fix: initial migration 20260322075555 failed on Supabase because pgcrypto lives
-- in the extensions schema, causing crypt() to be unresolved and rolling back the
-- entire transaction (including the CREATE TABLE).  This migration recreates
-- everything that depends on admin_accounts using IF NOT EXISTS / CREATE OR REPLACE
-- so it is safe to run even if some objects already exist.

-- 1. Ensure pgcrypto is available (Supabase pre-installs it in extensions schema)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Create admin_accounts table
CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.admin_accounts ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies (drop first to avoid duplicate errors on re-runs)
DROP POLICY IF EXISTS "Allow public read admin_accounts"   ON public.admin_accounts;
DROP POLICY IF EXISTS "Allow public insert admin_accounts" ON public.admin_accounts;
DROP POLICY IF EXISTS "Allow public update admin_accounts" ON public.admin_accounts;

CREATE POLICY "Allow public read admin_accounts"
  ON public.admin_accounts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert admin_accounts"
  ON public.admin_accounts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update admin_accounts"
  ON public.admin_accounts FOR UPDATE TO anon USING (true);

-- 5. Add admin_id FK columns to members / meetings (from multi_tenant migration)
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES public.admin_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS admin_id uuid REFERENCES public.admin_accounts(id) ON DELETE CASCADE;

-- 6. Unique constraint scoped per admin (drop old global one if still present)
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_pin_key;
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_admin_pin_unique;
ALTER TABLE public.members
  ADD CONSTRAINT members_admin_pin_unique UNIQUE (admin_id, pin);

-- 7. Admin functions with correct extensions.crypt() references
--    (alphabetical param order required by PostgREST)

DROP FUNCTION IF EXISTS public.admin_exists();
DROP FUNCTION IF EXISTS public.admin_login(text, text);
DROP FUNCTION IF EXISTS public.admin_register(text, text);
DROP FUNCTION IF EXISTS public.admin_change_password(text, text, text);

CREATE OR REPLACE FUNCTION public.admin_login(p_password text, p_username text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
  FROM admin_accounts
  WHERE username = p_username
    AND password_hash = extensions.crypt(p_password, password_hash);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_register(p_password text, p_username text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM admin_accounts WHERE username = p_username) THEN
    RETURN NULL;
  END IF;
  INSERT INTO admin_accounts (username, password_hash)
  VALUES (p_username, extensions.crypt(p_password, extensions.gen_salt('bf')))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_change_password(
  p_current_password text,
  p_new_password text,
  p_username text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM admin_accounts
    WHERE username = p_username
      AND password_hash = extensions.crypt(p_current_password, password_hash)
  ) THEN
    RETURN FALSE;
  END IF;
  UPDATE admin_accounts
  SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
  WHERE username = p_username;
  RETURN TRUE;
END;
$$;

-- 8. Grant execute to anon role
GRANT EXECUTE ON FUNCTION public.admin_register(text, text)        TO anon;
GRANT EXECUTE ON FUNCTION public.admin_login(text, text)           TO anon;
GRANT EXECUTE ON FUNCTION public.admin_change_password(text, text, text) TO anon;
