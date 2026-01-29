'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, apiCall } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  sessionId: string | null
  loading: boolean
  login: (phoneOrEmail: string, password: string, role: 'student' | 'teacher' | 'admin') => Promise<void>
  logout: () => Promise<void>
  register: (data: RegisterData) => Promise<void>
}

interface RegisterData {
  name: string
  phone: string
  password: string
  grade?: number
  role?: 'student' | 'teacher' | 'admin'
  email?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Проверяем сохраненную сессию при загрузке
    const savedSessionId = localStorage.getItem('sessionId')
    const savedUser = localStorage.getItem('user')

    if (savedSessionId && savedUser) {
      try {
        setSessionId(savedSessionId)
        setUser(JSON.parse(savedUser))
        // Проверяем актуальность сессии
        verifySession(savedSessionId)
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('sessionId')
        localStorage.removeItem('user')
      }
    }
    
    setLoading(false)
  }, [])

  const verifySession = async (sessionId: string) => {
    try {
      const data = await apiCall(`/auth-v2?action=verify&sessionId=${sessionId}`)
      
      if (data.success) {
        setUser(data.user)
        localStorage.setItem('user', JSON.stringify(data.user))
      } else {
        // Сессия недействительна
        logout()
      }
    } catch (error) {
      console.error('Session verification failed:', error)
      logout()
    }
  }

  const login = async (phoneOrEmail: string, password: string, role: 'student' | 'teacher' | 'admin') => {
    try {
      // Определяем, что передано - email или телефон
      const isEmail = phoneOrEmail.includes('@')
      const requestBody = isEmail 
        ? { email: phoneOrEmail, password, role }
        : { phone: phoneOrEmail, password, role }

      const data = await apiCall('/auth-v2?action=login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      })

      if (data.success) {
        setUser(data.user)
        setSessionId(data.sessionId)
        localStorage.setItem('sessionId', data.sessionId)
        localStorage.setItem('user', JSON.stringify(data.user))
      } else {
        throw new Error(data.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      throw error
    }
  }

  const register = async (data: RegisterData) => {
    try {
      const response = await apiCall('/auth-v2?action=register', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      if (!response.success) {
        throw new Error(response.error || 'Registration failed')
      }
    } catch (error) {
      console.error('Registration error:', error)
      throw error
    }
  }

  const logout = async () => {
    try {
      if (sessionId) {
        await apiCall('/auth-v2?action=logout', {
          method: 'POST',
          body: JSON.stringify({ sessionId }),
        })
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      setSessionId(null)
      localStorage.removeItem('sessionId')
      localStorage.removeItem('user')
    }
  }

  const value = {
    user,
    sessionId,
    loading,
    login,
    logout,
    register,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}