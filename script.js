// Smooth scroll to calendar section
function scrollToCalendar() {
    const calendarSection = document.getElementById('calendar');
    calendarSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// Phone number formatting
function formatPhoneNumber(value) {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, '');
    
    // Start with +7
    let formatted = '+7';
    
    if (cleaned.length > 1) {
        // Add area code in parentheses
        formatted += ' (' + cleaned.substring(1, 4);
        
        if (cleaned.length >= 4) {
            formatted += ')';
        }
        
        if (cleaned.length >= 5) {
            // Add first part
            formatted += ' ' + cleaned.substring(4, 7);
        }
        
        if (cleaned.length >= 8) {
            // Add second part
            formatted += '-' + cleaned.substring(7, 9);
        }
        
        if (cleaned.length >= 10) {
            // Add third part
            formatted += '-' + cleaned.substring(9, 11);
        }
    }
    
    return formatted;
}

// Set minimum date to today
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.setAttribute('min', today);
    }
    
    // Phone number formatting
    const phoneInput = document.getElementById('studentPhone');
    if (phoneInput) {
        // Set initial value
        phoneInput.value = '+7 (';
        
        phoneInput.addEventListener('input', (e) => {
            const cursorPosition = e.target.selectionStart;
            const oldLength = e.target.value.length;
            
            e.target.value = formatPhoneNumber(e.target.value);
            
            const newLength = e.target.value.length;
            const diff = newLength - oldLength;
            
            // Adjust cursor position
            e.target.setSelectionRange(cursorPosition + diff, cursorPosition + diff);
        });
        
        phoneInput.addEventListener('focus', (e) => {
            if (e.target.value === '') {
                e.target.value = '+7 (';
            }
        });
        
        phoneInput.addEventListener('keydown', (e) => {
            // Prevent deleting +7 prefix
            if ((e.key === 'Backspace' || e.key === 'Delete') && e.target.selectionStart <= 4) {
                e.preventDefault();
            }
        });
    }
    
    // Handle form submission
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleBookingSubmit);
    }
});

// Handle booking form submission
async function handleBookingSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const phone = formData.get('studentPhone');
    
    // Validate phone format
    const phoneRegex = /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/;
    if (!phoneRegex.test(phone)) {
        const formMessage = document.getElementById('formMessage');
        formMessage.style.display = 'block';
        formMessage.className = 'form-message error';
        formMessage.textContent = '❌ Пожалуйста, введите корректный номер телефона в формате +7 (777) 123-12-12';
        return;
    }
    
    const data = {
        name: formData.get('studentName'),
        phone: phone,
        grade: formData.get('studentGrade'),
        subject: formData.get('subject'),
        date: formData.get('bookingDate'),
        time: formData.get('bookingTime'),
        contactMethod: formData.get('contactMethod'),
        comments: formData.get('comments') || ''
    };
    
    // Format message for WhatsApp/Telegram
    const message = `
🎓 Новая заявка на пробный урок!

👤 Имя: ${data.name}
📱 Телефон: ${data.phone}
📚 Класс: ${data.grade}
📖 Предмет: ${data.subject}
📅 Дата: ${data.date}
🕐 Время: ${data.time}
💬 Связь: ${data.contactMethod}
${data.comments ? `\n📝 Комментарий: ${data.comments}` : ''}
    `.trim();
    
    // Show success message
    const formMessage = document.getElementById('formMessage');
    formMessage.style.display = 'block';
    formMessage.className = 'form-message success';
    formMessage.innerHTML = `
        <strong>✅ Заявка отправлена!</strong><br>
        Мы свяжемся с вами в ближайшее время для подтверждения записи.<br><br>
        <a href="https://wa.me/77001234567?text=${encodeURIComponent(message)}" target="_blank" style="color: #25D366; text-decoration: underline;">
            Или напишите нам в WhatsApp прямо сейчас
        </a>
    `;
    
    // Reset form
    e.target.reset();
    document.getElementById('studentPhone').value = '+7 (';
    
    // Scroll to message
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Optional: Send to your backend/email service
    // await fetch('/api/booking', { method: 'POST', body: JSON.stringify(data) });
}

// Add animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all sections for animation
document.addEventListener('DOMContentLoaded', () => {
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
    
    // Hero section should be visible immediately
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.opacity = '1';
        hero.style.transform = 'translateY(0)';
    }
});
