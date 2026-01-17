// Navigation
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Add active class to clicked nav item
    event.target.closest('.nav-item').classList.add('active');
    
    // Update page title
    const titles = {
        'dashboard': 'Дашборд',
        'schedule': 'Управление расписанием',
        'students': 'База учеников',
        'finance': 'Финансовый блок',
        'content': 'Редактор контента'
    };
    document.getElementById('page-title').textContent = titles[sectionId];
    
    // Load section data
    loadSectionData(sectionId);
}

// Load data for specific section
async function loadSectionData(sectionId) {
    try {
        switch(sectionId) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'schedule':
                await loadScheduleData();
                break;
            case 'students':
                await loadStudentsData();
                break;
            case 'finance':
                await loadFinanceData();
                break;
        }
    } catch (error) {
        console.error('Error loading section data:', error);
    }
}

// Load dashboard statistics
async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard');
        const stats = await response.json();
        
        document.getElementById('totalStudents').textContent = stats.totalStudents;
        document.getElementById('todayLessons').textContent = stats.todayLessons;
        document.getElementById('expectedIncome').textContent = `${stats.expectedIncome.toLocaleString()} ₸`;
        document.getElementById('trialRequests').textContent = stats.trialRequests;
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load schedule data
async function loadScheduleData() {
    try {
        const response = await fetch('/api/lessons');
        const lessons = await response.json();
        
        const tbody = document.getElementById('scheduleTable');
        tbody.innerHTML = '';
        
        lessons.forEach(lesson => {
            const row = document.createElement('tr');
            const statusClass = lesson.status === 'confirmed' ? 'confirmed' : 'pending';
            const statusText = lesson.status === 'confirmed' ? 'Подтверждено' : 'Ожидание';
            
            row.innerHTML = `
                <td>${lesson.date}</td>
                <td>${lesson.time}</td>
                <td>${lesson.student_name}</td>
                <td>${lesson.subject}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn-icon" title="Редактировать" onclick="editLesson('${lesson.id}')">✏️</button>
                    <button class="btn-icon" title="Удалить" onclick="deleteLesson('${lesson.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading schedule data:', error);
    }
}

// Load students data
async function loadStudentsData() {
    try {
        const response = await fetch('/api/students');
        const students = await response.json();
        
        const tbody = document.getElementById('studentsTable');
        tbody.innerHTML = '';
        
        students.forEach(student => {
            const row = document.createElement('tr');
            const contactLink = student.contact_method === 'whatsapp' 
                ? `https://wa.me/${student.phone.replace(/\D/g, '')}`
                : `https://t.me/${student.phone.replace(/\D/g, '')}`;
            
            row.innerHTML = `
                <td>${student.name}</td>
                <td>${student.grade} класс</td>
                <td>
                    <a href="${contactLink}" target="_blank">${student.contact_method === 'whatsapp' ? 'WhatsApp' : 'Telegram'}</a>
                </td>
                <td><span class="payment-badge paid">Оплачено</span></td>
                <td>
                    <button class="btn-icon" title="Редактировать" onclick="editStudent('${student.id}')">✏️</button>
                    <button class="btn-icon" title="Удалить" onclick="deleteStudent('${student.id}')">🗑️</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading students data:', error);
    }
}

// Load finance data
async function loadFinanceData() {
    try {
        const response = await fetch('/api/transactions');
        const transactions = await response.json();
        
        const tbody = document.getElementById('transactionsTable');
        tbody.innerHTML = '';
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            const statusClass = transaction.status === 'paid' ? 'paid' : 'pending';
            const statusText = transaction.status === 'paid' ? 'Оплачено' : 'Ожидание';
            
            row.innerHTML = `
                <td>${new Date(transaction.created_at).toLocaleDateString('ru-RU')}</td>
                <td>${transaction.student_name}</td>
                <td>${transaction.amount.toLocaleString()} ₸</td>
                <td><span class="payment-badge ${statusClass}">${statusText}</span></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading finance data:', error);
    }
}

// Initialize Charts
function initCharts() {
    // Income Chart
    const incomeCtx = document.getElementById('incomeChart').getContext('2d');
    new Chart(incomeCtx, {
        type: 'line',
        data: {
            labels: ['Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь', 'Январь'],
            datasets: [{
                label: 'Доход (₸)',
                data: [56000, 63000, 70000, 77000, 84000],
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString() + ' ₸';
                        }
                    }
                }
            }
        }
    });

    // Workload Chart
    const workloadCtx = document.getElementById('workloadChart').getContext('2d');
    new Chart(workloadCtx, {
        type: 'bar',
        data: {
            labels: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
            datasets: [{
                label: 'Занятий',
                data: [4, 5, 6, 5, 7, 3, 0],
                backgroundColor: '#3498db',
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Schedule Functions
async function checkGaps() {
    try {
        const response = await fetch('/api/schedule/gaps');
        const data = await response.json();
        
        const result = document.getElementById('gapsResult');
        result.style.display = 'block';
        result.className = 'alert info';
        
        let gapsHtml = '<strong>Найдено свободных окон:</strong><br>';
        data.gaps.forEach(gap => {
            gapsHtml += `• ${gap.date}: ${gap.time} (${gap.duration} час${gap.duration > 1 ? 'а' : ''})<br>`;
        });
        
        result.innerHTML = gapsHtml;
    } catch (error) {
        console.error('Error checking gaps:', error);
    }
}

// Student Functions
function addStudent() {
    const name = prompt('Введите имя ученика:');
    if (name) {
        const phone = prompt('Введите номер телефона:');
        const grade = prompt('Введите класс (5-9):');
        
        if (phone && grade) {
            fetch('/api/students', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, grade: parseInt(grade), contactMethod: 'whatsapp' })
            }).then(() => {
                loadStudentsData();
            });
        }
    }
}

// Finance Functions
async function generateKaspiLink() {
    try {
        const response = await fetch('/api/kaspi-link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 7000 })
        });
        
        const data = await response.json();
        
        const result = document.getElementById('kaspiLinkResult');
        result.style.display = 'block';
        result.className = 'alert success';
        result.innerHTML = `
            <strong>Ссылка сформирована:</strong><br>
            <a href="${data.link}" target="_blank">${data.link}</a><br>
            <small>Скопируйте и отправьте ученику</small>
        `;
        
        // Copy to clipboard
        navigator.clipboard.writeText(data.link).then(() => {
            console.log('Ссылка скопирована в буфер обмена');
        });
    } catch (error) {
        console.error('Error generating Kaspi link:', error);
    }
}

// Content Functions
function saveContent() {
    const result = document.getElementById('contentSaveResult');
    result.style.display = 'block';
    result.className = 'alert success';
    result.textContent = 'Изменения успешно сохранены!';
    
    setTimeout(() => {
        result.style.display = 'none';
    }, 3000);
}

function uploadMaterial() {
    alert('Функция загрузки материалов будет реализована с файловым хранилищем');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    loadDashboardData();
    
    // Auto-refresh dashboard every 30 seconds
    setInterval(loadDashboardData, 30000);
});

// Handle navigation clicks
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const href = item.getAttribute('href');
        if (href && href.startsWith('#')) {
            const sectionId = href.substring(1);
            if (document.getElementById(sectionId)) {
                showSection(sectionId);
            }
        }
    });
});
