-- PostgREST matches RPC by argument names in alphabetical order (e.g. p_password, p_username).
-- Redeclare functions so parameter order matches that expectation.

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

CREATE OR REPLACE FUNCTION public.cast_vote(
  p_member_id uuid,
  p_question_id uuid,
  p_vote_type text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
