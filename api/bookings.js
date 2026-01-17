// In-memory storage for demo (in production use a real database)
let bookings = [];

export default function handler(req, res) {
    if (req.method === 'POST') {
        const { name, phone, grade, subject, date, time, contactMethod, comments } = req.body;
        
        const booking = {
            id: Date.now().toString(),
            student_name: name,
            student_phone: phone,
            grade: parseInt(grade),
            subject,
            date,
            time,
            contact_method: contactMethod,
            comments: comments || '',
            status: 'pending',
            created_at: new Date().toISOString()
        };
        
        bookings.push(booking);
        
        res.json({ success: true, id: booking.id });
    } else if (req.method === 'GET') {
        res.json(bookings);
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}