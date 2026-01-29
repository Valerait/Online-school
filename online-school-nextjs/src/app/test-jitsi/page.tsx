'use client'

import { useState } from 'react'
import { JitsiMeeting } from '@/components/JitsiMeeting'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

export default function TestJitsiPage() {
  const [meetingStarted, setMeetingStarted] = useState(false)
  const [roomName, setRoomName] = useState('test-room-' + Date.now())
  const [displayName, setDisplayName] = useState('Тестовый пользователь')
  const [userRole, setUserRole] = useState<'student' | 'teacher'>('student')

  const handleMeetingStart = () => {
    console.log('Meeting started')
  }

  const handleMeetingEnd = () => {
    console.log('Meeting ended')
    setMeetingStarted(false)
  }

  if (meetingStarted) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <JitsiMeeting
          roomName={roomName}
          displayName={displayName}
          userRole={userRole}
          onMeetingStart={handleMeetingStart}
          onMeetingEnd={handleMeetingEnd}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Тест Jitsi Meet</h1>
        
        <div className="space-y-4">
          <Input
            label="Имя комнаты"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Введите имя комнаты"
          />
          
          <Input
            label="Ваше имя"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Введите ваше имя"
          />
          
          <Select
            label="Роль"
            value={userRole}
            onChange={(e) => setUserRole(e.target.value as 'student' | 'teacher')}
            options={[
              { value: 'student', label: 'Ученик' },
              { value: 'teacher', label: 'Преподаватель' }
            ]}
          />
          
          <Button
            onClick={() => setMeetingStarted(true)}
            className="w-full"
            disabled={!roomName || !displayName}
          >
            🎥 Начать тестовую встречу
          </Button>
        </div>
        
        <div className="mt-6 text-sm text-gray-500 text-center">
          <p>💡 Это тестовая страница для проверки Jitsi Meet</p>
          <p>🔊 Убедитесь, что у вас есть доступ к камере и микрофону</p>
        </div>
      </div>
    </div>
  )
}