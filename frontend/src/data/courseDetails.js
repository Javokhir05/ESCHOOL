// Sample details, keyed by course id. Later this will come from the database.
export const courseDetails = {
  'ielts-preparation': {
    duration: { uz: '12 hafta', en: '12 weeks' },
    schedule: { uz: 'Dush, Chor, Juma · 18:00', en: 'Mon, Wed, Fri · 18:00' },
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
  'ielts-writing': {
    duration: { uz: '8 hafta', en: '8 weeks' },
    schedule: { uz: 'Sesh, Pay · 19:00', en: 'Tue, Thu · 19:00' },
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
  'cefr-b2': {
    duration: { uz: '16 hafta', en: '16 weeks' },
    schedule: { uz: 'Dush, Chor, Juma · 16:00', en: 'Mon, Wed, Fri · 16:00' },
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
  'cefr-a1': {
    duration: { uz: '10 hafta', en: '10 weeks' },
    schedule: { uz: 'Sesh, Pay, Shan · 15:00', en: 'Tue, Thu, Sat · 15:00' },
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
  mathematics: {
    duration: { uz: 'Oʻquv yili davomida', en: 'Full school year' },
    schedule: { uz: 'Dush, Chor · 17:00', en: 'Mon, Wed · 17:00' },
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
  physics: {
    duration: { uz: 'Oʻquv yili davomida', en: 'Full school year' },
    schedule: { uz: 'Sesh, Pay · 17:00', en: 'Tue, Thu · 17:00' },
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
};