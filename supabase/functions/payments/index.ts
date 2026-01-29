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
      
      if (action === 'create-payment') {
        const { sessionId, lessonId, amount } = await req.json()

        if (!sessionId) {
          return new Response(
            JSON.stringify({ error: 'Требуется авторизация' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Проверяем сессию пользователя
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

        // Получаем информацию об уроке
        const { data: lesson, error: lessonError } = await supabase
          .from('lessons')
          .select(`
            *,
            teachers_new(
              price_per_lesson,
              users(name)
            )
          `)
          .eq('id', lessonId)
          .eq('student_id', session.users.id)
          .single()

        if (lessonError || !lesson) {
          return new Response(
            JSON.stringify({ error: 'Урок не найден' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Проверяем, что урок еще не оплачен
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('lesson_id', lessonId)
          .eq('status', 'paid')
          .single()

        if (existingPayment) {
          return new Response(
            JSON.stringify({ error: 'Урок уже оплачен' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Определяем сумму платежа
        const paymentAmount = amount || lesson.teachers_new?.price_per_lesson || 7000

        // Создаем запись о платеже
        const { data: payment, error: paymentError } = await supabase
          .from('payments')
          .insert({
            user_id: session.users.id,
            lesson_id: lessonId,
            amount: paymentAmount,
            currency: 'KZT',
            provider: 'kaspi',
            status: 'pending'
          })
          .select()
          .single()

        if (paymentError) {
          console.error('Payment creation error:', paymentError)
          return new Response(
            JSON.stringify({ error: 'Ошибка создания платежа' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Генерируем ссылку на оплату Kaspi Pay
        const kaspiPayUrl = generateKaspiPayUrl({
          amount: paymentAmount,
          orderId: payment.id,
          description: `Оплата урока ${lesson.subject} - ${lesson.date}`,
          studentName: session.users.name,
          teacherName: lesson.teachers_new?.users?.name
        })

        // Обновляем платеж с внешним ID
        await supabase
          .from('payments')
          .update({ external_payment_id: payment.id })
          .eq('id', payment.id)

        return new Response(
          JSON.stringify({
            success: true,
            payment: {
              id: payment.id,
              amount: paymentAmount,
              currency: 'KZT',
              status: 'pending'
            },
            kaspiPayUrl,
            lesson: {
              id: lesson.id,
              subject: lesson.subject,
              date: lesson.date,
              time: lesson.time
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } else if (action === 'webhook') {
        // Webhook от Kaspi Pay для подтверждения платежа
        const body = await req.json()
        
        console.log('💳 Kaspi Pay webhook received:', body)

        // Здесь должна быть логика проверки подписи от Kaspi
        // const isValidSignature = verifyKaspiSignature(body, req.headers)
        // if (!isValidSignature) {
        //   return new Response('Invalid signature', { status: 400 })
        // }

        const { orderId, status, transactionId } = body

        if (status === 'SUCCESS') {
          // Обновляем статус платежа
          const { data: payment, error: paymentError } = await supabase
            .from('payments')
            .update({
              status: 'paid',
              external_payment_id: transactionId
            })
            .eq('id', orderId)
            .select('lesson_id')
            .single()

          if (paymentError) {
            console.error('Payment update error:', paymentError)
            return new Response('Payment update failed', { status: 500 })
          }

          // Обновляем статус урока
          if (payment?.lesson_id) {
            await supabase
              .from('lessons')
              .update({ status: 'confirmed' })
              .eq('id', payment.lesson_id)

            console.log('✅ Payment confirmed and lesson status updated')
          }

          return new Response('OK', { status: 200 })
        } else {
          // Обновляем статус платежа как неудачный
          await supabase
            .from('payments')
            .update({ status: 'failed' })
            .eq('id', orderId)

          console.log('❌ Payment failed')
          return new Response('Payment failed', { status: 200 })
        }

      } else if (action === 'check-payment') {
        const { paymentId } = await req.json()

        const { data: payment, error } = await supabase
          .from('payments')
          .select(`
            *,
            lessons(
              id,
              subject,
              date,
              time,
              status
            )
          `)
          .eq('id', paymentId)
          .single()

        if (error || !payment) {
          return new Response(
            JSON.stringify({ error: 'Платеж не найден' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            payment: {
              id: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              status: payment.status,
              created_at: payment.created_at
            },
            lesson: payment.lessons
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

    } else if (req.method === 'GET') {
      
      if (action === 'user-payments') {
        const sessionId = url.searchParams.get('sessionId')

        if (!sessionId) {
          return new Response(
            JSON.stringify({ error: 'Требуется авторизация' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Проверяем сессию пользователя
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

        // Получаем платежи пользователя
        const { data: payments, error } = await supabase
          .from('payments')
          .select(`
            *,
            lessons(
              id,
              subject,
              date,
              time,
              status
            )
          `)
          .eq('user_id', session.users.id)
          .order('created_at', { ascending: false })

        if (error) {
          return new Response(
            JSON.stringify({ error: 'Ошибка получения платежей' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            payments: payments || []
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
    console.error('Payments API error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Функция генерации ссылки на Kaspi Pay
function generateKaspiPayUrl(params: {
  amount: number
  orderId: string
  description: string
  studentName: string
  teacherName?: string
}): string {
  // Это упрощенная версия. В реальности нужно использовать официальный API Kaspi
  const baseUrl = 'https://kaspi.kz/pay'
  const queryParams = new URLSearchParams({
    amount: params.amount.toString(),
    order_id: params.orderId,
    description: params.description,
    customer_name: params.studentName,
    // Добавьте другие необходимые параметры согласно документации Kaspi Pay
  })

  return `${baseUrl}?${queryParams.toString()}`
}

// Функция проверки подписи от Kaspi (заглушка)
function verifyKaspiSignature(body: any, headers: Headers): boolean {
  // Здесь должна быть реальная проверка подписи согласно документации Kaspi Pay
  // const signature = headers.get('X-Kaspi-Signature')
  // const calculatedSignature = calculateSignature(body, secretKey)
  // return signature === calculatedSignature
  
  return true // Временно возвращаем true для тестирования
}