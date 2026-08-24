-- Persist each user's optional prayer-time location on their private profile.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_country TEXT,
  ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_location_lat_valid') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_location_lat_valid
      CHECK (location_lat IS NULL OR location_lat BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_location_lng_valid') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_location_lng_valid
      CHECK (location_lng IS NULL OR location_lng BETWEEN -180 AND 180);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_location_pair_complete') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_location_pair_complete
      CHECK ((location_lat IS NULL) = (location_lng IS NULL));
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.location_city IS 'User-selected city label for prayer times';
COMMENT ON COLUMN public.profiles.location_country IS 'User-selected country label for prayer times';
COMMENT ON COLUMN public.profiles.location_lat IS 'Optional browser-geolocation latitude';
COMMENT ON COLUMN public.profiles.location_lng IS 'Optional browser-geolocation longitude';
