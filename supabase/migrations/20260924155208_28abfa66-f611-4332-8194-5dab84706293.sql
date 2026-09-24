-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'issuer', 'user');
CREATE TYPE public.issuer_authorization AS ENUM ('authorized', 'unauthorized', 'pending', 'suspended');
CREATE TYPE public.credential_status AS ENUM ('ACTIVE', 'REVOKED', 'PENDING', 'ERROR');
CREATE TYPE public.credential_type AS ENUM ('Academic', 'Internship', 'Course', 'Achievement', 'Project', 'Other');
CREATE TYPE public.verification_type AS ENUM ('credential_id', 'qr', 'document', 'public_link');
CREATE TYPE public.verification_result AS ENUM ('record_found', 'revoked', 'pending', 'error_state', 'not_found');

-- Updated-at helper
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Users (profile per auth user; no identity documents)
CREATE TABLE public.users (
  id uuid PRIMARY KEY,
  wallet_address text UNIQUE CHECK (wallet_address IS NULL OR wallet_address ~ '^0x[0-9a-f]{40}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.users FOR SELECT TO authenticated USING (id = auth.uid());
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Roles live in a separate table (never on the profile)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Issuers, identified by wallet
CREATE TABLE public.issuers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE CHECK (wallet_address ~ '^0x[0-9a-f]{40}$'),
  issuer_name text NOT NULL CHECK (char_length(issuer_name) BETWEEN 2 AND 120),
  authorization_status public.issuer_authorization NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX issuers_status_idx ON public.issuers (authorization_status);
GRANT SELECT ON public.issuers TO anon, authenticated;
GRANT ALL ON public.issuers TO service_role;
ALTER TABLE public.issuers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Issuer registry is public" ON public.issuers FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER issuers_updated_at BEFORE UPDATE ON public.issuers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Is the caller an authorized issuer for this wallet? (wallet linked to their profile)
CREATE OR REPLACE FUNCTION public.is_authorized_issuer(_user_id uuid, _wallet text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    JOIN public.issuers i ON i.wallet_address = u.wallet_address
    JOIN public.user_roles r ON r.user_id = u.id AND r.role = 'issuer'
    WHERE u.id = _user_id AND u.wallet_address = lower(_wallet) AND i.authorization_status = 'authorized'
  )
$$;

-- Credentials
CREATE TABLE public.credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id text NOT NULL UNIQUE CHECK (credential_id ~ '^PM-[0-9]{6}$'),
  issuer_wallet text NOT NULL REFERENCES public.issuers(wallet_address) ON UPDATE CASCADE,
  credential_type public.credential_type NOT NULL,
  document_hash text NOT NULL CHECK (document_hash ~ '^0x[0-9a-f]{64}$'),
  ipfs_cid text CHECK (ipfs_cid IS NULL OR char_length(ipfs_cid) BETWEEN 46 AND 100),
  transaction_hash text UNIQUE CHECK (transaction_hash IS NULL OR transaction_hash ~ '^0x[0-9a-f]{64}$'),
  block_number bigint CHECK (block_number IS NULL OR block_number >= 0),
  status public.credential_status NOT NULL DEFAULT 'PENDING',
  issued_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (issuer_wallet, document_hash)
);
CREATE INDEX credentials_issuer_idx ON public.credentials (issuer_wallet, created_at DESC);
CREATE INDEX credentials_status_idx ON public.credentials (status);
CREATE INDEX credentials_hash_idx ON public.credentials (document_hash);
GRANT SELECT ON public.credentials TO anon;
GRANT SELECT, INSERT, UPDATE ON public.credentials TO authenticated;
GRANT ALL ON public.credentials TO service_role;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Credential registry is publicly readable" ON public.credentials FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Authorized issuers create own credentials" ON public.credentials FOR INSERT TO authenticated
  WITH CHECK (public.is_authorized_issuer(auth.uid(), issuer_wallet) AND status = 'PENDING' AND transaction_hash IS NULL AND block_number IS NULL AND revoked_at IS NULL);
CREATE POLICY "Authorized issuers update own credentials" ON public.credentials FOR UPDATE TO authenticated
  USING (public.is_authorized_issuer(auth.uid(), issuer_wallet))
  WITH CHECK (public.is_authorized_issuer(auth.uid(), issuer_wallet));

-- Issuers may only change status (and its timestamps); everything else is immutable to them.
CREATE OR REPLACE FUNCTION public.guard_credential_update() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    IF NEW.credential_id IS DISTINCT FROM OLD.credential_id
      OR NEW.issuer_wallet IS DISTINCT FROM OLD.issuer_wallet
      OR NEW.credential_type IS DISTINCT FROM OLD.credential_type
      OR NEW.document_hash IS DISTINCT FROM OLD.document_hash
      OR NEW.ipfs_cid IS DISTINCT FROM OLD.ipfs_cid
      OR NEW.transaction_hash IS DISTINCT FROM OLD.transaction_hash
      OR NEW.block_number IS DISTINCT FROM OLD.block_number
      OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'immutable_field' USING ERRCODE = '42501';
    END IF;
    IF OLD.status = 'REVOKED' AND NEW.status <> 'REVOKED' THEN
      RAISE EXCEPTION 'revocation_is_final' USING ERRCODE = '42501';
    END IF;
    -- Activation must come from the future on-chain flow, not a client.
    IF NEW.status = 'ACTIVE' AND OLD.status <> 'ACTIVE' THEN
      RAISE EXCEPTION 'activation_requires_chain' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF NEW.status = 'REVOKED' AND OLD.status <> 'REVOKED' THEN NEW.revoked_at = now(); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER credentials_guard BEFORE UPDATE ON public.credentials FOR EACH ROW EXECUTE FUNCTION public.guard_credential_update();
CREATE TRIGGER credentials_updated_at BEFORE UPDATE ON public.credentials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Verification events: never directly writable; only via record_verification()
CREATE TABLE public.verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id text NOT NULL CHECK (credential_id ~ '^PM-[0-9]{6}$'),
  verification_type public.verification_type NOT NULL,
  result public.verification_result NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX verification_events_cred_idx ON public.verification_events (credential_id, created_at DESC);
CREATE INDEX verification_events_created_idx ON public.verification_events (created_at DESC);
GRANT SELECT ON public.verification_events TO authenticated;
GRANT ALL ON public.verification_events TO service_role;
ALTER TABLE public.verification_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Issuers read history of their credentials" ON public.verification_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.credentials c WHERE c.credential_id = verification_events.credential_id
                 AND public.is_authorized_issuer(auth.uid(), c.issuer_wallet)));

