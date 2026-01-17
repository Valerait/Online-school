export default function handler(req, res) {
    if (req.method === 'POST') {
        const { amount = 7000 } = req.body;
        const link = `https://kaspi.kz/pay/merchant123?amount=${amount}`;
        res.json({ link });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}