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
    const lessonId = url.searchParams.get('lessonId')

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Требуется авторизация' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!lessonId) {
      return new Response(
        JSON.stringify({ error: 'ID урока не указан' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Проверяем сессию
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
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Сессия истекла' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      // Получаем данные урока с информацией о студенте и преподавателе
      const { data: lesson, error } = await supabase
        .from('lessons')
        .select(`
          *,
          student:users!lessons_student_id_fkey(name, phone),
          teacher:users!lessons_teacher_id_fkey(name, phone)
        `)
        .eq('id', lessonId)
        .single()

      if (error || !lesson) {
        console.error('Lesson not found:', error)
        return new Response(
          JSON.stringify({ error: 'Урок не найден' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Проверяем права доступа
      const userId = session.users.id
      const userRole = session.users.role

      let hasAccess = false

      if (userRole === 'teacher') {
        // Для преподавателя проверяем, что он ведет этот урок
        hasAccess = lesson.teacher_id === userId
      } else if (userRole === 'student') {
        // Для студента проверяем, что это его урок
        hasAccess = lesson.student_id === userId
      } else if (userRole === 'admin') {
        // Админ имеет доступ ко всем урокам
        hasAccess = true
      }

      if (!hasAccess) {
        return new Response(
          JSON.stringify({ error: 'У вас нет доступа к этому уроку' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Проверяем, что у урока есть ссылка на встречу
      if (!lesson.meeting_link) {
        return new Response(
          JSON.stringify({ error: 'Ссылка на урок еще не создана' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          lesson: lesson,
          user: {
            id: session.users.id,
            name: session.users.name,
            role: session.users.role
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Lesson API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})