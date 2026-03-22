-- Full schema bootstrap: creates all tables and functions from scratch.
-- Uses IF NOT EXISTS / CREATE OR REPLACE everywhere so it is safe to re-run.

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ============================================================
-- Core tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.admin_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  pin text NOT NULL,
  session_id text,
  admin_id uuid REFERENCES public.admin_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  protocol_number text NOT NULL,
  meeting_date text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  admin_id uuid REFERENCES public.admin_accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meeting_attendees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  UNIQUE(meeting_id, member_id)
);

CREATE TABLE IF NOT EXISTS public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  text text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  votes_for integer NOT NULL DEFAULT 0,
  votes_against integer NOT NULL DEFAULT 0,
  votes_abstain integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.question_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  UNIQUE(question_id, member_id)
);

-- ============================================================
-- Unique constraint: pin scoped per admin
-- ============================================================
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_pin_key;
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_admin_pin_unique;
ALTER TABLE public.members
  ADD CONSTRAINT members_admin_pin_unique UNIQUE (admin_id, pin);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.admin_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_votes    ENABLE ROW LEVEL SECURITY;

-- admin_accounts
DROP POLICY IF EXISTS "Allow public read admin_accounts"   ON public.admin_accounts;
DROP POLICY IF EXISTS "Allow public insert admin_accounts" ON public.admin_accounts;
DROP POLICY IF EXISTS "Allow public update admin_accounts" ON public.admin_accounts;
CREATE POLICY "Allow public read admin_accounts"   ON public.admin_accounts FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert admin_accounts" ON public.admin_accounts FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update admin_accounts" ON public.admin_accounts FOR UPDATE TO anon USING (true);

-- members
DROP POLICY IF EXISTS "Allow public read members"   ON public.members;
DROP POLICY IF EXISTS "Allow public insert members" ON public.members;
DROP POLICY IF EXISTS "Allow public update members" ON public.members;
DROP POLICY IF EXISTS "Allow public delete members" ON public.members;
CREATE POLICY "Allow public read members"   ON public.members FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert members" ON public.members FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update members" ON public.members FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete members" ON public.members FOR DELETE TO anon USING (true);

-- meetings
DROP POLICY IF EXISTS "Allow public read meetings"   ON public.meetings;
DROP POLICY IF EXISTS "Allow public insert meetings" ON public.meetings;
DROP POLICY IF EXISTS "Allow public update meetings" ON public.meetings;
DROP POLICY IF EXISTS "Allow public delete meetings" ON public.meetings;
CREATE POLICY "Allow public read meetings"   ON public.meetings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert meetings" ON public.meetings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update meetings" ON public.meetings FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete meetings" ON public.meetings FOR DELETE TO anon USING (true);

-- meeting_attendees
DROP POLICY IF EXISTS "Allow public read meeting_attendees"   ON public.meeting_attendees;
DROP POLICY IF EXISTS "Allow public insert meeting_attendees" ON public.meeting_attendees;
DROP POLICY IF EXISTS "Allow public delete meeting_attendees" ON public.meeting_attendees;
CREATE POLICY "Allow public read meeting_attendees"   ON public.meeting_attendees FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert meeting_attendees" ON public.meeting_attendees FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public delete meeting_attendees" ON public.meeting_attendees FOR DELETE TO anon USING (true);

-- questions
DROP POLICY IF EXISTS "Allow public read questions"   ON public.questions;
DROP POLICY IF EXISTS "Allow public insert questions" ON public.questions;
DROP POLICY IF EXISTS "Allow public update questions" ON public.questions;
DROP POLICY IF EXISTS "Allow public delete questions" ON public.questions;
CREATE POLICY "Allow public read questions"   ON public.questions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert questions" ON public.questions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow public update questions" ON public.questions FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow public delete questions" ON public.questions FOR DELETE TO anon USING (true);

-- question_votes
DROP POLICY IF EXISTS "Allow public read question_votes"   ON public.question_votes;
DROP POLICY IF EXISTS "Allow public insert question_votes" ON public.question_votes;
CREATE POLICY "Allow public read question_votes"   ON public.question_votes FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public insert question_votes" ON public.question_votes FOR INSERT TO anon WITH CHECK (true);

-- ============================================================
-- Functions
-- ============================================================

DROP FUNCTION IF EXISTS public.admin_exists();
DROP FUNCTION IF EXISTS public.admin_login(text, text);
DROP FUNCTION IF EXISTS public.admin_register(text, text);
DROP FUNCTION IF EXISTS public.admin_change_password(text, text, text);
DROP FUNCTION IF EXISTS public.cast_vote(uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.admin_login(p_password text, p_username text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_id uuid;
BEGIN
  SELECT id INTO v_id FROM admin_accounts
  WHERE username = p_username
    AND password_hash = extensions.crypt(p_password, password_hash);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_register(p_password text, p_username text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE v_id uuid;
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
  p_current_password text, p_new_password text, p_username text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM admin_accounts
    WHERE username = p_username
      AND password_hash = extensions.crypt(p_current_password, password_hash)
  ) THEN RETURN FALSE; END IF;
  UPDATE admin_accounts
  SET password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf'))
  WHERE username = p_username;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.cast_vote(
  p_member_id uuid, p_question_id uuid, p_vote_type text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM question_votes WHERE question_id = p_question_id AND member_id = p_member_id) THEN
    RETURN FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM questions WHERE id = p_question_id AND status = 'voting') THEN
    RETURN FALSE;
  END IF;
  INSERT INTO question_votes (question_id, member_id) VALUES (p_question_id, p_member_id);
  IF p_vote_type = 'for' THEN
    UPDATE questions SET votes_for = votes_for + 1 WHERE id = p_question_id;
  ELSIF p_vote_type = 'against' THEN
    UPDATE questions SET votes_against = votes_against + 1 WHERE id = p_question_id;
  ELSIF p_vote_type = 'abstain' THEN
    UPDATE questions SET votes_abstain = votes_abstain + 1 WHERE id = p_question_id;
  ELSE
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$;

-- ============================================================
-- Grants
-- ============================================================
GRANT EXECUTE ON FUNCTION public.admin_register(text, text)              TO anon;
GRANT EXECUTE ON FUNCTION public.admin_login(text, text)                 TO anon;
GRANT EXECUTE ON FUNCTION public.admin_change_password(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.cast_vote(uuid, uuid, text)             TO anon;
