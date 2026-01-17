// Mock data for dashboard
const mockData = {
    totalStudents: 12,
    todayLessons: 5,
    expectedIncome: 35000,
    trialRequests: 3
};

export default function handler(req, res) {
    if (req.method === 'GET') {
        res.json(mockData);
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}