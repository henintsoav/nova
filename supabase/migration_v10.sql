-- migration_v10: Discord OAuth support
-- Updates handle_new_user trigger to handle OAuth providers (Discord, etc.)
-- Adds avatar_url column to profiles

-- Add avatar_url column if not exists
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT NULL;

-- Update trigger to handle Discord OAuth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  assigned_role TEXT;
  consent       BOOLEAN;
  user_name     TEXT;
  avatar        TEXT;
BEGIN
  -- Assign founder role by email
  IF NEW.email IN ('victoriaheny@gmail.com', 'peeeeachyy@gmail.com') THEN
    assigned_role := 'founder';
  ELSE
    assigned_role := 'member';
  END IF;

  -- GDPR consent:
  --   email signup  → read from metadata (explicit modal)
  --   OAuth (Discord, etc.) → auto-true (authorization implies acceptance)
  IF COALESCE(NEW.app_metadata->>'provider', 'email') = 'email' THEN
    consent := COALESCE((NEW.raw_user_meta_data->>'gdpr_consent')::BOOLEAN, FALSE);
  ELSE
    consent := TRUE;
  END IF;

  -- Display name: prefer Discord username → full_name → email prefix
  user_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'user_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    SPLIT_PART(COALESCE(NEW.email, 'user'), '@', 1)
  );

  -- Avatar from OAuth provider (Discord, etc.)
  avatar := NEW.raw_user_meta_data->>'avatar_url';

  INSERT INTO public.profiles (
    user_id, username, display_name, role,
    gdpr_consent, gdpr_consent_at, avatar_url
  )
  VALUES (
    NEW.id,
    user_name,
    user_name,
    assigned_role,
    consent,
    CASE WHEN consent THEN NOW() ELSE NULL END,
    avatar
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
