import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ТОЛЬКО ДЛЯ ТЕСТИРОВАНИЯ - в продакшн добавить проверку авторизации!
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Метод не поддерживается' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('Starting user reset...')

    // 1. ОЧИЩАЕМ ВСЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЕЙ
    await supabase.from('lesson_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('lessons').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('teacher_schedule').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('teachers').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    console.log('Old data cleared')

    // 2. СОЗДАЕМ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ
    const users = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        role: 'student',
        name: 'Жанат Х',
        phone: '+77777777783',
        password: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // 123456
        email: 'student@test.kz',
        grade: 8,
        has_trial_lesson: false
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        role: 'teacher',
        name: 'Анна Петровна',
        phone: '+77002222222',
        password: '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', // 123456
        email: 'teacher@test.kz',
        grade: null,
        has_trial_lesson: false
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        role: 'admin',
        name: 'Администратор',
        phone: 'newadmin@example.com',
        password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // admin123
        email: 'newadmin@example.com',
        grade: null,
        has_trial_lesson: false
      }
    ]

    const { error: usersError } = await supabase.from('users').insert(users)
    if (usersError) {
      console.error('Users creation error:', usersError)
      throw usersError
    }

    console.log('Users created')

    // 3. СОЗДАЕМ ПРОФИЛЬ ПРЕПОДАВАТЕЛЯ
    const { error: teacherError } = await supabase.from('teachers').insert({
      id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      user_id: '22222222-2222-2222-2222-222222222222',
      bio: 'Опытный преподаватель математики и английского языка с 10-летним стажем',
      subjects: ['Математика', 'Английский язык'],
      price_per_lesson: 7000.00,
      is_active: true
    })

    if (teacherError) {
      console.error('Teacher creation error:', teacherError)
      throw teacherError
    }

    console.log('Teacher profile created')

    // 4. СОЗДАЕМ РАСПИСАНИЕ ПРЕПОДАВАТЕЛЯ
    const schedule = []
    for (let day = 1; day <= 5; day++) {
      schedule.push({
        teacher_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        day_of_week: day,
        time_start: '09:00',
        time_end: '18:00'
      })
    }

    const { error: scheduleError } = await supabase.from('teacher_schedule').insert(schedule)
    if (scheduleError) {
      console.error('Schedule creation error:', scheduleError)
      throw scheduleError
    }

    console.log('Teacher schedule created')

    // 5. СОЗДАЕМ ТЕСТОВЫЕ ЗАЯВКИ
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dayAfterTomorrow = new Date()
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)

    const bookings = [
      {
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        user_id: '11111111-1111-1111-1111-111111111111',
        teacher_id: null,
        subject: 'Английский язык',
        date: tomorrow.toISOString().split('T')[0],
        time: '10:00',
        type: 'trial',
        status: 'pending',
        message: 'Первый пробный урок'
      },
      {
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        user_id: '11111111-1111-1111-1111-111111111111',
        teacher_id: null,
        subject: 'Математика',
        date: dayAfterTomorrow.toISOString().split('T')[0],
        time: '12:00',
        type: 'trial',
        status: 'pending',
        message: 'Пробный урок по математике'
      }
    ]

    const { error: bookingsError } = await supabase.from('bookings').insert(bookings)
    if (bookingsError) {
      console.error('Bookings creation error:', bookingsError)
      throw bookingsError
    }

    console.log('Test bookings created')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Пользователи успешно сброшены и созданы',
        users: {
          student: { phone: '+77777777783', password: '123456' },
          teacher: { phone: '+77002222222', password: '123456' },
          admin: { email: 'newadmin@example.com', password: 'admin123' }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Reset users error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Ошибка сброса пользователей: ' + error.message,
        details: error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})