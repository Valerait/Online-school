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
    const action = url.searchParams.get('action')

    if (req.method === 'GET' && action === 'available-times') {
      const date = url.searchParams.get('date')
      const subject = url.searchParams.get('subject')

      if (!date) {
        return new Response(
          JSON.stringify({ error: 'Дата обязательна' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Getting available times for:', { date, subject })

      // Все возможные временные слоты
      const allTimeSlots = [
        '09:00', '10:00', '11:00', '12:00', 
        '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
      ]

      // Получаем занятые слоты из bookings (заявки)
      const { data: bookedSlots, error: bookingError } = await supabase
        .from('bookings')
        .select('time, subject')
        .eq('date', date)
        .in('status', ['pending', 'confirmed'])

      console.log('Booked slots from bookings:', bookedSlots)

      // Получаем занятые слоты из lessons (подтвержденные уроки)
      const { data: scheduledLessons, error: lessonError } = await supabase
        .from('lessons')
        .select('time, subject')
        .eq('date', date)
        .in('status', ['scheduled', 'in_progress'])

      console.log('Scheduled lessons:', scheduledLessons)

      if (bookingError || lessonError) {
        console.error('Error fetching schedule:', { bookingError, lessonError })
        return new Response(
          JSON.stringify({ error: 'Ошибка получения расписания' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Объединяем все занятые слоты
      const occupiedTimes = new Set()
      
      // Добавляем занятые слоты из заявок
      if (bookedSlots) {
        bookedSlots.forEach(slot => {
          // Если указан предмет, проверяем только слоты для этого предмета
          // Если предмет не указан, считаем все слоты занятыми
          if (!subject || slot.subject === subject) {
            occupiedTimes.add(slot.time)
          }
        })
      }

      // Добавляем занятые слоты из уроков
      if (scheduledLessons) {
        scheduledLessons.forEach(lesson => {
          if (!subject || lesson.subject === subject) {
            occupiedTimes.add(lesson.time)
          }
        })
      }

      // Фильтруем доступные слоты
      const availableTimes = allTimeSlots.filter(time => !occupiedTimes.has(time))

      console.log('Available times:', availableTimes)

      return new Response(
        JSON.stringify({
          success: true,
          date,
          subject,
          availableTimes,
          occupiedTimes: Array.from(occupiedTimes),
          allTimeSlots
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET' && action === 'teacher-schedule') {
      const date = url.searchParams.get('date')
      
      if (!date) {
        return new Response(
          JSON.stringify({ error: 'Дата обязательна' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Получаем полное расписание на день
      const { data: bookings } = await supabase
        .from('bookings')
        .select('time, subject, student_name, status')
        .eq('date', date)
        .in('status', ['pending', 'confirmed'])

      const { data: lessons } = await supabase
        .from('lessons')
        .select('time, subject, status')
        .eq('date', date)
        .in('status', ['scheduled', 'in_progress', 'completed'])

      return new Response(
        JSON.stringify({
          success: true,
          date,
          bookings: bookings || [],
          lessons: lessons || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Schedule error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})