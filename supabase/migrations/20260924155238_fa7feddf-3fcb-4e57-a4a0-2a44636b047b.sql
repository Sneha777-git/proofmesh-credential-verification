REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_authorized_issuer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_authorized_issuer(uuid, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.verification_event_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verification_event_count() TO anon, authenticated, service_role;