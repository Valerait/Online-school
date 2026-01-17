// Mock transactions data
const mockTransactions = [
    {
        id: '1',
        student_name: 'Айдар Нурланов',
        amount: 7000,
        status: 'paid',
        payment_method: 'kaspi',
        created_at: '2026-01-15T10:00:00Z'
    },
    {
        id: '2',
        student_name: 'Ерлан Сапаров',
        amount: 7000,
        status: 'paid',
        payment_method: 'kaspi',
        created_at: '2026-01-14T15:30:00Z'
    },
    {
        id: '3',
        student_name: 'Асель Каримова',
        amount: 7000,
        status: 'pending',
        payment_method: 'kaspi',
        created_at: '2026-01-12T09:15:00Z'
    }
];

export default function handler(req, res) {
    if (req.method === 'GET') {
        res.json(mockTransactions);
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}