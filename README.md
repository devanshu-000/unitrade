# UniXchange

> Buy, Sell, Borrow & Earn — Your Campus Exchange Platform.

UniXchange is a full-stack campus economy platform built with Next.js, Supabase, and Clerk.

## Features

- 🛍️ **Marketplace** — Buy and sell items within your campus
- 🤝 **Peer Lending** — Borrow items by day or hour with slot-based availability
- 💼 **Micro Gigs** — Hire or offer skills and services
- ⭐ **Trust Score** — Reputation system that grows with every transaction
- 💬 **Messaging** — Real-time chat between users
- 🔔 **Notifications** — Activity alerts for all interactions

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Clerk
- **Payments**: Razorpay
- **Styling**: Tailwind CSS + CSS Variables

## Getting Started

```bash
npm install
npm run dev
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
```

## Database Setup

1. Run `schema.sql` in your Supabase SQL Editor to create all tables
2. To reset all data (keep schema), run `reset.sql`

## Deployment

Optimised for Vercel. Connect your repo and set environment variables in the Vercel dashboard.
