import { type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { type AuthRequest } from '../middleware/auth.js';

const prisma = new PrismaClient();

// Helper untuk menghitung Nilai Akhir & Predikat SMP
export function hitungNilaiAkhir(tugas?: number | null, uts?: number | null, uas?: number | null, kkm: number = 75) {
  const adaTugas = tugas !== undefined && tugas !== null;
  const adaUTS = uts !== undefined && uts !== null;
  const adaUAS = uas !== undefined && uas !== null;

  if (!adaTugas && !adaUTS && !adaUAS) {
    return { akhir: 0, predikat: '-', status: 'Belum Ada Nilai', keterangan: '-' };
  }

  // Bobot SMP: Tugas 40%, UTS 30%, UAS 30%
  let totalBobot = 0;
  let akumulasi = 0;

  if (adaTugas) {
    akumulasi += Number(tugas) * 0.4;
    totalBobot += 0.4;
  }
  if (adaUTS) {
    akumulasi += Number(uts) * 0.3;
    totalBobot += 0.3;
  }
  if (adaUAS) {
    akumulasi += Number(uas) * 0.3;
    totalBobot += 0.3;
  }

  const akhir = totalBobot > 0 ? Math.round((akumulasi / totalBobot) * 10) / 10 : 0;

  let predikat = 'D';
  let keterangan = 'Kurang (Perlu Perbaikan)';
  if (akhir >= 90) {
    predikat = 'A';
    keterangan = 'Sangat Baik';
  } else if (akhir >= 80) {
    predikat = 'B';
    keterangan = 'Baik';
  } else if (akhir >= kkm) {
    predikat = 'C';
    keterangan = 'Cukup (Tuntas KKM)';
  }

  const status = akhir >= kkm ? 'Tuntas' : 'Belum Tuntas';

  return { akhir, predikat, status, keterangan };
}

// 1. Ambil data kelas binaan untuk guru yang login (atau semua kelas untuk admin)
export const getKelasBinaan = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;

    if (role === 'ADMIN') {
      const allKelas = await prisma.kelas.findMany({
        include: {
          wali: { select: { id: true, nama: true, nip: true } },
          _count: { select: { siswa: true } }
        },
        orderBy: [{ tingkat: 'asc' }, { nama: 'asc' }]
      });
      return res.json({ role, isWali: true, kelasList: allKelas });
    }

    if (role === 'GURU') {
      const guru = await prisma.guru.findUnique({
        where: { userId },
        include: {
          kelasWali: {
            include: {
              _count: { select: { siswa: true } }
            }
          }
        }
      });

      if (!guru) return res.status(404).json({ error: 'Data guru tidak ditemukan' });

      if (!guru.kelasWali) {
        return res.json({
          role,
          isWali: false,
          message: 'Anda tidak ditugaskan sebagai Wali Kelas saat ini',
          kelas: null
        });
      }

      return res.json({
        role,
        isWali: true,
        guru: { id: guru.id, nama: guru.nama, nip: guru.nip },
        kelas: guru.kelasWali
      });
    }

    return res.status(403).json({ error: 'Akses ditolak' });
  } catch (error) {
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
    const tahunAjaran = req.query.tahunAjaran ? String(req.query.tahunAjaran) : '2025/2026';

    // Validasi wewenang wali kelas jika role GURU
    if (role === 'GURU') {
      const guru = await prisma.guru.findUnique({
        where: { userId },
        include: { kelasWali: true }
      });

      if (!guru || !guru.kelasWali) {
        return res.status(403).json({ error: 'Anda bukan wali kelas dari kelas manapun' });
      }

      // Pastikan guru hanya dapat merekap kelas yang diampunya
      targetKelasId = guru.kelasWali.id;
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

    // Ambil semua mapel
    const mapelList = await prisma.mapel.findMany({
      include: { guru: { select: { nama: true } } },
      orderBy: { nama: 'asc' }
    });

    // Ambil semua siswa di kelas ini
    const siswaList = await prisma.siswa.findMany({
      where: { kelasId: targetKelasId },
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
      kelas,
      semester,
      tahunAjaran,
      mapelList,
      rekap: hasilRekap
    });
  } catch (error) {
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
        sikapSpiritual: sikapSpiritual || 'A',
        deskripsiSpiritual: deskripsiSpiritual || '',
        sikapSosial: sikapSosial || 'A',
        deskripsiSosial: deskripsiSosial || '',
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
        sikapSpiritual: sikapSpiritual || 'A',
        deskripsiSpiritual: deskripsiSpiritual || '',
        sikapSosial: sikapSosial || 'A',
        deskripsiSosial: deskripsiSosial || '',
        ekskul: ekskul || [],
        catatanWali: catatanWali || '',
        statusKenaikan: statusKenaikan || null
      }
    });

    res.json({ message: 'Catatan rapor berhasil disimpan', data: saved });
  } catch (error) {
    console.error('Error saveCatatanRapor:', error);
    res.status(500).json({ error: 'Gagal menyimpan catatan rapor' });
  }
};

