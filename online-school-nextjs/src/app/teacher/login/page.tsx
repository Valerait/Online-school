'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function TeacherLoginPage() {
  const [formData, setFormData] = useState({
    phone: '+77002222222',
    password: '123456'
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
      await login(formData.phone, formData.password, 'teacher')
      router.push('/teacher/dashboard')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 px-6 rounded-full inline-block mb-4">
              👩‍🏫 Личный кабинет преподавателя
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Вход в систему</h2>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <Input
                label="Номер телефона"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+7 (777) 123-12-12"
                required
              />

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
              className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              Войти
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                <Link href="/login" className="text-blue-600 hover:underline">
                  Вход для учеников
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
            <h4 className="text-sm font-medium text-gray-700 mb-2">🧪 Тестовые данные:</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Email:</strong> teacher@example.com</p>
              <p><strong>Телефон:</strong> +77002222222</p>
              <p><strong>Пароль:</strong> 123456</p>
              <p><strong>Предметы:</strong> Математика, Физика</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}