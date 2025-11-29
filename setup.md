# AssetFlow Setup Guide

To get the application working, you need to set up your Supabase backend.

## 1. Create a Supabase Project

1. Go to [database.new](https://database.new) to create a new Supabase project.
2. Once created, go to **Settings** -> **API**.
3. Copy the **Project URL** and **anon public key**.

## 2. Environment Variables

Create a file named `.env` in your project root and add your keys:

```bash
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

## 3. Database Schema (SQL)

Go to the **SQL Editor** in your Supabase dashboard and run the following script to create the tables and security policies.

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  created_at timestamptz default now()
);

-- Enable RLS for Profiles
alter table public.profiles enable row level security;

create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- Trigger to create profile on signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. INCOME TABLE
create table public.income (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  amount numeric not null,
  date_received date not null,
  category text not null,
  notes text,
  attachment_url text,
  created_at timestamptz default now()
);

alter table public.income enable row level security;

create policy "Users can view own income" on public.income for select using (auth.uid() = user_id);
create policy "Users can insert own income" on public.income for insert with check (auth.uid() = user_id);
create policy "Users can update own income" on public.income for update using (auth.uid() = user_id);
create policy "Users can delete own income" on public.income for delete using (auth.uid() = user_id);

-- 3. EXPENSES TABLE
create table public.expenses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  amount numeric not null,
  date_paid date not null,
  category text not null,
  notes text,
  attachment_url text,
  created_at timestamptz default now()
);

alter table public.expenses enable row level security;

create policy "Users can view own expenses" on public.expenses for select using (auth.uid() = user_id);
create policy "Users can insert own expenses" on public.expenses for insert with check (auth.uid() = user_id);
create policy "Users can update own expenses" on public.expenses for update using (auth.uid() = user_id);
create policy "Users can delete own expenses" on public.expenses for delete using (auth.uid() = user_id);

-- 4. BENEFITS TABLE
create table public.benefits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  benefit_name text not null,
  amount numeric not null,
  frequency text not null, -- 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'YEARLY'
  next_payment_date date not null,
  created_at timestamptz default now()
);

alter table public.benefits enable row level security;

create policy "Users can view own benefits" on public.benefits for select using (auth.uid() = user_id);
create policy "Users can insert own benefits" on public.benefits for insert with check (auth.uid() = user_id);
create policy "Users can update own benefits" on public.benefits for update using (auth.uid() = user_id);
create policy "Users can delete own benefits" on public.benefits for delete using (auth.uid() = user_id);

-- 5. PAYDAYS TABLE
create table public.paydays (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  frequency text not null, -- 'WEEKLY', 'FORTNIGHTLY', 'MONTHLY'
  next_payday_date date not null,
  created_at timestamptz default now()
);

alter table public.paydays enable row level security;

create policy "Users can view own paydays" on public.paydays for select using (auth.uid() = user_id);
create policy "Users can insert own paydays" on public.paydays for insert with check (auth.uid() = user_id);
create policy "Users can update own paydays" on public.paydays for update using (auth.uid() = user_id);
create policy "Users can delete own paydays" on public.paydays for delete using (auth.uid() = user_id);
```

## 4. Storage Setup

1. Go to **Storage** in Supabase.
2. Create a new bucket named `finance_uploads`.
3. Make sure "Public" is **unchecked** (we want secure, signed URLs only).
4. Run the following SQL to allow file uploads (or configure via the Storage Policy UI):

```sql
-- Policy: Give users access to their own folder 
-- Folder structure will be: finance_uploads/{user_id}/{filename}

create policy "Authenticated users can upload" 
on storage.objects for insert 
to authenticated 
with check (
  bucket_id = 'finance_uploads' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can view own files" 
on storage.objects for select 
to authenticated 
using (
  bucket_id = 'finance_uploads' 
  and auth.uid()::text = (storage.foldername(name))[1]
);
```

## 5. Ready!

Restart your development server to pick up the new `.env` variables. You can now register a user, log in, and start tracking assets.
