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

    if (req.method === 'POST') {
      const body = await req.json()
      const { student_name, student_phone, grade, subject, date, time, contact_method, message, type = 'trial' } = body

      if (!student_name || !student_phone || !subject || !date || !time) {
        return new Response(
          JSON.stringify({ error: 'Обязательные поля: имя, телефон, предмет, дата, время' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Создаем временного пользователя или находим существующего
      let userId = null
      
      // Проверяем, есть ли пользователь с таким телефоном
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('phone', student_phone)
        .single()

      if (existingUser) {
        userId = existingUser.id
      } else {
        // Создаем временного пользователя
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            name: student_name,
            phone: student_phone,
            password: 'temp_password_' + Date.now(), // Временный пароль
            role: 'student',
            grade: grade || null
          })
          .select('id')
          .single()

        if (userError) {
          console.error('Error creating user:', userError)
          return new Response(
            JSON.stringify({ error: 'Ошибка создания пользователя' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        userId = newUser.id
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
        user_id: userId,
        teacher_id: teacherId, // Назначаем преподавателя если найден
        subject,
        date,
        time,
        type,
        status: 'pending',
        message: `Заявка с сайта от ${student_name} (${student_phone}), класс: ${grade || 'не указан'}. Связаться через: ${contact_method}. ${message ? 'Комментарий: ' + message : ''}`
      }

      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .insert(bookingData)
        .select()
        .single()

      if (bookingError) {
        console.error('Error creating booking:', bookingError)
        return new Response(
          JSON.stringify({ error: 'Ошибка создания заявки: ' + bookingError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.',
          booking 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bookings API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})