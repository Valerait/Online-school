'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { apiCall } from '@/lib/supabase'

interface Teacher {
  id: string
  user_id: string
  name: string
  phone: string
  email: string
  bio: string
  subjects: string[]
  price_per_lesson: number
  is_active: boolean
  created_at: string
}

export default function AdminTeachersPage() {
  const { user, sessionId } = useAuth()
  const router = useRouter()
  
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createdTeacher, setCreatedTeacher] = useState<{phone: string, password: string} | null>(null)

  // Форма создания преподавателя
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    bio: '',
    subjects: [] as string[],
    price_per_lesson: 7000
  })

  const availableSubjects = [
    'Математика',
    'Физика', 
    'Химия',
    'Биология',
    'История',
    'География',
    'Литература',
    'Русский язык',
    'Английский язык',
    'Информатика',
    'Экономика',
    'Обществознание'
  ]

  useEffect(() => {
    if (!user || !sessionId) {
      router.push('/login')
      return
    }

    if (user.role !== 'admin') {
      router.push('/')
      return
    }

    loadTeachers()
  }, [user, sessionId, router])

  const loadTeachers = async () => {
    setLoading(true)
    try {
      const data = await apiCall(`/admin?action=teachers&sessionId=${sessionId}`)
      
      if (data.success) {
        setTeachers(data.teachers || [])
      } else {
        setError(data.error || 'Ошибка загрузки преподавателей')
      }
    } catch (error) {
      console.error('Error loading teachers:', error)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const handleCreateTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      // Генерируем пароль
      const password = generatePassword()

      const response = await apiCall('/admin', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create_teacher',
          sessionId,
          ...formData,
          password
        })
      })

      if (response.success) {
        setCreatedTeacher({ phone: formData.phone, password })
        setFormData({
          name: '',
          phone: '',
          email: '',
          bio: '',
          subjects: [],
          price_per_lesson: 7000
        })
        setShowCreateForm(false)
        loadTeachers()
      } else {
        setError(response.error || 'Ошибка создания преподавателя')
      }
    } catch (error) {
      console.error('Error creating teacher:', error)
      setError('Ошибка создания преподавателя')
    } finally {
      setCreating(false)
    }
  }

  const toggleTeacherStatus = async (teacherId: string, isActive: boolean) => {
    try {
      const response = await apiCall('/admin', {
        method: 'POST',
        body: JSON.stringify({
          action: 'update_teacher_status',
          sessionId,
          teacherId,
          isActive: !isActive
        })
      })

      if (response.success) {
        loadTeachers()
      } else {
        setError(response.error || 'Ошибка обновления статуса')
      }
    } catch (error) {
      console.error('Error updating teacher status:', error)
      setError('Ошибка обновления статуса')
    }
  }

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Загрузка преподавателей...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                👨‍🏫 Управление преподавателями
              </h1>
              <p className="text-orange-100 mt-1">Создание и управление преподавателями</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => router.push('/admin')}
                className="text-white border-white hover:bg-white hover:text-orange-600"
              >
                ← Назад в админку
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Уведомление о созданном преподавателе */}
        {createdTeacher && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded mb-6">
            <h3 className="font-bold mb-2">✅ Преподаватель успешно создан!</h3>
            <div className="bg-white p-4 rounded border">
              <p><strong>Телефон для входа:</strong> {createdTeacher.phone}</p>
              <p><strong>Пароль:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{createdTeacher.password}</code></p>
              <p className="text-sm text-gray-600 mt-2">
                Сохраните эти данные и передайте преподавателю. Пароль больше не будет показан.
              </p>
            </div>
            <Button 
              onClick={() => setCreatedTeacher(null)}
              className="mt-3 bg-green-600 hover:bg-green-700"
            >
              Понятно
            </Button>
          </div>
        )}

        {/* Кнопка создания */}
        <div className="mb-6">
          <Button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {showCreateForm ? '❌ Отменить' : '➕ Создать преподавателя'}
          </Button>
        </div>

        {/* Форма создания преподавателя */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Создание нового преподавателя</h2>
            
            <form onSubmit={handleCreateTeacher} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Имя преподавателя *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Анна Петровна"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Телефон *
                  </label>
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+7 777 123-45-67"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="teacher@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Стоимость урока (₸)
                  </label>
                  <Input
                    type="number"
                    value={formData.price_per_lesson}
                    onChange={(e) => setFormData(prev => ({ ...prev, price_per_lesson: parseInt(e.target.value) || 7000 }))}
                    min="1000"
                    step="500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Биография
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Опытный преподаватель с 10-летним стажем..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Предметы * (выберите один или несколько)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {availableSubjects.map(subject => (
                    <label key={subject} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.subjects.includes(subject)}
                        onChange={() => handleSubjectToggle(subject)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm">{subject}</span>
                    </label>
                  ))}
                </div>
                {formData.subjects.length === 0 && (
                  <p className="text-red-500 text-sm mt-1">Выберите хотя бы один предмет</p>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  type="submit"
                  disabled={creating || formData.subjects.length === 0 || !formData.name || !formData.phone}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {creating ? 'Создание...' : 'Создать преподавателя'}
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Отмена
                </Button>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Важно:</strong> Пароль будет сгенерирован автоматически и показан только один раз после создания. 
                  Обязательно сохраните его и передайте преподавателю.
                </p>
              </div>
            </form>
          </div>
        )}

        {/* Список преподавателей */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Список преподавателей ({teachers.length})</h2>
          </div>

          {teachers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <p>Преподавателей пока нет</p>
              <p className="text-sm">Создайте первого преподавателя</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Преподаватель
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Контакты
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Предметы
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Стоимость
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {teachers.map((teacher) => (
                    <tr key={teacher.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                          <div className="text-sm text-gray-500">{teacher.bio}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{teacher.phone}</div>
                        <div className="text-sm text-gray-500">{teacher.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects.map((subject) => (
                            <span
                              key={subject}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                            >
                              {subject}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {teacher.price_per_lesson.toLocaleString()}₸
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          teacher.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {teacher.is_active ? '✅ Активен' : '❌ Неактивен'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button
                          onClick={() => toggleTeacherStatus(teacher.id, teacher.is_active)}
                          variant="outline"
                          className={teacher.is_active ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                        >
                          {teacher.is_active ? 'Деактивировать' : 'Активировать'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}