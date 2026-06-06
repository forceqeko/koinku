import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check, Wallet, Building2, Smartphone } from 'lucide-react';
import { useData } from '../context/DataContext';
import { formatThousands, parseThousands, fmt } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import clsx from 'clsx';

interface MoveSavingBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  wishlist: any; // Wishlist object
}

interface ItemPickerProps {
  isOpen: boolean;
  onClose: () => void;
  items: any[];
  onSelect: (id: string) => void;
  selectedValue: string;
  title: string;
}

function ItemPicker({ isOpen, onClose, items, onSelect, selectedValue, title }: ItemPickerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden flex flex-col max-h-[60vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-alt/20">
          <h3 className="text-[15px] font-bold text-text-primary">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {items.length === 0 ? (
            <div className="py-8 text-center text-text-muted text-[13px] font-medium">
              Tidak ada akun tersedia
            </div>
          ) : (
            items.map(item => {
              const isSelected = item.id === selectedValue;
              let Icon = Wallet;
              if (item.type === 'bank') Icon = Building2;
              if (item.type === 'ewallet') Icon = Smartphone;

              return (
                <button
                  key={item.id}
                  type="button"
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
                      <p className={clsx("text-[13px] font-bold", isSelected ? "text-accent" : "text-text-primary")}>
                        {item.name}
                      </p>
                      {item.balanceFormatted && (
                        <p className="text-[11px] text-text-muted">Saldo Tabungan: {item.balanceFormatted}</p>
                      )}
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

export default function MoveSavingBalanceModal({ isOpen, onClose, wishlist }: MoveSavingBalanceModalProps) {
  const { accounts, transactions, refresh } = useData();

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pickerMode, setPickerMode] = useState<'none' | 'from' | 'to'>('none');

  // 1. Calculate balances of this wishlist in each wallet
  const wishlistBalances = useMemo(() => {
    if (!wishlist || !transactions) return {};
    const balances: { [accountId: string]: number } = {};
    
    // Filter all transactions for this wishlist
    const wishlistTx = transactions.filter(t => t.wishlist_id === wishlist.id && !t.deleted_at);
    
    wishlistTx.forEach(t => {
      if (t.type === 'saving' && t.to_account_id) {
        balances[t.to_account_id] = (balances[t.to_account_id] || 0) + Number(t.amount);
      } else if (t.type === 'transfer') {
        if (t.to_account_id) {
          balances[t.to_account_id] = (balances[t.to_account_id] || 0) + Number(t.amount);
        }
        if (t.from_account_id) {
          balances[t.from_account_id] = (balances[t.from_account_id] || 0) - Number(t.amount);
        }
      } else if (t.type === 'expense') {
        if (t.from_account_id) {
          balances[t.from_account_id] = (balances[t.from_account_id] || 0) - Number(t.amount);
        }
      } else if (t.type === 'income') {
        if (t.to_account_id) {
          balances[t.to_account_id] = (balances[t.to_account_id] || 0) + Number(t.amount);
        }
      }
    });

    return balances;
  }, [wishlist, transactions]);

  // 2. Selectable source wallets (balance > 0)
  const sourceWallets = useMemo(() => {
    if (!accounts || !wishlistBalances) return [];
    return accounts
      .filter(acc => wishlistBalances[acc.id] > 0)
      .map(acc => ({
        ...acc,
        balanceFormatted: fmt(wishlistBalances[acc.id]),
        rawSavingBalance: wishlistBalances[acc.id]
      }));
  }, [accounts, wishlistBalances]);

  // 3. Selectable destination wallets (all active accounts except selected source wallet)
  const destinationWallets = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter(acc => acc.id !== fromAccountId);
  }, [accounts, fromAccountId]);

  // Pre-fill / reset states
  useEffect(() => {
    if (isOpen && wishlist) {
      setNotes(`Relokasi Tabungan ${wishlist.name}`);
      setAmount('');
      
      // Auto select first source wallet with balance if available
      if (sourceWallets.length > 0) {
        setFromAccountId(sourceWallets[0].id);
      } else {
        setFromAccountId('');
      }
      setToAccountId('');
    }
  }, [isOpen, wishlist, sourceWallets]);

  // Auto select first target wallet when source changes
  useEffect(() => {
    if (fromAccountId) {
      const remaining = destinationWallets.filter(w => w.id !== fromAccountId);
      if (remaining.length > 0 && !remaining.some(w => w.id === toAccountId)) {
        setToAccountId(remaining[0].id);
      }
    }
  }, [fromAccountId, destinationWallets, toAccountId]);

  const selectedSourceWallet = sourceWallets.find(w => w.id === fromAccountId);
  const selectedTargetWallet = accounts.find(w => w.id === toAccountId);

  const maxAmount = selectedSourceWallet ? selectedSourceWallet.rawSavingBalance : 0;

  if (!isOpen || !wishlist) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId) {
      toast.error('Silakan pilih dompet sumber dan tujuan');
      return;
    }

    const numAmount = Number(parseThousands(amount));
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Jumlah nominal pemindahan harus lebih dari 0');
      return;
    }

    if (numAmount > maxAmount) {
      toast.error(`Nominal tidak boleh melebihi saldo tabungan di dompet sumber (${fmt(maxAmount)})`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Build transaction payload for RPC call
      const txData = {
        date: new Date().toISOString(),
        type: 'transfer',
        description: notes || `Relokasi Tabungan ${wishlist.name}`,
        amount: numAmount,
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        wishlist_id: wishlist.id,
        admin_fee: 0
      };

      const { error } = await supabase.rpc('create_transaction_atomic', {
        payload: txData
      });

      if (error) throw error;

      toast.success('Saldo tabungan berhasil dipindahkan!');
      await refresh();
      onClose();
    } catch (err: any) {
      toast.error('Gagal memindahkan saldo: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-line rounded-2xl w-full max-w-md shadow-2xl animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line bg-surface-alt/20">
          <div>
            <h3 className="text-base font-extrabold text-text-primary">🔄 Pindahkan Saldo Tabungan</h3>
            <p className="text-[11px] text-text-muted mt-0.5">{wishlist.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {sourceWallets.length === 0 ? (
            <div className="text-center py-6 text-text-muted space-y-2 border border-dashed border-line rounded-xl bg-surface-alt/10">
              <p className="text-[13px] font-semibold">Tidak ada saldo terdeteksi</p>
              <p className="text-[11px] max-w-[280px] mx-auto text-text-muted/70">
                Tabungan ini belum memiliki saldo fisik di dompet mana pun. Silakan simpan uang terlebih dahulu melalui transaksi tabungan.
              </p>
            </div>
          ) : (
            <>
              {/* Account selectors row */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider">Dari Wallet</label>
                  <button
                    type="button"
                    onClick={() => setPickerMode('from')}
                    className="flex items-center justify-between w-full p-3 bg-surface border border-line rounded-xl text-left hover:border-accent/40 transition-colors h-[48px]"
                  >
                    {selectedSourceWallet ? (
                      <span className="text-[13px] font-bold text-text-primary truncate">{selectedSourceWallet.name}</span>
                    ) : (
                      <span className="text-[13px] text-text-muted">Pilih...</span>
                    )}
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  </button>
                  {selectedSourceWallet && (
                    <span className="block text-[10px] text-text-muted pl-1">
                      Saldo tabungan: <strong className="text-text-primary">{selectedSourceWallet.balanceFormatted}</strong>
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider">Ke Wallet</label>
                  <button
                    type="button"
                    onClick={() => setPickerMode('to')}
                    className="flex items-center justify-between w-full p-3 bg-surface border border-line rounded-xl text-left hover:border-accent/40 transition-colors h-[48px]"
                  >
                    {selectedTargetWallet ? (
                      <span className="text-[13px] font-bold text-text-primary truncate">{selectedTargetWallet.name}</span>
                    ) : (
                      <span className="text-[13px] text-text-muted">Pilih...</span>
                    )}
                    <ChevronDown className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
              </div>

              {/* Amount input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center pl-1">
                  <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider">Nominal Pemindahan</label>
                  {selectedSourceWallet && (
                    <button
                      type="button"
                      onClick={() => setAmount(formatThousands(maxAmount.toString()))}
                      className="text-[10px] text-accent hover:underline font-bold"
                    >
                      Pindahkan Semua
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-extrabold text-text-muted">Rp</span>
                  <input
                    type="text"
                    required
                    placeholder="0"
                    value={amount}
                    onChange={e => {
                      const clean = parseThousands(e.target.value);
                      if (!isNaN(Number(clean)) || clean === '') {
                        setAmount(formatThousands(clean));
                      }
                    }}
                    className="w-full bg-surface-alt/40 border border-line rounded-xl pl-11 pr-4 py-3 text-[14px] font-extrabold focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Notes Input */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider">Catatan</label>
                <input
                  type="text"
                  placeholder="Misal: Relokasi Tabungan"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full bg-surface-alt/40 border border-line rounded-xl px-4 py-2.5 text-[13px] focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-line text-[13px] font-bold text-text-secondary hover:bg-surface-hover transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !amount || !fromAccountId || !toAccountId}
                  className="flex-1 py-2.5 rounded-xl bg-accent text-[13px] font-bold text-white hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? 'Memproses...' : 'Pindahkan'}
                </button>
              </div>
            </>
          )}
        </form>

        {/* Item Pickers */}
        <ItemPicker
          isOpen={pickerMode === 'from'}
          onClose={() => setPickerMode('none')}
          items={sourceWallets}
          selectedValue={fromAccountId}
          onSelect={setFromAccountId}
          title="Pilih Dompet Asal"
        />

        <ItemPicker
          isOpen={pickerMode === 'to'}
          onClose={() => setPickerMode('none')}
          items={destinationWallets}
          selectedValue={toAccountId}
          onSelect={setToAccountId}
          title="Pilih Dompet Tujuan"
        />
      </div>
    </div>,
    document.body
  );
}
