export type User = {
  id: string
  email: string
  full_name: string
  avatar_url: string
  college: string
  phone: string
  trust_score: number
  total_transactions: number
  created_at: string
}

export type Listing = {
  id: string
  user_id: string
  title: string
  description: string
  price: number
  category: string
  condition: 'new' | 'like_new' | 'good' | 'fair'
  images: string[]
  is_available: boolean
  created_at: string
  users?: User
}

export type BorrowRequest = {
  id: string
  item_name: string
  description: string
  requester_id: string
  lender_id: string
  listing_id: string
  status: 'pending' | 'accepted' | 'rejected' | 'returned'
  borrow_from: string
  borrow_until: string
  returned_at: string
  created_at: string
  users?: User
}

export type Gig = {
  id: string
  user_id: string
  title: string
  description: string
  category: string
  price: number
  delivery_time: string
  images: string[]
  is_available: boolean
  created_at: string
  users?: User
}

export type Order = {
  id: string
  gig_id: string
  buyer_id: string
  seller_id: string
  amount: number
  status: 'pending' | 'paid' | 'completed' | 'cancelled'
  razorpay_order_id: string
  razorpay_payment_id: string
  created_at: string
}

export type Review = {
  id: string
  reviewer_id: string
  reviewee_id: string
  order_id: string
  rating: number
  comment: string
  created_at: string
}