import { type Response } from 'express';
import { type AuthRequest } from '../middleware/auth.js';
import { isAcademicYearLabel } from '../lib/academic.js';
import { hitungNilaiAkhir } from '../lib/grade.js';
import { prisma } from '../lib/prisma.js';
import { isDatabaseUnavailableError, sendDatabaseUnavailable } from '../lib/database.js';

// 1. Ambil data kelas binaan untuk guru yang login (atau semua kelas untuk admin)
export const getKelasBinaan = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    const requestedYear = req.query.tahunAjaran ? String(req.query.tahunAjaran) : undefined;
    const year = requestedYear
      ? await prisma.tahunAjaran.findUnique({ where: { nama: requestedYear } })
      : await prisma.tahunAjaran.findFirst({ where: { aktif: true } });
    if (!year) return res.status(requestedYear ? 404 : 400).json({ error: 'Tahun ajaran tidak ditemukan atau belum aktif.' });

    if (role === 'ADMIN') {
      const allKelas = await prisma.kelas.findMany({
        where: { tahunAjaranId: year.id },
        include: {
          penugasanWali: { where: { tahunAjaranId: year.id }, include: { guru: { select: { id: true, nama: true, nip: true } } } },
          riwayatSiswa: { where: { tahunAjaranId: year.id }, select: { id: true } }
        },
        orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }]
      });
      return res.json({ role, isWali: true, tahunAjaran: year.nama, kelasList: allKelas.map(({ penugasanWali, riwayatSiswa, ...kelas }) => ({
        ...kelas,
        wali: penugasanWali[0]?.guru || null,
        _count: { siswa: riwayatSiswa.length }
      })) });
    }

    if (role === 'GURU') {
      const guru = await prisma.guru.findUnique({ where: { userId } });

      if (!guru) return res.status(404).json({ error: 'Data guru tidak ditemukan' });

      const assignments = await prisma.penugasanWali.findMany({
        where: { guruId: guru.id, tahunAjaranId: year.id },
        include: { kelas: { include: { _count: { select: { riwayatSiswa: { where: { tahunAjaranId: year.id } } } } } } }
      });
      if (assignments.length === 0) {
        return res.json({
          role,
          isWali: false,
          tahunAjaran: year.nama,
          message: 'Anda tidak ditugaskan sebagai Wali Kelas saat ini',
          kelas: null
        });
      }

      return res.json({
        role,
        isWali: true,
        guru: { id: guru.id, nama: guru.nama, nip: guru.nip },
        tahunAjaran: year.nama,
        kelas: assignments[0]?.kelas || null,
        kelasList: assignments.map((assignment) => assignment.kelas)
      });
    }

    return res.status(403).json({ error: 'Akses ditolak' });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      sendDatabaseUnavailable(res, error, 'memuat kelas binaan');
      return;
    }
    console.error('Error getKelasBinaan:', error);
    res.status(500).json({ error: 'Gagal memuat data kelas binaan' });
  }
};

