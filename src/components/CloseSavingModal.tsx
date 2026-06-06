import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Check, Wallet, Building2, Smartphone, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { fmt } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import clsx from 'clsx';

interface CloseSavingModalProps {
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

export default function CloseSavingModal({ isOpen, onClose, wishlist }: CloseSavingModalProps) {
  const { accounts, transactions, portfolios, portfolioWishlists, refresh } = useData();

  const [closeOption, setCloseOption] = useState<'transfer' | 'keep'>('keep');
  const [toAccountId, setToAccountId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // 1. Calculate balances of this wishlist in each wallet
  const wishlistBalances = useMemo(() => {
    if (!wishlist || !transactions) return {};
    const balances: { [accountId: string]: number } = {};
    
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

  // Total amount saved right now
  const totalSaved = useMemo(() => {
    return Object.values(wishlistBalances).reduce((sum, val) => sum + val, 0);
  }, [wishlistBalances]);

  // Accounts that hold any portion of the savings balance
  const activeHoldingAccounts = useMemo(() => {
    if (!accounts || !wishlistBalances) return [];
    return accounts
      .filter(acc => wishlistBalances[acc.id] > 0)
      .map(acc => ({
        ...acc,
        balanceFormatted: fmt(wishlistBalances[acc.id]),
        balance: wishlistBalances[acc.id]
      }));
  }, [accounts, wishlistBalances]);

  // Destination accounts for option A (all active accounts)
  const destinationAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts;
  }, [accounts]);

  // Check if linked to any active investment portfolio
  const isLinkedToActiveInvestment = useMemo(() => {
    if (!wishlist || !portfolioWishlists || !portfolios) return false;
    const linkedPortfolioIds = portfolioWishlists
      .filter(pw => pw.wishlist_id === wishlist.id)
      .map(pw => pw.portfolio_id);
    return portfolios.some(p => linkedPortfolioIds.includes(p.id) && p.is_active);
  }, [wishlist, portfolioWishlists, portfolios]);

  // Reset state on open
  useEffect(() => {
    if (isOpen && wishlist) {
      setCloseOption('keep');
      setToAccountId('');
      
      // Auto-select first target account that doesn't have savings, or just the first available
      if (destinationAccounts.length > 0) {
        // Try to select a wallet that doesn't currently hold this saving, just for UI convenience
        const nonHolding = destinationAccounts.filter(acc => !wishlistBalances[acc.id] || wishlistBalances[acc.id] <= 0);
        if (nonHolding.length > 0) {
          setToAccountId(nonHolding[0].id);
        } else {
          setToAccountId(destinationAccounts[0].id);
        }
      }
    }
  }, [isOpen, wishlist, destinationAccounts, wishlistBalances]);

  const selectedTargetWallet = accounts.find(w => w.id === toAccountId);

  if (!isOpen || !wishlist) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (closeOption === 'transfer' && !toAccountId) {
      toast.error('Silakan pilih dompet tujuan pemindahan saldo');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. If Option A, transfer balances from each holding account to the destination account
      if (closeOption === 'transfer' && totalSaved > 0) {
        for (const acc of activeHoldingAccounts) {
          if (acc.balance > 0 && acc.id !== toAccountId) {
            const txData = {
              date: new Date().toISOString(),
              type: 'transfer',
              description: `Relokasi Penutupan Tabungan ${wishlist.name}`,
              amount: acc.balance,
              from_account_id: acc.id,
              to_account_id: toAccountId,
              wishlist_id: wishlist.id,
              admin_fee: 0
            };

            const { error: txErr } = await supabase.rpc('create_transaction_atomic', {
              payload: txData
            });

            if (txErr) throw txErr;
          }
        }
      }

      // 2. Set wishlist to closed in DB
      const { error: updateErr } = await supabase
        .from('wishlists')
        .update({
          is_closed: true,
          closed_at: new Date().toISOString()
        })
        .eq('id', wishlist.id);

      if (updateErr) throw updateErr;

      toast.success(`Tabungan "${wishlist.name}" berhasil ditutup!`);
      await refresh();
      onClose();
    } catch (err: any) {
      toast.error('Gagal menutup tabungan: ' + err.message);
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
            <h3 className="text-base font-extrabold text-text-primary">🏁 Tutup Tabungan</h3>
            <p className="text-[11px] text-text-muted mt-0.5">{wishlist.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Summary / Stats */}
          <div className="bg-surface-alt/40 border border-line rounded-xl p-4 space-y-2.5">
            <div className="flex justify-between text-[11px] text-text-secondary font-medium">
              <span>Dana Terkumpul:</span>
              <span className="font-bold text-text-primary">{fmt(totalSaved)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-text-secondary font-medium border-t border-line/40 pt-2">
              <span>Target:</span>
              <span className="font-semibold">{fmt(wishlist.target_amount)}</span>
            </div>
            {activeHoldingAccounts.length > 0 && (
              <div className="border-t border-line/40 pt-2 text-[10px] text-text-muted space-y-1">
                <p className="font-bold text-[10px] text-text-secondary uppercase">Lokasi Dana Fisik:</p>
                <div className="grid grid-cols-2 gap-1.5 pl-1.5">
                  {activeHoldingAccounts.map(acc => (
                    <span key={acc.id} className="truncate">• {acc.name}: <strong>{acc.balanceFormatted}</strong></span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Investment Alert */}
          {isLinkedToActiveInvestment && (
            <div className="bg-warning/10 border border-warning/20 text-warning rounded-xl p-3 flex gap-2.5 items-start">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold uppercase tracking-wider">Tabungan Terhubung Investasi</p>
                <p className="text-[10px] leading-relaxed opacity-90">
                  Tabungan ini sedang terhubung dengan investasi aktif. Menutup tabungan tidak akan menutup investasi Anda, tetapi penutupan saldo ini akan memperbarui tujuan dana wallet jika investasi dilikuidasi di masa depan.
                </p>
              </div>
            </div>
          )}

          {/* Option Selection */}
          <div className="space-y-2">
            <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider">Pilih Opsi Penutupan</label>
            
            <div className="space-y-2">
              {/* Option: Keep */}
              <label className={clsx(
                "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:bg-surface-hover",
                closeOption === 'keep' ? "border-accent bg-accent/5" : "border-line bg-surface"
              )}>
                <input
                  type="radio"
                  name="closeOption"
                  value="keep"
                  checked={closeOption === 'keep'}
                  onChange={() => setCloseOption('keep')}
                  className="mt-1 h-4 w-4 text-accent border-line focus:ring-accent accent-accent"
                />
                <div className="space-y-0.5">
                  <span className="text-[12px] font-bold text-text-primary block">Opsi A: Tutup Tanpa Memindahkan Saldo</span>
                  <span className="text-[10px] text-text-muted leading-tight block">
                    Saldo tabungan akan tetap disimpan di dompet fisiknya saat ini. Hanya status tabungan yang akan diubah menjadi "Ditutup".
                  </span>
                </div>
              </label>

              {/* Option: Transfer */}
              <label className={clsx(
                "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:bg-surface-hover",
                closeOption === 'transfer' ? "border-accent bg-accent/5" : "border-line bg-surface"
              )}>
                <input
                  type="radio"
                  name="closeOption"
                  value="transfer"
                  checked={closeOption === 'transfer'}
                  onChange={() => setCloseOption('transfer')}
                  className="mt-1 h-4 w-4 text-accent border-line focus:ring-accent accent-accent"
                />
                <div className="space-y-0.5">
                  <span className="text-[12px] font-bold text-text-primary block">Opsi B: Tutup & Pindahkan Saldo</span>
                  <span className="text-[10px] text-text-muted leading-tight block">
                    Seluruh saldo tabungan akan dipindahkan secara otomatis ke dompet pilihan Anda di bawah ini melalui transaksi transfer relokasi.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Target wallet picker for option B */}
          {closeOption === 'transfer' && totalSaved > 0 && (
            <div className="space-y-1.5 animate-slide-down">
              <label className="block text-[12px] font-bold text-text-secondary uppercase tracking-wider">Dompet Penerima Saldo</label>
              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
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
          )}

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
              disabled={isSubmitting || (closeOption === 'transfer' && totalSaved > 0 && !toAccountId)}
              className="flex-1 py-2.5 rounded-xl bg-error text-[13px] font-bold text-white hover:bg-error-hover disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Memproses...' : 'Tutup Tabungan'}
            </button>
          </div>
        </form>

        {/* Item Picker */}
        <ItemPicker
          isOpen={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          items={destinationAccounts}
          selectedValue={toAccountId}
          onSelect={setToAccountId}
          title="Pilih Dompet Penerima"
        />
      </div>
    </div>,
    document.body
  );
}
