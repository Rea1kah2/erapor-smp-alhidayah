'use client';
import { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  Calendar, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Inbox, 
  FileText,
  User,
  School,
  RefreshCw,
  Printer,
  Heart,
  Smile,
  Activity
} from 'lucide-react';
import PrintableRapor, { RaporData } from '../components/PrintableRapor';

interface NilaiItem {
  id: string;
  skor: number;
  jenis: string;
  semester: string;
  tahunAjaran: string;
  mapel: {
    id: string;
    nama: string;
    kkm: number;
    guru?: { nama: string } | null;
  };
  siswa: {
    id: string;
    nama: string;
    nisn: string;
    kelas?: { 
      nama: string;
      tingkat: number;
      wali?: { nama: string; nip?: string | null } | null;
    } | null;
  };
}

interface CatatanRaporItem {
  sakit: number;
  izin: number;
  alfa: number;
  sikapSpiritual: string;
  deskripsiSpiritual: string;
  sikapSosial: string;
  deskripsiSosial: string;
  ekskul: Array<{ nama: string; predikat: string; keterangan: string }> | any;
  catatanWali: string;
  statusKenaikan?: string | null;
}

export default function RaporSayaPage() {
  const [nilaiList, setNilaiList] = useState<NilaiItem[]>([]);
  const [catatanRapor, setCatatanRapor] = useState<CatatanRaporItem | null>(null);
  const [targetSiswaId, setTargetSiswaId] = useState<string | null>(null);

  const [semester, setSemester] = useState<string>('GANJIL');
  const [tahunAjaran, setTahunAjaran] = useState<string>('2025/2026');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Print Preview Modal
  const [printData, setPrintData] = useState<RaporData | null>(null);
  const [isLoadingPrint, setIsLoadingPrint] = useState<boolean>(false);

  const fetchNilaiSaya = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('siakad_token');
      const res = await fetch(
        `http://localhost:3001/api/nilai/saya?semester=${semester}&tahunAjaran=${encodeURIComponent(tahunAjaran)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengambil data nilai');
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setNilaiList(data);
        if (data[0]?.siswa?.id) setTargetSiswaId(data[0].siswa.id);
      } else {
        setNilaiList(data.nilai || []);
        setCatatanRapor(data.catatanRapor || null);
        setTargetSiswaId(data.siswaId || data.nilai?.[0]?.siswa?.id || null);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal memuat rapor.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNilaiSaya();
  }, [semester, tahunAjaran]);

  // Kelompokkan nilai per mata pelajaran & hitung Nilai Akhir (Tugas 40%, UTS 30%, UAS 30%)
  const groupedByMapel = useMemo(() => {
    const map = new Map<string, {
      mapel: NilaiItem['mapel'];
      scores: Record<string, number>;
    }>();

    nilaiList.forEach((item) => {
      if (!map.has(item.mapel.id)) {
        map.set(item.mapel.id, {
          mapel: item.mapel,
          scores: {},
        });
      }
      map.get(item.mapel.id)!.scores[item.jenis] = item.skor;
    });

    return Array.from(map.values()).map(({ mapel, scores }) => {
      const tugas = scores.TUGAS !== undefined ? scores.TUGAS : null;
      const uts = scores.UTS !== undefined ? scores.UTS : null;
      const uas = scores.UAS !== undefined ? scores.UAS : null;

      let finalScore: number | null = null;
      let totalBobot = 0;
      let akumulasi = 0;

      if (tugas !== null) { akumulasi += tugas * 0.4; totalBobot += 0.4; }
      if (uts !== null) { akumulasi += uts * 0.3; totalBobot += 0.3; }
      if (uas !== null) { akumulasi += uas * 0.3; totalBobot += 0.3; }

      if (totalBobot > 0) {
        finalScore = Math.round((akumulasi / totalBobot) * 10) / 10;
      }

      let predikat = '-';
      if (finalScore !== null) {
        if (finalScore >= 90) predikat = 'A';
        else if (finalScore >= 80) predikat = 'B';
        else if (finalScore >= mapel.kkm) predikat = 'C';
        else predikat = 'D';
      }

      const passed = finalScore !== null ? finalScore >= mapel.kkm : false;

      return {
        mapel,
        tugas,
        uts,
        uas,
        finalScore,
        predikat,
        passed,
      };
    });
  }, [nilaiList]);

  // Statistik Rapor
  const stats = useMemo(() => {
    const totalMapel = groupedByMapel.length;
    let sumScore = 0;
    let scoredCount = 0;
    let tuntasCount = 0;

    groupedByMapel.forEach((item) => {
      if (item.finalScore !== null) {
        sumScore += item.finalScore;
        scoredCount++;
        if (item.passed) tuntasCount++;
      }
    });

    const ipk = scoredCount > 0 ? (sumScore / scoredCount).toFixed(1) : '0';

    return {
      totalMapel,
      scoredCount,
      rataRata: ipk,
      tuntasCount,
    };
  }, [groupedByMapel]);

  const siswaInfo = nilaiList[0]?.siswa;

  // Buka Pratinjau Lembar Cetak Rapor
  const handlePrintRapor = async () => {
    const sId = targetSiswaId || siswaInfo?.id;
    if (!sId) {
      alert('Data siswa belum tersedia untuk dicetak');
      return;
    }

    setIsLoadingPrint(true);
    try {
      const token = localStorage.getItem('siakad_token');
      const res = await fetch(`http://localhost:3001/api/wali/rapor/${sId}?semester=${semester}&tahunAjaran=${encodeURIComponent(tahunAjaran)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Gagal mengambil data lembar rapor siswa');
      const data = await res.json();
      setPrintData(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoadingPrint(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Halaman */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)]"></span>
            <span className="text-xs uppercase tracking-wider font-semibold text-accent">SMP Al-Hidayah</span>
          </div>
          <h1 className="text-2xl font-bold text-label leading-tight mt-1 flex items-center gap-2.5">
            <Award className="text-accent" size={26} />
            E-Rapor Hasil Belajar Siswa
          </h1>
          <p className="text-sm text-label-secondary">
            Laporan evaluasi akademik, nilai capaian akhir, catatan sikap, dan presensi terpadu.
          </p>
        </div>

        {/* Filter Semester, Tahun & Tombol Cetak */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="h-10 px-3.5 rounded-full bg-bg-secondary text-label font-medium text-xs border border-separator/40 focus:ring-2 focus:ring-accent outline-none cursor-pointer"
          >
            <option value="GANJIL">Semester Ganjil</option>
            <option value="GENAP">Semester Genap</option>
          </select>

          <select
            value={tahunAjaran}
            onChange={(e) => setTahunAjaran(e.target.value)}
            className="h-10 px-3.5 rounded-full bg-bg-secondary text-label font-medium text-xs border border-separator/40 focus:ring-2 focus:ring-accent outline-none cursor-pointer"
          >
            <option value="2025/2026">T.A. 2025/2026</option>
            <option value="2026/2027">T.A. 2026/2027</option>
          </select>

          <button
            onClick={handlePrintRapor}
            disabled={isLoadingPrint || groupedByMapel.length === 0}
            className="flex items-center gap-2 px-5 h-10 rounded-full bg-accent text-white font-semibold text-xs shadow-md active:scale-95 transition-all disabled:opacity-50"
          >
            <Printer size={16} />
            <span>{isLoadingPrint ? 'Menyiapkan...' : 'Cetak / Unduh Rapor'}</span>
          </button>
        </div>
      </header>

      {errorMsg && (
        <div className="p-3.5 rounded-[16px] flex items-center gap-2.5 bg-[var(--red)]/15 text-[var(--red)] border border-[var(--red)]/30">
          <AlertCircle size={18} className="shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* KPI Cards Ringkasan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-5 flex flex-col gap-1.5" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs font-semibold uppercase">Rata-Rata Nilai</span>
            <TrendingUp size={16} className="text-accent" />
          </div>
          <span className="text-3xl font-bold tabular-nums text-label">{stats.rataRata}</span>
          <span className="text-xs text-label-secondary">Akumulasi Bobot NA</span>
        </div>

        <div className="glass p-5 flex flex-col gap-1.5" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs font-semibold uppercase">Mapel Tuntas</span>
            <CheckCircle2 size={16} className="text-[var(--green)]" />
          </div>
          <span className="text-3xl font-bold tabular-nums text-label">
            {stats.tuntasCount} / {stats.scoredCount}
          </span>
          <span className="text-xs text-label-secondary">Mencapai KKM</span>
        </div>

        <div className="glass p-5 flex flex-col gap-1.5" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs font-semibold uppercase">Kehadiran (Presensi)</span>
            <Activity size={16} className="text-[#ff9500]" />
          </div>
          <span className="text-xl font-bold tabular-nums text-label mt-1">
            {catatanRapor ? `${catatanRapor.sakit}S / ${catatanRapor.izin}I / ${catatanRapor.alfa}A` : '0S / 0I / 0A'}
          </span>
          <span className="text-xs text-label-secondary">Sakit / Izin / Alfa</span>
        </div>

        <div className="glass p-5 flex flex-col gap-1.5" style={{ '--glass-radius': 'var(--radius-xl)' } as React.CSSProperties}>
          <div className="flex items-center justify-between text-label-secondary">
            <span className="text-xs font-semibold uppercase">Status Kelulusan</span>
            <School size={16} className="text-[#af52de]" />
          </div>
          <span className="text-lg font-bold text-label mt-1">
            {stats.scoredCount === 0 ? 'Belum Dievaluasi' : stats.tuntasCount === stats.scoredCount ? 'Tuntas Semua KKM' : 'Perlu Remedial'}
          </span>
          <span className="text-xs text-label-secondary">Standar SMP Al-Hidayah</span>
        </div>
      </div>

      {/* Tabel Rapor Rinci */}
      <section className="bg-bg-secondary rounded-[28px] shadow-[0_4px_16px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col">
        <div className="p-5 flex items-center justify-between border-b border-separator/40">
          <div>
            <h3 className="font-semibold text-label text-base">Capaian Akademik Mata Pelajaran</h3>
            {siswaInfo && (
              <p className="text-xs text-label-secondary mt-0.5">
                Peserta Didik: <strong>{siswaInfo.nama}</strong> ({siswaInfo.nisn}) &bull; Kelas: {siswaInfo.kelas?.nama || '-'}
              </p>
            )}
          </div>
          <button 
            onClick={fetchNilaiSaya}
            className="p-2 rounded-full hover:bg-fill text-label-secondary transition-colors"
            title="Refresh Data"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin text-accent' : ''} />
          </button>
        </div>

        {groupedByMapel.length === 0 ? (
          <div className="p-12 text-center text-label-secondary flex flex-col items-center gap-3">
            <Inbox size={40} className="text-label-tertiary" />
            <p className="font-medium text-sm">Belum ada data nilai pada semester ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-fill/40 text-label-secondary text-xs uppercase font-semibold border-b border-separator/40">
                <tr>
                  <th className="py-3 px-4">Mata Pelajaran</th>
                  <th className="py-3 px-4 text-center">KKM</th>
                  <th className="py-3 px-4 text-center">Tugas (40%)</th>
                  <th className="py-3 px-4 text-center">UTS (30%)</th>
                  <th className="py-3 px-4 text-center">UAS (30%)</th>
                  <th className="py-3 px-4 text-center font-bold">Nilai Akhir</th>
                  <th className="py-3 px-4 text-center">Predikat</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-separator/30 text-label">
                {groupedByMapel.map((item) => (
                  <tr key={item.mapel.id} className="hover:bg-fill/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold">
                      {item.mapel.nama}
                      {item.mapel.guru && (
                        <span className="block text-xs font-normal text-label-secondary mt-0.5">
                          Guru: {item.mapel.guru.nama}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-label-secondary font-medium">
                      {item.mapel.kkm}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {item.tugas !== null ? item.tugas : <span className="text-label-tertiary">-</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {item.uts !== null ? item.uts : <span className="text-label-tertiary">-</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono">
                      {item.uas !== null ? item.uas : <span className="text-label-tertiary">-</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-base">
                      {item.finalScore !== null ? item.finalScore : <span className="text-label-tertiary">-</span>}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs ${
                        item.predikat === 'A' ? 'bg-[var(--green)]/15 text-[var(--green)]' :
                        item.predikat === 'B' ? 'bg-accent/15 text-accent' :
                        item.predikat === 'C' ? 'bg-[#ff9500]/15 text-[#ff9500]' :
                        'bg-[var(--red)]/15 text-[var(--red)]'
                      }`}>
                        {item.predikat}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium">
                      {item.finalScore === null ? (
                        <span className="text-xs text-label-tertiary">Belum Lengkap</span>
                      ) : item.passed ? (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--green)] font-semibold">
                          <CheckCircle2 size={14} /> Tuntas
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--red)] font-semibold">
                          <AlertCircle size={14} /> Belum Tuntas
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* EVALUASI SIKAP, EKSKUL & CATATAN WALI KELAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Perkembangan Sikap & Kepribadian */}
        <div className="bg-bg-secondary rounded-[28px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Smile className="text-accent" size={20} />
            <h3 className="font-semibold text-label text-base">Perkembangan Sikap & Karakter</h3>
          </div>

          <div className="flex flex-col gap-3">
            <div className="p-3.5 rounded-[18px] bg-bg flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-label">Sikap Spiritual</span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--green)]/15 text-[var(--green)] text-xs font-bold">
                  Predikat {catatanRapor?.sikapSpiritual || 'A'}
                </span>
              </div>
              <p className="text-xs text-label-secondary mt-1 leading-relaxed">
                {catatanRapor?.deskripsiSpiritual || 'Menunjukkan ketaatan beribadah dan sikap bersyukur dengan sangat baik.'}
              </p>
            </div>

            <div className="p-3.5 rounded-[18px] bg-bg flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-label">Sikap Sosial</span>
                <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-bold">
                  Predikat {catatanRapor?.sikapSosial || 'A'}
                </span>
              </div>
              <p className="text-xs text-label-secondary mt-1 leading-relaxed">
                {catatanRapor?.deskripsiSosial || 'Menunjukkan sikap santun, disiplin mematuhi aturan, peduli, dan bertanggung jawab.'}
              </p>
            </div>
          </div>
        </div>

        {/* Ekstrakurikuler & Catatan Wali Kelas */}
        <div className="bg-bg-secondary rounded-[28px] p-6 shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Heart className="text-[#ff9500]" size={20} />
              <h3 className="font-semibold text-label text-base">Ekstrakurikuler & Catatan Wali</h3>
            </div>

            {/* Ekstrakurikuler */}
            <div className="mb-4">
              <span className="text-xs uppercase font-bold text-label-secondary tracking-wider block mb-2">
                Kegiatan Ekstrakurikuler:
              </span>
              {catatanRapor?.ekskul && Array.isArray(catatanRapor.ekskul) && catatanRapor.ekskul.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {catatanRapor.ekskul.map((eks: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-[14px] bg-bg flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-label">{eks.nama}</span>
                        {eks.keterangan && <p className="text-[11px] text-label-secondary mt-0.5">{eks.keterangan}</p>}
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent font-bold">
                        {eks.predikat}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-label-secondary italic">Tidak ada kegiatan khusus yang terdata.</p>
              )}
            </div>

            {/* Catatan Wali Kelas */}
            <div className="p-3.5 rounded-[18px] bg-bg flex flex-col gap-1 border border-separator/30">
              <span className="text-xs font-semibold text-label">Pesan & Evaluasi Wali Kelas:</span>
              <p className="text-xs text-label-secondary italic leading-relaxed mt-0.5">
                "{catatanRapor?.catatanWali || 'Pertahankan prestasi belajar dan terus tingkatkan kedisiplinan serta ibadah sehari-hari.'}"
              </p>
            </div>
          </div>

          {/* Tombol Cetak Bawah */}
          <button
            onClick={handlePrintRapor}
            disabled={isLoadingPrint || groupedByMapel.length === 0}
            className="w-full h-11 rounded-full glass glass-accent text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md disabled:opacity-50"
          >
            <Printer size={16} />
            <span>Cetak Lembar Rapor Lengkap (PDF)</span>
          </button>
        </div>

      </div>

      {/* MODAL PRINT PREVIEW */}
      {printData && (
        <PrintableRapor
          data={printData}
          onClose={() => setPrintData(null)}
        />
      )}

    </div>
  );
}