// 2. Ambil rekapitulasi nilai dan catatan rapor per kelas
export const getRekapKelas = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    let targetKelasId = req.query.kelasId ? String(req.query.kelasId) : undefined;
    const semester = req.query.semester ? String(req.query.semester) : 'GANJIL';
    const tahunAjaran = req.query.tahunAjaran ? String(req.query.tahunAjaran) : undefined;
    if (!['GANJIL', 'GENAP'].includes(semester)) return res.status(400).json({ error: 'Semester tidak valid.' });
    if (!isAcademicYearLabel(tahunAjaran)) return res.status(400).json({ error: 'Tahun ajaran wajib diisi dengan format YYYY/YYYY.' });
    const year = await prisma.tahunAjaran.findUnique({ where: { nama: tahunAjaran } });
    if (!year) return res.status(404).json({ error: 'Tahun ajaran belum terdaftar.' });

    // Validasi wewenang wali kelas jika role GURU
    if (role === 'GURU') {
      const guru = await prisma.guru.findUnique({ where: { userId } });
      const assignments = guru ? await prisma.penugasanWali.findMany({ where: { guruId: guru.id, tahunAjaranId: year.id } }) : [];
      if (!guru || assignments.length === 0) {
        return res.status(403).json({ error: 'Anda bukan wali kelas dari kelas manapun' });
      }

      // Wali kelas hanya dapat merekap kelas yang ditugaskan pada tahun tersebut.
      if (!targetKelasId) targetKelasId = assignments[0]?.kelasId;
      if (!assignments.some((assignment) => assignment.kelasId === targetKelasId)) {
        return res.status(403).json({ error: 'Anda bukan wali kelas untuk kelas tersebut pada tahun ajaran ini.' });
      }
    }

    if (!targetKelasId) {
      return res.status(400).json({ error: 'ID Kelas wajib disertakan' });
    }

    const kelas = await prisma.kelas.findUnique({
      where: { id: targetKelasId },
      include: {
        wali: { select: { id: true, nama: true, nip: true } }
      }
    });

    if (!kelas) return res.status(404).json({ error: 'Kelas tidak ditemukan' });
    if (kelas.tahunAjaranId !== year.id) return res.status(404).json({ error: 'Kelas bukan bagian dari tahun ajaran yang dipilih.' });

    const waliAssignment = await prisma.penugasanWali.findUnique({
      where: { kelasId_tahunAjaranId: { kelasId: targetKelasId, tahunAjaranId: year.id } },
      include: { guru: { select: { id: true, nama: true, nip: true } } }
    });
    const kelasResponse = { ...kelas, wali: waliAssignment?.guru || null };

    // Mata pelajaran hanya yang ditugaskan di kelas dan tahun ini.
    const assignments = await prisma.penugasanMapel.findMany({
      where: { kelasId: targetKelasId, tahunAjaranId: year.id },
      include: { mapel: true, guru: { select: { nama: true } } },
      orderBy: { mapel: { nama: 'asc' } }
    });
    const mapelList = assignments.map(({ mapel, guru }) => ({ ...mapel, guru }));

    // Ambil semua siswa di kelas ini
    const siswaList = await prisma.siswa.findMany({
      where: { riwayatKelas: { some: { kelasId: targetKelasId, tahunAjaranId: year.id } } },
      orderBy: { nama: 'asc' },
      include: {
        nilai: {
          where: { semester, tahunAjaran }
        },
        catatanRapor: {
          where: { semester, tahunAjaran }
        }
      }
    });

    // Susun rekapitulasi terstruktur
    const rekapSiswa = siswaList.map((siswa) => {
      let totalNilaiAkhir = 0;
      let mapelDinilaiCount = 0;

      const nilaiMapel = mapelList.map((mapel) => {
        const nilaiTugas = siswa.nilai.find((n) => n.mapelId === mapel.id && n.jenis === 'TUGAS')?.skor ?? null;
        const nilaiUTS = siswa.nilai.find((n) => n.mapelId === mapel.id && n.jenis === 'UTS')?.skor ?? null;
        const nilaiUAS = siswa.nilai.find((n) => n.mapelId === mapel.id && n.jenis === 'UAS')?.skor ?? null;

        const kalkulasi = hitungNilaiAkhir(nilaiTugas, nilaiUTS, nilaiUAS, mapel.kkm);

        if (kalkulasi.status !== 'Belum Ada Nilai') {
          totalNilaiAkhir += kalkulasi.akhir;
          mapelDinilaiCount++;
        }

        return {
          mapelId: mapel.id,
          namaMapel: mapel.nama,
          kkm: mapel.kkm,
          guru: mapel.guru?.nama || '-',
          tugas: nilaiTugas,
          uts: nilaiUTS,
          uas: nilaiUAS,
          nilaiAkhir: kalkulasi.akhir,
          predikat: kalkulasi.predikat,
          status: kalkulasi.status
        };
      });

      const rataRata = mapelDinilaiCount > 0 ? Math.round((totalNilaiAkhir / mapelDinilaiCount) * 10) / 10 : 0;
      const catatan = siswa.catatanRapor[0] || null;

      return {
        siswaId: siswa.id,
        nama: siswa.nama,
        nisn: siswa.nisn,
        rataRata,
        mapelDinilaiCount,
        nilaiMapel,
        catatanRapor: catatan
      };
    });

    // Urutkan berdasarkan rata-rata untuk kalkulasi peringkat (Ranking)
    const sortedByRata = [...rekapSiswa].sort((a, b) => b.rataRata - a.rataRata);
    const rankingMap = new Map<string, number>();
    sortedByRata.forEach((item, index) => {
      rankingMap.set(item.siswaId, index + 1);
    });

    const hasilRekap = rekapSiswa.map((item) => ({
      ...item,
      ranking: rankingMap.get(item.siswaId) || 0,
      totalSiswa: rekapSiswa.length
    }));

    res.json({
      kelas: kelasResponse,
      semester,
      tahunAjaran,
      mapelList,
      rekap: hasilRekap
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      sendDatabaseUnavailable(res, error, 'memuat rekapitulasi kelas');
      return;
    }
    console.error('Error getRekapKelas:', error);
    res.status(500).json({ error: 'Gagal memuat rekapitulasi kelas' });
  }
};

