import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check, Building2, Smartphone, Wallet, Trash2, Search } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatThousands, parseThousands } from '../lib/utils';
import clsx from 'clsx';
import { getPurposeIcon, getCategoryColor } from '../lib/icons';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (tx: any) => void;
  onEdit?: (id: string, tx: any) => void;
  onDelete?: (tx: any) => void;
  type: 'income' | 'expense' | 'saving' | 'transfer' | 'bill';
  initialData?: any;
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-alt/20">
          <h3 className="text-[15px] font-bold text-text-primary">{title}</h3>
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
              let Icon: any = Wallet;
              if (item.type === 'bank') Icon = Building2;
              if (item.type === 'ewallet') Icon = Smartphone;
              if (item.icon) Icon = getPurposeIcon(item.icon);

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
                    <div className={clsx(
                       "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm group-hover:scale-105 transition-transform overflow-hidden",
                       item.icon ? getCategoryColor(item.icon) : "bg-white border-line text-text-muted"
                     )}>
                       {item.icon_url ? (
                         <img src={item.icon_url} alt={item.name} className="w-7 h-7 object-contain" />
                       ) : (
                         <Icon className="w-5 h-5" />
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

function ItemTrigger({ items, value, onClick, label, placeholder = "Pilih..." }: { items: any[], value: string, onClick: () => void, label: string, placeholder?: string }) {
  const selected = items.find(a => a.id === value);
  let SelectedIcon: any = Wallet;
  if (selected?.type === 'bank') SelectedIcon = Building2;
  if (selected?.type === 'ewallet') SelectedIcon = Smartphone;
  if (selected?.icon) SelectedIcon = getPurposeIcon(selected.icon);

  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-medium text-text-secondary">{label}</label>
      <button 
        type="button" 
        onClick={onClick} 
        className="input flex items-center justify-between w-full hover:border-accent/40 bg-surface text-left group transition-all h-[46px]"
      >
        {selected ? (
          <div className="flex items-center gap-2.5">
             <div className={clsx(
               "w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden shrink-0 border",
               selected.icon ? getCategoryColor(selected.icon) : "bg-white border-line text-text-muted"
             )}>
               {selected.icon_url ? (
                  <img src={selected.icon_url} alt={selected.name} className="w-5 h-5 object-contain" />
               ) : (
                  <SelectedIcon className="w-4 h-4" />
               )}
             </div>
            <span className="font-semibold text-text-primary text-[13px]">{selected.name}</span>
          </div>
        ) : (
          <span className="text-text-muted">{placeholder}</span>
        )}
        <ChevronDown className="w-4 h-4 text-text-muted group-hover:text-accent group-hover:translate-y-0.5 transition-all" />
      </button>
    </div>
  );
}

export default function TransactionModal({ isOpen, onClose, onAdd, onEdit, onDelete, type, initialData }: TransactionModalProps) {
  const { accounts, categories, sources, wishlists, transactions, purposes, billPurposes } = useData();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [adminFee, setAdminFee] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [expenseCategoryId, setExpenseCategoryId] = useState('');
  const [expensePurposeId, setExpensePurposeId] = useState('');
  const [incomeSourceId, setIncomeSourceId] = useState('');
  const [wishlistId, setWishlistId] = useState('');
  const [billPurposeId, setBillPurposeId] = useState('');
  const [linkedWishlistId, setLinkedWishlistId] = useState('');

  const [pickerMode, setPickerMode] = useState<'none' | 'from' | 'to' | 'category' | 'source' | 'wishlist' | 'purpose' | 'billpurpose' | 'linkedwishlist'>('none');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditMode = !!initialData;

  const getAvailableWishlistsForAccount = (accountId: string) => {
    if (!accountId) return [];
    const activeWishlists = wishlists.filter(w => !w.is_closed);
    return activeWishlists.filter(w => {
      if (initialData && initialData.wishlist_id === w.id) {
        return true;
      }
      let balance = 0;
      const wishlistTx = (transactions || []).filter(t => t.wishlist_id === w.id && !t.deleted_at);
      wishlistTx.forEach(t => {
        if (initialData && t.id === initialData.id) {
          return;
        }
        const amt = Number(t.amount);
        if (t.type === 'saving' && t.to_account_id === accountId) {
          balance += amt;
        } else if (t.type === 'transfer') {
          if (t.to_account_id === accountId) {
            balance += amt;
          }
          if (t.from_account_id === accountId) {
            balance -= amt;
          }
        } else if (t.type === 'expense' && t.from_account_id === accountId) {
          balance -= amt;
        } else if (t.type === 'income' && t.to_account_id === accountId) {
          balance += amt;
        }
      });
      return balance > 0;
    });
  };

  // Pre-fill form when opening
  useEffect(() => {
    if (isOpen) {
      setShowDeleteConfirm(false);
      if (initialData) {
        setDescription(initialData.description || '');
        setAmount(initialData.amount !== undefined ? String(initialData.amount) : '');
        setAdminFee(initialData.admin_fee ? String(initialData.admin_fee) : '');
        setDate(initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        setFromAccountId(initialData.from_account_id || accounts[0]?.id || '');
        setToAccountId(initialData.to_account_id || accounts[0]?.id || '');
        setExpenseCategoryId(initialData.category_id || categories[0]?.id || '');
        setExpensePurposeId(initialData.purpose_id || purposes[0]?.id || '');
        setIncomeSourceId(initialData.source_id || sources[0]?.id || '');
        setWishlistId(initialData.wishlist_id || wishlists[0]?.id || '');
        setBillPurposeId(initialData.bill_purpose_id || billPurposes[0]?.id || '');
        setLinkedWishlistId(initialData.wishlist_id || '');
      } else {
        setDescription('');
        setAmount('');
        setAdminFee('');
        setDate(new Date().toISOString().split('T')[0]);
        setFromAccountId(accounts[0]?.id || '');
        setToAccountId(accounts[0]?.id || '');
        setExpenseCategoryId(categories[0]?.id || '');
        setExpensePurposeId(purposes[0]?.id || '');
        setIncomeSourceId(sources[0]?.id || '');
        setWishlistId(wishlists[0]?.id || '');
        setBillPurposeId(billPurposes[0]?.id || '');
        setLinkedWishlistId('');
      }
    }
  }, [isOpen, initialData, accounts, categories, sources, wishlists, transactions, purposes, billPurposes]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const txData: any = {
      date: new Date(date).toISOString(),
      type,
      description,
      amount: Number(parseThousands(amount)),
    };

    if (type === 'income') {
      txData.to_account_id = toAccountId;
      txData.source_id = incomeSourceId;
    } else if (type === 'expense') {
      txData.from_account_id = fromAccountId;
      txData.category_id = expenseCategoryId;
      txData.purpose_id = expensePurposeId;
      txData.wishlist_id = linkedWishlistId || null;
    } else if (type === 'transfer') {
      txData.from_account_id = fromAccountId;
      txData.to_account_id = toAccountId;
      txData.admin_fee = adminFee ? Number(parseThousands(adminFee)) : 0;
      txData.wishlist_id = linkedWishlistId || null;
    } else if (type === 'saving') {
      txData.from_account_id = fromAccountId;
      txData.to_account_id = toAccountId;
      txData.wishlist_id = wishlistId;
      txData.admin_fee = adminFee ? Number(parseThousands(adminFee)) : 0;
    } else if (type === 'bill') {
      txData.from_account_id = fromAccountId;
      txData.bill_purpose_id = billPurposeId;
    }

    if (isEditMode && onEdit) {
      onEdit(initialData.id, txData);
    } else {
      onAdd(txData);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!onDelete || !initialData) return;
    onDelete(initialData);
    onClose();
  };

  const typeLabel = type === 'income' ? 'Pemasukan' : type === 'expense' ? 'Pengeluaran' : type === 'saving' ? 'Tabungan' : type === 'transfer' ? 'Transfer' : 'Tagihan';

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden animate-scale-in shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-alt/10">
            <h2 className="text-[15px] font-bold text-text-primary">
              {isEditMode ? 'Edit' : 'Tambah'} {typeLabel}
            </h2>
            <button onClick={onClose} aria-label="Tutup modal" className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all"><X className="w-5 h-5" /></button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar">

            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Deskripsi Transaksi</label>
              <input type="text" required value={description} onChange={e => setDescription(e.target.value)} className="input" placeholder="Makan Siang / Gaji" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Jumlah (Rp)</label>
                <input type="text" inputMode="numeric" required value={formatThousands(amount)} onChange={e => setAmount(parseThousands(e.target.value))} className="input" placeholder="50.000" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Tanggal</label>
                <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="input" />
              </div>
            </div>

            {(type === 'expense' || type === 'transfer' || type === 'saving' || type === 'bill') && (
              <ItemTrigger 
                label={type === 'saving' ? 'Akun (Keluar)' : 'Dari Akun'}
                items={accounts} 
                value={fromAccountId} 
                onClick={() => setPickerMode('from')} 
              />
            )}

            {type === 'bill' && (
              <ItemTrigger 
                label="Tujuan Tagihan"
                items={billPurposes}
                value={billPurposeId}
                onClick={() => setPickerMode('billpurpose')}
                placeholder="Pilih Tujuan Tagihan"
              />
            )}

            {(type === 'transfer' || type === 'saving') && (
              <div>
                <label className="block text-[13px] font-medium text-text-secondary mb-1.5">{type === 'saving' ? 'Admin (Keluar)' : 'Biaya Admin'} (Opsional)</label>
                <input type="text" inputMode="numeric" value={formatThousands(adminFee)} onChange={e => setAdminFee(parseThousands(e.target.value))} className="input" placeholder="0 (Misal: 2.500)" />
              </div>
            )}

            {(type === 'income' || type === 'transfer' || type === 'saving') && (
              <ItemTrigger 
                label={type === 'saving' ? 'Akun (Masuk)' : 'Ke Akun'}
                items={accounts} 
                value={toAccountId} 
                onClick={() => setPickerMode('to')} 
              />
            )}

            {type === 'transfer' && (
              <ItemTrigger 
                label="Tabungan Terkait (Opsional)"
                items={wishlists}
                value={linkedWishlistId}
                onClick={() => setPickerMode('linkedwishlist')}
                placeholder="Pilih tabungan (opsional)"
              />
            )}

            {type === 'expense' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <ItemTrigger 
                    label="Kategori"
                    items={categories}
                    value={expenseCategoryId}
                    onClick={() => setPickerMode('category')}
                    placeholder="Pilih Kategori"
                  />
                  <ItemTrigger 
                    label="Tujuan"
                    items={purposes}
                    value={expensePurposeId}
                    onClick={() => setPickerMode('purpose')}
                    placeholder="Pilih Tujuan"
                  />
                </div>
                <ItemTrigger 
                  label="Tabungan Terkait (Opsional)"
                  items={wishlists}
                  value={linkedWishlistId}
                  onClick={() => setPickerMode('linkedwishlist')}
                  placeholder="Pilih tabungan (opsional)"
                />
              </>
            )}
            
            {type === 'income' && (
              <ItemTrigger 
                label="Sumber Pemasukan"
                items={sources}
                value={incomeSourceId}
                onClick={() => setPickerMode('source')}
                placeholder="Pilih Sumber"
              />
            )}

            {type === 'saving' && (
              <ItemTrigger 
                label="Tabungan Tujuan (Wishlist)"
                items={wishlists}
                value={wishlistId}
                onClick={() => setPickerMode('wishlist')}
                placeholder="Pilih Wishlist"
              />
            )}

            <div className="pt-2 space-y-2.5">
              <button type="submit" className="btn btn-primary w-full py-3 text-[14px] font-bold shadow-lg shadow-accent/20 transition-all active:scale-[0.98]">
                {isEditMode ? 'Perbarui Transaksi' : 'Simpan Transaksi'}
              </button>

              {isEditMode && onDelete && (
                <>
                  {!showDeleteConfirm ? (
                    <button type="button" onClick={() => setShowDeleteConfirm(true)} className="w-full px-4 py-2.5 bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20 rounded-xl transition-all flex items-center justify-center gap-1.5 text-[13px] font-bold active:scale-[0.98]">
                      <Trash2 className="w-4 h-4" /> Hapus Transaksi
                    </button>
                  ) : (
                    <div className="bg-danger/5 border border-danger/20 rounded-xl p-3.5 space-y-2.5">
                      <p className="text-[12px] text-danger font-medium text-center">
                        Yakin hapus transaksi ini? Saldo akun terkait akan dikembalikan.
                      </p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-3 py-2 bg-surface border border-line rounded-lg text-[12px] font-bold text-text-primary hover:bg-surface-hover transition-all">Batal</button>
                        <button type="button" onClick={handleDelete} className="flex-1 px-3 py-2 bg-danger text-white rounded-lg text-[12px] font-bold hover:bg-danger/90 transition-all active:scale-[0.98]">Ya, Hapus</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </form>
        </div>
      </div>

      <ItemPicker 
        isOpen={pickerMode !== 'none'}
        onClose={() => setPickerMode('none')}
        title={
          pickerMode === 'from' ? (type === 'saving' ? 'Pilih Akun Sumber' : 'Pilih Akun Pengirim') :
          pickerMode === 'to' ? 'Pilih Akun Penerima' :
          pickerMode === 'category' ? 'Pilih Kategori' :
          pickerMode === 'purpose' ? 'Pilih Tujuan Pengeluaran' :
          pickerMode === 'source' ? 'Pilih Sumber Pemasukan' :
          pickerMode === 'billpurpose' ? 'Pilih Tujuan Tagihan' :
          pickerMode === 'linkedwishlist' ? 'Pilih Tabungan Terkait' :
          'Pilih Wishlist'
        }
        items={
          pickerMode === 'from' || pickerMode === 'to' ? accounts :
          pickerMode === 'category' ? categories :
          pickerMode === 'purpose' ? purposes :
          pickerMode === 'source' ? sources :
          pickerMode === 'billpurpose' ? billPurposes :
          pickerMode === 'linkedwishlist' ? [
            { id: '', name: 'Tidak Ada (Bukan Tabungan)' },
            ...getAvailableWishlistsForAccount(fromAccountId)
          ] :
          wishlists
        }
        selectedValue={
          pickerMode === 'from' ? fromAccountId :
          pickerMode === 'to' ? toAccountId :
          pickerMode === 'category' ? expenseCategoryId :
          pickerMode === 'purpose' ? expensePurposeId :
          pickerMode === 'source' ? incomeSourceId :
          pickerMode === 'billpurpose' ? billPurposeId :
          pickerMode === 'linkedwishlist' ? linkedWishlistId :
          wishlistId
        }
        onSelect={(id) => {
          if (pickerMode === 'from') {
            setFromAccountId(id);
            setLinkedWishlistId('');
          }
          else if (pickerMode === 'to') setToAccountId(id);
          else if (pickerMode === 'category') setExpenseCategoryId(id);
          else if (pickerMode === 'purpose') setExpensePurposeId(id);
          else if (pickerMode === 'source') setIncomeSourceId(id);
          else if (pickerMode === 'billpurpose') setBillPurposeId(id);
          else if (pickerMode === 'linkedwishlist') setLinkedWishlistId(id);
          else setWishlistId(id);
        }}
        placeholder={
          pickerMode === 'from' || pickerMode === 'to' ? "Cari nama akun..." :
          pickerMode === 'category' ? "Cari kategori..." :
          pickerMode === 'purpose' ? "Cari tujuan..." :
          pickerMode === 'source' ? "Cari sumber..." :
          pickerMode === 'billpurpose' ? "Cari tagihan..." :
          pickerMode === 'linkedwishlist' ? "Cari tabungan..." :
          "Cari wishlist..."
        }
      />
    </>,
    document.body
  );
}
