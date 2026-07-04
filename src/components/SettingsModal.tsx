import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  Check,
  ChevronDown,
  PiggyBank,
  Search,
  Smartphone,
  Trash2,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { formatThousands, parseThousands } from '../lib/utils';
import { PURPOSE_ICONS, getCategoryColor } from '../lib/icons';

type SettingTab = 'akun' | 'sumber' | 'kategori' | 'tujuan' | 'wishlist' | 'tagihan';
type AccountType = 'bank' | 'ewallet' | 'cash' | 'investasi';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: SettingTab;
  onSave: (data: any, isEdit: boolean) => void | Promise<boolean>;
  onDelete?: (id: string) => void | Promise<boolean>;
  initialData?: any;
}

interface TypeOption {
  id: AccountType;
  name: string;
  hint: string;
  icon: typeof Building2;
}

const accountTypeOptions: TypeOption[] = [
  { id: 'bank', name: 'Bank', hint: 'Rekening tabungan atau giro', icon: Building2 },
  { id: 'ewallet', name: 'E-Wallet', hint: 'Dompet digital harian', icon: Smartphone },
  { id: 'cash', name: 'Cash', hint: 'Uang tunai yang Anda pegang', icon: Wallet },
  { id: 'investasi', name: 'Investasi', hint: 'Aset investasi dan tabungan jangka panjang', icon: PiggyBank },
];

interface TypePickerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedValue: AccountType;
  onSelect: (value: AccountType) => void;
}

