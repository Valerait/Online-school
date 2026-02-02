# Исправление схемы базы данных - добавление поля password

## 🚨 Проблема
В продакшн базе данных отсутствует поле `password` в таблице `users`, что вызывает ошибку при регистрации пользователей.

**Текущие поля в таблице users:**
- id
- role  
- name
- phone
- email
- grade
- has_trial_lesson
- created_at

**Отсутствует:** `password`

## 🔧 Решение

### Вариант 1: Через Supabase Dashboard (рекомендуется)

1. Откройте Supabase Dashboard: https://supabase.com/dashboard/project/obzatycdwtdmhgqotbgs
2. Перейдите в раздел **SQL Editor**
3. Выполните следующий SQL код:

```sql
-- Добавляем поле password в таблицу users
ALTER TABLE users ADD COLUMN password TEXT;

-- Устанавливаем пароль по умолчанию для существующих пользователей
-- (хеш пароля "123456")
UPDATE users 
SET password = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' 
WHERE password IS NULL;

-- Делаем поле password обязательным
ALTER TABLE users ALTER COLUMN password SET NOT NULL;
```

### Вариант 2: Через миграцию (если получится)

```bash
supabase db push --linked --include-all
```

## ✅ Проверка

После выполнения SQL команд проверьте:

1. **Структура таблицы:**
```bash
curl -X GET "https://obzatycdwtdmhgqotbgs.supabase.co/functions/v1/fix-schema" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iemF0eWNkd3RkbWhncW90YmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1OTM2NDQsImV4cCI6MjA4NTE2OTY0NH0.Y487UOuC1P8f2AKpbXnGLVZAtqObJK3wosg5LIV_aSA"
```

Должно вернуть: `"hasPasswordField": true`

2. **Регистрация пользователя:**
```bash
curl -X POST "https://obzatycdwtdmhgqotbgs.supabase.co/functions/v1/auth-v2?action=register" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iemF0eWNkd3RkbWhncW90YmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1OTM2NDQsImV4cCI6MjA4NTE2OTY0NH0.Y487UOuC1P8f2AKpbXnGLVZAtqObJK3wosg5LIV_aSA" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Student","phone":"+77777777783","password":"123456","role":"student","grade":10}'
```

Должно вернуть: `{"success": true, ...}`

## 🔐 Данные администратора

После исправления схемы можно будет создать администратора:

```bash
curl -X POST "https://obzatycdwtdmhgqotbgs.supabase.co/functions/v1/auth-v2?action=register" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iemF0eWNkd3RkbWhncW90YmdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1OTM2NDQsImV4cCI6MjA4NTE2OTY0NH0.Y487UOuC1P8f2AKpbXnGLVZAtqObJK3wosg5LIV_aSA" \
  -H "Content-Type: application/json" \
  -d '{"name":"Главный Администратор","phone":"+77777777777","password":"admin123","role":"admin","email":"admin@example.com"}'
```

## 📋 После исправления

1. Регистрация пользователей будет работать
2. Можно будет создать администратора
3. Система аутентификации заработает полностью
4. Админ-панель станет доступной

## 🗑️ Очистка

После исправления можно удалить временную функцию:
```bash
supabase functions delete fix-schema --project-ref obzatycdwtdmhgqotbgs
```