import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Conteúdo flexível da página do evento (events.content jsonb)
export type EventLineupItem = {
  name: string
  genre?: string
  /** headliner = destaque | host = anfitrião | support = demais | dj = discotecagem */
  tier?: 'headliner' | 'host' | 'support' | 'dj'
  tagline?: string
}

export type EventContent = {
  subtitle?: string
  opening_notice?: string
  about_html?: string
  lineup?: EventLineupItem[]
  seo_keywords?: string[]
}

export type Event = {
  id: string
  title: string
  slug: string
  description: string
  banner_url: string | null
  og_image_url: string | null
  content: EventContent
  organization_id: string | null
  event_date: string
  event_time: string
  doors_open_time: string
  venue_name: string
  venue_address: string
  venue_neighborhood: string
  venue_city: string
  venue_state: string
  venue_zip: string
  venue_lat: number | null
  venue_lng: number | null
  age_rating: string
  age_rating_notes: string
  service_fee_percent: number
  max_tickets_per_cpf: number
  whatsapp_number: string
  status: string
  additional_info: string
  created_at: string
}

export type TicketBatch = {
  id: string
  event_id: string
  name: string
  description: string | null
  price: number
  quantity: number
  sold_count: number
  sort_order: number
  starts_at: string | null
  ends_at: string | null
  status: string
  is_visible: boolean
  min_per_order: number
  max_per_order: number
}

export type Profile = {
  id: string
  full_name: string
  cpf: string
  phone: string
  email: string
  role: string
}

export type Order = {
  id: string
  order_number: number
  event_id: string
  customer_id: string
  affiliate_code: string | null
  coupon_id: string | null
  subtotal: number
  service_fee: number
  discount: number
  total: number
  payment_method: string
  payment_status: string
  payment_gateway_id: string | null
  paid_at: string | null
  created_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  ticket_batch_id: string
  attendee_name: string
  attendee_cpf: string
  unit_price: number
  qr_code_token: string
  status: string
  checked_in_at: string | null
}

export type Affiliate = {
  id: string
  event_id: string
  code: string
  name: string
  email: string | null
  phone: string | null
  commission_percent: number
  visits: number
  is_active: boolean
}

export type Coupon = {
  id: string
  event_id: string
  code: string
  coupon_type: 'discount_percent' | 'discount_fixed' | 'free_fee'
  discount_value: number | null
  max_uses: number | null
  used_count: number
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
}
