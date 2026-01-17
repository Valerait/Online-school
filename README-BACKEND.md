# Backend для онлайн-школы

## Установка и запуск

### 1. Установите Node.js
Скачайте и установите Node.js с https://nodejs.org/

### 2. Установите зависимости
```bash
npm install
```

### 3. Запустите сервер
```bash
npm start
```

Или для разработки с автоперезагрузкой:
```bash
npm run dev
```

## Доступ

- **Главная страница**: http://localhost:3000
- **Админ-панель**: http://localhost:3000/admin

## Что работает

### ✅ Главная страница
- Форма записи с валидацией телефона
- Отправка заявок в базу данных
- Интеграция с Google Calendar

### ✅ Админ-панель
- **Дашборд**: Реальная статистика из БД
- **Расписание**: Список занятий, проверка окон
- **База учеников**: Управление учениками
- **Финансы**: Транзакции, генерация Kaspi ссылок
- **Контент**: Редактирование материалов

### ✅ API Endpoints
- `POST /api/bookings` - Создание заявки
- `GET /api/dashboard` - Статистика дашборда
- `GET /api/students` - Список учеников
- `GET /api/lessons` - Расписание занятий
- `GET /api/transactions` - Финансовые операции
- `POST /api/kaspi-link` - Генерация ссылки оплаты

### ✅ База данных (SQLite)
- Автоматическое создание таблиц
- Тестовые данные при первом запуске
- Хранение заявок, учеников, занятий, транзакций

## Деплой на Vercel

1. Установите Vercel CLI:
```bash
npm i -g vercel
```

2. Деплой:
```bash
vercel
```

3. Настройте в vercel.json:
```json
{
  "functions": {
    "server.js": {
      "runtime": "nodejs18.x"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/server.js"
    },
    {
      "source": "/admin",
      "destination": "/admin/index.html"
    }
  ]
}
```

## Структура проекта

```
├── server.js           # Backend сервер
├── package.json        # Зависимости
├── school.db          # База данных SQLite
├── index.html         # Главная страница
├── styles.css         # Стили главной
├── script.js          # JS главной
├── admin/
│   ├── index.html     # Админ-панель
│   ├── admin-styles.css
│   └── admin-script.js
└── README-BACKEND.md  # Этот файл
```