// 3. Simpan / Perbarui Catatan Rapor (Kehadiran, Sikap, Ekskul, Catatan Wali)
export const saveCatatanRapor = async (req: AuthRequest, res: Response) => {
  try {
    const {
      siswaId,
      semester,
      tahunAjaran,
      sakit,
      izin,
      alfa,
      sikapSpiritual,
      deskripsiSpiritual,
      sikapSosial,
      deskripsiSosial,
      ekskul,
      catatanWali,
      statusKenaikan
    } = req.body;

    if (!siswaId || !semester || !tahunAjaran) {
      return res.status(400).json({ error: 'ID Siswa, semester, dan tahun ajaran wajib disertakan' });
    }
    if (!['GANJIL', 'GENAP'].includes(semester) || !isAcademicYearLabel(tahunAjaran)) {
      return res.status(400).json({ error: 'Semester atau tahun ajaran tidak valid.' });
    }
    for (const [label, value] of [['Sakit', sakit], ['Izin', izin], ['Alfa', alfa]] as const) {
      if (value !== undefined && (value === null || value === '' || (typeof value !== 'number' && typeof value !== 'string') || !Number.isInteger(Number(value)) || Number(value) < 0)) {
        return res.status(400).json({ error: `Jumlah ${label} harus berupa bilangan bulat nonnegatif.` });
      }
    }
    if (sikapSpiritual !== undefined && !['A', 'B', 'C', 'D'].includes(sikapSpiritual)) return res.status(400).json({ error: 'Predikat sikap spiritual tidak valid.' });
    if (sikapSosial !== undefined && !['A', 'B', 'C', 'D'].includes(sikapSosial)) return res.status(400).json({ error: 'Predikat sikap sosial tidak valid.' });
    for (const [label, value] of [['Deskripsi sikap spiritual', deskripsiSpiritual], ['Deskripsi sikap sosial', deskripsiSosial], ['Catatan wali', catatanWali], ['Status kenaikan', statusKenaikan]] as const) {
      if (value !== undefined && value !== null && typeof value !== 'string') return res.status(400).json({ error: `${label} harus berupa teks.` });
    }
    if (ekskul !== undefined && !Array.isArray(ekskul)) return res.status(400).json({ error: 'Data ekstrakurikuler harus berupa daftar.' });

    const year = await prisma.tahunAjaran.findUnique({ where: { nama: tahunAjaran } });
    if (!year) return res.status(404).json({ error: 'Tahun ajaran belum terdaftar.' });
    const enrollment = await prisma.riwayatKelas.findUnique({
      where: { siswaId_tahunAjaranId: { siswaId, tahunAjaranId: year.id } }
    });
    if (!enrollment) return res.status(404).json({ error: 'Siswa tidak memiliki riwayat kelas pada tahun ajaran tersebut.' });

    if (req.user?.role === 'GURU') {
      const guru = await prisma.guru.findUnique({ where: { userId: req.user.id }, select: { id: true } });
      const assigned = guru && await prisma.penugasanWali.findUnique({
        where: { kelasId_tahunAjaranId: { kelasId: enrollment.kelasId, tahunAjaranId: year.id } },
        select: { guruId: true }
      });
      if (!assigned || assigned.guruId !== guru?.id) return res.status(403).json({ error: 'Anda bukan wali kelas siswa ini pada tahun ajaran tersebut.' });
    }

    const saved = await prisma.catatanRapor.upsert({
      where: {
        siswaId_semester_tahunAjaran: {
          siswaId,
          semester,
          tahunAjaran
        }
      },
      update: {
        sakit: sakit !== undefined ? Number(sakit) : 0,
        izin: izin !== undefined ? Number(izin) : 0,
        alfa: alfa !== undefined ? Number(alfa) : 0,
        sikapSpiritual: sikapSpiritual || null,
        deskripsiSpiritual: deskripsiSpiritual || null,
        sikapSosial: sikapSosial || null,
        deskripsiSosial: deskripsiSosial || null,
        ekskul: ekskul || [],
        catatanWali: catatanWali || '',
        statusKenaikan: statusKenaikan || null
      },
      create: {
        siswaId,
        semester,
        tahunAjaran,
        sakit: sakit !== undefined ? Number(sakit) : 0,
        izin: izin !== undefined ? Number(izin) : 0,
        alfa: alfa !== undefined ? Number(alfa) : 0,
        sikapSpiritual: sikapSpiritual || null,
        deskripsiSpiritual: deskripsiSpiritual || null,
        sikapSosial: sikapSosial || null,
        deskripsiSosial: deskripsiSosial || null,
        ekskul: ekskul || [],
        catatanWali: catatanWali || '',
        statusKenaikan: statusKenaikan || null
      }
    });

    res.json({ message: 'Catatan rapor berhasil disimpan', data: saved });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      sendDatabaseUnavailable(res, error, 'menyimpan catatan rapor');
      return;
    }
    console.error('Error saveCatatanRapor:', error);
    res.status(500).json({ error: 'Gagal menyimpan catatan rapor' });
  }
};

