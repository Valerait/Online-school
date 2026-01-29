// SMS Service для отправки кодов подтверждения
// Используем SMS.RU API (популярный в СНГ)

const SMS_API_ID = Deno.env.get('SMS_API_ID') // Получить на sms.ru
const SMS_FROM = 'SCHOOL' // Имя отправителя

export interface SMSResponse {
  success: boolean
  message?: string
  balance?: number
}

export async function sendSMSCode(phone: string, code: string): Promise<SMSResponse> {
  // Для тестирования - всегда возвращаем успех
  const isDevelopment = Deno.env.get('NODE_ENV') !== 'production' || !Deno.env.get('SMS_API_ID')
  
  if (isDevelopment) {
    console.log(`📱 SMS Code for ${phone}: ${code}`)
    console.log(`🧪 Development mode: SMS sending simulated`)
    return { 
      success: true, 
      message: 'SMS sent (development mode - check console or use any 4-digit code)' 
    }
  }

  // Форматируем номер для международного формата
  const formattedPhone = formatPhoneForSMS(phone)
  
  const message = `Ваш код подтверждения для онлайн-школы: ${code}. Никому не сообщайте этот код!`

  try {
    // SMS.RU API
    const SMS_API_ID = Deno.env.get('SMS_API_ID')
    if (SMS_API_ID) {
      const response = await fetch('https://sms.ru/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          api_id: SMS_API_ID,
          to: formattedPhone,
          msg: message,
          from: SMS_FROM,
          json: '1'
        })
      })

      const data = await response.json()
      
      if (data.status === 'OK') {
        return { 
          success: true, 
          message: 'SMS sent successfully',
          balance: data.balance 
        }
      } else {
        console.error('SMS.RU Error:', data)
        return { 
          success: false, 
          message: data.status_text || 'Failed to send SMS' 
        }
      }
    }

    // Альтернативный провайдер - SMSC.RU
    const SMSC_LOGIN = Deno.env.get('SMSC_LOGIN')
    const SMSC_PASSWORD = Deno.env.get('SMSC_PASSWORD')
    
    if (SMSC_LOGIN && SMSC_PASSWORD) {
      const response = await fetch('https://smsc.ru/sys/send.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          login: SMSC_LOGIN,
          psw: SMSC_PASSWORD,
          phones: formattedPhone,
          mes: message,
          sender: SMS_FROM,
          fmt: '3' // JSON format
        })
      })

      const data = await response.json()
      
      if (data.error) {
        console.error('SMSC.RU Error:', data)
        return { 
          success: false, 
          message: data.error_code ? `Error ${data.error_code}` : 'Failed to send SMS' 
        }
      } else {
        return { 
          success: true, 
          message: 'SMS sent successfully' 
        }
      }
    }

    // Если нет настроенных провайдеров - возвращаем успех для тестирования
    console.log(`📱 MOCK SMS to ${formattedPhone}: ${code}`)
    return { 
      success: true, 
      message: 'SMS sent (mock mode - check console or use any 4-digit code)' 
    }

  } catch (error) {
    console.error('SMS sending error:', error)
    // В режиме разработки не возвращаем ошибку
    if (isDevelopment) {
      return { 
        success: true, 
        message: 'SMS sent (development mode - network error ignored)' 
      }
    }
    return { 
      success: false, 
      message: 'Failed to send SMS due to network error' 
    }
  }
}

function formatPhoneForSMS(phone: string): string {
  // Убираем все символы кроме цифр
  const cleaned = phone.replace(/\D/g, '')
  
  // Если начинается с 8, заменяем на 7
  if (cleaned.startsWith('8')) {
    return '7' + cleaned.slice(1)
  }
  
  // Если начинается с 7, оставляем как есть
  if (cleaned.startsWith('7')) {
    return cleaned
  }
  
  // Если 10 цифр, добавляем 7 в начало
  if (cleaned.length === 10) {
    return '7' + cleaned
  }
  
  return cleaned
}

export function generateSMSCode(): string {
  // Генерируем 4-значный код
  return Math.floor(1000 + Math.random() * 9000).toString()
}