// 4. Data Rapor Cetak Lengkap 1 Siswa (Untuk Lembar Cetak / Preview A4)
export const getLembarRaporSiswa = async (req: AuthRequest, res: Response) => {
  try {
    const siswaId = String(req.params.siswaId);
    const semester = req.query.semester ? String(req.query.semester) : 'GANJIL';
    const tahunAjaran = req.query.tahunAjaran ? String(req.query.tahunAjaran) : '2025/2026';
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
      // Pastikan jika guru, dia adalah wali kelas dari siswa yang bersangkutan (atau admin)
      const guru = await prisma.guru.findUnique({
        where: { userId },
        include: { kelasWali: true }
      });
      if (!guru || !guru.kelasWali) {
        return res.status(403).json({ error: 'Akses ditolak: Anda bukan wali kelas.' });
      }
      const targetSiswa = await prisma.siswa.findUnique({ where: { id: siswaId } });
      if (!targetSiswa || targetSiswa.kelasId !== guru.kelasWali.id) {
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
        }
      }
    });

    if (!siswa) return res.status(404).json({ error: 'Data siswa tidak ditemukan' });

    // Ambil seluruh mata pelajaran
    const mapelList = await prisma.mapel.findMany({
      include: { guru: { select: { nama: true } } },
      orderBy: { nama: 'asc' }
    });

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
    const catatan = siswa.catatanRapor[0] || {
      sakit: 0,
      izin: 0,
      alfa: 0,
      sikapSpiritual: 'A',
      deskripsiSpiritual: 'Menunjukkan ketaatan beribadah dan sikap berdoa dengan sangat baik.',
      sikapSosial: 'A',
      deskripsiSosial: 'Menunjukkan sikap santun, disiplin, peduli, dan bertanggung jawab.',
      ekskul: [
        { nama: 'Pramuka (Wajib)', predikat: 'A', keterangan: 'Aktif dan disiplin mengikuti kegiatan kepramukaan' }
      ],
      catatanWali: 'Pertahankan prestasi belajar dan tingkatkan terus keaktifan dalam kegiatan akademik.',
      statusKenaikan: semester === 'GENAP' ? 'Memenuhi syarat kenaikan kelas' : null
    };

    // Informasi resmi sekolah
    const sekolah = {
      namaSekolah: 'SMP AL-HIDAYAH',
      yayasan: 'YAYASAN PENDIDIKAN AL-HIDAYAH',
      npsn: '10210892',
      alamat: 'Jl. Letda Sujono No. 123, Medan, Sumatera Utara',
      telepon: '(061) 7361234',
      kepalaSekolah: 'Drs. H. Ahmad Fauzi, M.Pd.',
      nipKepalaSekolah: '19750817 200003 1 004',
      tanggalRapor: semester === 'GANJIL' ? '20 Desember 2025' : '20 Juni 2026'
    };

    res.json({
      sekolah,
      siswa: {
        id: siswa.id,
        nama: siswa.nama,
        nisn: siswa.nisn,
        kelas: siswa.kelas?.nama || '-',
        tingkat: siswa.kelas?.tingkat || 7,
        waliKelas: siswa.kelas?.wali?.nama || '-',
        nipWaliKelas: siswa.kelas?.wali?.nip || '-',
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
    console.error('Error getLembarRaporSiswa:', error);
    res.status(500).json({ error: 'Gagal memuat lembar rapor siswa' });
  }
};
