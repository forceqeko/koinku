import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, ChevronDown, Check, Building2, Smartphone, Wallet, 
  Search, Upload, Camera, Loader2, AlertCircle, Sparkles, CheckCircle2 
} from 'lucide-react';
import { analyzeReceipt, ReceiptScanResult } from '../lib/gemini';
import { formatThousands, parseThousands } from '../lib/utils';
import { toast } from './Toast';
import clsx from 'clsx';
import type { Account, ExpenseCategory, ExpensePurpose } from '../types';

interface ReceiptScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (tx: any) => Promise<void>;
  accounts: Account[];
  categories: ExpenseCategory[];
  purposes: ExpensePurpose[];
}

interface ItemPickerProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onSelect: (id: string) => void;
  selectedValue: string;
  title: string;
  placeholder?: string;
}

// ItemPicker for search & select list drawer
function ItemPicker({ isOpen, onClose, items, onSelect, selectedValue, title, placeholder = "Cari..." }: ItemPickerProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      const isMobile = window.matchMedia('(max-width: 768px)').matches;
      if (!isMobile) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredItems = items.filter(a => 
    (a.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.type || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-alt/20">
          <h3 className="text-[14px] font-bold text-text-primary">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-line bg-surface">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              ref={inputRef}
              type="text" 
              placeholder={placeholder} 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-surface-alt/50 border border-line rounded-xl pl-10 pr-4 py-2.5 text-[13px] focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-text-muted font-medium">Data tidak ditemukan</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const isSelected = item.id === selectedValue;
              let Icon = Wallet;
              if (item.type === 'bank') Icon = Building2;
              if (item.type === 'ewallet') Icon = Smartphone;

              return (
                <button
                  key={item.id}
                  onClick={() => { onSelect(item.id); onClose(); }}
                  className={clsx(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-all group",
                    isSelected ? "bg-accent/10 border border-accent/20" : "hover:bg-surface-hover border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform bg-white overflow-hidden">
                      {item.icon_url ? (
                        <img src={item.icon_url} alt={item.name} className="w-7 h-7 object-contain" />
                      ) : (
                        <Icon className="w-5 h-5 text-text-muted" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className={clsx("text-[13px] font-bold", isSelected ? "text-accent" : "text-text-primary")}>{item.name}</p>
                      {item.type && <p className="text-[11px] text-text-muted capitalize">{item.type}</p>}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// Trigger for Picker
function ItemTrigger({ items, value, onClick, label, placeholder = "Pilih..." }: { items: any[], value: string, onClick: () => void, label: string, placeholder?: string }) {
  const selected = items.find(a => a.id === value);
  let SelectedIcon = Wallet;
  if (selected?.type === 'bank') SelectedIcon = Building2;
  if (selected?.type === 'ewallet') SelectedIcon = Smartphone;

  return (
    <div className="space-y-1 text-left">
      <label className="block text-[11px] font-medium text-text-secondary">{label}</label>
      <button 
        type="button" 
        onClick={onClick} 
        className="input flex items-center justify-between w-full hover:border-accent/40 bg-surface text-left group transition-all h-[42px] px-3.5 rounded-xl border border-line"
      >
        {selected ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-white border border-line flex items-center justify-center overflow-hidden shrink-0">
              {selected.icon_url ? (
                 <img src={selected.icon_url} alt={selected.name} className="w-4.5 h-4.5 object-contain" />
              ) : (
                 <SelectedIcon className="w-3.5 h-3.5 text-text-muted" />
              )}
            </div>
            <span className="font-semibold text-text-primary text-[12px] truncate max-w-[110px]">{selected.name}</span>
          </div>
        ) : (
          <span className="text-text-muted text-[12px]">{placeholder}</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-text-muted group-hover:text-accent group-hover:translate-y-0.5 transition-all shrink-0" />
      </button>
    </div>
  );
}

interface LocalReceiptItem {
  name: string;
  qty: number;
  price: number;
  amount: string; // string form of total for editing
  checked: boolean;
  category_id: string;
  purpose_id: string;
}

export default function ReceiptScanModal({
  isOpen,
  onClose,
  onAddTransaction,
  accounts,
  categories,
  purposes
}: ReceiptScanModalProps) {
  // Modal stages: 'upload' | 'analyzing' | 'preview'
  const [stage, setStage] = useState<'upload' | 'analyzing' | 'preview'>('upload');
  
  // Image states
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  
  // Global form fields for confirmation stage
  const [storeName, setStoreName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromAccountId, setFromAccountId] = useState('');
  
  // Dynamic item checklist and selected indexes
  const [localItems, setLocalItems] = useState<LocalReceiptItem[]>([]);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
  
  // Loading and sequence states
  const [scanResult, setScanResult] = useState<ReceiptScanResult | null>(null);
  const [loadingStep, setLoadingStep] = useState('Mengunggah gambar struk...');
  const [isSaving, setIsSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState('');
  
  // Selection trigger drawer/picker modes
  const [pickerMode, setPickerMode] = useState<'none' | 'from' | 'category' | 'purpose'>('none');
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Initialize and reset
  useEffect(() => {
    if (isOpen) {
      resetAll();
      if (accounts.length > 0) {
        setFromAccountId(accounts[0].id);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetAll = () => {
    setStage('upload');
    setImagePreviewUrl(null);
    setImageBase64('');
    setMimeType('image/jpeg');
    setScanResult(null);
    setStoreName('');
    setDate(new Date().toISOString().split('T')[0]);
    if (accounts.length > 0) setFromAccountId(accounts[0].id);
    setLocalItems([]);
    setActiveItemIndex(null);
    setIsSaving(false);
  };

  // Convert File to base64
  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPEG, PNG, dll).');
      return;
    }
    setMimeType(file.type);
    const previewUrl = URL.createObjectURL(file);
    setImagePreviewUrl(previewUrl);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const cleanBase64 = base64String.replace(/^data:image\/[a-z]+;base64,/, "");
      setImageBase64(cleanBase64);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  // Drag-and-drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Run AI analysis
  const handleStartAnalysis = async () => {
    if (!imageBase64) {
      toast.error('Pilih atau ambil foto struk terlebih dahulu.');
      return;
    }

    setStage('analyzing');
    setLoadingStep('Membaca teks dari struk...');

    const intervals = [
      { delay: 1500, text: 'Mengurai item belanja...' },
      { delay: 3500, text: 'Memetakan kategori & tujuan per barang...' },
      { delay: 5500, text: 'Memvalidasi data transaksi...' }
    ];

    intervals.forEach(step => {
      setTimeout(() => {
        setStage(current => {
          if (current === 'analyzing') {
            setLoadingStep(step.text);
          }
          return current;
        });
      }, step.delay);
    });

    try {
      const catNames = categories.map(c => c.name);
      const purNames = purposes.map(p => p.name);

      const result = await analyzeReceipt(imageBase64, mimeType, catNames, purNames);
      setScanResult(result);
      setStoreName(result.store_name);
      setDate(result.date);

      // Map suggested categories and purposes to items dynamically
      const processedItems: LocalReceiptItem[] = result.items.map((it: any) => {
        const matchedCategory = categories.find(
          c => c.name.toLowerCase() === (it.suggested_category || '').toLowerCase()
        );
        const categoryId = matchedCategory ? matchedCategory.id : (categories[0]?.id || '');
        
        let purposeId = '';
        if (categoryId) {
          const matchedPurpose = purposes.find(
            p => p.category_id === categoryId && p.name.toLowerCase() === (it.suggested_purpose || '').toLowerCase()
          );
          if (matchedPurpose) {
            purposeId = matchedPurpose.id;
          } else {
            const categoryPurposes = purposes.filter(p => p.category_id === categoryId);
            purposeId = categoryPurposes.length > 0 ? categoryPurposes[0].id : (purposes[0]?.id || '');
          }
        } else {
          purposeId = purposes[0]?.id || '';
        }

        return {
          name: it.name,
          qty: it.qty,
          price: it.price,
          amount: String(it.qty * it.price),
          checked: true,
          category_id: categoryId,
          purpose_id: purposeId
        };
      });

      setLocalItems(processedItems);
      setStage('preview');
      toast.success('Struk berhasil dianalisis!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menganalisis struk. Silakan coba lagi.');
      setStage('upload');
    }
  };

  // Perform sequential database insertions
  const handleSaveTransactions = async () => {
    const activeItems = localItems.filter(item => item.checked);
    
    if (activeItems.length === 0) {
      toast.error('Silakan centang setidaknya satu barang untuk disimpan.');
      return;
    }
    if (!storeName.trim()) {
      toast.error('Nama toko/merchant wajib diisi.');
      return;
    }
    if (!fromAccountId) {
      toast.error('Silakan pilih dompet sumber pengeluaran.');
      return;
    }

    // Double check item level data
    for (const item of activeItems) {
      const amt = Number(parseThousands(item.amount));
      if (!item.name.trim()) {
        toast.error('Nama barang tidak boleh kosong.');
        return;
      }
      if (isNaN(amt) || amt <= 0) {
        toast.error(`Nominal barang "${item.name}" harus lebih dari 0.`);
        return;
      }
      if (!item.category_id) {
        toast.error(`Kategori barang "${item.name}" wajib dipilih.`);
        return;
      }
      if (!item.purpose_id) {
        toast.error(`Tujuan barang "${item.name}" wajib dipilih.`);
        return;
      }
    }

    setIsSaving(true);
    let successCount = 0;

    try {
      for (let i = 0; i < activeItems.length; i++) {
        const item = activeItems[i];
        setSavingProgress(`Menyimpan barang ke-${i + 1} dari ${activeItems.length}:\n"${item.name}"`);
        
        const payload = {
          date: new Date(date).toISOString(),
          type: 'expense',
          description: `${item.name} (${storeName})`,
          amount: Number(parseThousands(item.amount)),
          from_account_id: fromAccountId,
          category_id: item.category_id,
          purpose_id: item.purpose_id
        };

        await onAddTransaction(payload);
        successCount++;
      }

      toast.success(`Berhasil menyimpan ${successCount} transaksi pengeluaran!`);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(`Tersimpan ${successCount} transaksi. Mengalami kendala pada transaksi berikutnya: ` + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleItemCheck = (idx: number) => {
    setLocalItems(prev => prev.map((item, i) => {
      if (i === idx) return { ...item, checked: !item.checked };
      return item;
    }));
  };

  const handleItemNameChange = (idx: number, name: string) => {
    setLocalItems(prev => prev.map((item, i) => {
      if (i === idx) return { ...item, name };
      return item;
    }));
  };

  const handleItemAmountChange = (idx: number, amtStr: string) => {
    setLocalItems(prev => prev.map((item, i) => {
      if (i === idx) return { ...item, amount: amtStr };
      return item;
    }));
  };

  const confidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    const styles = {
      high: 'bg-success/10 border-success/20 text-success',
      medium: 'bg-warning/10 border-warning/20 text-warning',
      low: 'bg-danger/10 border-danger/20 text-danger'
    };
    const labels = {
      high: 'Akurasi Tinggi',
      medium: 'Akurasi Sedang',
      low: 'Periksa Kembali'
    };
    return (
      <span className={clsx("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", styles[confidence])}>
        {labels[confidence]}
      </span>
    );
  };

  // Calculate totals
  const totalAmount = localItems
    .filter(item => item.checked)
    .reduce((sum, item) => sum + (Number(parseThousands(item.amount)) || 0), 0);
  
  const checkedCount = localItems.filter(item => item.checked).length;

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-surface border border-line rounded-2xl w-full max-w-lg overflow-hidden animate-scale-in shadow-2xl flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-alt/10 shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent animate-pulse" />
              <h2 className="text-[15px] font-bold text-text-primary">
                Scan Struk AI (Pecah Item)
              </h2>
            </div>
            <button onClick={onClose} aria-label="Tutup modal" className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-6 space-y-5">
            
            {/* STAGE 1: UPLOAD / CAMERA VIEW */}
            {stage === 'upload' && (
              <div className="space-y-6">
                {!imagePreviewUrl ? (
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={clsx(
                      "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-[220px]",
                      isDragOver ? "border-accent bg-accent/5" : "border-line bg-surface hover:border-accent/40"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                      <Upload className="w-6 h-6 text-accent" />
                    </div>
                    <p className="text-[13px] font-bold text-text-primary mb-1">Pilih atau Seret Foto Struk</p>
                    <p className="text-[11px] text-text-muted max-w-[240px]">Mendukung format PNG, JPG, atau WEBP dari galeri ponsel atau komputer Anda</p>
                    
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-2xl border border-line overflow-hidden aspect-[4/3] bg-black/10 flex items-center justify-center">
                      <img src={imagePreviewUrl} alt="Preview Struk" className="max-w-full max-h-full object-contain" />
                      <button 
                        onClick={() => { setImagePreviewUrl(null); setImageBase64(''); }}
                        className="absolute top-3 right-3 p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition-all shadow-md"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <button
                      onClick={handleStartAnalysis}
                      className="btn btn-primary w-full py-3 text-[13px] font-bold shadow-lg shadow-accent/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    >
                      <Sparkles className="w-4 h-4 text-white" />
                      Mulai Menganalisis Struk
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3">
                  <div className="h-px bg-line flex-1" />
                  <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Atau ambil foto</span>
                  <div className="h-px bg-line flex-1" />
                </div>

                <button 
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full py-3 border border-line bg-surface hover:border-accent/40 text-text-primary font-bold rounded-2xl flex items-center justify-center gap-2.5 text-[13px] transition-all active:scale-[0.98]"
                >
                  <Camera className="w-4.5 h-4.5 text-accent" />
                  Gunakan Kamera
                </button>
                <input 
                  ref={cameraInputRef} 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </div>
            )}

            {/* STAGE 2: LOADING / AI SKELETON */}
            {stage === 'analyzing' && (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-6">
                <div className="relative flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-2 border-accent/20 flex items-center justify-center relative">
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 rounded-full border border-accent/40 scale-110 animate-ping opacity-40" />
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-[14px] font-bold text-text-primary">Menganalisis Struk via Google AI</h4>
                  <p className="text-[11px] text-text-muted font-medium animate-pulse">{loadingStep}</p>
                </div>

                {/* Shimmer loaders */}
                <div className="w-full border border-line bg-surface-alt/10 rounded-2xl p-4 space-y-3 shrink-0">
                  <div className="flex justify-between items-center">
                    <div className="skeleton w-24 h-4 rounded" />
                    <div className="skeleton w-16 h-4 rounded" />
                  </div>
                  <div className="h-px bg-line/50" />
                  <div className="skeleton w-3/4 h-3.5 rounded" />
                  <div className="skeleton w-1/2 h-3.5 rounded" />
                </div>
              </div>
            )}

            {/* STAGE 3: INTERACTIVE MULTI-ITEM PREVIEW FORM */}
            {stage === 'preview' && scanResult && (
              <div className="space-y-5 text-left">
                
                {/* Accuracy Status */}
                <div className="flex items-center justify-between bg-surface-alt/20 border border-line rounded-xl px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <span className="text-[11px] font-bold text-text-primary">Ekstraksi Sukses (Pecah Item)</span>
                  </div>
                  {confidenceBadge(scanResult.confidence)}
                </div>

                {scanResult.confidence === 'low' && (
                  <div className="bg-danger/5 border border-danger/10 text-danger rounded-xl p-3 flex gap-2">
                    <AlertCircle className="w-4.5 h-4.5 shrink-0 text-danger" />
                    <p className="text-[10.5px] font-medium leading-relaxed">
                      AI mendeteksi tulisan struk kurang jelas. Silakan periksa kembali harga satuan dan kategori per item di bawah agar akurat.
                    </p>
                  </div>
                )}

                {/* GLOBAL CONTROLS (Toko, Dompet, Tanggal) */}
                <div className="bg-surface-alt/20 border border-line rounded-2xl p-4 space-y-4">
                  <h4 className="text-[12px] font-bold text-accent uppercase tracking-wider">Pengaturan Global</h4>
                  
                  <div>
                    <label className="block text-[11px] font-medium text-text-secondary mb-1">Nama Toko / Merchant</label>
                    <input 
                      type="text" 
                      required 
                      value={storeName} 
                      onChange={e => setStoreName(e.target.value)} 
                      className="input h-[42px] text-[13px] rounded-xl border border-line bg-surface" 
                      placeholder="Contoh: Alfamart / Indomaret" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <ItemTrigger 
                      label="Sumber Dompet / Wallet"
                      items={accounts} 
                      value={fromAccountId} 
                      onClick={() => setPickerMode('from')} 
                    />
                    <div>
                      <label className="block text-[11px] font-medium text-text-secondary mb-1">Tanggal Transaksi</label>
                      <input 
                        type="date" 
                        required 
                        value={date} 
                        onChange={e => setDate(e.target.value)} 
                        className="input h-[42px] text-[13px] rounded-xl border border-line bg-surface" 
                      />
                    </div>
                  </div>
                </div>

                {/* MULTI-ITEM CHECKLIST GRID */}
                <div className="space-y-3">
                  <h4 className="text-[12px] font-bold text-text-muted uppercase tracking-wider px-1">Daftar Barang ({localItems.length})</h4>
                  
                  <div className="space-y-3.5 max-h-[340px] overflow-y-auto custom-scrollbar pr-1.5">
                    {localItems.map((item, idx) => (
                      <div 
                        key={idx} 
                        className={clsx(
                          "border rounded-2xl p-3.5 transition-all relative flex flex-col md:flex-row gap-3.5 items-start",
                          item.checked 
                            ? "bg-surface border-line" 
                            : "bg-surface-alt/10 border-transparent opacity-50"
                        )}
                      >
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleItemCheck(idx)}
                          className={clsx(
                            "w-5.5 h-5.5 rounded-lg border flex items-center justify-center transition-all shrink-0 mt-1 md:mt-2",
                            item.checked 
                              ? "bg-accent border-accent text-white" 
                              : "border-line bg-surface text-transparent hover:border-accent/60"
                          )}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>

                        {/* Item Card Body */}
                        <div className="flex-1 w-full space-y-3">
                          {/* Name & Total price row */}
                          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
                            <input 
                              type="text"
                              value={item.name}
                              disabled={!item.checked}
                              onChange={e => handleItemNameChange(idx, e.target.value)}
                              className="bg-transparent font-bold text-text-primary text-[13px] border-b border-transparent focus:border-accent/40 outline-none w-full sm:max-w-[240px] truncate"
                              placeholder="Nama Barang"
                            />
                            
                            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                              <span className="text-[11px] text-text-muted">Rp</span>
                              <input 
                                type="text"
                                inputMode="numeric"
                                disabled={!item.checked}
                                value={formatThousands(item.amount)}
                                onChange={e => handleItemAmountChange(idx, parseThousands(e.target.value))}
                                className="bg-surface-alt/40 border border-line rounded-lg text-right font-extrabold text-[12px] w-[90px] px-2 py-1 outline-none text-text-primary focus:border-accent/60"
                                placeholder="Harga"
                              />
                            </div>
                          </div>

                          {/* Individual Category & Purpose mini selectors */}
                          <div className="grid grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              disabled={!item.checked}
                              onClick={() => { setActiveItemIndex(idx); setPickerMode('category'); }}
                              className={clsx(
                                "flex items-center justify-between px-2.5 py-1.5 bg-surface-alt/50 border border-line/60 rounded-xl text-left text-[11px] transition-all group w-full truncate h-[34px]",
                                !item.checked && "cursor-not-allowed"
                              )}
                            >
                              <span className="truncate text-text-secondary font-medium">
                                Cat: <strong className="text-text-primary font-semibold">{categories.find(c => c.id === item.category_id)?.name || 'Pilih Kategori'}</strong>
                              </span>
                              <ChevronDown className="w-3.5 h-3.5 text-text-muted group-hover:text-accent shrink-0" />
                            </button>

                            <button
                              type="button"
                              disabled={!item.checked}
                              onClick={() => { setActiveItemIndex(idx); setPickerMode('purpose'); }}
                              className={clsx(
                                "flex items-center justify-between px-2.5 py-1.5 bg-accent/5 border border-accent/10 rounded-xl text-left text-[11px] transition-all group w-full truncate h-[34px]",
                                !item.checked && "cursor-not-allowed"
                              )}
                            >
                              <span className="truncate text-accent font-semibold">
                                {purposes.find(p => p.id === item.purpose_id)?.name || 'Pilih Tujuan'}
                              </span>
                              <ChevronDown className="w-3.5 h-3.5 text-accent/70 group-hover:text-accent shrink-0" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BOTTOM SUMMARY & ACTIONS */}
                <div className="pt-3 border-t border-line space-y-3 shrink-0">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[12px] font-medium text-text-secondary">Pencatatan Terpilih:</span>
                    <span className="text-[14px] font-extrabold text-text-primary">
                      Rp{formatThousands(String(totalAmount))} <span className="text-[11px] text-text-muted font-normal">({checkedCount} barang)</span>
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <button 
                      onClick={handleSaveTransactions} 
                      className="btn btn-primary w-full py-3 text-[14px] font-bold shadow-lg shadow-accent/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      Simpan {checkedCount} Transaksi
                    </button>

                    <button 
                      onClick={resetAll} 
                      className="w-full py-2.5 border border-line bg-surface hover:bg-surface-hover hover:border-accent/40 rounded-xl font-bold text-text-secondary text-[12px] transition-all active:scale-[0.98]"
                    >
                      Scan Ulang
                    </button>
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>
      </div>

      {/* SEQUENTIAL PROGRESS SAVING OVERLAY */}
      {isSaving && (
        <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-surface border border-line rounded-3xl p-8 max-w-sm w-full text-center space-y-5 shadow-2xl animate-scale-in">
            <div className="relative flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-accent animate-spin" />
            </div>
            <div className="space-y-2">
              <p className="text-[14px] font-bold text-text-primary">Menyimpan Transaksi...</p>
              <p className="text-[12px] text-text-muted font-medium leading-relaxed whitespace-pre-line">{savingProgress}</p>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Selector Drawer/Picker */}
      <ItemPicker 
        isOpen={pickerMode !== 'none'}
        onClose={() => setPickerMode('none')}
        title={
          pickerMode === 'from' ? 'Pilih Dompet / Wallet' :
          pickerMode === 'category' ? 'Pilih Kategori' :
          'Pilih Tujuan Pengeluaran'
        }
        items={
          pickerMode === 'from' ? accounts :
          pickerMode === 'category' ? categories :
          // Filter purposes dynamically based on the specific item's selected category
          purposes.filter(
            p => {
              if (activeItemIndex !== null) {
                const itemCatId = localItems[activeItemIndex]?.category_id;
                return !itemCatId || p.category_id === itemCatId;
              }
              return true;
            }
          )
        }
        selectedValue={
          pickerMode === 'from' ? fromAccountId :
          pickerMode === 'category' ? (activeItemIndex !== null ? localItems[activeItemIndex].category_id : '') :
          (activeItemIndex !== null ? localItems[activeItemIndex].purpose_id : '')
        }
        onSelect={(id) => {
          if (pickerMode === 'from') {
            setFromAccountId(id);
          } else if (pickerMode === 'category') {
            if (activeItemIndex !== null) {
              setLocalItems(prev => prev.map((item, idx) => {
                if (idx === activeItemIndex) {
                  // Pre-select first purpose of newly selected category
                  const categoryPurposes = purposes.filter(p => p.category_id === id);
                  const firstPurposeId = categoryPurposes.length > 0 ? categoryPurposes[0].id : '';
                  return { ...item, category_id: id, purpose_id: firstPurposeId };
                }
                return item;
              }));
            }
          } else {
            if (activeItemIndex !== null) {
              setLocalItems(prev => prev.map((item, idx) => {
                if (idx === activeItemIndex) {
                  return { ...item, purpose_id: id };
                }
                return item;
              }));
            }
          }
        }}
        placeholder={
          pickerMode === 'from' ? "Cari nama akun..." :
          pickerMode === 'category' ? "Cari kategori..." :
          "Cari tujuan..."
        }
      />
    </>,
    document.body
  );
}
