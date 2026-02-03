'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { apiCall } from '@/lib/supabase'

export default function HomePage() {
  const [formData, setFormData] = useState({
    studentName: '',
    studentPhone: '',
    studentGrade: '',
    subject: '',
    bookingDate: '',
    bookingTime: '',
    contactMethod: '',
    comments: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const result = await apiCall('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          student_name: formData.studentName,
          student_phone: formData.studentPhone,
          grade: parseInt(formData.studentGrade),
          subject: formData.subject,
          date: formData.bookingDate,
          time: formData.bookingTime,
          contact_method: formData.contactMethod,
          message: formData.comments,
          type: 'trial'
        })
      })

      if (result.success) {
        setMessage(result.message || 'Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.')
      } else {
        throw new Error(result.error || 'Ошибка отправки заявки')
      }

      setMessage('Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.')
      setFormData({
        studentName: '',
        studentPhone: '',
        studentGrade: '',
        subject: '',
        bookingDate: '',
        bookingTime: '',
        contactMethod: '',
        comments: ''
      })
    } catch (error) {
      setMessage(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  // Устанавливаем минимальную дату (завтра)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">Онлайн-репетиторство</h1>
            </div>
            <div className="flex space-x-4">
              <Link href="/login" className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium">
                Войти
              </Link>
              <Link href="/register" className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium">
                Регистрация
              </Link>
              <Link href="/teacher/login" className="text-orange-600 hover:text-orange-700 px-3 py-2 rounded-md text-sm font-medium">
                Преподавателям
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Учись с удовольствием и подтягивай оценки
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Первый пробный урок — БЕСПЛАТНО
          </p>
          <Button 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100"
            onClick={() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Записаться на пробный урок
          </Button>
        </div>
      </section>

      {/* Booking Form Section */}
      <section id="booking-form" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Запишитесь на бесплатный пробный урок
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Form */}
            <div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Ваше имя *"
                    name="studentName"
                    value={formData.studentName}
                    onChange={handleChange}
                    placeholder="Введите ваше имя"
                    required
                  />
                  <Input
                    label="Номер телефона *"
                    name="studentPhone"
                    type="tel"
                    value={formData.studentPhone}
                    onChange={handleChange}
                    placeholder="+7 (777) 123-12-12"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Класс *"
                    name="studentGrade"
                    value={formData.studentGrade}
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
                  <Select
                    label="Предмет *"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Дата занятия *"
                    name="bookingDate"
                    type="date"
                    value={formData.bookingDate}
                    onChange={handleChange}
                    min={minDate}
                    required
                  />
                  <Select
                    label="Время занятия *"
                    name="bookingTime"
                    value={formData.bookingTime}
                    onChange={handleChange}
                    required
                    options={[
                      { value: '', label: 'Выберите время' },
                      { value: '09:00', label: '09:00' },
                      { value: '10:00', label: '10:00' },
                      { value: '11:00', label: '11:00' },
                      { value: '12:00', label: '12:00' },
                      { value: '13:00', label: '13:00' },
                      { value: '14:00', label: '14:00' },
                      { value: '15:00', label: '15:00' },
                      { value: '16:00', label: '16:00' },
                      { value: '17:00', label: '17:00' },
                      { value: '18:00', label: '18:00' },
                      { value: '19:00', label: '19:00' },
                      { value: '20:00', label: '20:00' },
                    ]}
                  />
                </div>

                <Select
                  label="Как с вами связаться? *"
                  name="contactMethod"
                  value={formData.contactMethod}
                  onChange={handleChange}
                  required
                  options={[
                    { value: '', label: 'Выберите способ' },
                    { value: 'whatsapp', label: 'WhatsApp' },
                    { value: 'telegram', label: 'Telegram' },
                    { value: 'phone', label: 'Телефонный звонок' },
                  ]}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Комментарий (необязательно)
                  </label>
                  <textarea
                    name="comments"
                    value={formData.comments}
                    onChange={handleChange}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Расскажите о ваших целях или вопросах"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Совет:</strong>{' '}
                    <Link href="/register" className="text-blue-600 hover:underline">
                      Зарегистрируйтесь
                    </Link>{' '}
                    для удобного управления уроками в личном кабинете!
                  </p>
                </div>

                <Button type="submit" loading={loading} className="w-full">
                  Записаться на пробный урок
                </Button>

                {message && (
                  <div className={`p-4 rounded-lg ${message.includes('Ошибка') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                    {message}
                  </div>
                )}
              </form>
            </div>

            {/* Calendar Preview */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Мое расписание</h3>
              <p className="text-gray-600 mb-4">Посмотрите мою занятость и выберите удобное время</p>
              <div className="bg-white rounded-lg p-4 h-96 flex items-center justify-center">
                <p className="text-gray-500">Календарь загружается...</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Преимущества</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-2">Подготовка к СОРам/СОЧам</h3>
              <p className="text-gray-600">Качественная подготовка к контрольным работам и экзаменам</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="text-xl font-semibold mb-2">Индивидуальный график</h3>
              <p className="text-gray-600">Занятия в удобное для вас время</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold mb-2">Отчеты родителям</h3>
              <p className="text-gray-600">Регулярная обратная связь о прогрессе ученика</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Стоимость занятий</h2>
          </div>
          
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <h3 className="text-xl font-semibold mb-4">Разовое занятие</h3>
            <div className="text-4xl font-bold text-blue-600 mb-2">7 000 ₸</div>
            <p className="text-gray-600 mb-6">60 минут индивидуального занятия</p>
            <Button className="w-full">
              Оплатить через Kaspi Pay
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2026 Онлайн-репетиторство. Все права защищены.</p>
        </div>
      </footer>
    </div>
  )
}