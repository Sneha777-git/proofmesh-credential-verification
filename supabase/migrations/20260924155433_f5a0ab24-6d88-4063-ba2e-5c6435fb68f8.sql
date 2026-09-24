REVOKE ALL ON public.users, public.user_roles, public.verification_events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.credentials, public.issuers FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.users, public.user_roles, public.issuers, public.verification_events FROM authenticated;
REVOKE DELETE, TRUNCATE ON public.credentials FROM authenticated;