'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { apiCall } from '@/lib/supabase'

interface User {
  id: string
  name: string
  phone: string
  email?: string
  role: 'student' | 'teacher' | 'admin'
  grade?: number
  has_trial_lesson: boolean
  created_at: string
}

export default function AdminUsersPage() {
  const { user, sessionId } = useAuth()
  const router = useRouter()
  
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  const [newUser, setNewUser] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'student' as 'student' | 'teacher' | 'admin',
    grade: '',
    password: ''
  })

  useEffect(() => {
    if (!user || !sessionId) {
      router.push('/login')
      return
    }

    if (user.role !== 'admin') {
      router.push('/')
      return
    }

    loadUsers()
  }, [user, sessionId, router])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, roleFilter])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await apiCall(`/admin?action=users&sessionId=${sessionId}`)
      
      if (data.success) {
        setUsers(data.users || [])
      } else {
        setError(data.error || 'Ошибка загрузки пользователей')
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone.includes(searchTerm) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }

  const createUser = async () => {
    try {
      const userData = {
        ...newUser,
        grade: newUser.grade ? parseInt(newUser.grade) : null
      }

      const data = await apiCall(`/admin?action=create-user&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify(userData)
      })

      if (data.success) {
        setShowCreateModal(false)
        setNewUser({
          name: '',
          phone: '',
          email: '',
          role: 'student',
          grade: '',
          password: ''
        })
        loadUsers()
      } else {
        setError(data.error || 'Ошибка создания пользователя')
      }
    } catch (error) {
      console.error('Error creating user:', error)
      setError('Ошибка создания пользователя')
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const data = await apiCall(`/admin?action=update-user-role&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ userId, role: newRole })
      })

      if (data.success) {
        loadUsers()
      } else {
        setError(data.error || 'Ошибка обновления роли')
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      setError('Ошибка обновления роли')
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      return
    }

    try {
      const data = await apiCall(`/admin?action=delete-user&sessionId=${sessionId}`, {
        method: 'POST',
        body: JSON.stringify({ userId })
      })

      if (data.success) {
        loadUsers()
      } else {
        setError(data.error || 'Ошибка удаления пользователя')
      }
    } catch (error) {
      console.error('Error deleting user:', error)
      setError('Ошибка удаления пользователя')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800'
      case 'teacher': return 'bg-orange-100 text-orange-800'
      case 'student': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleText = (role: string) => {
    switch (role) {
      case 'admin': return 'Админ'
      case 'teacher': return 'Преподаватель'
      case 'student': return 'Студент'
      default: return role
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Загрузка пользователей...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                👥 Управление пользователями
              </h1>
              <p className="text-purple-100 mt-1">Всего пользователей: {users.length}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => router.push('/admin')}
                variant="outline"
                className="text-white border-white hover:bg-white hover:text-purple-600"
              >
                ← Назад в админку
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Фильтры и поиск */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <Input
                placeholder="Поиск по имени, телефону или email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="md:w-80"
              />
              
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Все роли' },
                  { value: 'student', label: 'Студенты' },
                  { value: 'teacher', label: 'Преподаватели' },
                  { value: 'admin', label: 'Администраторы' }
                ]}
              />
            </div>
            
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-green-600 hover:bg-green-700"
            >
              + Создать пользователя
            </Button>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            Показано: {filteredUsers.length} из {users.length} пользователей
          </div>
        </div>

        {/* Таблица пользователей */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Пользователь
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Контакты
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Роль
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дополнительно
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Дата регистрации
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-purple-600 font-medium">
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.phone}</div>
                      {user.email && (
                        <div className="text-sm text-gray-500">{user.email}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {getRoleText(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.role === 'student' && (
                        <div>
                          {user.grade && <div>Класс: {user.grade}</div>}
                          <div>Пробный урок: {user.has_trial_lesson ? '✅ Прошел' : '❌ Не прошел'}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          options={[
                            { value: 'student', label: 'Студент' },
                            { value: 'teacher', label: 'Преподаватель' },
                            { value: 'admin', label: 'Админ' }
                          ]}
                          className="text-xs"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteUser(user.id)}
                          disabled={user.id === user?.id} // Нельзя удалить себя
                        >
                          Удалить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Пользователи не найдены
          </div>
        )}
      </div>

      {/* Модальное окно создания пользователя */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Создать нового пользователя</h3>
            
            <div className="space-y-4">
              <Input
                label="Имя"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                required
              />
              
              <Input
                label="Телефон"
                value={newUser.phone}
                onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                placeholder="+77001234567"
                required
              />
              
              <Input
                label="Email (необязательно)"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
              />
              
              <Select
                label="Роль"
                value={newUser.role}
                onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                options={[
                  { value: 'student', label: 'Студент' },
                  { value: 'teacher', label: 'Преподаватель' },
                  { value: 'admin', label: 'Администратор' }
                ]}
              />
              
              {newUser.role === 'student' && (
                <Input
                  label="Класс (необязательно)"
                  type="number"
                  value={newUser.grade}
                  onChange={(e) => setNewUser({...newUser, grade: e.target.value})}
                  min="1"
                  max="11"
                />
              )}
              
              <Input
                label="Пароль"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                required
              />
            </div>
            
            <div className="flex gap-2 mt-6">
              <Button
                onClick={createUser}
                className="flex-1"
                disabled={!newUser.name || !newUser.phone || !newUser.password}
              >
                Создать
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Отмена
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}