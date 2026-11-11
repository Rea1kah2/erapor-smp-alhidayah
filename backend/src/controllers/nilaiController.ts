import { type Request, type Response } from 'express';
import { type AuthRequest } from '../middleware/auth.js';
import { isAcademicYearLabel } from '../lib/academic.js';
import { prisma } from '../lib/prisma.js';
import { isDatabaseUnavailableError, sendDatabaseUnavailable } from '../lib/database.js';

export const upsertNilai = async (req: AuthRequest, res: Response) => {
  try {
    const { siswaId, mapelId, jenis, skor, semester, tahunAjaran } = req.body;
    const userId = req.user?.id;
    const role = req.user?.role;

    if (![siswaId, mapelId, jenis, semester, tahunAjaran].every((value) => typeof value === 'string' && value.trim()) || skor === undefined || skor === null || skor === '') {
      return res.status(400).json({ error: 'Semua kolom data (termasuk skor) wajib diisi' });
    }
    if (typeof skor !== 'number' && typeof skor !== 'string') return res.status(400).json({ error: 'Skor harus berupa angka antara 0 dan 100.' });
    const numericScore = Number(skor);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
      return res.status(400).json({ error: 'Skor harus berupa angka antara 0 dan 100.' });
    }
    if (!['TUGAS', 'UTS', 'UAS'].includes(jenis)) return res.status(400).json({ error: 'Jenis nilai tidak valid.' });
    if (!['GANJIL', 'GENAP'].includes(semester)) return res.status(400).json({ error: 'Semester tidak valid.' });
    if (!isAcademicYearLabel(tahunAjaran)) return res.status(400).json({ error: 'Tahun ajaran tidak valid.' });

    const year = await prisma.tahunAjaran.findUnique({ where: { nama: tahunAjaran } });
    if (!year) return res.status(404).json({ error: 'Tahun ajaran belum terdaftar.' });
    const enrollment = await prisma.riwayatKelas.findUnique({
      where: { siswaId_tahunAjaranId: { siswaId, tahunAjaranId: year.id } }
    });
    if (!enrollment) return res.status(400).json({ error: 'Siswa tidak memiliki penempatan kelas pada tahun ajaran tersebut.' });

    // Validasi wewenang pengampu: Jika role GURU, pastikan mapel ini memang diampu oleh guru yang login
    const assignment = await prisma.penugasanMapel.findUnique({
        where: {
          mapelId_kelasId_tahunAjaranId: {
            mapelId,
            kelasId: enrollment.kelasId,
            tahunAjaranId: year.id
          }
        },
        include: { guru: { select: { userId: true } } }
    });
    if (!assignment) return res.status(400).json({ error: 'Mata pelajaran belum ditugaskan ke kelas pada tahun ajaran tersebut.' });
    const isTeacher = role === 'GURU' || role === 'GURU_MAPEL' || role === 'GURU_WALI';
    if (isTeacher && assignment.guru.userId !== userId) {
      return res.status(403).json({ error: 'Anda tidak ditugaskan mengajar mata pelajaran ini di kelas dan tahun ajaran tersebut.' });
    }

    const nilai = await prisma.nilai.upsert({
      where: {
        siswaId_mapelId_jenis_semester_tahunAjaran: {
          siswaId,
          mapelId,
          jenis,
          semester,
          tahunAjaran
        }
      },
      update: {
        skor: numericScore
      },
      create: {
        siswaId,
        mapelId,
        jenis,
        skor: numericScore,
        semester,
        tahunAjaran
      }
    });

    res.status(200).json({ message: 'Nilai berhasil disimpan', data: nilai });
  } catch (error: unknown) {
    console.error('Error upsert nilai:', error);
    res.status(500).json({ error: 'Gagal menyimpan nilai ke database' });
  }
};

