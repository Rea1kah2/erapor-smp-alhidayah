import { type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const upsertNilai = async (req: Request, res: Response) => {
  try {
    const { siswaId, mapelId, jenis, skor, semester, tahunAjaran } = req.body;

    if (!siswaId || !mapelId || !jenis || skor === undefined || !semester || !tahunAjaran) {
      return res.status(400).json({ error: 'Semua kolom data (termasuk skor) wajib diisi' });
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
        skor: Number(skor)
      },
      create: {
        siswaId,
        mapelId,
        jenis,
        skor: Number(skor),
        semester,
        tahunAjaran
      }
    });

    res.status(200).json({ message: 'Nilai berhasil disimpan', data: nilai });
  } catch (error: any) {
    console.error('Error upsert nilai:', error);
    res.status(500).json({ error: 'Gagal menyimpan nilai ke database' });
  }
};

export const getNilaiByMapel = async (req: Request, res: Response) => {
  try {
    const { mapelId, semester, tahunAjaran, kelasId } = req.query;

    if (!mapelId) {
      return res.status(400).json({ error: 'ID Mata Pelajaran wajib disertakan' });
    }

    const data = await prisma.nilai.findMany({
      where: {
        mapelId: String(mapelId),
        ...(semester && { semester: String(semester) }),
        ...(tahunAjaran && { tahunAjaran: String(tahunAjaran) }),
        ...(kelasId && {
          siswa: {
            kelasId: String(kelasId)
          }
        })
      },
      include: {
        siswa: {
          select: { id: true, nama: true, nisn: true, kelasId: true }
        }
      }
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data nilai' });
  }
};

export const getNilaiSaya = async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    const { semester, tahunAjaran } = req.query;

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

    const data = await prisma.nilai.findMany({
      where: {
        siswaId: { in: targetSiswaIds },
        ...(semester && { semester: String(semester) }),
        ...(tahunAjaran && { tahunAjaran: String(tahunAjaran) }),
      },
      include: {
        mapel: {
          include: {
            guru: { select: { nama: true } }
          }
        },
        siswa: {
          select: {
            id: true,
            nama: true,
            nisn: true,
            kelas: { 
              select: { 
                nama: true,
                tingkat: true,
                wali: { select: { nama: true, nip: true } }
              } 
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Ambil juga catatan rapor (kehadiran, sikap, ekskul, catatan wali)
    const catatanRapor = await prisma.catatanRapor.findMany({
      where: {
        siswaId: { in: targetSiswaIds },
        ...(semester && { semester: String(semester) }),
        ...(tahunAjaran && { tahunAjaran: String(tahunAjaran) }),
      }
    });

    res.json({
      nilai: data,
      catatanRapor: catatanRapor[0] || null,
      siswaId: targetSiswaIds[0] || null
    });
  } catch (error) {
    console.error('Error getNilaiSaya:', error);
    res.status(500).json({ error: 'Gagal mengambil data nilai saya' });
  }
};