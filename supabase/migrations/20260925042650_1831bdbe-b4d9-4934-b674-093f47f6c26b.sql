CREATE TABLE public.document_pins (
  document_hash text PRIMARY KEY CHECK (document_hash ~ '^0x[0-9a-f]{64}$'),
  ipfs_cid text NOT NULL,
  pinned_by text NOT NULL CHECK (pinned_by ~ '^0x[0-9a-f]{40}$'),
  size_bytes integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.document_pins TO service_role;
ALTER TABLE public.document_pins ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.rate_limits (
  bucket text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, window_start)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.hit_rate_limit(_bucket text, _limit integer, _window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _start timestamptz; _hits integer;
BEGIN
  _start := to_timestamp(floor(extract(epoch FROM now()) / _window_seconds) * _window_seconds);
  INSERT INTO public.rate_limits (bucket, window_start, hits) VALUES (_bucket, _start, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = public.rate_limits.hits + 1
  RETURNING hits INTO _hits;
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
  RETURN _hits <= _limit;
END; $$;
REVOKE ALL ON FUNCTION public.hit_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hit_rate_limit(text, integer, integer) TO service_role;