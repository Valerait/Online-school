-- ПОЛНАЯ ОЧИСТКА И ПЕРЕСОЗДАНИЕ БАЗЫ ДАННЫХ
-- Согласно skill.md требованиям

-- 1. УДАЛЯЕМ ВСЕ СТАРЫЕ ТАБЛИЦЫ И СВЯЗИ
DROP TABLE IF EXISTS lesson_notes CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS teacher_schedule CASCADE;
DROP TABLE IF EXISTS teachers_new CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS teacher_sessions CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS sms_codes CASCADE;
DROP TABLE IF EXISTS pending_registrations CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. СОЗДАЕМ ТАБЛИЦУ USERS (основная таблица пользователей)
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher', 'admin')),
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    grade INTEGER, -- Класс для студентов
    has_trial_lesson BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. СОЗДАЕМ ТАБЛИЦУ TEACHERS (профили преподавателей)
CREATE TABLE teachers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    subjects TEXT[] NOT NULL, -- Array of subjects they teach
    price_per_lesson DECIMAL(10,2) DEFAULT 7000.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 4. СОЗДАЕМ ТАБЛИЦУ TEACHER_SCHEDULE (расписание преподавателей)
CREATE TABLE teacher_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. СОЗДАЕМ ТАБЛИЦУ LESSONS (уроки)
CREATE TABLE lessons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Ссылка на user_id преподавателя
    subject TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    time_start TIME NOT NULL,
    time_end TIME NOT NULL,
    type TEXT NOT NULL DEFAULT 'trial' CHECK (type IN ('trial', 'paid')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'canceled')),
    meeting_link TEXT, -- Jitsi room name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. СОЗДАЕМ ТАБЛИЦУ BOOKINGS (заявки на уроки)
CREATE TABLE bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Ссылка на user_id преподавателя
    subject TEXT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    type TEXT NOT NULL DEFAULT 'trial' CHECK (type IN ('trial', 'paid')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. СОЗДАЕМ ТАБЛИЦУ PAYMENTS (платежи)
CREATE TABLE payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'KZT',
    provider TEXT DEFAULT 'kaspi' CHECK (provider IN ('kaspi')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. СОЗДАЕМ ТАБЛИЦУ LESSON_NOTES (заметки к урокам)
CREATE TABLE lesson_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    teacher_comment TEXT,
    homework TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lesson_id)
);

-- 9. СОЗДАЕМ ТАБЛИЦУ SESSIONS (сессии пользователей)
CREATE TABLE sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. СОЗДАЕМ ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_teachers_user_id ON teachers(user_id);
CREATE INDEX idx_teacher_schedule_teacher_id ON teacher_schedule(teacher_id);
CREATE INDEX idx_lessons_student_id ON lessons(student_id);
CREATE INDEX idx_lessons_teacher_id ON lessons(teacher_id);
CREATE INDEX idx_lessons_date ON lessons(date);
CREATE INDEX idx_lessons_status ON lessons(status);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_teacher_id ON bookings(teacher_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_lesson_id ON payments(lesson_id);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- 11. ВКЛЮЧАЕМ ROW LEVEL SECURITY (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 12. СОЗДАЕМ RLS ПОЛИТИКИ

-- Политики для users
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text AND u.role = 'admin'
        )
    );

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Политики для teachers
CREATE POLICY "Teachers can view own data" ON teachers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = user_id AND u.id::text = auth.uid()::text
        )
    );

CREATE POLICY "Teachers can update own data" ON teachers
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = user_id AND u.id::text = auth.uid()::text
        )
    );

CREATE POLICY "Admins can manage teachers" ON teachers
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text AND u.role = 'admin'
        )
    );

-- Политики для teacher_schedule
CREATE POLICY "Teachers can manage own schedule" ON teacher_schedule
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM teachers t
            JOIN users u ON t.user_id = u.id
            WHERE t.id = teacher_id AND u.id::text = auth.uid()::text
        )
    );

