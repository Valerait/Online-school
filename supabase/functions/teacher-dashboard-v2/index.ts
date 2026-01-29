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

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Требуется авторизация' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем сессию и получаем данные преподавателя
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
      .eq('users.role', 'teacher')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Сессия истекла или недостаточно прав' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Получаем данные преподавателя
    const { data: teacher } = await supabase
      .from('teachers')
      .select('*')
      .eq('user_id', session.users.id)
      .single()

    if (!teacher) {
      return new Response(
        JSON.stringify({ error: 'Профиль преподавателя не найден' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      const action = url.searchParams.get('action')

      if (action === 'bookings') {
        // Получаем заявки для преподавателя по его предметам
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select(`
            *,
            users(name, phone)
          `)
          .in('subject', teacher.subjects)
          .in('status', ['pending', 'confirmed'])
          .order('created_at', { ascending: false })

        console.log('📋 Fetched bookings:', { count: bookings?.length, error })

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка получения заявок' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            bookings: bookings || [],
            teacher: {
              id: teacher.id,
              name: session.users.name,
              subjects: teacher.subjects
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'lessons') {
        // Получаем уроки преподавателя
        const { data: lessons, error } = await supabase
          .from('lessons')
          .select(`
            *,
            users(name, phone),
            lesson_notes(teacher_comment, homework)
          `)
          .eq('teacher_id', session.users.id) // Используем user_id преподавателя
          .order('date', { ascending: true })

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

      } else if (action === 'schedule') {
        // Получаем расписание преподавателя
        const { data: schedule, error } = await supabase
          .from('teacher_schedule')
          .select('*')
          .eq('teacher_id', teacher.id)
          .order('day_of_week')

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка получения расписания' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            schedule: schedule || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else {
        // Общая информация дашборда
        const today = new Date().toISOString().split('T')[0]

        // Получаем заявки
        const { data: pendingBookings } = await supabase
          .from('bookings')
          .select('*')
          .in('subject', teacher.subjects)
          .eq('status', 'pending')

        // Получаем уроки на сегодня
        const { data: todayLessons } = await supabase
          .from('lessons')
          .select('*')
          .eq('teacher_id', session.users.id) // Используем user_id преподавателя
          .eq('date', today)
          .in('status', ['pending', 'confirmed'])

        // Получаем статистику
        const { data: totalLessons } = await supabase
          .from('lessons')
          .select('id')
          .eq('teacher_id', session.users.id) // Используем user_id преподавателя

        const stats = {
          pendingBookings: pendingBookings?.length || 0,
          todayLessons: todayLessons?.length || 0,
          totalLessons: totalLessons?.length || 0
        }

        return new Response(
          JSON.stringify({
            success: true,
            teacher: {
              id: teacher.id,
              name: session.users.name,
              email: session.users.email,
              subjects: teacher.subjects,
              phone: session.users.phone,
              bio: teacher.bio,
              price_per_lesson: teacher.price_per_lesson
            },
            stats,
            pendingBookings: pendingBookings || [],
            todayLessons: todayLessons || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const action = url.searchParams.get('action')

      if (action === 'accept-booking') {
        const { bookingId, meetingLink } = body

        console.log('✅ Accepting booking:', { bookingId, teacherId: teacher.id })

        // Получаем заявку
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', bookingId)
          .single()

        if (bookingError || !booking) {
          return new Response(
            JSON.stringify({ error: 'Заявка не найдена' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Обновляем заявку
        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            teacher_id: teacher.id
          })
          .eq('id', bookingId)

        if (updateError) {
          console.error('Error updating booking:', updateError)
          return new Response(
            JSON.stringify({ error: 'Ошибка подтверждения заявки' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Создаем урок с новой структурой времени
        const timeStart = booking.time + ':00' // Преобразуем "14:00" в "14:00:00"
        const timeEnd = (parseInt(booking.time.split(':')[0]) + 1).toString().padStart(2, '0') + ':00:00'

        // Генерируем уникальное имя комнаты Jitsi
        const jitsiRoomName = `lesson-${booking.subject}-${booking.date}-${booking.time.replace(':', '')}-${Date.now()}`
        
        const { data: lesson, error: lessonError } = await supabase
          .from('lessons')
          .insert({
            student_id: booking.user_id,
            teacher_id: session.users.id, // Используем user_id преподавателя, а не teacher.id
            subject: booking.subject,
            date: booking.date,
            time: booking.time, // Сохраняем старый формат для совместимости
            time_start: timeStart,
            time_end: timeEnd,
            type: booking.type,
            status: 'confirmed',
            meeting_link: jitsiRoomName // Сохраняем имя комнаты Jitsi вместо Zoom URL
          })
          .select()
          .single()

        if (lessonError) {
          console.error('Error creating lesson:', lessonError)
          return new Response(
            JSON.stringify({ error: 'Ошибка создания урока' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('✅ Booking accepted and lesson created:', lesson.id)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Заявка принята и урок создан',
            lesson
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'reject-booking') {
        const { bookingId, reason } = body

        console.log('❌ Rejecting booking:', { bookingId, reason })

        const { error } = await supabase
          .from('bookings')
          .update({
            status: 'rejected',
            message: reason || 'Заявка отклонена преподавателем'
          })
          .eq('id', bookingId)

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка отклонения заявки' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Заявка отклонена'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'start-lesson') {
        const { lessonId } = body

        // Обновляем статус урока
        const { error: lessonError } = await supabase
          .from('lessons')
          .update({ status: 'in_progress' })
          .eq('id', lessonId)
          .eq('teacher_id', session.users.id) // Используем user_id преподавателя

        if (lessonError) {
          return new Response(
            JSON.stringify({ error: 'Ошибка начала урока' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Урок начат'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'complete-lesson') {
        const { lessonId, teacherComment, homework } = body

        // Обновляем статус урока
        const { error: lessonError } = await supabase
          .from('lessons')
          .update({ status: 'completed' })
          .eq('id', lessonId)
          .eq('teacher_id', session.users.id) // Используем user_id преподавателя

        if (lessonError) {
          return new Response(
            JSON.stringify({ error: 'Ошибка завершения урока' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Создаем или обновляем заметки урока
        if (teacherComment || homework) {
          const { error: notesError } = await supabase
            .from('lesson_notes')
            .upsert({
              lesson_id: lessonId,
              teacher_comment: teacherComment,
              homework: homework
            })

          if (notesError) {
            console.error('Error saving lesson notes:', notesError)
            // Не возвращаем ошибку, так как урок уже завершен
          }
        }

        // Если это был пробный урок, отмечаем у студента
        const { data: lesson } = await supabase
          .from('lessons')
          .select('student_id, type')
          .eq('id', lessonId)
          .single()

        if (lesson && lesson.type === 'trial') {
          await supabase
            .from('users')
            .update({ has_trial_lesson: true })
            .eq('id', lesson.student_id)
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Урок завершен'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'update-schedule') {
        const { schedule } = body

        // Удаляем старое расписание
        await supabase
          .from('teacher_schedule')
          .delete()
          .eq('teacher_id', teacher.id)

        // Добавляем новое расписание
        if (schedule && schedule.length > 0) {
          const scheduleData = schedule.map((item: any) => ({
            teacher_id: teacher.id,
            day_of_week: item.day_of_week,
            time_start: item.time_start,
            time_end: item.time_end
          }))

          const { error } = await supabase
            .from('teacher_schedule')
            .insert(scheduleData)

          if (error) {
            return new Response(
              JSON.stringify({ error: 'Ошибка обновления расписания' }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Расписание обновлено'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Teacher dashboard error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})