-- Remove the remaining PL/pgSQL linter warnings without changing public APIs.

CREATE OR REPLACE FUNCTION public.generate_group_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  generated TEXT;
  random_bytes BYTEA;
BEGIN
  LOOP
    generated := '';
    random_bytes := extensions.gen_random_bytes(6);
    FOR byte_index IN 1..6 LOOP
      generated := generated || substr(alphabet, 1 + (get_byte(random_bytes, byte_index - 1) % length(alphabet)), 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.groups WHERE group_code = generated);
  END LOOP;
  RETURN generated;
END;
$$;

-- The original function initialized an array from an untyped text literal.
-- Preserve the deployed definition and replace only that initialization with
-- an explicitly typed empty array.
DO $migration$
DECLARE
  current_definition TEXT;
  corrected_definition TEXT;
BEGIN
  SELECT pg_get_functiondef('public.generate_weekly_insights(date)'::regprocedure)
    INTO current_definition;
  corrected_definition := replace(
    current_definition,
    'result_lines TEXT[] := ''{}'';',
    'result_lines TEXT[] := ARRAY[]::TEXT[];'
  );
  IF corrected_definition = current_definition THEN
    RAISE EXCEPTION 'generate_weekly_insights array initializer was not found';
  END IF;
  EXECUTE corrected_definition;
END;
$migration$;

REVOKE ALL ON FUNCTION public.generate_group_code() FROM PUBLIC, anon, authenticated;
