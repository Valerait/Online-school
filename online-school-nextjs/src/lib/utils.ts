import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ru-RU')
}

export function formatTime(timeStr: string): string {
  return timeStr.substring(0, 5) // "14:00:00" -> "14:00"
}

export function getSubjectName(subject: string): string {
  const subjects: Record<string, string> = {
    'math': 'Математика',
    'physics': 'Физика',
    'chemistry': 'Химия',
    'russian': 'Русский язык',
    'literature': 'Литература',
    'english': 'Английский язык'
  }
  return subjects[subject] || subject
}

export function getStatusText(status: string): string {
  const statuses: Record<string, string> = {
    'pending': 'Ожидает',
    'confirmed': 'Подтверждено',
    'rejected': 'Отклонено',
    'completed': 'Завершено',
    'canceled': 'Отменено',
    'scheduled': 'Запланировано',
    'in_progress': 'В процессе'
  }
  return statuses[status] || status
}

export function formatPhone(phone: string): string {
  // Форматирует телефон в казахстанский формат
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('7') && cleaned.length === 11) {
    return `+7 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`
  }
  return phone
}