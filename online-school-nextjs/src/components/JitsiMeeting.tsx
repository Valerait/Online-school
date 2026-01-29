'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'

interface JitsiMeetingProps {
  roomName: string
  displayName: string
  userRole: 'student' | 'teacher'
  onMeetingEnd?: () => void
  onMeetingStart?: () => void
}

declare global {
  interface Window {
    JitsiMeetExternalAPI: any
  }
}

export function JitsiMeeting({ 
  roomName, 
  displayName, 
  userRole,
  onMeetingEnd,
  onMeetingStart 
}: JitsiMeetingProps) {
  const jitsiContainerRef = useRef<HTMLDivElement>(null)
  const [api, setApi] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Загружаем Jitsi Meet API
    const loadJitsiScript = () => {
      return new Promise((resolve, reject) => {
        if (window.JitsiMeetExternalAPI) {
          resolve(window.JitsiMeetExternalAPI)
          return
        }

        const script = document.createElement('script')
        script.src = 'https://meet.jit.si/external_api.js'
        script.async = true
        script.onload = () => resolve(window.JitsiMeetExternalAPI)
        script.onerror = () => reject(new Error('Failed to load Jitsi Meet API'))
        document.head.appendChild(script)
      })
    }

    const initializeJitsi = async () => {
      try {
        await loadJitsiScript()
        
        if (!jitsiContainerRef.current) return

        // Конфигурация Jitsi Meet
        const options = {
          roomName: roomName,
          width: '100%',
          height: 600,
          parentNode: jitsiContainerRef.current,
          configOverwrite: {
            startWithAudioMuted: userRole === 'student', // Студенты начинают с выключенным микрофоном
            startWithVideoMuted: false,
            enableWelcomePage: false,
            enableClosePage: false,
            prejoinPageEnabled: false,
            disableInviteFunctions: true,
            doNotStoreRoom: true,
            disableProfile: true,
            hideConferenceTimer: false,
            enableNoisyMicDetection: true,
            resolution: 720,
            constraints: {
              video: {
                height: { ideal: 720, max: 720, min: 240 }
              }
            }
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: userRole === 'teacher' 
              ? [
                  'microphone', 'camera', 'closedcaptions', 'desktop', 
                  'fullscreen', 'fodeviceselection', 'hangup', 'profile',
                  'chat', 'recording', 'livestreaming', 'etherpad', 
                  'sharedvideo', 'settings', 'raisehand', 'videoquality',
                  'filmstrip', 'invite', 'feedback', 'stats', 'shortcuts',
                  'tileview', 'videobackgroundblur', 'download', 'help'
                ]
              : [
                  'microphone', 'camera', 'closedcaptions', 'fullscreen',
                  'fodeviceselection', 'hangup', 'chat', 'raisehand',
                  'filmstrip', 'settings', 'videoquality', 'tileview'
                ],
            SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar'],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            BRAND_WATERMARK_LINK: '',
            SHOW_POWERED_BY: false,
            SHOW_PROMOTIONAL_CLOSE_PAGE: false,
            SHOW_CHROME_EXTENSION_BANNER: false,
            MOBILE_APP_PROMO: false,
            NATIVE_APP_NAME: 'Онлайн-репетиторство',
            PROVIDER_NAME: 'Онлайн-репетиторство',
            LANG_DETECTION: true,
            CONNECTION_INDICATOR_AUTO_HIDE_ENABLED: true,
            CONNECTION_INDICATOR_AUTO_HIDE_TIMEOUT: 5000,
            VIDEO_LAYOUT_FIT: 'nocrop',
            filmStripOnly: false,
            VERTICAL_FILMSTRIP: true
          },
          userInfo: {
            displayName: displayName,
            email: `${userRole}@online-school.kz`
          }
        }

        // Создаем экземпляр Jitsi Meet
        const jitsiApi = new window.JitsiMeetExternalAPI('meet.jit.si', options)
        
        // Настраиваем обработчики событий
        jitsiApi.addEventListener('videoConferenceJoined', () => {
          console.log('User joined the meeting')
          setIsLoading(false)
          onMeetingStart?.()
          
          // Если это преподаватель, даем права модератора
          if (userRole === 'teacher') {
            setTimeout(() => {
              jitsiApi.executeCommand('toggleLobby', false)
            }, 1000)
          }
        })

        jitsiApi.addEventListener('videoConferenceLeft', () => {
          console.log('User left the meeting')
          onMeetingEnd?.()
        })

        jitsiApi.addEventListener('readyToClose', () => {
          console.log('Meeting is ready to close')
          onMeetingEnd?.()
        })

        jitsiApi.addEventListener('participantJoined', (participant: any) => {
          console.log('Participant joined:', participant)
        })

        jitsiApi.addEventListener('participantLeft', (participant: any) => {
          console.log('Participant left:', participant)
        })

        // Обработка ошибок
        jitsiApi.addEventListener('errorOccurred', (error: any) => {
          console.error('Jitsi error:', error)
          setError('Произошла ошибка во время видеозвонка')
        })

        setApi(jitsiApi)
        setError(null)

      } catch (err) {
        console.error('Failed to initialize Jitsi:', err)
        setError('Не удалось загрузить видеозвонок. Проверьте подключение к интернету.')
        setIsLoading(false)
      }
    }

    initializeJitsi()

    // Cleanup при размонтировании компонента
    return () => {
      if (api) {
        api.dispose()
      }
    }
  }, [roomName, displayName, userRole])

  const endMeeting = () => {
    if (api) {
      api.executeCommand('hangup')
    }
  }

  const toggleMicrophone = () => {
    if (api) {
      api.executeCommand('toggleAudio')
    }
  }

  const toggleCamera = () => {
    if (api) {
      api.executeCommand('toggleVideo')
    }
  }

  const toggleScreenShare = () => {
    if (api) {
      api.executeCommand('toggleShareScreen')
    }
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-semibold">Ошибка видеозвонка</h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          Перезагрузить страницу
        </Button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Заголовок */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Видеоурок</h3>
            <p className="text-blue-100 text-sm">Комната: {roomName}</p>
          </div>
          <div className="flex space-x-2">
            {userRole === 'teacher' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleScreenShare}
                  className="text-white border-white hover:bg-white hover:text-blue-600"
                >
                  📺 Экран
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={toggleMicrophone}
              className="text-white border-white hover:bg-white hover:text-blue-600"
            >
              🎤 Микрофон
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={toggleCamera}
              className="text-white border-white hover:bg-white hover:text-blue-600"
            >
              📹 Камера
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={endMeeting}
              className="bg-red-600 hover:bg-red-700"
            >
              Завершить
            </Button>
          </div>
        </div>
      </div>

      {/* Контейнер для Jitsi */}
      <div className="relative">
        {isLoading && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Подключение к видеозвонку...</p>
              <p className="text-sm text-gray-500 mt-2">
                {userRole === 'teacher' ? 'Вы присоединяетесь как преподаватель' : 'Вы присоединяетесь как ученик'}
              </p>
            </div>
          </div>
        )}
        <div ref={jitsiContainerRef} className="w-full" style={{ minHeight: '600px' }} />
      </div>

      {/* Информация для пользователей */}
      <div className="bg-gray-50 p-4 border-t">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 ${isLoading ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
              {isLoading ? 'Подключение...' : 'Подключено'}
            </span>
            <span>Роль: {userRole === 'teacher' ? 'Преподаватель' : 'Ученик'}</span>
          </div>
          <div className="text-xs text-gray-500">
            Powered by Jitsi Meet
          </div>
        </div>
      </div>
    </div>
  )
}