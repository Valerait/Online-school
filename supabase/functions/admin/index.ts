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

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const url = new URL(req.url)
    const sessionId = url.searchParams.get('sessionId')
    const action = url.searchParams.get('action')

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Требуется авторизация' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем сессию и права администратора
    const { data: session } = await supabase
      .from('sessions')
      .select(`
        *,
        users!inner(
          id,
          name,
          email,
          phone,
          role
        )
      `)
      .eq('id', sessionId)
      .eq('users.role', 'admin')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Недостаточно прав или сессия истекла' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      
      if (action === 'stats') {
        // Получаем общую статистику
        const [
          { count: totalUsers },
          { count: totalStudents },
          { count: totalTeachers },
          { count: totalLessons },
          { count: totalPayments },
          { data: revenueData },
          { count: pendingBookings },
          { count: activeLessons }
        ] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student'),
          supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
          supabase.from('lessons').select('*', { count: 'exact', head: true }),
          supabase.from('payments').select('*', { count: 'exact', head: true }),
          supabase.from('payments').select('amount').eq('status', 'paid'),
          supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('lessons').select('*', { count: 'exact', head: true }).in('status', ['confirmed', 'in_progress'])
        ])

        const totalRevenue = revenueData?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0

        return new Response(
          JSON.stringify({
            success: true,
            stats: {
              totalUsers: totalUsers || 0,
              totalStudents: totalStudents || 0,
              totalTeachers: totalTeachers || 0,
              totalLessons: totalLessons || 0,
              totalPayments: totalPayments || 0,
              totalRevenue,
              pendingBookings: pendingBookings || 0,
              activeLessons: activeLessons || 0
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'users') {
        // Получаем всех пользователей
        const { data: users, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка получения пользователей' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            users: users || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'lessons') {
        // Получаем все уроки с информацией о студентах и преподавателях
        const { data: lessons, error } = await supabase
          .from('lessons')
          .select(`
            *,
            student:users!lessons_student_id_fkey(name, phone),
            teacher:users!lessons_teacher_id_fkey(name, phone),
            lesson_notes(teacher_comment, homework)
          `)
          .order('date', { ascending: false })

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка получения уроков' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            lessons: lessons || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'bookings') {
        // Получаем все заявки
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select(`
            *,
            user:users!bookings_user_id_fkey(name, phone),
            teacher:users!bookings_teacher_id_fkey(name, phone)
          `)
          .order('created_at', { ascending: false })

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка получения заявок' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            bookings: bookings || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'payments') {
        // Получаем все платежи с информацией о пользователях и уроках
        const { data: payments, error } = await supabase
          .from('payments')
          .select(`
            *,
            user:users!payments_user_id_fkey(name, phone),
            lesson:lessons!payments_lesson_id_fkey(id, subject, date, time)
          `)
          .order('created_at', { ascending: false })

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка получения платежей' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Статистика по платежам
        const totalRevenue = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0
        const totalPayments = payments?.length || 0
        const pendingPayments = payments?.filter(p => p.status === 'pending').length || 0
        const failedPayments = payments?.filter(p => p.status === 'failed').length || 0

        const today = new Date().toISOString().split('T')[0]
        const todayRevenue = payments?.filter(p => 
          p.status === 'paid' && p.created_at.startsWith(today)
        ).reduce((sum, p) => sum + p.amount, 0) || 0

        const thisMonth = new Date().toISOString().slice(0, 7)
        const monthRevenue = payments?.filter(p => 
          p.status === 'paid' && p.created_at.startsWith(thisMonth)
        ).reduce((sum, p) => sum + p.amount, 0) || 0

        return new Response(
          JSON.stringify({
            success: true,
            payments: payments || [],
            stats: {
              totalRevenue,
              totalPayments,
              pendingPayments,
              failedPayments,
              todayRevenue,
              monthRevenue
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'teachers') {
        // Получаем всех преподавателей с их данными
        const { data: teachers, error } = await supabase
          .from('users')
          .select(`
            id,
            name,
            phone,
            email,
            created_at,
            teachers(
              id,
              bio,
              subjects,
              price_per_lesson,
              is_active
            )
          `)
          .eq('role', 'teacher')
          .order('created_at', { ascending: false })

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка получения преподавателей' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Преобразуем данные для удобства
        const teachersData = teachers?.map(teacher => ({
          id: teacher.teachers?.[0]?.id || teacher.id,
          user_id: teacher.id,
          name: teacher.name,
          phone: teacher.phone,
          email: teacher.email,
          bio: teacher.teachers?.[0]?.bio || '',
          subjects: teacher.teachers?.[0]?.subjects || [],
          price_per_lesson: teacher.teachers?.[0]?.price_per_lesson || 7000,
          is_active: teacher.teachers?.[0]?.is_active || true,
          created_at: teacher.created_at
        })) || []

        return new Response(
          JSON.stringify({
            success: true,
            teachers: teachersData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'reports') {
        const period = url.searchParams.get('period') || 'month'
        
        // Получаем данные для отчета в зависимости от периода
        let dateFilter = ''
        const now = new Date()
        
        switch (period) {
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            dateFilter = weekAgo.toISOString()
            break
          case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
            dateFilter = monthAgo.toISOString()
            break
          case 'quarter':
            const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
            dateFilter = quarterAgo.toISOString()
            break
          case 'year':
            const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
            dateFilter = yearAgo.toISOString()
            break
        }

        // Получаем данные для отчета
        const [
          { data: lessons },
          { data: payments },
          { data: users }
        ] = await Promise.all([
          supabase.from('lessons').select('*').gte('created_at', dateFilter),
          supabase.from('payments').select('*').gte('created_at', dateFilter),
          supabase.from('users').select('*').gte('created_at', dateFilter)
        ])

        // Подготавливаем отчет
        const totalRevenue = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0) || 0
        const totalLessons = lessons?.length || 0
        const totalStudents = users?.filter(u => u.role === 'student').length || 0
        const totalTeachers = users?.filter(u => u.role === 'teacher').length || 0
        const trialLessons = lessons?.filter(l => l.type === 'trial').length || 0
        const paidLessons = lessons?.filter(l => l.type === 'paid').length || 0
        const completedLessons = lessons?.filter(l => l.status === 'completed').length || 0
        const canceledLessons = lessons?.filter(l => l.status === 'canceled').length || 0
        const averageRevenuePerLesson = totalLessons > 0 ? totalRevenue / totalLessons : 0

        // Статистика по предметам
        const subjectStats = lessons?.reduce((acc: any[], lesson) => {
          const existing = acc.find(s => s.subject === lesson.subject)
          if (existing) {
            existing.count++
            existing.revenue += 7000 // Примерная стоимость урока
          } else {
            acc.push({
              subject: lesson.subject,
              count: 1,
              revenue: 7000
            })
          }
          return acc
        }, []) || []

        // Статистика по преподавателям
        const teacherStats = lessons?.reduce((acc: any[], lesson) => {
          const existing = acc.find(t => t.name === lesson.teacher_id)
          if (existing) {
            existing.lessons++
            existing.revenue += 7000
          } else {
            acc.push({
              name: 'Преподаватель',
              lessons: 1,
              revenue: 7000
            })
          }
          return acc
        }, []) || []

        return new Response(
          JSON.stringify({
            success: true,
            report: {
              period,
              totalRevenue,
              totalLessons,
              totalStudents,
              totalTeachers,
              trialLessons,
              paidLessons,
              completedLessons,
              canceledLessons,
              averageRevenuePerLesson,
              subjectStats,
              teacherStats,
              monthlyData: []
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (req.method === 'POST') {
      const body = await req.json()

      if (action === 'create_teacher') {
        const { name, phone, email, bio, subjects, price_per_lesson, password } = body

        if (!name || !phone || !password || !subjects || subjects.length === 0) {
          return new Response(
            JSON.stringify({ error: 'Имя, телефон, пароль и предметы обязательны' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Проверяем, существует ли пользователь с таким телефоном
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('phone', phone)
          .single()

        if (existingUser) {
          return new Response(
            JSON.stringify({ error: 'Пользователь с таким номером уже существует' }),
            { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Хешируем пароль
        const hashedPassword = await hashPassword(password)

        // Создаем пользователя
        const { data: user, error: userError } = await supabase
          .from('users')
          .insert({
            name,
            phone,
            email: email || null,
            password: hashedPassword,
            role: 'teacher'
          })
          .select()
          .single()

        if (userError) {
          console.error('User creation error:', userError)
          return new Response(
            JSON.stringify({ error: 'Ошибка создания пользователя: ' + userError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Создаем запись преподавателя
        const { data: teacher, error: teacherError } = await supabase
          .from('teachers')
          .insert({
            user_id: user.id,
            bio: bio || '',
            subjects: subjects,
            price_per_lesson: price_per_lesson || 7000,
            is_active: true
          })
          .select()
          .single()

        if (teacherError) {
          console.error('Teacher creation error:', teacherError)
          // Удаляем пользователя если не удалось создать преподавателя
          await supabase.from('users').delete().eq('id', user.id)
          return new Response(
            JSON.stringify({ error: 'Ошибка создания профиля преподавателя: ' + teacherError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            user,
            teacher
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'update_teacher_status') {
        const { teacherId, isActive } = body

        const { error } = await supabase
          .from('teachers')
          .update({ is_active: isActive })
          .eq('id', teacherId)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка обновления статуса преподавателя: ' + error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'create-user') {
        const { name, phone, email, role, grade, password } = body

        // Создаем пользователя
        const { data: user, error } = await supabase
          .from('users')
          .insert({
            name,
            phone,
            email,
            role,
            grade: grade || null
          })
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка создания пользователя: ' + error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            user
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'update-user-role') {
        const { userId, role } = body

        const { error } = await supabase
          .from('users')
          .update({ role })
          .eq('id', userId)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка обновления роли' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'delete-user') {
        const { userId } = body

        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка удаления пользователя' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'update-lesson-status') {
        const { lessonId, status } = body

        const { error } = await supabase
          .from('lessons')
          .update({ status })
          .eq('id', lessonId)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка обновления статуса урока' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'update-booking-status') {
        const { bookingId, status } = body

        const { error } = await supabase
          .from('bookings')
          .update({ status })
          .eq('id', bookingId)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка обновления статуса заявки' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'update-payment-status') {
        const { paymentId, status } = body

        const { error } = await supabase
          .from('payments')
          .update({ status })
          .eq('id', paymentId)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка обновления статуса платежа' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'delete-lesson') {
        const { lessonId } = body

        const { error } = await supabase
          .from('lessons')
          .delete()
          .eq('id', lessonId)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка удаления урока' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Неизвестное действие' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Admin API error:', error)
    return new Response(
      JSON.stringify({ error: 'Внутренняя ошибка сервера: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}