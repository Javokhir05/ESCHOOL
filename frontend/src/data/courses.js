// Sample data. Later this will come from the backend / database.
export const teachers = [
  { id: 't1', name: { uz: 'Oʻqituvchi A', en: 'Teacher A' } },
  { id: 't2', name: { uz: 'Oʻqituvchi B', en: 'Teacher B' } },
  { id: 't3', name: { uz: 'Oʻqituvchi C', en: 'Teacher C' } },
];

export const courses = [
  {
    id: 'ielts-preparation', category: 'ielts', level: 'intermediate', format: 'both', teacherId: 't1',
    title: { uz: 'IELTS ga tayyorgarlik', en: 'IELTS Preparation' },
    summary: { uz: 'Tinglab tushunish, oʻqish, yozish va gapirish koʻnikmalari.', en: 'Listening, Reading, Writing and Speaking skills.' },
  },
  {
    id: 'ielts-writing', category: 'ielts', level: 'advanced', format: 'online', teacherId: 't1',
    title: { uz: 'IELTS Writing intensiv kursi', en: 'IELTS Writing Intensive' },
    summary: { uz: 'Task 1 va Task 2 boʻyicha amaliy mashqlar va oʻqituvchi izohlari.', en: 'Practice for Task 1 and Task 2 with teacher feedback.' },
  },
  {
    id: 'cefr-b2', category: 'cefr', level: 'intermediate', format: 'both', teacherId: 't2',
    title: { uz: 'CEFR B2 tayyorgarlik', en: 'CEFR B2 Preparation' },
    summary: { uz: 'B2 darajasi uchun grammatika, lugʻat va sertifikatga tayyorgarlik.', en: 'Grammar, vocabulary and certificate preparation for B2.' },
  },
  {
    id: 'cefr-a1', category: 'cefr', level: 'beginner', format: 'offline', teacherId: 't2',
    title: { uz: 'CEFR A1 boshlangʻich kurs', en: 'CEFR A1 Starter Course' },
    summary: { uz: 'Ingliz tilini noldan oʻrganishni boshlang.', en: 'Start learning English from zero.' },
  },
  {
    id: 'mathematics', category: 'academic', level: 'school', format: 'both', teacherId: 't3',
    title: { uz: 'Matematika', en: 'Mathematics' },
    summary: { uz: 'Maktab dasturi asosidagi darslar va mashqlar.', en: 'School curriculum lessons and practice exercises.' },
  },
  {
    id: 'physics', category: 'academic', level: 'school', format: 'offline', teacherId: 't3',
    title: { uz: 'Fizika', en: 'Physics' },
    summary: { uz: 'Tushunchalar, masalalar va laboratoriya mashgʻulotlari.', en: 'Concepts, problem solving and lab sessions.' },
  },
];