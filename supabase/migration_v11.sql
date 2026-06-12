-- migration_v11: function to fetch confirmed scrims starting in ~1 hour
-- Used by the GitHub Actions scrim-reminder workflow

CREATE OR REPLACE FUNCTION public.get_scrims_starting_soon()
RETURNS TABLE(
  id         uuid,
  title      text,
  game       text,
  date       date,
  scrim_time time,
  opponent   text,
  format     text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, title, game, date, time AS scrim_time, opponent, format
  FROM public.scrims
  WHERE status = 'confirmed'
    AND (date::text || ' ' || time::text)::timestamp AT TIME ZONE 'Europe/Paris'
        BETWEEN NOW() + INTERVAL '50 minutes'
        AND     NOW() + INTERVAL '70 minutes';
$$;