// 4. Data Rapor Cetak Lengkap 1 Siswa (Untuk Lembar Cetak / Preview A4)
export const getLembarRaporSiswa = async (req: AuthRequest, res: Response) => {
  try {
    const siswaId = String(req.params.siswaId);
    const semester = req.query.semester ? String(req.query.semester) : 'GANJIL';
    const tahunAjaran = req.query.tahunAjaran ? String(req.query.tahunAjaran) : '';
    if (!['GANJIL', 'GENAP'].includes(semester) || !isAcademicYearLabel(tahunAjaran)) {
      return res.status(400).json({ error: 'Semester dan tahun ajaran tidak valid.' });
    }
    const year = await prisma.tahunAjaran.findUnique({ where: { nama: tahunAjaran } });
    if (!year) return res.status(404).json({ error: 'Tahun ajaran belum terdaftar.' });
    const userId = req.user?.id;
    const role = req.user?.role;

    // Proteksi Hak Akses Berdasarkan Role
    if (role === 'SISWA') {
      const currentSiswa = await prisma.siswa.findUnique({ where: { userId } });
      if (!currentSiswa || currentSiswa.id !== siswaId) {
        return res.status(403).json({ error: 'Akses ditolak: Anda hanya berhak mengakses lembar rapor milik Anda sendiri.' });
      }
    } else if (role === 'ORTU') {
      const currentOrtu = await prisma.ortu.findUnique({
        where: { userId },
        include: { anak: true }
      });
      const isAnakSendiri = currentOrtu?.anak.some(a => a.id === siswaId);
      if (!isAnakSendiri) {
        return res.status(403).json({ error: 'Akses ditolak: Anda hanya berhak mengakses lembar rapor anak Anda sendiri.' });
      }
    } else if (role === 'GURU') {
      const guru = await prisma.guru.findUnique({ where: { userId }, select: { id: true } });
      const enrollment = await prisma.riwayatKelas.findUnique({ where: { siswaId_tahunAjaranId: { siswaId, tahunAjaranId: year.id } } });
      const assignment = enrollment && await prisma.penugasanWali.findUnique({
        where: { kelasId_tahunAjaranId: { kelasId: enrollment.kelasId, tahunAjaranId: year.id } },
        select: { guruId: true }
      });
      if (!guru || !assignment || assignment.guruId !== guru.id) {
        return res.status(403).json({ error: 'Akses ditolak: Siswa ini bukan merupakan anggota kelas binaan Anda.' });
      }
    }

    const siswa = await prisma.siswa.findUnique({
      where: { id: siswaId },
      include: {
        kelas: {
          include: {
            wali: { select: { nama: true, nip: true } }
          }
        },
        ortu: { select: { nama: true } },
        nilai: {
          where: { semester, tahunAjaran },
          include: { mapel: true }
        },
        catatanRapor: {
          where: { semester, tahunAjaran }
        },
        riwayatKelas: { where: { tahunAjaranId: year.id }, include: { kelas: true } }
      }
    });

    if (!siswa) return res.status(404).json({ error: 'Data siswa tidak ditemukan' });

    const historicalClass = siswa.riwayatKelas[0]?.kelas;
    if (!historicalClass) return res.status(404).json({ error: 'Riwayat kelas siswa untuk tahun ajaran tersebut tidak ditemukan.' });
    const waliAssignment = await prisma.penugasanWali.findUnique({
      where: { kelasId_tahunAjaranId: { kelasId: historicalClass.id, tahunAjaranId: year.id } },
      include: { guru: { select: { nama: true, nip: true } } }
    });
    const subjectAssignments = await prisma.penugasanMapel.findMany({
      where: { kelasId: historicalClass.id, tahunAjaranId: year.id },
      include: { mapel: true, guru: { select: { nama: true } } },
      orderBy: { mapel: { nama: 'asc' } }
    });
    const mapelList = subjectAssignments.map(({ mapel, guru }) => ({ ...mapel, guru }));

    let totalNilaiAkhir = 0;
    let countDinilai = 0;

    const dataNilai = mapelList.map((mapel) => {
      const tugas = siswa.nilai.find((n) => n.mapelId === mapel.id && n.jenis === 'TUGAS')?.skor ?? null;
      const uts = siswa.nilai.find((n) => n.mapelId === mapel.id && n.jenis === 'UTS')?.skor ?? null;
      const uas = siswa.nilai.find((n) => n.mapelId === mapel.id && n.jenis === 'UAS')?.skor ?? null;

      const kalkulasi = hitungNilaiAkhir(tugas, uts, uas, mapel.kkm);

      if (kalkulasi.status !== 'Belum Ada Nilai') {
        totalNilaiAkhir += kalkulasi.akhir;
        countDinilai++;
      }

      return {
        mapelId: mapel.id,
        nama: mapel.nama,
        kkm: mapel.kkm,
        guru: mapel.guru?.nama || '-',
        tugas,
        uts,
        uas,
        nilaiAkhir: kalkulasi.akhir,
        predikat: kalkulasi.predikat,
        status: kalkulasi.status,
        keterangan: kalkulasi.keterangan
      };
    });

    const rataRata = countDinilai > 0 ? Math.round((totalNilaiAkhir / countDinilai) * 10) / 10 : 0;
    const catatan = {
      tersedia: Boolean(siswa.catatanRapor[0]),
      ...(siswa.catatanRapor[0] || {
        sakit: 0,
        izin: 0,
        alfa: 0,
        sikapSpiritual: null,
        deskripsiSpiritual: null,
        sikapSosial: null,
        deskripsiSosial: null,
        ekskul: [],
        catatanWali: '',
        statusKenaikan: null
      })
    };

    // Informasi resmi sekolah
    const sekolah = {
      namaSekolah: process.env.SCHOOL_NAME || 'Belum diatur',
      yayasan: process.env.SCHOOL_FOUNDATION || 'Belum diatur',
      npsn: process.env.SCHOOL_NPSN || 'Belum diatur',
      alamat: process.env.SCHOOL_ADDRESS || 'Belum diatur',
      telepon: process.env.SCHOOL_PHONE || 'Belum diatur',
      kepalaSekolah: process.env.PRINCIPAL_NAME || 'Belum diatur',
      nipKepalaSekolah: process.env.PRINCIPAL_NIP || 'Belum diatur',
      tanggalRapor: semester === 'GANJIL'
        ? process.env.RAPOR_DATE_GANJIL || 'Belum ditetapkan'
        : process.env.RAPOR_DATE_GENAP || 'Belum ditetapkan'
    };

    res.json({
      sekolah,
      siswa: {
        id: siswa.id,
        nama: siswa.nama,
        nisn: siswa.nisn,
        kelas: historicalClass.nama,
        tingkat: historicalClass.tingkat,
        waliKelas: waliAssignment?.guru.nama || '-',
        nipWaliKelas: waliAssignment?.guru.nip || '-',
        namaOrtu: siswa.ortu?.nama || '-'
      },
      semester,
      tahunAjaran,
      nilai: dataNilai,
      rekapitulasi: {
        totalNilai: Math.round(totalNilaiAkhir * 10) / 10,
        rataRata,
        mataPelajaranDinilai: countDinilai,
        totalMataPelajaran: mapelList.length
      },
      catatanRapor: catatan
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      sendDatabaseUnavailable(res, error, 'memuat lembar rapor');
      return;
    }
    console.error('Error getLembarRaporSiswa:', error);
    res.status(500).json({ error: 'Gagal memuat lembar rapor siswa' });
  }
};
