import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import {
  PiggyBank,
  Plus,
  CheckSquare,
  Archive,
  Bell,
  Eye,
  EyeSlash
} from '@phosphor-icons/react';
import { fmt } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';
import clsx from 'clsx';

export default function TabunganPage() {
  const { wishlists, refresh } = useData();
  const navigate = useNavigate();
  const [wishlistMenuId, setWishlistMenuId] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(() => {
    const saved = localStorage.getItem('showBalance');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleBalance = () => {
    const newValue = !showBalance;
    setShowBalance(newValue);
    localStorage.setItem('showBalance', JSON.stringify(newValue));
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setWishlistMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    wishlists.forEach(w => {
      const percent = (Number(w.current_amount) / Number(w.target_amount)) * 100;
      if (percent >= 100) {
        const storageKey = `wishlist_notified_${w.id}`;
        if (!localStorage.getItem(storageKey)) {
          toast.success(`🎉 Selamat! Target tabungan "${w.name}" sudah tercapai!`);
          localStorage.setItem(storageKey, 'true');
        }
      }
    });
  }, [wishlists]);

  const handleCompleteWishlist = async (wishlist: typeof wishlists[0]) => {
    try {
      await supabase.from('wishlists').update({ current_amount: wishlist.target_amount }).eq('id', wishlist.id);
      toast.success(`${wishlist.name} telah ditandai selesai!`);
      setWishlistMenuId(null);
      refresh();
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    }
  };

  const handleArchiveWishlist = async (wishlist: typeof wishlists[0]) => {
    try {
      const storageKey = `wishlist_archived_${wishlist.id}`;
      localStorage.setItem(storageKey, 'true');
      toast.info(`${wishlist.name} diarsipkan. Target tercapai akan disimpan.`);
      setWishlistMenuId(null);
      refresh();
    } catch (err: any) {
      toast.error('Gagal: ' + err.message);
    }
  };

  // Filter out archived wishlists if there are any
  const activeWishlists = wishlists.filter(w => {
    const isArchived = localStorage.getItem(`wishlist_archived_${w.id}`) === 'true';
    return !isArchived;
  });

  const totalSaved = wishlists.reduce((acc, curr) => acc + Number(curr.current_amount), 0);
  const totalTarget = wishlists.reduce((acc, curr) => acc + Number(curr.target_amount), 0);
  const totalProgressPercent = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Target Tabungan Progress Summary */}
      <div className="card p-6 border-line bg-surface shadow-sm relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
        <div className="absolute left-1/4 bottom-0 w-24 h-24 bg-accent/5 rounded-full blur-xl -mb-6"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] md:text-[11px] font-bold tracking-wider text-text-muted uppercase">Total Dana Terkumpul</span>
            <button
              onClick={toggleBalance}
              className="p-1.5 rounded-full bg-surface-alt/50 hover:bg-surface-alt transition-all"
              aria-label={showBalance ? "Sembunyikan saldo" : "Tampilkan saldo"}
            >
              {showBalance ? <EyeSlash size={16} className="text-text-muted" /> : <Eye size={16} className="text-text-muted" />}
            </button>
          </div>

          <div className="flex justify-between items-end">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-primary">
              {showBalance ? fmt(totalSaved) : '••••••'}
            </h2>
            <span className="text-[11px] font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
              {totalProgressPercent.toFixed(0)}% dari target
            </span>
          </div>

          <div className="space-y-1.5 pt-2">
            <div className="bg-surface-alt rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, totalProgressPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-text-muted font-semibold">
              <span>Target Total: {showBalance ? fmt(totalTarget) : '••••'}</span>
              <span>{activeWishlists.length} Tabungan Aktif</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Wishlists */}
      <div className="card p-5 shadow-sm border-line bg-surface space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-bold text-[15px] text-text-primary flex items-center gap-2">
            <PiggyBank size={18} weight="duotone" className="text-accent" /> Tabungan Anda
          </h3>
          <button
            onClick={() => navigate('/settings')}
            className="text-[12px] font-bold text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
          >
            <Plus size={14} weight="bold" /> Tambah Tabungan
          </button>
        </div>

        {activeWishlists.length === 0 ? (
          <div className="text-center py-10 text-text-muted space-y-2">
            <PiggyBank size={32} className="text-text-muted/45 mx-auto" />
            <p className="text-[13px] font-medium">Belum ada tabungan aktif</p>
            <button
              onClick={() => navigate('/settings')}
              className="text-[12px] text-accent font-bold hover:underline"
            >
              Tambah target baru di Pengaturan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" ref={menuRef}>
            {activeWishlists.map(w => {
              const target = Number(w.target_amount) || 1;
              const saved = Number(w.current_amount) || 0;
              const percentRaw = (saved / target) * 100;
              const progressObj = Math.min(100, Math.max(0, percentRaw));
              const isComplete = percentRaw >= 100;

              return (
                <div
                  key={w.id}
                  className="bg-surface-alt/20 border border-line p-4 rounded-2xl shadow-sm hover:border-accent/40 hover:shadow-md transition-all flex flex-col justify-between min-h-[130px] group relative"
                >
                  {isComplete && (
                    <div className="absolute top-3 right-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWishlistMenuId(wishlistMenuId === w.id ? null : w.id);
                        }}
                        className="w-7 h-7 rounded-full bg-success/10 hover:bg-success/20 flex items-center justify-center transition-colors"
                      >
                        <Bell size={14} className="text-success" />
                      </button>
                      {wishlistMenuId === w.id && (
                        <div className="absolute right-0 top-9 w-36 bg-surface border border-line rounded-xl shadow-xl z-20 overflow-hidden animate-scale-in">
                          <button
                            onClick={() => handleCompleteWishlist(w)}
                            className="w-full px-3 py-2.5 text-left text-[12px] font-medium hover:bg-surface-hover flex items-center gap-2 text-text-primary"
                          >
                            <CheckSquare size={16} className="text-success" /> Selesaikan
                          </button>
                          <button
                            onClick={() => handleArchiveWishlist(w)}
                            className="w-full px-3 py-2.5 text-left text-[12px] font-medium hover:bg-surface-hover flex items-center gap-2 text-text-primary border-t border-line"
                          >
                            <Archive size={16} className="text-text-muted" /> Arsipkan
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-lg bg-surface border border-line flex items-center justify-center shrink-0">
                        <PiggyBank size={14} className={clsx("transition-transform", isComplete ? "text-success" : "text-accent group-hover:scale-110")} />
                      </div>
                      <span className={clsx("font-bold text-[12px] truncate", isComplete ? "text-success" : "text-text-primary")}>
                        {w.name}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-text-muted font-medium mb-1 truncate">
                        Terkumpul:{' '}
                        <span className={clsx("font-bold", isComplete ? "text-success" : "text-text-primary")}>
                          {showBalance ? fmt(saved) : '••••'}
                        </span>
                      </p>
                      <div className="flex justify-between items-end">
                        <p className="text-[10px] text-text-muted">Target: {showBalance ? fmt(target) : '••••'}</p>
                        <span className={clsx("text-[11px] font-bold", isComplete ? "text-success" : "text-accent")}>
                          {percentRaw.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                      <div
                        className={clsx("h-full rounded-full transition-all duration-700 ease-out", isComplete ? "bg-success" : "bg-accent")}
                        style={{ width: `${progressObj}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Quick add card redirecting to settings */}
            <button
              onClick={() => navigate('/settings')}
              className="bg-surface-alt/5 flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-line hover:border-accent/50 hover:bg-accent/5 transition-all cursor-pointer group min-h-[130px]"
            >
              <div className="w-8 h-8 rounded-full bg-surface border border-line flex items-center justify-center mb-2 group-hover:bg-accent group-hover:border-accent transition-all">
                <Plus size={16} className="text-text-muted group-hover:text-white transition-colors" />
              </div>
              <span className="font-bold text-[11px] text-text-muted group-hover:text-accent transition-colors">
                Tambah Baru
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