CREATE POLICY "Students can view teacher schedules" ON teacher_schedule
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text AND u.role = 'student'
        )
    );

-- Политики для lessons
CREATE POLICY "Students can view own lessons" ON lessons
    FOR SELECT USING (
        student_id::text = auth.uid()::text
    );

CREATE POLICY "Teachers can view own lessons" ON lessons
    FOR SELECT USING (
        teacher_id::text = auth.uid()::text
    );

CREATE POLICY "Admins can view all lessons" ON lessons
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text AND u.role = 'admin'
        )
    );

CREATE POLICY "Teachers can update own lessons" ON lessons
    FOR UPDATE USING (
        teacher_id::text = auth.uid()::text
    );

-- Политики для bookings
CREATE POLICY "Students can view own bookings" ON bookings
    FOR SELECT USING (
        user_id::text = auth.uid()::text
    );

CREATE POLICY "Students can create bookings" ON bookings
    FOR INSERT WITH CHECK (
        user_id::text = auth.uid()::text
    );

CREATE POLICY "Teachers can view relevant bookings" ON bookings
    FOR SELECT USING (
        teacher_id::text = auth.uid()::text OR
        EXISTS (
            SELECT 1 FROM users u, teachers t
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'teacher'
            AND t.user_id = u.id
            AND subject = ANY(t.subjects)
        )
    );

CREATE POLICY "Teachers can update bookings" ON bookings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users u, teachers t
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'teacher'
            AND t.user_id = u.id
            AND subject = ANY(t.subjects)
        )
    );

-- Политики для payments
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (
        user_id::text = auth.uid()::text
    );

CREATE POLICY "Admins can view all payments" ON payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id::text = auth.uid()::text AND u.role = 'admin'
        )
    );

-- Политики для lesson_notes
CREATE POLICY "Students can view notes for own lessons" ON lesson_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lessons l
            WHERE l.id = lesson_id AND l.student_id::text = auth.uid()::text
        )
    );

CREATE POLICY "Teachers can manage notes for own lessons" ON lesson_notes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM lessons l
            WHERE l.id = lesson_id AND l.teacher_id::text = auth.uid()::text
        )
    );

-- Политики для sessions (публичные для API)
CREATE POLICY "Sessions are publicly accessible" ON sessions
    FOR ALL USING (true);

-- 13. ВСТАВЛЯЕМ ТЕСТОВЫЕ ДАННЫЕ

-- Тестовые пользователи
INSERT INTO users (id, role, name, phone, email, grade, has_trial_lesson) VALUES
    ('11111111-1111-1111-1111-111111111111', 'student', 'Жанат Х', '+77001111111', 'student@example.com', 8, false),
    ('22222222-2222-2222-2222-222222222222', 'teacher', 'Анна Петровна', '+77002222222', 'teacher@example.com', null, false),
    ('33333333-3333-3333-3333-333333333333', 'admin', 'Администратор', '+77003333333', 'admin@example.com', null, false);

-- Тестовый преподаватель
INSERT INTO teachers (user_id, bio, subjects, price_per_lesson, is_active) VALUES
    ('22222222-2222-2222-2222-222222222222', 'Опытный преподаватель математики и физики', ARRAY['math', 'physics'], 7000.00, true);

-- Тестовое расписание преподавателя (понедельник-пятница 9:00-18:00)
INSERT INTO teacher_schedule (teacher_id, day_of_week, time_start, time_end) 
SELECT t.id, day, '09:00'::TIME, '18:00'::TIME
FROM teachers t, generate_series(1, 5) as day
WHERE t.user_id = '22222222-2222-2222-2222-222222222222';

-- Тестовая заявка
INSERT INTO bookings (user_id, subject, date, time, type, status) VALUES
    ('11111111-1111-1111-1111-111111111111', 'math', CURRENT_DATE + INTERVAL '1 day', '12:00'::TIME, 'trial', 'pending');

COMMIT;