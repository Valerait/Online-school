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

    // Обработка GET запросов для тестирования
    if (req.method === 'GET') {
      if (action === 'test') {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Auth API работает!',
            timestamp: new Date().toISOString(),
            url: req.url
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'GET запросы поддерживаются только для тестирования. Используйте action=test' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const body = await req.json()

      if (action === 'register') {
        const { name, phone, password, grade, role = 'student' } = body

        console.log('🔐 Registration attempt:', { name, phone, role, grade })

        if (!name || !phone || !password) {
          return new Response(
            JSON.stringify({ error: 'Имя, телефон и пароль обязательны' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Валидация роли - преподавателей может создавать только администратор
        if (role === 'teacher') {
          return new Response(
            JSON.stringify({ error: 'Преподавателей может создавать только администратор' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!['student', 'admin'].includes(role)) {
          return new Response(
            JSON.stringify({ error: 'Неверная роль пользователя' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Проверяем, существует ли пользователь
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
            password: hashedPassword,
            grade: role === 'student' ? grade : null,
            role,
            email: body.email || null
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

        console.log('✅ User registered successfully:', user.id)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Регистрация прошла успешно',
            user: {
              id: user.id,
              name: user.name,
              phone: user.phone,
              role: user.role,
              grade: user.grade
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'login') {
        const { phone, email, password, role = 'student' } = body

        console.log('🔐 Login attempt:', { phone, email, role })

        if ((!phone && !email) || !password) {
          return new Response(
            JSON.stringify({ error: 'Телефон/email и пароль обязательны' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Находим пользователя по email (для админов) или по телефону (для остальных)
        let userQuery = supabase.from('users').select('*').eq('role', role)
        
        if (email && role === 'admin') {
          userQuery = userQuery.eq('email', email)
        } else if (phone) {
          userQuery = userQuery.eq('phone', phone)
        } else {
          return new Response(
            JSON.stringify({ error: 'Для администратора требуется email' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: user, error: userError } = await userQuery.single()

        console.log('🔐 User found:', { user: user?.id, error: userError })

        if (userError || !user) {
          const errorMsg = role === 'admin' ? 'Неверный email или пароль' : 'Неверный телефон или пароль'
          return new Response(
            JSON.stringify({ error: errorMsg }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Проверяем пароль
        const hashedPassword = await hashPassword(password)
        if (user.password !== hashedPassword) {
          return new Response(
            JSON.stringify({ error: 'Неверный телефон или пароль' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Создаем сессию
        const sessionId = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 дней

        const { error: sessionError } = await supabase
          .from('sessions')
          .insert({
            id: sessionId,
            user_id: user.id,
            expires_at: expiresAt.toISOString()
          })

        if (sessionError) {
          console.error('Session creation error:', sessionError)
          return new Response(
            JSON.stringify({ error: 'Ошибка создания сессии' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Если это преподаватель, получаем дополнительные данные
        let teacherData = null
        if (role === 'teacher') {
          const { data: teacher } = await supabase
            .from('teachers')
            .select('*')
            .eq('user_id', user.id)
            .single()
          
          teacherData = teacher
        }

        console.log('✅ Login successful:', user.id)

        return new Response(
          JSON.stringify({
            success: true,
            sessionId,
            user: {
              id: user.id,
              name: user.name,
              phone: user.phone,
              email: user.email,
              role: user.role,
              grade: user.grade,
              has_trial_lesson: user.has_trial_lesson
            },
            teacher: teacherData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'logout') {
        const { sessionId } = body

        if (sessionId) {
          await supabase
            .from('sessions')
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

      // Если это преподаватель, получаем дополнительные данные
      let teacherData = null
      if (session.users.role === 'teacher') {
        const { data: teacher } = await supabase
          .from('teachers')
          .select('*')
          .eq('user_id', session.users.id)
          .single()
        
        teacherData = teacher
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: session.users.id,
            name: session.users.name,
            phone: session.users.phone,
            email: session.users.email,
            role: session.users.role,
            grade: session.users.grade,
            has_trial_lesson: session.users.has_trial_lesson
          },
          teacher: teacherData
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Если действие не найдено в POST запросах
    return new Response(
      JSON.stringify({ error: `Неизвестное действие: ${action}. Доступные действия: register, login, verify` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Auth error:', error)
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