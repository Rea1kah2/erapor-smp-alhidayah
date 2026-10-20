import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { buildAcademicYearPlan } from '../src/lib/academic.js';

const prisma = new PrismaClient();

async function main() {
  const apply = process.argv.includes('--apply');
  const unknownArguments = process.argv.slice(2).filter((argument) => argument !== '--apply');
  if (unknownArguments.length) throw new Error(`Argumen tidak dikenal: ${unknownArguments.join(', ')}`);

  const [gradeYears, noteYears, students, classes, subjects, existingActive, existingYears] = await Promise.all([
    prisma.nilai.findMany({ distinct: ['tahunAjaran'], select: { tahunAjaran: true } }),
    prisma.catatanRapor.findMany({ distinct: ['tahunAjaran'], select: { tahunAjaran: true } }),
    prisma.siswa.findMany({ where: { kelasId: { not: null } }, select: { id: true, nama: true, kelasId: true } }),
    prisma.kelas.findMany({
      select: { id: true, nama: true, waliId: true, wali: { select: { nama: true } }, tahunAjaranId: true }
    }),
    prisma.mapel.findMany({
      where: { guruId: { not: null } },
      select: { id: true, nama: true, guruId: true, guru: { select: { nama: true } } }
    }),
    prisma.tahunAjaran.findFirst({ where: { aktif: true } }),
    prisma.tahunAjaran.findMany({ select: { id: true, nama: true } })
  ]);

  const { labels, activeYear: activeName } = buildAcademicYearPlan(
    gradeYears.map(({ tahunAjaran }) => tahunAjaran),
    noteYears.map(({ tahunAjaran }) => tahunAjaran),
    existingYears.map(({ nama }) => nama),
    existingActive?.nama,
    process.env.INITIAL_ACADEMIC_YEAR || '2025/2026'
  );

  const yearByName = new Map(existingYears.map((year) => [year.nama, year]));
  const activeYearRecord = yearByName.get(activeName);
  const targetClasses = classes.filter((kelas) =>
    kelas.tahunAjaranId === null || kelas.tahunAjaranId === activeYearRecord?.id
  );
  const targetClassIds = new Set(targetClasses.map((kelas) => kelas.id));
  const existingEnrollments = activeYearRecord
    ? await prisma.riwayatKelas.findMany({
        where: { tahunAjaranId: activeYearRecord.id },
        select: { siswaId: true }
      })
    : [];
  const existingEnrollmentIds = new Set(existingEnrollments.map(({ siswaId }) => siswaId));
  const eligibleStudents = students.filter((student) =>
    student.kelasId !== null && targetClassIds.has(student.kelasId)
  );
  const existingSubjectAssignments = activeYearRecord
    ? await prisma.penugasanMapel.findMany({
        where: { tahunAjaranId: activeYearRecord.id },
        select: { mapelId: true, kelasId: true }
      })
    : [];
  const existingHomeroomAssignments = activeYearRecord
    ? await prisma.penugasanWali.findMany({
        where: { tahunAjaranId: activeYearRecord.id },
        select: { kelasId: true }
      })
    : [];
  const existingSubjectKeys = new Set(existingSubjectAssignments.map(({ mapelId, kelasId }) => `${mapelId}:${kelasId}`));
  const existingHomeroomIds = new Set(existingHomeroomAssignments.map(({ kelasId }) => kelasId));
  const subjectPlans = targetClasses.flatMap((kelas) =>
    subjects.filter((subject) => subject.guruId).map((subject) => ({ kelas, subject }))
  );
  const homeroomPlans = targetClasses.filter((kelas) => kelas.waliId);
  const report = {
    mode: apply ? 'APPLY' : 'DRY_RUN',
    activeAcademicYear: activeName,
    academicYearsToCreate: labels.filter((label) => !yearByName.has(label)),
    classesToLinkToActiveYear: targetClasses.filter((kelas) => !kelas.tahunAjaranId).length,
    enrollmentsToCreate: eligibleStudents.filter((student) => !existingEnrollmentIds.has(student.id)).length,
    studentsSkippedBecauseLegacyClassBelongsToAnotherYear: students.length - eligibleStudents.length,
    homeroomAssignmentsToCreateOrPreserve: homeroomPlans.length,
    subjectAssignmentsToCreateOrPreserve: subjectPlans.length,
    existingHomeroomAssignmentsToPreserve: homeroomPlans.filter((kelas) => existingHomeroomIds.has(kelas.id)).length,
    existingSubjectAssignmentsToPreserve: subjectPlans.filter(({ kelas, subject }) => existingSubjectKeys.has(`${subject.id}:${kelas.id}`)).length,
    studentsToEnroll: eligibleStudents.map((student) => ({
      siswaId: student.id,
      nama: student.nama,
      kelasId: student.kelasId,
      kelas: targetClasses.find((kelas) => kelas.id === student.kelasId)?.nama,
      status: existingEnrollmentIds.has(student.id) ? 'preserve' : 'create'
    })),
    studentsSkipped: students.filter((student) => !eligibleStudents.includes(student)).map((student) => ({
      siswaId: student.id,
      nama: student.nama,
      kelasId: student.kelasId,
      kelas: classes.find((kelas) => kelas.id === student.kelasId)?.nama,
      alasan: 'Kelas legacy sudah terhubung ke tahun ajaran lain atau tidak ditemukan'
    })),
    homeroomAssignments: homeroomPlans.map((kelas) => ({
      kelasId: kelas.id,
      kelas: kelas.nama,
      guruId: kelas.waliId,
      guru: kelas.wali?.nama,
      status: existingHomeroomIds.has(kelas.id) ? 'preserve' : 'create'
    })),
    subjectAssignments: subjectPlans.map(({ kelas, subject }) => ({
      kelasId: kelas.id,
      kelas: kelas.nama,
      mapelId: subject.id,
      mapel: subject.nama,
      guruId: subject.guruId,
      guru: subject.guru?.nama,
      status: existingSubjectKeys.has(`${subject.id}:${kelas.id}`) ? 'preserve' : 'create',
      catatan: 'Perlu ditinjau: guru legacy mapel dianggap mengajar di semua kelas'
    })),
    note: 'Data penempatan kelas dan penugasan untuk tahun-tahun lama tidak dapat disimpulkan dari skema lama dan harus direkonsiliasi admin.'
  };

  if (!apply) {
    console.log(JSON.stringify(report, null, 2));
    console.log('Tidak ada perubahan database. Tinjau rencana ini, lalu jalankan dengan --apply untuk menerapkan.');
    return;
  }

  for (const nama of labels) {
    await prisma.tahunAjaran.upsert({
      where: { nama },
      update: { aktif: nama === activeName },
      create: { nama, aktif: nama === activeName }
    });
  }
  await prisma.tahunAjaran.updateMany({ where: { nama: { not: activeName } }, data: { aktif: false } });

  const activeYear = await prisma.tahunAjaran.findUniqueOrThrow({ where: { nama: activeName } });
  await prisma.kelas.updateMany({ where: { tahunAjaranId: null }, data: { tahunAjaranId: activeYear.id } });
  for (const student of eligibleStudents) {
    if (!student.kelasId) continue;
    await prisma.riwayatKelas.upsert({
      where: { siswaId_tahunAjaranId: { siswaId: student.id, tahunAjaranId: activeYear.id } },
      update: {},
      create: { siswaId: student.id, kelasId: student.kelasId, tahunAjaranId: activeYear.id }
    });
  }

  // Legacy Mapel.guruId was school-wide, so these assignments need admin review.
  for (const kelas of targetClasses) {
    if (kelas.waliId) {
      await prisma.penugasanWali.upsert({
        where: { kelasId_tahunAjaranId: { kelasId: kelas.id, tahunAjaranId: activeYear.id } },
        update: {},
        create: { guruId: kelas.waliId, kelasId: kelas.id, tahunAjaranId: activeYear.id }
      });
    }
    for (const subject of subjects) {
      if (!subject.guruId) continue;
      await prisma.penugasanMapel.upsert({
        where: { mapelId_kelasId_tahunAjaranId: { mapelId: subject.id, kelasId: kelas.id, tahunAjaranId: activeYear.id } },
        update: {},
        create: { guruId: subject.guruId, mapelId: subject.id, kelasId: kelas.id, tahunAjaranId: activeYear.id }
      });
    }
  }

  const [enrollmentCount, subjectAssignmentCount, homeroomAssignmentCount] = await Promise.all([
    prisma.riwayatKelas.count({ where: { tahunAjaranId: activeYear.id } }),
    prisma.penugasanMapel.count({ where: { tahunAjaranId: activeYear.id } }),
    prisma.penugasanWali.count({ where: { tahunAjaranId: activeYear.id } })
  ]);
  console.log(JSON.stringify({
    ...report,
    mode: 'APPLIED',
    activeEnrollments: enrollmentCount,
    activeSubjectAssignments: subjectAssignmentCount,
    activeHomeroomAssignments: homeroomAssignmentCount
  }, null, 2));
}

main()
  .catch((error) => {
    console.error('Gagal melakukan backfill riwayat akademik:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
