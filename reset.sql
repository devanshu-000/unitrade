-- ============================================================
-- UniXchange — Full Data Reset
-- Run in Supabase SQL Editor AFTER deploying the app
-- Keeps schema intact, deletes all data
-- ============================================================

-- Disable triggers temporarily to avoid FK constraint issues during truncate
SET session_replication_role = replica;

TRUNCATE TABLE
  reviews,
  notifications,
  messages,
  orders,
  borrow_requests,
  gigs,
  listings,
  users
RESTART IDENTITY CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Verify all tables are empty
SELECT 'users'          AS tbl, COUNT(*) FROM users
UNION ALL
SELECT 'listings',       COUNT(*) FROM listings
UNION ALL
SELECT 'gigs',           COUNT(*) FROM gigs
UNION ALL
SELECT 'borrow_requests',COUNT(*) FROM borrow_requests
UNION ALL
SELECT 'orders',         COUNT(*) FROM orders
UNION ALL
SELECT 'messages',       COUNT(*) FROM messages
UNION ALL
SELECT 'notifications',  COUNT(*) FROM notifications
UNION ALL
SELECT 'reviews',        COUNT(*) FROM reviews;
