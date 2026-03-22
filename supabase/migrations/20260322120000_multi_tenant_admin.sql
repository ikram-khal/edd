-- Multi-tenant: scope members and meetings to admin_accounts; allow multiple admins

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.admin_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES public.admin_accounts(id) ON DELETE CASCADE;

-- Backfill existing rows to the first admin (legacy single-tenant data)
UPDATE public.members m
SET admin_id = a.id
FROM (SELECT id FROM public.admin_accounts ORDER BY created_at ASC LIMIT 1) a
WHERE m.admin_id IS NULL
  AND EXISTS (SELECT 1 FROM public.admin_accounts LIMIT 1);

UPDATE public.meetings m
SET admin_id = a.id
FROM (SELECT id FROM public.admin_accounts ORDER BY created_at ASC LIMIT 1) a
WHERE m.admin_id IS NULL
  AND EXISTS (SELECT 1 FROM public.admin_accounts LIMIT 1);

ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_pin_key;
ALTER TABLE public.members
  ADD CONSTRAINT members_admin_pin_unique UNIQUE (admin_id, pin);

DROP FUNCTION IF EXISTS public.admin_exists();

DROP FUNCTION IF EXISTS public.admin_login(text, text);
CREATE OR REPLACE FUNCTION public.admin_login(p_username text, p_password text)
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

DROP FUNCTION IF EXISTS public.admin_register(text, text);
CREATE OR REPLACE FUNCTION public.admin_register(p_username text, p_password text)
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
