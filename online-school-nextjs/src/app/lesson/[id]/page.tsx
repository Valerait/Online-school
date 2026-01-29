'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { JitsiMeeting } from '@/components/JitsiMeeting'
import { Button } from '@/components/ui/Button'
import { apiCall } from '@/lib/supabase'
import { getSubjectName, formatDate } from '@/lib/utils'

interface LessonData {
  id: string
  subject: string
  date: string
  time: string
  type: 'trial' | 'paid'
  status: string
  meeting_link: string
  student_id: string
  teacher_id: string
  student?: {
    name: string
    phone: string
  }
  teacher?: {
    name: string
    phone: string
  }
}

export default function LessonPage() {
  const { user, sessionId } = useAuth()
  const router = useRouter()
  const params = useParams()
  const lessonId = params.id as string
  
  const [lesson, setLesson] = useState<LessonData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [meetingStarted, setMeetingStarted] = useState(false)

  useEffect(() => {
    if (!user || !sessionId) {
      router.push('/login')
      return
    }

    loadLesson()
  }, [user, sessionId, lessonId, router])

  const loadLesson = async () => {
    setLoading(true)
    try {
      // Получаем данные урока
      const data = await apiCall(`/lesson?lessonId=${lessonId}&sessionId=${sessionId}`)
      
      if (data.success) {
        setLesson(data.lesson)
        
        // Проверяем права доступа
        const hasAccess = user?.role === 'teacher' 
          ? data.lesson.teacher_id === user?.id
          : data.lesson.student_id === user?.id

        if (!hasAccess) {
          setError('У вас нет доступа к этому уроку')
          return
        }

        // Проверяем время урока (доступ только в день урока)
        const lessonDate = new Date(data.lesson.date)
        const today = new Date()
        const isToday = lessonDate.toDateString() === today.toDateString()
        
        if (!isToday && user?.role !== 'teacher') {
          setError('Урок доступен только в день проведения')
          return
        }

      } else {
        setError(data.error || 'Урок не найден')
      }
    } catch (error) {
      console.error('Error loading lesson:', error)
      setError('Ошибка загрузки урока')
    } finally {
      setLoading(false)
    }
  }

  const handleMeetingStart = () => {
    setMeetingStarted(true)
    
    // Если это преподаватель, обновляем статус урока на "в процессе"
    if (user?.role === 'teacher') {
      updateLessonStatus('in_progress')
    }
  }

  const handleMeetingEnd = () => {
    setMeetingStarted(false)
    
    // Если это преподаватель, можем предложить завершить урок
    if (user?.role === 'teacher') {
      const shouldComplete = confirm('Завершить урок? Вы сможете добавить комментарий и домашнее задание.')
      if (shouldComplete) {
        router.push('/teacher/dashboard')
      }
    } else {
      // Для студентов просто возвращаемся в профиль
      router.push('/profile')
    }
  }

  const updateLessonStatus = async (status: string) => {
    try {
      await apiCall(`/teacher-dashboard-v2?action=start-lesson&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ lessonId })
      })
    } catch (error) {
      console.error('Error updating lesson status:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка урока...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-semibold">Ошибка доступа</h2>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          <Button onClick={() => router.back()}>
            Вернуться назад
          </Button>
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Урок не найден</p>
          <Button onClick={() => router.back()} className="mt-4">
            Вернуться назад
          </Button>
        </div>
      </div>
    )
  }

  const displayName = user?.role === 'teacher' 
    ? `Преподаватель ${user?.name || 'Неизвестно'}`
    : `Ученик ${user?.name || 'Неизвестно'}`

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header с информацией об уроке */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">
                {getSubjectName(lesson.subject)} - {lesson.type === 'trial' ? 'Пробный урок' : 'Платный урок'}
              </h1>
              <p className="text-blue-100 mt-1">
                {formatDate(lesson.date)} в {lesson.time}
              </p>
              <p className="text-blue-100 text-sm">
                {user?.role === 'teacher' 
                  ? `Ученик: ${lesson.student?.name || 'Неизвестно'}`
                  : `Преподаватель: ${lesson.teacher?.name || 'Неизвестно'}`
                }
              </p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.back()}
              className="text-white border-white hover:bg-white hover:text-blue-600"
            >
              Назад
            </Button>
          </div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!meetingStarted ? (
          /* Экран ожидания */
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Готовы к уроку?</h2>
              <p className="text-gray-600">
                Нажмите кнопку ниже, чтобы присоединиться к видеоуроку
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Предмет:</strong> {getSubjectName(lesson.subject)}
                </div>
                <div>
                  <strong>Дата:</strong> {formatDate(lesson.date)}
                </div>
                <div>
                  <strong>Время:</strong> {lesson.time}
                </div>
                <div>
                  <strong>Тип:</strong> {lesson.type === 'trial' ? 'Пробный урок' : 'Платный урок'}
                </div>
              </div>
            </div>

            <Button
              onClick={handleMeetingStart}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              🎥 Присоединиться к уроку
            </Button>

            <div className="mt-6 text-sm text-gray-500">
              <p>💡 Убедитесь, что у вас есть доступ к камере и микрофону</p>
              <p>🔊 Рекомендуем использовать наушники для лучшего качества звука</p>
            </div>
          </div>
        ) : (
          /* Jitsi Meeting */
          <JitsiMeeting
            roomName={lesson.meeting_link}
            displayName={displayName}
            userRole={user?.role as 'student' | 'teacher'}
            onMeetingStart={handleMeetingStart}
            onMeetingEnd={handleMeetingEnd}
          />
        )}
      </div>
    </div>
  )
}