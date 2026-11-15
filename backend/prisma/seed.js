require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const teachers = [
  { key: 't1', fullName: 'Teacher A', email: 'teacher-a@example.com', phone: '+998900000001', subject: 'IELTS' },
  { key: 't2', fullName: 'Teacher B', email: 'teacher-b@example.com', phone: '+998900000002', subject: 'CEFR' },
  { key: 't3', fullName: 'Teacher C', email: 'teacher-c@example.com', phone: '+998900000003', subject: 'ACADEMIC' },
];

const courses = [
  {
    slug: 'ielts-preparation', category: 'IELTS', level: 'INTERMEDIATE', format: 'BOTH', teacher: 't1',
    titleUz: 'IELTS ga tayyorgarlik', titleEn: 'IELTS Preparation',
    summaryUz: 'Tinglab tushunish, oʻqish, yozish va gapirish koʻnikmalari.', summaryEn: 'Listening, Reading, Writing and Speaking skills.',
    durationUz: '12 hafta', durationEn: '12 weeks',
    scheduleUz: 'Dush, Chor, Juma · 18:00', scheduleEn: 'Mon, Wed, Fri · 18:00',
    outcomes: [
      { uz: 'IELTS imtihoni tuzilishi va baholash mezonlarini tushunasiz', en: 'Understand the IELTS exam format and scoring' },
      { uz: 'Barcha toʻrt koʻnikmani vaqt bilan mashq qilasiz', en: 'Practice all four skills with timed tasks' },
      { uz: 'Yozish va gapirish boʻyicha oʻqituvchi izohini olasiz', en: 'Get teacher feedback on writing and speaking' },
    ],
    curriculum: [
      { uz: 'Tinglab tushunish strategiyalari', en: 'Listening strategies' },
      { uz: 'Oʻqish texnikalari', en: 'Reading techniques' },
      { uz: 'Writing Task 1 va Task 2', en: 'Writing Task 1 and Task 2' },
      { uz: 'Speaking 1–3 qismlar va yakuniy mock test', en: 'Speaking Parts 1–3 and a final mock test' },
    ],
  },
  {
    slug: 'ielts-writing', category: 'IELTS', level: 'ADVANCED', format: 'ONLINE', teacher: 't1',
    titleUz: 'IELTS Writing intensiv kursi', titleEn: 'IELTS Writing Intensive',
    summaryUz: 'Task 1 va Task 2 boʻyicha amaliy mashqlar va oʻqituvchi izohlari.', summaryEn: 'Practice for Task 1 and Task 2 with teacher feedback.',
    durationUz: '8 hafta', durationEn: '8 weeks',
    scheduleUz: 'Sesh, Pay · 19:00', scheduleEn: 'Tue, Thu · 19:00',
    outcomes: [
      { uz: 'Task 1 uchun grafik va jadvallarni aniq tasvirlaysiz', en: 'Describe charts and tables clearly for Task 1' },
      { uz: 'Task 2 inshosini mantiqiy tuzishni oʻrganasiz', en: 'Learn to structure a Task 2 essay logically' },
      { uz: 'Har bir inshoga yozma izoh olasiz', en: 'Receive written feedback on every essay' },
    ],
    curriculum: [
      { uz: 'Baholash mezonlari', en: 'Band descriptors' },
      { uz: 'Task 1: grafiklar va jarayonlar', en: 'Task 1: graphs and processes' },
      { uz: 'Task 2: fikr va muhokama inshosi', en: 'Task 2: opinion and discussion essays' },
      { uz: 'Xatolar ustida ishlash', en: 'Working on common mistakes' },
    ],
  },
  {
    slug: 'cefr-b2', category: 'CEFR', level: 'INTERMEDIATE', format: 'BOTH', teacher: 't2',
    titleUz: 'CEFR B2 tayyorgarlik', titleEn: 'CEFR B2 Preparation',
    summaryUz: 'B2 darajasi uchun grammatika, lugʻat va sertifikatga tayyorgarlik.', summaryEn: 'Grammar, vocabulary and certificate preparation for B2.',
    durationUz: '16 hafta', durationEn: '16 weeks',
    scheduleUz: 'Dush, Chor, Juma · 16:00', scheduleEn: 'Mon, Wed, Fri · 16:00',
    outcomes: [
      { uz: 'B2 darajasidagi grammatikani erkin qoʻllaysiz', en: 'Use B2-level grammar with confidence' },
      { uz: 'Lugʻat boyligingizni mavzular boʻyicha kengaytirasiz', en: 'Expand your vocabulary by topic' },
      { uz: 'Sertifikat imtihoniga tayyorlanasiz', en: 'Prepare for a certificate exam' },
    ],
    curriculum: [
      { uz: 'Zamonlar va shartli gaplar', en: 'Tenses and conditionals' },
      { uz: 'Passiv va bilvosita nutq', en: 'Passive voice and reported speech' },
      { uz: 'Lugʻat va soʻz birikmalari', en: 'Vocabulary and collocations' },
      { uz: 'Imtihon mashqlari', en: 'Exam practice' },
    ],
  },
  {
    slug: 'cefr-a1', category: 'CEFR', level: 'BEGINNER', format: 'OFFLINE', teacher: 't2',
    titleUz: 'CEFR A1 boshlangʻich kurs', titleEn: 'CEFR A1 Starter Course',
    summaryUz: 'Ingliz tilini noldan oʻrganishni boshlang.', summaryEn: 'Start learning English from zero.',
    durationUz: '10 hafta', durationEn: '10 weeks',
    scheduleUz: 'Sesh, Pay, Shan · 15:00', scheduleEn: 'Tue, Thu, Sat · 15:00',
    outcomes: [
      { uz: 'Oʻzingiz haqingizda oddiy gaplar aytasiz', en: 'Say simple sentences about yourself' },
      { uz: 'Eng kerakli 500 ta soʻzni bilib olasiz', en: 'Learn the 500 most useful words' },
      { uz: 'Kundalik savollarga javob berasiz', en: 'Answer everyday questions' },
    ],
    curriculum: [
      { uz: 'Alifbo va talaffuz', en: 'Alphabet and pronunciation' },
      { uz: 'Tanishuv va oila', en: 'Introductions and family' },
      { uz: 'Kundalik hayot va vaqt', en: 'Daily life and time' },
      { uz: 'Oddiy suhbatlar', en: 'Simple conversations' },
    ],
  },
  {
    slug: 'mathematics', category: 'ACADEMIC', level: 'SCHOOL', format: 'BOTH', teacher: 't3',
    titleUz: 'Matematika', titleEn: 'Mathematics',
    summaryUz: 'Maktab dasturi asosidagi darslar va mashqlar.', summaryEn: 'School curriculum lessons and practice exercises.',
    durationUz: 'Oʻquv yili davomida', durationEn: 'Full school year',
    scheduleUz: 'Dush, Chor · 17:00', scheduleEn: 'Mon, Wed · 17:00',
    outcomes: [
      { uz: 'Maktab dasturidagi mavzularni mustahkamlaysiz', en: 'Strengthen school curriculum topics' },
      { uz: 'Masalalarni bosqichma-bosqich yechishni oʻrganasiz', en: 'Learn to solve problems step by step' },
      { uz: 'Nazorat ishlariga tayyorlanasiz', en: 'Prepare for tests and exams' },
    ],
    curriculum: [
      { uz: 'Algebra asoslari', en: 'Algebra basics' },
      { uz: 'Geometriya', en: 'Geometry' },
      { uz: 'Funksiyalar va grafiklar', en: 'Functions and graphs' },
      { uz: 'Takrorlash va nazorat ishlari', en: 'Revision and tests' },
    ],
  },
  {
    slug: 'physics', category: 'ACADEMIC', level: 'SCHOOL', format: 'OFFLINE', teacher: 't3',
    titleUz: 'Fizika', titleEn: 'Physics',
    summaryUz: 'Tushunchalar, masalalar va laboratoriya mashgʻulotlari.', summaryEn: 'Concepts, problem solving and lab sessions.',
    durationUz: 'Oʻquv yili davomida', durationEn: 'Full school year',
    scheduleUz: 'Sesh, Pay · 17:00', scheduleEn: 'Tue, Thu · 17:00',
    outcomes: [
      { uz: 'Asosiy fizik tushunchalarni tushunasiz', en: 'Understand key physics concepts' },
      { uz: 'Masalalarni formulalar yordamida yechasiz', en: 'Solve problems using formulas' },
      { uz: 'Laboratoriya mashgʻulotlarida tajriba oʻtkazasiz', en: 'Run experiments in lab sessions' },
    ],
    curriculum: [
      { uz: 'Mexanika', en: 'Mechanics' },
      { uz: 'Issiqlik va molekulyar fizika', en: 'Heat and molecular physics' },
      { uz: 'Elektr va magnetizm', en: 'Electricity and magnetism' },
      { uz: 'Laboratoriya ishlari', en: 'Laboratory work' },
    ],
  },
];

async function main() {
  const teacherIds = {};

  for (const t of teachers) {
    // Random password nobody knows: these sample teachers cannot be logged into
    const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
    const user = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        email: t.email, phone: t.phone, fullName: t.fullName, passwordHash,
        role: 'TEACHER', status: 'ACTIVE',
        teacher: { create: { subject: t.subject, experienceYears: 5 } },
      },
      include: { teacher: true },
    });
    teacherIds[t.key] = user.teacher.id;
  }

  for (const { teacher, ...c } of courses) {
    const data = { ...c, teacherId: teacherIds[teacher], status: 'PUBLISHED' };
    await prisma.course.upsert({ where: { slug: c.slug }, update: data, create: data });
  }

  console.log(`Seeded ${teachers.length} teachers and ${courses.length} courses.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());