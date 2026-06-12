-- migration_v14: Discord interactions support
-- Fonction pour retrouver un utilisateur Supabase depuis son Discord ID

CREATE OR REPLACE FUNCTION public.get_user_from_discord_id(discord_id TEXT)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT user_id FROM auth.identities
  WHERE provider = 'discord'
    AND provider_id = discord_id
  LIMIT 1;
$$;
