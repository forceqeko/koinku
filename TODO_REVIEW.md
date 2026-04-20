# Koin Ku Review Notes

Dokumen ini merangkum temuan review codebase saat ini agar implementasi perbaikan bisa dilanjutkan kapan saja.

## Prioritas Utama

### P1. Model `admin_fee` duplikat dan rawan out-of-sync

Status saat ini:
- Tab `expense` membuat baris virtual biaya admin dari transaksi `transfer` dan `saving`.
- Saat create transaction, aplikasi juga menyimpan transaksi `expense` sungguhan untuk biaya admin.
- Saat edit/delete transaksi utama, transaksi fee yang dibuat otomatis tidak ikut tersinkron.

Dampak:
- Biaya admin bisa tampil ganda.
- Histori transaksi bisa meninggalkan data yatim.
- Laporan dan total pengeluaran bisa salah.

File terkait:
- `src/pages/Transactions.tsx`
- `src/components/Layout.tsx`

Keputusan yang perlu dipilih:
- Opsi A: `admin_fee` hanya disimpan sebagai field pada transaksi utama, lalu ditampilkan/diolah secara turunan di UI/report.
- Opsi B: `admin_fee` selalu dibuat sebagai transaksi terpisah, tetapi harus punya relasi eksplisit ke transaksi induk dan wajib ikut edit/delete.

Rekomendasi:
- Pilih Opsi A. Model data lebih sederhana dan lebih aman.

Checklist implementasi:
- [ ] Hapus auto insert transaksi expense untuk admin fee.
- [ ] Hapus virtual row jika memang fee sudah tidak perlu dimodelkan sebagai transaksi terpisah.
- [ ] Pastikan total pengeluaran tetap memasukkan `admin_fee` dari transfer/saving jika itu memang definisi bisnis yang diinginkan.
- [ ] Samakan perilaku create, edit, delete, report, dan dashboard.

### P1. Rollback saldo belum benar-benar atomic

Status saat ini:
- Insert transaksi dilakukan lebih dulu.
- Saldo akun/wishlist diubah setelah insert.
- Jika langkah lanjutan gagal, rollback hanya menghapus transaksi utama, tetapi tidak selalu membalikkan saldo yang sudah terlanjur berubah.

Dampak:
- Saldo akun bisa berubah tanpa transaksi yang merepresentasikannya.
- Ini adalah bug correctness paling berbahaya karena menyentuh integritas data finansial.

File terkait:
- `src/pages/Transactions.tsx`
- `src/components/Layout.tsx`
- `supabase_rpc_migration.sql`
- `supabase_rls_migration.sql`

Rekomendasi:
- Pindahkan create/update/delete transaksi + perubahan saldo ke satu RPC atau transaction di sisi database.

Checklist implementasi:
- [ ] Tentukan operasi mana yang harus atomic: create, edit, delete.
- [ ] Buat RPC Supabase untuk create transaction sekaligus update saldo/wishlist.
- [ ] Buat RPC Supabase untuk edit transaction dengan reverse old state + apply new state dalam satu operasi.
- [ ] Buat RPC Supabase untuk soft delete yang juga reverse saldo secara atomic.
- [ ] Hapus rollback manual di frontend setelah RPC atomic tersedia.

## Prioritas Menengah

### P2. Kontrak field sumber pemasukan tidak konsisten

Status saat ini:
- TypeScript memakai `income_source_id`.
- UI transaksi dan settings memakai `source_id`.

Dampak:
- Relasi sumber pemasukan bisa gagal terbaca/tersimpan tergantung schema DB.
- Type safety jadi menyesatkan karena model dan implementasi tidak sama.

File terkait:
- `src/types/index.ts`
- `src/components/TransactionModal.tsx`
- `src/pages/Settings.tsx`

Rekomendasi:
- Standarkan ke satu nama field saja di seluruh repo.
- Jika schema DB belum final, saya sarankan pakai `income_source_id` karena lebih eksplisit.

Checklist implementasi:
- [ ] Cek nama kolom aktual di tabel `transactions`.
- [ ] Samakan semua referensi frontend ke nama kolom final.
- [ ] Samakan query proteksi delete di settings.
- [ ] Update migration atau tipe jika perlu.

### P2. Laporan `bill` tidak konsisten dengan breakdown kategori/tujuan

Status saat ini:
- Summary menganggap `bill` sebagai pengeluaran.
- Breakdown kategori dan tujuan hanya menghitung `expense`.

Dampak:
- Total pengeluaran bisa lebih besar dari total kategori.
- Pie chart, top kategori, dan export bisa membingungkan user.

File terkait:
- `src/pages/Report.tsx`

Pertanyaan bisnis:
- Apakah `bill` harus masuk kategori analitik pengeluaran biasa?

Rekomendasi:
- Jika `bill` memang pengeluaran, masukkan ke agregasi report secara konsisten.

Checklist implementasi:
- [ ] Tentukan apakah `bill` perlu kategori/tujuan khusus atau cukup `bill_purpose_id`.
- [ ] Samakan summary, chart, top transaction, export PDF, dan export CSV.
- [ ] Uji hasil report pada bulan yang hanya berisi tagihan.

### P2. Export CSV belum aman

Status saat ini:
- CSV dibuat dengan `row.join(',')` tanpa escaping.

Dampak:
- Deskripsi dengan koma, kutip, atau newline akan merusak format file.

File terkait:
- `src/pages/Report.tsx`

Checklist implementasi:
- [ ] Buat helper escape CSV.
- [ ] Bungkus field teks dengan quote sesuai aturan CSV.
- [ ] Uji dengan data yang mengandung koma dan tanda kutip.

## Prioritas UX / Flow

### P3. Modal tertutup sebelum request async selesai

Status saat ini:
- Form transaksi dan settings menutup modal langsung setelah submit.
- Jika request gagal, user kehilangan input.

Dampak:
- UX buruk.
- Recovery dari error menjadi lambat.

File terkait:
- `src/components/TransactionModal.tsx`
- `src/components/SettingsModal.tsx`

Checklist implementasi:
- [ ] Jadikan `onAdd`, `onEdit`, `onSave`, `onDelete` return `Promise<boolean>` atau pola sukses/gagal lain yang eksplisit.
- [ ] Tutup modal hanya jika operasi sukses.
- [ ] Tambahkan state loading pada tombol submit.

## Urutan Implementasi Disarankan

1. Selesaikan keputusan model `admin_fee`.
2. Rapikan operasi atomic create/edit/delete transaksi.
3. Samakan field `income_source_id` versus `source_id`.
4. Perbaiki konsistensi report dan export.
5. Rapikan UX modal submit.

## Verifikasi Saat Review

Perintah yang sudah dijalankan:

```powershell
npm run typecheck
npm run build
npm run lint
```

Hasil:
- `typecheck`: lulus.
- `build`: lulus.
- `lint`: gagal dijalankan karena repo belum memiliki konfigurasi ESLint, walaupun script sudah ada di `package.json`.

## Catatan Tambahan

- Tidak ditemukan file test/spec di repo saat review.
- Karena aplikasi ini menyimpan data finansial, area saldo akun dan wishlist sebaiknya dianggap high-risk dan dipindahkan ke operasi database yang atomic.
