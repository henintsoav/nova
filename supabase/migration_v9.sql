-- ============================================================
-- NOVA — Migration v9 : GDPR consent storage
-- Run in Supabase SQL Editor AFTER migration_v8.sql
-- ============================================================

-- ── 1. Add consent columns to profiles ───────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gdpr_consent    BOOLEAN     NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS gdpr_consent_at TIMESTAMPTZ;

-- ── 2. Update trigger to store consent from signup metadata ──
-- The client passes gdpr_consent=true in options.data at signup.
-- Supabase stores this in auth.users.raw_user_meta_data.
-- The trigger reads it and stores it in the profile row atomically.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT;
  consent       BOOLEAN;
BEGIN
  -- Role assignment
  IF NEW.email IN (
    'victoriaheny@gmail.com',
    'nielsmerieau@hotmail.fr',
    'peeeeachyy@gmail.com'
  ) THEN
    assigned_role := 'founder';
  ELSE
    assigned_role := 'member';
  END IF;

  -- GDPR consent from signup metadata (defaults to false if not provided)
  consent := COALESCE((NEW.raw_user_meta_data->>'gdpr_consent')::BOOLEAN, FALSE);

  INSERT INTO public.profiles (
    user_id,
    username,
    display_name,
    role,
    gdpr_consent,
    gdpr_consent_at
  ) VALUES (
    NEW.id,
    SPLIT_PART(NEW.email, '@', 1),
    SPLIT_PART(NEW.email, '@', 1),
    assigned_role,
    consent,
    CASE WHEN consent THEN NOW() ELSE NULL END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
