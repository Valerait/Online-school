'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    grade: '',
    role: 'student' as 'student' | 'teacher' | 'admin'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Валидация
    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов')
      setLoading(false)
      return
    }

    try {
      await register({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        password: formData.password,
        grade: formData.role === 'student' ? parseInt(formData.grade) : undefined,
        role: formData.role
      })

      setSuccess('Регистрация прошла успешно! Теперь вы можете войти в систему.')
      
      // Перенаправляем на страницу входа через 2 секунды
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Ошибка регистрации')
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
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Регистрация</h2>
            <p className="text-gray-600">Создайте свой аккаунт</p>
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

              <Input
                label="Полное имя"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Введите ваше имя"
                required
              />

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
                label="Email (необязательно)"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
              />

              {formData.role === 'student' && (
                <Select
                  label="Класс"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  required
                  options={[
                    { value: '', label: 'Выберите класс' },
                    { value: '5', label: '5 класс' },
                    { value: '6', label: '6 класс' },
                    { value: '7', label: '7 класс' },
                    { value: '8', label: '8 класс' },
                    { value: '9', label: '9 класс' },
                  ]}
                />
              )}

              <Input
                label="Пароль"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Минимум 6 символов"
                required
              />

              <Input
                label="Подтвердите пароль"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Повторите пароль"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {success}
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
            >
              Зарегистрироваться
            </Button>

            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Уже есть аккаунт?{' '}
                <Link href="/login" className="text-blue-600 hover:underline">
                  Войти
                </Link>
              </p>
              <p className="text-sm text-gray-600">
                <Link href="/" className="text-blue-600 hover:underline">
                  ← Вернуться на главную
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}