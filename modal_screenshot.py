"""
Modal приложение для ежедневных скриншотов сайта meas.kz
Запускается автоматически каждый день в 9:00 UTC (15:00 по Алматы)
Отправляет скриншоты в Telegram
"""

import modal
from datetime import datetime
import io

# Telegram Bot Token
TELEGRAM_BOT_TOKEN = "8404048934:AAEZeZxm4gpo2iZQYBd9o7ycT7BeV-d7hvQ"
# Ваш Telegram Chat ID
TELEGRAM_CHAT_ID = "430298199"

# Создаем Modal приложение
app = modal.App("meas-kz-screenshot")

# Создаем образ с необходимыми зависимостями
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "playwright==1.48.0",
    "pillow==11.1.0",
    "requests==2.32.3"
).run_commands(
    "playwright install chromium",
    "playwright install-deps chromium"
)

# Создаем Volume для хранения скриншотов (персистентное хранилище)
screenshots_volume = modal.Volume.from_name("meas-screenshots-v2", create_if_missing=True)


def send_to_telegram(screenshot_bytes: bytes, filename: str, title: str, timestamp: str):
    """
    Отправляет скриншот в Telegram
    """
    import requests
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendPhoto"
    
    caption = f"📸 Скриншот сайта meas.kz\n\n"
    caption += f"🕐 Время: {timestamp}\n"
    caption += f"📄 Заголовок: {title}\n"
    caption += f"📦 Размер: {len(screenshot_bytes) / 1024:.2f} KB"
    
    files = {
        'photo': (filename, screenshot_bytes, 'image/png')
    }
    
    data = {
        'chat_id': TELEGRAM_CHAT_ID,
        'caption': caption
    }
    
    try:
        response = requests.post(url, files=files, data=data, timeout=30)
        response.raise_for_status()
        print(f"✅ Скриншот отправлен в Telegram")
        return True
    except Exception as e:
        print(f"❌ Ошибка отправки в Telegram: {str(e)}")
        return False

@app.function(
    image=image,
    schedule=modal.Cron("0 9 * * *"),  # Каждый день в 9:00 UTC (15:00 Алматы)
    volumes={"/screenshots": screenshots_volume},
    timeout=300,  # 5 минут таймаут
)
async def take_daily_screenshot():
    """
    Делает скриншот сайта meas.kz и сохраняет его
    """
    from playwright.async_api import async_playwright
    from PIL import Image
    
    url = "https://meas.kz"
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"meas_kz_{timestamp}.png"
    filepath = f"/screenshots/{filename}"
    
    print(f"🚀 Начинаем создание скриншота для {url}")
    print(f"📅 Время: {timestamp}")
    
    try:
        async with async_playwright() as p:
            # Запускаем браузер
            browser = await p.chromium.launch(
                headless=True,
                args=['--no-sandbox', '--disable-setuid-sandbox']
            )
            
            # Создаем контекст с настройками
            context = await browser.new_context(
                viewport={'width': 1920, 'height': 1080},
                user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            )
            
            # Открываем страницу
            page = await context.new_page()
            
            print(f"🌐 Загружаем страницу {url}...")
            await page.goto(url, wait_until='networkidle', timeout=60000)
            
            # Ждем немного для полной загрузки
            await page.wait_for_timeout(3000)
            
            # Делаем скриншот всей страницы
            print("📸 Создаем скриншот...")
            screenshot_bytes = await page.screenshot(
                path=filepath,
                full_page=True,
                type='png'
            )
            
            # Получаем информацию о странице
            title = await page.title()
            
            await browser.close()
            
            # Сжимаем скриншот для уменьшения размера
            print("🗜️ Сжимаем скриншот...")
            from PIL import Image
            import io
            
            # Открываем изображение
            img = Image.open(io.BytesIO(screenshot_bytes))
            
            # Уменьшаем размер изображения (50% от оригинала)
            new_width = img.width // 2
            new_height = img.height // 2
            img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Сохраняем с оптимизацией и качеством 85%
            output = io.BytesIO()
            img_resized.save(output, format='PNG', optimize=True, quality=85)
            compressed_bytes = output.getvalue()
            
            # Сохраняем сжатый файл
            with open(filepath, 'wb') as f:
                f.write(compressed_bytes)
            
            compression_ratio = (1 - len(compressed_bytes) / len(screenshot_bytes)) * 100
            print(f"📉 Сжатие: {len(screenshot_bytes) / 1024:.2f} KB → {len(compressed_bytes) / 1024:.2f} KB ({compression_ratio:.1f}% уменьшение)")
            
            # Отправляем в Telegram
            print("📤 Отправляем скриншот в Telegram...")
            telegram_sent = send_to_telegram(compressed_bytes, filename, title, timestamp)
            
            # Коммитим изменения в Volume
            screenshots_volume.commit()
            
            print(f"✅ Скриншот успешно сохранен: {filename}")
            print(f"📄 Заголовок страницы: {title}")
            print(f"📦 Размер файла: {len(screenshot_bytes) / 1024:.2f} KB")
            print(f"📱 Telegram: {'✅ Отправлено' if telegram_sent else '❌ Не отправлено'}")
            
            return {
                "success": True,
                "filename": filename,
                "url": url,
                "title": title,
                "timestamp": timestamp,
                "size_kb": len(screenshot_bytes) / 1024,
                "telegram_sent": telegram_sent
            }
            
    except Exception as e:
        print(f"❌ Ошибка при создании скриншота: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": timestamp
        }


@app.function(
    image=image,
    volumes={"/screenshots": screenshots_volume},
)
def take_screenshot_now():
    """
    Функция для ручного запуска скриншота (для тестирования)
    """
    import asyncio
    return asyncio.run(take_daily_screenshot.local())


@app.function(
    volumes={"/screenshots": screenshots_volume},
)
def list_screenshots():
    """
    Показывает список всех сохраненных скриншотов
    """
    import os
    
    screenshots_dir = "/screenshots"
    
    if not os.path.exists(screenshots_dir):
        return {"screenshots": [], "count": 0}
    
    files = []
    for filename in sorted(os.listdir(screenshots_dir), reverse=True):
        if filename.endswith('.png'):
            filepath = os.path.join(screenshots_dir, filename)
            size = os.path.getsize(filepath)
            files.append({
                "filename": filename,
                "size_kb": size / 1024,
                "path": filepath
            })
    
    print(f"📁 Найдено скриншотов: {len(files)}")
    for f in files:
        print(f"  - {f['filename']} ({f['size_kb']:.2f} KB)")
    
    return {
        "screenshots": files,
        "count": len(files)
    }


@app.function(
    volumes={"/screenshots": screenshots_volume},
)
def download_screenshot(filename: str):
    """
    Скачивает конкретный скриншот
    """
    import os
    
    filepath = f"/screenshots/{filename}"
    
    if not os.path.exists(filepath):
        return {"error": f"Файл {filename} не найден"}
    
    with open(filepath, 'rb') as f:
        data = f.read()
    
    return {
        "filename": filename,
        "size_kb": len(data) / 1024,
        "data": data
    }


@app.local_entrypoint()
def main():
    """
    Локальная точка входа для тестирования
    """
    print("🧪 Тестовый запуск скриншота...")
    result = take_screenshot_now.remote()
    print("\n📊 Результат:")
    print(result)
    
    print("\n📁 Список всех скриншотов:")
    screenshots = list_screenshots.remote()
    print(f"Всего скриншотов: {screenshots['count']}")
