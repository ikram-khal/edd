-- Allow browser (anon key) to call RPCs used by the app
GRANT EXECUTE ON FUNCTION public.admin_register(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_login(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_change_password(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.cast_vote(uuid, uuid, text) TO anon;
