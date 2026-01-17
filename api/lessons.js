// Mock lessons data
const today = new Date().toISOString().split('T')[0];

const mockLessons = [
    {
        id: '1',
        student_id: '1',
        student_name: 'Айдар Нурланов',
        subject: 'Математика',
        date: today,
        time: '14:00',
        status: 'confirmed'
    },
    {
        id: '2',
        student_id: '2',
        student_name: 'Асель Каримова',
        subject: 'Физика',
        date: today,
        time: '16:00',
        status: 'pending'
    }
];

export default function handler(req, res) {
    if (req.method === 'GET') {
        res.json(mockLessons);
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}