import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Типы для базы данных
export interface User {
  id: string
  name: string
  phone: string
  email?: string
  role: 'student' | 'teacher' | 'admin'
  grade?: number
  has_trial_lesson: boolean
  created_at: string
}

export interface Teacher {
  id: string
  user_id: string
  bio?: string
  subjects: string[]
  price_per_lesson: number
  is_active: boolean
  created_at: string
}

export interface Lesson {
  id: string
  student_id: string
  teacher_id?: string
  subject: string
  date: string
  time: string
  time_start?: string
  time_end?: string
  type: 'trial' | 'paid'
  status: 'pending' | 'confirmed' | 'completed' | 'canceled'
  meeting_link?: string
  created_at: string
}

export interface Booking {
  id: string
  user_id?: string
  student_name: string
  student_phone: string
  grade?: number
  subject: string
  date: string
  time: string
  contact_method: string
  message?: string
  type: 'trial' | 'paid'
  status: 'pending' | 'confirmed' | 'rejected'
  teacher_id?: string
  zoom_join_url?: string
  created_at: string
}

export interface Payment {
  id: string
  user_id: string
  lesson_id?: string
  amount: number
  currency: string
  provider: string
  status: 'pending' | 'paid' | 'failed'
  external_payment_id?: string
  created_at: string
}

export interface LessonNote {
  id: string
  lesson_id: string
  teacher_comment?: string
  homework?: string
  created_at: string
  updated_at: string
}

// API функции
export const API_BASE_URL = `${supabaseUrl}/functions/v1`

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'apikey': supabaseAnonKey,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}