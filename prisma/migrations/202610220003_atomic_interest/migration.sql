CREATE OR REPLACE FUNCTION public.respond_interest(
  p_interest_id text,
  p_psychologist_id text,
  p_accept boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  request_row public."Interest"%ROWTYPE;
  match_row public."Match"%ROWTYPE;
  now_at timestamp(3) := now();
BEGIN
  SELECT * INTO request_row FROM public."Interest"
    WHERE id = p_interest_id AND "psychologistId" = p_psychologist_id
    FOR UPDATE;
  IF NOT FOUND OR request_row.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Interest is unavailable' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public."Interest"
    SET status = CASE WHEN p_accept THEN 'ACCEPTED'::public."InterestStatus" ELSE 'DECLINED'::public."InterestStatus" END,
        "updatedAt" = now_at
    WHERE id = p_interest_id;
  IF NOT p_accept THEN RETURN '{"ok":true}'::jsonb; END IF;

  INSERT INTO public."Match" (id, "patientId", "psychologistId", active, "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, request_row."patientId", request_row."psychologistId", true, now_at, now_at)
    ON CONFLICT ("patientId", "psychologistId") DO UPDATE SET active = true, "updatedAt" = now_at
    RETURNING * INTO match_row;
  INSERT INTO public."Conversation" (id, "matchId", "createdAt", "updatedAt")
    VALUES (gen_random_uuid()::text, match_row.id, now_at, now_at)
    ON CONFLICT ("matchId") DO NOTHING;
  RETURN to_jsonb(match_row);
END;
$$;

REVOKE ALL ON FUNCTION public.respond_interest(text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_interest(text, text, boolean) TO service_role;
