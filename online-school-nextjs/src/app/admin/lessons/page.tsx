'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { apiCall } from '@/lib/supabase'
import { getSubjectName, getStatusText, formatDate } from '@/lib/utils'

interface Lesson {
  id: string
  subject: string
  date: string
  time: string
  type: 'trial' | 'paid'
  status: string
  meeting_link?: string
  student: {
    name: string
    phone: string
  }
  teacher: {
    name: string
    phone: string
  }
  lesson_notes?: {
    teacher_comment?: string
    homework?: string
  }[]
}

interface Booking {
  id: string
  subject: string
  date: string
  time: string
  type: 'trial' | 'paid'
  status: string
  user: {
    name: string
    phone: string
  }
  teacher?: {
    name: string
  }
}

export default function AdminLessonsPage() {
  const { user, sessionId } = useAuth()
  const router = useRouter()
  
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredLessons, setFilteredLessons] = useState<Lesson[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'lessons' | 'bookings'>('lessons')
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    subject: 'all'
  })

  useEffect(() => {
    if (!user || !sessionId) {
      router.push('/login')
      return
    }

    if (user.role !== 'admin') {
      router.push('/')
      return
    }

    loadData()
  }, [user, sessionId, router])

  useEffect(() => {
    filterData()
  }, [lessons, bookings, filters, activeTab])

  const loadData = async () => {
    setLoading(true)
    try {
      const [lessonsData, bookingsData] = await Promise.all([
        apiCall(`/admin?action=lessons&sessionId=${sessionId}`),
        apiCall(`/admin?action=bookings&sessionId=${sessionId}`)
      ])
      
      if (lessonsData.success) {
        setLessons(lessonsData.lessons || [])
      }
      
      if (bookingsData.success) {
        setBookings(bookingsData.bookings || [])
      }
      
      if (!lessonsData.success || !bookingsData.success) {
        setError('Ошибка загрузки данных')
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const filterData = () => {
    if (activeTab === 'lessons') {
      let filtered = lessons

      if (filters.search) {
        filtered = filtered.filter(lesson => 
          lesson.student.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          lesson.teacher.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          lesson.subject.toLowerCase().includes(filters.search.toLowerCase())
        )
      }

      if (filters.status !== 'all') {
        filtered = filtered.filter(lesson => lesson.status === filters.status)
      }

      if (filters.type !== 'all') {
        filtered = filtered.filter(lesson => lesson.type === filters.type)
      }

      if (filters.subject !== 'all') {
        filtered = filtered.filter(lesson => lesson.subject === filters.subject)
      }

      setFilteredLessons(filtered)
    } else {
      let filtered = bookings

      if (filters.search) {
        filtered = filtered.filter(booking => 
          booking.user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
          booking.subject.toLowerCase().includes(filters.search.toLowerCase())
        )
      }

      if (filters.status !== 'all') {
        filtered = filtered.filter(booking => booking.status === filters.status)
      }

      if (filters.type !== 'all') {
        filtered = filtered.filter(booking => booking.type === filters.type)
      }

      if (filters.subject !== 'all') {
        filtered = filtered.filter(booking => booking.subject === filters.subject)
      }

      setFilteredBookings(filtered)
    }
  }

  const updateLessonStatus = async (lessonId: string, newStatus: string) => {
    try {
      const data = await apiCall(`/admin?action=update-lesson-status&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ lessonId, status: newStatus })
      })

      if (data.success) {
        loadData()
      } else {
        setError(data.error || 'Ошибка обновления статуса')
      }
    } catch (error) {
      console.error('Error updating lesson status:', error)
      setError('Ошибка обновления статуса')
    }
  }

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const data = await apiCall(`/admin?action=update-booking-status&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ bookingId, status: newStatus })
      })

      if (data.success) {
        loadData()
      } else {
        setError(data.error || 'Ошибка обновления статуса')
      }
    } catch (error) {
      console.error('Error updating booking status:', error)
      setError('Ошибка обновления статуса')
    }
  }

  const deleteLesson = async (lessonId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот урок?')) {
      return
    }

    try {
      const data = await apiCall(`/admin?action=delete-lesson&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ lessonId })
      })

      if (data.success) {
        loadData()
      } else {
        setError(data.error || 'Ошибка удаления урока')
      }
    } catch (error) {
      console.error('Error deleting lesson:', error)
      setError('Ошибка удаления урока')
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'in_progress': return 'bg-orange-100 text-orange-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'canceled': return 'bg-red-100 text-red-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeBadgeColor = (type: string) => {
    return type === 'trial' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Загрузка данных...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                📚 Управление уроками
              </h1>
              <p className="text-purple-100 mt-1">
                Уроков: {lessons.length} | Заявок: {bookings.length}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push('/admin')}
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-purple-600"
              >
                ← Назад в админку
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Табы */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('lessons')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'lessons'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Уроки ({lessons.length})
              </button>
              <button
                onClick={() => setActiveTab('bookings')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'bookings'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Заявки ({bookings.length})
              </button>
            </nav>
          </div>

          {/* Фильтры */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input
                placeholder="Поиск..."
                value={filters.search}
                onChange={(e) => setFilters({...filters, search: e.target.value})}
              />
              
              <Select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
                options={[
                  { value: 'all', label: 'Все статусы' },
                  { value: 'pending', label: 'Ожидает' },
                  { value: 'confirmed', label: 'Подтвержден' },
                  { value: 'in_progress', label: 'В процессе' },
                  { value: 'completed', label: 'Завершен' },
                  { value: 'canceled', label: 'Отменен' },
                  { value: 'rejected', label: 'Отклонен' }
                ]}
              />
              
              <Select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
                options={[
                  { value: 'all', label: 'Все типы' },
                  { value: 'trial', label: 'Пробные' },
                  { value: 'paid', label: 'Платные' }
                ]}
              />
              
              <Select
                value={filters.subject}
                onChange={(e) => setFilters({...filters, subject: e.target.value})}
                options={[
                  { value: 'all', label: 'Все предметы' },
                  { value: 'math', label: 'Математика' },
                  { value: 'physics', label: 'Физика' },
                  { value: 'chemistry', label: 'Химия' },
                  { value: 'russian', label: 'Русский язык' },
                  { value: 'english', label: 'Английский язык' }
                ]}
              />
            </div>
          </div>
        </div>

        {/* Таблица уроков */}
        {activeTab === 'lessons' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Урок
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Студент
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Преподаватель
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата и время
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
                  {filteredLessons.map((lesson) => (
                    <tr key={lesson.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getSubjectName(lesson.subject)}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeColor(lesson.type)}`}>
                              {lesson.type === 'trial' ? 'Пробный' : 'Платный'}
                            </span>
                            {lesson.meeting_link && (
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                Jitsi
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{lesson.student.name}</div>
                        <div className="text-sm text-gray-500">{lesson.student.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{lesson.teacher.name}</div>
                        <div className="text-sm text-gray-500">{lesson.teacher.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(lesson.date)}</div>
                        <div className="text-sm text-gray-500">{lesson.time}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(lesson.status)}`}>
                          {getStatusText(lesson.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Select
                            value={lesson.status}
                            onChange={(e) => updateLessonStatus(lesson.id, e.target.value)}
                            options={[
                              { value: 'pending', label: 'Ожидает' },
                              { value: 'confirmed', label: 'Подтвержден' },
                              { value: 'in_progress', label: 'В процессе' },
                              { value: 'completed', label: 'Завершен' },
                              { value: 'canceled', label: 'Отменен' }
                            ]}
                            className="text-xs"
                          />
                          {lesson.meeting_link && (
                            <Button
                              size="sm"
                              onClick={() => router.push(`/lesson/${lesson.id}`)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Урок
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteLesson(lesson.id)}
                          >
                            Удалить
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Таблица заявок */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Заявка
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Студент
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Преподаватель
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Дата и время
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
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {getSubjectName(booking.subject)}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeColor(booking.type)} mt-1`}>
                            {booking.type === 'trial' ? 'Пробный' : 'Платный'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{booking.user.name}</div>
                        <div className="text-sm text-gray-500">{booking.user.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {booking.teacher?.name || 'Не назначен'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(booking.date)}</div>
                        <div className="text-sm text-gray-500">{booking.time}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(booking.status)}`}>
                          {getStatusText(booking.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Select
                            value={booking.status}
                            onChange={(e) => updateBookingStatus(booking.id, e.target.value)}
                            options={[
                              { value: 'pending', label: 'Ожидает' },
                              { value: 'confirmed', label: 'Подтвержден' },
                              { value: 'rejected', label: 'Отклонен' }
                            ]}
                            className="text-xs"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {((activeTab === 'lessons' && filteredLessons.length === 0) || 
          (activeTab === 'bookings' && filteredBookings.length === 0)) && (
          <div className="text-center py-8 text-gray-500">
            {activeTab === 'lessons' ? 'Уроки не найдены' : 'Заявки не найдены'}
          </div>
        )}
      </div>
    </div>
  )
}