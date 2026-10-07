-- ============================================================
-- UniXchange — Schema v3 (safe incremental updates)
-- Run in Supabase SQL Editor
-- ============================================================

-- Core tables (idempotent)
create table if not exists users (
  id text primary key,
  email text not null,
  full_name text default '',
  avatar_url text default '',
  college text default '',
  trust_score integer default 50,
  total_transactions integer default 0,
  created_at timestamptz default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  title text not null,
  description text default '',
  price numeric(10,2) not null,
  category text not null,
  condition text not null,
  listing_type text default 'sell' check (listing_type in ('sell','borrow')),
  images text[] default '{}',
  is_available boolean default true,
  created_at timestamptz default now()
);

-- Add listing_type to existing table if missing
alter table listings add column if not exists listing_type text default 'sell' check (listing_type in ('sell','borrow'));

create table if not exists borrow_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id text references users(id) on delete cascade,
  lender_id text references users(id) on delete cascade,
  listing_id uuid references listings(id) on delete set null,
  item_name text not null,
  description text default '',
  status text default 'pending' check (status in ('pending','accepted','rejected','returned')),
  borrow_from date,
  borrow_until date,
  returned_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists gigs (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  title text not null,
  description text default '',
  category text not null,
  price numeric(10,2) not null,
  price_type text default 'FIXED' check (price_type in ('HOURLY','FIXED','PROJECT')),
  delivery_time text default '3 days',
  images text[] default '{}',
  is_available boolean default true,
  created_at timestamptz default now()
);

-- Ensure price_type column exists on gigs
alter table gigs add column if not exists price_type text default 'FIXED' check (price_type in ('HOURLY','FIXED','PROJECT'));
alter table gigs add column if not exists delivery_time text default '3 days';

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid references gigs(id) on delete set null,
  listing_id uuid references listings(id) on delete set null,
  buyer_id text references users(id) on delete cascade,
  seller_id text references users(id) on delete cascade,
  amount numeric(10,2) not null,
  status text default 'pending' check (status in ('pending','accepted','completed','cancelled')),
  payment_status text default 'pending' check (payment_status in ('pending','paid','failed')),
  razorpay_order_id text,
  razorpay_payment_id text,
  message text default '',
  created_at timestamptz default now()
);

alter table orders add column if not exists listing_id uuid references listings(id) on delete set null;

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text references users(id) on delete cascade,
  receiver_id text references users(id) on delete cascade,
  listing_id uuid references listings(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  borrow_id uuid references borrow_requests(id) on delete set null,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  type text not null,
  title text not null,
  body text default '',
  href text default '',
  is_read boolean default false,
  created_at timestamptz default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id text references users(id) on delete cascade,
  reviewee_id text references users(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  listing_id uuid references listings(id) on delete set null,
  rating integer check (rating between 1 and 5),
  comment text default '',
  created_at timestamptz default now()
);

-- INDEXES
create index if not exists idx_listings_user on listings(user_id);
create index if not exists idx_listings_available on listings(is_available);
create index if not exists idx_listings_type on listings(listing_type);
create index if not exists idx_gigs_user on gigs(user_id);
create index if not exists idx_orders_buyer on orders(buyer_id);
create index if not exists idx_orders_seller on orders(seller_id);
create index if not exists idx_borrow_requester on borrow_requests(requester_id);
create index if not exists idx_borrow_lender on borrow_requests(lender_id);
create index if not exists idx_messages_sender on messages(sender_id);
create index if not exists idx_messages_receiver on messages(receiver_id);
create index if not exists idx_notifications_user on notifications(user_id);

-- RLS
alter table users enable row level security;
alter table listings enable row level security;
alter table borrow_requests enable row level security;
alter table gigs enable row level security;
alter table orders enable row level security;
alter table messages enable row level security;
alter table notifications enable row level security;
alter table reviews enable row level security;

-- Policies
drop policy if exists "Public listings read" on listings;
drop policy if exists "Public gigs read" on gigs;
drop policy if exists "Public users read" on users;
drop policy if exists "Public reviews read" on reviews;
drop policy if exists "Messages read own" on messages;
drop policy if exists "Notifications read own" on notifications;

create policy "Public listings read" on listings for select using (is_available = true);
create policy "Public gigs read" on gigs for select using (is_available = true);
create policy "Public users read" on users for select using (true);
create policy "Public reviews read" on reviews for select using (true);
create policy "Messages read own" on messages for select using (auth.uid()::text = sender_id or auth.uid()::text = receiver_id);
create policy "Notifications read own" on notifications for select using (auth.uid()::text = user_id);
