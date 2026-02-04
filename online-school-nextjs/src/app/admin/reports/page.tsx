'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { apiCall } from '@/lib/supabase'

interface ReportData {
  period: string
  totalRevenue: number
  totalLessons: number
  totalStudents: number
  totalTeachers: number
  trialLessons: number
  paidLessons: number
  completedLessons: number
  canceledLessons: number
  averageRevenuePerLesson: number
  subjectStats: {
    subject: string
    count: number
    revenue: number
  }[]
  teacherStats: {
    name: string
    lessons: number
    revenue: number
  }[]
  monthlyData: {
    month: string
    revenue: number
    lessons: number
    students: number
  }[]
}

export default function AdminReportsPage() {
  const { user, sessionId } = useAuth()
  const router = useRouter()
  
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [period, setPeriod] = useState('month') // week, month, quarter, year

  useEffect(() => {
    if (!user || !sessionId) {
      router.push('/login')
      return
    }

    if (user.role !== 'admin') {
      router.push('/')
      return
    }

    loadReports()
  }, [user, sessionId, router, period])

  const loadReports = async () => {
    setLoading(true)
    try {
      const data = await apiCall(`/admin?action=reports&period=${period}&sessionId=${sessionId}`)
      
      if (data.success) {
        setReportData(data.report)
      } else {
        setError(data.error || 'Ошибка загрузки отчетов')
      }
    } catch (error) {
      console.error('Error loading reports:', error)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format: 'csv' | 'pdf') => {
    try {
      const data = await apiCall(`/admin?action=export-report&format=${format}&period=${period}&sessionId=${sessionId}`)
      
      if (data.success) {
        // Создаем ссылку для скачивания
        const blob = new Blob([data.content], { 
          type: format === 'csv' ? 'text/csv' : 'application/pdf' 
        })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `report-${period}-${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      } else {
        setError(data.error || 'Ошибка экспорта отчета')
      }
    } catch (error) {
      console.error('Error exporting report:', error)
      setError('Ошибка экспорта отчета')
    }
  }

  const getPeriodText = (period: string) => {
    switch (period) {
      case 'week': return 'За неделю'
      case 'month': return 'За месяц'
      case 'quarter': return 'За квартал'
      case 'year': return 'За год'
      default: return period
    }
  }

  const getSubjectName = (subject: string) => {
    const subjects: { [key: string]: string } = {
      'math': 'Математика',
      'physics': 'Физика',
      'chemistry': 'Химия',
      'russian': 'Русский язык',
      'english': 'Английский язык'
    }
    return subjects[subject] || subject
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Загрузка отчетов...</p>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Нет данных для отчета</p>
          <Button onClick={() => router.push('/admin')} className="mt-4">
            Назад в админку
          </Button>
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
                📊 Отчеты и аналитика
              </h1>
              <p className="text-purple-100 mt-1">{getPeriodText(period)}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => exportReport('csv')}
                className="bg-green-600 hover:bg-green-700"
              >
                📄 Экспорт CSV
              </Button>
              <Button 
                onClick={() => exportReport('pdf')}
                className="bg-red-600 hover:bg-red-700"
              >
                📑 Экспорт PDF
              </Button>
              <button 
                onClick={() => router.push('/admin')}
                className="px-4 py-2 bg-white/20 text-white border border-white/30 rounded-lg hover:bg-white/30 transition-colors duration-200 flex items-center gap-2"
              >
                ← Назад в админку
              </button>
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

        {/* Фильтр периода */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Период:</label>
            <Select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              options={[
                { value: 'week', label: 'Неделя' },
                { value: 'month', label: 'Месяц' },
                { value: 'quarter', label: 'Квартал' },
                { value: 'year', label: 'Год' }
              ]}
              className="w-40"
            />
            <Button onClick={loadReports} className="ml-4">
              Обновить отчет
            </Button>
          </div>
        </div>

        {/* Основная статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{reportData.totalRevenue.toLocaleString()}₸</div>
                <div className="text-gray-600">Общий доход</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{reportData.totalLessons}</div>
                <div className="text-gray-600">Всего уроков</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{reportData.totalStudents}</div>
                <div className="text-gray-600">Активных учащихся</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{reportData.totalTeachers}</div>
                <div className="text-gray-600">Активных преподавателей</div>
              </div>
            </div>
          </div>
        </div>

        {/* Детальная статистика */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Статистика по типам уроков */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Статистика по типам уроков</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Пробные уроки:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{reportData.trialLessons}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full" 
                      style={{ width: `${(reportData.trialLessons / reportData.totalLessons) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Платные уроки:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{reportData.paidLessons}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full" 
                      style={{ width: `${(reportData.paidLessons / reportData.totalLessons) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Завершенные уроки:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{reportData.completedLessons}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(reportData.completedLessons / reportData.totalLessons) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Отмененные уроки:</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{reportData.canceledLessons}</span>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-600 h-2 rounded-full" 
                      style={{ width: `${(reportData.canceledLessons / reportData.totalLessons) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Средний доход с урока:</span>
                <span className="font-bold text-lg">{reportData.averageRevenuePerLesson.toLocaleString()}₸</span>
              </div>
            </div>
          </div>

          {/* Статистика по предметам */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Популярность предметов</h3>
            <div className="space-y-3">
              {reportData.subjectStats.map((subject, index) => (
                <div key={subject.subject} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {getSubjectName(subject.subject)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-600">{subject.count} уроков</span>
                    <span className="text-sm font-medium">{subject.revenue.toLocaleString()}₸</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Статистика по преподавателям */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Эффективность преподавателей</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Преподаватель
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Уроков проведено
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Доход
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Средний доход с урока
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.teacherStats.map((teacher, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{teacher.lessons}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{teacher.revenue.toLocaleString()}₸</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {teacher.lessons > 0 ? (teacher.revenue / teacher.lessons).toLocaleString() : 0}₸
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Месячная динамика */}
        {reportData.monthlyData && reportData.monthlyData.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Динамика по месяцам</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Месяц
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Доход
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Уроков
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Новых учащихся
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.monthlyData.map((month, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{month.month}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{month.revenue.toLocaleString()}₸</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{month.lessons}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{month.students}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}