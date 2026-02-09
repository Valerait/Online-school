# 📸 Modal Screenshot Service для meas.kz

Автоматический сервис для ежедневных скриншотов сайта meas.kz с использованием Modal.

## 🚀 Возможности

- ✅ Автоматические скриншоты каждый день в 15:00 по Алматы (9:00 UTC)
- ✅ Полностью serverless - работает в облаке Modal
- ✅ Сохранение всех скриншотов в Modal Volume
- ✅ Скриншоты всей страницы (full page)
- ✅ Высокое разрешение (1920x1080)
- ✅ Ручной запуск для тестирования

## 📋 Требования

- Python 3.11+
- Modal аккаунт (уже настроен)
- Установленный Modal CLI

## 🔧 Установка

Modal уже установлен и настроен! Просто разверните приложение:

```bash
# Деплой приложения в Modal
modal deploy modal_screenshot.py
```

## 🎯 Использование

### Автоматический режим

После деплоя скриншоты будут создаваться автоматически каждый день в 15:00 по Алматы.

### Ручной запуск (для тестирования)

```bash
# Запустить скриншот прямо сейчас
modal run modal_screenshot.py

# Или через Python
python3 -c "import modal; modal.Function.lookup('meas-kz-screenshot', 'take_screenshot_now').remote()"
```

### Просмотр скриншотов

```bash
# Показать список всех скриншотов
modal run modal_screenshot.py::list_screenshots
```

### Скачать скриншот

```python
import modal

# Получить список скриншотов
list_fn = modal.Function.lookup("meas-kz-screenshot", "list_screenshots")
screenshots = list_fn.remote()

# Скачать конкретный скриншот
download_fn = modal.Function.lookup("meas-kz-screenshot", "download_screenshot")
result = download_fn.remote(filename="meas_kz_2026-02-03_09-00-00.png")

# Сохранить локально
with open("screenshot.png", "wb") as f:
    f.write(result["data"])
```

## 📊 Мониторинг

### Просмотр логов

```bash
# Просмотр логов приложения
modal app logs meas-kz-screenshot

# Просмотр логов конкретной функции
modal logs take_daily_screenshot
```

### Просмотр расписания

```bash
# Показать все запланированные задачи
modal app list
```

## 🔄 Изменение расписания

Отредактируйте строку в `modal_screenshot.py`:

```python
schedule=modal.Cron("0 9 * * *")  # Каждый день в 9:00 UTC
```

Примеры расписаний:
- `"0 9 * * *"` - каждый день в 9:00 UTC (15:00 Алматы)
- `"0 */6 * * *"` - каждые 6 часов
- `"0 9 * * 1"` - каждый понедельник в 9:00 UTC
- `"0 9 1 * *"` - первое число каждого месяца в 9:00 UTC

После изменения:
```bash
modal deploy modal_screenshot.py
```

## 📁 Структура файлов

```
/screenshots/
├── meas_kz_2026-02-03_09-00-00.png
├── meas_kz_2026-02-04_09-00-00.png
├── meas_kz_2026-02-05_09-00-00.png
└── ...
```

Формат имени: `meas_kz_YYYY-MM-DD_HH-MM-SS.png`

## 🛠 Настройки скриншота

В коде можно изменить:

```python
# Размер окна браузера
viewport={'width': 1920, 'height': 1080}

# Таймаут загрузки страницы
timeout=60000  # 60 секунд

# Задержка перед скриншотом
await page.wait_for_timeout(3000)  # 3 секунды

# Тип скриншота
full_page=True  # Вся страница или только видимая область
```

## 💰 Стоимость

Modal предоставляет бесплатный tier:
- $30 бесплатных кредитов в месяц
- Этого достаточно для ~1000 скриншотов в месяц
- Один скриншот занимает ~2-3 секунды CPU времени

## 🔐 Безопасность

- Скриншоты хранятся в приватном Modal Volume
- Доступ только через ваш Modal аккаунт
- Можно настроить дополнительные секреты через Modal Secrets

## 📞 Поддержка

### Проблемы с деплоем

```bash
# Проверить статус
modal app list

# Перезапустить
modal deploy modal_screenshot.py --force
```

### Проблемы со скриншотами

```bash
# Посмотреть логи последнего запуска
modal app logs meas-kz-screenshot --tail 100
```

### Очистка старых скриншотов

```python
# Можно добавить функцию для очистки старых файлов
@app.function(volumes={"/screenshots": screenshots_volume})
def cleanup_old_screenshots(days_to_keep: int = 30):
    import os
    from datetime import datetime, timedelta
    
    cutoff_date = datetime.now() - timedelta(days=days_to_keep)
    deleted = 0
    
    for filename in os.listdir("/screenshots"):
        if filename.endswith('.png'):
            filepath = f"/screenshots/{filename}"
            mtime = os.path.getmtime(filepath)
            if datetime.fromtimestamp(mtime) < cutoff_date:
                os.remove(filepath)
                deleted += 1
    
    screenshots_volume.commit()
    return {"deleted": deleted}
```

## 🎉 Готово!

Ваш сервис скриншотов настроен и готов к работе. Скриншоты будут создаваться автоматически каждый день!

---

**Создано**: 3 февраля 2026  
**Автор**: Kiro AI Assistant  
**Сайт**: https://meas.kz
