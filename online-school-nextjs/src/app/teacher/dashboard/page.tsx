'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { apiCall } from '@/lib/supabase'
import { getSubjectName, getStatusText, formatDate } from '@/lib/utils'

interface TeacherData {
  id: string
  name: string
  email: string
  subjects: string[]
  phone: string
  bio?: string
  price_per_lesson: number
}

interface Stats {
  pendingBookings: number
  todayLessons: number
  totalLessons: number
}

interface Booking {
  id: string
  student_name: string
  student_phone: string
  subject: string
  date: string
  time: string
  type: 'trial' | 'paid'
  status: string
  users?: {
    name: string
    phone: string
  }
}

interface Lesson {
  id: string
  subject: string
  date: string
  time: string
  type: 'trial' | 'paid'
  status: string
  meeting_link?: string
  users?: {
    name: string
    phone: string
  }
}

export default function TeacherDashboardPage() {
  const { user, sessionId, logout } = useAuth()
  const router = useRouter()
  
  const [teacher, setTeacher] = useState<TeacherData | null>(null)
  const [stats, setStats] = useState<Stats>({
    pendingBookings: 0,
    todayLessons: 0,
    totalLessons: 0
  })
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([])
  const [todayLessons, setTodayLessons] = useState<Lesson[]>([])
  const [allLessons, setAllLessons] = useState<Lesson[]>([])
  
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!user || !sessionId) {
      router.push('/teacher/login')
      return
    }

    if (user.role !== 'teacher') {
      router.push('/teacher/login')
      return
    }

    loadDashboard()
  }, [user, sessionId, router])

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const data = await apiCall(`/teacher-dashboard-v2?sessionId=${sessionId}`)
      
      if (data.success) {
        setTeacher(data.teacher)
        setStats(data.stats)
        setPendingBookings(data.pendingBookings || [])
        setTodayLessons(data.todayLessons || [])
        
        // Загружаем все уроки
        await loadAllLessons()
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
      setMessage(`Ошибка загрузки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setLoading(false)
    }
  }

  const loadAllLessons = async () => {
    try {
      const data = await apiCall(`/teacher-dashboard-v2?action=lessons&sessionId=${sessionId}`)
      
      if (data.success) {
        setAllLessons(data.lessons || [])
      }
    } catch (error) {
      console.error('Error loading lessons:', error)
    }
  }

  const acceptBooking = async (bookingId: string) => {
    try {
      const data = await apiCall(`/teacher-dashboard-v2?action=accept-booking&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          bookingId
        })
      })

      if (data.success) {
        setMessage('Заявка принята и урок создан!')
        loadDashboard()
      }
    } catch (error) {
      setMessage(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  const rejectBooking = async (bookingId: string) => {
    const reason = prompt('Причина отклонения (необязательно):')
    
    try {
      const data = await apiCall(`/teacher-dashboard-v2?action=reject-booking&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          bookingId,
          reason
        })
      })

      if (data.success) {
        setMessage('Заявка отклонена')
        loadDashboard()
      }
    } catch (error) {
      setMessage(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  const startLesson = async (lessonId: string) => {
    try {
      const data = await apiCall(`/teacher-dashboard-v2?action=start-lesson&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ lessonId })
      })

      if (data.success) {
        setMessage('Урок начат!')
        loadDashboard()
      }
    } catch (error) {
      setMessage(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  const completeLesson = async (lessonId: string) => {
    const teacherComment = prompt('Комментарий о уроке (необязательно):')
    const homework = prompt('Домашнее задание (необязательно):')
    
    try {
      const data = await apiCall(`/teacher-dashboard-v2?action=complete-lesson&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          lessonId,
          teacherComment,
          homework
        })
      })

      if (data.success) {
        setMessage('Урок завершен!')
        loadDashboard()
      }
    } catch (error) {
      setMessage(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p>Загрузка дашборда...</p>
        </div>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Ошибка загрузки данных преподавателя</p>
          <Button onClick={() => router.push('/teacher/login')} className="mt-4">
            Вернуться к входу
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                👩‍🏫 {teacher.name}
              </h1>
              <p className="text-orange-100 mt-1">{teacher.email}</p>
              <p className="text-orange-100">{teacher.subjects.map(getSubjectName).join(', ')}</p>
            </div>
            <Button variant="outline" onClick={logout} className="text-white border-white hover:bg-white hover:text-orange-600">
              Выйти
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-orange-600">{stats.pendingBookings}</div>
            <div className="text-gray-600">Новые заявки</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.todayLessons}</div>
            <div className="text-gray-600">Уроки сегодня</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <div className="text-3xl font-bold text-green-600">{stats.totalLessons}</div>
            <div className="text-gray-600">Всего уроков</div>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg mb-6 ${
            message.includes('Ошибка') 
              ? 'bg-red-50 text-red-800 border border-red-200' 
              : 'bg-green-50 text-green-800 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Новые заявки */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              📋 Новые заявки
            </h2>
            
            <div className="space-y-4">
              {pendingBookings.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Нет новых заявок</p>
              ) : (
                pendingBookings.map((booking) => (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-4 hover:border-orange-300 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-medium">
                          {getSubjectName(booking.subject)} - {booking.type === 'trial' ? 'Пробный урок' : 'Платный урок'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          <strong>Ученик:</strong> {booking.users?.name || booking.student_name}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Телефон:</strong> {booking.users?.phone || booking.student_phone}
                        </p>
                        <p className="text-sm text-gray-600">
                          <strong>Дата:</strong> {formatDate(booking.date)} в {booking.time}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                        {getStatusText(booking.status)}
                      </span>
                    </div>
                    
                    {booking.status === 'pending' && (
                      <div className="space-y-2">
                        <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                          💡 При принятии заявки автоматически создается комната для видеоурока
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => acceptBooking(booking.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Принять
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectBooking(booking.id)}
                          >
                            Отклонить
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Уроки на сегодня */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              📅 Уроки на сегодня
            </h2>
            
            <div className="space-y-4">
              {todayLessons.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Нет уроков на сегодня</p>
              ) : (
                todayLessons.map((lesson) => (
                  <div key={lesson.id} className={`border rounded-lg p-4 ${
                    lesson.status === 'scheduled' ? 'border-green-200 bg-green-50' :
                    lesson.status === 'in_progress' ? 'border-orange-200 bg-orange-50' :
                    'border-gray-200'
                  }`}>
                    <h4 className="font-medium">
                      {getSubjectName(lesson.subject)} - {lesson.time}
                    </h4>
                    <p className="text-sm text-gray-600">
                      <strong>Статус:</strong> {getStatusText(lesson.status)}
                    </p>
                    
                    <div className="mt-3 space-y-2">
                      {lesson.meeting_link && (
                        <Button
                          size="sm"
                          onClick={() => router.push(`/lesson/${lesson.id}`)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          🎥 Начать видеоурок
                        </Button>
                      )}
                      
                      <div className="flex gap-2">
                        {lesson.status === 'scheduled' && (
                          <Button
                            size="sm"
                            onClick={() => startLesson(lesson.id)}
                            className="bg-orange-600 hover:bg-orange-700"
                          >
                            Начать урок
                          </Button>
                        )}
                        {lesson.status === 'in_progress' && (
                          <Button
                            size="sm"
                            onClick={() => completeLesson(lesson.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Завершить урок
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Все уроки */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            📚 Все мои уроки
          </h2>
          
          <div className="space-y-4">
            {allLessons.length === 0 ? (
              <p className="text-gray-500 text-center py-4">У вас пока нет уроков</p>
            ) : (
              allLessons.map((lesson) => (
                <div key={lesson.id} className={`border rounded-lg p-4 ${
                  lesson.status === 'scheduled' ? 'border-blue-200' :
                  lesson.status === 'in_progress' ? 'border-orange-200' :
                  lesson.status === 'completed' ? 'border-green-200' :
                  'border-gray-200'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">
                        {getSubjectName(lesson.subject)} - {formatDate(lesson.date)} в {lesson.time}
                      </h4>
                      <p className="text-sm text-gray-600">
                        <strong>Ученик:</strong> {lesson.users?.name || 'Неизвестно'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Тип:</strong> {lesson.type === 'trial' ? 'Пробный урок' : 'Платный урок'}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lesson.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      lesson.status === 'in_progress' ? 'bg-orange-100 text-orange-800' :
                      lesson.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusText(lesson.status)}
                    </span>
                  </div>
                  
                  {lesson.meeting_link && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        onClick={() => router.push(`/lesson/${lesson.id}`)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        🎥 Начать видеоурок
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}