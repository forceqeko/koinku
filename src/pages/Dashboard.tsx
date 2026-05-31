import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ArrowDownLeft, ArrowUpRight, Wallet, PiggyBank, Plus, Building2, Smartphone, CheckCircle, Archive, Bell, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { useState, useEffect, useRef } from 'react';
import { fmt } from '../lib/utils';

export default function Dashboard() {
  const { accounts, wishlists, transactions, refresh } = useData();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wishlistMenuId, setWishlistMenuId] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(() => {
    // Load from localStorage, default to true
    const saved = localStorage.getItem('showBalance');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Toggle balance visibility
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

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const totalBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance), 0);
  
  const currentMonthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const income = currentMonthTx
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  // Admin fee on transfer/saving is a real outflow from the source account,
  // so it must count toward monthly expense. No separate "expense" row is
  // created for fees anymore; we derive it from the parent row's field.
  const expense = currentMonthTx.reduce((acc, t) => {
    if (t.type === 'expense' || t.type === 'bill') return acc + Number(t.amount);
    if ((t.type === 'transfer' || t.type === 'saving') && t.admin_fee) {
      return acc + Number(t.admin_fee);
    }
    return acc;
  }, 0);

  const saving = currentMonthTx
    .filter(t => t.type === 'saving')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const currentMonthName = format(now, 'MMMM', { locale: idLocale });

  // Dynamic performance badge
  const expenseRatio = income > 0 ? ((expense + saving) / income) * 100 : 0;
  const perfBadge = income === 0 && expense === 0 && saving === 0
    ? { label: 'Belum Ada Data', color: 'text-text-muted bg-surface-alt' }
    : expenseRatio <= 50
    ? { label: 'Optimal', color: 'text-success bg-success/10' }
    : expenseRatio <= 80
    ? { label: 'Normal', color: 'text-accent bg-accent/10' }
    : expenseRatio <= 100
    ? { label: 'Waspada', color: 'text-warning bg-warning/10' }
    : { label: 'Over Budget', color: 'text-danger bg-danger/10' };

  return (
    <div className="relative min-h-screen pb-24 md:pb-6">
      {/* Hero Section */}
      <div className="header-hero">
        <div className="max-w-[1100px] mx-auto">
          {/* Top Header inside Hero */}
          <div className="flex items-center justify-start mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 dark:bg-surface flex items-center justify-center font-bold text-lg overflow-hidden border border-white/30 dark:border-line backdrop-blur-md shrink-0">
                {user?.user_metadata?.show_avatar !== false && user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  (user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <p className="text-sm text-bg/80 dark:text-text-muted">Selamat Datang! 👋</p>
                <p className="font-semibold text-base">{user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}</p>
              </div>
            </div>
          </div>

          {/* Main Balance */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-1">
              <p className="text-sm font-medium text-bg/80 dark:text-text-muted">Total Saldo Keuangan</p>
              <button
                onClick={toggleBalance}
                className="p-1 rounded-full bg-white/20 dark:bg-surface hover:bg-white/30 dark:hover:bg-surface-hover transition-all"
                aria-label={showBalance ? "Sembunyikan saldo" : "Tampilkan saldo"}
              >
                {showBalance ? (
                  <EyeOff className="w-3.5 h-3.5 text-bg/80 dark:text-text-muted" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-bg/80 dark:text-text-muted" />
                )}
              </button>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              {showBalance ? fmt(totalBalance) : '••••••'}
            </h1>
          </div>

          {/* Income/Expense Pills for Current Month */}
          <div className="text-center mb-2">
            <p className="text-[11px] font-medium text-bg/60 dark:text-text-muted uppercase tracking-wider">Ringkasan {currentMonthName}</p>
          </div>
           <div className="flex justify-center gap-3 mb-2">
               <div className="bg-white/10 dark:bg-surface/50 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-2 border border-white/20 dark:border-line shadow-sm">
                  <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center shadow-inner">
                    <ArrowDownLeft className="w-3 h-3 text-white dark:text-bg" />
                  </div>
                  <span className="font-semibold text-[13px]">{showBalance ? fmt(income) : '••••'}</span>
               </div>
               <div className="bg-white/10 dark:bg-surface/50 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-2 border border-white/20 dark:border-line shadow-sm">
                  <div className="w-5 h-5 rounded-full bg-danger flex items-center justify-center shadow-inner">
                    <ArrowUpRight className="w-3 h-3 text-white dark:text-bg" />
                  </div>
                  <span className="font-semibold text-[13px]">{showBalance ? fmt(expense) : '••••'}</span>
               </div>
               <div className="bg-white/10 dark:bg-surface/50 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center gap-2 border border-white/20 dark:border-line shadow-sm">
                  <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow-inner">
                    <PiggyBank className="w-3 h-3 text-white dark:text-bg" />
                  </div>
                  <span className="font-semibold text-[13px]">{showBalance ? fmt(saving) : '••••'}</span>
               </div>
            </div>
        </div>
      </div>

      {/* Overlapping Content Container */}
      <div className="max-w-[1100px] mx-auto px-4 -mt-16 relative z-10 space-y-5">
        
        {/* Budget Performance Card */}
        <div className="card p-5 shadow-lg shadow-black/5 border-line bg-surface">
           <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-[15px] text-text-primary">Performa Bulan Ini</h2>
              <span className={clsx("text-[11px] font-medium px-2 py-1 rounded-md", perfBadge.color)}>{perfBadge.label}</span>
           </div>
           
             <div className="space-y-3">
               <div className="flex justify-between text-[13px]">
                 <span className="text-text-muted font-medium">Sisa Budget</span>
                 <span className="font-semibold text-text-primary">{showBalance ? fmt(Math.max(0, income - expense - saving)) : '••••'}</span>
               </div>
               <div className="bg-surface-alt rounded-full h-2.5 overflow-hidden shadow-inner">
                  <div className="bg-accent h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.min(100, ((expense + saving) / (income || 1)) * 100)}%` }}></div>
               </div>
               <p className="text-[11px] text-text-muted font-medium">
                 {showBalance ? `Terpakai ${fmt(expense + saving)} dari ${fmt(income)}` : 'Terpakai •••• dari ••••'}
               </p>
             </div>
        </div>

        {/* Balance Tracker Grid */}
         <div className="card p-4 md:p-5 shadow-sm border-line bg-surface space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="font-bold text-[15px] text-text-primary flex items-center gap-2">
                <Wallet className="w-4 h-4 text-accent" /> Daftar Akun Anda
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleBalance}
                  className="p-1.5 rounded-full hover:bg-surface-alt transition-all"
                  aria-label={showBalance ? "Sembunyikan saldo" : "Tampilkan saldo"}
                >
                  {showBalance ? (
                    <EyeOff className="w-4 h-4 text-text-muted" />
                  ) : (
                    <Eye className="w-4 h-4 text-text-muted" />
                  )}
                </button>
                <span className="text-[12px] font-medium text-text-muted bg-surface-alt px-2 py-0.5 rounded-full">{accounts.length} Akun Aktif</span>
              </div>
            </div>
           
           <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
             {accounts.map(account => {
               const Icon = account.type === 'bank' ? Building2 : account.type === 'ewallet' ? Smartphone : Wallet;
               return (
                 <div key={account.id} className="bg-surface-alt/30 border border-line p-2.5 rounded-xl shadow-sm hover:border-accent/40 hover:shadow-md transition-all group flex flex-col justify-between min-h-[75px] cursor-pointer">
                   <div className="flex items-center gap-1.5 mb-2">
                     <div className="w-5 h-5 rounded-md bg-surface flex items-center justify-center shrink-0 shadow-sm border border-line">
                       {account.icon_url ? (
                         <img src={account.icon_url} alt={account.name} className="w-3 h-3 object-contain" />
                       ) : (
                         <Icon className="w-3 h-3 text-text-muted group-hover:text-accent transition-colors" />
                       )}
                     </div>
                     <span className="font-bold text-[11px] text-text-primary truncate leading-tight">{account.name}</span>
                   </div>
                    <div>
                      <p className="text-[8px] text-text-muted font-bold uppercase tracking-wider opacity-80 leading-none">IDR</p>
                      <p className="font-bold text-[11px] sm:text-[12px] text-text-primary mt-0.5 truncate">
                        {showBalance ? new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(Number(account.balance)) : '••••'}
                      </p>
                    </div>
                 </div>
               );
             })}
             
             {/* Add New Account Card */}
             <div onClick={() => navigate('/settings')} className="bg-surface-alt/10 flex items-center justify-center p-2 rounded-xl border-2 border-dashed border-line hover:border-accent/50 hover:bg-accent/5 transition-all cursor-pointer min-h-[75px] group">
               <div className="flex flex-col items-center gap-1 text-text-muted group-hover:text-accent transition-colors">
                  <div className="w-5 h-5 rounded-full bg-surface border border-line flex items-center justify-center shadow-sm">
                    <Plus className="w-3 h-3" />
                  </div>
                  <span className="font-semibold text-[9px] sm:text-[10px]">Tambah</span>
               </div>
             </div>
           </div>
        </div>

        {/* Savings Tracker Grid */}
        <div className="card p-4 md:p-5 shadow-sm border-line bg-surface space-y-4">
           <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="font-bold text-[15px] text-text-primary flex items-center gap-2">
                <PiggyBank className="w-4 h-4 text-accent" /> Tracker Tabungan
              </h2>
              <span className="text-[12px] font-medium text-text-muted bg-surface-alt px-2 py-0.5 rounded-full">{wishlists.length} Tabungan</span>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" ref={menuRef}>
               {wishlists.map(w => {
                 const target = Number(w.target_amount) || 1;
                 const saved = Number(w.current_amount) || 0;
                 const percentRaw = (saved / target) * 100;
                 const progressObj = Math.min(100, Math.max(0, percentRaw));
                 const isComplete = percentRaw >= 100;

                 return (
                   <div key={w.id} className="bg-surface-alt/20 border border-line p-3 rounded-xl shadow-sm hover:border-accent/40 hover:shadow-md transition-all flex flex-col justify-between min-h-[110px] group relative">
                     {isComplete && (
                       <div className="absolute top-2 right-2">
                         <button 
                           onClick={(e) => { e.stopPropagation(); setWishlistMenuId(wishlistMenuId === w.id ? null : w.id); }}
                           className="w-6 h-6 rounded-full bg-success/10 hover:bg-success/20 flex items-center justify-center transition-colors"
                         >
                           <Bell className="w-3 h-3 text-success" />
                         </button>
                         {wishlistMenuId === w.id && (
                           <div className="absolute right-0 top-8 w-36 bg-surface border border-line rounded-xl shadow-xl z-20 overflow-hidden animate-scale-in">
                             <button 
                               onClick={() => handleCompleteWishlist(w)}
                               className="w-full px-3 py-2.5 text-left text-[12px] font-medium hover:bg-surface-hover flex items-center gap-2 text-text-primary"
                             >
                               <CheckCircle className="w-4 h-4 text-success" /> Selesaikan
                             </button>
                             <button 
                               onClick={() => handleArchiveWishlist(w)}
                               className="w-full px-3 py-2.5 text-left text-[12px] font-medium hover:bg-surface-hover flex items-center gap-2 text-text-primary border-t border-line"
                             >
                               <Archive className="w-4 h-4 text-text-muted" /> Arsipkan
                             </button>
                           </div>
                         )}
                       </div>
                     )}

                     <div>
                       <div className="flex items-center gap-1.5 mb-2">
                         <div className="w-5 h-5 rounded-lg bg-surface border border-line flex items-center justify-center shrink-0">
                           <PiggyBank className={clsx("w-3 h-3 transition-transform", isComplete ? "text-success" : "text-accent group-hover:scale-110")} />
                         </div>
                         <span className={clsx("font-bold text-[11px] truncate", isComplete ? "text-success" : "text-text-primary")}>{w.name}</span>
                       </div>

                        <div className="space-y-0.5">
                          <p className="text-[10px] text-text-muted font-medium mb-1 truncate">
Terkumpul: <span className={clsx("font-bold", isComplete ? "text-success" : "text-text-primary")}>
                               {showBalance ? fmt(saved) : '••••'}
                             </span>
                           </p>
                           <div className="flex justify-between items-end">
                              <p className="text-[9px] text-text-muted">Target: {showBalance ? fmt(target) : '••••'}</p>
                             <span className={clsx("text-[10px] font-bold", isComplete ? "text-success" : "text-accent")}>{percentRaw.toFixed(0)}%</span>
                          </div>
                        </div>
                     </div>

                     <div className="mt-2 text-[10px]">
                       <div className="h-1 bg-surface-hover rounded-full overflow-hidden">
                         <div 
                           className={clsx("h-full rounded-full transition-all duration-700 ease-out", isComplete ? "bg-success" : "bg-accent")} 
                           style={{ width: `${progressObj}%` }}
                         />
                       </div>
                     </div>
                   </div>
                 );
               })}
               
               <div onClick={() => navigate('/settings')} className="bg-surface-alt/5 flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-line hover:border-accent/50 hover:bg-accent/5 transition-all cursor-pointer group min-h-[110px]">
                  <div className="w-7 h-7 rounded-full bg-surface border border-line flex items-center justify-center shadow-sm mb-2 group-hover:bg-accent group-hover:border-accent transition-all">
                    <Plus className="w-4 h-4 text-text-muted group-hover:text-white transition-colors" />
                  </div>
                  <span className="font-bold text-[10px] text-text-muted group-hover:text-accent transition-colors">Tambah Baru</span>
               </div>
             </div>
        </div>
      </div>
    </div>
  );
}