export const getNilaiByMapel = async (req: AuthRequest, res: Response) => {
  try {
    const { mapelId, semester, tahunAjaran, kelasId } = req.query;

    if (!mapelId) {
      return res.status(400).json({ error: 'ID Mata Pelajaran wajib disertakan' });
    }

    const yearLabel = String(tahunAjaran || '');
    if (!isAcademicYearLabel(yearLabel) || !['GANJIL', 'GENAP'].includes(String(semester))) {
      return res.status(400).json({ error: 'Semester dan tahun ajaran wajib diisi dengan nilai yang valid.' });
    }
    const year = await prisma.tahunAjaran.findUnique({ where: { nama: yearLabel } });
    if (!year) return res.status(404).json({ error: 'Tahun ajaran belum terdaftar.' });
    const subjectExists = await prisma.mapel.findUnique({ where: { id: String(mapelId) }, select: { id: true } });
    if (!subjectExists) return res.status(404).json({ error: 'Mata pelajaran tidak ditemukan.' });

    let allowedClassIds: string[] | undefined;
    const isTeacherRole = req.user?.role === 'GURU' || req.user?.role === 'GURU_MAPEL' || req.user?.role === 'GURU_WALI';
    if (isTeacherRole && req.user) {
      const guru = await prisma.guru.findUnique({ where: { userId: req.user.id }, select: { id: true } });
      if (!guru) return res.status(403).json({ error: 'Profil guru tidak ditemukan.' });
      const assignments = await prisma.penugasanMapel.findMany({
        where: { guruId: guru.id, mapelId: String(mapelId), tahunAjaranId: year.id },
        select: { kelasId: true }
      });
      allowedClassIds = assignments.map((assignment) => assignment.kelasId);
      if (kelasId && !allowedClassIds.includes(String(kelasId))) {
        return res.status(403).json({ error: 'Anda tidak ditugaskan untuk mata pelajaran dan kelas tersebut.' });
      }
      if (allowedClassIds.length === 0) return res.json([]);
    }
    const requestedClassIds = kelasId ? [String(kelasId)] : allowedClassIds;

    const data = await prisma.nilai.findMany({
      where: {
        mapelId: String(mapelId),
        semester: String(semester),
        tahunAjaran: yearLabel,
        siswa: { riwayatKelas: { some: {
          tahunAjaranId: year.id,
          ...(requestedClassIds ? { kelasId: { in: requestedClassIds } } : {})
        } } }
      },
      include: {
        siswa: {
          select: { id: true, nama: true, nisn: true, kelasId: true }
        }
      }
    });

    res.json(data);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      sendDatabaseUnavailable(res, error, 'mengambil data nilai');
      return;
    }
    res.status(500).json({ error: 'Gagal mengambil data nilai' });
  }
};

