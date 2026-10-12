'use client';
import { useRef } from 'react';
import { Printer, X } from 'lucide-react';

export interface RaporData {
  sekolah: {
    namaSekolah: string;
    yayasan: string;
    npsn: string;
    alamat: string;
    telepon: string;
    kepalaSekolah: string;
    nipKepalaSekolah: string;
    tanggalRapor: string;
  };
  siswa: {
    id: string;
    nama: string;
    nisn: string;
    kelas: string;
    tingkat: number;
    waliKelas: string;
    nipWaliKelas?: string | null;
    namaOrtu?: string | null;
  };
  semester: string;
  tahunAjaran: string;
  nilai: Array<{
    mapelId: string;
    nama: string;
    kkm: number;
    guru: string;
    tugas: number | null;
    uts: number | null;
    uas: number | null;
    nilaiAkhir: number;
    predikat: string;
    status: string;
    keterangan?: string;
  }>;
  rekapitulasi: {
    totalNilai: number;
    rataRata: number;
    mataPelajaranDinilai: number;
    totalMataPelajaran: number;
  };
  catatanRapor: {
    sakit: number;
    izin: number;
    alfa: number;
    sikapSpiritual: string;
    deskripsiSpiritual: string;
    sikapSosial: string;
    deskripsiSosial: string;
    ekskul: Array<{ nama: string; predikat: string; keterangan: string }>;
    catatanWali: string;
    statusKenaikan?: string | null;
  };
}

interface PrintableRaporProps {
  data: RaporData;
  onClose?: () => void;
}

