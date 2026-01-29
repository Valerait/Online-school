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

    if (req.method === 'POST') {
      const body = await req.json()

      if (action === 'login') {
        const { email, password } = body

        console.log('🔐 Teacher login attempt:', { email })

        if (!email || !password) {
          return new Response(
            JSON.stringify({ error: 'Email и пароль обязательны' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Находим преподавателя
        const { data: teacher, error: teacherError } = await supabase
          .from('teachers')
          .select('*')
          .eq('email', email)
          .eq('is_active', true)
          .single()

        console.log('🔐 Teacher found:', { teacher: teacher?.id, error: teacherError })

        if (teacherError || !teacher) {
          return new Response(
            JSON.stringify({ error: 'Неверный email или пароль' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Проверяем пароль
        const hashedPassword = await hashPassword(password)
        console.log('🔐 Password check:', { 
          inputHash: hashedPassword.substring(0, 10) + '...',
          storedHash: teacher.password.substring(0, 10) + '...',
          match: teacher.password === hashedPassword
        })

        if (teacher.password !== hashedPassword) {
          return new Response(
            JSON.stringify({ error: 'Неверный email или пароль' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Создаем сессию
        const sessionId = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней

        const { error: sessionError } = await supabase
          .from('teacher_sessions')
          .insert({
            id: sessionId,
            teacher_id: teacher.id,
            expires_at: expiresAt.toISOString()
          })

        console.log('🔐 Session creation:', { sessionError })

        if (sessionError) {
          console.error('Session creation error:', sessionError)
          return new Response(
            JSON.stringify({ error: 'Ошибка создания сессии' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        console.log('✅ Teacher login successful:', teacher.id)

        return new Response(
          JSON.stringify({
            success: true,
            sessionId,
            teacher: {
              id: teacher.id,
              name: teacher.name,
              email: teacher.email,
              subjects: teacher.subjects,
              phone: teacher.phone
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'logout') {
        const { sessionId } = body

        if (sessionId) {
          await supabase
            .from('teacher_sessions')
            .delete()
            .eq('id', sessionId)
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (req.method === 'GET' && action === 'verify') {
      const sessionId = url.searchParams.get('sessionId')

      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: 'Сессия не найдена' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Проверяем сессию
      const { data: session } = await supabase
        .from('teacher_sessions')
        .select('*, teachers(*)')
        .eq('id', sessionId)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (!session) {
        return new Response(
          JSON.stringify({ error: 'Сессия истекла' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          teacher: {
            id: session.teachers.id,
            name: session.teachers.name,
            email: session.teachers.email,
            subjects: session.teachers.subjects,
            phone: session.teachers.phone
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
    console.error('Teacher auth error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
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