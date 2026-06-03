-- Enhance user profiles with additional fields
-- This migration adds new profile fields to support enhanced settings functionality

-- Check if we're using users or profiles table and standardize on users
DO $$ 
BEGIN
    -- If profiles table exists, migrate data to users table
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        -- Copy data from profiles to users if users table doesn't have the data
        INSERT INTO public.users (id, name, email, email_verified, image, created_at, updated_at)
        SELECT p.id, p.name, p.email, p.email_verified, p.image, p.created_at, p.updated_at 
        FROM public.profiles p
        WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = p.id)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          email_verified = EXCLUDED.email_verified,
          image = EXCLUDED.image,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at;
        
        -- Drop profiles table since we're standardizing on users
        DROP TABLE IF EXISTS public.profiles CASCADE;
    END IF;
END $$;

-- Add new columns to users table if they don't exist
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light',
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS push_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_report BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS book_completion_alert BOOLEAN DEFAULT true;

-- Update the Profile interface in TypeScript to match database
-- Note: This needs to be updated in the code

-- Update RLS policies for users table (recreate them if they were on profiles)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;  
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Update the handle_new_user function to set default values for new fields
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    name, 
    email, 
    email_verified, 
    image,
    language,
    theme,
    email_notifications,
    push_notifications,
    weekly_report,
    book_completion_alert
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NEW.email_confirmed_at,
    NEW.raw_user_meta_data->>'avatar_url',
    'en',
    'light',
    true,
    false,
    true,
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.users.name),
    email = EXCLUDED.email,
    email_verified = EXCLUDED.email_verified,
    image = COALESCE(EXCLUDED.image, public.users.image),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();