-- The result is computed from the database, never supplied by the caller.
-- Throttled: one event per credential/type per 10 seconds.
CREATE OR REPLACE FUNCTION public.record_verification(_credential_id text, _type public.verification_type)
RETURNS public.verification_result LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _status public.credential_status;
  _result public.verification_result;
BEGIN
  IF _credential_id IS NULL OR _credential_id !~ '^PM-[0-9]{6}$' THEN
    RAISE EXCEPTION 'invalid_credential_id' USING ERRCODE = '22023';
  END IF;
  SELECT status INTO _status FROM public.credentials WHERE credential_id = _credential_id;
  _result := CASE
    WHEN _status IS NULL THEN 'not_found'
    WHEN _status = 'ACTIVE' THEN 'record_found'
    WHEN _status = 'REVOKED' THEN 'revoked'
    WHEN _status = 'PENDING' THEN 'pending'
    ELSE 'error_state' END;
  IF _status IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.verification_events
    WHERE credential_id = _credential_id AND verification_type = _type
      AND created_at > now() - interval '10 seconds'
  ) THEN
    INSERT INTO public.verification_events (credential_id, verification_type, result)
    VALUES (_credential_id, _type, _result);
  END IF;
  RETURN _result;
END; $$;
REVOKE ALL ON FUNCTION public.record_verification(text, public.verification_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_verification(text, public.verification_type) TO anon, authenticated, service_role;

-- Aggregate count only (no event detail) for the dashboard.
CREATE OR REPLACE FUNCTION public.verification_event_count()
RETURNS bigint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*) FROM public.verification_events
$$;
GRANT EXECUTE ON FUNCTION public.verification_event_count() TO anon, authenticated;

-- Profile row on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();