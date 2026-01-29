'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export default function LoginPage() {
  const [formData, setFormData] = useState({
    phone: '',
    email: '',
    password: '',
    role: 'student' as 'student' | 'teacher' | 'admin'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Для администратора используем email, для остальных - телефон
      const loginField = formData.role === 'admin' ? formData.email : formData.phone
      await login(loginField, formData.password, formData.role)
      
      // Перенаправляем в зависимости от роли
      switch (formData.role) {
        case 'student':
          router.push('/profile')
          break
        case 'teacher':
          router.push('/teacher/dashboard')
          break
        case 'admin':
          router.push('/admin')
          break
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Вход в систему</h2>
            <p className="text-gray-600">Войдите в свой личный кабинет</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Select
                label="Роль"
                name="role"
                value={formData.role}
                onChange={handleChange}
                options={[
                  { value: 'student', label: 'Студент' },
                  { value: 'teacher', label: 'Преподаватель' },
                  { value: 'admin', label: 'Администратор' },
                ]}
              />

              {formData.role === 'admin' ? (
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@example.com"
                  required
                />
              ) : (
                <Input
                  label="Номер телефона"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+7 (777) 123-12-12"
                  required
                />
              )}

              <Input
                label="Пароль"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Введите пароль"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              Войти
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Нет аккаунта?{' '}
                <Link href="/register" className="text-blue-600 hover:underline">
                  Зарегистрироваться
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                <Link href="/" className="text-blue-600 hover:underline">
                  ← Вернуться на главную
                </Link>
              </p>
            </div>
          </form>

          {/* Тестовые данные */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">🧪 Тестовые аккаунты:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Студент:</strong> +77001111111 / 123456</p>
              <p><strong>Преподаватель:</strong> +77002222222 / 123456</p>
              <p><strong>Администратор:</strong> admin@example.com / admin123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}