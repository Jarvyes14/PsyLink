CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  bucket_key text;
  current_count integer;
  now_at timestamp(3) := now();
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'Invalid rate limit' USING ERRCODE = '22023';
  END IF;
  bucket_key := p_key || ':' || floor(extract(epoch FROM now()) / p_window_seconds)::text;
  INSERT INTO public."RateLimit" (key, count, "expiresAt", "createdAt", "updatedAt")
    VALUES (bucket_key, 1, now_at + make_interval(secs => p_window_seconds * 2), now_at, now_at)
    ON CONFLICT (key) DO UPDATE SET count = public."RateLimit".count + 1, "updatedAt" = now_at
    RETURNING count INTO current_count;
  IF random() < 0.02 THEN
    DELETE FROM public."RateLimit" WHERE "expiresAt" < now_at;
  END IF;
  RETURN current_count <= p_limit;
END;
$$;
