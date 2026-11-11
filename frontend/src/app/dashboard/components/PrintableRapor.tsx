// frontend/src/app/dashboard/components/PrintableRapor.tsx
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
    tersedia: boolean;
    sakit: number;
    izin: number;
    alfa: number;
    sikapSpiritual: string | null;
    deskripsiSpiritual: string | null;
    sikapSosial: string | null;
    deskripsiSosial: string | null;
    ekskul: Array<{ nama: string; predikat: string; keterangan: string }>;
    catatanWali: string;
    catatanOrtu?: string | null;
    catatanOrtuAt?: string | null;
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex flex-col items-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      
      {/* Floating Toolbar (Screen Only) */}
      <div className="w-full max-w-[210mm] mb-3 flex items-center justify-between bg-card border border-separator p-3 rounded-xl shadow-lg print:hidden">
        <div className="flex items-center gap-2 pl-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
          <span className="text-xs sm:text-sm font-semibold text-label">
            Pratinjau Lembar Rapor A4 &bull; <strong className="text-label">{data.siswa.nama}</strong> ({data.siswa.kelas})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white font-medium text-xs shadow-sm transition-colors cursor-pointer"
          >
            <Printer size={15} />
            <span>Cetak / Simpan PDF</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-fill text-label-secondary transition-colors"
              title="Tutup Pratinjau"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Official A4 Sheet */}
      <div 
        ref={printRef}
        id="printable-rapor"
        className="w-full max-w-[210mm] bg-white text-black p-8 sm:p-12 shadow-xl border border-gray-200 rounded-sm print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:max-w-none print:rounded-none font-serif text-[12px] leading-normal"
      >
        
        {/* KOP SURAT RESMI KEDINASAN (DOUBLE RULE) */}
        <div className="text-center mb-3">
          <h3 className="text-[12px] font-semibold tracking-wider uppercase text-gray-800 font-sans">
            {data.sekolah.yayasan || 'YAYASAN PENDIDIKAN ISLAM AL-HIDAYAH'}
          </h3>
          <h1 className="text-[18px] sm:text-[20px] font-bold tracking-wide uppercase text-black font-sans my-0.5">
            {data.sekolah.namaSekolah || 'SMP AL-HIDAYAH MEDAN'}
          </h1>
          <p className="text-[10.5px] text-gray-700 font-sans">
            NPSN: {data.sekolah.npsn || '10210892'} &bull; Alamat: {data.sekolah.alamat || 'Jl. Letda Sujono No. 64, Medan Tembung'} &bull; Telp: {data.sekolah.telepon || '(061) 7362819'}
          </p>
          {/* Garis Ganda Kop Surat Resmi */}
          <div className="mt-2 border-b-[2.5px] border-black"></div>
          <div className="mt-[2px] border-b-[0.8px] border-black"></div>
        </div>

        {/* JUDUL DOKUMEN */}
        <div className="text-center my-3 font-sans">
          <h2 className="text-[14px] font-bold uppercase tracking-wider text-black">
            LAPORAN HASIL BELAJAR PESERTA DIDIK (RAPOR)
          </h2>
          <p className="text-[11px] font-medium text-gray-700 mt-0.5">
            SEKOLAH MENENGAH PERTAMA (SMP) &bull; TINGKAT {data.siswa.tingkat}
          </p>
        </div>

        {/* IDENTITAS SISWA & SEKOLAH */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 my-3 text-[11px] font-sans border border-black p-2.5 bg-gray-50/40 print:bg-transparent">
          <div className="flex">
            <span className="w-32 font-semibold text-gray-800">Nama Peserta Didik</span>
            <span className="mr-1.5">:</span>
            <span className="font-bold text-black uppercase">{data.siswa.nama}</span>
          </div>
          <div className="flex">
            <span className="w-28 font-semibold text-gray-800">Kelas / Tingkat</span>
            <span className="mr-1.5">:</span>
            <span className="font-bold text-black">{data.siswa.kelas} (Tingkat {data.siswa.tingkat})</span>
          </div>
          <div className="flex">
            <span className="w-32 font-semibold text-gray-800">NISN</span>
            <span className="mr-1.5">:</span>
            <span className="font-mono text-black">{data.siswa.nisn}</span>
          </div>
          <div className="flex">
            <span className="w-28 font-semibold text-gray-800">Semester</span>
            <span className="mr-1.5">:</span>
            <span className="font-medium text-black">{data.semester}</span>
          </div>
          <div className="flex">
            <span className="w-32 font-semibold text-gray-800">Nama Sekolah</span>
            <span className="mr-1.5">:</span>
            <span className="font-medium text-black">{data.sekolah.namaSekolah}</span>
          </div>
          <div className="flex">
            <span className="w-28 font-semibold text-gray-800">Tahun Pelajaran</span>
            <span className="mr-1.5">:</span>
            <span className="font-medium text-black">{data.tahunAjaran}</span>
          </div>
        </div>

        {/* A. CAPAIAN KOMPETENSI AKADEMIK */}
        <div className="mt-4">
          <h3 className="font-bold font-sans text-[12px] text-black mb-1.5 uppercase flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-black text-white inline-flex items-center justify-center text-[9px] font-bold">A</span>
            <span>Capaian Kompetensi Akademik</span>
          </h3>
          <table className="w-full border-collapse border border-black text-[10.5px] font-sans">
            <thead>
              <tr className="bg-gray-100 text-center font-bold">
                <th className="border border-black p-1 w-7">No</th>
                <th className="border border-black p-1 text-left">Mata Pelajaran</th>
                <th className="border border-black p-1 w-11">KKM</th>
                <th className="border border-black p-1 w-14">Tugas (40%)</th>
                <th className="border border-black p-1 w-14">UTS (30%)</th>
                <th className="border border-black p-1 w-14">UAS (30%)</th>
                <th className="border border-black p-1 w-14 bg-gray-200">Nilai Akhir</th>
                <th className="border border-black p-1 w-11">Predikat</th>
                <th className="border border-black p-1 w-20">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {data.nilai.map((n, idx) => (
                <tr key={n.mapelId}>
                  <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-1 font-medium">{n.nama}</td>
                  <td className="border border-black p-1 text-center font-mono">{n.kkm}</td>
                  <td className="border border-black p-1 text-center font-mono">{n.tugas !== null ? n.tugas : '-'}</td>
                  <td className="border border-black p-1 text-center font-mono">{n.uts !== null ? n.uts : '-'}</td>
                  <td className="border border-black p-1 text-center font-mono">{n.uas !== null ? n.uas : '-'}</td>
                  <td className="border border-black p-1 text-center font-bold font-mono bg-gray-50">{n.nilaiAkhir > 0 ? n.nilaiAkhir : '-'}</td>
                  <td className="border border-black p-1 text-center font-bold">{n.predikat}</td>
                  <td className="border border-black p-1 text-center font-semibold text-[10px]">
                    {n.status}
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td colSpan={6} className="border border-black p-1 text-right uppercase">Rata-Rata Nilai Akhir</td>
                <td className="border border-black p-1 text-center font-mono bg-gray-200">{data.rekapitulasi.rataRata}</td>
                <td colSpan={2} className="border border-black p-1 text-center text-[10px]">
                  {data.rekapitulasi.mataPelajaranDinilai} / {data.rekapitulasi.totalMataPelajaran} Mapel Dinilai
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-[9.5px] italic text-gray-600 mt-1">
            *Predikat: A (Sangat Baik: &ge;90) &bull; B (Baik: &ge;80) &bull; C (Cukup / Tuntas: &ge;KKM) &bull; D (Perlu Remedial: &lt;KKM)
          </p>
        </div>

        {/* B. PENILAIAN PERKEMBANGAN SIKAP */}
        <div className="mt-3">
          <h3 className="font-bold font-sans text-[12px] text-black mb-1.5 uppercase flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-black text-white inline-flex items-center justify-center text-[9px] font-bold">B</span>
            <span>Penilaian Perkembangan Sikap & Karakter</span>
          </h3>
          <table className="w-full border-collapse border border-black text-[10.5px] font-sans">
            <thead>
              <tr className="bg-gray-100 text-center font-bold">
                <th className="border border-black p-1 w-28">Dimensi Sikap</th>
                <th className="border border-black p-1 w-14">Predikat</th>
                <th className="border border-black p-1 text-left">Deskripsi Perkembangan</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1.5 font-semibold">1. Sikap Spiritual</td>
                <td className="border border-black p-1.5 text-center font-bold">
                  {data.catatanRapor.sikapSpiritual || '-'}
                </td>
                <td className="border border-black p-1.5 leading-snug">
                  {data.catatanRapor.deskripsiSpiritual || 'Belum ada catatan pembinaan.'}
                </td>
              </tr>
              <tr>
                <td className="border border-black p-1.5 font-semibold">2. Sikap Sosial</td>
                <td className="border border-black p-1.5 text-center font-bold">
                  {data.catatanRapor.sikapSosial || '-'}
                </td>
                <td className="border border-black p-1.5 leading-snug">
                  {data.catatanRapor.deskripsiSosial || 'Belum ada catatan pembinaan.'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* C. EKSTRAKURIKULER & D. PRESENSI (2 KOLOM) */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {/* C. Ekstrakurikuler */}
          <div>
            <h3 className="font-bold font-sans text-[12px] text-black mb-1.5 uppercase flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-black text-white inline-flex items-center justify-center text-[9px] font-bold">C</span>
              <span>Ekstrakurikuler</span>
            </h3>
            <table className="w-full border-collapse border border-black text-[10px] font-sans">
              <thead>
                <tr className="bg-gray-100 text-center font-bold">
                  <th className="border border-black p-1 w-6">No</th>
                  <th className="border border-black p-1 text-left">Kegiatan</th>
                  <th className="border border-black p-1 w-10">Nilai</th>
                  <th className="border border-black p-1 text-left">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {data.catatanRapor.ekskul && data.catatanRapor.ekskul.length > 0 ? (
                  data.catatanRapor.ekskul.map((e, idx) => (
                    <tr key={idx}>
                      <td className="border border-black p-1 text-center font-mono">{idx + 1}</td>
                      <td className="border border-black p-1 font-medium">{e.nama}</td>
                      <td className="border border-black p-1 text-center font-bold">{e.predikat}</td>
                      <td className="border border-black p-1 text-[9.5px]">{e.keterangan}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="border border-black p-1.5 text-center text-gray-500 italic">
                      {data.catatanRapor.tersedia ? 'Tidak ada kegiatan ekskul tercatat.' : 'Belum ada catatan.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* D. Presensi */}
          <div>
            <h3 className="font-bold font-sans text-[12px] text-black mb-1.5 uppercase flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-black text-white inline-flex items-center justify-center text-[9px] font-bold">D</span>
              <span>Rekapitulasi Kehadiran</span>
            </h3>
            <table className="w-full border-collapse border border-black text-[10px] font-sans">
              <thead>
                <tr className="bg-gray-100 text-center font-bold">
                  <th className="border border-black p-1 text-left">Keterangan Presensi</th>
                  <th className="border border-black p-1 w-16 text-center">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1 font-medium">Sakit (S)</td>
                  <td className="border border-black p-1 text-center font-mono">{data.catatanRapor.tersedia ? `${data.catatanRapor.sakit} hari` : '-'}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-medium">Izin (I)</td>
                  <td className="border border-black p-1 text-center font-mono">{data.catatanRapor.tersedia ? `${data.catatanRapor.izin} hari` : '-'}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-medium">Tanpa Keterangan / Alfa (A)</td>
                  <td className="border border-black p-1 text-center font-mono">{data.catatanRapor.tersedia ? `${data.catatanRapor.alfa} hari` : '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* E. CATATAN WALI KELAS */}
        <div className="mt-3 border border-black p-2 font-sans text-[10.5px]">
          <h4 className="font-bold text-[11px] uppercase mb-0.5">Catatan Bimbingan Wali Kelas:</h4>
          <p className="italic text-gray-800 leading-relaxed min-h-[28px]">
            {data.catatanRapor.catatanWali ? `"${data.catatanRapor.catatanWali}"` : 'Belum ada catatan bimbingan.'}
          </p>
          {data.semester === 'GENAP' && data.catatanRapor.statusKenaikan && (
            <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-400 font-bold text-[11px]">
              Keputusan Kenaikan: <span className="text-black uppercase">{data.catatanRapor.statusKenaikan}</span>
            </div>
          )}
        </div>

        {/* CATATAN ORANG TUA / WALI SISWA */}
        {data.catatanRapor.catatanOrtu && (
          <div className="mt-2 border border-black p-2 font-sans text-[10.5px] bg-gray-50/50">
            <h4 className="font-bold text-[11px] uppercase mb-0.5">Catatan & Masukan Orang Tua (Akhir Semester):</h4>
            <p className="italic text-gray-800 leading-relaxed min-h-[24px]">
              &ldquo;{data.catatanRapor.catatanOrtu}&rdquo;
            </p>
          </div>
        )}

        {/* F. KOLOM TANDA TANGAN PENGESAHAN 3 PIHAK */}
        <div className="mt-6 pt-2 font-sans text-[10.5px] break-inside-avoid">
          <div className="text-right text-[10.5px] mb-2 font-sans">
            Medan, {data.sekolah.tanggalRapor || '20 Desember 2025'}
          </div>
          <div className="grid grid-cols-3 text-center gap-3">
            {/* Orang Tua */}
            <div className="flex flex-col justify-between h-24">
              <div>
                <p className="font-medium">Mengetahui,</p>
                <p className="font-semibold">Orang Tua / Wali Siswa</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">( ............................................ )</p>
                <p className="text-[9px] text-gray-600">Nama Terang & Tanda Tangan</p>
              </div>
            </div>

            {/* Wali Kelas */}
            <div className="flex flex-col justify-between h-24">
              <div>
                <p className="font-medium">&nbsp;</p>
                <p className="font-semibold">Wali Kelas</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{data.siswa.waliKelas}</p>
                <p className="text-[9px] text-gray-600 font-mono">
                  {data.siswa.nipWaliKelas ? `NIP: ${data.siswa.nipWaliKelas}` : 'NIP: -'}
                </p>
              </div>
            </div>

            {/* Kepala Sekolah */}
            <div className="flex flex-col justify-between h-24">
              <div>
                <p className="font-medium">Mengetahui,</p>
                <p className="font-semibold">Kepala SMP Al-Hidayah</p>
              </div>
              <div>
                <p className="font-bold underline uppercase">{data.sekolah.kepalaSekolah}</p>
                <p className="text-[9px] text-gray-600 font-mono">NIP: {data.sekolah.nipKepalaSekolah}</p>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
