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
}

interface Booking {
  id: string
  subject: string
  date: string
  time: string
  type: 'trial' | 'paid'
  status: string
  meeting_link?: string
}

export default function ProfilePage() {
  const { user, sessionId, logout } = useAuth()
  const router = useRouter()
  
  const [bookings, setBookings] = useState<Booking[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [stats, setStats] = useState({
    totalLessons: 0,
    completedLessons: 0,
    upcomingLessons: 0
  })
  
  const [bookingForm, setBookingForm] = useState({
    subject: '',
    date: '',
    time: ''
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [loadingTimes, setLoadingTimes] = useState(false)

  useEffect(() => {
    if (!user || !sessionId) {
      router.push('/login')
      return
    }

    if (user.role !== 'student') {
      router.push('/login')
      return
    }

    loadProfile()
  }, [user, sessionId, router])

  useEffect(() => {
    if (bookingForm.date && bookingForm.subject) {
      loadAvailableTimes()
    }
  }, [bookingForm.date, bookingForm.subject])

  const loadProfile = async () => {
    try {
      const data = await apiCall(`/profile?sessionId=${sessionId}`)
      
      if (data.success) {
        setStats(data.stats || stats)
        setBookings(data.bookings || [])
        setLessons(data.lessons || [])
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const loadAvailableTimes = async () => {
    setLoadingTimes(true)
    try {
      const params = new URLSearchParams({
        action: 'available-times',
        date: bookingForm.date
      })
      
      if (bookingForm.subject) {
        params.append('subject', bookingForm.subject)
      }

      const data = await apiCall(`/schedule?${params}`)
      
      if (data.success) {
        setAvailableTimes(data.availableTimes || [])
      }
    } catch (error) {
      console.error('Error loading available times:', error)
      // Fallback времена
      setAvailableTimes(['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'])
    } finally {
      setLoadingTimes(false)
    }
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const type = user?.has_trial_lesson ? 'paid' : 'trial'
      
      const data = await apiCall(`/profile?action=book-lesson&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          subject: bookingForm.subject,
          date: bookingForm.date,
          time: bookingForm.time,
          type
        })
      })

      if (data.success) {
        setMessage('Заявка на урок успешно отправлена! Мы свяжемся с вами для подтверждения.')
        setBookingForm({ subject: '', date: '', time: '' })
        loadProfile()
      }
    } catch (error) {
      setMessage(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleBookingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setBookingForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // Устанавливаем минимальную дату (завтра)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Личный кабинет</h1>
              <p className="text-blue-100 mt-1">{user.name}</p>
              <p className="text-blue-100">{user.phone} • {user.grade} класс</p>
            </div>
            <Button variant="outline" onClick={logout} className="text-white border-white hover:bg-white hover:text-blue-600">
              Выйти
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Статистика */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl font-bold text-blue-600">{stats.totalLessons}</div>
                <div className="text-gray-600">Всего уроков</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl font-bold text-green-600">{stats.completedLessons}</div>
                <div className="text-gray-600">Завершено</div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-3xl font-bold text-orange-600">{stats.upcomingLessons}</div>
                <div className="text-gray-600">Предстоящих</div>
              </div>
            </div>
          </div>

          {/* Запись на урок */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Записаться на урок</h2>
              
              {!user.has_trial_lesson && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg mb-4">
                  <strong>Пробный урок бесплатно!</strong><br />
                  Запишитесь на бесплатный пробный урок, чтобы познакомиться с преподавателем.
                </div>
              )}

              {user.has_trial_lesson && (
                <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-lg mb-4">
                  <strong>Платные уроки</strong><br />
                  Вы уже прошли пробный урок. Теперь можете записаться на платные занятия.
                </div>
              )}

              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <Select
                  label="Предмет"
                  name="subject"
                  value={bookingForm.subject}
                  onChange={handleBookingChange}
                  required
                  options={[
                    { value: '', label: 'Выберите предмет' },
                    { value: 'math', label: 'Математика' },
                    { value: 'physics', label: 'Физика' },
                    { value: 'chemistry', label: 'Химия' },
                    { value: 'russian', label: 'Русский язык' },
                    { value: 'english', label: 'Английский язык' },
                  ]}
                />

                <Input
                  label="Дата"
                  name="date"
                  type="date"
                  value={bookingForm.date}
                  onChange={handleBookingChange}
                  min={minDate}
                  required
                />

                <div>
                  <Select
                    label="Время"
                    name="time"
                    value={bookingForm.time}
                    onChange={handleBookingChange}
                    required
                    disabled={!bookingForm.date || loadingTimes}
                    options={[
                      { value: '', label: loadingTimes ? 'Загрузка...' : 'Выберите время' },
                      ...availableTimes.map(time => ({ value: time, label: time }))
                    ]}
                  />
                  {loadingTimes && (
                    <p className="text-sm text-gray-500 mt-1">Загрузка доступного времени...</p>
                  )}
                  {!loadingTimes && availableTimes.length === 0 && bookingForm.date && (
                    <p className="text-sm text-red-500 mt-1">На выбранную дату нет свободного времени</p>
                  )}
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  className="w-full"
                >
                  {user.has_trial_lesson ? 'Записаться на платный урок' : 'Записаться на пробный урок'}
                </Button>

                {message && (
                  <div className={`p-4 rounded-lg text-sm ${
                    message.includes('Ошибка') 
                      ? 'bg-red-50 text-red-800 border border-red-200' 
                      : 'bg-green-50 text-green-800 border border-green-200'
                  }`}>
                    {message}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Мои уроки */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Мои уроки</h2>
              
              <div className="space-y-4">
                {/* Заявки */}
                {bookings.map((booking) => (
                  <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">
                          {getSubjectName(booking.subject)} ({booking.type === 'trial' ? 'Пробный урок' : 'Платный урок'})
                        </h4>
                        <p className="text-gray-600 text-sm">
                          {formatDate(booking.date)} в {booking.time}
                        </p>
                        {booking.meeting_link && (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/lesson/${booking.id}`)}
                            className="bg-blue-600 hover:bg-blue-700 mt-2"
                          >
                            🎥 Присоединиться к уроку
                          </Button>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {getStatusText(booking.status)}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Уроки */}
                {lessons.map((lesson) => (
                  <div key={lesson.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium">
                          {getSubjectName(lesson.subject)} ({lesson.type === 'trial' ? 'Пробный урок' : 'Платный урок'})
                        </h4>
                        <p className="text-gray-600 text-sm">
                          {formatDate(lesson.date)} в {lesson.time}
                        </p>
                        {lesson.meeting_link && (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/lesson/${lesson.id}`)}
                            className="bg-blue-600 hover:bg-blue-700 mt-2"
                          >
                            🎥 Присоединиться к уроку
                          </Button>
                        )}
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
                  </div>
                ))}

                {bookings.length === 0 && lessons.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    У вас пока нет записей на уроки
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}