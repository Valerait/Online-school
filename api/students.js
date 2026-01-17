// Mock students data
const mockStudents = [
    {
        id: '1',
        name: 'Айдар Нурланов',
        phone: '+7 (701) 234-56-78',
        grade: 8,
        contact_method: 'whatsapp',
        status: 'active'
    },
    {
        id: '2',
        name: 'Асель Каримова',
        phone: '+7 (702) 345-67-89',
        grade: 9,
        contact_method: 'telegram',
        status: 'active'
    },
    {
        id: '3',
        name: 'Ерлан Сапаров',
        phone: '+7 (703) 456-78-90',
        grade: 7,
        contact_method: 'whatsapp',
        status: 'active'
    }
];

export default function handler(req, res) {
    if (req.method === 'GET') {
        res.json(mockStudents);
    } else if (req.method === 'POST') {
        const { name, phone, grade, contactMethod } = req.body;
        const newStudent = {
            id: Date.now().toString(),
            name,
            phone,
            grade: parseInt(grade),
            contact_method: contactMethod,
            status: 'active'
        };
        mockStudents.push(newStudent);
        res.json({ success: true, id: newStudent.id });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}