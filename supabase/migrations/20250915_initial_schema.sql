-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create users table
create table users (
  id uuid default uuid_generate_v4() primary key,
  name text,
  email text unique not null,
  password text,
  email_verified timestamp with time zone,
  image text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create accounts table (for OAuth integration)
create table accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id) on delete cascade not null,
  type text not null,
  provider text not null,
  provider_account_id text not null,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  unique(provider, provider_account_id)
);

-- Create sessions table
create table sessions (
  id uuid default uuid_generate_v4() primary key,
  session_token text unique not null,
  user_id uuid references users(id) on delete cascade not null,
  expires timestamp with time zone not null
);

-- Create verification_tokens table
create table verification_tokens (
  identifier text not null,
  token text unique not null,
  expires timestamp with time zone not null,
  unique(identifier, token)
);

-- Create books table
create table books (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  genre text not null,
  description text not null,
  content text not null,
  chapters integer not null,
  style text not null,
  target_audience text not null,
  book_type text default 'text' not null,
  user_id uuid references users(id) on delete cascade not null,
  status text default 'completed' not null,
  images jsonb,
  chapters_json jsonb,
  cover_image text,
  back_cover_image text,
  back_cover_text text,
  author text,
  publisher text,
  isbn text,
  publication_date text,
  purchased boolean default false not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create generated_images table
create table generated_images (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id) on delete cascade not null,
  book_id uuid references books(id) on delete cascade,
  chapter_index integer,
  page_key text,
  style text,
  prompt text,
  url text not null,
  width integer,
  height integer,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create triggers for updated_at columns
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Add triggers to all tables with updated_at
create trigger update_users_updated_at before update on users
  for each row execute procedure update_updated_at_column();

create trigger update_books_updated_at before update on books
  for each row execute procedure update_updated_at_column();

create trigger update_generated_images_updated_at before update on generated_images
  for each row execute procedure update_updated_at_column();

-- Enable Row Level Security (RLS)
alter table users enable row level security;
alter table accounts enable row level security;
alter table sessions enable row level security;
alter table books enable row level security;
alter table generated_images enable row level security;

-- Create RLS policies
-- Users can only see and modify their own data
create policy "Users can view own profile" on users
  for select using (auth.uid() = id);

create policy "Users can update own profile" on users
  for update using (auth.uid() = id);

-- Users can only see their own books
create policy "Users can view own books" on books
  for select using (auth.uid() = user_id);

create policy "Users can insert own books" on books
  for insert with check (auth.uid() = user_id);

create policy "Users can update own books" on books
  for update using (auth.uid() = user_id);

create policy "Users can delete own books" on books
  for delete using (auth.uid() = user_id);

-- Users can only see their own generated images
create policy "Users can view own images" on generated_images
  for select using (auth.uid() = user_id);

create policy "Users can insert own images" on generated_images
  for insert with check (auth.uid() = user_id);

create policy "Users can update own images" on generated_images
  for update using (auth.uid() = user_id);

create policy "Users can delete own images" on generated_images
  for delete using (auth.uid() = user_id);

-- Create indexes for better performance
create index users_email_idx on users(email);
create index books_user_id_idx on books(user_id);
create index books_created_at_idx on books(created_at);
create index generated_images_user_id_idx on generated_images(user_id);
create index generated_images_book_id_idx on generated_images(book_id);