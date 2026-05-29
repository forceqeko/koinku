import { GoogleGenAI } from '@google/genai';

export interface ReceiptItem {
  name: string;
  qty: number;
  price: number;
  suggested_category: string;  // nama kategori yang disarankan per item
  suggested_purpose: string;   // nama tujuan yang disarankan per item
}

export interface ReceiptScanResult {
  store_name: string;
  date: string;           // YYYY-MM-DD
  total: number;
  description: string;
  items: ReceiptItem[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Menganalisis gambar struk belanja menggunakan Google Gemini 2.5 Flash
 * 
 * @param imageBase64 Gambar struk dalam format Base64 (tanpa header 'data:image/...;base64,')
 * @param mimeType MIME type dari gambar (misal: 'image/jpeg', 'image/png')
 * @param categories Daftar nama kategori pengeluaran milik user
 * @param purposes Daftar nama tujuan pengeluaran milik user
 * @returns Promise berisi hasil analisis struk dalam format ReceiptScanResult
 */
export async function analyzeReceipt(
  imageBase64: string,
  mimeType: string,
  categories: string[],
  purposes: string[]
): Promise<ReceiptScanResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('API Key Gemini (`VITE_GEMINI_API_KEY`) belum dikonfigurasi. Silakan tambahkan ke file .env.local Anda.');
  }

  // Inisialisasi GoogleGenAI dengan key
  const ai = new GoogleGenAI({ apiKey });

  const categoriesStr = categories.length > 0 ? categories.join(', ') : 'Tidak ada kategori tersedia';
  const purposesStr = purposes.length > 0 ? purposes.join(', ') : 'Tidak ada tujuan tersedia';

  const prompt = `Kamu adalah asisten pengelola keuangan pintar yang bertugas menganalisis foto struk belanja/nota transaksi pengeluaran.
Tugas kamu adalah mengekstrak data dari gambar struk ini dan memetakan datanya ke kategori dan tujuan pengeluaran yang telah disediakan oleh user.

Analisis gambar struk yang diberikan dan kembalikan data dalam format JSON yang valid dengan struktur berikut:

{
  "store_name": "Nama merchant/toko/resto yang tertera di struk",
  "date": "Tanggal transaksi dalam format YYYY-MM-DD (Gunakan tanggal hari ini jika tidak terbaca/tidak tertera)",
  "total": total_pembayaran_akhir_berupa_angka_integer_tanpa_pemisah_ribuan,
  "description": "Deskripsi ringkas transaksi keseluruhan, contoh: 'Belanja di Swalayan'",
  "items": [
    {
      "name": "Nama item/barang/menu makanan",
      "qty": jumlah_item (default 1 jika tidak jelas),
      "price": harga_satuan_item,
      "suggested_category": "PILIH salah satu nama kategori yang paling cocok untuk BARANG INI dari daftar kategori user berikut: [${categoriesStr}]. Jika tidak ada yang cocok sama sekali, gunakan 'Lainnya'.",
      "suggested_purpose": "PILIH salah satu nama tujuan pengeluaran yang paling cocok untuk BARANG INI dari daftar tujuan user berikut: [${purposesStr}]. Jika tidak ada yang cocok sama sekali, tulis nama toko/merchant tersebut."
    }
  ],
  "confidence": "high" | "medium" | "low" (tingkat keyakinan kamu terhadap pembacaan struk ini)
}

PENTING:
1. Pastikan "total" dan "price" hanya berupa angka murni (number) tanpa tanda titik, koma, atau simbol mata uang.
2. Format "date" WAJIB berupa YYYY-MM-DD.
   - PENTING: Struk belanja di Indonesia hampir selalu menggunakan format Hari/Bulan/Tahun (DD/MM/YY atau DD-MM-YYYY).
   - Angka pertama adalah HARI/TANGGAL, angka kedua adalah BULAN, dan angka ketiga adalah TAHUN.
   - Contoh: Jika di struk tertulis '29/05/26' atau '29-05-26', itu berarti Tanggal 29 Mei 2026. Anda harus mengonversinya menjadi format YYYY-MM-DD yaitu '2026-05-29'. JANGAN mengonversinya terbalik menjadi '2029-05-26'.
3. Untuk "suggested_category" pada masing-masing barang, pilihlah dari daftar yang disediakan: [${categoriesStr}]. Jika kosong atau tidak cocok, gunakan kategori 'Lainnya' atau biarkan kosong.
4. Untuk "suggested_purpose" pada masing-masing barang, pilihlah dari daftar yang disediakan: [${purposesStr}]. Jika kosong atau tidak cocok, buat rekomendasi baru berbasis nama toko/merchant.
5. Jawab HANYA dengan objek JSON valid. Jangan berikan penjelasan teks tambahan di luar JSON.`;

  const models = [
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-2.5-flash-lite',
    'gemini-3.1-pro-preview',
    'gemini-3.5-flash',
  ];

  let textResponse = '';
  let lastError: any = null;

  for (const model of models) {
    try {
      console.log(`Mencoba menganalisis struk dengan model ${model}...`);
      const response = await ai.models.generateContent({
        model: model,
        contents: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType
            }
          },
          prompt
        ],
        config: {
          responseMimeType: 'application/json',
        }
      });
      textResponse = response.text || '';
      if (textResponse) {
        console.log(`Berhasil menganalisis struk menggunakan model ${model}!`);
        break;
      }
    } catch (err: any) {
      console.warn(`Model ${model} mengalami kendala:`, err.message || err);
      lastError = err;
    }
  }

  if (!textResponse) {
    throw new Error(
      `Layanan Google Gemini sedang sangat sibuk (Error 503 / Unavailable). Silakan coba lagi beberapa saat lagi.\n(Detail: ${lastError?.message || lastError})`
    );
  }

  // Parse JSON secara defensif
  let parsedResult: any;
  try {
    parsedResult = JSON.parse(cleanJsonString(textResponse));
  } catch (parseErr) {
    console.error('Gagal me-parse JSON mentah dari Gemini:', textResponse, parseErr);
    throw new Error('Gagal memproses respons dari AI. Format tidak sesuai JSON.');
  }

  // Melakukan validasi & normalisasi data agar aman digunakan di UI
  return {
    store_name: parsedResult.store_name || 'Merchant Tidak Dikenal',
    date: isValidDateString(parsedResult.date) ? parsedResult.date : new Date().toISOString().split('T')[0],
    total: typeof parsedResult.total === 'number' ? parsedResult.total : parseFloat(parsedResult.total) || 0,
    description: parsedResult.description || 'Belanja Struk',
    items: Array.isArray(parsedResult.items) ? parsedResult.items.map((it: any) => ({
      name: it.name || 'Barang',
      qty: typeof it.qty === 'number' ? it.qty : parseInt(it.qty) || 1,
      price: typeof it.price === 'number' ? it.price : parseFloat(it.price) || 0,
      suggested_category: it.suggested_category || '',
      suggested_purpose: it.suggested_purpose || ''
    })) : [],
    confidence: ['high', 'medium', 'low'].includes(parsedResult.confidence) ? parsedResult.confidence : 'medium'
  };
}


/**
 * Membersihkan string response untuk menghindari error parsing JSON jika ada markdown wrapping ```json
 */
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

/**
 * Validasi apakah string tanggal memiliki format YYYY-MM-DD
 */
function isValidDateString(dateStr: any): boolean {
  if (typeof dateStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const t = Date.parse(dateStr);
  return !isNaN(t);
}
