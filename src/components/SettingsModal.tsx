import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';

type SettingTab = 'akun' | 'sumber' | 'kategori' | 'tujuan' | 'wishlist' | 'tagihan';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: SettingTab;
  onSave: (data: any, isEdit: boolean) => void;
  onDelete?: (id: string) => void;
  initialData?: any;
}

export default function SettingsModal({ isOpen, onClose, type, onSave, onDelete, initialData }: SettingsModalProps) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [accountType, setAccountType] = useState('bank');
  const [iconUrl, setIconUrl] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!initialData;

  useEffect(() => {
    if (isOpen) {
      setShowDeleteConfirm(false);
      if (initialData) {
        setName(initialData.name || '');
        setBalance(initialData.balance !== undefined ? String(initialData.balance) : '');
        setAccountType(initialData.type || 'bank');
        setIconUrl(initialData.icon_url || initialData.iconUrl || '');
        setTargetAmount(initialData.targetAmount !== undefined ? String(initialData.targetAmount) : '');
        setCurrentAmount(initialData.currentAmount !== undefined ? String(initialData.currentAmount) : '');
      } else {
        setName('');
        setBalance('');
        setAccountType('bank');
        setIconUrl('');
        setTargetAmount('');
        setCurrentAmount('');
      }
    }
  }, [isOpen, initialData]);

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
    if (file) {
      const compressedDataUrl = await compressImage(file);
      setIconUrl(compressedDataUrl);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!initialData;
    const id = isEdit ? initialData.id : `new_${Date.now()}`;
    let newData: any = { id, name };

    if (type === 'akun') {
      newData = { ...newData, balance: Number(balance), type: accountType };
      if (iconUrl) newData.iconUrl = iconUrl;
    } else if (type === 'wishlist') {
      newData = { ...newData, targetAmount: Number(targetAmount), currentAmount: Number(currentAmount) };
    }

    onSave(newData, isEdit);
    onClose();
  };

  const handleDelete = () => {
    if (!onDelete || !initialData) return;
    onDelete(initialData.id);
    onClose();
  };

  const typeLabel = type === 'akun' ? 'Akun' : type === 'sumber' ? 'Sumber Penghasilan' : type === 'kategori' ? 'Kategori' : type === 'tujuan' ? 'Tujuan' : type === 'wishlist' ? 'Tabungan' : 'Tagihan';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-sm overflow-hidden animate-scale-in shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-alt/10">
          <h2 className="text-[15px] font-bold text-text-primary">
            {isEditMode ? 'Edit' : 'Tambah'} {typeLabel}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all"><X className="w-5 h-5" /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Nama</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Masukkan nama..." />
          </div>

          {type === 'akun' && (
            <>
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Jenis Akun</label>
                <select className="input" value={accountType} onChange={e => setAccountType(e.target.value)}>
                  <option value="bank">Bank</option>
                  <option value="ewallet">E-Wallet</option>
                  <option value="cash">Cash</option>
                  <option value="investasi">Investasi</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Saldo Awal (Rp)</label>
                <input type="number" required min="0" value={balance} onChange={e => setBalance(e.target.value)} className="input" placeholder="0" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Unggah Icon / Logo (Opsional)</label>
                <div className="flex items-center gap-3">
                  {iconUrl && <img src={iconUrl} alt="Preview" className="w-10 h-10 rounded-md object-cover border border-line bg-bg flex-shrink-0" />}
                  <input type="file" accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp" onChange={handleFileChange} className="input p-1.5 text-[12px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[11px] file:font-medium file:bg-surface-hover file:text-text-primary hover:file:bg-surface-alt cursor-pointer" />
                </div>
              </div>
            </>
          )}

          {type === 'wishlist' && (
            <>
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Target Tabungan (Rp)</label>
                <input type="number" required min="1" value={targetAmount} onChange={e => setTargetAmount(e.target.value)} className="input" placeholder="0" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Sudah Terkumpul (Rp)</label>
                <input type="number" required min="0" value={currentAmount} onChange={e => setCurrentAmount(e.target.value)} className="input" placeholder="0" />
              </div>
            </>
          )}

          <div className="pt-2 space-y-2.5">
            <button type="submit" className="btn btn-primary w-full py-3 text-[14px] font-bold shadow-lg shadow-accent/20 transition-all active:scale-[0.98]">
              {isEditMode ? 'Perbarui' : 'Simpan'}
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
                        className="flex-1 px-3 py-2 bg-danger text-white rounded-lg text-[12px] font-bold hover:bg-danger/90 transition-all active:scale-[0.98]"
                      >
                        Ya, Hapus
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
  );
}