export const getNilaiSaya = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const { semester, tahunAjaran } = req.query;
    const semesterLabel = semester ? String(semester) : undefined;
    const yearLabel = tahunAjaran ? String(tahunAjaran) : undefined;
    if (semesterLabel && !['GANJIL', 'GENAP'].includes(semesterLabel)) {
      return res.status(400).json({ error: 'Semester tidak valid.' });
    }
    if (yearLabel && !isAcademicYearLabel(yearLabel)) {
      return res.status(400).json({ error: 'Tahun ajaran tidak valid.' });
    }

    let targetSiswaIds: string[] = [];

    if (role === 'SISWA') {
      const siswa = await prisma.siswa.findUnique({ where: { userId } });
      if (!siswa) return res.status(404).json({ error: 'Data siswa tidak ditemukan' });
      targetSiswaIds = [siswa.id];
    } else if (role === 'ORTU') {
      const ortu = await prisma.ortu.findUnique({
        where: { userId },
        include: { anak: true }
      });
      if (!ortu || ortu.anak.length === 0) {
        return res.status(404).json({ error: 'Data anak tidak ditemukan untuk akun orang tua ini' });
      }
      targetSiswaIds = ortu.anak.map(a => a.id);
    } else {
      return res.status(403).json({ error: 'Hanya dapat diakses oleh Siswa atau Orang Tua' });
    }

    const nilaiRecords = await prisma.nilai.findMany({
      where: {
        siswaId: { in: targetSiswaIds },
        ...(semesterLabel && { semester: semesterLabel }),
        ...(yearLabel && { tahunAjaran: yearLabel }),
      },
      include: {
        mapel: true,
        siswa: { select: { id: true, nama: true, nisn: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const yearLabels = [...new Set(nilaiRecords.map((record) => record.tahunAjaran))];
    const academicYears = await prisma.tahunAjaran.findMany({
      where: { nama: { in: yearLabels } },
      select: { id: true, nama: true }
    });
    const academicYearIdByName = new Map(academicYears.map((year) => [year.nama, year.id]));
    const academicYearIds = academicYears.map((year) => year.id);
    const [enrollments, subjectAssignments, homeroomAssignments] = academicYearIds.length
      ? await Promise.all([
          prisma.riwayatKelas.findMany({
            where: { siswaId: { in: targetSiswaIds }, tahunAjaranId: { in: academicYearIds } },
            include: { kelas: true }
          }),
          prisma.penugasanMapel.findMany({
            where: { mapelId: { in: [...new Set(nilaiRecords.map((record) => record.mapelId))] }, tahunAjaranId: { in: academicYearIds } },
            include: { guru: { select: { nama: true } } }
          }),
          prisma.penugasanWali.findMany({
            where: { tahunAjaranId: { in: academicYearIds } },
            include: { guru: { select: { nama: true, nip: true } } }
          })
        ])
      : [[], [], []];
    const enrollmentByStudentYear = new Map(enrollments.map((enrollment) => [
      `${enrollment.siswaId}:${enrollment.tahunAjaranId}`,
      enrollment
    ]));
    const subjectAssignmentByClassYear = new Map(subjectAssignments.map((assignment) => [
      `${assignment.mapelId}:${assignment.kelasId}:${assignment.tahunAjaranId}`,
      assignment
    ]));
    const homeroomByClassYear = new Map(homeroomAssignments.map((assignment) => [
      `${assignment.kelasId}:${assignment.tahunAjaranId}`,
      assignment
    ]));
    const data = nilaiRecords.map((record) => {
      const yearId = academicYearIdByName.get(record.tahunAjaran);
      const enrollment = yearId ? enrollmentByStudentYear.get(`${record.siswaId}:${yearId}`) : undefined;
      const subjectAssignment = yearId && enrollment
        ? subjectAssignmentByClassYear.get(`${record.mapelId}:${enrollment.kelasId}:${yearId}`)
        : undefined;
      const homeroomAssignment = yearId && enrollment
        ? homeroomByClassYear.get(`${enrollment.kelasId}:${yearId}`)
        : undefined;
      return {
        ...record,
        mapel: { ...record.mapel, guru: subjectAssignment?.guru || null },
        siswa: {
          ...record.siswa,
          kelas: enrollment ? { ...enrollment.kelas, wali: homeroomAssignment?.guru || null } : null
        }
      };
    });

    // Ambil juga catatan rapor (kehadiran, sikap, ekskul, catatan wali)
    const catatanRapor = await prisma.catatanRapor.findMany({
      where: {
        siswaId: { in: targetSiswaIds },
        ...(semesterLabel && { semester: semesterLabel }),
        ...(yearLabel && { tahunAjaran: yearLabel }),
      }
    });
    const siswaList = await prisma.siswa.findMany({
      where: { id: { in: targetSiswaIds } },
      select: { id: true, nama: true, nisn: true }
    });

    res.json({
      nilai: data,
      catatanRapor: catatanRapor[0] || null,
      catatanRaporList: catatanRapor,
      siswaList,
      siswaId: targetSiswaIds[0] || null
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      sendDatabaseUnavailable(res, error, 'mengambil nilai siswa');
      return;
    }
    console.error('Error getNilaiSaya:', error);
    res.status(500).json({ error: 'Gagal mengambil data nilai saya' });
  }
};
