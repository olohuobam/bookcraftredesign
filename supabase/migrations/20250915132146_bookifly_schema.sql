-- Bookcraft database schema for Supabase
-- This migration creates the application-specific tables

-- Create custom types
DO $$ BEGIN
  CREATE TYPE book_type AS ENUM ('text', 'picture');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE book_status AS ENUM ('draft', 'generating', 'completed', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create users profile table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Books table
CREATE TABLE IF NOT EXISTS public.books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  chapters INTEGER NOT NULL,
  style TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  book_type book_type DEFAULT 'text',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status book_status DEFAULT 'completed',
  images JSONB,
  chapters_json JSONB,
  cover_image TEXT,
  back_cover_image TEXT,
  back_cover_text TEXT,
  author TEXT,
  publisher TEXT,
  isbn TEXT,
  publication_date TEXT,
  purchased BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated images table
CREATE TABLE IF NOT EXISTS public.generated_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  chapter_index INTEGER,
  page_key TEXT,
  style TEXT,
  prompt TEXT,
  url TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_books_user_id ON public.books(user_id);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books(created_at);
CREATE INDEX IF NOT EXISTS idx_books_book_type ON public.books(book_type);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON public.generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_book_id ON public.generated_images(book_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_books_updated_at ON public.books;
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_generated_images_updated_at ON public.generated_images;
CREATE TRIGGER update_generated_images_updated_at BEFORE UPDATE ON public.generated_images
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Profiles: Users can only see and update their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Books: Users can only see and manage their own books
DROP POLICY IF EXISTS "Users can view own books" ON public.books;
CREATE POLICY "Users can view own books" ON public.books
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own books" ON public.books;
CREATE POLICY "Users can insert own books" ON public.books
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own books" ON public.books;
CREATE POLICY "Users can update own books" ON public.books
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own books" ON public.books;
CREATE POLICY "Users can delete own books" ON public.books
  FOR DELETE USING (auth.uid() = user_id);

-- Generated Images: Users can only see and manage their own generated images
DROP POLICY IF EXISTS "Users can view own generated images" ON public.generated_images;
CREATE POLICY "Users can view own generated images" ON public.generated_images
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own generated images" ON public.generated_images;
CREATE POLICY "Users can insert own generated images" ON public.generated_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own generated images" ON public.generated_images;
CREATE POLICY "Users can update own generated images" ON public.generated_images
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own generated images" ON public.generated_images;
CREATE POLICY "Users can delete own generated images" ON public.generated_images
  FOR DELETE USING (auth.uid() = user_id);

-- Create a function to handle user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create a user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