function TypePicker({ isOpen, onClose, selectedValue, onSelect }: TypePickerProps) {
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

  const filteredItems = accountTypeOptions.filter((item) =>
    `${item.name} ${item.hint}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-alt/20">
          <h3 className="text-[15px] font-bold text-text-primary">Pilih Jenis Akun</h3>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-line bg-surface">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Cari jenis akun..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-alt/50 border border-line rounded-xl pl-10 pr-4 py-2.5 text-[13px] focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredItems.map((item) => {
            const isSelected = item.id === selectedValue;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                className={clsx(
                  'w-full flex items-center justify-between p-3 rounded-xl transition-all group',
                  isSelected ? 'bg-accent/10 border border-accent/20' : 'hover:bg-surface-hover border border-transparent'
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-line flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Icon className={clsx('w-5 h-5', isSelected ? 'text-accent' : 'text-text-muted')} />
                  </div>
                  <div className="text-left">
                    <p className={clsx('text-[13px] font-bold', isSelected ? 'text-accent' : 'text-text-primary')}>{item.name}</p>
                    <p className="text-[11px] text-text-muted">{item.hint}</p>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TypeTrigger({
  value,
  onClick,
}: {
  value: AccountType;
  onClick: () => void;
}) {
  const selected = accountTypeOptions.find((item) => item.id === value) || accountTypeOptions[0];
  const Icon = selected.icon;

  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-text-secondary">Jenis Akun</label>
      <button
        type="button"
        onClick={onClick}
        className="input flex items-center justify-between w-full hover:border-accent/40 bg-surface text-left group transition-all h-[46px]"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white border border-line flex items-center justify-center overflow-hidden shrink-0">
            <Icon className="w-4 h-4 text-text-muted" />
          </div>
          <div>
            <span className="block font-semibold text-text-primary text-[13px]">{selected.name}</span>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-text-muted group-hover:text-accent group-hover:translate-y-0.5 transition-all" />
      </button>
    </div>
  );
}

function formatImageName(name: string) {
  if (name.length <= 28) return name;
  const extIndex = name.lastIndexOf('.');
  if (extIndex <= 0) return `${name.slice(0, 25)}...`;
  const ext = name.slice(extIndex);
  return `${name.slice(0, 21)}...${ext}`;
}

export default function SettingsModal({ isOpen, onClose, type, onSave, onDelete, initialData }: SettingsModalProps) {
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('bank');
  const [iconUrl, setIconUrl] = useState('');
  const [iconName, setIconName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [purposeIcon, setPurposeIcon] = useState('Question');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (isOpen) {
      setShowDeleteConfirm(false);
      setIsSaving(false);
      setIsDeleting(false);
      setPickerOpen(false);

      if (initialData) {
        setName(initialData.name || '');
        setInitialBalance(
          initialData.initial_balance !== undefined && initialData.initial_balance !== null
            ? String(initialData.initial_balance)
            : initialData.balance !== undefined
              ? String(initialData.balance)
              : ''
        );
        setAccountType((initialData.type || 'bank') as AccountType);
        const nextIcon = initialData.icon_url || initialData.iconUrl || '';
        setIconUrl(nextIcon);
        setIconName(nextIcon ? 'Logo tersimpan' : '');
        setTargetAmount(initialData.targetAmount !== undefined ? String(initialData.targetAmount) : '');
        setCurrentAmount(initialData.currentAmount !== undefined ? String(initialData.currentAmount) : '');
        setPurposeIcon(initialData.icon || 'Question');
      } else {
        setName('');
        setInitialBalance('');
        setAccountType('bank');
        setIconUrl('');
        setIconName('');
        setTargetAmount('');
        setCurrentAmount('');
        setPurposeIcon('Question');
      }
    }
  }, [isOpen, initialData]);

  const currentBalanceDisplay = useMemo(() => {
    const currentBalance = initialData?.balance !== undefined ? String(initialData.balance) : '0';
    return formatThousands(currentBalance);
  }, [initialData]);

  if (!isOpen) return null;

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIMENSION = 512;
        let { width, height } = img;

        if (width > height && width > MAX_DIMENSION) {
          height *= MAX_DIMENSION / width;
          width = MAX_DIMENSION;
        } else if (height > MAX_DIMENSION) {
          width *= MAX_DIMENSION / height;
          height = MAX_DIMENSION;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', 0.8));
        } else {
          resolve('');
        }
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressedDataUrl = await compressImage(file);
    setIconUrl(compressedDataUrl);
    setIconName(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const isEdit = !!initialData;
    const id = isEdit ? initialData.id : `new_${Date.now()}`;
    let newData: any = { id, name: name.trim() };

    if (type === 'akun') {
      newData = {
        ...newData,
        initialBalance: Number(parseThousands(initialBalance || '0')),
        currentBalance: initialData?.balance ?? Number(parseThousands(initialBalance || '0')),
        type: accountType,
      };
      if (iconUrl) newData.iconUrl = iconUrl;
    } else if (type === 'wishlist') {
      newData = {
        ...newData,
        targetAmount: Number(parseThousands(targetAmount || '0')),
        currentAmount: Number(parseThousands(currentAmount || '0')),
      };
    } else if (type === 'tujuan') {
      newData = {
        ...newData,
        icon: purposeIcon,
      };
    }

    setIsSaving(true);
    try {
      const result = await Promise.resolve(onSave(newData, isEdit));
      if (result !== false) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !initialData || isDeleting) return;
    setIsDeleting(true);
    try {
      const result = await Promise.resolve(onDelete(initialData.id));
      if (result !== false) {
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const typeLabel =
    type === 'akun'
      ? 'Akun'
      : type === 'sumber'
        ? 'Sumber Penghasilan'
        : type === 'kategori'
          ? 'Kategori'
          : type === 'tujuan'
            ? 'Tujuan'
            : type === 'wishlist'
              ? 'Tabungan'
              : 'Tagihan';

  const submitLabel = isSaving ? 'Menyimpan...' : isEditMode ? `Perbarui ${typeLabel}` : `Simpan ${typeLabel}`;
  const selectedType = accountTypeOptions.find((item) => item.id === accountType) || accountTypeOptions[0];

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden animate-scale-in shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-alt/10">
            <h2 className="text-[15px] font-bold text-text-primary">
              {isEditMode ? 'Edit' : 'Tambah'} {typeLabel}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup modal"
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar">
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Nama</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder={type === 'akun' ? 'Contoh: BCA Utama / DANA' : 'Masukkan nama...'}
              />
            </div>

            {type === 'akun' && (
              <>
                <TypeTrigger value={accountType} onClick={() => setPickerOpen(true)} />

                <div className="rounded-2xl border border-line bg-surface-alt/10 p-3.5 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-line flex items-center justify-center shrink-0">
                    <selectedType.icon className="w-5 h-5 text-text-muted" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-text-primary">{selectedType.name}</p>
                    <p className="text-[11px] text-text-muted leading-relaxed">{selectedType.hint}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Saldo Awal (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formatThousands(initialBalance)}
                    onChange={(e) => setInitialBalance(parseThousands(e.target.value))}
                    className="input"
                    placeholder="0"
                  />
                  <p className="mt-1.5 text-[11px] text-text-muted">
                    Nilai ini menyimpan saldo awal akun. Mengubahnya tidak akan mengubah saldo sekarang pada akun yang sudah ada.
                  </p>
                </div>

                {isEditMode && (
                  <div>
                    <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Saldo Sekarang (Rp)</label>
                    <input
                      type="text"
                      value={currentBalanceDisplay}
                      className="input bg-surface-alt/40 text-text-muted"
                      readOnly
                    />
                    <p className="mt-1.5 text-[11px] text-text-muted">
                      Saldo sekarang berubah otomatis mengikuti transaksi pada akun ini.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Logo Akun (Opsional)</label>
                  <div className="rounded-2xl border border-dashed border-line bg-surface-alt/10 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl border border-line bg-white flex items-center justify-center overflow-hidden shrink-0">
                        {iconUrl ? (
                          <img src={iconUrl} alt="Preview logo akun" className="w-10 h-10 object-contain" />
                        ) : (
                          <Upload className="w-5 h-5 text-text-muted" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-text-primary">Unggah icon atau logo</p>
                        <p className="text-[11px] text-text-muted">
                          Format PNG, JPG, SVG, atau WEBP. Gambar akan dikompresi otomatis.
                        </p>
                        {iconName && <p className="text-[11px] text-accent mt-1 truncate">{formatImageName(iconName)}</p>}
                      </div>
                    </div>
                    <label className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[12px] font-semibold text-text-primary hover:bg-surface-hover transition-colors cursor-pointer">
                      <Upload className="w-4 h-4" />
                      Pilih File
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </>
            )}

            {type === 'wishlist' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Target Tabungan (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formatThousands(targetAmount)}
                    onChange={(e) => setTargetAmount(parseThousands(e.target.value))}
                    className="input"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Sudah Terkumpul (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formatThousands(currentAmount)}
                    onChange={(e) => setCurrentAmount(parseThousands(e.target.value))}
                    className="input"
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            {type === 'tujuan' && (
              <div className="space-y-3">
                <label className="block text-[13px] font-medium text-text-secondary">Pilih Icon Tujuan</label>
                <div className="border border-line rounded-2xl p-4 bg-surface-alt/10 max-h-[250px] overflow-y-auto space-y-4 custom-scrollbar">
                  {PURPOSE_ICONS.map((group) => (
                    <div key={group.category} className="space-y-1.5">
                      <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{group.category}</p>
                      <div className="grid grid-cols-5 gap-2.5">
                        {group.icons.map((item) => {
                          const IconComp = item.icon;
                          const isSelected = purposeIcon === item.name;
                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => setPurposeIcon(item.name)}
                              title={item.label}
                              className={clsx(
                                "aspect-square rounded-2xl border flex items-center justify-center transition-all active:scale-90 p-2",
                                isSelected 
                                  ? "bg-accent border-accent text-bg shadow-md shadow-accent/25 ring-2 ring-accent ring-offset-2 dark:ring-offset-bg" 
                                  : clsx(getCategoryColor(item.name), "hover:scale-105")
                              )}
                            >
                              <IconComp className="w-8 h-8 shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 space-y-2.5">
              <button
                type="submit"
                disabled={isSaving}
                className="btn btn-primary w-full py-3 text-[14px] font-bold shadow-lg shadow-accent/20 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                {submitLabel}
              </button>

              {isEditMode && onDelete && (
                <>
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full px-4 py-2.5 bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[13px] font-bold active:scale-[0.98]"
                    >
                      <Trash2 className="w-4 h-4" /> Hapus {typeLabel}
                    </button>
                  ) : (
                    <div className="bg-danger/5 border border-danger/20 rounded-xl p-3.5 space-y-2.5">
                      <p className="text-[12px] text-danger font-medium text-center">
                        Yakin ingin menghapus <strong>{name}</strong>? Tindakan ini tidak dapat dibatalkan.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 px-3 py-2 bg-surface border border-line rounded-lg text-[12px] font-bold text-text-primary hover:bg-surface-hover transition-all"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="flex-1 px-3 py-2 bg-danger text-white rounded-lg text-[12px] font-bold hover:bg-danger/90 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
                        >
                          {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      <TypePicker
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedValue={accountType}
        onSelect={setAccountType}
      />
    </>,
    document.body
  );
}
