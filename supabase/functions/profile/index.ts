import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

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

    // Проверяем сессию
    const { data: session } = await supabase
      .from('sessions')
      .select('*, users(*)')
      .eq('id', sessionId)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Сессия истекла' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const user = session.users

    if (req.method === 'GET') {
      // Получаем заявки пользователя
      const { data: bookings } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      // Получаем уроки пользователя
      const { data: lessons } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })

      const stats = {
        totalLessons: lessons?.length || 0,
        completedLessons: lessons?.filter(l => l.status === 'completed').length || 0,
        upcomingLessons: lessons?.filter(l => l.status === 'scheduled').length || 0
      }

      return new Response(
        JSON.stringify({
          user: {
            id: user.id,
            name: user.name,
            phone: user.phone,
            grade: user.grade,
            has_trial_lesson: user.has_trial_lesson
          },
          bookings: bookings || [],
          lessons: lessons || [],
          stats
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (req.method === 'POST') {
      const body = await req.json()
      const action = url.searchParams.get('action')

      if (action === 'book-lesson') {
        const { subject, date, time, type = 'trial' } = body

        console.log('📝 Booking lesson request:', { 
          userId: user.id, 
          subject, 
          date, 
          time, 
          type,
          hasTrialLesson: user.has_trial_lesson 
        });

        // Проверяем, можно ли записаться на пробный урок
        if (type === 'trial' && user.has_trial_lesson) {
          console.log('❌ User already has trial lesson');
          return new Response(
            JSON.stringify({ error: 'Вы уже прошли пробный урок' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Находим подходящего преподавателя для предмета
        const { data: availableTeachers } = await supabase
          .from('teachers')
          .select(`
            id,
            user_id,
            subjects,
            users!inner(id, name, phone)
          `)
          .contains('subjects', [subject])
          .eq('is_active', true)

        let teacherId = null
        if (availableTeachers && availableTeachers.length > 0) {
          // Выбираем первого доступного преподавателя
          teacherId = availableTeachers[0].user_id
        }

        // Создаем заявку
        const bookingData = {
          user_id: user.id,
          teacher_id: teacherId, // Назначаем преподавателя если найден
          subject,
          date,
          time,
          type,
          status: 'pending',
          message: `Заявка от ${user.name} (${user.phone}), класс: ${user.grade || 'не указан'}`
        };

        console.log('📝 Creating booking with data:', bookingData);

        const { data: booking, error } = await supabase
          .from('bookings')
          .insert(bookingData)
          .select()
          .single()

        console.log('📝 Booking creation result:', { booking: booking?.id, error });

        if (error) {
          console.error('❌ Booking creation error:', error);
          return new Response(
            JSON.stringify({ error: 'Ошибка создания заявки: ' + error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('✅ Booking created successfully:', booking.id);

        return new Response(
          JSON.stringify({ success: true, booking }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'update-profile') {
        const { name, grade } = body

        const { data: updatedUser, error } = await supabase
          .from('users')
          .update({
            name: name || user.name,
            grade: grade || user.grade
          })
          .eq('id', user.id)
          .select()
          .single()

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка обновления профиля' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: true, user: updatedUser }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})