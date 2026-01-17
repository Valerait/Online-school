export default function handler(req, res) {
    if (req.method === 'GET') {
        // Mock gap detection
        const gaps = [
            { date: '2026-01-17', time: '15:00-16:00', duration: 1 },
            { date: '2026-01-18', time: '14:00-16:00', duration: 2 },
            { date: '2026-01-19', time: '17:00-19:00', duration: 2 }
        ];
        
        res.json({ gaps });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}