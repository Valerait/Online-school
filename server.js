const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Database setup
const db = new sqlite3.Database('./school.db');

// Initialize database tables
db.serialize(() => {
    // Students table
    db.run(`CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        grade INTEGER NOT NULL,
        contact_method TEXT,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Bookings table
    db.run(`CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        student_name TEXT NOT NULL,
        student_phone TEXT NOT NULL,
        grade INTEGER NOT NULL,
        subject TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        contact_method TEXT NOT NULL,
        comments TEXT,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Lessons table
    db.run(`CREATE TABLE IF NOT EXISTS lessons (
        id TEXT PRIMARY KEY,
        student_id TEXT,
        student_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        status TEXT DEFAULT 'scheduled',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Transactions table
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        student_name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT DEFAULT 'kaspi',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert sample data
    db.get("SELECT COUNT(*) as count FROM students", (err, row) => {
        if (row.count === 0) {
            const sampleStudents = [
                ['1', 'Айдар Нурланов', '+7 (701) 234-56-78', 8, 'whatsapp', 'active'],
                ['2', 'Асель Каримова', '+7 (702) 345-67-89', 9, 'telegram', 'active'],
                ['3', 'Ерлан Сапаров', '+7 (703) 456-78-90', 7, 'whatsapp', 'active']
            ];

            sampleStudents.forEach(student => {
                db.run("INSERT INTO students (id, name, phone, grade, contact_method, status) VALUES (?, ?, ?, ?, ?, ?)", student);
            });

            // Sample lessons
            const today = new Date().toISOString().split('T')[0];
            const sampleLessons = [
                [uuidv4(), '1', 'Айдар Нурланов', 'Математика', today, '14:00', 'confirmed'],
                [uuidv4(), '2', 'Асель Каримова', 'Физика', today, '16:00', 'pending']
            ];

            sampleLessons.forEach(lesson => {
                db.run("INSERT INTO lessons (id, student_id, student_name, subject, date, time, status) VALUES (?, ?, ?, ?, ?, ?, ?)", lesson);
            });

            // Sample transactions
            const sampleTransactions = [
                [uuidv4(), 'Айдар Нурланов', 7000, 'paid'],
                [uuidv4(), 'Ерлан Сапаров', 7000, 'paid'],
                [uuidv4(), 'Асель Каримова', 7000, 'pending']
            ];

            sampleTransactions.forEach(transaction => {
                db.run("INSERT INTO transactions (id, student_name, amount, status) VALUES (?, ?, ?, ?)", transaction);
            });
        }
    });
});

// API Routes

// Get dashboard stats
app.get('/api/dashboard', (req, res) => {
    const stats = {};
    
    db.get("SELECT COUNT(*) as count FROM students WHERE status = 'active'", (err, row) => {
        stats.totalStudents = row.count;
        
        const today = new Date().toISOString().split('T')[0];
        db.get("SELECT COUNT(*) as count FROM lessons WHERE date = ? AND status != 'cancelled'", [today], (err, row) => {
            stats.todayLessons = row.count;
            
            db.get("SELECT SUM(amount) as total FROM transactions WHERE status = 'pending'", (err, row) => {
                stats.expectedIncome = row.total || 0;
                
                db.get("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'", (err, row) => {
                    stats.trialRequests = row.count;
                    res.json(stats);
                });
            });
        });
    });
});

// Booking endpoints
app.post('/api/bookings', (req, res) => {
    const { name, phone, grade, subject, date, time, contactMethod, comments } = req.body;
    const id = uuidv4();
    
    db.run(
        "INSERT INTO bookings (id, student_name, student_phone, grade, subject, date, time, contact_method, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, name, phone, grade, subject, date, time, contactMethod, comments],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, id: id });
        }
    );
});

app.get('/api/bookings', (req, res) => {
    db.all("SELECT * FROM bookings ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Students endpoints
app.get('/api/students', (req, res) => {
    db.all("SELECT * FROM students WHERE status = 'active' ORDER BY name", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/students', (req, res) => {
    const { name, phone, grade, contactMethod } = req.body;
    const id = uuidv4();
    
    db.run(
        "INSERT INTO students (id, name, phone, grade, contact_method) VALUES (?, ?, ?, ?, ?)",
        [id, name, phone, grade, contactMethod],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, id: id });
        }
    );
});

// Lessons endpoints
app.get('/api/lessons', (req, res) => {
    db.all("SELECT * FROM lessons ORDER BY date DESC, time DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Transactions endpoints
app.get('/api/transactions', (req, res) => {
    db.all("SELECT * FROM transactions ORDER BY created_at DESC", (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/kaspi-link', (req, res) => {
    const { amount = 7000 } = req.body;
    const link = `https://kaspi.kz/pay/merchant123?amount=${amount}`;
    res.json({ link: link });
});

// Check schedule gaps
app.get('/api/schedule/gaps', (req, res) => {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Mock gap detection - in real app, analyze calendar
    const gaps = [
        { date: '2026-01-17', time: '15:00-16:00', duration: 1 },
        { date: '2026-01-18', time: '14:00-16:00', duration: 2 },
        { date: '2026-01-19', time: '17:00-19:00', duration: 2 }
    ];
    
    res.json({ gaps });
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Main site: http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
});