export default function PrintableRapor({ data, onClose }: PrintableRaporProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex flex-col items-center p-2 sm:p-4 md:p-8 print:p-0 print:bg-white print:static">
      
      {/* Floating Control Toolbar (Hidden when printing) */}
      <div className="w-full max-w-[210mm] mb-4 flex items-center justify-between glass p-3 rounded-full print:hidden">
        <div className="flex items-center gap-2 pl-3">
          <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)]"></span>
          <span className="text-sm font-semibold text-label">
            Pratinjau Lembar Rapor Cetak A4 - {data.siswa.nama}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-accent text-white font-semibold text-sm hover:opacity-95 active:scale-95 transition-all shadow-md"
          >
            <Printer size={16} />
            <span>Cetak / Simpan PDF</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-fill text-label-secondary transition-colors"
              title="Tutup"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div 
        ref={printRef}
        id="printable-rapor"
        className="w-full max-w-[210mm] bg-white text-black p-8 sm:p-12 shadow-2xl rounded-sm print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none print:rounded-none font-serif text-[13px] leading-relaxed"
      >
        
        {/* KOP SURAT RESMI SEKOLAH */}
        <div className="border-b-[3px] border-black pb-3 mb-4 text-center relative">
          <div className="border-b-[1px] border-black pb-2">
            <h3 className="text-[13px] font-semibold tracking-wider uppercase text-gray-800">
              {data.sekolah.yayasan}
            </h3>
            <h1 className="text-[20px] font-bold tracking-wide uppercase text-black font-sans my-0.5">
              {data.sekolah.namaSekolah}
            </h1>
            <p className="text-[11px] text-gray-700 italic">
              NPSN: {data.sekolah.npsn} &bull; {data.sekolah.alamat} &bull; Telp: {data.sekolah.telepon}
            </p>
          </div>
        </div>

        {/* JUDUL DOKUMEN */}
        <div className="text-center my-4 font-sans">
          <h2 className="text-[15px] font-bold uppercase underline tracking-wider">
            LAPORAN HASIL BELAJAR PESERTA DIDIK (RAPOR)
          </h2>
          <p className="text-[12px] font-medium text-gray-800 mt-0.5">
            SEKOLAH MENENGAH PERTAMA (SMP) &bull; TINGKAT {data.siswa.tingkat}
          </p>
        </div>

        {/* IDENTITAS SISWA */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 my-4 text-[12px] font-sans border border-gray-300 p-3 rounded-sm bg-gray-50/50 print:bg-transparent">
          <div className="flex">
            <span className="w-36 font-semibold text-gray-700">Nama Peserta Didik</span>
            <span className="mr-2">:</span>
            <span className="font-bold text-black uppercase">{data.siswa.nama}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-semibold text-gray-700">Kelas / Tingkat</span>
            <span className="mr-2">:</span>
            <span className="font-bold text-black">{data.siswa.kelas} (Tingkat {data.siswa.tingkat})</span>
          </div>
          <div className="flex">
            <span className="w-36 font-semibold text-gray-700">Nomor Induk Siswa (NISN)</span>
            <span className="mr-2">:</span>
            <span className="font-medium text-black">{data.siswa.nisn}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-semibold text-gray-700">Semester</span>
            <span className="mr-2">:</span>
            <span className="font-medium text-black">{data.semester}</span>
          </div>
          <div className="flex">
            <span className="w-36 font-semibold text-gray-700">Nama Sekolah</span>
            <span className="mr-2">:</span>
            <span className="font-medium text-black">{data.sekolah.namaSekolah}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-semibold text-gray-700">Tahun Pelajaran</span>
            <span className="mr-2">:</span>
            <span className="font-medium text-black">{data.tahunAjaran}</span>
          </div>
        </div>

        {/* A. NILAI CAPAIAN AKADEMIK */}
        <div className="mt-5">
          <h4 className="font-bold font-sans text-[13px] text-gray-900 mb-2 uppercase flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-black text-white inline-flex items-center justify-center text-[10px] font-bold">A</span>
            Capaian Kompetensi Akademik
          </h4>
          <table className="w-full border-collapse border border-black text-[11px] font-sans">
            <thead>
              <tr className="bg-gray-100 text-center font-bold print:bg-gray-100">
                <th className="border border-black p-1.5 w-8">No</th>
                <th className="border border-black p-1.5 text-left">Mata Pelajaran</th>
                <th className="border border-black p-1.5 w-12">KKM</th>
                <th className="border border-black p-1.5 w-14">Tugas (40%)</th>
                <th className="border border-black p-1.5 w-14">UTS (30%)</th>
                <th className="border border-black p-1.5 w-14">UAS (30%)</th>
                <th className="border border-black p-1.5 w-14 bg-gray-200">Nilai Akhir</th>
                <th className="border border-black p-1.5 w-12">Predikat</th>
                <th className="border border-black p-1.5 w-24">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {data.nilai.map((n, idx) => (
                <tr key={n.mapelId} className="hover:bg-gray-50">
                  <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-black p-1.5 font-medium">{n.nama}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{n.kkm}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{n.tugas !== null ? n.tugas : '-'}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{n.uts !== null ? n.uts : '-'}</td>
                  <td className="border border-black p-1.5 text-center font-mono">{n.uas !== null ? n.uas : '-'}</td>
                  <td className="border border-black p-1.5 text-center font-bold font-mono bg-gray-50">{n.nilaiAkhir > 0 ? n.nilaiAkhir : '-'}</td>
                  <td className="border border-black p-1.5 text-center font-bold">{n.predikat}</td>
                  <td className={`border border-black p-1.5 text-center font-semibold text-[10px] ${n.status === 'Tuntas' ? 'text-green-800' : 'text-red-800'}`}>
                    {n.status}
                  </td>
                </tr>
              ))}
              {/* Baris Total & Rata-rata */}
              <tr className="bg-gray-100 font-bold">
                <td colSpan={6} className="border border-black p-1.5 text-right uppercase">Rata-Rata Nilai Akhir</td>
                <td className="border border-black p-1.5 text-center font-mono bg-gray-200">{data.rekapitulasi.rataRata}</td>
                <td colSpan={2} className="border border-black p-1.5 text-center text-[10px]">
                  {data.rekapitulasi.mataPelajaranDinilai} dari {data.rekapitulasi.totalMataPelajaran} Mapel Dinilai
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-[10px] italic text-gray-600 mt-1">
            *Rentang Predikat: A (Sangat Baik: 90 - 100) | B (Baik: 80 - 89) | C (Cukup: KKM - 79) | D (Perlu Perbaikan: &lt; KKM)
          </p>
        </div>

        {/* B. CAPAIAN KOMPETENSI SIKAP */}
        <div className="mt-5">
          <h4 className="font-bold font-sans text-[13px] text-gray-900 mb-2 uppercase flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-black text-white inline-flex items-center justify-center text-[10px] font-bold">B</span>
            Penilaian Perkembangan Sikap
          </h4>
          <table className="w-full border-collapse border border-black text-[11px] font-sans">
            <thead>
              <tr className="bg-gray-100 text-center font-bold">
                <th className="border border-black p-1.5 w-32">Dimensi Sikap</th>
                <th className="border border-black p-1.5 w-16">Predikat</th>
                <th className="border border-black p-1.5 text-left">Deskripsi Perkembangan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 font-semibold">1. Sikap Spiritual</td>
                <td className="border border-black p-2 text-center font-bold text-sm">
                  {data.catatanRapor.sikapSpiritual || 'A'}
                </td>
                <td className="border border-black p-2 leading-snug">
                  {data.catatanRapor.deskripsiSpiritual || 'Selalu taat dalam menjalankan ibadah, berperilaku syukur, dan menunjukkan sikap toleransi beragama yang sangat baik.'}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-2 font-semibold">2. Sikap Sosial</td>
                <td className="border border-black p-2 text-center font-bold text-sm">
                  {data.catatanRapor.sikapSosial || 'A'}
                </td>
                <td className="border border-black p-2 leading-snug">
                  {data.catatanRapor.deskripsiSosial || 'Sangat santun, disiplin mematuhi tata tertib sekolah, bertanggung jawab dalam tugas, dan aktif bergotong royong.'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* C. EKSTRAKURIKULER & D. PRESENSI (2 KOLOM) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          {/* C. Ekstrakurikuler */}
          <div>
            <h4 className="font-bold font-sans text-[13px] text-gray-900 mb-2 uppercase flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-black text-white inline-flex items-center justify-center text-[10px] font-bold">C</span>
              Kegiatan Ekstrakurikuler
            </h4>
            <table className="w-full border-collapse border border-black text-[11px] font-sans">
              <thead>
                <tr className="bg-gray-100 text-center font-bold">
                  <th className="border border-black p-1 w-6">No</th>
                  <th className="border border-black p-1 text-left">Nama Kegiatan</th>
                  <th className="border border-black p-1 w-12">Nilai</th>
                  <th className="border border-black p-1 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {data.catatanRapor.ekskul && data.catatanRapor.ekskul.length > 0 ? (
                  data.catatanRapor.ekskul.map((e, idx) => (
                    <tr key={idx}>
                      <td className="border border-black p-1 text-center">{idx + 1}</td>
                      <td className="border border-black p-1 font-medium">{e.nama}</td>
                      <td className="border border-black p-1 text-center font-bold">{e.predikat}</td>
                      <td className="border border-black p-1 text-[10px]">{e.keterangan}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="border border-black p-2 text-center text-gray-500 italic">
                      Tidak mengikuti kegiatan ekstrakurikuler khusus
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* D. Ketidakhadiran */}
          <div>
            <h4 className="font-bold font-sans text-[13px] text-gray-900 mb-2 uppercase flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-black text-white inline-flex items-center justify-center text-[10px] font-bold">D</span>
              Rekapitulasi Kehadiran
            </h4>
            <table className="w-full border-collapse border border-black text-[11px] font-sans">
              <thead>
                <tr className="bg-gray-100 text-center font-bold">
                  <th className="border border-black p-1 text-left">Keterangan Presensi</th>
                  <th className="border border-black p-1 w-20">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1 font-medium">Sakit (S)</td>
                  <td className="border border-black p-1 text-center font-mono">{data.catatanRapor.sakit} hari</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-medium">Izin (I)</td>
                  <td className="border border-black p-1 text-center font-mono">{data.catatanRapor.izin} hari</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-medium">Tanpa Keterangan / Alfa (A)</td>
                  <td className="border border-black p-1 text-center font-mono">{data.catatanRapor.alfa} hari</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* E. CATATAN WALI KELAS */}
        <div className="mt-5 border border-black p-3 font-sans text-[11px]">
          <h5 className="font-bold text-[12px] uppercase mb-1">Catatan Wali Kelas:</h5>
          <p className="italic text-gray-800 leading-relaxed min-h-[36px]">
            "{data.catatanRapor.catatanWali || 'Tingkatkan terus semangat belajar dan pertahankan prestasi yang sudah diraih dengan baik.'}"
          </p>
          {data.semester === 'GENAP' && data.catatanRapor.statusKenaikan && (
            <div className="mt-2 pt-2 border-t border-dashed border-gray-400 font-bold text-[12px]">
              Keputusan: <span className="text-black uppercase">{data.catatanRapor.statusKenaikan}</span>
            </div>
          )}
        </div>

        {/* F. KOLOM TANDA TANGAN PENGESAHAN */}
        <div className="mt-8 pt-4 font-sans text-[11px]">
          <div className="text-right text-[11px] mb-4">
            Medan, {data.sekolah.tanggalRapor}
          </div>
          <div className="grid grid-cols-3 text-center gap-4">
            {/* Kolom 1 */}
            <div className="flex flex-col justify-between h-28">
              <div>
                <p className="font-medium">Mengetahui,</p>
                <p className="font-semibold">Orang Tua / Wali Siswa</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">( ............................................ )</p>
                <p className="text-[10px] text-gray-600">Tanda Tangan & Nama Terang</p>
              </div>
            </div>

            {/* Kolom 2 */}
            <div className="flex flex-col justify-between h-28">
              <div>
                <p className="font-medium">&nbsp;</p>
                <p className="font-semibold">Wali Kelas</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{data.siswa.waliKelas}</p>
                <p className="text-[10px] text-gray-600">
                  {data.siswa.nipWaliKelas ? `NIP: ${data.siswa.nipWaliKelas}` : 'NIP: -'}
                </p>
              </div>
            </div>

            {/* Kolom 3 */}
            <div className="flex flex-col justify-between h-28">
              <div>
                <p className="font-medium">Mengetahui,</p>
                <p className="font-semibold">Kepala SMP Al-Hidayah</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{data.sekolah.kepalaSekolah}</p>
                <p className="text-[10px] text-gray-600">NIP: {data.sekolah.nipKepalaSekolah}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
