# 💰 Koin Ku - Personal Financial Tracker

![Koin Ku Banner](https://img.shields.io/badge/Version-2.0.0-blue) ![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Supabase](https://img.shields.io/badge/Supabase-Green) ![License](https://img.shields.io/badge/License-MIT-green)

> Aplikasi manajemen keuangan pribadi yang membantu Anda melacak pemasukan, pengeluaran, tabungan, dan tagihan dengan mudah dan aman.

## ✨ Fitur Utama

### 📊 Dashboard
- **Ringkasan Keuangan** - Total saldo dari semua akun
- **Statistik Bulanan** - Pemasukan, pengeluaran, dan tabungan bulan berjalan
- **Performa Budget** - Indikator efektivitas keuangan (Optimal/Normal/Waspada)
- **Tracker Tabungan** - Progress wishlist dengan notifikasi target tercapai

### 💳 Manajemen Transaksi
- **5 Jenis Transaksi:**
  - 💵 **Pemasukan** - Catat semua sumber income
  - 🛒 **Pengeluaran** - Lacak setiap pengeluaran dengan kategori & tujuan
  - 💰 **Tabungan** - Transfer ke wishlist target
  - 🔄 **Transfer** - Pindah antar akun
  - 📋 **Tagihan** - Kelola tagihan rutin bulanan

- **Fitur:**
  - CRUD lengkap (Tambah, Edit, Hapus)
  - Soft delete dengan audit trail
  - Sinkronisasi saldo otomatis
  - Filter & sort berdasarkan tanggal
  - Admin fee tracking

### 📈 Laporan & Analisis
- **Tren Bulanan** - Grafik line pemasukan vs pengeluaran
- **Distribusi Pengeluaran** - Pie chart per kategori
- **Rincian per Tujuan** - Breakdown detail pengeluaran
- **Export PDF/Excel** - Download laporan untuk arsip

### ⚙️ Pengaturan
- **Manajemen Akun** - Bank, E-Wallet, Cash, Investasi
- **Kategori Pengeluaran** - Kustomisasi kategori
- **Tujuan Pengeluaran** - Sub-kategori detail
- **Sumber Penghasilan** - Lacak dari mana income berasal
- **Wishlist Tabungan** - Target & progress tabungan
- **Daftar Tagihan** - Template tagihan rutin

### 🔐 Keamanan
- **Row Level Security (RLS)** - Isolasi data antar user
- **Check Constraints** - Validasi data di level database
- **Soft Delete** - Transaksi tidak dihapus permanen
- **Auto Balance Sync** - Saldo selalu konsisten

### 🎨 Design
- **Dark/Light Mode** - Pilih tema sesuai preferensi
- **Responsive Design** - Optimal di desktop & mobile
- **OKLCH Color System** - Warna yang konsisten & modern
- **Smooth Animations** - UX yang halus

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS 3.4 + CSS Variables |
| **State** | React Context API |
| **Routing** | React Router v6 |
| **Backend** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (Email + Google OAuth) |
| **Charts** | Recharts |
| **Export** | jsPDF + jspdf-autotable |

## 📁 Struktur Project

```
C:\Finance\
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Layout.tsx       # Main layout with sidebar
│   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   ├── Topbar.tsx      # Page header
│   │   ├── TransactionModal.tsx   # Transaction form
│   │   ├── SettingsModal.tsx       # Settings form
│   │   └── Toast.tsx       # Notification system
│   │
│   ├── pages/              # Page components
│   │   ├── Dashboard.tsx    # Main dashboard
│   │   ├── Transactions.tsx # Transaction history
│   │   ├── Report.tsx       # Financial reports
│   │   ├── Settings.tsx     # App settings
│   │   └── Login.tsx        # Authentication
│   │
│   ├── context/             # React Context providers
│   │   ├── AuthContext.tsx  # Authentication state
│   │   ├── DataContext.tsx  # Global data state
│   │   └── ThemeContext.tsx # Theme state
│   │
│   ├── lib/                 # Utilities & configs
│   │   ├── supabase.ts     # Supabase client
│   │   └── utils.ts        # Helper functions
│   │
│   ├── types/               # TypeScript definitions
│   │   └── index.ts        # Type interfaces
│   │
│   ├── App.tsx             # Root component
│   ├── main.tsx            # Entry point
│   └── index.css           # Global styles
│
├── supabase_rls_migration.sql  # Database schema & RLS
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## 🚀 Setup Lokal

### Prerequisites
- Node.js 18+
- npm atau yarn
- Akun Supabase (free tier cukup)

### 1. Clone Repository
```bash
git clone <repository-url>
cd finance
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Buat file `.env` di root directory:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Dapatkan nilai dari:
- Buka [Supabase Dashboard](https://supabase.com/dashboard)
- Project Settings → API
- Copy URL dan `anon public` key

### 4. Setup Database
1. Buka Supabase Dashboard → SQL Editor
2. Copy isi file `supabase_rls_migration.sql`
3. Paste dan Run

### 5. Jalankan Aplikasi
```bash
npm run dev
```

Buka http://localhost:5173

## 🌐 Deploy ke Production

### Vercel (Recommended)

1. Push kode ke GitHub
2. Buka [vercel.com](https://vercel.com)
3. Import project dari GitHub
4. Tambahkan environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy!

### Netlify

1. Push kode ke GitHub
2. Buka [netlify.com](https://netlify.com)
3. New site from Git
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables
6. Deploy

## 🔒 Keamanan

Aplikasi ini menggunakan **Row Level Security (RLS)** dari Supabase untuk memastikan:

- ✅ Setiap user hanya bisa akses data miliknya
- ✅ Tidak ada kebocoran data antar user
- ✅ Validasi di level database
- ✅ Transaksi tidak bisa dimanipulasi dari DevTools

## 📊 Database Schema

### Tables
| Table | Description |
|-------|-------------|
| `accounts` | Akun/wallet pengguna |
| `transactions` | Semua transaksi (income/expense/saving/transfer/bill) |
| `expense_categories` | Kategori pengeluaran |
| `expense_purposes` | Tujuan/sub-kategori pengeluaran |
| `income_sources` | Sumber penghasilan |
| `wishlists` | Target tabungan |
| `bill_purposes` | Template tagihan |

## 🎯 User Flow

```
Registrasi/Login
       ↓
Dashboard (Ringkasan)
       ↓
Transaksi → Tambah/Edit/Hapus
       ↓
Laporan → Lihat statistik & export
       ↓
Pengaturan → Kelola akun, kategori, wishlist
```

## 📱 Screenshots

### Dashboard
- Hero section dengan total saldo
- Statistik bulanan (Pemasukan, Pengeluaran, Tabungan)
- Performa budget dengan progress bar
- Tracker tabungan

### Transactions
- Tabbed view (Pemasukan, Pengeluaran, Tabungan, Transfer, Tagihan)
- Filter bulan/tahun
- Sorting kolom
- Mobile-friendly card view

### Reports
- Line chart tren bulanan
- Pie chart distribusi pengeluaran
- Ringkasan tahunan
- Export PDF/Excel

## 🤝 Kontribusi

Kontribusi terbuka! Silakan:
1. Fork repository
2. Buat feature branch
3. Commit perubahan
4. Push ke branch
5. Buat Pull Request

## 📄 License

MIT License - Bebas digunakan untuk project pribadi maupun komersial.

---

## 🙏 Credits

- [Supabase](https://supabase.com) - Backend as a Service
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS
- [Lucide](https://lucide.dev) - Beautiful icons
- [Recharts](https://recharts.org) - Composable charts
- [date-fns](https://date-fns.org) - Date utilities

---

**Made with ❤️ for better personal finance management**
