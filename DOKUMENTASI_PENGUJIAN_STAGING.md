# Checklist validasi staging

Gunakan salinan database yang sudah dibackup dan data uji, bukan data produksi. Tandai hasil dan catat ID tahun ajaran/akun uji sebelum menyetujui penerapan.

## Riwayat kelas dan penugasan

- [ ] Buat dua tahun ajaran dan aktifkan tahun kedua.
- [ ] Buat kelas untuk kedua tahun ajaran. Pastikan kelas tahun lama tetap terlihat saat tahun lama dipilih.
- [ ] Tempatkan satu siswa di kelas berbeda pada masing-masing tahun. Periksa bahwa perubahan tahun aktif tidak mengubah baris riwayat tahun sebelumnya.
- [ ] Tugaskan satu guru mapel yang sama ke dua kelas dalam satu tahun ajaran. Pastikan penugasan keduanya tersimpan.
- [ ] Tugaskan seorang guru sebagai wali di dua kelas berbeda. Pastikan ia dapat memilih dan membuka rekap kedua kelas.
- [ ] Ganti tahun aktif. Pastikan daftar kelas, siswa, wali, dan mapel yang muncul mengikuti tahun terpilih.

## Hak akses dan nilai

- [ ] Guru hanya melihat kelas/mapel yang ditugaskan pada tahun terpilih.
- [ ] Guru yang mencoba membaca atau menulis nilai pada kelas tanpa penugasan menerima penolakan akses.
- [ ] Simpan nilai 0 dan 100; pastikan keduanya diterima. Uji nilai negatif, di atas 100, semester salah, dan tahun ajaran tidak valid; semuanya harus ditolak.
- [ ] Periksa nilai akhir dengan ketiga komponen dan dengan satu komponen kosong. Frontend dan backend harus menghasilkan angka yang sama dengan bobot Tugas 40%, UTS 30%, dan UAS 30%.
- [ ] Pastikan peringkat dan rekap hanya memakai mapel yang ditugaskan pada kelas dan tahun tersebut.

## Rapor dan akun keluarga

- [ ] Sebelum catatan wali dibuat, rapor menampilkan status belum dicatat; tidak menampilkan predikat A, deskripsi pujian, atau angka kehadiran nol sebagai data yang sudah dinilai.
- [ ] Simpan catatan dengan predikat kosong, lalu dengan predikat terisi. Pastikan nilai null dan nilai yang dipilih ditampilkan dengan benar.
- [ ] Atur variabel `SCHOOL_*`, `PRINCIPAL_*`, dan `RAPOR_DATE_*`; pastikan pratinjau dan PDF memakai data tersebut.
- [ ] Hubungkan dua siswa ke akun orang tua. Pastikan orang tua dapat memilih kedua anak dan tidak dapat membuka rapor siswa lain.
- [ ] Pastikan siswa hanya dapat melihat dan mencetak rapornya sendiri.

## Backfill dan regresi

- [ ] Jalankan `npm run backfill:academic-history` dan simpan keluaran rencana. Pastikan mode `DRY_RUN` dan jumlah baris database tidak berubah.
- [ ] Tinjau kelas yang dilewati karena sudah terikat ke tahun lain serta semua rencana penugasan mapel. Penugasan legacy mapel ke semua kelas adalah perkiraan dan perlu persetujuan admin.
- [ ] Jalankan perintah `:apply` hanya di staging setelah rencana disetujui. Cocokkan jumlah penempatan dan penugasan sesudahnya dengan keluaran skrip.
- [ ] Jalankan kembali dry-run. Pastikan tidak ada kelas, enrolmen, atau penugasan baru yang tidak diharapkan.
- [ ] Periksa catatan rapor lama: data A yang tersimpan oleh default skema lama tidak dapat dibedakan otomatis dari predikat A yang sengaja diberikan; admin harus meninjaunya.

## Persetujuan sebelum produksi

- [ ] Pemeriksaan otomatis lulus:
  - `cd backend && npm run prisma:validate`
  - `cd backend && npm run typecheck`
  - `cd backend && npm run test`
  - `cd frontend && npm run lint`
  - `cd frontend && npm run typecheck`
  - `cd frontend && npm run build`
- [ ] Hasil pemeriksaan dicatat bersama commit/release yang diuji.
- [ ] Admin sekolah menyetujui hasil rekonsiliasi riwayat serta konfigurasi identitas/tanggal rapor.
- [ ] Ada backup yang dapat dipulihkan dan rencana rollback sebelum perubahan skema produksi.
