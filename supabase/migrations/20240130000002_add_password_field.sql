-- Добавляем поле password в таблицу users
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;

-- Делаем поле password обязательным для новых записей
-- (существующие записи могут иметь NULL, но новые должны иметь пароль)
ALTER TABLE users ALTER COLUMN password SET DEFAULT '';

-- Обновляем существующие записи с пустым паролем (если есть)
UPDATE users SET password = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92' 
WHERE password IS NULL OR password = '';

-- Теперь делаем поле обязательным
ALTER TABLE users ALTER COLUMN password SET NOT NULL;