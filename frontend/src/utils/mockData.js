export const CATS = {
  AI: { name: 'Artificial Intelligence', fillClass: '', icon: '◈' },
  FE: { name: 'Front End Web Dev', fillClass: 'teal', icon: '⧈' },
  BE: { name: 'Back End Web Dev', fillClass: 'blue', icon: '⊞' },
  API: { name: 'API Functionalities', fillClass: 'amber', icon: '⇌' },
  CYBER: { name: 'Cybersecurity', fillClass: 'purple', icon: '⊘' },
  CLOUD: { name: 'Cloud Computing', fillClass: 'green', icon: '◯' },
  SOFT: { name: 'Soft Skills', fillClass: 'orange', icon: '◎' },
};

export const CAT_BADGE = {
  AI: 'badge-red',
  FE: 'badge-teal',
  BE: 'badge-blue',
  API: 'badge-amber',
  CYBER: 'badge-purple',
  CLOUD: 'badge-green',
  SOFT: 'badge-orange'
};

export const MOCK_INTERNS = [
  { id: 1, first: 'Amara', last: 'Osei', email: 'amara@finsense.africa', dept: 'AI' },
  { id: 2, first: 'Kofi', last: 'Mensah', email: 'kofi@finsense.africa', dept: 'FE' },
  { id: 3, first: 'Zainab', last: 'Abubakar', email: 'zainab@finsense.africa', dept: 'BE' },
];

export const MOCK_CERTS = [
  { id: 1, internId: 1, name: 'Machine Learning Basics', cat: 'AI', provider: 'Coursera', hours: 40, date: '2025-03-10' },
  { id: 2, internId: 2, name: 'React Advanced', cat: 'FE', provider: 'Udemy', hours: 25, date: '2025-03-15' },
  { id: 3, internId: 3, name: 'Node.js Backend', cat: 'BE', provider: 'Pluralsight', hours: 30, date: '2025-03-20' },
  { id: 4, internId: 1, name: 'Data Science with Python', cat: 'AI', provider: 'edX', hours: 50, date: '2025-04-01' },
];
