require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// The sample teachers created by prisma/seed.js. Nobody can log in as them.
const SAMPLE = [
  { email: 'teacher-a@example.com', fullName: 'Teacher A' },
  { email: 'teacher-b@example.com', fullName: 'Teacher B' },
  { email: 'teacher-c@example.com', fullName: 'Teacher C' },
];
const confirmed = process.argv.includes('--confirm');

async function main() {
  const found = await prisma.user.findMany({
    where: { role: 'TEACHER', OR: SAMPLE.map((s) => ({ email: s.email, fullName: s.fullName })) },
    include: {
      teacher: {
        include: {
          courses: {
            include: {
              _count: { select: { enrollments: true, lessons: true, assignments: true, tests: true, sessions: true } },
            },
          },
        },
      },
    },
  });
  const users = found.filter((u) => u.teacher);

  if (users.length === 0) {
    console.log('No sample teachers found. Nothing to do.');
    return;
  }

  let blocked = false;
  for (const u of users) {
    console.log(`\n${u.fullName} <${u.email}>`);
    for (const c of u.teacher.courses) {
      const n = c._count;
      console.log(
        `  course ${c.slug}: ${n.enrollments} enrollments, ${n.lessons} lessons, ${n.assignments} assignments, ${n.tests} tests, ${n.sessions} classes`
      );
      if (n.lessons || n.assignments || n.tests) blocked = true;
    }
  }

  if (blocked) {
    console.error(
      '\nSome sample courses have lessons, assignments or tests, whose files would stay on the disk. ' +
        'Hide those courses on the admin Courses page instead. Nothing was deleted.'
    );
    process.exitCode = 1;
    return;
  }

  if (!confirmed) {
    console.log('\nDry run: nothing was deleted. Make a backup, then run again with --confirm.');
    return;
  }

  const teacherIds = users.map((u) => u.teacher.id);
  const userIds = users.map((u) => u.id);
  // Courses first: a teacher cannot be deleted while courses still point to them
  const [courses, teachers] = await prisma.$transaction([
    prisma.course.deleteMany({ where: { teacherId: { in: teacherIds } } }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
  console.log(`\nDeleted ${courses.count} courses and ${teachers.count} sample teachers.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());