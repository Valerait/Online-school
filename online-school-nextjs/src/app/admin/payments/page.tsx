'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { apiCall } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'

interface Payment {
  id: string
  amount: number
  currency: string
  provider: string
  status: 'pending' | 'paid' | 'failed'
  created_at: string
  user: {
    name: string
    phone: string
  }
  lesson?: {
    id: string
    subject: string
    date: string
    time: string
  }
}

interface PaymentStats {
  totalRevenue: number
  totalPayments: number
  pendingPayments: number
  failedPayments: number
  todayRevenue: number
  monthRevenue: number
}

export default function AdminPaymentsPage() {
  const { user, sessionId } = useAuth()
  const router = useRouter()
  
  const [payments, setPayments] = useState<Payment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([])
  const [stats, setStats] = useState<PaymentStats>({
    totalRevenue: 0,
    totalPayments: 0,
    pendingPayments: 0,
    failedPayments: 0,
    todayRevenue: 0,
    monthRevenue: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    provider: 'all',
    dateFrom: '',
    dateTo: ''
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

    loadPayments()
  }, [user, sessionId, router])

  useEffect(() => {
    filterPayments()
  }, [payments, filters])

  const loadPayments = async () => {
    setLoading(true)
    try {
      const data = await apiCall(`/admin?action=payments&sessionId=${sessionId}`)
      
      if (data.success) {
        setPayments(data.payments || [])
        setStats(data.stats || stats)
      } else {
        setError(data.error || 'Ошибка загрузки платежей')
      }
    } catch (error) {
      console.error('Error loading payments:', error)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const filterPayments = () => {
    let filtered = payments

    if (filters.search) {
      filtered = filtered.filter(payment => 
        payment.user.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        payment.user.phone.includes(filters.search) ||
        payment.id.toLowerCase().includes(filters.search.toLowerCase())
      )
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(payment => payment.status === filters.status)
    }

    if (filters.provider !== 'all') {
      filtered = filtered.filter(payment => payment.provider === filters.provider)
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(payment => 
        new Date(payment.created_at) >= new Date(filters.dateFrom)
      )
    }

    if (filters.dateTo) {
      filtered = filtered.filter(payment => 
        new Date(payment.created_at) <= new Date(filters.dateTo + 'T23:59:59')
      )
    }

    setFilteredPayments(filtered)
  }

  const updatePaymentStatus = async (paymentId: string, newStatus: string) => {
    try {
      const data = await apiCall(`/admin?action=update-payment-status&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ paymentId, status: newStatus })
      })

      if (data.success) {
        loadPayments()
      } else {
        setError(data.error || 'Ошибка обновления статуса')
      }
    } catch (error) {
      console.error('Error updating payment status:', error)
      setError('Ошибка обновления статуса')
    }
  }

  const createManualPayment = async () => {
    const userId = prompt('ID пользователя:')
    const amount = prompt('Сумма (в тенге):')
    
    if (!userId || !amount) return

    try {
      const data = await apiCall(`/admin?action=create-payment&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({
          userId,
          amount: parseFloat(amount),
          provider: 'manual',
          status: 'paid'
        })
      })

      if (data.success) {
        loadPayments()
      } else {
        setError(data.error || 'Ошибка создания платежа')
      }
    } catch (error) {
      console.error('Error creating payment:', error)
      setError('Ошибка создания платежа')
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Оплачен'
      case 'pending': return 'Ожидает'
      case 'failed': return 'Ошибка'
      default: return status
    }
  }

  const getProviderText = (provider: string) => {
    switch (provider) {
      case 'kaspi': return 'Kaspi Pay'
      case 'manual': return 'Ручной'
      default: return provider
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Загрузка платежей...</p>
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
                💳 Управление платежами
              </h1>
              <p className="text-purple-100 mt-1">
                Всего платежей: {payments.length} | Общий доход: {stats.totalRevenue.toLocaleString()}₸
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={createManualPayment}
                className="bg-green-600 hover:bg-green-700"
              >
                + Ручной платеж
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

        {/* Статистика */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.totalRevenue.toLocaleString()}₸</div>
                <div className="text-gray-600">Общий доход</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.totalPayments}</div>
                <div className="text-gray-600">Всего платежей</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.pendingPayments}</div>
                <div className="text-gray-600">Ожидают оплаты</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <div className="text-2xl font-bold text-gray-900">{stats.failedPayments}</div>
                <div className="text-gray-600">Неудачные</div>
              </div>
            </div>
          </div>
        </div>

        {/* Фильтры */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Поиск по имени, телефону, ID..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
            
            <Select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              options={[
                { value: 'all', label: 'Все статусы' },
                { value: 'paid', label: 'Оплачен' },
                { value: 'pending', label: 'Ожидает' },
                { value: 'failed', label: 'Ошибка' }
              ]}
            />
            
            <Select
              value={filters.provider}
              onChange={(e) => setFilters({...filters, provider: e.target.value})}
              options={[
                { value: 'all', label: 'Все провайдеры' },
                { value: 'kaspi', label: 'Kaspi Pay' },
                { value: 'manual', label: 'Ручной' }
              ]}
            />
            
            <Input
              type="date"
              placeholder="Дата от"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
            />
            
            <Input
              type="date"
              placeholder="Дата до"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
            />
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            Показано: {filteredPayments.length} из {payments.length} платежей
          </div>
        </div>

        {/* Таблица платежей */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID платежа
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Урок
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Провайдер
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900">
                        {payment.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payment.user.name}</div>
                      <div className="text-sm text-gray-500">{payment.user.phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {payment.lesson ? (
                        <div>
                          <div className="text-sm text-gray-900">{payment.lesson.subject}</div>
                          <div className="text-sm text-gray-500">
                            {formatDate(payment.lesson.date)} {payment.lesson.time}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">Без урока</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.amount.toLocaleString()} {payment.currency}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {getProviderText(payment.provider)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(payment.status)}`}>
                        {getStatusText(payment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatDate(payment.created_at)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(payment.created_at).toLocaleTimeString('ru-RU')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Select
                        value={payment.status}
                        onChange={(e) => updatePaymentStatus(payment.id, e.target.value)}
                        options={[
                          { value: 'pending', label: 'Ожидает' },
                          { value: 'paid', label: 'Оплачен' },
                          { value: 'failed', label: 'Ошибка' }
                        ]}
                        className="text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Платежи не найдены
          </div>
        )}
      </div>
    </div>
  )
}