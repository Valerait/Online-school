-- ОЧИСТКА И СОЗДАНИЕ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ
-- Удаляем всех старых пользователей и создаем новых для тестирования

-- 1. ОЧИЩАЕМ ВСЕ ДАННЫЕ ПОЛЬЗОВАТЕЛЕЙ
DELETE FROM lesson_notes;
DELETE FROM payments;
DELETE FROM lessons;
DELETE FROM bookings;
DELETE FROM teacher_schedule;
DELETE FROM teachers;
DELETE FROM sessions;
DELETE FROM users;

-- 2. СОЗДАЕМ ТЕСТОВЫХ ПОЛЬЗОВАТЕЛЕЙ
-- Пароль для всех: 123456 (хеш: 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92)

-- Учащийся
INSERT INTO users (id, role, name, phone, password, email, grade, has_trial_lesson) VALUES
    ('11111111-1111-1111-1111-111111111111', 'student', 'Жанат Х', '+77777777783', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'student@test.kz', 8, false);

-- Преподаватель
INSERT INTO users (id, role, name, phone, password, email, grade, has_trial_lesson) VALUES
    ('22222222-2222-2222-2222-222222222222', 'teacher', 'Анна Петровна', '+77002222222', '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92', 'teacher@test.kz', null, false);

-- Администратор
INSERT INTO users (id, role, name, phone, password, email, grade, has_trial_lesson) VALUES
    ('33333333-3333-3333-3333-333333333333', 'admin', 'Администратор', 'newadmin@example.com', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'newadmin@example.com', null, false);

-- 3. СОЗДАЕМ ПРОФИЛЬ ПРЕПОДАВАТЕЛЯ
INSERT INTO teachers (id, user_id, bio, subjects, price_per_lesson, is_active) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Опытный преподаватель математики и английского языка с 10-летним стажем', ARRAY['Математика', 'Английский язык'], 7000.00, true);

-- 4. СОЗДАЕМ РАСПИСАНИЕ ПРЕПОДАВАТЕЛЯ (понедельник-пятница 9:00-18:00)
INSERT INTO teacher_schedule (teacher_id, day_of_week, time_start, time_end) 
SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, day, '09:00'::TIME, '18:00'::TIME
FROM generate_series(1, 5) as day;

-- 5. СОЗДАЕМ ТЕСТОВЫЕ ЗАЯВКИ
INSERT INTO bookings (id, user_id, teacher_id, subject, date, time, type, status, message) VALUES
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', null, 'Английский язык', CURRENT_DATE + INTERVAL '1 day', '10:00'::TIME, 'trial', 'pending', 'Первый пробный урок'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', null, 'Математика', CURRENT_DATE + INTERVAL '2 days', '12:00'::TIME, 'trial', 'pending', 'Пробный урок по математике');

COMMIT;